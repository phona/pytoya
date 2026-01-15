param(
  [string]$Namespace = "pytoya-dev",
  [string]$ReleaseName = "pytoya-dev",
  [string]$PostgresPassword,
  [string]$JwtSecret = "dummy",
  [string]$LlmApiKey = "dummy",
  [string]$PostgresNodePort,
  [string]$RedisNodePort,
  [switch]$DisablePersistence
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

$chartPath = "helm/pytoya"

$extraSetArgs = @()
if ($PostgresNodePort) {
  $extraSetArgs += @("--set", "postgres.service.nodePort=$PostgresNodePort")
}
if ($RedisNodePort) {
  $extraSetArgs += @("--set", "redis.service.nodePort=$RedisNodePort")
}
if ($DisablePersistence) {
  $extraSetArgs += @("--set", "postgres.persistence.enabled=false")
  $extraSetArgs += @("--set", "redis.persistence.enabled=false")
}

Write-Host "Deploying dependencies (Postgres + Redis) to namespace: $Namespace"

helm upgrade --install $ReleaseName `
  $chartPath `
  --namespace $Namespace `
  --create-namespace `
  --set "global.namespace=$Namespace" `
  --set "api.enabled=false" `
  --set "web.enabled=false" `
  --set "ingress.enabled=false" `
  --set "postgres.service.type=NodePort" `
  --set "redis.service.type=NodePort" `
  --set "postgres.auth.password=$PostgresPassword" `
  --set "secrets.jwtSecret=$JwtSecret" `
  --set "secrets.llmApiKey=$LlmApiKey" `
  @extraSetArgs `
  --wait `
  --timeout 5m

Write-Host ""
Write-Host "Services:"
kubectl get svc -n $Namespace
Write-Host ""
Write-Host "Tip: use a node IP + the NodePort above to connect."
