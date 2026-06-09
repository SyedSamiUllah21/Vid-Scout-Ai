import re

with open("backend/app.py", "r", encoding="utf-8") as f:
    content = f.read()

# Fix channel_insights
target = """def channel_insights():
    yt_key = get_youtube_api_key()
    if not yt_key:
        return jsonify({"error": "YouTube API Key missing."}), 400

    data = request.get_json(force=True)
    channel_id = data.get("channel_id", "").strip()
    if not channel_id:
        return jsonify({"error": "channel_id is required."}), 400
    if not channel_id.startswith("UC") or len(channel_id) < 20:
        return jsonify({"error": "Invalid channel_id format. Expected a YouTube channel ID starting with 'UC'."}), 400

    try:"""

replacement = """def channel_insights():
    yt_keys = get_youtube_api_keys()
    if not yt_keys:
        return jsonify({"error": "YouTube API Key missing."}), 400

    data = request.get_json(force=True)
    channel_id = data.get("channel_id", "").strip()
    if not channel_id:
        return jsonify({"error": "channel_id is required."}), 400
    if not channel_id.startswith("UC") or len(channel_id) < 20:
        return jsonify({"error": "Invalid channel_id format. Expected a YouTube channel ID starting with 'UC'."}), 400

    last_err = None
    for key_idx, yt_key in enumerate(yt_keys, 1):
        try:"""

content = content.replace(target, replacement)

# Now we need to handle the except block of channel_insights
# We'll replace the except block
target_except = """        })

    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500"""

replacement_except = """        })

        except Exception as exc:
            err_str = str(exc).lower()
            is_quota = any(k in err_str for k in ["quota", "rate", "limit", "403", "exceeded"])
            if is_quota and key_idx < len(yt_keys):
                logger.info(f"YouTube key {key_idx} quota/rate limited. Trying next...")
                last_err = exc
                continue
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(exc)}), 500
            
    return jsonify({"error": str(last_err)}), 500"""

content = content.replace(target_except, replacement_except)

# Let's fix the indentation of the try block content
# Find the part between replacement and replacement_except and indent it
start_idx = content.find(replacement) + len(replacement)
end_idx = content.find(replacement_except)
if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
    inner_block = content[start_idx:end_idx]
    # indent by 4 spaces
    indented_block = "\n".join("    " + line if line else line for line in inner_block.split("\n"))
    content = content[:start_idx] + indented_block + content[end_idx:]

with open("backend/app.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched app.py")
