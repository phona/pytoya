#!/bin/bash
set -e

# Variables
CHART_PATH="helm/pytoya"
RELEASE_NAME="pytoya"
NAMESPACE="pytoya"
ENVIRONMENT="${1:-dev}"  # dev, staging, or prod

# Function to install/upgrade
install_chart() {
    local values_file="values.yaml"

    if [ "$ENVIRONMENT" != "default" ]; then
        values_file="values-${ENVIRONMENT}.yaml"
    fi

    helm upgrade --install $RELEASE_NAME \
        $CHART_PATH \
        --namespace $NAMESPACE \
        --create-namespace \
        --values $CHART_PATH/$values_file \
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
