<#!
.SYNOPSIS
  Deploy or connect to dev Postgres/Redis in Kubernetes and update API env.

.DESCRIPTION
  Optionally deploys the dev dependencies using Helm, resolves NodePorts, updates
  the API .env with DB/Redis connection info and AUTO_MIGRATIONS=true, and
  optionally ensures the app DB user exists.

.PARAMETER PostgresPassword
  Postgres admin password used for deployment and/or user setup.

.PARAMETER Namespace
  Kubernetes namespace for the dev dependencies (default: pytoya-dev).

.PARAMETER ReleaseName
  Helm release name for the dev dependencies (default: pytoya-dev).

.PARAMETER NodeIp
  Node IP to use for NodePort access. If omitted, auto-resolves and prompts if needed.

.PARAMETER DbAdminUser
  Postgres admin user used for user setup (default: pytoya).

.PARAMETER DbAdminPassword
  Postgres admin password used when -SkipDeploy is set and user setup is desired.

.PARAMETER AppDbUser
  Application database user to ensure exists (default: pytoya_user).

.PARAMETER AppDbPassword
  Password for AppDbUser (default: pytoya_pass).

.PARAMETER AppDbName
  Application database name (default: pytoya).

.PARAMETER DeployHelperPath
  Path to the deploy helper script (default: scripts/deploy-deps-nodeport.ps1).

.PARAMETER SkipDeploy
  Skip Helm deployment and only update env and/or DB user.

.PARAMETER DisablePersistence
  Pass through to deploy helper to disable PVCs.

.PARAMETER SkipDbUserSetup
  Skip creating/updating the AppDbUser.

.PARAMETER EnvPath
  Path to the API .env file to update (default: src/apps/api/.env).

.EXAMPLE
  pwsh -File scripts/setup-dev-k8s-deps.ps1 -PostgresPassword 123456

.EXAMPLE
  pwsh -File scripts/setup-dev-k8s-deps.ps1 -SkipDeploy -EnvPath "src/apps/api/.env.local"
#>
param(
  [string]$PostgresPassword,
  [string]$Namespace = "pytoya-dev",
  [string]$ReleaseName = "pytoya-dev",
  [string]$NodeIp,
  [string]$DbAdminUser = "pytoya",
  [string]$DbAdminPassword,
  [string]$AppDbUser = "pytoya_user",
  [string]$AppDbPassword = "pytoya_pass",
  [string]$AppDbName = "pytoya",
  [string]$DeployHelperPath = "scripts/deploy-deps-nodeport.ps1",
  [switch]$SkipDeploy,
  [switch]$DisablePersistence,
  [switch]$SkipDbUserSetup,
  [string]$EnvPath = "src/apps/api/.env"
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

function Upsert-EnvValue {
  param(
    [string[]]$Lines,
    [Parameter(Mandatory = $true)][string]$Key,
    [Parameter(Mandatory = $true)][string]$Value
  )
  if (-not $Lines) {
    $Lines = @()
  }
  $pattern = "^\s*$([regex]::Escape($Key))="
  $found = $false
  $output = foreach ($line in $Lines) {
    if ($line -match $pattern) {
      $found = $true
      "$Key=$Value"
    } else {
      $line
    }
  }
  if (-not $found) {
    $output += "$Key=$Value"
  }
  return ,$output
}

function Assert-ValidIdentifier {
  param(
    [Parameter(Mandatory = $true)][string]$Value,
    [Parameter(Mandatory = $true)][string]$Name
  )
  if ($Value -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
    throw "$Name must be a valid SQL identifier (letters, numbers, underscore)."
  }
}

function Escape-SqlLiteral {
  param([string]$Value)
  return $Value.Replace("'", "''")
}

function Get-PostgresPodName {
  $podName = & kubectl get pods -n $Namespace -l app.kubernetes.io/component=postgres -o jsonpath="{.items[0].metadata.name}"
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($podName)) {
    throw "Failed to find a Postgres pod in namespace '$Namespace'."
  }
  return $podName
}

function Wait-PostgresReady {
  param(
    [Parameter(Mandatory = $true)][string]$PodName,
    [Parameter(Mandatory = $true)][string]$AdminUser,
    [Parameter(Mandatory = $true)][string]$AdminPassword,
    [Parameter(Mandatory = $true)][string]$Database,
    [int]$Retries = 5,
    [int]$DelaySeconds = 3
  )
  for ($i = 1; $i -le $Retries; $i++) {
    & kubectl exec -n $Namespace $PodName -- env PGPASSWORD=$AdminPassword psql -U $AdminUser -d $Database -v ON_ERROR_STOP=1 -c "select 1" 1>$null 2>$null
    if ($LASTEXITCODE -eq 0) {
      return
    }
    Start-Sleep -Seconds $DelaySeconds
  }
  throw "Postgres did not become ready after $Retries attempts."
}

