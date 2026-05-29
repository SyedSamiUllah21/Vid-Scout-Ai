import requests
import json
import sys

BASE_URL = "http://127.0.0.1:5000"

def test_endpoint(name, path, payload):
    print(f"\n--- Testing {name} ({path}) ---")
    try:
        url = f"{BASE_URL}{path}"
        print(f"Sending POST to {url} with payload: {json.dumps(payload)}")
        resp = requests.post(url, json=payload, timeout=90)
        print(f"Status Code: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print("Response Keys:", list(data.keys()))
            print("Response Sample (first 250 chars):", json.dumps(data)[:250] + "...")
            return True
        else:
            print("Error Response:", resp.text)
            return False
    except Exception as e:
        print(f"Exception while calling {name}: {e}")
        return False

def main():
    print("Starting YouTube Research Suite programmatic validation...")
    
    # 1. Test Keyword Explorer
    kw_ok = test_endpoint("Keyword Explorer", "/api/keyword-explore", {"keyword": "sleep neuroscience"})
    
    # 2. Test Niche Validator
    niche_ok = test_endpoint("Niche Validator", "/api/niche-validate", {"niche": "sleep biology explainers"})
    
    # 3. Test AI Script Writer
    script_ok = test_endpoint("AI Script Writer", "/api/script-write", {
        "title": "Science of REM Sleep",
        "summary": "Why dreams are essential for emotional processing and learning.",
        "tone": "Educational & Engaging"
    })
    
    # 4. Test Thumbnail vision analysis (OpenRouter)
    # We can use a small dummy base64 JPEG image (red square) for vision testing
    dummy_b64 = (
        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////"
        "/////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBAB"
        "AAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
    )
    thumb_ok = test_endpoint("Thumbnail vision analyzer", "/api/thumbnail-analyze", {
        "title": "Science of REM Sleep",
        "image": dummy_b64
    })
    
    # 5. Test Channel analysis (scraping + ideas generation)
    # SmarterWhileYouSleep is a channel the user might have tested
    channel_ok = test_endpoint("Channel Analysis", "/analyze", {
        "channel_url": "https://www.youtube.com/@SmarterWhileYouSleep",
        "timeframe": "7d"
    })
    
    print("\n==================================")
    print("Summary of Endpoints Verification:")
    print(f"Keyword Explorer:  {'SUCCESS' if kw_ok else 'FAILED'}")
    print(f"Niche Validator:   {'SUCCESS' if niche_ok else 'FAILED'}")
    print(f"AI Script Writer:  {'SUCCESS' if script_ok else 'FAILED'}")
    print(f"Thumbnail vision:  {'SUCCESS' if thumb_ok else 'FAILED'}")
    print(f"Channel Analysis:  {'SUCCESS' if channel_ok else 'FAILED'}")
    print("==================================")
    
    if all([kw_ok, niche_ok, script_ok, thumb_ok, channel_ok]):
        print("ALL ENDPOINTS ARE STABLE!")
        sys.exit(0)
    else:
        print("SOME ENDPOINTS ENCOUNTERED ERRORS.")
        sys.exit(1)

if __name__ == "__main__":
    main()
