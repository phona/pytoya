param(
  [string]$PostgresPassword,
  [string]$Namespace = "pytoya-dev",
  [string]$ReleaseName = "pytoya-dev",
  [string]$NodeIp,
  [string]$BashPath,
  [switch]$SkipDeploy,
  [switch]$DisablePersistence,
  [string]$EnvPath = ".env"
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

function Resolve-BashPath {
  if ($BashPath) {
    if (-not (Test-Path $BashPath)) {
      throw "BashPath '$BashPath' not found."
    }
    return $BashPath
  }

  $cmd = Get-Command bash -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source -and ($cmd.Source -notmatch "\\System32\\bash\.exe$")) {
    return $cmd.Source
  }

  $gitBashCandidates = @(
    "$env:ProgramFiles\Git\bin\bash.exe",
    "$env:ProgramFiles\Git\usr\bin\bash.exe",
    "$env:ProgramFiles(x86)\Git\bin\bash.exe",
    "$env:ProgramFiles(x86)\Git\usr\bin\bash.exe"
  ) | Where-Object { $_ -and (Test-Path $_) }

  if ($gitBashCandidates.Count -gt 0) {
    return $gitBashCandidates[0]
  }

  return $null
}

function Upsert-EnvValue {
  param(
    [string[]]$Lines,
    [Parameter(Mandatory = $true)][string]$Key,
    [Parameter(Mandatory = $true)][string]$Value
  )
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

function Invoke-Deploy {
  param(
    [Parameter(Mandatory = $true)][string]$Password
  )
  Require-Command -Name "helm" -Hint "Install Helm or run the deploy script manually and use -SkipDeploy."
  $resolvedBash = Resolve-BashPath
  if (-not $resolvedBash) {
    throw "Unable to find Git Bash. Install Git Bash or pass -BashPath, or run the deploy script manually and use -SkipDeploy."
  }
  $env:POSTGRES_PASSWORD = $Password
  $env:NAMESPACE = $Namespace
  $env:RELEASE_NAME = $ReleaseName
  if ($DisablePersistence) {
    $env:DISABLE_PERSISTENCE = "true"
  } else {
    Remove-Item Env:DISABLE_PERSISTENCE -ErrorAction SilentlyContinue
  }
  & $resolvedBash "scripts/deploy-deps-nodeport.sh"
  if ($LASTEXITCODE -ne 0) {
    throw "deploy-deps-nodeport.sh failed with exit code $LASTEXITCODE. If you are on Windows, ensure Git Bash is installed or pass -BashPath."
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

$lines = @()
if (Test-Path $EnvPath) {
  $lines = Get-Content -Path $EnvPath
}

$lines = Upsert-EnvValue -Lines $lines -Key "DB_HOST" -Value $resolvedNodeIp
$lines = Upsert-EnvValue -Lines $lines -Key "DB_PORT" -Value $postgresPort
$lines = Upsert-EnvValue -Lines $lines -Key "REDIS_HOST" -Value $resolvedNodeIp
$lines = Upsert-EnvValue -Lines $lines -Key "REDIS_PORT" -Value $redisPort

Set-Content -Path $EnvPath -Value $lines -Encoding ASCII

Write-Host "Updated $EnvPath with:"
Write-Host "  DB_HOST=$resolvedNodeIp"
Write-Host "  DB_PORT=$postgresPort"
Write-Host "  REDIS_HOST=$resolvedNodeIp"
Write-Host "  REDIS_PORT=$redisPort"
