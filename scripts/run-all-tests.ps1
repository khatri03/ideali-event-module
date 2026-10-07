param(
    [ValidateSet('frontend', 'backend', 'e2e')]
    [string[]]$Suites = @('frontend', 'backend', 'e2e'),
    [string]$RerunFailuresFrom = '',
    [switch]$FullLog,
    [switch]$Sequential,
    [string]$SharedRunDirectory = '',
    [ValidateRange(1, 8)]
    [int]$Shards = 2,
    [int]$ShardIndex = 0,
    [int]$ShardCount = 0
)

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$frontendRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = 'D:\V4Ideas\Ideali\ideali.api'
$backendTests = 'tests/Ideas.API.Tests/Ideas.API.Tests.csproj'
$sqlConnection = 'Server=localhost;Integrated Security=true;TrustServerCertificate=true;Encrypt=false;Connect Timeout=60'
$devServerPort = 3000
$apiPort = 7163
$apiProject = 'src/Presentation/Ideas.API'
$startupTimeoutSeconds = 180
$startedProcesses = @()
$ansiColorCodes = [char]27 + '\[[0-9;]*m'
$env:NO_COLOR = '1'
$env:FORCE_COLOR = '0'
# Built from code points so the script stays ASCII and reads the same in Windows PowerShell 5.1.
$pass = [char]0x2713; $passWindows = [char]0x221A; $fail = [char]0x00D7; $failPlaywright = [char]0x2718; $skip = [char]0x2193
$frontendResultPattern = "^\s*($pass|$fail|$skip)\s"
$frontendFailurePattern = "^\s*$fail\s"
$e2eResultPattern = "^\s+(ok|$pass|$passWindows|$failPlaywright|$fail|x|-)\s+\d+\s"
$e2eFailurePattern = "^\s+($failPlaywright|$fail|x)\s+\d+\s"
$frontendSectionPattern = '(Failed Tests|Unhandled Errors|^\s*FAIL\s|^\s*Test Files\s|^\s*Tests\s)'
$e2eSectionPattern = '^\s+(\d+\)\s+\[|\d+\s+(failed|passed|skipped|flaky|did not run))'

$isRerun = $RerunFailuresFrom -ne ''
if ($isRerun -and -not (Test-Path $RerunFailuresFrom)) { throw "Source run folder not found: $RerunFailuresFrom" }
$runPrefix = if ($isRerun) { 'failed' } else { 'run' }
$isChild = $SharedRunDirectory -ne ''
$runDirectory = if ($isChild) { $SharedRunDirectory } else { Join-Path $PSScriptRoot ("test-runs/{0}-{1}" -f $runPrefix, (Get-Date -Format 'yyyyMMdd-HHmmss')) }
New-Item -ItemType Directory -Force -Path $runDirectory | Out-Null
$isShard = $ShardCount -gt 1
$shardTag = if ($isShard) { "#$ShardIndex/$ShardCount" } else { '' }
$suiteLabel = if ($isShard) { "{0}-{1}of{2}" -f ($Suites -join '+'), $ShardIndex, $ShardCount } else { $Suites -join '+' }
$shardsPerSuite = if ($isRerun) { 1 } else { $Shards }
$plannedProcesses = ($Suites | ForEach-Object { if ($_ -eq 'frontend') { 1 } else { $shardsPerSuite } } | Measure-Object -Sum).Sum
$runInParallel = -not $Sequential -and -not $isChild -and $plannedProcesses -gt 1
$logName = if ($isChild) { "all-tests-$suiteLabel.log" } elseif ($runInParallel) { 'orchestrator.log' } else { 'all-tests.log' }
$logFile = Join-Path $runDirectory $logName
$failuresFile = Join-Path $runDirectory $(if ($isChild) { "failures-$suiteLabel.log" } else { 'failures.log' })
$progressIds = @{ frontend = 1; backend = 2; e2e = 3 }
$e2eArtifacts = Join-Path $runDirectory $(if ($isShard) { "playwright-artifacts-$ShardIndex" } else { 'playwright-artifacts' })

function Write-Log([string]$line, [switch]$ScreenOnly) {
    $stamped = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $line
    Write-Host $stamped
    if (-not $ScreenOnly) { Add-Content -Path $logFile -Value $stamped -Encoding UTF8 }
}

