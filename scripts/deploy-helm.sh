#!/bin/bash
set -e

# Variables
CHART_PATH="helm/pytoya"
RELEASE_NAME="pytoya"
NAMESPACE="pytoya"
ENVIRONMENT="${1:-dev}"  # dev, staging, or prod

# Registry / tags (defaults for dev workflow)
REGISTRY="${REGISTRY:-registry.dev.lan}"
API_TAG="${API_TAG:-dev}"
WEB_TAG="${WEB_TAG:-dev}"

# Optional ingress host override
INGRESS_HOST="${INGRESS_HOST:-}"

# Required secrets (pass via env for safety)
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
JWT_SECRET="${JWT_SECRET:-}"
LLM_API_KEY="${LLM_API_KEY:-}"

usage() {
  cat <<'EOF'
Usage:
  ENVIRONMENT=dev REGISTRY=registry.dev.lan API_TAG=dev WEB_TAG=dev \
  POSTGRES_PASSWORD=... JWT_SECRET=... LLM_API_KEY=... \
  ./scripts/deploy-helm.sh [dev|staging|prod]

Optional:
  INGRESS_HOST=pytoya.dev.lan
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

# Function to install/upgrade
install_chart() {
    local values_file="values.yaml"

    if [ "$ENVIRONMENT" != "default" ]; then
        values_file="values-${ENVIRONMENT}.yaml"
    fi

    require_env POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
    require_env JWT_SECRET "$JWT_SECRET"
    require_env LLM_API_KEY "$LLM_API_KEY"

    local extra_set_args=()
    if [ -n "$INGRESS_HOST" ]; then
        extra_set_args+=(--set "ingress.hosts[0]=$INGRESS_HOST")
        extra_set_args+=(--set "ingress.tls[0].hosts[0]=$INGRESS_HOST")
    fi

    helm upgrade --install $RELEASE_NAME \
        $CHART_PATH \
        --namespace $NAMESPACE \
        --create-namespace \
        --values $CHART_PATH/$values_file \
        --set global.imageRegistry="$REGISTRY" \
        --set api.tag="$API_TAG" \
        --set web.tag="$WEB_TAG" \
        --set postgres.auth.password="$POSTGRES_PASSWORD" \
        --set secrets.jwtSecret="$JWT_SECRET" \
        --set secrets.llmApiKey="$LLM_API_KEY" \
        "${extra_set_args[@]}" \
        --wait \
        --timeout 5m \
        --debug
}

# Function to check status
check_status() {
    echo "Checking deployment status..."
    kubectl get pods -n $NAMESPACE
    kubectl get services -n $NAMESPACE
    kubectl get ingress -n $NAMESPACE
}

# Main
echo "Deploying PyToYa to $ENVIRONMENT environment..."
install_chart
check_status
echo "Deployment complete!"
echo "API URL: $(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}')/api"
echo "Web URL: $(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}')"
