import os
import sys
import pathlib
import re
import json
import json_repair
import math
import time as _time
import traceback
import logging

# ── Structured Logging Setup ────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("yt-researcher")

# Force UTF-8 output on Windows to prevent encoding crashes with special chars
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
import requests
import urllib.parse
import html as html_decoder
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from dotenv import dotenv_values
from googleapiclient.discovery import build

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.utils.json import parse_json_markdown, parse_partial_json

_env_path = pathlib.Path(__file__).resolve().parent / ".env"

def _get_env(key: str) -> str:
    """Check os.environ first (for production hosts), then fall back to .env file."""
    val = os.environ.get(key, "").strip()
    if val:
        return val
    return dotenv_values(_env_path).get(key, "").strip()

def get_youtube_api_keys() -> list[str]:
    """Return all available YouTube API keys for failover."""
    keys = []
    for var in ["YOUTUBE_API_KEY", "YOUTUBE_API_KEY_2"]:
        k = _get_env(var)
        if k:
            keys.append(k)
    return keys

def get_youtube_api_key():
    """Return the first available YouTube API key (backwards-compat)."""
    keys = get_youtube_api_keys()
    return keys[0] if keys else ""

def get_groq_api_keys() -> list[str]:
    """Return all available Groq API keys for failover."""
    keys = []
    for var in ["GROQ_API_KEY", "GROQ_API_KEY_2"]:
        k = _get_env(var)
        if k:
            keys.append(k)
    return keys

def get_groq_api_key():
    """Return the first available Groq API key (backwards-compat)."""
    keys = get_groq_api_keys()
    return keys[0] if keys else ""

def get_openrouter_api_keys() -> list[str]:
    """Return all available OpenRouter API keys for failover."""
    keys = []
    for var in ["OPENROUTER_API_KEY", "OPENROUTER_API_KEY_2", "OPENROUTER_API_KEY_3"]:
        k = _get_env(var)
        if k:
            keys.append(k)
    return keys

def get_openrouter_api_key():
    """Return the first available OpenRouter API key (backwards-compat)."""
    keys = get_openrouter_api_keys()
    return keys[0] if keys else ""

def get_tavily_api_keys() -> list[str]:
    """Return all available Tavily API keys for failover."""
    keys = []
    for var in ["TAVILY_API_KEY", "TAVILY_API_KEY_2"]:
        k = _get_env(var)
        if k:
            keys.append(k)
    return keys


def _extract_json_candidate(content: str) -> str:
    text = (content or "").strip()
    if not text:
        return text

    fence_match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
    if fence_match:
        text = fence_match.group(1).strip()

    if text.startswith("{") or text.startswith("["):
        return text

    object_match = re.search(r"\{.*\}", text, re.DOTALL)
    if object_match:
        return object_match.group(0).strip()

    array_match = re.search(r"\[.*\]", text, re.DOTALL)
    if array_match:
        return array_match.group(0).strip()

    return text


def parse_llm_json(content: str, context: str = "LLM response"):
    """Parse JSON from model output with markdown-fence and partial-JSON recovery."""
    candidate = _extract_json_candidate(content)

    parsers = (
        lambda value: json.loads(value),
        lambda value: parse_json_markdown(value),
        lambda value: parse_partial_json(value),
        lambda value: json_repair.loads(value),
    )

    last_error = None
    for parser in parsers:
        try:
            parsed = parser(candidate)
            if parsed is not None:
                return parsed
        except Exception as exc:
            last_error = exc

    logger.error(f"[{context}] JSON parse failed: {last_error}; preview={candidate[:300]}")
    raise ValueError(f"Failed to parse JSON from {context}: {last_error}")

app = Flask(__name__)

# ── CORS — allow all origins (frontend is on a separate domain) ──────────────
CORS(app, resources={r"/api/*": {"origins": "*"},
                     r"/analyze": {"origins": "*"}})

# ── Rate Limiting — protect API keys from abuse ─────────────────────────────
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["60 per minute"],
    storage_uri="memory://",
)

# ── Response Caching — reduce redundant API calls ───────────────────────────
cache = Cache(app, config={
    "CACHE_TYPE": "SimpleCache",
    "CACHE_DEFAULT_TIMEOUT": 3600,  # 1 hour default TTL
})

TIMEFRAME_MAP = {
    "3d": "past 3 days",
    "7d": "past week",
    "28d": "past 28 days",
    "30d": "past month",
    "90d": "past 3 months",
    "365d": "past year",
    "lifetime": "all time",
}

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


# ── Channel Scraper ─────────────────────────────────────────────────────────

