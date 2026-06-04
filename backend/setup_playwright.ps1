# PowerShell setup script for TikTok scraper dependencies
# This installs Playwright browsers needed for TikTokApi

Write-Host "🚀 Setting up TikTok scraper..." -ForegroundColor Cyan
Write-Host ""

# Install Python dependencies
Write-Host "📦 Installing Python packages..." -ForegroundColor Yellow
pip install TikTokApi playwright

# Install Playwright browsers
Write-Host "🌐 Installing Playwright browsers (Chromium)..." -ForegroundColor Yellow
python -m playwright install chromium

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Optional: Set MS_TOKEN environment variable for better TikTok access:" -ForegroundColor Cyan
Write-Host '   $env:MS_TOKEN="your_tiktok_cookie_here"' -ForegroundColor Gray
Write-Host ""
