import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def test_endpoint(name, path, payload):
    print(f"Testing {name}...")
    try:
        resp = requests.post(f"{BASE_URL}{path}", json=payload, timeout=30)
        print(f"Status Code: {resp.status_code}")
        print("Response:", resp.json())
    except Exception as e:
        print(f"Exception: {e}")

print("--- Quick Niche Validate Test ---")
test_endpoint("Niche Validator", "/api/niche-validate", {"niche": "sleep biology explainers"})

print("\n--- Quick AI Script Writer Test ---")
test_endpoint("AI Script Writer", "/api/script-write", {
    "title": "Science of REM Sleep",
    "summary": "Why dreams are essential",
    "tone": "Educational & Engaging"
})
