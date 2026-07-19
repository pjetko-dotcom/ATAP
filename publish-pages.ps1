param(
  [string]$Message = "Update site"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoPath

Write-Host "[1/3] Pulling latest changes from GitHub..."
git pull origin main

Write-Host "[2/3] Building for GitHub Pages..."
npm run build:pages

Write-Host "[3/3] Publishing to GitHub Pages..."
if ($Message) {
  git add .
  git commit -m $Message
  git push origin main
}
npm run publish:pages

Write-Host "Done."
