"""
TikTok Trending Content Scraper
Uses TikTokApi to fetch REAL trending videos from TikTok
"""
import os
import asyncio
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta

logger = logging.getLogger("tiktok-scraper")

# Try to import TikTokApi - it might not be installed yet
try:
    from TikTokApi import TikTokApi
    TIKTOK_API_AVAILABLE = True
except ImportError:
    TIKTOK_API_AVAILABLE = False
    logger.warning("[TikTok] TikTokApi not installed. Install with: pip install TikTokApi playwright")


# SECURITY: Use an ms_token from environment variables to avoid blocks
MS_TOKEN = os.getenv("MS_TOKEN")


async def fetch_trending_videos(count: int = 30) -> List[Dict]:
    """
    Fetches trending videos using an async context manager and persistent session.
    
    Args:
        count: Number of trending videos to fetch (default: 30)
        
    Returns:
        List of trending video data dictionaries
    """
    if not TIKTOK_API_AVAILABLE:
        logger.error("[TikTok] TikTokApi not available. Cannot fetch trending videos.")
        return []
    
    trends = []
    try:
        async with TikTokApi() as api:
            # Create a session with specific browser settings to mimic a real user
            await api.create_sessions(
                ms_tokens=[MS_TOKEN] if MS_TOKEN else None,
                num_sessions=1,
                sleep_after=3,
                headless=True
            )
            
            # Fetch trending videos
            logger.info(f"[TikTok] Fetching {count} trending videos...")
            async for video in api.trending.videos(count=count):
                try:
                    # Extract video data
                    video_data = {
                        "id": video.id,
                        "author": video.author.username if hasattr(video, 'author') else "unknown",
                        "desc": video.desc if hasattr(video, 'desc') else "",
                        "create_time": video.create_time if hasattr(video, 'create_time') else None,
                        "stats": {
                            "views": video.stats.get("playCount", 0) if hasattr(video, 'stats') else 0,
                            "likes": video.stats.get("diggCount", 0) if hasattr(video, 'stats') else 0,
                            "shares": video.stats.get("shareCount", 0) if hasattr(video, 'stats') else 0,
                            "comments": video.stats.get("commentCount", 0) if hasattr(video, 'stats') else 0,
                        },
                        "hashtags": [h.name for h in video.hashtags] if hasattr(video, 'hashtags') else [],
                        "url": f"https://www.tiktok.com/@{video.author.username}/video/{video.id}" if hasattr(video, 'author') else "",
                    }
                    trends.append(video_data)
                except Exception as e:
                    logger.error(f"[TikTok] Error parsing video: {e}")
                    continue
                    
            logger.info(f"[TikTok] Successfully fetched {len(trends)} trending videos")
            
    except Exception as e:
        logger.error(f"[TikTok] Error fetching trending videos: {e}")
        return []
    
    return trends


async def search_tiktok_by_keyword(keyword: str, count: int = 20) -> List[Dict]:
    """
    Search TikTok videos by keyword.
    
    Args:
        keyword: Search query
        count: Number of results to fetch
        
    Returns:
        List of video data dictionaries
    """
    if not TIKTOK_API_AVAILABLE:
        logger.error("[TikTok] TikTokApi not available. Cannot search videos.")
        return []
    
    results = []
    try:
        async with TikTokApi() as api:
            await api.create_sessions(
                ms_tokens=[MS_TOKEN] if MS_TOKEN else None,
                num_sessions=1,
                sleep_after=3,
                headless=True
            )
            
            logger.info(f"[TikTok] Searching for '{keyword}'...")
            async for video in api.search.videos(keyword, count=count):
                try:
                    video_data = {
                        "id": video.id,
                        "author": video.author.username if hasattr(video, 'author') else "unknown",
                        "desc": video.desc if hasattr(video, 'desc') else "",
                        "create_time": video.create_time if hasattr(video, 'create_time') else None,
                        "stats": {
                            "views": video.stats.get("playCount", 0) if hasattr(video, 'stats') else 0,
                            "likes": video.stats.get("diggCount", 0) if hasattr(video, 'stats') else 0,
                            "shares": video.stats.get("shareCount", 0) if hasattr(video, 'stats') else 0,
                            "comments": video.stats.get("commentCount", 0) if hasattr(video, 'stats') else 0,
                        },
                        "hashtags": [h.name for h in video.hashtags] if hasattr(video, 'hashtags') else [],
                        "url": f"https://www.tiktok.com/@{video.author.username}/video/{video.id}" if hasattr(video, 'author') else "",
                    }
                    results.append(video_data)
                except Exception as e:
                    logger.error(f"[TikTok] Error parsing video: {e}")
                    continue
                    
            logger.info(f"[TikTok] Found {len(results)} videos for '{keyword}'")
            
    except Exception as e:
        logger.error(f"[TikTok] Error searching for '{keyword}': {e}")
        return []
    
    return results


