#!/bin/bash
# Setup script for TikTok scraper dependencies
# This installs Playwright browsers needed for TikTokApi

echo "🚀 Setting up TikTok scraper..."
echo ""

# Install Python dependencies
echo "📦 Installing Python packages..."
pip install TikTokApi playwright

# Install Playwright browsers
echo "🌐 Installing Playwright browsers (Chromium)..."
python -m playwright install chromium

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Optional: Set MS_TOKEN environment variable for better TikTok access:"
echo "   export MS_TOKEN='your_tiktok_cookie_here'"
echo ""
