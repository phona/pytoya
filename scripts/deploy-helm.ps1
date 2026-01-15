param(
  [ValidateSet("dev", "staging", "prod", "default")]
  [string]$Environment = "dev",
  [string]$Registry = "registry.dev.lan",
  [string]$ApiTag = "dev",
  [string]$WebTag = "dev",
  [string]$IngressHost,
  [string]$PostgresPassword,
  [string]$JwtSecret,
  [string]$LlmApiKey,
  [string]$Namespace = "pytoya",
  [string]$ReleaseName = "pytoya"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Command {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [string]$Hint
  )
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    $message = "Missing required command: $Name."
    if ($Hint) {
      $message = "$message $Hint"
    }
    throw $message
  }
}

function Require-Value {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [string]$Value
  )
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing required parameter: $Name"
  }
}

Require-Command -Name "helm"
Require-Command -Name "kubectl"
Require-Value -Name "PostgresPassword" -Value $PostgresPassword
Require-Value -Name "JwtSecret" -Value $JwtSecret
Require-Value -Name "LlmApiKey" -Value $LlmApiKey

$chartPath = "helm/pytoya"
$valuesFile = "values.yaml"
if ($Environment -ne "default") {
  $valuesFile = "values-$Environment.yaml"
}

$extraSetArgs = @()
if ($IngressHost) {
  $extraSetArgs += @("--set", "ingress.hosts[0]=$IngressHost")
  $extraSetArgs += @("--set", "ingress.tls[0].hosts[0]=$IngressHost")
}

Write-Host "Deploying PyToYa to $Environment environment..."

helm upgrade --install $ReleaseName `
  $chartPath `
  --namespace $Namespace `
  --create-namespace `
  --values "$chartPath/$valuesFile" `
  --set "global.imageRegistry=$Registry" `
  --set "api.tag=$ApiTag" `
  --set "web.tag=$WebTag" `
  --set "postgres.auth.password=$PostgresPassword" `
  --set "secrets.jwtSecret=$JwtSecret" `
  --set "secrets.llmApiKey=$LlmApiKey" `
  @extraSetArgs `
  --wait `
  --timeout 5m `
  --debug

Write-Host "Checking deployment status..."
kubectl get pods -n $Namespace
kubectl get services -n $Namespace
kubectl get ingress -n $Namespace

$host = kubectl get ingress -n $Namespace -o jsonpath="{.items[0].status.loadBalancer.ingress[0].hostname}"
if ($host) {
  Write-Host "API URL: $host/api"
  Write-Host "Web URL: $host"
}
