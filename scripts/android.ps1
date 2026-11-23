param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $CliArgs
)

$ErrorActionPreference = 'Stop'

# Windows Ninja/CMake cannot build BGeo codegen under the long UptulaSoft path
# (>260 chars), even when mapped with subst (real path is still used).
# Build from a short physical copy instead.
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$shortRoot = 'C:\rn\pkmd'

Write-Host "Syncing project to short path: $shortRoot"
New-Item -ItemType Directory -Path $shortRoot -Force | Out-Null

# Keep node_modules / native caches when possible; refresh source + config.
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
# Robocopy exit codes 0-7 are success
if ($LASTEXITCODE -ge 8) {
    throw "Robocopy failed with exit code $LASTEXITCODE"
}

if (-not (Test-Path (Join-Path $shortRoot 'node_modules\react-native'))) {
    Write-Host 'Installing npm dependencies in short path...'
    Push-Location $shortRoot
    try {
        npm install --no-fund --no-audit
        if ($LASTEXITCODE -ne 0) { throw "npm install failed ($LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
}

# Drop stale CMake caches that may still reference the long path
$cxxDir = Join-Path $shortRoot 'android\app\.cxx'
if (Test-Path $cxxDir) {
    Remove-Item $cxxDir -Recurse -Force -ErrorAction SilentlyContinue
}
$autolinkDir = Join-Path $shortRoot 'android\build\generated\autolinking'
if (Test-Path $autolinkDir) {
    Remove-Item $autolinkDir -Recurse -Force -ErrorAction SilentlyContinue
}

# Free Metro port 8081 when another process is holding it
try {
    $listeners = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
    foreach ($l in $listeners) {
        if ($l.OwningProcess) {
            Write-Host "Stopping process on port 8081 (PID $($l.OwningProcess))"
            Stop-Process -Id $l.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
} catch {
    # Ignore port cleanup failures; RN CLI will prompt if still busy
}

Set-Location $shortRoot
Write-Host "Building / installing from $shortRoot"
$reactNativeCli = Join-Path $shortRoot 'node_modules\.bin\react-native.cmd'
& $reactNativeCli run-android @CliArgs
$exitCode = $LASTEXITCODE

Write-Host "Source of truth remains: $projectPath"
Write-Host "Android build root used: $shortRoot"
exit $exitCode
