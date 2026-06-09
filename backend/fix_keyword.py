with open("backend/app.py", "r", encoding="utf-8") as f:
    content = f.read()

target = """    # 2. Fetch Real Search Stats using YouTube API
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
            logger.error(f"[KeywordExplore] YouTube API failed: {e}")"""

replacement = """    # 2. Fetch Real Search Stats using YouTube API
    yt_keys = get_youtube_api_keys()
    total_results = "Unknown"
    avg_views = "Unknown"
    
    if yt_keys:
        for key_idx, yt_key in enumerate(yt_keys, 1):
            try:
                from googleapiclient.discovery import build
                youtube = build("youtube", "v3", developerKey=yt_key)
                search_req = youtube.search().list(q=keyword, part="snippet", type="video", maxResults=5)
                search_res = search_req.execute(num_retries=0)
                
                total_results = search_res.get("pageInfo", {}).get("totalResults", "Unknown")
                
                video_ids = [item["id"]["videoId"] for item in search_res.get("items", []) if "id" in item and "videoId" in item["id"]]
                if video_ids:
                    stats_req = youtube.videos().list(id=",".join(video_ids), part="statistics")
                    stats_res = stats_req.execute(num_retries=0)
                    views = [int(item["statistics"]["viewCount"]) for item in stats_res.get("items", []) if "viewCount" in item.get("statistics", {})]
                    if views:
                        avg_views = int(sum(views) / len(views))
                break # Success
            except Exception as e:
                err_str = str(e).lower()
                if any(k in err_str for k in ["quota", "rate", "limit", "403", "exceeded"]) and key_idx < len(yt_keys):
                    logger.info(f"[KeywordExplore] Key {key_idx} quota/rate limited. Trying next...")
                    continue
                logger.error(f"[KeywordExplore] YouTube API failed: {e}")
                break"""

if target in content:
    content = content.replace(target, replacement)
    print("Patched explore_keyword_node")
else:
    print("Could not find target")

with open("backend/app.py", "w", encoding="utf-8") as f:
    f.write(content)
