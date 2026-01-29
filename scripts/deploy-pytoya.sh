#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  deploy-pytoya.sh --chart <oci-chart-ref> --chart-version <version> --images '<json>'

Example:
  /home/github-runner/deploy-pytoya.sh \
    --chart oci://ghcr.io/ORG/charts/pytoya \
    --chart-version 0.1.0-abcdef123456 \
    --images '{"api":"ghcr.io/ORG/pytoya/api:abcdef123456","web":"ghcr.io/ORG/pytoya/web:abcdef123456"}'

Notes:
  - The cluster/runner owns kube credentials and GHCR pull credentials.
  - This script requires jq for parsing the --images JSON.
  - This script expects tag-style image refs. Digest refs (@sha256:...) require Helm chart support.
EOF
}

require_cmd() {
  local name="$1"
  if ! command -v "${name}" >/dev/null 2>&1; then
    echo "Missing required command: ${name}" >&2
    exit 2
  fi
}

CHART=""
CHART_VERSION=""
IMAGES_JSON=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --chart)
      CHART="${2:-}"; shift 2 ;;
    --chart-version)
      CHART_VERSION="${2:-}"; shift 2 ;;
    --images)
      IMAGES_JSON="${2:-}"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 2 ;;
  esac
done

if [[ -z "${CHART}" || -z "${CHART_VERSION}" || -z "${IMAGES_JSON}" ]]; then
  echo "Missing required arguments." >&2
  usage
  exit 2
fi

if [[ "${CHART}" != oci://ghcr.io/*/charts/* ]]; then
  echo "Invalid --chart. Expected: oci://ghcr.io/<ORG>/charts/<chartId>" >&2
  echo "Got: ${CHART}" >&2
  exit 2
fi

require_cmd helm
require_cmd jq

json_get() {
  local json="$1"
  local key="$2"
  jq -r --arg k "${key}" '.[$k] // empty' <<<"${json}"
}

api_ref="$(json_get "${IMAGES_JSON}" "api")"
web_ref="$(json_get "${IMAGES_JSON}" "web")"
worker_ref="$(json_get "${IMAGES_JSON}" "worker")"
if [[ -z "${api_ref}" || -z "${web_ref}" ]]; then
  echo "--images JSON must include keys: api, web (optional: worker)" >&2
  echo "Got: ${IMAGES_JSON}" >&2
  exit 2
fi
if [[ -z "${worker_ref}" ]]; then
  worker_ref="${api_ref}"
fi

split_image_tag() {
  local ref="$1"
  if [[ "${ref}" == *"@"* ]]; then
    echo "Digest image refs are not supported by the current Helm chart: ${ref}" >&2
    echo "Use tag refs (name:tag), or extend the chart to accept full imageRef/digest." >&2
    exit 2
  fi

  local last_segment="${ref##*/}"
  if [[ "${last_segment}" != *":"* ]]; then
    echo "Image ref must include a tag: ${ref}" >&2
    exit 2
  fi

  local repo="${ref%:*}"
  local tag="${ref##*:}"
  echo "${repo}|${tag}"
}

split_registry_owner_and_image() {
  local repo="$1"
  IFS='/' read -r -a parts <<<"${repo}"
  if [[ "${#parts[@]}" -lt 4 ]]; then
    echo "Expected GHCR image repo format: ghcr.io/<ORG>/<name>/<component>. Got: ${repo}" >&2
    exit 2
  fi
  if [[ "${parts[0]}" != "ghcr.io" ]]; then
    echo "Only ghcr.io images are supported. Got: ${repo}" >&2
    exit 2
  fi
  local registry_owner="${parts[0]}/${parts[1]}"
  local image_path
  image_path="$(printf "%s/" "${parts[@]:2}")"
  image_path="${image_path%/}"
  echo "${registry_owner}|${image_path}"
}

api_repo_tag="$(split_image_tag "${api_ref}")"
web_repo_tag="$(split_image_tag "${web_ref}")"
worker_repo_tag="$(split_image_tag "${worker_ref}")"

api_repo="${api_repo_tag%|*}"; api_tag="${api_repo_tag#*|}"
web_repo="${web_repo_tag%|*}"; web_tag="${web_repo_tag#*|}"
worker_repo="${worker_repo_tag%|*}"; worker_tag="${worker_repo_tag#*|}"

api_registry_image="$(split_registry_owner_and_image "${api_repo}")"
web_registry_image="$(split_registry_owner_and_image "${web_repo}")"
worker_registry_image="$(split_registry_owner_and_image "${worker_repo}")"

api_registry="${api_registry_image%|*}"; api_image="${api_registry_image#*|}"
web_registry="${web_registry_image%|*}"; web_image="${web_registry_image#*|}"
worker_registry="${worker_registry_image%|*}"; worker_image="${worker_registry_image#*|}"

if [[ "${api_registry}" != "${web_registry}" || "${api_registry}" != "${worker_registry}" ]]; then
  echo "All images must share the same GHCR registry/owner (ghcr.io/<ORG>)." >&2
  echo "api: ${api_registry} web: ${web_registry} worker: ${worker_registry}" >&2
  exit 2
fi

app="pytoya"
namespace="${app}"
release="${app}"
values_file="/home/github-runner/${app}.values.yaml"

if [[ ! -f "${values_file}" ]]; then
  echo "Missing values file: ${values_file}" >&2
  exit 2
fi

echo "Deploy signal received:"
echo "  app=${app}"
echo "  namespace=${namespace}"
echo "  release=${release}"
echo "  chart=${CHART}"
echo "  chartVersion=${CHART_VERSION}"
echo "  registry=${api_registry}"
echo "  api=${api_image}:${api_tag}"
echo "  web=${web_image}:${web_tag}"
echo "  worker=${worker_image}:${worker_tag}"

helm_args=(
  upgrade
  --install "${release}" "${CHART}"
  --version "${CHART_VERSION}"
  --namespace "${namespace}"
  --create-namespace
  -f "${values_file}"
  --set "global.imageRegistry=${api_registry}"
  --set "api.image=${api_image}"
  --set "api.tag=${api_tag}"
  --set "web.image=${web_image}"
  --set "web.tag=${web_tag}"
  --set "worker.image=${worker_image}"
  --set "worker.tag=${worker_tag}"
  --wait
  --timeout "${DEPLOY_TIMEOUT:-10m}"
)

if [[ "${DEPLOY_ATOMIC:-0}" == "1" ]]; then
  helm_args+=(--atomic)
fi

helm "${helm_args[@]}"