function Format-Duration([timespan]$span) {
    return '{0:00}:{1:00}:{2:00}' -f [int][math]::Floor($span.TotalHours), $span.Minutes, $span.Seconds
}

function ConvertTo-PlainLine($item) {
    $text = if ($item -is [System.Management.Automation.ErrorRecord]) { $item.Exception.Message } else { "$item" }
    return $text -replace $ansiColorCodes, ''
}

function Get-OutputLines([scriptblock]$command, [string]$workingDirectory) {
    Push-Location $workingDirectory
    try { & $command 2>&1 | ForEach-Object { ConvertTo-PlainLine $_ } }
    finally { Pop-Location }
}

function Invoke-Suite {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [int]$Total,
        [string]$ResultPattern,
        [string]$FailurePattern,
        [string]$FailureSectionPattern,
        [scriptblock]$Command
    )

    Write-Log "=== START $Name$shardTag | folder: $WorkingDirectory | tests expected: $Total ==="
    $startedAt = Get-Date
    $clock = [System.Diagnostics.Stopwatch]::StartNew()
    $done = 0
    $failed = 0
    $capturing = $false
    $progressId = $progressIds[$Name] * 10 + $ShardIndex
    Push-Location $WorkingDirectory
    try {
        & $Command 2>&1 | ForEach-Object {
            $line = ConvertTo-PlainLine $_
            if ($line -match $ResultPattern) {
                $capturing = $false
    $progressId = $progressIds[$Name] * 10 + $ShardIndex
                $done++
                if ($line -match $FailurePattern) {
                    $failed++
                    $capturing = $true
                    Add-Content -Path $failuresFile -Value "[$Name] $line" -Encoding UTF8
                }
                $percent = if ($Total -gt 0) { [math]::Min(100, [int](100 * $done / $Total)) } else { 0 }
                Write-Progress -Id $progressId -Activity "$Name$shardTag ($WorkingDirectory)" -Status "$done/$Total | failed $failed" -PercentComplete $percent
            }
            elseif ($line -match $FailureSectionPattern) { $capturing = $true }
            Write-Log ("[{0}{1} {2}/{3} fail:{4}] {5}" -f $Name, $shardTag, $done, $Total, $failed, $line) -ScreenOnly:(-not ($FullLog -or $capturing))
        }
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
        Write-Progress -Id $progressId -Activity "$Name$shardTag" -Completed
    }
    $clock.Stop()
    $endedAt = Get-Date
    Write-Log ("=== END $Name$shardTag | exit code $exitCode | ran $done/$Total | failed $failed | took {0} ===" -f (Format-Duration $clock.Elapsed))
    return [pscustomobject]@{ Name = $Name; Label = $suiteLabel; ShardIndex = $ShardIndex; ShardCount = $ShardCount; ExitCode = $exitCode; Done = $done; Failed = $failed; StartedAt = $startedAt.ToString('HH:mm:ss'); EndedAt = $endedAt.ToString('HH:mm:ss'); Elapsed = $clock.Elapsed }
}

function Get-JsonArrayLength([string[]]$lines) {
    $start = [array]::IndexOf($lines, '[')
    if ($start -lt 0) { return 0 }
    $parsed = ($lines[$start..($lines.Count - 1)] -join "`n") | ConvertFrom-Json
    return ($parsed | Measure-Object).Count
}

function Get-FailedFrontendFiles {
    $report = Join-Path $RerunFailuresFrom 'frontend-junit.xml'
    if (-not (Test-Path $report)) { return @() }
    [xml]$junit = Get-Content $report -Raw
    $failing = $junit.SelectNodes('//testcase[failure or error]')
    return @($failing | ForEach-Object { $_.GetAttribute('classname') } | Sort-Object -Unique)
}

function Get-FailedBackendNames {
    $names = foreach ($report in Get-ChildItem -Path $RerunFailuresFrom -Filter 'backend*.trx' -ErrorAction SilentlyContinue) {
        [xml]$trx = Get-Content $report.FullName -Raw
        $failing = $trx.GetElementsByTagName('UnitTestResult') | Where-Object { $_.GetAttribute('outcome') -eq 'Failed' }
        $failing | ForEach-Object { ($_.GetAttribute('testName') -split '\(')[0] }
    }
    return @($names | Sort-Object -Unique)
}

