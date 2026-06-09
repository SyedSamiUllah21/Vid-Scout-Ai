with open("backend/app.py", "r", encoding="utf-8") as f:
    content = f.read()

target = """app = Flask(__name__)"""
replacement = """app = Flask(__name__)

@app.route("/")
def health_check():
    return jsonify({"status": "ok", "message": "Vid Scout AI Backend is running!"}), 200
"""

if target in content:
    content = content.replace(target, replacement)
    print("Added health check route")
else:
    print("Could not find target")

with open("backend/app.py", "w", encoding="utf-8") as f:
    f.write(content)
