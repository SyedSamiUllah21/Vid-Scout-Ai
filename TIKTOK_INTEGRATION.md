# TikTok & Instagram Live API Integration

## 🎯 Overview

The system now uses **REAL TikTok & Instagram APIs** to fetch actual trending videos/posts with direct links, instead of relying solely on aggregator sites.

---

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Install Playwright Browsers (TikTok Only)

**CRITICAL**: TikTokApi uses Playwright (headless Chromium) to bypass bot detection.

**Linux/Mac:**
```bash
bash setup_playwright.sh
```

**Windows PowerShell:**
```powershell
.\setup_playwright.ps1
```

**Manual:**
```bash
python -m playwright install chromium
```

### 3. (Optional) Set Credentials for Better Access

#### TikTok MS_TOKEN

**Linux/Mac:**
```bash
export MS_TOKEN="your_tiktok_cookie_here"
```

**Windows PowerShell:**
```powershell
$env:MS_TOKEN="your_tiktok_cookie_here"
```

#### Instagram Login (Recommended)

**In `.env` file:**
```
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password
```

**Note**: Instagram credentials are optional but highly recommended to avoid rate limits.

---

## 📋 How to Get Credentials

### TikTok MS_TOKEN (Optional)

1. Open https://www.tiktok.com in your browser
2. Log in to your TikTok account
3. Open Developer Tools (F12)
4. Go to Application → Cookies → https://www.tiktok.com
5. Find the `ms_token` cookie and copy its value
6. Set it as an environment variable

**Note**: MS_TOKEN is optional. The scraper will work in guest mode without it, but may be rate-limited.

### Instagram Login (Recommended)

1. Create or use an existing Instagram account
2. Add credentials to `.env` file:
   ```
   INSTAGRAM_USERNAME=your_username
   INSTAGRAM_PASSWORD=your_password
   ```

**Note**: Instagram login is recommended to avoid rate limits. The scraper will work without credentials but may be limited.

**Security**: Never commit credentials to Git. The `.env` file is already in `.gitignore`.

---

## 🔧 How It Works

### Research Flow with TikTok API

```
Step 1: TikTok/Instagram Research
    ↓
Try: TikTokApi.search(query)
    ↓
    ├─ SUCCESS → Return REAL TikTok videos with actual links
    │             (e.g., https://www.tiktok.com/@user/video/123...)
    │
    └─ FAIL → Fallback to aggregator sites
                 (TokBoard, TokChart, Later.com, etc.)
```

### Function: `research_tiktok_trending(query, max_results)`

**Priority 1: Real TikTok API**
- Searches TikTok directly using `TikTokApi`
- Returns actual TikTok video links
- Filters to past 7 days only
- Includes real engagement metrics (views, likes, shares)

**Fallback: Aggregator Sites**
- Uses Tavily to search TikTok trend aggregator sites
- Returns articles ABOUT TikTok trends
- Used when TikTok API is unavailable or rate-limited

---

## 📦 New Files

### `backend/tiktok_scraper.py`
TikTok API integration module with:
- `fetch_trending_videos()` - Get top trending TikTok videos
- `search_tiktok_by_keyword()` - Search TikTok by keyword
- `filter_recent_videos()` - Filter to past N days
- `format_tiktok_results_for_research()` - Format for research pipeline

### `backend/instagram_scraper.py`
Instagram API integration module with:
- `fetch_trending_hashtag_posts()` - Get trending posts for a hashtag
- `search_instagram_by_keywords()` - Search Instagram by multiple keywords
- `extract_hashtags_from_query()` - Convert query to Instagram hashtags
- `format_instagram_results_for_research()` - Format for research pipeline

### `backend/setup_playwright.sh` / `.ps1`
Setup scripts to install Playwright browsers (TikTok only)

### `backend/requirements.txt` (Updated)
Added:
```
# TikTok
TikTokApi==6.5.2
playwright==1.49.0

# Instagram
instaloader==4.13.1
```

---

## 🎯 Expected Results

### TikTok

#### Before (Aggregator-Only)
```json
{
  "title": "[TokBoard] Life coaching trends...",
  "url": "https://tokboard.com/...",
  "source": "TikTok Trends",
  "snippet": "Article about TikTok trends..."
}
```

#### After (Real TikTok API) ✅
```json
{
  "title": "TikTok: Unlock your potential with these 3 mindset shifts! 🔥",
  "url": "https://www.tiktok.com/@lifecoach_mike/video/7354821...",
  "source": "TikTok (Live API)",
  "snippet": "@lifecoach_mike: Unlock your potential with these 3 mindset shifts! #mindset #growth #success",
  "engagement": "2.3M views, 184K likes",
  "date": "2026-06-03"
}
```

### Instagram

