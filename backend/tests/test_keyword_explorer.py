import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def main():
    print("Testing Keyword Explorer New Schema...")
    try:
        resp = requests.post(f"{BASE_URL}/api/keyword-explore", json={"keyword": "sleep and life expectancy"}, timeout=45)
        print(f"Status Code: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print("Response Keys:", list(data.keys()))
            print("Metrics:")
            print("- Search Volume:", data.get("search_volume"), f"({data.get('search_volume_details')})")
            print("- Competition:", data.get("competition"), f"({data.get('competition_details')})")
            print("- Overall Score:", data.get("overall_score"), f"({data.get('overall_score_details')})")
            print("- Trending Status:", data.get("trending_status"), f"({data.get('trending_details')})")
            print("Related Keywords Sample:")
            for kw in data.get("related_keywords", [])[:3]:
                print(f"  * {kw.get('keyword')}: Vol={kw.get('search_volume')}, Comp={kw.get('competition')}, Score={kw.get('overall_score')}, Diff={kw.get('difficulty')}")
        else:
            print("Error:", resp.text)
    except Exception as e:
        print("Exception:", e)

if __name__ == "__main__":
    main()
