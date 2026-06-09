with open("backend/app.py", "r", encoding="utf-8") as f:
    content = f.read()

target1 = """def validate_niche_node(niche: str) -> dict:
    \"\"\"Evaluate a niche for YouTube viability.\"\"\"
    from googleapiclient.discovery import build
    
    # 1. Fetch real YouTube Data
    yt_stats_block = ""
    yt_key = get_youtube_api_key()
    if yt_key:
        try:
            youtube = build("youtube", "v3", developerKey=yt_key)
            # Search for top videos in this niche
            search_resp = youtube.search().list(
                part="id,snippet",
                q=niche,
                type="video",
                order="relevance",
                maxResults=10
            ).execute()
            
            video_ids = [item["id"]["videoId"] for item in search_resp.get("items", []) if "videoId" in item["id"]]
            
            if video_ids:
                videos_resp = youtube.videos().list(
                    part="statistics,snippet",
                    id=",".join(video_ids)
                ).execute()
                
                total_views = 0
                total_likes = 0
                videos_counted = 0
                
                recent_videos = []
                
                for v in videos_resp.get("items", []):
                    stats = v.get("statistics", {})
                    snip = v.get("snippet", {})
                    views = int(stats.get("viewCount", 0))
                    likes = int(stats.get("likeCount", 0))
                    
                    total_views += views
                    total_likes += likes
                    videos_counted += 1
                    
                    recent_videos.append(f"- {snip.get('title', '')} ({views:,} views)")
                
                if videos_counted > 0:
                    avg_views = total_views // videos_counted
                    avg_likes = total_likes // videos_counted
                    
                    yt_stats_block = (
                        f"REAL YOUTUBE DATA FOR '{niche}':\\n"
                        f"- Average Views (Top 10): {avg_views:,}\\n"
                        f"- Average Likes (Top 10): {avg_likes:,}\\n"
                        f"- Top Recent Videos:\\n" + "\\n".join(recent_videos[:5])
                    )
        except Exception as e:
            logger.error(f"[validate_niche_node] YouTube API failed: {e}")
            pass"""

replacement1 = """def validate_niche_node(niche: str) -> dict:
    \"\"\"Evaluate a niche for YouTube viability.\"\"\"
    from googleapiclient.discovery import build
    
    # 1. Fetch real YouTube Data
    yt_stats_block = ""
    yt_keys = get_youtube_api_keys()
    if yt_keys:
        for key_idx, yt_key in enumerate(yt_keys, 1):
            try:
                youtube = build("youtube", "v3", developerKey=yt_key)
                # Search for top videos in this niche
                search_resp = youtube.search().list(
                    part="id,snippet",
                    q=niche,
                    type="video",
                    order="relevance",
                    maxResults=10
                ).execute()
                
                video_ids = [item["id"]["videoId"] for item in search_resp.get("items", []) if "videoId" in item["id"]]
                
                if video_ids:
                    videos_resp = youtube.videos().list(
                        part="statistics,snippet",
                        id=",".join(video_ids)
                    ).execute()
                    
                    total_views = 0
                    total_likes = 0
                    videos_counted = 0
                    
                    recent_videos = []
                    
                    for v in videos_resp.get("items", []):
                        stats = v.get("statistics", {})
                        snip = v.get("snippet", {})
                        views = int(stats.get("viewCount", 0))
                        likes = int(stats.get("likeCount", 0))
                        
                        total_views += views
                        total_likes += likes
                        videos_counted += 1
                        
                        recent_videos.append(f"- {snip.get('title', '')} ({views:,} views)")
                    
                    if videos_counted > 0:
                        avg_views = total_views // videos_counted
                        avg_likes = total_likes // videos_counted
                        
                        yt_stats_block = (
                            f"REAL YOUTUBE DATA FOR '{niche}':\\n"
                            f"- Average Views (Top 10): {avg_views:,}\\n"
                            f"- Average Likes (Top 10): {avg_likes:,}\\n"
                            f"- Top Recent Videos:\\n" + "\\n".join(recent_videos[:5])
                        )
                break # Success
            except Exception as e:
                err_str = str(e).lower()
                if any(k in err_str for k in ["quota", "rate", "limit", "403", "exceeded"]) and key_idx < len(yt_keys):
                    logger.info(f"[validate_niche_node] Key {key_idx} quota/rate limited. Trying next...")
                    continue
                logger.error(f"[validate_niche_node] YouTube API failed: {e}")
                break"""

if target1 in content:
    content = content.replace(target1, replacement1)
    print("Patched validate_niche_node")
else:
    print("Could not find target1")

target2 = """    # 2. Fetch Real Search Stats using YouTube API
    yt_key = get_youtube_api_key()
    total_results = "Unknown"
    avg_views = "Unknown"
    
    if yt_key:
        try:
            from googleapiclient.discovery import build
            youtube = build("youtube", "v3", developerKey=yt_key)
            search_req = youtube.search().list(q=keyword, part="snippet", type="video", maxResults=5)
            search_res = search_req.execute()
            
            total_results = search_res.get("pageInfo", {}).get("totalResults", "Unknown")
            
            video_ids = [item["id"]["videoId"] for item in search_res.get("items", []) if "id" in item and "videoId" in item["id"]]
            if video_ids:
                stats_req = youtube.videos().list(id=",".join(video_ids), part="statistics")
                stats_res = stats_req.execute()
                views = [int(item["statistics"]["viewCount"]) for item in stats_res.get("items", []) if "viewCount" in item.get("statistics", {})]
                if views:
                    avg_views = int(sum(views) / len(views))
        except Exception as e:
            logger.error(f"[KeywordExplore] Real stats fetch failed: {e}")"""

replacement2 = """    # 2. Fetch Real Search Stats using YouTube API
    yt_keys = get_youtube_api_keys()
    total_results = "Unknown"
    avg_views = "Unknown"
    
    if yt_keys:
        for key_idx, yt_key in enumerate(yt_keys, 1):
            try:
                from googleapiclient.discovery import build
                youtube = build("youtube", "v3", developerKey=yt_key)
                search_req = youtube.search().list(q=keyword, part="snippet", type="video", maxResults=5)
                search_res = search_req.execute()
                
                total_results = search_res.get("pageInfo", {}).get("totalResults", "Unknown")
                
                video_ids = [item["id"]["videoId"] for item in search_res.get("items", []) if "id" in item and "videoId" in item["id"]]
                if video_ids:
                    stats_req = youtube.videos().list(id=",".join(video_ids), part="statistics")
                    stats_res = stats_req.execute()
                    views = [int(item["statistics"]["viewCount"]) for item in stats_res.get("items", []) if "viewCount" in item.get("statistics", {})]
                    if views:
                        avg_views = int(sum(views) / len(views))
                break
            except Exception as e:
                err_str = str(e).lower()
                if any(k in err_str for k in ["quota", "rate", "limit", "403", "exceeded"]) and key_idx < len(yt_keys):
                    logger.info(f"[KeywordExplore] Key {key_idx} quota/rate limited. Trying next...")
                    continue
                logger.error(f"[KeywordExplore] Real stats fetch failed: {e}")
                break"""

if target2 in content:
    content = content.replace(target2, replacement2)
    print("Patched research_youtube_videos")
else:
    print("Could not find target2")

with open("backend/app.py", "w", encoding="utf-8") as f:
    f.write(content)
