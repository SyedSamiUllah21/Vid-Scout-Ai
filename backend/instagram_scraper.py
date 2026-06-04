"""
Instagram Trending Content Scraper
Uses Instaloader to fetch REAL trending posts from Instagram
"""
import os
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta

logger = logging.getLogger("instagram-scraper")

# Try to import Instaloader - it might not be installed yet
try:
    import instaloader
    INSTALOADER_AVAILABLE = True
except ImportError:
    INSTALOADER_AVAILABLE = False
    logger.warning("[Instagram] Instaloader not installed. Install with: pip install instaloader")


# Initialize Instaloader (singleton pattern)
_instaloader_instance = None

def get_instaloader():
    """Get or create Instaloader instance."""
    global _instaloader_instance
    
    if not INSTALOADER_AVAILABLE:
        return None
    
    if _instaloader_instance is None:
        _instaloader_instance = instaloader.Instaloader()
        
        # Optional: Log in if credentials are provided
        username = os.getenv("INSTAGRAM_USERNAME")
        password = os.getenv("INSTAGRAM_PASSWORD")
        
        if username and password:
            try:
                _instaloader_instance.login(username, password)
                logger.info("[Instagram] Logged in successfully")
            except Exception as e:
                logger.warning(f"[Instagram] Login failed: {e}. Using guest mode (may have rate limits)")
        else:
            logger.info("[Instagram] Using guest mode (no credentials provided)")
    
    return _instaloader_instance


def fetch_trending_hashtag_posts(hashtag: str, max_results: int = 15, days: int = 7) -> List[Dict]:
    """
    Fetches the top, highly-engaged recent posts for a specific hashtag.
    
    Args:
        hashtag: Hashtag to search (without #)
        max_results: Maximum number of posts to fetch (default: 15)
        days: Number of days to look back (default: 7)
        
    Returns:
        List of trending post data dictionaries
    """
    if not INSTALOADER_AVAILABLE:
        logger.error("[Instagram] Instaloader not available. Cannot fetch trending posts.")
        return []
    
    L = get_instaloader()
    if not L:
        return []
    
    trending_posts = []
    
    try:
        # Load the hashtag object from Instagram
        logger.info(f"[Instagram] Fetching trending posts for #{hashtag}...")
        tag = instaloader.Hashtag.from_name(L.context, hashtag)
        
        # Calculate timeframe (Past N Days)
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Get top/popular posts under this tag
        post_count = 0
        for post in tag.get_top_posts():
            # Filter for recent posts to ensure it's a current trend
            if post.date > cutoff_date:
                post_data = {
                    "post_id": post.shortcode,
                    "owner": post.owner_username,
                    "likes": post.likes,
                    "comments": post.comments,
                    "caption": post.caption if post.caption else "",
                    "is_video": post.is_video,
                    "date": post.date.strftime("%Y-%m-%d"),
                    "timestamp": int(post.date.timestamp()),
                    "url": f"https://instagram.com/p/{post.shortcode}",
                    "hashtags": post.caption_hashtags if hasattr(post, 'caption_hashtags') else [],
                }
                trending_posts.append(post_data)
                post_count += 1
                
                # Limit to prevent rate limiting
                if post_count >= max_results:
                    break
        
        logger.info(f"[Instagram] Found {len(trending_posts)} trending posts for #{hashtag}")
        
    except Exception as e:
        logger.error(f"[Instagram] Error fetching hashtag #{hashtag}: {e}")
        return []
    
    return trending_posts


def search_instagram_by_keywords(keywords: List[str], max_results: int = 20, days: int = 7) -> List[Dict]:
    """
    Search Instagram by multiple keywords/hashtags and combine results.
    
    Args:
        keywords: List of hashtags to search (without #)
        max_results: Total maximum results across all keywords
        days: Number of days to look back
        
    Returns:
        Combined list of trending posts
    """
    all_posts = []
    results_per_keyword = max(5, max_results // len(keywords))
    
    for keyword in keywords[:5]:  # Limit to 5 keywords to avoid rate limits
        posts = fetch_trending_hashtag_posts(keyword, results_per_keyword, days)
        all_posts.extend(posts)
    
    # Deduplicate by post_id
    seen = set()
    unique_posts = []
    for post in all_posts:
        if post["post_id"] not in seen:
            seen.add(post["post_id"])
            unique_posts.append(post)
    
    # Sort by engagement (likes + comments)
    unique_posts.sort(key=lambda p: p["likes"] + p["comments"], reverse=True)
    
    return unique_posts[:max_results]


def format_instagram_results_for_research(posts: List[Dict]) -> List[Dict]:
    """
    Format Instagram post data into research source format.
    
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
    
    for post in posts:
        # Format engagement stats
        likes = post.get("likes", 0)
        comments = post.get("comments", 0)
        
        # Format engagement string
        if likes >= 1_000_000:
            likes_str = f"{likes / 1_000_000:.1f}M likes"
        elif likes >= 1_000:
            likes_str = f"{likes / 1_000:.1f}K likes"
        else:
            likes_str = f"{likes} likes"
            
        if comments >= 1_000:
            comments_str = f"{comments / 1_000:.1f}K comments"
        else:
            comments_str = f"{comments} comments"
        
        engagement = f"{likes_str}, {comments_str}"
        
        # Format hashtags
        hashtags = post.get("hashtags", [])
        hashtag_str = " ".join(f"#{tag}" for tag in hashtags[:5])
        
        # Truncate caption
        caption = post.get("caption", "")
        if len(caption) > 100:
            caption = caption[:97] + "..."
        
        # Format type
        content_type = "Reel" if post.get("is_video") else "Post"
        
        # Create research-compatible entry
        result = {
            "title": f"Instagram {content_type}: {caption}",
            "url": post.get("url", ""),
            "snippet": f"@{post.get('owner', 'unknown')}: {caption} {hashtag_str}",
            "source": "Instagram (Live API)",
            "engagement": engagement,
            "date": post.get("date", "")
        }
        results.append(result)
    
    return results


def extract_hashtags_from_query(query: str) -> List[str]:
    """
    Extract potential Instagram hashtags from a query.
    
    Examples:
        "life coaching" -> ["lifecoaching", "coaching", "life"]
        "dark psychology" -> ["darkpsychology", "psychology", "dark"]
    """
    # Remove special characters and split
    words = query.lower().replace("-", "").replace("_", "").split()
    
    hashtags = []
    
    # 1. Combined hashtag (no spaces)
    combined = "".join(words)
    if len(combined) <= 30:  # Instagram hashtag limit
        hashtags.append(combined)
    
    # 2. Individual words
    for word in words:
        if len(word) >= 3:  # Skip very short words
            hashtags.append(word)
    
    # 3. Two-word combinations
    if len(words) >= 2:
        for i in range(len(words) - 1):
            combo = words[i] + words[i + 1]
            if len(combo) <= 30:
                hashtags.append(combo)
    
    return hashtags[:5]  # Limit to 5 hashtags


# Synchronous wrappers for Flask
def fetch_trending_hashtag_posts_sync(hashtag: str, max_results: int = 15, days: int = 7) -> List[Dict]:
    """Synchronous wrapper for Flask routes."""
    return fetch_trending_hashtag_posts(hashtag, max_results, days)


def search_instagram_by_keywords_sync(keywords: List[str], max_results: int = 20, days: int = 7) -> List[Dict]:
    """Synchronous wrapper for Flask routes."""
    return search_instagram_by_keywords(keywords, max_results, days)