function Get-FailedEndToEndTargets {
    $report = Join-Path $RerunFailuresFrom 'failures.log'
    if (-not (Test-Path $report)) { return @() }
    $targets = Get-Content $report | Where-Object { $_ -like '[[]e2e]*' } | ForEach-Object {
        if ($_ -match '([^\\/\s]+\.spec\.ts):(\d+)') { 'e2e/{0}:{1}' -f $Matches[1], $Matches[2] }
    }
    return @($targets | Sort-Object -Unique)
}

function Invoke-Frontend {
    $files = @()
    if ($isRerun) {
        $files = Get-FailedFrontendFiles
        if ($files.Count -eq 0) { Write-Log 'frontend: no failed tests in the source run.'; return }
    }
    Write-Log 'Counting frontend tests (takes up to 90 seconds)...'
    $total = Get-JsonArrayLength @(Get-OutputLines { npx vitest list --json $files } $frontendRoot)
    Invoke-Suite -Name 'frontend' -WorkingDirectory $frontendRoot -Total $total `
        -ResultPattern $frontendResultPattern -FailurePattern $frontendFailurePattern -FailureSectionPattern $frontendSectionPattern `
        -Command { npx vitest run $files --reporter=verbose --reporter=junit --outputFile.junit="$runDirectory/frontend-junit.xml" }
}

function Invoke-Backend {
    $filter = @()
    $settingsArgument = @()
    $buildArgument = '--no-build'
    $trxName = 'backend.trx'
    if ($isShard) {
        $plan = Get-Content (Join-Path $runDirectory 'backend-shards.json') -Raw | ConvertFrom-Json
        $count = [int]@($plan.Counts)[$ShardIndex - 1]
        $settingsArgument = @('--settings', (Join-Path $runDirectory "backend-shard-$ShardIndex.runsettings"))
        $trxName = "backend-$ShardIndex.trx"
    }
    elseif ($isRerun) {
        $names = Get-FailedBackendNames
        if ($names.Count -eq 0) { Write-Log 'backend: no failed tests in the source run.'; return }
        $filter = @('--filter', (($names | ForEach-Object { "FullyQualifiedName~$_" }) -join '|'))
        $buildArgument = '--nologo'
        $count = $names.Count
    }
    else {
        Write-Log 'Counting backend tests (builds the solution first)...'
        $listing = Get-OutputLines { dotnet test $backendTests --list-tests } $backendRoot
        # Theory rows are listed once per method, so this total can read lower than the executed count.
        $count = @($listing | Where-Object { $_ -match '^    \S' }).Count
    }
    Invoke-Suite -Name 'backend' -WorkingDirectory $backendRoot -Total $count `
        -ResultPattern '^\s+(Passed|Failed|Skipped)\s' -FailurePattern '^\s+Failed\s' -FailureSectionPattern '^\s*(Failed!|Passed!|Total tests:|Test Run )' `
        -Command { dotnet test $backendTests $buildArgument $filter $settingsArgument --logger 'console;verbosity=normal' --logger "trx;LogFileName=$trxName" --results-directory $runDirectory }
}

function Test-PortOpen([int]$port) {
    Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
}