def fetch_trending_videos_sync(count: int = 30) -> List[Dict]:
    """
    Synchronous wrapper for fetch_trending_videos.
    Use this in Flask routes.
    """
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(fetch_trending_videos(count))
        loop.close()
        return result
    except Exception as e:
        logger.error(f"[TikTok] Sync wrapper error: {e}")
        return []


def search_tiktok_by_keyword_sync(keyword: str, count: int = 20) -> List[Dict]:
    """
    Synchronous wrapper for search_tiktok_by_keyword.
    Use this in Flask routes.
    """
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(search_tiktok_by_keyword(keyword, count))
        loop.close()
        return result
    except Exception as e:
        logger.error(f"[TikTok] Sync wrapper error: {e}")
        return []


def filter_recent_videos(videos: List[Dict], days: int = 7) -> List[Dict]:
    """
    Filter videos to only include those from the past N days.
    
    Args:
        videos: List of video data dictionaries
        days: Number of days to look back
        
    Returns:
        Filtered list of recent videos
    """
    if not videos:
        return []
    
    cutoff_time = datetime.now() - timedelta(days=days)
    cutoff_timestamp = int(cutoff_time.timestamp())
    
    recent = []
    for video in videos:
        create_time = video.get("create_time")
        if create_time and create_time >= cutoff_timestamp:
            recent.append(video)
    
    logger.info(f"[TikTok] Filtered {len(recent)}/{len(videos)} videos from past {days} days")
    return recent


def format_tiktok_results_for_research(videos: List[Dict]) -> List[Dict]:
    """
    Format TikTok video data into research source format.
    
    Returns format compatible with existing research functions:
    {
        "title": str,
        "url": str,
        "snippet": str,
        "source": str,
        "engagement": str,
        "date": str
    }
    """
    results = []
    
    for video in videos:
        # Format engagement stats
        stats = video.get("stats", {})
        views = stats.get("views", 0)
        likes = stats.get("likes", 0)
        
        # Format engagement string
        if views >= 1_000_000:
            views_str = f"{views / 1_000_000:.1f}M views"
        elif views >= 1_000:
            views_str = f"{views / 1_000:.1f}K views"
        else:
            views_str = f"{views} views"
            
        if likes >= 1_000_000:
            likes_str = f"{likes / 1_000_000:.1f}M likes"
        elif likes >= 1_000:
            likes_str = f"{likes / 1_000:.1f}K likes"
        else:
            likes_str = f"{likes} likes"
        
        engagement = f"{views_str}, {likes_str}"
        
        # Format hashtags
        hashtags = video.get("hashtags", [])
        hashtag_str = " ".join(f"#{tag}" for tag in hashtags[:5])
        
        # Create research-compatible entry
        result = {
            "title": f"TikTok: {video.get('desc', 'Viral Video')[:80]}",
            "url": video.get("url", ""),
            "snippet": f"@{video.get('author', 'unknown')}: {video.get('desc', '')} {hashtag_str}",
            "source": "TikTok (Live API)",
            "engagement": engagement,
            "date": datetime.fromtimestamp(video.get("create_time", 0)).strftime("%Y-%m-%d") if video.get("create_time") else ""
        }
        results.append(result)
    
    return results
