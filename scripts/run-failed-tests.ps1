param(
    [string]$From = '',
    [switch]$Sequential
)

$runsDirectory = Join-Path $PSScriptRoot 'test-runs'
if ($From -eq '') {
    $latest = Get-ChildItem -Path $runsDirectory -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path (Join-Path $_.FullName 'failures.log') } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $latest) { throw "No earlier run with failures found under $runsDirectory." }
    $From = $latest.FullName
}

& (Join-Path $PSScriptRoot 'run-all-tests.ps1') -RerunFailuresFrom $From -Sequential:$Sequential