function Ensure-AppDbUser {
  param(
    [Parameter(Mandatory = $true)][string]$AdminUser,
    [Parameter(Mandatory = $true)][string]$AdminPassword,
    [Parameter(Mandatory = $true)][string]$Database,
    [Parameter(Mandatory = $true)][string]$User,
    [Parameter(Mandatory = $true)][string]$Password
  )
  Assert-ValidIdentifier -Value $AdminUser -Name "DbAdminUser"
  Assert-ValidIdentifier -Value $User -Name "AppDbUser"
  Assert-ValidIdentifier -Value $Database -Name "AppDbName"

  $safeUser = Escape-SqlLiteral $User
  $safePass = Escape-SqlLiteral $Password
  $sql = @"
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$safeUser') THEN
    CREATE ROLE $User LOGIN PASSWORD '$safePass';
  ELSE
    ALTER ROLE $User WITH PASSWORD '$safePass';
  END IF;
END $$;
GRANT ALL PRIVILEGES ON DATABASE $Database TO $User;
GRANT USAGE, CREATE ON SCHEMA public TO $User;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $User;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $User;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO $User;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO $User;
"@

  $podName = Get-PostgresPodName
  Wait-PostgresReady -PodName $podName -AdminUser $AdminUser -AdminPassword $AdminPassword -Database $Database
  & kubectl exec -n $Namespace $podName -- env PGPASSWORD=$AdminPassword psql -U $AdminUser -d $Database -v ON_ERROR_STOP=1 -c "$sql"
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create or update database user '$User'."
  }
}

function Invoke-Deploy {
  param(
    [Parameter(Mandatory = $true)][string]$Password
  )
  Require-Command -Name "helm" -Hint "Install Helm or run the deploy script manually and use -SkipDeploy."
  if (-not (Test-Path $DeployHelperPath)) {
    throw "Deploy helper not found at '$DeployHelperPath'."
  }
  $env:POSTGRES_PASSWORD = $Password
  $env:NAMESPACE = $Namespace
  $env:RELEASE_NAME = $ReleaseName
  & pwsh -File $DeployHelperPath `
    -Namespace $Namespace `
    -ReleaseName $ReleaseName `
    -PostgresPassword $Password `
    -JwtSecret "dummy" `
    -LlmApiKey "dummy" `
    $(if ($DisablePersistence) { "-DisablePersistence" })
  if ($LASTEXITCODE -ne 0) {
    throw "deploy-deps-nodeport.ps1 failed with exit code $LASTEXITCODE."
  }
}

function Get-NodePort {
  param(
    [Parameter(Mandatory = $true)][string]$ServiceName
  )
  $port = & kubectl get svc $ServiceName -n $Namespace -o jsonpath="{.spec.ports[0].nodePort}"
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($port)) {
    throw "Failed to read NodePort for service '$ServiceName' in namespace '$Namespace'."
  }
  return $port
}

function Resolve-NodeIp {
  if ($NodeIp) {
    return $NodeIp
  }

  $autoIp = & kubectl get nodes -o jsonpath="{.items[0].status.addresses[?(@.type=='InternalIP')].address}"
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to read node IPs from the cluster."
  }

  if ([string]::IsNullOrWhiteSpace($autoIp)) {
    return (Read-Host "Enter a reachable node IP")
  }

  $prompt = "Node IP not provided. Press Enter to use '$autoIp', or type another IP"
  $choice = Read-Host $prompt
  if ([string]::IsNullOrWhiteSpace($choice)) {
    return $autoIp
  }
  return $choice
}

if (-not $SkipDeploy) {
  if ([string]::IsNullOrWhiteSpace($PostgresPassword)) {
    throw "PostgresPassword is required unless -SkipDeploy is used."
  }
  Invoke-Deploy -Password $PostgresPassword
}

Require-Command -Name "kubectl"

$postgresService = "$ReleaseName-postgres"
$redisService = "$ReleaseName-redis"

$postgresPort = Get-NodePort -ServiceName $postgresService
$redisPort = Get-NodePort -ServiceName $redisService
$resolvedNodeIp = Resolve-NodeIp

$rawEnv = ""
if (Test-Path $EnvPath) {
  $rawEnv = Get-Content -Path $EnvPath -Raw
}

$lines = @()
if ($rawEnv) {
  $lines = $rawEnv -split "`r?`n"
}

$lines = Upsert-EnvValue -Lines $lines -Key "DB_HOST" -Value $resolvedNodeIp
$lines = Upsert-EnvValue -Lines $lines -Key "DB_PORT" -Value $postgresPort
$lines = Upsert-EnvValue -Lines $lines -Key "REDIS_HOST" -Value $resolvedNodeIp
$lines = Upsert-EnvValue -Lines $lines -Key "REDIS_PORT" -Value $redisPort

Set-Content -Path $EnvPath -Value ($lines -join "`r`n") -Encoding ASCII

Write-Host "Updated $EnvPath with:"
Write-Host "  DB_HOST=$resolvedNodeIp"
Write-Host "  DB_PORT=$postgresPort"
Write-Host "  REDIS_HOST=$resolvedNodeIp"
Write-Host "  REDIS_PORT=$redisPort"

if (-not $SkipDbUserSetup) {
  $adminPassword = if ($PostgresPassword) { $PostgresPassword } else { $DbAdminPassword }
  if ([string]::IsNullOrWhiteSpace($adminPassword)) {
    Write-Host "Skipping DB user setup (no admin password provided)."
  } else {
    Ensure-AppDbUser -AdminUser $DbAdminUser -AdminPassword $adminPassword -Database $AppDbName -User $AppDbUser -Password $AppDbPassword
    Write-Host "Ensured DB user $AppDbUser exists in database $AppDbName."
  }
}
