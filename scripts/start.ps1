param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $CliArgs
)

$ErrorActionPreference = 'Stop'

$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$shortRoot = 'C:\rn\pkmd'

Write-Host "Syncing project to short path for Metro: $shortRoot"
New-Item -ItemType Directory -Path $shortRoot -Force | Out-Null

$excludeDirs = @(
    '.git',
    '.cxx',
    'android\.gradle',
    'android\app\build',
    'android\app\.cxx',
    'android\build',
    'ios\Pods',
    'ios\build'
)

$xdArgs = @()
foreach ($d in $excludeDirs) {
    $xdArgs += '/XD'
    $xdArgs += (Join-Path $projectPath $d)
}

& robocopy $projectPath $shortRoot /E /XO /R:1 /W:1 /NFL /NDL /NJH /NJS /NP @xdArgs | Out-Null
if ($LASTEXITCODE -ge 8) {
    throw "Robocopy failed with exit code $LASTEXITCODE"
}

# Free Metro ports
foreach ($port in 8081, 8082) {
    try {
        $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($l in $listeners) {
            if ($l.OwningProcess) {
                Write-Host "Stopping process on port $port (PID $($l.OwningProcess))"
                Stop-Process -Id $l.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {}
}

# Clear stale Metro / haste caches
Get-ChildItem $env:TEMP -Filter 'metro-*' -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem $env:TEMP -Filter 'haste-map-*' -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Set-Location $shortRoot
Write-Host "Starting Metro from $shortRoot"
$reactNativeCli = Join-Path $shortRoot 'node_modules\.bin\react-native.cmd'

# Always reset cache unless caller already passed --reset-cache
$hasReset = $CliArgs | Where-Object { $_ -eq '--reset-cache' }
if (-not $hasReset) {
    $CliArgs = @('--reset-cache') + $CliArgs
}

& $reactNativeCli start @CliArgs
exit $LASTEXITCODE
