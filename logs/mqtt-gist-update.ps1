# 
# Subscribes to a MQTT topic and processes messages.
# Stores the logs into a output file that is used to generate a report.
# Then generates a report and sends it to a Gist on GitHub.
# 
# The report will be displayed on this page:
# https://blog.abluestar.com/other/counterproductive.html
#
# History
# 2025Apr01 - Initial version
# 2025Apr04 - Moved settings to a settings.json file. 
#             Moved report generation to a separate script.
# 

# Configuration
# Load settings from JSON file
$settingsFile = "settings.json"
if (-Not (Test-Path $settingsFile)) {
    Write-Error "Settings file '$settingsFile' not found."
    exit 1
}

$settings = Get-Content $settingsFile | ConvertFrom-Json

# Configuration
$broker = $settings.broker
$port = $settings.port
$topic = $settings.topic
$outputFile = $settings.outputFile


# Start mosquitto_sub and process each new line as a message
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "mosquitto_sub.exe"
$psi.Arguments = "-h $broker -p $port -t `"$topic`""
$psi.RedirectStandardOutput = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $psi
$process.Start() | Out-Null
$reader = $process.StandardOutput

Write-Host "Listening to MQTT topic '$topic' on ${broker}:${port}..."

while (-not $reader.EndOfStream) {
    $line = $reader.ReadLine().Trim()
    if ($line -match '^\d+$') {
        $count = [int]$line
        $utcTimestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss")
        $localTimestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")

        Write-Host "=> Received: count=$count at $utcTimestamp"

        # Append to output.txt
        "$localTimestamp $topic $count" | Out-File -FilePath $outputFile -Append -Encoding utf8

        # Generates and sends a report to Gist using sendReport.ps1 power shell script
        & "./sendReport.ps1"

    } else {
        Write-Host "⚠️ Ignoring non-numeric message: $line"
    }
}