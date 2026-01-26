#!/usr/bin/env bash
set -euo pipefail

CHART_PATH="helm/pytoya"

NAMESPACE="${NAMESPACE:-pytoya-dev}"
RELEASE_NAME="${RELEASE_NAME:-pytoya-dev}"

# Required by chart (even when api/web are disabled)
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
JWT_SECRET="${JWT_SECRET:-dummy}"

# Optional: fixed NodePorts. If empty, Kubernetes auto-assigns.
POSTGRES_NODEPORT="${POSTGRES_NODEPORT:-}"
REDIS_NODEPORT="${REDIS_NODEPORT:-}"

# Optional: disable persistence for clusters without StorageClass.
DISABLE_PERSISTENCE="${DISABLE_PERSISTENCE:-false}"

usage() {
  cat <<'EOF'
Deploy Postgres + Redis (dev dependencies) as NodePorts.

Usage:
  POSTGRES_PASSWORD=... ./scripts/deploy-deps-nodeport.sh

Optional env vars:
  NAMESPACE=pytoya-dev
  RELEASE_NAME=pytoya-dev
  POSTGRES_NODEPORT=31432        # fixed port (optional)
  REDIS_NODEPORT=31379           # fixed port (optional)
  DISABLE_PERSISTENCE=true       # disables PVCs (optional)

Notes:
  - JWT_SECRET is required by the Helm chart, but not used when api/web are disabled.
    Defaults are set to "dummy" for convenience.
EOF
}

require_env() {
  local name="$1"
  local value="$2"
  if [ -z "$value" ]; then
    echo "Missing required env var: $name" >&2
    usage >&2
    exit 2
  fi
}

main() {
  require_env POSTGRES_PASSWORD "$POSTGRES_PASSWORD"

  local extra_set_args=()
  if [ -n "$POSTGRES_NODEPORT" ]; then
    extra_set_args+=(--set "postgres.service.nodePort=$POSTGRES_NODEPORT")
  fi
  if [ -n "$REDIS_NODEPORT" ]; then
    extra_set_args+=(--set "redis.service.nodePort=$REDIS_NODEPORT")
  fi
  if [ "$DISABLE_PERSISTENCE" = "true" ]; then
    extra_set_args+=(--set "postgres.persistence.enabled=false")
    extra_set_args+=(--set "redis.persistence.enabled=false")
  fi

  echo "Deploying dependencies (Postgres + Redis) to namespace: $NAMESPACE"
  helm upgrade --install "$RELEASE_NAME" \
    "$CHART_PATH" \
    --namespace "$NAMESPACE" \
    --create-namespace \
    --set "global.namespace=$NAMESPACE" \
    --set "api.enabled=false" \
    --set "web.enabled=false" \
    --set "ingress.enabled=false" \
    --set "postgres.service.type=NodePort" \
    --set "redis.service.type=NodePort" \
    --set "postgres.auth.password=$POSTGRES_PASSWORD" \
    --set "secrets.jwtSecret=$JWT_SECRET" \
    "${extra_set_args[@]}" \
    --wait \
    --timeout 5m

  echo
  echo "Services:"
  kubectl get svc -n "$NAMESPACE"
  echo
  echo "Tip: use a node IP + the NodePort above to connect."
}

main "$@"