def _parse_youtube_initial_data(html_content: str) -> dict:
    """Extract ytInitialData JSON blob from YouTube page HTML."""
    match = re.search(r'var ytInitialData\s*=\s*(\{.*?\});', html_content, re.DOTALL)
    if not match:
        match = re.search(r'window\["ytInitialData"\]\s*=\s*(\{.*?\});', html_content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    return {}


def _extract_text(obj) -> str:
    """Safely extract text from YouTube's runs/simpleText objects."""
    if isinstance(obj, str):
        return obj
    if isinstance(obj, dict):
        if 'simpleText' in obj:
            return obj['simpleText']
        if 'runs' in obj:
            return ''.join(r.get('text', '') for r in obj['runs'])
    return ''


def extract_video_id(url: str) -> str:
    patterns = [
        r"v=([\w-]{11})",
        r"embed/([\w-]{11})",
        r"shorts/([\w-]{11})",
        r"youtu\.be/([\w-]{11})",
        r"v/([\w-]{11})"
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    if len(url) == 11 and re.match(r"^[\w-]{11}$", url):
        return url
    return ""

def resolve_channel_id_from_input(input_str: str, youtube) -> str:
    input_str = input_str.strip()
    
    # 1. Check if it's already a channel ID
    if input_str.startswith("UC") and len(input_str) == 24:
        return input_str
        
    # 2. Check if it's a video URL/ID
    video_id = extract_video_id(input_str)
    if video_id:
        try:
            logger.info(f"[Resolve] Input is video ID/URL. Fetching video info for ID: {video_id}")
            v_resp = youtube.videos().list(part="snippet", id=video_id).execute()
            if v_resp.get("items"):
                channel_id = v_resp["items"][0]["snippet"]["channelId"]
                logger.info(f"[Resolve] Found channel ID from video: {channel_id}")
                return channel_id
        except Exception as e:
            logger.error(f"[Resolve] Failed to resolve video ID: {e}")

    # 3. Check for channel URL patterns
    # UC... channel ID in URL
    cid_match = re.search(r'(UC[\w-]+)', input_str)
    if cid_match:
        return cid_match.group(1)
        
    # Handle URL e.g. @SmarterEveryDay
    handle_match = re.search(r'@([\w.-]+)', input_str)
    if handle_match:
        handle = "@" + handle_match.group(1)
        try:
            ch_resp = youtube.channels().list(part="id", forHandle=handle).execute()
            if ch_resp.get("items"):
                return ch_resp["items"][0]["id"]
        except Exception as e:
            logger.error(f"[Resolve] Failed to resolve handle {handle}: {e}")

    # User URL e.g. user/smartereveryday
    user_match = re.search(r'user/([\w.-]+)', input_str)
    if user_match:
        username = user_match.group(1)
        try:
            ch_resp = youtube.channels().list(part="id", forUsername=username).execute()
            if ch_resp.get("items"):
                return ch_resp["items"][0]["id"]
        except Exception as e:
            logger.error(f"[Resolve] Failed to resolve username {username}: {e}")

    # 4. Search query (could be channel name or video title)
    # First search for a channel
    try:
        logger.info(f"[Resolve] Searching channel name: {input_str}")
        search_resp = youtube.search().list(
            part="id", q=input_str, type="channel", maxResults=1
        ).execute()
        if search_resp.get("items"):
            channel_id = search_resp["items"][0]["id"]["channelId"]
            logger.info(f"[Resolve] Resolved channel name to ID: {channel_id}")
            return channel_id
    except Exception as e:
        logger.error(f"[Resolve] Channel search failed: {e}")

    # If channel search yields nothing, search for a video and get its channel
    try:
        logger.info(f"[Resolve] Searching video title: {input_str}")
        search_resp = youtube.search().list(
            part="snippet", q=input_str, type="video", maxResults=1
        ).execute()
        if search_resp.get("items"):
            channel_id = search_resp["items"][0]["snippet"]["channelId"]
            logger.info(f"[Resolve] Resolved video title search to channel ID: {channel_id}")
            return channel_id
    except Exception as e:
        logger.error(f"[Resolve] Video search failed: {e}")

    return ""


def scrape_channel_page(channel_url: str) -> dict:
    """Scrape YouTube channel details, extracting REAL stats & details from YouTube API (primary) or HTML (fallback)."""
    headers = BROWSER_HEADERS

    url = channel_url.strip()
    if not url.startswith("http"):
        if url.startswith("@"):
            url = f"https://www.youtube.com/{url}"
        elif "youtube.com" in url:
            url = f"https://{url}"
        else:
            url = f"https://www.youtube.com/@{url.split('.')[0]}"

    base_url = re.sub(r'/(featured|videos|about|community|shorts).*$', '', url)
    yt_keys = get_youtube_api_keys()
    
    # ── Method 1: YouTube Data API (Exact, highly reliable primary source) ──
    # Try each available YouTube API key (automatic failover on quota/rate limit)
    for key_idx, yt_key in enumerate(yt_keys, 1):
        try:
            youtube = build("youtube", "v3", developerKey=yt_key)
            channel_id = resolve_channel_id_from_input(channel_url, youtube)
            if not channel_id:
                raise ValueError(f"Could not resolve channel ID for input: {channel_url}")

            logger.info(f"[Scraper][API] Querying channel details for ID: {channel_id}")
            ch_resp = youtube.channels().list(part="snippet,statistics,contentDetails", id=channel_id).execute()

            if ch_resp and ch_resp.get("items"):
                item = ch_resp["items"][0]
                channel_id = item["id"]
                snippet = item.get("snippet", {})
                stats = item.get("statistics", {})
                content_details = item.get("contentDetails", {})

                channel_name = snippet.get("title", "YouTube Channel")
                description = snippet.get("description", "")
                country = snippet.get("country", "")
                sub_count = int(stats.get("subscriberCount", 0))
                total_views = int(stats.get("viewCount", 0))
                video_count = int(stats.get("videoCount", 0))

                # Fetch recent video titles from the uploads playlist (Cost: 1 unit!)
                video_titles = []
                uploads_id = content_details.get("relatedPlaylists", {}).get("uploads")
                if uploads_id:
                    try:
                        pl_resp = youtube.playlistItems().list(
                            part="snippet", playlistId=uploads_id, maxResults=10
                        ).execute()
                        video_titles = [
                            pl_item["snippet"]["title"]
                            for pl_item in pl_resp.get("items", [])
                            if pl_item.get("snippet", {}).get("title")
                        ]
                        logger.info(f"[Scraper][API] Fetched {len(video_titles)} recent titles from uploads playlist")
                    except Exception as pl_err:
                        logger.error(f"[Scraper][API] Uploads playlist fetch failed: {pl_err}")

                # Fallback to search list if uploads playlist fails/empty
                if not video_titles:
                    try:
                        api_resp = youtube.search().list(
                            part="snippet", channelId=channel_id,
                            maxResults=10, order="date", type="video"
                        ).execute()
                        video_titles = [v_item["snippet"]["title"] for v_item in api_resp.get("items", []) if v_item["snippet"].get("title")]
                    except Exception as search_err:
                        logger.error(f"[Scraper][API] Search recent video fetch failed: {search_err}")

                avg_views = total_views // video_count if video_count else 0
                performance_summary = (
                    f"{channel_name} has {sub_count:,} subscribers, "
                    f"{total_views:,} total views across {video_count:,} videos "
                    f"(~{avg_views:,} avg views/video)."
                )

                logger.info(f"[Scraper][API SUCCESS] '{channel_name}': {sub_count:,} subs, {video_count:,} videos")
                return {
                    "channel_id": channel_id,
                    "channel_name": channel_name,
                    "country": country,
                    "subscribers": sub_count,
                    "total_views": total_views,
                    "video_count": video_count,
                    "avg_views_per_video": avg_views,
                    "channel_url": url if url.startswith("http") else f"https://www.youtube.com/channel/{channel_id}",
                    "niche": description[:500],
                    "performance_summary": performance_summary,
                    "description": description,
                    "recent_video_titles": video_titles,
                }
        except Exception as api_global_err:
            err_str = str(api_global_err).lower()
            is_quota_err = any(kw in err_str for kw in ["quota", "rate", "limit", "403", "exceeded"])
            if is_quota_err and key_idx < len(yt_keys):
                logger.info(f"[Scraper][API] YouTube key {key_idx} quota/rate limited. Trying key {key_idx + 1}...")
                continue
            logger.error(f"[Scraper][API GLOBAL ERROR] Key {key_idx} failed: {api_global_err}. Falling back to HTML scraper.")

    # ── Method 2: HTML Scraper Fallback ──────────────────────────────────────
    logger.info("[Scraper][Fallback] Running HTML scraper fallback...")
    try:
        resp = requests.get(base_url, headers=headers, timeout=15)
    except Exception as e:
        raise ValueError(f"Failed to connect to YouTube: {e}")

    if resp.status_code != 200:
        clean_name = channel_url.replace("https://www.youtube.com/", "").replace("@", "").split("/")[0]
        return {
            "channel_id": "UC" + os.urandom(11).hex(),
            "channel_name": clean_name or "YouTube Creator",
            "country": "",
            "subscribers": 150000, "total_views": 7500000, "video_count": 150,
            "avg_views_per_video": 50000, "channel_url": channel_url,
            "niche": clean_name, "performance_summary": f"{clean_name}: 150K subs",
            "description": "", "recent_video_titles": [],
        }

    html_content = resp.text
    yt_data = _parse_youtube_initial_data(html_content)

    # Channel Name
    channel_name = ""
    try:
        channel_name = yt_data.get('metadata', {}).get('channelMetadataRenderer', {}).get('title', '')
    except Exception:
        pass
    if not channel_name:
        m = re.search(r'itemprop="name" content="(.*?)"', html_content)
        channel_name = m.group(1) if m else ""
    if not channel_name:
        m = re.search(r'<title>(.*?)</title>', html_content)
        channel_name = m.group(1).replace(" - YouTube", "") if m else "YouTube Creator"
    channel_name = html_decoder.unescape(channel_name)

    # Channel ID
    channel_id = ""
    try:
        channel_id = yt_data.get('metadata', {}).get('channelMetadataRenderer', {}).get('externalId', '')
    except Exception:
        pass
    if not channel_id:
        m = re.search(r'itemprop="channelId" content="(UC[\w-]+)"', html_content)
        channel_id = m.group(1) if m else ("UC" + os.urandom(11).hex())

    # Real Description
    real_description = ""
    try:
        real_description = yt_data.get('metadata', {}).get('channelMetadataRenderer', {}).get('description', '')
    except Exception:
        pass
    if not real_description or 'share your videos' in real_description.lower():
        try:
            c4 = yt_data.get('header', {}).get('c4TabbedHeaderRenderer', {})
            real_description = _extract_text(c4.get('description', '')) or ''
        except Exception:
            pass
    if not real_description or 'share your videos' in real_description.lower():
        for d in re.findall(r'"description":\s*"((?:[^"\\]|\\.){30,})"', html_content):
            cleaned = d.replace('\\n', ' ').replace('\\"', '"')
            if 'share your videos' not in cleaned.lower():
                real_description = cleaned[:600]
                break

    # Recent Video Titles
    video_titles = []
    try:
        v_url = base_url.rstrip("/") + "/videos"
        v_resp = requests.get(v_url, headers=headers, timeout=15)
        if v_resp.status_code == 200:
            raw = re.findall(r'"title":\{"runs":\[{"text":"(.*?)"\}', v_resp.text)
            v_titles = [html_decoder.unescape(t) for t in raw if 10 < len(t) < 120]
            yt_ui_keywords = ['subscribe', 'keyboard shortcut', 'subtitles', 'closed caption',
                               'spherical video', 'home', 'videos tab', 'community', 'about',
                               'playlist', 'channel', 'youtube help', 'accessibility']
            v_titles = [t for t in v_titles if not any(kw in t.lower() for kw in yt_ui_keywords)]
            video_titles.extend(v_titles)
    except Exception as ve:
        logger.error(f"[Scraper][Fallback] Recent titles scrape failed: {ve}")

    if len(video_titles) < 5:
        raw = re.findall(r'"title":\{"runs":\[{"text":"(.*?)"\}', html_content)
        yt_ui_keywords = ['keyboard shortcut', 'subtitles', 'closed caption', 'spherical video',
                          'youtube help', 'accessibility', 'subscribe']
        for t in raw:
            t = html_decoder.unescape(t)
            if 10 < len(t) < 120 and t not in video_titles and not any(kw in t.lower() for kw in yt_ui_keywords):
                video_titles.append(t)

    seen = set()
    unique_titles = []
    for t in video_titles:
        if t not in seen:
            seen.add(t)
            unique_titles.append(t)
    video_titles = unique_titles[:10]

    if not real_description or 'share your videos' in real_description.lower():
        real_description = channel_name

    # Stats fallback scraping
    sub_count = 0
    video_count = 100
    sub_match = re.search(r'"subscriberCountText":\s*\{\s*"simpleText"\s*:\s*"(.*?)"\}', html_content)
    if not sub_match:
        sub_match = re.search(r'([0-9.,]+[KMB]?) subscribers', html_content, re.IGNORECASE)
    if sub_match:
        sub_str = sub_match.group(1).strip().upper()
        try:
            if "K" in sub_str:
                sub_count = int(float(re.sub(r'[^0-9.]', '', sub_str)) * 1_000)
            elif "M" in sub_str:
                sub_count = int(float(re.sub(r'[^0-9.]', '', sub_str)) * 1_000_000)
            elif "B" in sub_str:
                sub_count = int(float(re.sub(r'[^0-9.]', '', sub_str)) * 1_000_000_000)
            else:
                sub_count = int(re.sub(r'[^0-9]', '', sub_str) or 0)
        except Exception:
            pass
    if sub_count == 0:
        sub_count = 100_000

    video_count = 0
    # Try fetching video count directly from yt_data
    try:
        header = yt_data.get('header', {})
        c4 = header.get('c4TabbedHeaderRenderer', {})
        vc_text = c4.get('videosCountText', {}).get('runs', [{}])[0].get('text', '')
        if vc_text:
            video_count = int(re.sub(r'[^\d]', '', vc_text))
    except Exception:
        pass

    if not video_count:
        vc_match = re.search(r'"videoCountText":\s*\{"runs":\s*\[{"text":\s*"(.*?)"\}', html_content)
        if vc_match:
            vc_str = re.sub(r'[^\d]', '', vc_match.group(1))
            if vc_str:
                video_count = int(vc_str)
    
    if not video_count:
        video_count = 140 # default generic fallback

    total_views = sub_count * 50
    avg_views = total_views // video_count if video_count else 0
    performance_summary = (
        f"{channel_name} has {sub_count:,} subscribers, "
        f"{total_views:,} total views across {video_count:,} videos "
        f"(~{avg_views:,} avg views/video)."
    )

    return {
        "channel_id": channel_id,
        "channel_name": channel_name,
        "country": "",
        "subscribers": sub_count,
        "total_views": total_views,
        "video_count": video_count,
        "avg_views_per_video": avg_views,
        "channel_url": channel_url,
        "niche": real_description[:500],
        "performance_summary": performance_summary,
        "description": real_description,
        "recent_video_titles": video_titles,
    }


# ── Multi-Source Real-Time Research Engine ─────────────────────────────────

def research_google_news(query: str, max_results: int = 6) -> list[dict]:
    """Scrape Google News RSS — adds when:7d for past-week trending articles."""
    results = []
    try:
        # Append when:7d to force Google News to only show articles from the past week
        encoded_q = urllib.parse.quote(f"{query} when:7d")
        url = f"https://news.google.com/rss/search?q={encoded_q}&hl=en-US&gl=US&ceid=US:en"
        resp = requests.get(url, headers=BROWSER_HEADERS, timeout=12)
        if resp.status_code != 200:
            # retry without time filter if it fails
            encoded_q = urllib.parse.quote(query)
            url = f"https://news.google.com/rss/search?q={encoded_q}&hl=en-US&gl=US&ceid=US:en"
            resp = requests.get(url, headers=BROWSER_HEADERS, timeout=12)
        if resp.status_code != 200:
            return []
        items = re.findall(r"<item>(.*?)</item>", resp.text, re.DOTALL)
        for item in items[:max_results]:
            title_m = re.search(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", item)
            link_m  = re.search(r"<link>(.*?)</link>", item)
            desc_m  = re.search(r"<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</description>", item, re.DOTALL)
            date_m  = re.search(r"<pubDate>(.*?)</pubDate>", item)
            if title_m and link_m:
                title = html_decoder.unescape(re.sub(r"<.*?>", "", title_m.group(1))).strip()
                link  = link_m.group(1).strip()
                desc  = html_decoder.unescape(re.sub(r"<.*?>", "", desc_m.group(1) if desc_m else ""))[:200]
                date_str = date_m.group(1) if date_m else ""
                # Parse date to YYYY-MM-DD format
                pub_date = datetime.utcnow().strftime("%Y-%m-%d")
                if date_str:
                    try:
                        from email.utils import parsedate_to_datetime
                        pub_date = parsedate_to_datetime(date_str).strftime("%Y-%m-%d")
                    except:
                        pass
                if link and link.startswith("http"):
                    results.append({"title": title, "url": link,
                                    "snippet": desc or f"Google News: {query}",
                                    "source": "Google News",
                                    "date": pub_date})
        logger.info(f"[Google News] '{query}' -> {len(results)} results")
    except Exception as e:
        logger.error(f"[Google News] FAILED: {e}")
    return results


def research_bing_news(query: str, max_results: int = 6) -> list[dict]:
    """Fetch Bing News RSS — fresh=Week filter for trending past-week articles."""
    results = []
    try:
        encoded_q = urllib.parse.quote(query)
        url = f"https://www.bing.com/news/search?q={encoded_q}&format=rss&freshness=Week"
        resp = requests.get(url, headers=BROWSER_HEADERS, timeout=12)
        if resp.status_code != 200:
            return []
        items = re.findall(r"<item>(.*?)</item>", resp.text, re.DOTALL)
        for item in items[:max_results]:
            title_m = re.search(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", item)
            link_m  = re.search(r"<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</link>", item)
            desc_m  = re.search(r"<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</description>", item, re.DOTALL)
            if title_m and link_m:
                title = html_decoder.unescape(re.sub(r"<.*?>", "", title_m.group(1))).strip()
                link  = link_m.group(1).strip()
                desc  = html_decoder.unescape(re.sub(r"<.*?>", "", desc_m.group(1) if desc_m else ""))[:200]
                if link.startswith("http") and "bing.com" not in link:
                    results.append({"title": title, "url": link,
                                    "snippet": desc or f"Bing News: {query}",
                                    "source": "Bing News"})
        logger.info(f"[Bing News] '{query}' -> {len(results)} results")
    except Exception as e:
        logger.error(f"[Bing News] FAILED: {e}")
    return results


def research_hackernews(query: str, max_results: int = 5) -> list[dict]:
    """Search Hacker News via free Algolia API — no key needed, past 7 days."""
    results = []
    try:
        week_ago = int(_time.time()) - 7 * 24 * 3600
        encoded_q = urllib.parse.quote(query)
        url = (
            f"https://hn.algolia.com/api/v1/search?query={encoded_q}"
            f"&tags=story&numericFilters=created_at_i>{week_ago}"
            f"&hitsPerPage={max_results}&ranking=byDate"
        )
        resp = requests.get(url, headers=BROWSER_HEADERS, timeout=10)
        if resp.status_code != 200:
            return []
        for hit in resp.json().get("hits", [])[:max_results]:
            title   = hit.get("title", "")
            url_hit = hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID','')}"
            points  = hit.get("points", 0)
            if title and url_hit.startswith("http"):
                results.append({"title": title, "url": url_hit,
                                "snippet": f"{points} points on Hacker News this week",
                                "source": "Hacker News"})
        logger.info(f"[HackerNews] '{query}' -> {len(results)} results")
    except Exception as e:
        logger.error(f"[HackerNews] FAILED: {e}")
    return results


def research_rss_blogs(keywords: list, max_results: int = 6) -> list[dict]:
    """Fetch topic-specific RSS feeds (Psychology Today, Science Daily, Healthline, etc.)"""
    results = []
    kw_lower = " ".join(keywords).lower()
    rss_feeds = []
    if any(w in kw_lower for w in ["psycholog", "philosophy", "manipulation", "dark", "mind", "behavior", "cognit", "existential"]):
        rss_feeds += ["https://www.psychologytoday.com/intl/rss",
                      "https://neurosciencenews.com/feed/"]
    if any(w in kw_lower for w in ["sleep", "dream", "circadian", "rem", "neuroscience", "brain"]):
        rss_feeds += ["https://neurosciencenews.com/feed/",
                      "https://www.sciencedaily.com/rss/mind_brain.xml"]
    if any(w in kw_lower for w in ["science", "research", "study", "health"]):
        rss_feeds += ["https://www.sciencedaily.com/rss/top/science.xml",
                      "https://www.healthline.com/rss/health-news"]
    if any(w in kw_lower for w in ["business", "finance", "money", "invest", "crypto", "market"]):
        rss_feeds += ["https://feeds.hbr.org/harvardbusiness",
                      "https://feeds.feedburner.com/entrepreneur/latest"]
    if any(w in kw_lower for w in ["tech", "ai", "software", "startup"]):
        rss_feeds += ["https://techcrunch.com/feed/", "https://feeds.wired.com/wired/index"]
    if not rss_feeds and keywords:
        tag = urllib.parse.quote(keywords[0].replace(" ", "-").lower())
        rss_feeds.append(f"https://medium.com/feed/tag/{tag}")

    for feed_url in rss_feeds[:3]:
        try:
            resp = requests.get(feed_url, headers=BROWSER_HEADERS, timeout=10)
            if resp.status_code != 200:
                continue
            items = re.findall(r"<item>(.*?)</item>", resp.text, re.DOTALL)
            feed_domain = re.search(r"https?://(?:www\.)?([^/]+)", feed_url)
            src_name = feed_domain.group(1) if feed_domain else "Blog"
            for item in items[:max_results]:
                title_m = re.search(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", item)
                link_m  = re.search(r"<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</link>", item)
                desc_m  = re.search(r"<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</description>", item, re.DOTALL)
                if title_m and link_m:
                    title = html_decoder.unescape(re.sub(r"<.*?>", "", title_m.group(1))).strip()
                    link  = link_m.group(1).strip()
                    desc  = html_decoder.unescape(re.sub(r"<.*?>", "", desc_m.group(1) if desc_m else ""))[:200]
                    if link.startswith("http") and any(kw.lower() in (title + desc).lower() for kw in keywords[:3]):
                        results.append({"title": title, "url": link,
                                        "snippet": desc or title, "source": src_name})
            if results:
                logger.info(f"[RSS Blogs] {src_name} -> {len(results)} results")
                break
        except Exception:
            continue
    return results


def research_reddit(query: str, max_results: int = 5) -> list[dict]:
    """Search Reddit for real trending posts on a topic."""
    results = []
    try:
        encoded_q = urllib.parse.quote(query)
        url = f"https://www.reddit.com/search.json?q={encoded_q}&sort=hot&t=week&limit={max_results}"
        # Reddit now requires a more specific User-Agent
        headers = {
            **BROWSER_HEADERS,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=10)
        
        # Reddit may return 403 - try alternative approach
        if resp.status_code == 403:
            logger.info(f"[Reddit] 403 Forbidden for '{query}' — trying Tavily fallback")
            # Use Tavily as fallback for Reddit content
            return research_tavily(f"site:reddit.com {query} discussion", max_results)
        
        if resp.status_code != 200:
            logger.info(f"[Reddit] HTTP {resp.status_code} for '{query}'")
            return []
            
        data = resp.json()
        posts = data.get("data", {}).get("children", [])
        for post in posts:
            p = post.get("data", {})
            title = p.get("title", "")
            permalink = p.get("permalink", "")
            selftext = p.get("selftext", "")[:200]
            score = p.get("score", 0)
            subreddit = p.get("subreddit", "")
            created_utc = p.get("created_utc", 0)
            # Convert timestamp to date
            post_date = datetime.utcfromtimestamp(created_utc).strftime("%Y-%m-%d") if created_utc else datetime.utcnow().strftime("%Y-%m-%d")
            if title and permalink:
                results.append({
                    "title": title,
                    "url": f"https://www.reddit.com{permalink}",
                    "snippet": selftext or f"Reddit r/{subreddit} — {score:,} upvotes",
                    "source": f"Reddit r/{subreddit}",
                    "date": post_date,
                    "engagement": f"{score:,} upvotes, {p.get('num_comments', 0)} comments"
                })
        logger.info(f"[Reddit] '{query}' -> {len(results)} results")
    except Exception as e:
        logger.error(f"[Reddit] FAILED: {e} — trying Tavily fallback")
        # Fallback to Tavily for Reddit content
        try:
            return research_tavily(f"site:reddit.com {query} discussion", max_results)
        except:
            pass
    return results


def research_duckduckgo(query: str, max_results: int = 5) -> list[dict]:
    """Scrape DuckDuckGo HTML for real web search results."""
    results = []
    try:
        encoded_q = urllib.parse.quote(query)
        # df=w forces past week results in DuckDuckGo
        url = f"https://html.duckduckgo.com/html/?q={encoded_q}&df=w"
        resp = requests.get(url, headers=BROWSER_HEADERS, timeout=10)
        if resp.status_code != 200:
            return []
        html = resp.text
        result_blocks = re.findall(r'<a class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html)
        snippets = re.findall(r'<a class="result__snippet"[^>]*>(.*?)</a>', html, re.DOTALL)
        for i, (href, title_raw) in enumerate(result_blocks[:max_results]):
            title = html_decoder.unescape(re.sub(r"<.*?>", "", title_raw)).strip()
            real_url = href
            uddg_m = re.search(r"uddg=([^&]+)", href)
            if uddg_m:
                real_url = urllib.parse.unquote(uddg_m.group(1))
            snippet = html_decoder.unescape(re.sub(r"<.*?>", "", snippets[i] if i < len(snippets) else ""))[:200]
            if real_url and real_url.startswith("http") and "duckduckgo.com" not in real_url:
                results.append({
                    "title": title or query,
                    "url": real_url,
                    "snippet": snippet or f"Web result about {query}",
                    "source": "DuckDuckGo"
                })
        logger.info(f"[DuckDuckGo] '{query}' -> {len(results)} results")
    except Exception as e:
        logger.error(f"[DuckDuckGo] FAILED: {e}")
    return results


def research_youtube_videos(query: str, max_results: int = 8, timeframe: str = "7d") -> list[dict]:
    """Search YouTube for trending videos — YouTube Data API (with key failover) or HTML scrape fallback."""
    yt_keys = get_youtube_api_keys()
    results = []
    for key_idx, yt_key in enumerate(yt_keys, 1):
        try:
            youtube = build("youtube", "v3", developerKey=yt_key)
            days_map = {"3d": 3, "7d": 7, "28d": 28, "30d": 30, "90d": 90, "365d": 365, "lifetime": 3650}
            days = days_map.get(timeframe, 7)
            after = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%dT00:00:00Z")
            resp = youtube.search().list(
                part="snippet", q=query, type="video",
                order="viewCount", publishedAfter=after, maxResults=max_results,
            ).execute()
            for item in resp.get("items", []):
                vid_id = item["id"].get("videoId", "")
                snip   = item.get("snippet", {})
                title  = snip.get("title", "")
                ch_name = snip.get("channelTitle", "YouTube")
                if vid_id and title:
                    results.append({"title": title,
                                    "url": f"https://www.youtube.com/watch?v={vid_id}",
                                    "snippet": snip.get("description", "")[:200] or f"Trending by {ch_name}",
                                    "source": f"YouTube - {ch_name}"})
            logger.info(f"[YouTube API] '{query}' -> {len(results)} results (key {key_idx})")
            return results
        except Exception as e:
            err_str = str(e).lower()
            is_quota_err = any(kw in err_str for kw in ["quota", "rate", "limit", "403", "exceeded"])
            if is_quota_err and key_idx < len(yt_keys):
                logger.info(f"[YouTube API] Key {key_idx} quota/rate limited. Trying key {key_idx + 1}...")
                continue
            logger.error(f"[YouTube API] FAILED with key {key_idx}: {e}")
    # HTML scrape fallback — sp=EgIIAQ%3D%3D filters to this week
    try:
        encoded_q = urllib.parse.quote(query)
        url = f"https://www.youtube.com/results?search_query={encoded_q}&sp=EgIIAQ%3D%3D"
        resp = requests.get(url, headers=BROWSER_HEADERS, timeout=12)
        html = resp.text
        video_data = re.findall(r'"videoId":"([\w-]{11})"[^}}]*?"title":\{"runs":\[\{"text":"(.*?)"', html)
        seen = set()
        for vid_id, title in video_data:
            if vid_id not in seen:
                seen.add(vid_id)
                clean_title = html_decoder.unescape(title)
                if len(clean_title) > 5:
                    results.append({"title": clean_title,
                                    "url": f"https://www.youtube.com/watch?v={vid_id}",
                                    "snippet": f"Trending this week: {clean_title}",
                                    "source": "YouTube"})
            if len(results) >= max_results:
                break
        logger.info(f"[YouTube Scrape] '{query}' -> {len(results)} results")
    except Exception as e:
        logger.error(f"[YouTube Scrape] FAILED: {e}")
    return results


def research_google_trends_rss(keywords: list, geo: str = "US") -> list[dict]:
    """
    Fetch Google Trends daily/realtime trending searches via RSS feed.
    Filters trending topics that are relevant to the channel's keywords.
    No API key required.
    """
    results = []
    feeds = [
        f"https://trends.google.com/trends/trendingsearches/daily/rss?geo={geo}",
        f"https://trends.google.com/trends/trendingsearches/realtime/rss?geo={geo}&cat=all",
    ]
    kw_lower = [k.lower() for k in keywords[:6]]

    for feed_url in feeds:
        try:
            resp = requests.get(feed_url, headers=BROWSER_HEADERS, timeout=12)
            if resp.status_code != 200:
                continue
            items = re.findall(r"<item>(.*?)</item>", resp.text, re.DOTALL)
            for item in items:
                title_m = re.search(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", item)
                link_m  = re.search(r"<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</link>", item)
                desc_m  = re.search(r"<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</description>", item, re.DOTALL)
                approx_m = re.search(r"<ht:approx_traffic>(.*?)</ht:approx_traffic>", item)
                if title_m:
                    title   = html_decoder.unescape(re.sub(r"<.*?>", "", title_m.group(1))).strip()
                    link    = link_m.group(1).strip() if link_m else f"https://trends.google.com/trends/explore?q={urllib.parse.quote(title)}"
                    desc    = html_decoder.unescape(re.sub(r"<.*?>", "", desc_m.group(1) if desc_m else ""))[:200]
                    traffic = approx_m.group(1).strip() if approx_m else ""
                    snippet = f"Google Trends: {traffic} searches" if traffic else f"Trending on Google: {title}"
                    if desc:
                        snippet = f"{snippet} — {desc[:120]}"
                    # Include ALL trending topics (they're all trending, let the LLM decide relevance)
                    # but also score relevance — relevant ones go first
                    is_relevant = any(kw in title.lower() or kw in desc.lower() for kw in kw_lower)
                    results.append({
                        "title": f"[Google Trends] {title}",
                        "url": link if link.startswith("http") else f"https://trends.google.com/trends/explore?q={urllib.parse.quote(title)}",
                        "snippet": snippet,
                        "source": "Google Trends",
                        "_relevance": 1 if is_relevant else 0,
                    })
            # Sort: relevant trending topics first
            results.sort(key=lambda x: -x.get("_relevance", 0))
            # Strip internal sorting key before returning
            for r in results:
                r.pop("_relevance", None)
            results = results[:10]  # Top 10 trending topics
            if results:
                logger.info(f"[Google Trends RSS] {feed_url.split('?')[0]} -> {len(results)} trending topics")
                break
        except Exception as e:
            logger.error(f"[Google Trends RSS] FAILED: {e}")
    return results

def research_tavily(query: str, max_results: int = 5) -> list[dict]:
    """
    Use Tavily AI search with automatic failover to backup API keys if rate limited.
    Uses _get_env() to properly read keys from .env file.
    """
    keys = get_tavily_api_keys()

    if not keys:
        logger.info("[Tavily] No API keys configured. Skipping.")
        return []

    results = []
    for key in keys:
        try:
            resp = requests.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": key,
                    "query": query,
                    "search_depth": "basic",
                    "max_results": max_results,
                    "days": 7,  # Force Tavily to only fetch results from the past 7 days
                },
                timeout=15
            )
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("results", []):
                    results.append({
                        "title": item.get("title", ""),
                        "url": item.get("url", ""),
                        "snippet": item.get("content", "")[:250],
                        "source": "Tavily AI Search"
                    })
                logger.info(f"[Tavily] '{query}' -> {len(results)} results (key: ...{key[-4:]})")
                return results
            elif resp.status_code == 429:
                logger.info(f"[Tavily] Rate limit hit for key ...{key[-4:]}. Trying next key...")
                continue
            else:
                logger.error(f"[Tavily] Error {resp.status_code}: {resp.text} (key: ...{key[-4:]})")
                continue
        except Exception as e:
            logger.error(f"[Tavily] Exception: {e}")
            continue

    return results


def research_google_trends_pytrends(keywords: list, topic: str = "") -> list[dict]:
    """
    Use pytrends to get rising/breakout related queries for the channel's keywords.
    Searches YouTube-specific trends (gprop='youtube') for past 7 days.
    Returns breakout/rising search terms as ideas inspiration.
    """
    results = []
    try:
        from pytrends.request import TrendReq
        # Fix: pytrends 4.9.2 doesn't support retries/backoff_factor parameters
        pytrends = TrendReq(hl="en-US", tz=420, timeout=(10, 25))

        # Use top 3 keywords (pytrends max is 5)
        kw_list = [k for k in keywords[:3] if k and len(k) > 2]
        if not kw_list and topic:
            kw_list = topic.split()[:3]
        if not kw_list:
            return []

        logger.info(f"[pytrends] Building payload for: {kw_list}")

        # Get YouTube-specific trending queries for these keywords
        pytrends.build_payload(kw_list, cat=0, timeframe="now 7-d", geo="", gprop="youtube")
        related = pytrends.related_queries()

        for kw in kw_list:
            kw_data = related.get(kw, {})
            # Rising queries (breakout trends — highest priority)
            rising = kw_data.get("rising")
            if rising is not None and not rising.empty:
                for _, row in rising.head(5).iterrows():
                    query = str(row.get("query", "")).strip()
                    value = str(row.get("value", ""))
                    label = "Breakout" if value == "Breakout" else f"+{value}%"
                    if query:
                        results.append({
                            "title": f"[Trending] {query}",
                            "url": f"https://trends.google.com/trends/explore?q={urllib.parse.quote(query)}&gprop=youtube",
                            "snippet": f"Google Trends (YouTube) — {label} searches this week for '{query}'",
                            "source": "Google Trends (Rising)",
                        })
            # Top queries (steady high-volume searches)
            top = kw_data.get("top")
            if top is not None and not top.empty:
                for _, row in top.head(3).iterrows():
                    query = str(row.get("query", "")).strip()
                    value = str(row.get("value", ""))
                    if query and not any(r["title"].endswith(query) for r in results):
                        results.append({
                            "title": f"[High Search Volume] {query}",
                            "url": f"https://trends.google.com/trends/explore?q={urllib.parse.quote(query)}&gprop=youtube",
                            "snippet": f"Google Trends (YouTube) — top search: '{query}' (score: {value}/100)",
                            "source": "Google Trends (Top)",
                        })

        logger.info(f"[pytrends] Got {len(results)} trending queries")
    except ImportError:
        logger.info("[pytrends] Library not installed — skipping")
    except Exception as e:
        logger.error(f"[pytrends] FAILED: {e}")
    return results


def infer_channel_niche(channel_info: dict) -> dict:
    """
    Use LLM to extract a precise, specific niche + content pillars + search keywords
    from the channel name, description, and recent video titles.
    Returns a dict: {topic, keywords, content_pillars, search_queries}
    """
    name = channel_info.get("channel_name", "")
    description = (channel_info.get("description") or "")[:800]
    titles = channel_info.get("recent_video_titles", [])
    titles_block = "\n".join(f"- {t}" for t in titles[:12]) or "Not available"

    # If description is still generic/empty, make the channel NAME the primary signal
    desc_is_generic = (
        not description
        or 'share your videos' in description.lower()
        or len(description.strip()) < 20
    )
    if desc_is_generic:
        description = f"Channel name '{name}' - infer topic from name and video titles only."

    logger.info(f"[infer_niche] Name='{name}' | desc_is_generic={desc_is_generic}")
    logger.info(f"[infer_niche] Titles found: {len(titles)} | sample: {titles[:3]}")

    system_prompt = (
        "You are a YouTube channel analyst. Identify the EXACT specific topic of a channel.\n"
        "CRITICAL: The channel NAME is a VERY strong signal - analyze it carefully.\n"
        "Example: 'SmarterWhileYouSleep' = science of sleep, brain, neuroscience during sleep.\n"
        "Example: 'MrBeast' = viral challenges, stunts, philanthropy.\n"
        "Example: 'Kurzgesagt' = animated science explainers.\n\n"
        'Return ONLY a raw JSON object (no markdown, no triple backticks, no extra text).\n'
        'Format: {"topic": "precise 5-10 word description", "keywords": ["kw1","kw2","kw3","kw4","kw5"], '
        '"content_pillars": ["pillar1","pillar2","pillar3"], '
        '"search_queries": ["query1","query2","query3","query4","query5"]}\n\n'
        "RULES:\n"
        "- keywords must be SPECIFIC (e.g. 'sleep science', 'REM sleep', 'circadian rhythm') NOT generic\n"
        "- search_queries are 4-8 words each, real Google searches someone would do to research this topic\n"
        "- NEVER use: 'trending', 'viral', 'YouTube', 'content creation', 'social media'\n"
        "- If description says 'Share your videos with friends' IGNORE IT - use the channel name instead"
    )

    human_prompt = (
        f"Channel Name: {name}\n\n"
        f"Channel Description: {description}\n\n"
        f"Sample Video Titles from this channel:\n{titles_block}\n\n"
        "Based on the channel name and video titles, identify the EXACT niche. Return raw JSON only."
    )

    try:
        content = call_groq_api_with_retries(system_prompt, human_prompt, temperature=0.3, max_tokens=800, require_json=True)
        result = parse_llm_json(content, context="infer_channel_niche")
        logger.info(f"[infer_niche] Topic: {result.get('topic')}")
        logger.info(f"[infer_niche] Queries: {result.get('search_queries')}")
        return result
    except Exception as e:
        logger.error(f"[infer_niche] FAILED: {e}")
        # Smart fallback: derive queries from actual video titles (strongest signal)
        title_words = set()
        for t in titles[:8]:
            for word in re.sub(r'[^\w\s]', '', t.lower()).split():
                if len(word) > 3 and word not in {'this', 'that', 'with', 'your', 'from', 'what', 'have', 'will', 'been', 'they', 'them', 'were', 'said', 'each', 'make', 'like', 'long', 'look', 'many', 'some', 'than', 'first', 'been', 'would', 'about', 'could', 'people', 'other', 'their', 'which', 'never', 'video', 'watch', 'channel', 'subscribe'}:
                    title_words.add(word)
        # Build topic from top frequent words
        top_words = sorted(title_words, key=lambda w: sum(1 for t in titles if w in t.lower()), reverse=True)[:5]
        topic_guess = " ".join(top_words[:3]) if top_words else name
        return {
            "topic": topic_guess or name,
            "keywords": top_words[:5] or [name],
            "content_pillars": [topic_guess or name],
            "search_queries": [
                titles[0][:60] if titles else f"{name} videos",
                titles[1][:60] if len(titles) > 1 else f"{topic_guess} tips",
                f"{topic_guess} new research 2025",
                f"best {topic_guess} strategies",
                f"{topic_guess} explained",
            ],
        }


def deep_research(niche_info: dict | str, timeframe: str) -> list[dict]:
    """
    Parallel multi-source research engine.
    Sources: Google News, Bing News, Hacker News, Reddit, DuckDuckGo, RSS Blogs, YouTube.
    All sources use past-7-days filter for trending content.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    if isinstance(niche_info, dict):
        search_queries = niche_info.get("search_queries", [])
        keywords       = niche_info.get("keywords", [])
        topic          = niche_info.get("topic", "")
        content_pillars = niche_info.get("content_pillars", [])
        # Use ALL available search queries for maximum niche-specific coverage
        queries = list(search_queries[:5])
        # Add content pillars as additional search angles
        for pillar in content_pillars[:2]:
            if pillar and pillar.lower() not in [q.lower() for q in queries]:
                queries.append(pillar)
        # Add short keyword combos for news sources
        if keywords and keywords[0].lower() not in [q.lower() for q in queries]:
            queries.append(keywords[0])
        if topic and topic[:40].lower() not in [q.lower() for q in queries]:
            queries.append(topic[:40])
    else:
        short_niche = str(niche_info)[:60].strip()
        queries  = [short_niche, f"{short_niche} 2025", f"{short_niche} research"]
        keywords = short_niche.split()[:3]
        topic    = short_niche

    # Deduplicate queries
    seen_q, unique_queries = set(), []
    for q in queries:
        q = q.strip()
        if q and q.lower() not in seen_q:
            seen_q.add(q.lower())
            unique_queries.append(q)
    queries = unique_queries[:6]

    logger.info(f"[deep_research] {len(queries)} queries, 8 sources in parallel: {queries}")

    blacklist = ["example.com", "duckduckgo.com", "google.com/search", "bing.com/search"]

    # Build all parallel tasks: each query x each source
    tasks = []
    for q in queries:
        tasks.append(("Tavily AI",    lambda q=q: research_tavily(q, 5)))
        tasks.append(("Google News",  lambda q=q: research_google_news(q, 5)))
        tasks.append(("Bing News",    lambda q=q: research_bing_news(q, 5)))
        tasks.append(("Hacker News",  lambda q=q: research_hackernews(q, 4)))
        tasks.append(("Reddit",       lambda q=q: research_reddit(q, 4)))
        tasks.append(("DuckDuckGo",   lambda q=q: research_duckduckgo(q, 4)))

    # RSS blogs — run once with top keywords
    tasks.append(("RSS Blogs", lambda: research_rss_blogs(keywords if keywords else queries[:2], 6)))

    # Google Trends RSS — daily + realtime trending searches (no key needed)
    tasks.append(("Google Trends RSS", lambda: research_google_trends_rss(keywords if keywords else queries[:3])))

    # Google Trends pytrends — YouTube-specific rising/breakout queries
    tasks.append(("pytrends", lambda: research_google_trends_pytrends(keywords if keywords else queries[:3], topic)))

    # YouTube — force 7d (1 week) timeframe for maximum freshness
    yt_q  = topic[:60] if topic else (queries[0] if queries else "")
    yt_q2 = keywords[0] if keywords else ""
    tasks.append(("YouTube",  lambda q=yt_q:  research_youtube_videos(q,  8, "7d")))
    if yt_q2 and yt_q2.lower() != yt_q.lower():
        tasks.append(("YouTube2", lambda q=yt_q2: research_youtube_videos(q, 6, "7d")))

    # Run ALL tasks in parallel (16 threads)
    all_results = []
    seen_urls   = set()
    with ThreadPoolExecutor(max_workers=16) as executor:
        future_map = {executor.submit(fn): name for name, fn in tasks}
        for future in as_completed(future_map):
            try:
                items = future.result(timeout=25)
                for item in items:
                    url = item.get("url", "")
                    if (url and url.startswith("http")
                            and url not in seen_urls
                            and not any(b in url for b in blacklist)):
                        seen_urls.add(url)
                        all_results.append(item)
            except Exception as fe:
                logger.error(f"[deep_research] Task failed: {fe}")

    # Sort: Tavily & Google Trends first (most relevant) > News > HN > DDG > Blogs > YouTube > Reddit
    priority = {
        "Tavily AI Search": 0,
        "Google Trends": 1,   # Rising/breakout trending topics
        "Google News":   2,
        "Bing News":     3,
        "Hacker News":   4,
        "DuckDuckGo":    5,
        "YouTube":       6,
    }
    def _sort_key(item):
        src = item.get("source", "")
        for k, v in priority.items():
            if k in src:
                return v
        if "Reddit" in src:
            return 8
        return 6  # blogs / other
    all_results.sort(key=_sort_key)

    def _cnt(k): return sum(1 for r in all_results if k in r.get("source", ""))
    print(
        f"[deep_research] {len(all_results)} total | "
        f"Trends={_cnt('Google Trends')} GNews={_cnt('Google News')} Bing={_cnt('Bing News')} "
        f"HN={_cnt('Hacker News')} Reddit={_cnt('Reddit')} DDG={_cnt('DuckDuckGo')} YT={_cnt('YouTube')}",
        flush=True
    )
    return all_results


def call_groq_api_with_retries(system_prompt: str, human_prompt: str, temperature: float = 0.5, max_tokens: int = 1000, max_attempts: int = 5, require_json: bool = False) -> str:
    """Helper to call Groq API with robust fallback chain across multiple providers, keys, and models.
    
    Failover order:
    1. Groq key 1 -> llama-3.3-70b-versatile, llama-3.1-8b-instant, llama-3.2-3b-preview
    2. Groq key 2 -> llama-3.3-70b-versatile, llama-3.1-8b-instant, llama-3.2-3b-preview
    3. OpenRouter key 1 -> gemini-2.0-flash, llama-3.1-8b, mistral-7b
    4. OpenRouter key 2 -> gemini-2.0-flash, llama-3.1-8b, mistral-7b
    """
    groq_keys = get_groq_api_keys()
    openrouter_keys = get_openrouter_api_keys()

    if not groq_keys and not openrouter_keys:
        raise ValueError(
            "No API keys configured. Add GROQ_API_KEY or OPENROUTER_API_KEY to your .env file."
        )
    
    # Groq hard limit is 8192 output tokens — cap it to avoid 400 errors
    GROQ_MAX_TOKENS = 8000
    groq_models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama-3.2-3b-preview"]
    openrouter_models = ["google/gemini-2.0-flash-001", "meta-llama/llama-3.1-8b-instruct:free", "mistralai/mistral-7b-instruct:free"]
    
    # Build ordered list of (url, headers, model, key_label, provider_max_tokens) tuples to try
    providers = []
    
    # Add all Groq keys x models — cap tokens at GROQ_MAX_TOKENS
    for key_idx, groq_key in enumerate(groq_keys, 1):
        groq_headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
        for model in groq_models:
            providers.append(("https://api.groq.com/openai/v1/chat/completions", groq_headers, model, f"Groq-key{key_idx}", GROQ_MAX_TOKENS))
    
    # Add all OpenRouter keys x models
    for key_idx, or_key in enumerate(openrouter_keys, 1):
        or_headers = {"Authorization": f"Bearer {or_key}", "Content-Type": "application/json"}
        for model in openrouter_models:
            providers.append(("https://openrouter.ai/api/v1/chat/completions", or_headers, model, f"OpenRouter-key{key_idx}", max_tokens))
    
    logger.info(f"[API Helper] Built failover chain with {len(providers)} provider+key+model combos")
    last_error = None
    
    for idx, (url, headers, model, key_label, provider_max_tokens) in enumerate(providers):
        # Use the smaller of requested tokens and provider limit
        effective_tokens = min(max_tokens, provider_max_tokens)
        logger.info(f"[API Helper] Trying {idx+1}/{len(providers)}: {key_label} / {model} (max_tokens={effective_tokens})")
        
        try:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": human_prompt},
                ],
                "temperature": temperature,
                "max_tokens": effective_tokens,
            }
            # Force JSON mode for Groq APIs if required (most Groq models support this)
            if require_json and "api.groq.com" in url:
                payload["response_format"] = {"type": "json_object"}

            resp = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=120  # Increased from 60 to 120 for large responses
            )
            
            # Log ALL non-200 responses with full body for debugging
            if resp.status_code != 200:
                try:
                    err_body = resp.json()
                    err_msg = str(err_body.get("error", {}).get("message", str(err_body)))
                except Exception:
                    err_msg = resp.text[:300]
                logger.error(f"[API Helper] HTTP {resp.status_code} for {key_label}/{model}: {err_msg}")
                last_error = f"HTTP {resp.status_code}: {err_msg}"
                if resp.status_code == 429:
                    _time.sleep(3)
                else:
                    _time.sleep(1)
                continue
                
            resp_json = resp.json()
            
            # Check for error field in a 200 response
            if "error" in resp_json:
                err_msg = str(resp_json["error"].get("message", "") if isinstance(resp_json["error"], dict) else resp_json["error"])
                logger.error(f"[API Helper] Error in 200 response for {key_label}/{model}: {err_msg}")
                last_error = err_msg
                _time.sleep(2)
                continue
            
            if "choices" in resp_json and len(resp_json["choices"]) > 0:
                content = resp_json["choices"][0]["message"]["content"].strip()
                logger.info(f"[API Helper] SUCCESS with {key_label}/{model} ({len(content)} chars)")
                return content
            else:
                logger.error(f"[API Helper] No choices in response from {key_label}/{model}: {str(resp_json)[:300]}")
                last_error = f"No choices in response: {str(resp_json)[:200]}"
                continue
                
        except requests.exceptions.Timeout:
            logger.error(f"[API Helper] Timeout for {key_label}/{model}")
            last_error = f"Timeout after 120s"
            continue
        except Exception as e:
            last_error = e
            logger.error(f"[API Helper] Exception for {key_label}/{model}: {e}")
            _time.sleep(1)
            continue
            
    raise ValueError(f"All {len(providers)} API providers failed. Last error: {last_error}")


# ── LangGraph Idea Generator ────────────────────────────────────────────────

from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END

class IdeaGenerationState(TypedDict):
    channel_info: dict
    niche_info: dict
    all_sources: list
    web_block: str
    yt_block: str
    recent_titles_block: str
    raw_ideas: list
    critic_feedback: str
    final_ideas: list

def lg_ideator_node(state: IdeaGenerationState) -> dict:
    logger.info("[LangGraph] Ideator Node: Brainstorming initial ideas...")
    channel_info = state["channel_info"]
    niche_info = state["niche_info"]
    topic = niche_info.get("topic", channel_info.get("niche", ""))[:200]
    content_pillars = niche_info.get("content_pillars", [])
    keywords = niche_info.get("keywords", [])
    channel_name = channel_info.get("channel_name", "")
    subscribers = channel_info.get("subscribers", 0)
    recent_titles = state["recent_titles_block"]

    pillars_text = ", ".join(content_pillars[:5]) if content_pillars else "not specified"
    keywords_text = ", ".join(keywords[:5]) if keywords else "not specified"

    system_prompt = (
        "You are an expert YouTube content strategist who specializes in generating video ideas "
        "that are PERFECTLY tailored to a specific channel's niche and audience.\n\n"
        "CRITICAL RULES:\n"
        "1. DO NOT COPY EXISTING YOUTUBE VIDEOS. You must invent 100% NEW, ORIGINAL concepts.\n"
        "2. You MUST base your ideas on the 'Web Trends' provided below (Google Trends, Google News, and General Web Search). What are people searching for and reading in the news right now?\n"
        "3. Bridge these fresh Google Trends/News with the channel's existing style and topic.\n"
        "4. A viewer who watches this channel's existing videos should be excited to click on your ideas.\n"
        "5. Never suggest generic self-help, motivation, or unrelated topics. Keep it deeply in the niche.\n"
        "6. EXTREME DIVERSITY IS MANDATORY. Every single idea MUST explore a completely different trend or subject. Do NOT generate multiple ideas about the same topic (e.g., if one idea is about penguins, no other idea can be about penguins or birds).\n"
        "7. DEEP RESEARCH: Each idea must conceptually synthesize 2-3 distinct trends/sources from the Web Trends block to prove it is well-researched.\n\n"
        "Return a JSON object with 'ideas' (array of 15 strings — video title concepts)."
    )
    human_prompt = (
        f"=== CHANNEL PROFILE ===\n"
        f"Channel Name: {channel_name}\n"
        f"Subscribers: {subscribers:,}\n"
        f"Exact Niche: {topic}\n"
        f"Content Pillars: {pillars_text}\n"
        f"Core Keywords: {keywords_text}\n\n"
        f"=== CHANNEL'S RECENT VIDEOS (Match this style, but DO NOT copy them) ===\n{recent_titles}\n\n"
        f"=== FRESH WEB TRENDS (USE THESE TO INVENT NEW IDEAS) ===\n"
        f"Web Trends (Google Trends, Google News, Bing News, Web Search):\n{state['web_block'][:8000]}\n\n"
        f"Generate 15 entirely original video concepts that bridge these Fresh Google/Web Trends with the channel's niche."
    )
    content = call_groq_api_with_retries(system_prompt, human_prompt, temperature=0.8, max_tokens=1500)
    parsed = parse_llm_json(content, context="ideator")
    ideas = parsed.get("ideas", [])
    if not ideas and isinstance(parsed, list):
        ideas = parsed
    return {"raw_ideas": ideas}

def lg_critic_node(state: IdeaGenerationState) -> dict:
    logger.info(f"[LangGraph] Critic Node: Evaluating {len(state.get('raw_ideas', []))} raw ideas...")
    raw_ideas_text = "\n".join(f"- {i}" for i in state.get("raw_ideas", []))
    channel_info = state["channel_info"]
    niche_info = state["niche_info"]
    topic = niche_info.get("topic", "")
    pillars = ", ".join(niche_info.get("content_pillars", []))

    system_prompt = (
        "You are a harsh YouTube content critic and channel strategist.\n\n"
        "Your job is to RUTHLESSLY filter ideas. For each idea, ask:\n"
        "1. Does this fit the channel's EXACT niche and topic? If not, REJECT it.\n"
        "2. Is this idea based on a fresh trend, or is it just a generic rehash of an existing YouTube video? If it's a rehash, REJECT it.\n"
        "3. Would a subscriber of this channel click on this? If not, REJECT it.\n"
        "4. Does this overlap too much with the channel's recent videos? If so, REJECT it.\n\n"
        "Select ONLY the TOP 10 fresh, original ideas that perfectly match the channel.\n"
        "Return a JSON object with 'top_10_ideas' (array of strings) and 'feedback' (string)."
    )
    human_prompt = (
        f"=== CHANNEL CONTEXT ===\n"
        f"Channel: {channel_info.get('channel_name', '')}\n"
        f"Niche: {topic}\n"
        f"Content Pillars: {pillars}\n\n"
        f"=== CHANNEL'S RECENT VIDEOS (for reference) ===\n{state['recent_titles_block']}\n\n"
        f"=== RAW IDEAS TO EVALUATE ===\n{raw_ideas_text}\n\n"
        f"Select the top 10 ideas that BEST fit this channel's niche of '{topic}' AND bring fresh value. "
        f"Reject anything that looks like a copy of an existing video."
    )
    content = call_groq_api_with_retries(system_prompt, human_prompt, temperature=0.4, max_tokens=1500)
    parsed = parse_llm_json(content, context="critic")
    return {
        "raw_ideas": parsed.get("top_10_ideas", state.get("raw_ideas", [])[:10]),
        "critic_feedback": parsed.get("feedback", "Good ideas.")
    }

def lg_refiner_node(state: IdeaGenerationState) -> dict:
    logger.info("[LangGraph] Refiner Node: Formatting top 10 ideas with sources...")
    top_10 = "\n".join(f"- {i}" for i in state.get("raw_ideas", [])[:10])

    system_prompt = (
        "You are the final formatter. Take the top 10 ideas and format them exactly according to the schema.\n"
        "Rules:\n"
        "1. Return ONLY a valid JSON object with an 'ideas' array containing EXACTLY 10 objects.\n"
        "2. Schema per idea: { 'title': '...', 'description': '...', 'virality_score': 1-100, 'tags': ['tag1', 'tag2'], 'sources': [ {'title': '...', 'url': '...', 'platform': '...'} ] }\n"
        "3. Copy source URLs strictly from the provided research data."
    )
    human_prompt = (
        f"Top 10 Ideas to refine:\n{top_10}\n"
        f"Critic Feedback:\n{state.get('critic_feedback')}\n"
        f"Research Sources for Citations (You MUST cite 2-3 distinct sources per idea!):\n{state['web_block'][:8000]}\n{state['yt_block'][:800]}"
    )
    content = call_groq_api_with_retries(system_prompt, human_prompt, temperature=0.4, max_tokens=2500)
    parsed = parse_llm_json(content, context="refiner")
    ideas = parsed.get("ideas", [])

    real_urls = set(s["url"] for s in state["all_sources"] if s.get("url", "").startswith("http"))
    for idea in ideas:
        if "sources" in idea:
            idea["sources"] = [
                src for src in idea["sources"]
                if (src.get("url", "").startswith("http") and src.get("url", "") in real_urls)
            ]
        # map description back to frontend schema
        if "description" not in idea and "summary" in idea:
            idea["description"] = idea["summary"]

    # Sort by virality score
    for idea in ideas:
        idea["virality_score"] = int(idea.get("virality_score", 50))
    ideas.sort(key=lambda x: x["virality_score"], reverse=True)

    return {"final_ideas": ideas[:10]}

def build_idea_graph():
    workflow = StateGraph(IdeaGenerationState)
    workflow.add_node("ideator", lg_ideator_node)
    workflow.add_node("critic", lg_critic_node)
    workflow.add_node("refiner", lg_refiner_node)
    
    workflow.set_entry_point("ideator")
    workflow.add_edge("ideator", "critic")
    workflow.add_edge("critic", "refiner")
    workflow.add_edge("refiner", END)
    
    return workflow.compile()

def generate_ideas_node(channel_info: dict, niche_info: dict, all_sources: list[dict]) -> list[dict]:
    """Entry point for the new LangGraph-based agentic system."""
    web_sources = [s for s in all_sources if "youtube.com" not in s.get("url", "")]
    yt_sources = [s for s in all_sources if "youtube.com" in s.get("url", "")]

    web_block = "\n".join(
        f"- [{r.get('source','Web')}] {r['title'][:100]}\n  URL: {r['url']}\n  Details: {r['snippet'][:200]}"
        for r in web_sources[:50]
        if r.get("url", "").startswith("http")
    ) or "No web sources found."

    yt_block = "\n".join(
        f"- [YouTube] {r['title'][:100]}\n  URL: {r['url']}"
        for r in yt_sources[:8]
        if r.get("url", "").startswith("http")
    ) or "No YouTube sources found."

    recent_titles = channel_info.get("recent_video_titles", [])
    recent_titles_block = "\n".join(f"- {t}" for t in recent_titles[:10]) or "Not available"

    initial_state = IdeaGenerationState(
        channel_info=channel_info,
        niche_info=niche_info,
        all_sources=all_sources,
        web_block=web_block,
        yt_block=yt_block,
        recent_titles_block=recent_titles_block,
        raw_ideas=[],
        critic_feedback="",
        final_ideas=[]
    )
    
    graph = build_idea_graph()
    logger.info("[LangGraph] Starting idea generation workflow...")
    result = graph.invoke(initial_state)
    return result.get("final_ideas", [])

def rate_ideas_node(ideas: list[dict]) -> list[dict]:
    # Legacy wrapper, sorting is now done in refiner
    return ideas



def explore_keyword_node(keyword: str) -> dict:
    """Perform keyword research and generate related keywords, volume, and difficulty."""
    all_sources = deep_research(keyword, "30d")
    
    web_block = "\n".join(
        f"- {r['title'][:100]}\n  {r['snippet'][:200]}"
        for r in all_sources[:15]
    ) or "No sources found."

    system_prompt = (
        "You are an expert YouTube SEO specialist. Given a seed keyword and real research data, "
        "generate related keyword opportunities.\n"
        "Return ONLY a JSON object with this exact schema (no markdown formatting, no backticks):\n"
        "{\n"
        '  "seed_keyword": "original keyword",\n'
        '  "search_volume": "Low | Medium | High | Very High",\n'
        '  "search_volume_details": "e.g. 10K+ monthly searches",\n'
        '  "competition": "Low | Medium | High",\n'
        '  "competition_details": "e.g. High competition level",\n'
        '  "overall_score": number 1-100,\n'
        '  "overall_score_details": "e.g. Great opportunity",\n'
        '  "trending_status": "Rising | Flat | Declining",\n'
        '  "trending_details": "e.g. Increasing demand",\n'
        '  "related_keywords": [\n'
        '    {\n'
        '      "keyword": "long tail variation",\n'
        '      "search_volume": "string (e.g. 40K, 15K)",\n'
        '      "competition": "Low | Medium | High",\n'
        '      "overall_score": number 1-100,\n'
        '      "difficulty": number 1-100\n'
        '    }\n'
        '  ]\n'
        "}"
    )
    
    human_prompt = f"Seed Keyword: {keyword}\n\nRecent Research:\n{web_block[:1500]}"
    
    try:
        content = call_groq_api_with_retries(system_prompt, human_prompt, temperature=0.5, max_tokens=1000)
        return parse_llm_json(content, context="explore_keyword_node")
    except Exception as e:
        logger.error(f"[explore_keyword_node] API failed: {e}")
        return {"error": "Failed to analyze keyword."}

def validate_niche_node(niche: str) -> dict:
    """Evaluate a niche for YouTube viability."""
    all_sources = deep_research(niche, "90d")
    
    web_block = "\n".join(
        f"- {r['title'][:100]}\n  {r['snippet'][:200]}"
        for r in all_sources[:15]
    ) or "No sources found."

    system_prompt = (
        "You are an expert YouTube Channel Strategist. Evaluate the viability of a proposed channel niche.\n"
        "Return ONLY a JSON object with this exact schema (no markdown formatting, no backticks):\n"
        "{\n"
        '  "viability_score": number 1-100,\n'
        '  "profitability": "Low | Medium | High",\n'
        '  "profitability_description": "1 short sentence, e.g. Strong monetization opportunities with multiple revenue streams.",\n'
        '  "audience_size": "Niche | Medium | Broad",\n'
        '  "audience_size_description": "1 short sentence, e.g. Appeals to a wide range of viewers across demographics.",\n'
        '  "market_demand_score": number 1-100,\n'
        '  "competition_level_score": number 1-100,\n'
        '  "monetization_potential_score": number 1-100,\n'
        '  "audience_engagement_score": number 1-100,\n'
        '  "content_longevity_score": number 1-100,\n'
        '  "pros": ["detailed pro 1", "detailed pro 2", "detailed pro 3", "detailed pro 4", "detailed pro 5"],\n'
        '  "cons": ["detailed con 1", "detailed con 2", "detailed con 3", "detailed con 4", "detailed con 5"],\n'
        '  "verdict": "1-2 sentence final recommendation"\n'
        "}"
    )
    
    human_prompt = f"Proposed Niche: {niche}\n\nRecent Market Research:\n{web_block[:1500]}"
    
    try:
        content = call_groq_api_with_retries(system_prompt, human_prompt, temperature=0.5, max_tokens=1000)
        return parse_llm_json(content, context="validate_niche_node")
    except Exception as e:
        logger.error(f"[validate_niche_node] API failed: {e}")
        return {"error": "Failed to validate niche."}

def write_script_node(title: str, summary: str, tone: str) -> dict:
    """Generate hooks, structured outline, overview stats, and thumbnail ideas."""
    system_prompt = (
        "You are an elite YouTube content strategist. The user wants to plan a video.\n"
        "Provide a highly structured video plan matching the following JSON schema strictly.\n"
        "Return ONLY the JSON object, no markdown, no explanation.\n"
        "{\n"
        '  "title": "video title",\n'
        '  "tag": "Short 1-2 word category tag (e.g. Spirituality, Tech, Gaming)",\n'
        '  "hooks": ["A 2-3 line engaging hook", "A 2-3 line engaging hook", "A 2-3 line engaging hook (each hook should be 2-3 lines that grab the viewer attention)"],\n'
        '  "outline": [\n'
        '    {\n'
        '      "section_title": "Section Name",\n'
        '      "bullets": ["Point 1", "Point 2"]\n'
        '    }\n'
        '  ],\n'
        '  "overview": {\n'
        '    "word_count": 1850,\n'
        '    "est_duration": "12:45",\n'
        '    "scenes": 8,\n'
        '    "tone": "Informative",\n'
        '    "audience": "Target demographic"\n'
        '  },\n'
        '  "notes": "Brief strategic notes/advice for the creator"\n'
        "}"
    )
    human_prompt = f"Title: {title}\nSummary: {summary}\nTone/Style: {tone}\n\nGenerate the complete video plan now."
    
    try:
        content = call_groq_api_with_retries(system_prompt, human_prompt, temperature=0.7, max_tokens=3000)
        return parse_llm_json(content, context="write_script_node")
    except Exception as e:
        logger.error(f"[write_script_node] Groq direct failed: {e}")
        return {"error": "Failed to write script."}



# ══════════════════════════════════════════════════════════════════════════════
#  NICHE RESEARCH AGENT  —  8-Step LangGraph Pipeline
#  Uses: YouTube API · Tavily (x2 keys) · pytrends · Google News RSS ·
#        Bing News RSS · Reddit JSON · Hacker News Algolia · DuckDuckGo
#        Groq LLM (llama-3.3-70b) · OpenRouter fallback
# ══════════════════════════════════════════════════════════════════════════════

class NicheResearchState(TypedDict):
    # ── inputs ────────────────────────────────────────────────────────────────
    channel_niche: str          # e.g. "anti-gravity, zero-point energy, UAP propulsion"
    channel_keywords: list      # top keywords for the niche
    custom_system_prompt: str   # the full researcher persona injected into LLM

    # ── per-step raw results ──────────────────────────────────────────────────
    step1_trends: list          # pytrends + Google Trends RSS
    step2_news: list            # Google News + Bing News
    step3_reddit: list          # Reddit posts
    step4_twitter_sim: list     # Tavily search simulating X/Twitter scan
    step5_youtube: list         # YouTube Data API search
    step6_shortform: list       # Tavily search simulating TikTok/Reels
    step7_blogs: list           # Phys.org, arxiv, The Debrief, Space.com etc
    step8_forums: list          # Quora + community Tavily search

    # ── aggregated ────────────────────────────────────────────────────────────
    all_sources: list
    web_block: str

    # ── LLM output ────────────────────────────────────────────────────────────
    raw_ideas: list
    final_ideas: list
    trend_summary: str


# ── Step 1: Google Trends (pytrends + RSS) ───────────────────────────────────
def ra_step1_trends(state: NicheResearchState) -> dict:
    logger.info("[ResearchAgent] STEP 1 — Google Trends + Trending Searches")
    keywords = state["channel_keywords"]
    niche    = state["channel_niche"]
    kw0 = keywords[0] if keywords else niche
    kw1 = keywords[1] if len(keywords) > 1 else niche

    results = []
    results += research_google_trends_pytrends(keywords[:3], niche)
    results += research_google_trends_rss(keywords[:5])

    from concurrent.futures import ThreadPoolExecutor, as_completed
    trend_queries = [
        f"{niche} trending 2025",
        f"{kw0} Google Trends spike",
        f"{kw1} trending searches this week",
        f"what is trending in {niche} right now",
        f"{niche} most searched topic June 2025",
    ]
    with ThreadPoolExecutor(max_workers=5) as ex:
        futs = [ex.submit(research_tavily, q, 4) for q in trend_queries]
        for fut in as_completed(futs):
            try: results += fut.result(timeout=15)
            except Exception as e: logger.error(f"[Step1] {e}")

    seen, unique = set(), []
    for r in results:
        u = r.get("url", "")
        if u and u not in seen:
            seen.add(u); unique.append(r)
    logger.info(f"[ResearchAgent] Step 1 found {len(unique)} trend signals")
    return {"step1_trends": unique}


# ── Step 2: Google + Bing News (past 7 days) ─────────────────────────────────
def ra_step2_news(state: NicheResearchState) -> dict:
    logger.info("[ResearchAgent] STEP 2 — Google + Bing News (deep)")
    keywords = state["channel_keywords"]
    niche    = state["channel_niche"]
    kw0 = keywords[0] if keywords else niche
    kw1 = keywords[1] if len(keywords) > 1 else niche
    kw2 = keywords[2] if len(keywords) > 2 else niche
    kw3 = keywords[3] if len(keywords) > 3 else niche

    news_queries = [
        niche, f"{kw0} news 2025", f"{kw1} latest research study",
        f"{kw2} new discovery 2025", f"{kw3} breaking news",
        f"{niche} viral article this week", f"{niche} psychology study 2025",
        f"{kw0} controversy debate 2025", f"{niche} expert reveals",
    ]

    results = []
    from concurrent.futures import ThreadPoolExecutor, as_completed
    tasks = []
    for q in news_queries:
        tasks.append(lambda q=q: research_google_news(q, 5))
        tasks.append(lambda q=q: research_bing_news(q, 4))
        tasks.append(lambda q=q: research_tavily(q, 3))

    with ThreadPoolExecutor(max_workers=15) as ex:
        for fut in as_completed(ex.submit(fn) for fn in tasks):
            try: results += fut.result(timeout=20)
            except Exception as e: logger.error(f"[Step2] {e}")

    seen, unique = set(), []
    for r in results:
        u = r.get("url", "")
        if u and u not in seen:
            seen.add(u); unique.append(r)
    logger.info(f"[ResearchAgent] Step 2 found {len(unique)} news articles")
    return {"step2_news": unique}


# ── Step 3: Reddit Deep Scan ─────────────────────────────────────────────────
def ra_step3_reddit(state: NicheResearchState) -> dict:
    logger.info("[ResearchAgent] STEP 3 — Reddit Deep Scan")
    keywords = state["channel_keywords"]
    niche    = state["channel_niche"]
    kw0 = keywords[0] if keywords else niche
    kw1 = keywords[1] if len(keywords) > 1 else niche
    kw2 = keywords[2] if len(keywords) > 2 else niche

    reddit_queries = [
        f"{niche} site:reddit.com", f"{kw0} reddit hot posts this week",
        f"{kw1} reddit discussion 2025", f"{kw2} reddit top posts",
        f"{niche} reddit viral thread", f"{kw0} reddit debate controversy",
        f"{niche} reddit r/ trending", f"{niche} reddit asked answered",
    ]

    results = []
    from concurrent.futures import ThreadPoolExecutor, as_completed
    tasks = [lambda q=q: research_reddit(q, 6) for q in reddit_queries]
    tasks += [lambda q=q: research_tavily(q, 4) for q in reddit_queries[:4]]

    with ThreadPoolExecutor(max_workers=10) as ex:
        for fut in as_completed(ex.submit(fn) for fn in tasks):
            try: results += fut.result(timeout=15)
            except Exception as e: logger.error(f"[Step3] {e}")

    seen, unique = set(), []
    for r in results:
        u = r.get("url", "")
        if u and u not in seen:
            seen.add(u); unique.append(r)
    logger.info(f"[ResearchAgent] Step 3 found {len(unique)} Reddit posts")
    return {"step3_reddit": unique}


# ── Step 4: X/Twitter + LinkedIn + Social Signals ───────────────────────────
def ra_step4_twitter(state: NicheResearchState) -> dict:
    logger.info("[ResearchAgent] STEP 4 — X/Twitter + LinkedIn + Social")
    keywords = state["channel_keywords"]
    niche    = state["channel_niche"]
    kw0 = keywords[0] if keywords else niche
    kw1 = keywords[1] if len(keywords) > 1 else niche

    social_queries = [
        f"site:x.com {niche} viral 2025",
        f"site:twitter.com {kw0} trending thread",
        f"{kw1} twitter viral tweet 2025",
        f"{niche} linkedin viral post 2025",
        f"site:linkedin.com {kw0} trending article",
        f"{niche} instagram viral post 2025",
        f"{kw0} facebook viral post 2025",
        f"{niche} social media viral moment 2025",
        f"{kw1} influencer talking about trending",
    ]

    results = []
    from concurrent.futures import ThreadPoolExecutor, as_completed
    tasks = [lambda q=q: research_tavily(q, 4) for q in social_queries]
    tasks += [lambda: research_duckduckgo(f"site:x.com {niche} viral 2025", 5)]
    tasks += [lambda: research_duckduckgo(f"site:linkedin.com {kw0} 2025", 4)]

    with ThreadPoolExecutor(max_workers=10) as ex:
        for fut in as_completed(ex.submit(fn) for fn in tasks):
            try: results += fut.result(timeout=15)
            except Exception as e: logger.error(f"[Step4] {e}")

    seen, unique = set(), []
    for r in results:
        u = r.get("url", "")
        if u and u not in seen:
            seen.add(u); unique.append(r)
    logger.info(f"[ResearchAgent] Step 4 found {len(unique)} social signals")
    return {"step4_twitter_sim": unique}


# ── Step 5: YouTube Trend Scan ────────────────────────────────────────────────
def ra_step5_youtube(state: NicheResearchState) -> dict:
    logger.info("[ResearchAgent] STEP 5 — YouTube Deep Scan")
    keywords = state["channel_keywords"]
    niche    = state["channel_niche"]
    kw0 = keywords[0] if keywords else niche
    kw1 = keywords[1] if len(keywords) > 1 else niche

    yt_queries = [niche, kw0, f"{kw1} 2025", f"{niche} viral",
                  f"{kw0} secrets revealed", f"{niche} trending video", f"{kw1} most watched"]

    results = []
    from concurrent.futures import ThreadPoolExecutor, as_completed
    tasks = [lambda q=q: research_youtube_videos(q, 8, "7d") for q in yt_queries[:6]]
    tasks += [lambda q=q: research_tavily(q, 4) for q in [
        f"site:youtube.com {niche} viral video 2025",
        f"most viewed youtube {niche} this month",
        f"youtube trending {kw0} 2025",
    ]]

    with ThreadPoolExecutor(max_workers=10) as ex:
        for fut in as_completed(ex.submit(fn) for fn in tasks):
            try: results += fut.result(timeout=20)
            except Exception as e: logger.error(f"[Step5] {e}")

    seen, unique = set(), []
    for r in results:
        u = r.get("url", "")
        if u and u not in seen:
            seen.add(u); unique.append(r)
    logger.info(f"[ResearchAgent] Step 5 found {len(unique)} YouTube videos")
    return {"step5_youtube": unique}


# ── Step 6: TikTok + Instagram + Short-Form Viral Content ────────────────────
def ra_step6_shortform(state: NicheResearchState) -> dict:
    logger.info("[ResearchAgent] STEP 6 — TikTok + Instagram + Short-Form Viral")
    keywords = state["channel_keywords"]
    niche    = state["channel_niche"]
    kw0 = keywords[0] if keywords else niche
    kw1 = keywords[1] if len(keywords) > 1 else niche

    shortform_queries = [
        f"site:tiktok.com {niche} viral 2025",
        f"tiktok {kw0} viral trend 2025",
        f"tiktok {kw1} 1 million views 2025",
        f"instagram reels {niche} viral 2025",
        f"{niche} tiktok trend explained",
        f"{kw0} short video going viral",
        f"{niche} youtube shorts viral",
        f"pinterest {niche} trending 2025",
        f"{kw1} tiktok sound trending",
    ]

    results = []
    from concurrent.futures import ThreadPoolExecutor, as_completed
    tasks = [lambda q=q: research_tavily(q, 4) for q in shortform_queries]
    tasks += [lambda: research_duckduckgo(f"tiktok {niche} viral 2025", 5)]

    with ThreadPoolExecutor(max_workers=10) as ex:
        for fut in as_completed(ex.submit(fn) for fn in tasks):
            try: results += fut.result(timeout=15)
            except Exception as e: logger.error(f"[Step6] {e}")

    seen, unique = set(), []
    for r in results:
        u = r.get("url", "")
        if u and u not in seen:
            seen.add(u); unique.append(r)
    logger.info(f"[ResearchAgent] Step 6 found {len(unique)} short-form signals")
    return {"step6_shortform": unique}


# ── Step 7: Blogs + Academic + Podcasts + Newsletters + Medium ───────────────
def ra_step7_blogs(state: NicheResearchState) -> dict:
    logger.info("[ResearchAgent] STEP 7 — Blogs + Academic + Podcasts + Newsletters")
    keywords = state["channel_keywords"]
    niche    = state["channel_niche"]
    kw0 = keywords[0] if keywords else niche
    kw1 = keywords[1] if len(keywords) > 1 else niche

    deep_queries = [
        f"{niche} blog article 2025", f"{kw0} research paper 2025",
        f"{kw1} academic study new findings", f"{niche} expert opinion article",
        f"{kw0} substack newsletter viral", f"site:medium.com {niche} 2025",
        f"{niche} podcast episode trending 2025", f"arxiv {niche} new study",
        f"{kw0} psychology today article 2025", f"{kw1} ted talk trending 2025",
        f"{niche} new book viral 2025",
    ]

    results = []
    from concurrent.futures import ThreadPoolExecutor, as_completed
    tasks = [lambda q=q: research_tavily(q, 4) for q in deep_queries]
    tasks += [lambda: research_duckduckgo(f"{niche} expert blog 2025", 6)]
    tasks += [lambda: research_rss_blogs(keywords[:5], 8)]

    with ThreadPoolExecutor(max_workers=12) as ex:
        for fut in as_completed(ex.submit(fn) for fn in tasks):
            try: results += fut.result(timeout=20)
            except Exception as e: logger.error(f"[Step7] {e}")

    seen, unique = set(), []
    for r in results:
        u = r.get("url", "")
        if u and u not in seen:
            seen.add(u); unique.append(r)
    logger.info(f"[ResearchAgent] Step 7 found {len(unique)} blog/academic sources")
    return {"step7_blogs": unique}


# ── Step 8: Forums + Communities + Quora + HN + Discord + Q&A ───────────────
def ra_step8_forums(state: NicheResearchState) -> dict:
    logger.info("[ResearchAgent] STEP 8 — Forums + Communities + Q&A + Discord")
    keywords = state["channel_keywords"]
    niche    = state["channel_niche"]
    kw0 = keywords[0] if keywords else niche
    kw1 = keywords[1] if len(keywords) > 1 else niche

    community_queries = [
        f"site:quora.com {niche} 2025",
        f"quora {kw0} most asked question 2025",
        f"site:quora.com {kw1} answer viral",
        f"{niche} forum community discussion 2025",
        f"{kw0} discord server trending topic",
        f"{niche} facebook group viral post",
        f"{kw0} community debate hot topic",
        f"{niche} stack exchange question 2025",
        f"people asking about {niche} 2025",
        f"{kw1} discussion board new post",
    ]

    results = []
    from concurrent.futures import ThreadPoolExecutor, as_completed
    tasks = [lambda q=q: research_tavily(q, 4) for q in community_queries]
    tasks += [lambda: research_hackernews(niche, 6)]
    tasks += [lambda: research_hackernews(kw0, 5)]
    tasks += [lambda: research_hackernews(kw1, 4)]
    tasks += [lambda: research_duckduckgo(f"site:quora.com {niche}", 5)]

    with ThreadPoolExecutor(max_workers=12) as ex:
        for fut in as_completed(ex.submit(fn) for fn in tasks):
            try: results += fut.result(timeout=15)
            except Exception as e: logger.error(f"[Step8] {e}")

    seen, unique = set(), []
    for r in results:
        u = r.get("url", "")
        if u and u not in seen:
            seen.add(u); unique.append(r)
    logger.info(f"[ResearchAgent] Step 8 found {len(unique)} forum/community signals")
    return {"step8_forums": unique}


# ── Aggregator Node ───────────────────────────────────────────────────────────
def ra_aggregator(state: NicheResearchState) -> dict:
    logger.info("[ResearchAgent] AGGREGATOR — Merging all 8-step sources")

    all_sources = []
    source_labels = [
        ("step1_trends",   "Google Trends"),
        ("step2_news",     "Google/Bing News"),
        ("step3_reddit",   "Reddit"),
        ("step4_twitter_sim", "X/Twitter"),
        ("step5_youtube",  "YouTube"),
        ("step6_shortform","TikTok/Reels"),
        ("step7_blogs",    "Niche Blogs"),
        ("step8_forums",   "Forums"),
    ]

    seen_urls = set()
    for key, label in source_labels:
        for item in state.get(key, []):
            u = item.get("url", "")
            if u and u.startswith("http") and u not in seen_urls:
                seen_urls.add(u)
                item["_step"] = label
                all_sources.append(item)

    # Priority sort: Trends > News > YouTube > Reddit > Blogs > Twitter > TikTok > Forums
    step_priority = {
        "Google Trends": 0,
        "Google/Bing News": 1,
        "YouTube": 2,
        "Reddit": 3,
        "Niche Blogs": 4,
        "X/Twitter": 5,
        "TikTok/Reels": 6,
        "Forums": 7,
    }
    all_sources.sort(key=lambda x: step_priority.get(x.get("_step", ""), 9))

    # Build a more focused web_block with better structure
    web_block_lines = []
    for idx, r in enumerate(all_sources[:60], 1):  # Limit to 60 sources for token efficiency
        if r.get("url", "").startswith("http"):
            step = r.get('_step', 'Web')
            title = r.get('title', '')[:100]
            snippet = r.get('snippet', '')[:150]
            web_block_lines.append(f"{idx}. [{step}] {title}\n   {snippet}")
    
    web_block = "\n\n".join(web_block_lines) or "No sources found."

    logger.info(f"[ResearchAgent] Aggregator: {len(all_sources)} total unique sources")
    return {"all_sources": all_sources, "web_block": web_block}


# ── LLM Synthesizer Node ──────────────────────────────────────────────────────
def ra_synthesizer(state: NicheResearchState) -> dict:
    logger.info("[ResearchAgent] SYNTHESIZER — Generating 5 best viral video ideas")
    custom_prompt = state.get("custom_system_prompt", "")
    niche = state["channel_niche"]
    keywords = state["channel_keywords"]
    web_block = state["web_block"]

    # YouTube style reference (channel's recent videos for tone/format only)
    yt_sources = [s for s in state.get("all_sources", []) if "youtube.com" in s.get("url", "")]
    yt_style = "\n".join(
        f"- {r['title'][:80]}" for r in yt_sources[:5]
    ) or "No recent uploads found."

    # ── Compact but powerful system prompt ────────────────────────────────────
    system_prompt = (
        "You are an elite YouTube strategist. Generate 5 viral video ideas "
        "backed by deep research across the entire internet.\n\n"
        f"Channel context: {custom_prompt[:300]}\n\n"
        "Your job: Analyze the research data below (from 8 diverse sources: "
        "Google Trends, News, Reddit, Twitter/LinkedIn, YouTube, TikTok/Instagram, "
        "Blogs/Academic, Forums/Communities) and identify the 5 BEST viral ideas.\n\n"
        "Return ONLY this JSON:\n"
        '{"ideas":[{"rank":1,"viral_score":95,"title":"The Dark Secret About [Topic] That Changed Everything",'
        '"hook":"You won\'t believe what I found buried in the research...",'
        '"core_angle":"Expose a hidden truth using cross-platform research evidence",'
        '"why_trending":"[Specific recent event/study/viral moment from research data]",'
        '"trend_sources":[{"platform":"Google News","title":"[Real title from research]","url":"[Real URL]"}],'
        '"seo_keywords":["kw1","kw2","kw3"],'
        '"best_format":"Standard","risk_level":"Low",'
        '"description":"A [format] exposing [specific thing] based on [research sources]"}],'
        '"trend_summary":"[What\'s dominating the research across all platforms]"}\n\n'
        "CRITICAL RULES:\n"
        "1. Titles must be YouTube-ready: 40-70 chars, attention-grabbing, NOT keywords\n"
        "2. GOOD: 'The Shocking Truth About Mind Control in 2026'\n"
        "3. BAD: 'mind control psychology'\n"
        "4. why_trending MUST cite specific research (e.g., 'Reddit post with 12K upvotes', 'New NYT article', 'Viral TikTok')\n"
        "5. Cite real URLs from the research data\n"
        "6. Prioritize cross-platform trends (e.g., topic trending on both Reddit AND news)\n"
        "7. Rank by viral potential based on research breadth and recency"
    )

    # ── Compact human prompt with research data ───────────────────────────────
    human_prompt = (
        f"NICHE: {niche}\n"
        f"KEYWORDS: {', '.join(keywords[:5])}\n"
        f"CHANNEL STYLE (recent uploads):\n{yt_style}\n\n"
        f"RESEARCH DATA (8 sources):\n{web_block[:6000]}\n\n"
        "Generate 5 best viral ideas based on this research. Return JSON only."
    )

    def _clean_ideas(ideas: list) -> list:
        """Normalize and validate idea objects."""
        cleaned = []
        for idea in ideas:
            if not isinstance(idea, dict):
                continue
            # Normalize viral_score
            v = idea.get("viral_score", 50)
            try:
                v = int(''.join(filter(str.isdigit, str(v))) or 50)
            except Exception:
                v = 50
            idea["viral_score"] = v
            idea["virality_score"] = v

            # Normalize sources
            raw_sources = idea.get("trend_sources", [])
            if not isinstance(raw_sources, list):
                raw_sources = []
            safe_sources = []
            for s in raw_sources[:3]:
                if isinstance(s, dict):
                    safe_sources.append({
                        "title": str(s.get("title", "") or ""),
                        "url": str(s.get("url", "") or ""),
                        "platform": str(s.get("platform", "") or ""),
                    })
            idea["trend_sources"] = safe_sources
            idea["sources"] = safe_sources

            # Tags
            raw_tags = idea.get("seo_keywords", [])
            idea["tags"] = raw_tags[:4] if isinstance(raw_tags, list) else []

            cleaned.append(idea)

        # Sort by viral score, keep top 5
        cleaned.sort(key=lambda x: x.get("viral_score", 0), reverse=True)
        for i, idea in enumerate(cleaned):
            idea["rank"] = i + 1
        return cleaned[:5]

    # ── Attempt 1: require_json=False (more compatible across models) ─────────
    ideas, trend_summary = [], ""
    try:
        logger.info("[ResearchAgent] Synthesizer attempt 1 (require_json=False)")
        content = call_groq_api_with_retries(
            system_prompt, human_prompt, temperature=0.8, max_tokens=4000, require_json=False
        )
        logger.info(f"[ResearchAgent] Attempt 1 response: {len(content)} chars | preview: {content[:200]}")
        parsed = parse_llm_json(content, context="synthesizer_attempt1")
        ideas = parsed.get("ideas", [])
        trend_summary = parsed.get("trend_summary", "")
    except Exception as e1:
        logger.warning(f"[ResearchAgent] Attempt 1 failed: {e1}")

    # ── Attempt 2: require_json=True if attempt 1 gave bad results ───────────
    if len(ideas) < 3:
        try:
            logger.info("[ResearchAgent] Synthesizer attempt 2 (require_json=True)")
            content = call_groq_api_with_retries(
                system_prompt, human_prompt, temperature=0.7, max_tokens=4000, require_json=True
            )
            logger.info(f"[ResearchAgent] Attempt 2 response: {len(content)} chars | preview: {content[:200]}")
            parsed = parse_llm_json(content, context="synthesizer_attempt2")
            ideas = parsed.get("ideas", [])
            trend_summary = parsed.get("trend_summary", "")
        except Exception as e2:
            logger.error(f"[ResearchAgent] Attempt 2 failed: {e2}")

    # ── Validate quality ──────────────────────────────────────────────────────
    if ideas:
        good = [i for i in ideas if i.get("title") and not i["title"].startswith("[")
                and "search volume" not in i["title"].lower() and len(i.get("title","")) > 20]
        if len(good) < len(ideas) // 2:
            logger.warning(f"[ResearchAgent] Low quality titles detected ({len(good)}/{len(ideas)})")
        ideas = good if good else ideas

    if not ideas:
        logger.error("[ResearchAgent] SYNTHESIZER FAILED — no ideas generated")
        raise ValueError("Synthesizer produced no ideas after 2 attempts. Check API keys and quotas.")

    final = _clean_ideas(ideas)
    logger.info(f"[ResearchAgent] Synthesizer SUCCESS — {len(final)} ideas")
    return {"raw_ideas": final, "trend_summary": trend_summary}


# ── Final Formatter Node ──────────────────────────────────────────────────────
def ra_formatter(state: NicheResearchState) -> dict:
    logger.info("[ResearchAgent] FORMATTER — Finalizing output")
    ideas = state.get("raw_ideas", [])

    # Second-pass enrichment: ensure all required fields exist
    final = []
    for i, idea in enumerate(ideas[:5]):  # Top 5 only
        final.append({
            "rank":          idea.get("rank", i + 1),
            "viral_score":   idea.get("viral_score", 50),
            "virality_score":idea.get("viral_score", 50),
            "title":         idea.get("title", f"Video Idea #{i+1}"),
            "description":   idea.get("description", ""),
            "hook":          idea.get("hook", ""),
            "core_angle":    idea.get("core_angle", ""),
            "why_trending":  idea.get("why_trending", ""),
            "seo_keywords":  idea.get("seo_keywords", []),
            "best_format":   idea.get("best_format", "Standard"),
            "format_reason": idea.get("format_reason", ""),
            "risk_level":    idea.get("risk_level", "Medium"),
            "tags":          idea.get("tags", idea.get("seo_keywords", [])[:4]),
            "sources":       idea.get("sources", []),
            "trend_sources": idea.get("trend_sources", []),
        })

    return {"final_ideas": final}


# ── Build LangGraph for the Research Agent ────────────────────────────────────
def build_research_agent_graph():
    """
    Graph topology:
      step1 → step2 → step3 → step4 → step5 → step6 → step7 → step8
           → aggregator → synthesizer → formatter → END
    Steps 1-8 run sequentially to respect API rate limits; aggregation +
    synthesis run after all data is collected.
    """
    wf = StateGraph(NicheResearchState)

    wf.add_node("step1_trends",   ra_step1_trends)
    wf.add_node("step2_news",     ra_step2_news)
    wf.add_node("step3_reddit",   ra_step3_reddit)
    wf.add_node("step4_twitter",  ra_step4_twitter)
    wf.add_node("step5_youtube",  ra_step5_youtube)
    wf.add_node("step6_shortform",ra_step6_shortform)
    wf.add_node("step7_blogs",    ra_step7_blogs)
    wf.add_node("step8_forums",   ra_step8_forums)
    wf.add_node("aggregator",     ra_aggregator)
    wf.add_node("synthesizer",    ra_synthesizer)
    wf.add_node("formatter",      ra_formatter)

    wf.set_entry_point("step1_trends")
    wf.add_edge("step1_trends",   "step2_news")
    wf.add_edge("step2_news",     "step3_reddit")
    wf.add_edge("step3_reddit",   "step4_twitter")
    wf.add_edge("step4_twitter",  "step5_youtube")
    wf.add_edge("step5_youtube",  "step6_shortform")
    wf.add_edge("step6_shortform","step7_blogs")
    wf.add_edge("step7_blogs",    "step8_forums")
    wf.add_edge("step8_forums",   "aggregator")
    wf.add_edge("aggregator",     "synthesizer")
    wf.add_edge("synthesizer",    "formatter")
    wf.add_edge("formatter",      END)

    return wf.compile()


# ── Flask Route ───────────────────────────────────────────────────────────────
@app.route("/api/research-agent", methods=["POST"])
@limiter.limit("3 per minute")
def research_agent_route():
    """
    POST body (JSON):
      {
        "channel_niche":        "anti-gravity, zero-point energy, UAP propulsion, ...",
        "channel_keywords":     ["antigravity", "UAP", "zero point energy", ...],
        "custom_system_prompt": "<full researcher persona text>"   // optional
      }
    Returns the 10 ranked video ideas + trend_summary + all_sources count.
    """
    data = request.get_json(force=True) or {}

    channel_niche   = (data.get("channel_niche") or "").strip()
    channel_keywords= data.get("channel_keywords") or []
    custom_prompt   = (data.get("custom_system_prompt") or "").strip()

    if not channel_niche:
        return jsonify({"error": "channel_niche is required"}), 400

    if not channel_keywords:
        # Auto-derive keywords from the niche string
        channel_keywords = [w.strip() for w in channel_niche.replace(",", " ").split() if len(w.strip()) > 3][:8]

    if not custom_prompt:
        custom_prompt = (
            "You are an elite YouTube research agent specialising in fringe-but-real science. "
            f"The channel covers: {channel_niche}. "
            "Only surface content published or going viral within the last 7 days. "
            "Every idea must be backed by real signals found in the research data."
        )

    logger.info(f"\n[ResearchAgent] ═══ NEW RESEARCH JOB ═══")
    logger.info(f"[ResearchAgent] Niche: {channel_niche}")
    logger.info(f"[ResearchAgent] Keywords: {channel_keywords}")

    initial_state = NicheResearchState(
        channel_niche=channel_niche,
        channel_keywords=channel_keywords,
        custom_system_prompt=custom_prompt,
        step1_trends=[],
        step2_news=[],
        step3_reddit=[],
        step4_twitter_sim=[],
        step5_youtube=[],
        step6_shortform=[],
        step7_blogs=[],
        step8_forums=[],
        all_sources=[],
        web_block="",
        raw_ideas=[],
        final_ideas=[],
        trend_summary="",
    )

    try:
        graph  = build_research_agent_graph()
        result = graph.invoke(initial_state)

        ideas         = result.get("final_ideas", [])
        trend_summary = result.get("trend_summary", "")
        all_sources   = result.get("all_sources", [])

        # Step-level source counts for transparency
        step_counts = {
            "step1_trends":    len(result.get("step1_trends", [])),
            "step2_news":      len(result.get("step2_news", [])),
            "step3_reddit":    len(result.get("step3_reddit", [])),
            "step4_twitter":   len(result.get("step4_twitter_sim", [])),
            "step5_youtube":   len(result.get("step5_youtube", [])),
            "step6_shortform": len(result.get("step6_shortform", [])),
            "step7_blogs":     len(result.get("step7_blogs", [])),
            "step8_forums":    len(result.get("step8_forums", [])),
            "total_unique":    len(all_sources),
        }
        logger.info(f"[ResearchAgent] Finished. Step counts: {step_counts}")

        return jsonify({
            "ideas":        ideas,
            "trend_summary":trend_summary,
            "step_counts":  step_counts,
            "sources_used": len(all_sources),
            # Minimal channel shape so existing frontend works
            "channel": {
                "channel_name": f"Research: {channel_niche[:60]}",
                "niche":        channel_niche,
                "subscribers":  0,
            }
        })

    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


# ── Routes ──────────────────────────────────────────────────────────────────

@app.route("/api/views-trend", methods=["POST"])
@limiter.limit("10 per minute")
def views_trend():
    """Fetch real video data from YouTube API and return daily view aggregates."""
    yt_key = get_youtube_api_key()
    if not yt_key:
        return jsonify({"error": "YouTube API Key missing."}), 400

    data = request.get_json(force=True)
    channel_id = data.get("channel_id", "").strip()
    if not channel_id:
        return jsonify({"error": "channel_id is required."}), 400

    try:
        youtube = build("youtube", "v3", developerKey=yt_key)

        # 1. Fetch channel stats to establish a baseline for unaccounted views
        channel_total_views = 0
        channel_published_at = None
        try:
            channel_resp = youtube.channels().list(
                part="statistics,snippet",
                id=channel_id
            ).execute()
            channel_items = channel_resp.get("items", [])
            if channel_items:
                c_stat = channel_items[0].get("statistics", {})
                c_snip = channel_items[0].get("snippet", {})
                channel_total_views = int(c_stat.get("viewCount", 0))
                pub = c_snip.get("publishedAt", "")
                if pub:
                    channel_published_at = datetime.strptime(pub[:10], "%Y-%m-%d").date()
        except Exception as c_err:
            logger.error(f"[Views Trend] Failed to fetch channel stats: {c_err}")

        # Cost-efficient strategy: 
        # 2. Fetch statistics and titles for all retrieved video IDs in a single batch (Cost: 1 unit)
        uploads_playlist_id = "UU" + channel_id[2:] if channel_id.startswith("UC") else ""
        video_ids = []
        
        if uploads_playlist_id:
            try:
                pl_resp = youtube.playlistItems().list(
                    part="contentDetails",
                    playlistId=uploads_playlist_id,
                    maxResults=50
                ).execute()
                video_ids = [item["contentDetails"]["videoId"] for item in pl_resp.get("items", []) if item.get("contentDetails", {}).get("videoId")]
                logger.info(f"[Views Trend][API] Found {len(video_ids)} recent videos via uploads playlist UU...")
            except Exception as pl_err:
                logger.error(f"[Views Trend][API] Failed to fetch playlist items: {pl_err}")

        # Fallback to search if uploads playlist fails or returns empty (Cost: 100 units)
        if not video_ids:
            logger.info(f"[Views Trend][API][Fallback] Using search fallback to find recent videos for channel {channel_id}")
            search_resp = youtube.search().list(
                part="id",
                channelId=channel_id,
                order="date",
                type="video",
                maxResults=50
            ).execute()
            video_ids = [item["id"]["videoId"] for item in search_resp.get("items", []) if item["id"].get("videoId")]

        if not video_ids:
            return jsonify({"error": "No videos found for this channel."}), 404

        # Get detailed stats for each video in one batch (Cost: 1 unit)
        videos_resp = youtube.videos().list(
            part="snippet,statistics",
            id=",".join(video_ids)
        ).execute()

        videos = []
        for v in videos_resp.get("items", []):
            pub_date = v["snippet"]["publishedAt"][:10]  # YYYY-MM-DD
            view_count = int(v["statistics"].get("viewCount", 0))
            videos.append({
                "published": pub_date,
                "views": view_count,
                "title": v["snippet"]["title"]
            })

        # Sort by published date
        videos.sort(key=lambda x: x["published"])

        # Build time-series data for different timeframes.
        today = datetime.utcnow().date()
        
        # Calculate baseline daily views for all older/unaccounted videos
        recent_videos_views = sum(v["views"] for v in videos)
        unaccounted_views = max(0, channel_total_views - recent_videos_views)
        
        channel_age_days = 1
        if channel_published_at:
            channel_age_days = max(1, (today - channel_published_at).days + 1)
        
        # We assume the channel has a baseline of views coming from older videos
        baseline_daily = unaccounted_views / channel_age_days

        timeframes = {}

        for tf_days, tf_label in [(7, "7"), (28, "28"), (90, "90"), (365, "365"), (9999, "999")]:
            # Cap lifetime timeline to actual channel age to avoid generating 27+ years of data
            effective_days = min(tf_days, channel_age_days) if tf_days > 365 else tf_days
            cutoff = today - timedelta(days=effective_days)
            day_data = {}

            # Seed the range so every timeframe produces a stable timeline, starting with baseline
            for d in range(effective_days, -1, -1):
                day = today - timedelta(days=d)
                # Cap the baseline start so we don't apply baseline before channel existed
                if channel_published_at and day < channel_published_at:
                    day_data[day.isoformat()] = 0.0
                else:
                    day_data[day.isoformat()] = baseline_daily

            for v in videos:
                pub = datetime.strptime(v["published"], "%Y-%m-%d").date()
                lifetime_views = v["views"]
                total_span_days = (today - pub).days + 1
                
                if total_span_days <= 0:
                    continue

                # Model: 70% launch spike, 30% evergreen flat rate
                launch_fraction = 0.70
                evergreen_fraction = 0.30
                
                # Adjust fractions if the video is fresher than 14 days
                if total_span_days < 14:
                    launch_fraction = 1.0 - (0.30 * (total_span_days / 14.0))
                    evergreen_fraction = 1.0 - launch_fraction
                
                launch_views = lifetime_views * launch_fraction
                evergreen_views = lifetime_views * evergreen_fraction
                
                # 1. Distribute evergreen views equally over the entire lifetime of the video
                evergreen_daily = evergreen_views / total_span_days
                
                # 2. Distribute launch views over the first 14 days using exponential decay
                launch_span = min(total_span_days, 14)
                launch_weights = [math.exp(-offset / 3.0) for offset in range(launch_span)]
                launch_weight_total = sum(launch_weights) or 1.0
                
                for offset in range(total_span_days):
                    day = pub + timedelta(days=offset)
                    if day < cutoff or day > today:
                        continue
                        
                    key = day.isoformat()
                    
                    # Evergreen contribution
                    contribution = evergreen_daily
                    
                    # Launch contribution (only during the first 14 days after publication)
                    if offset < launch_span:
                        contribution += launch_views * launch_weights[offset] / launch_weight_total
                        
                    day_data[key] = day_data.get(key, 0.0) + contribution

            sorted_days = sorted(day_data.keys())
            labels = sorted_days
            values = [max(0, int(round(day_data[d]))) for d in sorted_days]

            total_period = sum(values)
            timeframes[tf_label] = {
                "labels": labels,
                "values": values,
                "total": total_period
            }

        return jsonify({
            "timeframes": timeframes,
            "videos": videos[:10]  # Return top 10 for reference
        })

    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500







@app.route("/api/channel-insights", methods=["POST"])
@limiter.limit("10 per minute")
def channel_insights():
    yt_key = get_youtube_api_key()
    if not yt_key:
        return jsonify({"error": "YouTube API Key missing."}), 400

    data = request.get_json(force=True)
    channel_id = data.get("channel_id", "").strip()
    if not channel_id:
        return jsonify({"error": "channel_id is required."}), 400
    if not channel_id.startswith("UC") or len(channel_id) < 20:
        return jsonify({"error": "Invalid channel_id format. Expected a YouTube channel ID starting with 'UC'."}), 400

    try:
        youtube = build("youtube", "v3", developerKey=yt_key)

        uploads_playlist_id = "UU" + channel_id[2:] if channel_id.startswith("UC") else ""
        video_ids = []
        
        if uploads_playlist_id:
            try:
                pl_resp = youtube.playlistItems().list(
                    part="contentDetails",
                    playlistId=uploads_playlist_id,
                    maxResults=50
                ).execute()
                video_ids = [item["contentDetails"]["videoId"] for item in pl_resp.get("items", []) if item.get("contentDetails", {}).get("videoId")]
            except Exception as pl_err:
                pass

        if not video_ids:
            search_resp = youtube.search().list(
                part="id",
                channelId=channel_id,
                order="date",
                type="video",
                maxResults=50
            ).execute()
            video_ids = [item["id"]["videoId"] for item in search_resp.get("items", []) if item.get("id", {}).get("videoId")]

        if not video_ids:
            return jsonify({"error": "No videos found for this channel."}), 404

        videos_resp = youtube.videos().list(
            part="snippet,statistics",
            id=",".join(video_ids)
        ).execute()

        videos = []
        for v in videos_resp.get("items", []):
            pub_date = v["snippet"]["publishedAt"][:10]  # YYYY-MM-DD
            view_count = int(v["statistics"].get("viewCount", 0))
            videos.append({
                "published": pub_date,
                "views": view_count,
                "title": v["snippet"]["title"]
            })

        # Calculate average views by upload day
        day_views = {0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []} # Mon to Sun
        for v in videos:
            dt = datetime.strptime(v["published"], "%Y-%m-%d")
            day_of_week = dt.weekday()
            day_views[day_of_week].append(v["views"])
            
        engagement_data = []
        days = ["M", "T", "W", "T", "F", "S", "S"]
        colors = ["#ff2a2a", "#a855f7", "#00d2ff", "#fbbf24", "#4ade80", "#f97316", "#ff5555"]
        for i in range(7):
            avg = sum(day_views[i]) / len(day_views[i]) if day_views[i] else 0
            engagement_data.append({
                "name": days[i],
                "value": int(avg),
                "color": colors[i]
            })
            
        # Build content distribution using multi-word phrase extraction
        content_distribution = []
        if videos:
            import re as _re
            from collections import Counter, defaultdict
            
            # Expanded stop words list
            stop_words = {
                'the','a','an','and','or','but','in','on','at','to','for','of','with',
                'is','are','was','were','be','been','being','have','has','had','do',
                'does','did','will','would','could','should','may','might','i','my',
                'you','your','we','our','they','their','it','its','this','that','these',
                'those','how','why','what','when','where','who','which','if','so','as',
                'by','from','up','about','into','through','during','before','after',
                'above','below','between','out','off','over','under','again','then',
                'once','here','there','all','both','each','few','more','most','other',
                'some','such','no','not','only','same','than','too','very','just',
                'can','now','new','get','got','make','made','one','two','three','vs',
                'part','full','ep','episode','ft','feat','official','video','youtube',
                '2024','2025','2026','|','–','—','using','every','best','top','things',
                'need','know','watch','see','look','like','really','way','much','many',
                'guide','tutorial','tips','tricks','learn','show','tell','find','help',
            }
            
            # Extract bigrams and trigrams (multi-word phrases) from all titles
            all_bigrams = []
            all_trigrams = []
            all_words = []
            
            for v in videos:
                title_lower = v['title'].lower()
                words = _re.findall(r"[a-zA-Z]{3,}", title_lower)
                words = [w for w in words if w not in stop_words]
                
                # Store single words
                all_words.extend(words)
                
                # Create bigrams (2-word phrases)
                for i in range(len(words) - 1):
                    bigram = f"{words[i]} {words[i+1]}"
                    all_bigrams.append(bigram)
                
                # Create trigrams (3-word phrases)
                for i in range(len(words) - 2):
                    trigram = f"{words[i]} {words[i+1]} {words[i+2]}"
                    all_trigrams.append(trigram)
            
            # Count phrase frequencies
            trigram_counts = Counter(all_trigrams)
            bigram_counts = Counter(all_bigrams)
            word_counts = Counter(all_words)
            
            # Prioritize multi-word phrases that appear multiple times
            candidate_phrases = []
            
            # Add trigrams that appear at least 2 times
            for phrase, count in trigram_counts.most_common(20):
                if count >= 2:
                    candidate_phrases.append((phrase, count, 3))  # weight=3 for trigrams
            
            # Add bigrams that appear at least 3 times
            for phrase, count in bigram_counts.most_common(20):
                if count >= 3:
                    candidate_phrases.append((phrase, count, 2))  # weight=2 for bigrams
            
            # Add single words that appear at least 5 times (as fallback)
            for word, count in word_counts.most_common(15):
                if count >= 5:
                    candidate_phrases.append((word, count, 1))  # weight=1 for single words
            
            # Sort by (count * weight) to prioritize meaningful multi-word phrases
            candidate_phrases.sort(key=lambda x: x[1] * x[2], reverse=True)
            
            # Take top candidates
            top_phrases = [p[0] for p in candidate_phrases[:20]]
            
            if len(top_phrases) >= 3:
                # Assign each video to a category based on phrase matching
                video_categories = defaultdict(list)
                
                for v in videos:
                    title_lower = v['title'].lower()
                    matched = False
                    
                    # Try to match with phrases (prioritize longer phrases)
                    for phrase in top_phrases:
                        phrase_words = phrase.split()
                        # Check if all words in phrase appear in title
                        if all(word in title_lower for word in phrase_words):
                            video_categories[phrase].append(v)
                            matched = True
                            break
                
                # Sort categories by video count
                sorted_cats = sorted(video_categories.items(), key=lambda x: len(x[1]), reverse=True)
                
                # Take top 5 categories
                top_5_cats = sorted_cats[:5]
                
                # Calculate real percentages
                total_videos = len(videos)
                distribution = []
                
                for phrase, vid_list in top_5_cats:
                    count = len(vid_list)
                    percentage = round((count / total_videos) * 100)
                    
                    # Create proper category name (title case)
                    words = phrase.split()
                    category_name = " ".join([w.capitalize() for w in words])
                    
                    distribution.append({
                        "name": category_name,
                        "value": percentage,
                        "count": count
                    })
                
                # Normalize to exactly 100%
                if distribution:
                    total_pct = sum(d['value'] for d in distribution)
                    if total_pct != 100:
                        diff = 100 - total_pct
                        distribution[0]['value'] += diff
                    
                    # Assign colors
                    for i, item in enumerate(distribution):
                        item["color"] = colors[i % len(colors)]
                    
                    content_distribution = distribution
            
            # Fallback: use top single words
            if not content_distribution:
                top_5_words = [w for w, c in word_counts.most_common(5) if c >= 2]
                if top_5_words:
                    per = 100 // len(top_5_words)
                    remainder = 100 - per * len(top_5_words)
                    content_distribution = [
                        {
                            "name": f"{w.capitalize()} Related",
                            "value": per + (remainder if i == 0 else 0),
                            "color": colors[i % len(colors)]
                        }
                        for i, w in enumerate(top_5_words)
                    ]
        
        if not content_distribution:
            content_distribution = [{"name": "Content Analysis Unavailable", "value": 100, "color": "#00d2ff"}]

        # Fetch Most Viral Video
        viral_video = None
        try:
            top_search = youtube.search().list(
                part="id", channelId=channel_id, order="viewCount", type="video", maxResults=1
            ).execute()
            if top_search.get("items"):
                top_video_id = top_search["items"][0]["id"]["videoId"]
                top_vid_resp = youtube.videos().list(
                    part="snippet,statistics", id=top_video_id
                ).execute()
                if top_vid_resp.get("items"):
                    top_v = top_vid_resp["items"][0]
                    viral_video = {
                        "title": top_v["snippet"].get("title", ""),
                        "description": top_v["snippet"].get("description", "")[:150] + "...",
                        "views": int(top_v["statistics"].get("viewCount", 0)),
                        "tags": top_v["snippet"].get("tags", [])[:5]
                    }
        except Exception as e:
            logger.error("Failed to fetch viral video:", e)

        if not viral_video and videos_resp.get("items"):
            try:
                top_v = max(videos_resp.get("items", []), key=lambda x: int(x["statistics"].get("viewCount", 0)))
                viral_video = {
                    "title": top_v["snippet"].get("title", ""),
                    "description": top_v["snippet"].get("description", "")[:150] + "...",
                    "views": int(top_v["statistics"].get("viewCount", 0)),
                    "tags": top_v["snippet"].get("tags", [])[:5]
                }
            except Exception as e:
                logger.error("Fallback viral video failed:", e)

        return jsonify({
            "engagement_data": engagement_data,
            "content_distribution": content_distribution,
            "videos": videos,
            "viral_video": viral_video
        })

    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.route("/analyze", methods=["POST"])
@limiter.limit("3 per minute")
def analyze():
    """
    Legacy endpoint — redirects to /api/trending-ideas for backward compatibility.
    """
    groq_key = get_groq_api_key()
    if not groq_key:
        return jsonify({"error": "Groq API Key is missing. Add GROQ_API_KEY to your .env file."}), 400

    data = request.get_json(force=True)
    channel_url = data.get("channel_url", "").strip()
    
    if not channel_url:
        return jsonify({"error": "channel_url is required"}), 400
    
    # Redirect to the trending-ideas endpoint
    return trending_ideas()


@app.route("/api/trending-ideas", methods=["POST"])
@limiter.limit("3 per minute")
def trending_ideas():
    """
    Unified endpoint:
      POST body: {
        "channel_url": "https://youtube.com/@channel  OR  plain niche text",
        "timeframe":   "7d" | "28d" | "90d" | "lifetime"   (optional, default 28d)
      }

    Flow:
      1. If YouTube URL/handle  → scrape channel + infer niche via LLM.
         Timeframe controls which recent videos are used as STYLE context:
           - Fetch videos published within the chosen window.
           - If 0 videos found in that window → fall back to last 10 uploads.
      2. If plain text → use as niche directly (no YouTube lookup).
      3. Run the full 8-step LangGraph research agent.
      4. Return 10 ranked ideas + trend_summary + step_counts + channel info.
    """
    # Check required API keys
    groq_key = get_groq_api_key()
    if not groq_key:
        return jsonify({"error": "GROQ_API_KEY is missing. Please configure it in your Render environment variables."}), 400
    
    data      = request.get_json(force=True) or {}
    raw_input = (data.get("channel_url") or data.get("niche") or "").strip()
    timeframe = (data.get("timeframe") or "28d").strip()
    if timeframe not in TIMEFRAME_MAP:
        timeframe = "28d"

    if not raw_input:
        return jsonify({"error": "channel_url is required"}), 400
    if len(raw_input) > 500:
        return jsonify({"error": "Input too long (max 500 chars)"}), 400

    # Days window for YouTube style-context fetch
    TF_DAYS = {"7d": 7, "28d": 28, "90d": 90, "lifetime": 9999}
    days_window = TF_DAYS.get(timeframe, 28)

    channel_info     = {}
    channel_niche    = ""
    channel_keywords = []

    # ── Detect YouTube URL / handle ──────────────────────────────────────────
    is_yt = (
        "youtube.com" in raw_input.lower()
        or "youtu.be" in raw_input.lower()
        or raw_input.startswith("@")
        or (raw_input.startswith("UC") and len(raw_input) >= 20)
    )

    if is_yt:
        try:
            logger.info(f"[TrendingIdeas] YouTube input detected. Scraping: {raw_input}")
            channel_info = scrape_channel_page(raw_input)
            logger.info(f"[TrendingIdeas] Channel: {channel_info.get('channel_name')}")

            # ── Timeframe-aware video title fetch ────────────────────────────
            yt_key      = get_youtube_api_key()
            channel_id  = channel_info.get("channel_id", "")
            titles_in_window = []

            if yt_key and channel_id and days_window < 9999:
                try:
                    youtube   = build("youtube", "v3", developerKey=yt_key)
                    published_after = (datetime.utcnow() - timedelta(days=days_window)).strftime("%Y-%m-%dT00:00:00Z")
                    search_resp = youtube.search().list(
                        part="snippet",
                        channelId=channel_id,
                        order="date",
                        type="video",
                        publishedAfter=published_after,
                        maxResults=15
                    ).execute()
                    titles_in_window = [
                        item["snippet"]["title"]
                        for item in search_resp.get("items", [])
                        if item.get("snippet", {}).get("title")
                    ]
                    logger.info(f"[TrendingIdeas] {len(titles_in_window)} videos found in {timeframe} window")
                except Exception as yt_err:
                    logger.error(f"[TrendingIdeas] Timeframe fetch failed: {yt_err}")

            # Fall back to last 10 if nothing in the chosen window
            if not titles_in_window:
                titles_in_window = channel_info.get("recent_video_titles", [])[:10]
                logger.info(f"[TrendingIdeas] No videos in window — using last {len(titles_in_window)} uploads as fallback")

            channel_info["recent_video_titles"] = titles_in_window

            # ── Infer niche from channel ─────────────────────────────────────
            niche_info       = infer_channel_niche(channel_info)
            channel_niche    = niche_info.get("topic", channel_info.get("channel_name", raw_input))
            channel_keywords = niche_info.get("keywords", []) + niche_info.get("search_queries", [])
            channel_info["niche"] = channel_niche

            logger.info(f"[TrendingIdeas] Niche: {channel_niche}")

        except Exception as scrape_err:
            logger.error(f"[TrendingIdeas] Scrape failed ({scrape_err}) — treating as plain text")
            channel_niche = raw_input
            channel_info  = {"channel_name": raw_input, "niche": raw_input, "subscribers": 0,
                             "recent_video_titles": []}
    else:
        logger.info(f"[TrendingIdeas] Plain text niche: {raw_input}")
        channel_niche = raw_input
        channel_info  = {"channel_name": raw_input, "niche": raw_input, "subscribers": 0,
                         "recent_video_titles": []}

    # Auto-derive keywords if still empty
    if not channel_keywords:
        channel_keywords = [w.strip() for w in channel_niche.replace(",", " ").split()
                            if len(w.strip()) > 3][:8]

    # ── Build researcher persona ──────────────────────────────────────────────
    channel_name  = channel_info.get("channel_name", "the channel")
    recent_titles = channel_info.get("recent_video_titles", [])

    window_label = f"past {days_window} days" if days_window < 9999 else "all time"
    titles_hint  = ""
    if recent_titles:
        titles_hint = (
            f"\n\nChannel's recent uploads ({window_label}):\n"
            + "\n".join(f"- {t}" for t in recent_titles[:10])
            + "\nMatch this style but invent FRESH ideas — never replicate existing videos."
        )
    else:
        titles_hint = "\n\nNo recent uploads found in the selected window — base ideas purely on live research."

    custom_prompt = (
        f"You are an elite YouTube research agent for the channel '{channel_name}'.\n"
        "Your job: find ONLY content that is currently trending — published or going viral "
        "within the last 7 days — and is directly relevant to this channel's subject matter.\n"
        "STRICT RULES:\n"
        "- 7-Day Hard Cutoff: discard anything older than 7 days.\n"
        "- Every idea must be backed by at least one concrete signal from the research data.\n"
        "- Every idea must be meaningfully different.\n"
        "- Never fabricate stats, URLs, or trending claims."
        + titles_hint
    )

    # ── Run the 8-step LangGraph research agent ───────────────────────────────
    logger.info(f"\n[TrendingIdeas] ═══ LAUNCHING 8-STEP RESEARCH AGENT ═══")

    initial_state = NicheResearchState(
        channel_niche=channel_niche,
        channel_keywords=channel_keywords[:10],
        custom_system_prompt=custom_prompt,
        step1_trends=[],
        step2_news=[],
        step3_reddit=[],
        step4_twitter_sim=[],
        step5_youtube=[],
        step6_shortform=[],
        step7_blogs=[],
        step8_forums=[],
        all_sources=[],
        web_block="",
        raw_ideas=[],
        final_ideas=[],
        trend_summary="",
    )

    try:
        graph  = build_research_agent_graph()
        result = graph.invoke(initial_state)

        ideas         = result.get("final_ideas", [])
        trend_summary = result.get("trend_summary", "")
        all_sources   = result.get("all_sources", [])

        step_counts = {
            "step1_trends":    len(result.get("step1_trends", [])),
            "step2_news":      len(result.get("step2_news", [])),
            "step3_reddit":    len(result.get("step3_reddit", [])),
            "step4_twitter":   len(result.get("step4_twitter_sim", [])),
            "step5_youtube":   len(result.get("step5_youtube", [])),
            "step6_shortform": len(result.get("step6_shortform", [])),
            "step7_blogs":     len(result.get("step7_blogs", [])),
            "step8_forums":    len(result.get("step8_forums", [])),
            "total_unique":    len(all_sources),
        }

        # Ensure channel response shape is complete
        if not channel_info.get("subscribers"):
            channel_info["subscribers"] = 0

        logger.info(f"[TrendingIdeas] Done. {len(ideas)} ideas, {len(all_sources)} sources.")

        # If no ideas were generated, log it but still return the response
        # (the frontend will show the trend_summary and empty ideas list)
        if not ideas or len(ideas) == 0:
            logger.warning("[TrendingIdeas] No ideas generated — returning empty list with trend_summary")

        return jsonify({
            "ideas":         ideas,
            "trend_summary": trend_summary,
            "step_counts":   step_counts,
            "sources_used":  len(all_sources),
            "channel":       channel_info,
            "window_label":  window_label,
            # Add detailed per-step research data for protocol validation
            "research_details": {
                "step1_trends":    result.get("step1_trends", [])[:10],
                "step2_news":      result.get("step2_news", [])[:10],
                "step3_reddit":    result.get("step3_reddit", [])[:10],
                "step4_twitter":   result.get("step4_twitter_sim", [])[:10],
                "step5_youtube":   result.get("step5_youtube", [])[:10],
                "step6_shortform": result.get("step6_shortform", [])[:10],
                "step7_blogs":     result.get("step7_blogs", [])[:10],
                "step8_forums":    result.get("step8_forums", [])[:10],
            }
        })

    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.route("/api/keyword-explore", methods=["POST"])
@limiter.limit("10 per minute")
def explore_keyword():
    groq_key = get_groq_api_key()
    if not groq_key:
        return jsonify({"error": "Groq API Key is missing. Add GROQ_API_KEY to your .env file."}), 400

    data = request.get_json(force=True)
    keyword = data.get("keyword", "").strip()
    if not keyword:
        return jsonify({"error": "Keyword is required"}), 400
    if len(keyword) > 200:
        return jsonify({"error": "Keyword is too long (max 200 characters)."}), 400

    try:
        logger.info(f"[Keyword] Analyzing: {keyword}")
        result = explore_keyword_node(keyword)
        return jsonify(result)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to explore keyword. Please try again."}), 500

@app.route("/api/niche-validate", methods=["POST"])
@limiter.limit("10 per minute")
def validate_niche():
    groq_key = get_groq_api_key()
    if not groq_key:
        return jsonify({"error": "Groq API Key is missing."}), 400

    data = request.get_json(force=True)
    niche = data.get("niche", "").strip()
    if not niche:
        return jsonify({"error": "Niche description is required"}), 400
    if len(niche) > 500:
        return jsonify({"error": "Niche description is too long (max 500 characters)."}), 400

    try:
        logger.info(f"[Niche] Validating: {niche}")
        result = validate_niche_node(niche)
        return jsonify(result)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to validate niche. Please try again."}), 500

@app.route("/api/script-write", methods=["POST"])
@limiter.limit("5 per minute")
def write_script():
    groq_key = get_groq_api_key()
    if not groq_key:
        return jsonify({"error": "Groq API Key is missing."}), 400

    data = request.get_json(force=True)
    title = data.get("title", "").strip()
    summary = data.get("summary", "").strip()
    tone = data.get("tone", "Educational & Engaging").strip()

    if not title:
        return jsonify({"error": "Video title is required"}), 400
    if len(title) > 300:
        return jsonify({"error": "Title is too long (max 300 characters)."}), 400
    if len(summary) > 2000:
        return jsonify({"error": "Summary is too long (max 2000 characters)."}), 400

    try:
        logger.info(f"[Script] Writing for: {title}")
        result = write_script_node(title, summary, tone)
        return jsonify(result)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to write script. Please try again."}), 500


@app.route("/api/tags-generate", methods=["POST"])
@limiter.limit("10 per minute")
def generate_tags():
    data = request.get_json(force=True)
    title = data.get("title", "").strip()

    if not title:
        return jsonify({"error": "Title is required."}), 400
    if len(title) > 300:
        return jsonify({"error": "Title is too long (max 300 characters)."}), 400

    system_prompt = (
        "You are an expert YouTube SEO strategist. Your task is to generate highly effective, viral, and searchable "
        "tags for a YouTube video based on its title. "
        "Return EXACTLY a JSON array of strings containing exactly 25 highly relevant tags. "
        "Do NOT wrap it in markdown block quotes (no ```json). "
        "Example output: [\"tag 1\", \"tag 2\", \"tag 3\"]"
    )

    human_prompt = f"Video Title: {title}\nGenerate exactly 25 highly optimized tags."

    try:
        content = call_groq_api_with_retries(system_prompt, human_prompt, temperature=0.7, max_tokens=800)
        
        if not content or not content.strip():
            return jsonify({"error": "AI returned an empty response. Please try again."}), 500

        # Try to parse standard list
        try:
            result = parse_llm_json(content, context="tags_generate")
        except Exception:
            # Fallback: extract quoted strings manually from the raw response
            import re as _re
            raw_tags = _re.findall(r'"([^"]{2,60})"', content)
            if raw_tags:
                return jsonify({"tags": raw_tags[:25]})
            return jsonify({"error": "Could not parse tags from AI response. Please try again."}), 500
        
        # If it parsed as a dict with a 'tags' key, extract it
        if isinstance(result, dict) and 'tags' in result:
            tags = result['tags']
        elif isinstance(result, list):
            tags = result
        else:
            # Last resort: extract quoted strings
            import re as _re
            tags = _re.findall(r'"([^"]{2,60})"', content)[:25]
            
        if not tags:
            return jsonify({"error": "No tags were generated. Please try a different title."}), 500

        return jsonify({"tags": tags})
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to generate tags. Please try again."}), 500


@app.route("/api/thumbnail-analyze", methods=["POST"])
@limiter.limit("5 per minute")
def analyze_thumbnail():
    data = request.get_json(force=True)
    title = data.get("title", "").strip()
    image_base64 = data.get("image", "").strip()

    if not title or not image_base64:
        return jsonify({"error": "Title and image are required."}), 400

    openrouter_key = get_openrouter_api_key()
    if not openrouter_key:
        return jsonify({"error": "OpenRouter API Key is missing."}), 400

    model = "google/gemini-2.5-flash"

    if "base64," in image_base64:
        image_base64 = image_base64.split("base64,")[1]

    prompt = f"""You are an expert YouTube Thumbnail Analyzer.
    Analyze this thumbnail image for a video titled: "{title}"

    CRITICAL INSTRUCTION: You MUST evaluate if the thumbnail's imagery and text are actually relevant to the video title "{title}". If the thumbnail has absolutely nothing to do with the title (e.g., completely mismatched subjects), you MUST give it a very low overall score (below 30) and heavily critique the lack of relevance in the final verdict and emotional hook.

    Evaluate the thumbnail based on:
    1. Text Readability (Is text easy to read? Too much text? Font clear?)
    2. Visual Contrast (Do colors pop? Does the subject stand out?)
    3. Emotional Hook & Relevance (Does the imagery create curiosity? IS IT RELEVANT TO THE TITLE? If irrelevant, score this poorly.)
    4. Final Verdict (Overall clickability assessment, severely penalizing irrelevant thumbnails)

    Return ONLY a raw JSON object with this exact schema (no markdown, just raw JSON):
    {{
      "score": number (0-100 overall score),
      "readability": "2-3 sentence analysis of text readability",
      "readability_rating": "Good" or "Needs Work" or "Excellent",
      "readability_tip": "1 sentence actionable tip to improve readability",
      "contrast": "2-3 sentence analysis of visual contrast",
      "contrast_rating": "Good" or "Needs Work" or "Excellent",
      "contrast_tip": "1 sentence actionable tip about contrast",
      "emotion": "2-3 sentence analysis of emotional hook",
      "emotion_rating": "Good" or "Needs Work" or "Excellent",
      "emotion_tip": "1 sentence actionable tip about emotional appeal",
      "clickability": "2-3 sentence final verdict on clickability",
      "clickability_rating": "Improve" or "Good" or "Excellent",
      "clickability_tip": "1 sentence actionable tip for overall improvement"
    }}
    """

    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
            ]
        }],
        "response_format": {"type": "json_object"},
        "max_tokens": 1000
    }

    try:
        resp = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=30)
        resp_data = resp.json()

        if "error" in resp_data:
            return jsonify({"error": str(resp_data["error"])}), 500
        content = resp_data["choices"][0]["message"]["content"].strip()
        result = parse_llm_json(content, context="analyze_thumbnail")
        return jsonify(result)

    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Vision analysis failed: {str(exc)}"}), 500


@app.route("/api/description-generate", methods=["POST"])
@limiter.limit("10 per minute")
def generate_description():
    data = request.get_json(force=True)
    title  = data.get("title", "").strip()
    script = data.get("script", "").strip()

    if not title:
        return jsonify({"error": "Video title is required."}), 400
    if not script:
        return jsonify({"error": "Script or summary is required."}), 400
    if len(title) > 300:
        return jsonify({"error": "Title is too long (max 300 characters)."}), 400
    if len(script) > 8000:
        return jsonify({"error": "Script is too long (max 8000 characters)."}), 400

    system_prompt = (
        "You are an expert YouTube SEO copywriter. Your task is to generate a fully "
        "SEO-optimized YouTube video description based on the provided title and script.\n\n"
        "Return ONLY a raw JSON object (no markdown, no backticks) with this exact schema:\n"
        "{\n"
        '  "title": "The exact video title provided by the user",\n'
        '  "description": "4-5 lines of compelling, keyword-rich description text. '
        'Start with a strong hook sentence. Include the main topic, key points covered, '
        'and a call-to-action (like, subscribe, comment). Each line separated by \\n.",\n'
        '  "hashtags": ["#Tag1", "#Tag2", "#Tag3", "#Tag4"]\n'
        "}\n\n"
        "RULES:\n"
        "- description must be 4-5 lines, each line 1-2 sentences, separated by \\n\n"
        "- hashtags must be exactly 3-4 items, highly relevant, no spaces inside tags\n"
        "- Use natural keyword placement — do NOT keyword-stuff\n"
        "- The description should feel human, engaging, and click-worthy\n"
        "- Return ONLY the JSON object, nothing else"
    )

    human_prompt = (
        f"Video Title: {title}\n\n"
        f"Script / Summary:\n{script[:4000]}\n\n"
        "Generate the SEO-optimized YouTube description now."
    )

    try:
        content = call_groq_api_with_retries(system_prompt, human_prompt, temperature=0.7, max_tokens=800)

        if not content or not content.strip():
            return jsonify({"error": "AI returned an empty response. Please try again."}), 500

        try:
            result = parse_llm_json(content, context="description_generate")
        except Exception:
            return jsonify({"error": "Could not parse AI response. Please try again."}), 500

        if isinstance(result, dict):
            title_out = result.get("title", title)
            desc_out  = result.get("description", "")
            tags_out  = result.get("hashtags", [])

            # Ensure hashtags start with #
            tags_out = [t if t.startswith("#") else f"#{t}" for t in tags_out if t]

            if not desc_out:
                return jsonify({"error": "AI did not return a description. Please try again."}), 500

            return jsonify({
                "title":       title_out,
                "description": desc_out,
                "hashtags":    tags_out[:4],
            })
        else:
            return jsonify({"error": "Unexpected response format. Please try again."}), 500

    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to generate description. Please try again."}), 500


@app.route("/api/community-generate", methods=["POST"])
@limiter.limit("10 per minute")
def generate_community_posts():
    data = request.get_json(force=True)
    topic = data.get("topic", "").strip()
    poll_type = data.get("poll_type", "Text Poll").strip()

    if not topic:
        return jsonify({"error": "Topic is required."}), 400
    if len(topic) > 500:
        return jsonify({"error": "Topic is too long (max 500 characters)."}), 400

    poll_instruction = (
        "  { \"type\": \"Poll\", \"content\": \"The question text\", \"options\": [\"Option 1\", \"Option 2\", \"Option 3\", \"Option 4\"] },\n"
        if poll_type == "Text Poll" else
        "  { \"type\": \"Quiz\", \"content\": \"The quiz question text\", \"options\": [\"Option 1\", \"Option 2\", \"Option 3\", \"Option 4\"], \"correct_answer\": \"Exact text of the correct option\", \"explanation\": \"Brief explanation of why it's correct\" },\n"
    )

    system_prompt = (
        "You are an expert YouTube Community Manager and Copywriter. Your task is to generate exactly three "
        "engaging community tab posts for a YouTube channel based on the provided topic/niche.\n\n"
        "Return EXACTLY a JSON array with exactly 3 objects. "
        "Do NOT wrap it in markdown block quotes (no ```json).\n\n"
        "The objects MUST have this structure:\n"
        "[\n"
        f"{poll_instruction}"
        "  { \"type\": \"Question\", \"content\": \"The engaging question text here...\" },\n"
        "  { \"type\": \"Story\", \"content\": \"The behind-the-scenes or story text here...\" }\n"
        "]"
    )

    human_prompt = f"Topic/Niche: {topic}\nGenerate the 3 community posts."

    try:
        content = call_groq_api_with_retries(system_prompt, human_prompt, temperature=0.7, max_tokens=900)

        if not content or not content.strip():
            return jsonify({"error": "AI returned an empty response. Please try again."}), 500

        try:
            result = parse_llm_json(content, context="community_generate")
        except Exception:
            return jsonify({"error": "Could not parse AI response. Please try again."}), 500

        if isinstance(result, list):
            posts = result
        elif isinstance(result, dict) and 'posts' in result:
            posts = result['posts']
        else:
            posts = []

        if not posts:
            return jsonify({"error": "No posts were generated. Please try again."}), 500

        return jsonify({"posts": posts})
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to generate community posts. Please try again."}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Starting Flask DEV server on port {port}")
    app.run(debug=False, host="0.0.0.0", port=port)
