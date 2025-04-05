# 
# Generate and send a report to GitHub Gist 
# 
# The report is stored in a Gist on GitHub 
# https://gist.github.com/funvill/95b658729c105829aec9ea0e33cfafdb/
#
# The report will be displayed on this page:
# https://blog.abluestar.com/other/counterproductive.html
#
# History
# 2025Apr03 - Initial version
# 2025Apr04 - Moved settings to a settings.json file. 
# 


# Load settings from JSON file
$settingsFile = "settings.json"
if (-Not (Test-Path $settingsFile)) {
    Write-Error "Settings file '$settingsFile' not found."
    exit 1
}

$settings = Get-Content $settingsFile | ConvertFrom-Json

# Run the report generation script
Write-Host "Running report generation and sending to Gist..."
try {
    & node $settings.nodeScriptGenerateReport
    & node $settings.nodeScriptSendGist $settings.gistId $settings.githubToken $settings.gistFilename $settings.reportFileName
    if ($LASTEXITCODE -ne 0) {
        throw "Error: script failed with exit code $LASTEXITCODE."
    }
    Write-Host "Completed successfully."
} catch {
    Write-Error $_
    exit 1
}
