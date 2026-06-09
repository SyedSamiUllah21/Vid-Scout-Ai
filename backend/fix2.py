import re

with open("backend/app.py", "r", encoding="utf-8") as f:
    content = f.read()

target = """def views_trend():
    \"\"\"Fetch real video data from YouTube API and return daily view aggregates.\"\"\"
    yt_key = get_youtube_api_key()
    if not yt_key:
        return jsonify({"error": "YouTube API Key missing."}), 400

    data = request.get_json(force=True)
    channel_id = data.get("channel_id", "").strip()
    if not channel_id:
        return jsonify({"error": "channel_id is required."}), 400

    try:"""

replacement = """def views_trend():
    \"\"\"Fetch real video data from YouTube API and return daily view aggregates.\"\"\"
    yt_keys = get_youtube_api_keys()
    if not yt_keys:
        return jsonify({"error": "YouTube API Key missing."}), 400

    data = request.get_json(force=True)
    channel_id = data.get("channel_id", "").strip()
    if not channel_id:
        return jsonify({"error": "channel_id is required."}), 400

    last_err = None
    for key_idx, yt_key in enumerate(yt_keys, 1):
        try:"""

content = content.replace(target, replacement)

target_except = """        return jsonify({
            "trend_data": trend_data,
            "total_channel_views": channel_total_views
        })

    except Exception as e:
        logger.error(f"[Views Trend] Error: {e}")
        return jsonify({"error": str(e)}), 500"""

replacement_except = """        return jsonify({
            "trend_data": trend_data,
            "total_channel_views": channel_total_views
        })

        except Exception as e:
            err_str = str(e).lower()
            if any(k in err_str for k in ["quota", "rate", "limit", "403", "exceeded"]) and key_idx < len(yt_keys):
                logger.info(f"[Views Trend] Key {key_idx} quota/rate limited. Trying next...")
                last_err = e
                continue
            logger.error(f"[Views Trend] Error: {e}")
            return jsonify({"error": str(e)}), 500
            
    return jsonify({"error": str(last_err)}), 500"""

content = content.replace(target_except, replacement_except)

start_idx = content.find(replacement) + len(replacement)
end_idx = content.find(replacement_except)
if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
    inner_block = content[start_idx:end_idx]
    indented_block = "\n".join("    " + line if line else line for line in inner_block.split("\n"))
    content = content[:start_idx] + indented_block + content[end_idx:]

with open("backend/app.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched app.py views_trend")