#### Before (Aggregator-Only)
```json
{
  "title": "Instagram reels viral this week",
  "url": "https://later.com/...",
  "source": "Instagram Trends",
  "snippet": "Article about Instagram trends..."
}
```

#### After (Real Instagram API) ✅
```json
{
  "title": "Instagram Reel: Transform your mindset in 30 days...",
  "url": "https://instagram.com/p/C8xYz...",
  "source": "Instagram (Live API)",
  "snippet": "@mindset_mastery: Transform your mindset in 30 days #mindset #transformation #growth #motivation",
  "engagement": "456K likes, 2.3K comments",
  "date": "2026-06-02"
}
```

---

## 🧪 Testing

### Test TikTok Scraper Directly

```python
from tiktok_scraper import (
    fetch_trending_videos_sync,
    search_tiktok_by_keyword_sync,
    filter_recent_videos,
    format_tiktok_results_for_research
)

# Get trending videos
videos = fetch_trending_videos_sync(count=10)
print(f"Found {len(videos)} trending videos")

# Search by keyword
videos = search_tiktok_by_keyword_sync("life coaching", count=20)
print(f"Found {len(videos)} videos about life coaching")

# Filter to past 7 days
recent = filter_recent_videos(videos, days=7)
print(f"{len(recent)} videos from past 7 days")

# Format for research
results = format_tiktok_results_for_research(recent)
for r in results:
    print(f"{r['title'][:50]}... - {r['engagement']}")
```

### Test in Research Flow

Generate trending ideas and check Step 1 (TikTok/Instagram) results:

1. Run the app
2. Generate trending ideas
3. Click "Show Research Breakdown (8 Steps)"
4. Check "Step 1: TikTok + Instagram Reels"
5. Verify you see actual TikTok links (tiktok.com/@user/video/...)

---

## ⚠️ Troubleshooting

### Issue: "TikTokApi not installed"
**Solution**: Run `pip install TikTokApi playwright` then `python -m playwright install chromium`

### Issue: "Playwright browsers not found"
**Solution**: Run `python -m playwright install chromium`

### Issue: TikTok API returns empty results
**Solution**: 
1. Check if TikTok is blocking the scraper (they do this sometimes)
2. Set MS_TOKEN environment variable
3. System will automatically fallback to aggregator sites

### Issue: "Event loop already running" error
**Solution**: The code uses `asyncio.new_event_loop()` to avoid conflicts with Flask

### Issue: Rate limiting / 429 errors
**Solution**:
1. Set MS_TOKEN cookie
2. Reduce scrape frequency
3. System automatically falls back to aggregators

---

## 🔒 Security Notes

1. **MS_TOKEN is Optional**: The scraper works without it
2. **Never commit MS_TOKEN**: Add it to `.env` file (which is .gitignored)
3. **Headless Browser**: Playwright runs in headless mode (no GUI)
4. **Rate Limits**: TikTok may block aggressive scraping - system has fallbacks

---

## 📊 Performance Impact

- **Scraping Time**: ~5-10 seconds per query (TikTok API)
- **Fallback Time**: ~3-5 seconds per query (aggregator sites)
- **Total Research Time**: Similar to before (~3 minutes for all 8 steps)
- **Memory**: +50-100 MB (Playwright browser)

---

## 🚀 Deployment Notes

### Render.com / Cloud Platforms

**Add to `render.yaml`:**
```yaml
services:
  - type: web
    name: yt-researcher-backend
    buildCommand: pip install -r requirements.txt && python -m playwright install chromium
    # ... rest of config
```

**Or add Build Command:**
```bash
pip install -r requirements.txt && python -m playwright install chromium
```

### Docker

```dockerfile
FROM python:3.11

# Install Playwright system dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libasound2

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Install Playwright browsers
RUN python -m playwright install chromium

# ... rest of Dockerfile
```

---

## 🎉 Benefits

1. **Real TikTok Links**: Direct links to actual TikTok videos
2. **Fresh Data**: Videos from past 7 days only
3. **Real Engagement**: Actual view/like counts, not estimates
4. **Better Ideas**: LLM sees real viral content, not articles about trends
5. **Automatic Fallback**: If TikTok API fails, uses aggregator sites seamlessly

---

## 📝 Next Steps

1. **Install dependencies**: Run `pip install -r requirements.txt`
2. **Install Playwright**: Run `python -m playwright install chromium`
3. **(Optional) Set MS_TOKEN**: For better rate limits
4. **Test**: Generate trending ideas and verify TikTok links appear
5. **Deploy**: Add Playwright install to build command on Render

---

## 🔗 Resources

- [TikTokApi Documentation](https://github.com/davidteather/TikTok-Api)
- [Playwright Documentation](https://playwright.dev/python/)
- [Getting MS_TOKEN Guide](https://github.com/davidteather/TikTok-Api/blob/main/docs/get_started.md)
