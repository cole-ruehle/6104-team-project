# PowerShell script to start txtai semantic search service on Windows

Write-Host "Starting txtai semantic search service..." -ForegroundColor Green

# Get the script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Change to project root
Set-Location $ProjectRoot

# Set environment variables for Windows
$env:KMP_DUPLICATE_LIB_OK = "TRUE"

Write-Host "Starting service on http://localhost:8001" -ForegroundColor Yellow
Write-Host "Using config: $ProjectRoot\semantic_search_service\app.yml" -ForegroundColor Yellow
Write-Host ""

# Use Python script for reliable config loading
python "$ProjectRoot\semantic_search_service\start_txtai.py"