function Start-ServiceIfDown([string]$name, [int]$port, [string]$workingDirectory, [string]$executable, [string[]]$arguments) {
    if (Test-PortOpen $port) {
        Write-Log "$name already running on port $port."
        return $true
    }
    Write-Log "$name not running. Starting it on port $port."
    $serviceLog = Join-Path $runDirectory "$name.log"
    $process = Start-Process -FilePath $executable -ArgumentList $arguments -WorkingDirectory $workingDirectory `
        -RedirectStandardOutput $serviceLog -RedirectStandardError "$serviceLog.err" -WindowStyle Hidden -PassThru
    $script:startedProcesses += $process
    $deadline = (Get-Date).AddSeconds($startupTimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortOpen $port) {
            Write-Log "$name is up on port $port."
            return $true
        }
        Start-Sleep -Seconds 3
    }
    Write-Log "$name did not open port $port within $startupTimeoutSeconds seconds. See $serviceLog."
    return $false
}

function Stop-StartedServices {
    foreach ($process in $script:startedProcesses) {
        Write-Log "Stopping $($process.ProcessName) (pid $($process.Id)) started by this script."
        taskkill /PID $process.Id /T /F | Out-Null
    }
}

function Start-EndToEndServices {
    $apiUp = Start-ServiceIfDown 'api' $apiPort (Join-Path $backendRoot $apiProject) 'dotnet' @('run', '--launch-profile', 'https', '--no-build')
    $devServerUp = Start-ServiceIfDown 'dev-server' $devServerPort $frontendRoot 'cmd.exe' @('/c', 'npm run dev')
    return ($apiUp -and $devServerUp)
}

function Invoke-EndToEnd {
    $targets = @()
    if ($isRerun) {
        $targets = Get-FailedEndToEndTargets
        if ($targets.Count -eq 0) { Write-Log 'e2e: no failed tests in the source run.'; return }
    }
    $shardArgument = if ($isShard) { @("--shard=$ShardIndex/$ShardCount") } else { @() }
    if (-not (Start-EndToEndServices)) {
        Write-Log 'e2e SKIPPED: a required service did not start.'
        return [pscustomobject]@{ Name = 'e2e'; ExitCode = -1; Done = 0; Failed = 0; StartedAt = 'not run'; EndedAt = 'not run'; Elapsed = [timespan]::Zero }
    }
    $total = $targets.Count
    if (-not $isRerun) {
        $listing = Get-OutputLines { npx playwright test --list $shardArgument } $frontendRoot
        $total = @($listing | Where-Object { $_ -match '^\s+\[chromium\]' }).Count
    }
    Invoke-Suite -Name 'e2e' -WorkingDirectory $frontendRoot -Total $total `
        -ResultPattern $e2eResultPattern -FailurePattern $e2eFailurePattern -FailureSectionPattern $e2eSectionPattern `
        -Command { npx playwright test $targets $shardArgument --reporter=list --output=$e2eArtifacts }
}

function Invoke-Suites([string[]]$names) {
    $collected = @()
    if ($names -contains 'frontend') { $collected += @(Invoke-Frontend) }
    if ($names -contains 'backend') { $collected += @(Invoke-Backend) }
    if ($names -contains 'e2e') { $collected += @(Invoke-EndToEnd) }
    return $collected
}

function Invoke-SequentialRun {
    try { return @(Invoke-Suites $Suites) }
    finally { Stop-StartedServices }
}

function Build-BackendOnce {
    Write-Log 'Building the backend once before the suites start in parallel...'
    $summaryLine = '(error|Warning\(s\)|Error\(s\)|Build succeeded|Build FAILED|Time Elapsed)'
    $exitCode = 0
    Push-Location $backendRoot
    try {
        dotnet build $backendTests --nologo 2>&1 | ForEach-Object { ConvertTo-PlainLine $_ } | Where-Object { $_ -match $summaryLine } | ForEach-Object { Write-Log $_ }
        $exitCode = $LASTEXITCODE
    }
    finally { Pop-Location }
    return $exitCode -eq 0
}

function Get-BackendClassCounts {
    Push-Location $backendRoot
    try { $listing = dotnet test $backendTests --no-build --list-tests 2>&1 | ForEach-Object { ConvertTo-PlainLine $_ } }
    finally { Pop-Location }
    $classNames = $listing | Where-Object { $_ -match '^    \S' } | ForEach-Object {
        $method = ($_.Trim() -split '\(')[0]
        $method.Substring(0, [math]::Max($method.LastIndexOf('.'), 0))
    }
    return @($classNames | Group-Object | Sort-Object Count -Descending)
}

function New-BackendShardPlan([int]$count) {
    # Whole classes stay together so xunit collection fixtures keep their ordering; classes are handed to the lightest shard first.
    $bins = @(1..$count | ForEach-Object { [pscustomobject]@{ Classes = (New-Object System.Collections.Generic.List[string]); Tests = 0 } })
    foreach ($class in Get-BackendClassCounts) {
        $lightest = $bins | Sort-Object Tests | Select-Object -First 1
        $lightest.Classes.Add($class.Name)
        $lightest.Tests += $class.Count
    }
    for ($i = 0; $i -lt $count; $i++) {
        $filter = ($bins[$i].Classes | ForEach-Object { "FullyQualifiedName~$_." }) -join '|'
        $settings = "<RunSettings><RunConfiguration><TestCaseFilter>$filter</TestCaseFilter></RunConfiguration></RunSettings>"
        Set-Content -Path (Join-Path $runDirectory ("backend-shard-{0}.runsettings" -f ($i + 1))) -Value $settings -Encoding UTF8
    }
    $counts = @($bins | ForEach-Object { $_.Tests })
    [pscustomobject]@{ Counts = $counts } | ConvertTo-Json | Set-Content -Path (Join-Path $runDirectory 'backend-shards.json') -Encoding UTF8
    Write-Log ("Backend split into {0} shards of {1} tests (listed rows)." -f $count, ($counts -join ' / '))
}

function Get-SuiteJobs([int]$shardTotal) {
    $jobs = foreach ($suite in $Suites) {
        $parts = if ($suite -eq 'frontend') { 1 } else { $shardTotal }
        foreach ($index in 1..$parts) {
            $label = if ($parts -gt 1) { "{0}-{1}of{2}" -f $suite, $index, $parts } else { $suite }
            [pscustomobject]@{ Suite = $suite; Index = $(if ($parts -gt 1) { $index } else { 0 }); Count = $(if ($parts -gt 1) { $parts } else { 0 }); Label = $label }
        }
    }
    return @($jobs)
}

function Start-SuiteProcess($job) {
    $argumentText = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -Suites {1} -SharedRunDirectory "{2}" -ShardIndex {3} -ShardCount {4}' -f $PSCommandPath, $job.Suite, $runDirectory, $job.Index, $job.Count
    if ($isRerun) { $argumentText += ' -RerunFailuresFrom "{0}"' -f $RerunFailuresFrom }
    if ($FullLog) { $argumentText += ' -FullLog' }
    return Start-Process -FilePath 'powershell.exe' -ArgumentList $argumentText -NoNewWindow -PassThru
}

function Read-SuiteResult($job) {
    $file = Join-Path $runDirectory "result-$($job.Label).json"
    if (-not (Test-Path $file)) {
        return [pscustomobject]@{ Name = $job.Suite; Label = $job.Label; ShardIndex = $job.Index; ShardCount = $job.Count; ExitCode = -1; Done = 0; Failed = 0; StartedAt = 'not run'; EndedAt = 'not run'; Elapsed = [timespan]::Zero }
    }
    $saved = Get-Content $file -Raw | ConvertFrom-Json
    return [pscustomobject]@{ Name = $saved.Name; Label = $saved.Label; ShardIndex = $saved.ShardIndex; ShardCount = $saved.ShardCount; ExitCode = $saved.ExitCode; Done = $saved.Done; Failed = $saved.Failed; StartedAt = $saved.StartedAt; EndedAt = $saved.EndedAt; Elapsed = [timespan]::FromSeconds($saved.ElapsedSeconds) }
}

function Merge-SuiteFailures {
    $perSuite = Get-ChildItem -Path $runDirectory -Filter 'failures-*.log' -ErrorAction SilentlyContinue
    foreach ($file in $perSuite) { Get-Content $file.FullName | Add-Content -Path $failuresFile -Encoding UTF8 }
}

function Invoke-ParallelRun {
    $shardTotal = $shardsPerSuite
    $needsBackend = ($Suites -contains 'backend') -or ($Suites -contains 'e2e')
    if ($needsBackend -and -not (Build-BackendOnce)) { throw 'Backend build failed. Fix it or run with -Sequential.' }
    if (($Suites -contains 'backend') -and $shardTotal -gt 1) { New-BackendShardPlan $shardTotal }
    $jobs = Get-SuiteJobs $shardTotal
    try {
        if ($Suites -contains 'e2e') { Start-EndToEndServices | Out-Null }
        Write-Log "Starting $($jobs.Count) processes in parallel: $(($jobs | ForEach-Object { $_.Label }) -join ', '). Lines are mixed on screen; each line carries its suite name."
        $children = @($jobs | ForEach-Object { Start-SuiteProcess $_ })
        $children | Wait-Process
    }
    finally { Stop-StartedServices }
    Merge-SuiteFailures
    return @($jobs | ForEach-Object { Read-SuiteResult $_ })
}
function Save-SuiteResults($suiteResults) {
    foreach ($result in $suiteResults) {
        $saved = [pscustomobject]@{ Name = $result.Name; Label = $result.Label; ShardIndex = $result.ShardIndex; ShardCount = $result.ShardCount; ExitCode = $result.ExitCode; Done = $result.Done; Failed = $result.Failed; StartedAt = $result.StartedAt; EndedAt = $result.EndedAt; ElapsedSeconds = $result.Elapsed.TotalSeconds }
        $saved | ConvertTo-Json | Set-Content -Path (Join-Path $runDirectory ("result-{0}.json" -f $result.Label)) -Encoding UTF8
    }
}

function Write-MasterLog($suiteResults) {
    $master = Join-Path $runDirectory 'all-tests.log'
    Set-Content -Path $master -Value "MASTER LOG | $runDirectory" -Encoding UTF8
    Add-Content -Path $master -Value '' -Encoding UTF8
    Get-Content $logFile | Where-Object { $_ -match 'SUMMARY \|' } | Add-Content -Path $master -Encoding UTF8
    $earliestStart = { ($_.Group | ForEach-Object { if ($_.StartedAt -eq 'not run') { '99:99:99' } else { $_.StartedAt } } | Sort-Object | Select-Object -First 1) }
    foreach ($suite in ($suiteResults | Group-Object Name | Sort-Object $earliestStart)) {
        Add-Content -Path $master -Value '' -Encoding UTF8
        Add-Content -Path $master -Value ("##### {0} #####" -f $suite.Name.ToUpper()) -Encoding UTF8
        foreach ($result in ($suite.Group | Sort-Object ShardIndex)) {
            $heading = if ($result.ShardCount -gt 1) { "----- shard {0}/{1}" -f $result.ShardIndex, $result.ShardCount } else { '-----' }
            Add-Content -Path $master -Value ("{0} (started {1}, ended {2}) -----" -f $heading, $result.StartedAt, $result.EndedAt) -Encoding UTF8
            $suiteLog = Join-Path $runDirectory ("all-tests-{0}.log" -f $result.Label)
            if (Test-Path $suiteLog) { Get-Content $suiteLog | Add-Content -Path $master -Encoding UTF8 }
        }
    }
}
function Write-RunSummary($suiteResults, [datetime]$startedAt, [timespan]$elapsed) {
    foreach ($result in $suiteResults) {
        Write-Log ("SUMMARY | {0}{7} | started {1} | ended {2} | took {3} | exit {4} | ran {5} | failed {6}" -f $result.Name, $result.StartedAt, $result.EndedAt, (Format-Duration $result.Elapsed), $result.ExitCode, $result.Done, $result.Failed, $(if ($result.ShardCount -gt 1) { "#$($result.ShardIndex)/$($result.ShardCount)" } else { '' }))
    }
    if ($isChild) { return }
    Write-Log ("SUMMARY | whole run | started {0} | ended {1} | took {2}" -f $startedAt.ToString('HH:mm:ss'), (Get-Date).ToString('HH:mm:ss'), (Format-Duration $elapsed))
}

if (-not $isChild -and (Get-Process -Name 'Ideas.API' -ErrorAction SilentlyContinue)) {
    Write-Log 'WARNING: Ideas.API is running. The backend build fails with MSB3027 until it is stopped.'
}

$env:IDEALI_TEST_SQLSERVER = $sqlConnection
$runStartedAt = Get-Date
$total = [System.Diagnostics.Stopwatch]::StartNew()
Write-Log "Run started. Suites: $($Suites -join ', ') | log: $logFile"


$results = if ($runInParallel) { Invoke-ParallelRun } else { Invoke-SequentialRun }

$total.Stop()
if ($isChild) { Save-SuiteResults $results }
Write-RunSummary $results $runStartedAt $total.Elapsed
if (-not $isChild) {
    Write-Host "Share this folder: $runDirectory"
    Write-Host "  all-tests.log (failed cases only; -FullLog for everything), failures.log, frontend-junit.xml, backend*.trx, playwright-artifacts* (failure screenshots and traces)"
    if ($runInParallel) {
        Write-MasterLog $results
        Write-Host "  Parallel run: all-tests.log is the master (one section per suite); per-suite logs are all-tests-<suite>.log, orchestration steps are in orchestrator.log"
    }
}