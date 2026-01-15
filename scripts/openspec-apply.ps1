<#
.SYNOPSIS
通用的Claude命令行调用函数，仅接收用户提示词作为参数。

.DESCRIPTION
抽象封装了claude命令的调用逻辑，内置固定代理配置，仅需传递用户提示词即可快速调用Claude，
无需关注底层环境变量和命令拼接细节。

.PARAMETER UserPrompt
传递给Claude的用户提示词（必填），用于指定Claude的执行指令。

.EXAMPLE
# 基础调用：传递简单提示词
Invoke-Claude -UserPrompt "Explain the concept of TypeScript generics in simple terms"

.EXAMPLE
# 复杂调用：传递多行提示词
$prompt = @"
Write a PowerShell function that calculates file size statistics
- Output results in table format
- Support excluding hidden files
"@
Invoke-Claude -UserPrompt $prompt
#>
function Invoke-Claude {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$UserPrompt
    )

    # 1. 内置固定代理配置（保持原有配置，无需对外暴露）
    $ProxyAddress = "http://127.0.0.1:7890"
    $NoProxyList = "open.bigmodel.cn,.dev.lan,127.0.0.1,localhost"

    # 2. 输出调用启动提示
    Write-Host "🚀 Invoking Claude with user prompt...`n" -ForegroundColor Cyan

    try {
        # 3. 执行通用Claude调用（剥离所有TS错误修复专属逻辑）
        cross-env ELECTRON_GET_USE_PROXY=true `
            GLOBAL_AGENT_HTTPS_PROXY=$ProxyAddress `
            HTTP_PROXY=$ProxyAddress `
            HTTPS_PROXY=$ProxyAddress `
            NO_PROXY=$NoProxyList `
            claude -p "$UserPrompt" `
            --output-format stream-json `
            --verbose `
            --allowedTools "Bash,Read,Edit,Write" 2>&1

        # 4. 输出调用成功提示
        Write-Host "`n✅ Claude invocation completed successfully." -ForegroundColor Green
    }
    catch {
        # 5. 捕获并输出调用异常
        Write-Host "`n❌ Claude invocation failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Test-AllTasksFinished {
    param (
        [Parameter(Mandatory=$true, ValueFromPipeline=$true)]
        [string]$InputString
    )

    # Use Regex to find the pattern: numbers / numbers
    # \s+ matches spaces, (\d+) captures digits
    if ($InputString -match '(\d+)\/(\d+)') {
        $completed = [int]$matches[1]
        $total = [int]$matches[2]

        if ($completed -ge $total) {
            Write-Host "✅ All tasks finished ($completed/$total)" -ForegroundColor Green
            return $true
        } else {
            $remaining = $total - $completed
            Write-Host "⏳ Pending: $remaining tasks remaining ($completed/$total)" -ForegroundColor Yellow
            return $false
        }
    } elseif ($InputString -match 'Complete') {
        Write-Host "✅ No tasks found" -ForegroundColor Green
        return $true
    } else {
        throw "Could not parse task progress from input: $InputString"
    }
}

$taskId = $args[0]
while (-not (openspec list | findstr $taskId | Test-AllTasksFinished)) {
    Invoke-Claude -UserPrompt "/openspec:apply $taskId"
    Invoke-Claude -UserPrompt "write tests with practice @docs/developer-guide/testing.md for changes. and run tests, lint, type checks. fix all errors"
    Start-Sleep -Seconds 5
}

Invoke-Claude -UserPrompt "/openspec:archive $taskId"
Invoke-Claude -UserPrompt "commit all changes of $taskId to git"
