import requests
import json
import time

print("=" * 80)
print("FULL TEST — YT-Researcher Protocol Validation")
print("=" * 80)

# Test with a real channel
test_data = {
    "channel_url": "https://www.youtube.com/@MrBeast",
    "timeframe": "7d"
}

print(f"\n📊 Testing with: {test_data['channel_url']}")
print(f"⏱️  Timeframe: {test_data['timeframe']}")
print("\n🚀 Starting 8-step research agent...")
print("⏳ This will take ~3 minutes. Please wait...\n")

start_time = time.time()

try:
    response = requests.post(
        'http://127.0.0.1:5000/api/trending-ideas',
        json=test_data,
        timeout=300  # 5 minute timeout
    )
    
    elapsed = time.time() - start_time
    
    if response.status_code != 200:
        print(f"❌ ERROR: HTTP {response.status_code}")
        print(response.text)
        exit(1)
    
    data = response.json()
    
    print("=" * 80)
    print(f"✅ SUCCESS — Completed in {elapsed:.1f} seconds")
    print("=" * 80)
    
    # Phase 1: Channel Analysis
    print("\n📋 PHASE 1 — CHANNEL ANALYSIS")
    print("-" * 80)
    channel = data.get('channel', {})
    print(f"Channel Name: {channel.get('channel_name', 'N/A')}")
    print(f"Niche: {channel.get('niche', 'N/A')}")
    print(f"Subscribers: {channel.get('subscribers', 0):,}")
    print(f"Window Label: {data.get('window_label', 'N/A')}")
    
    # Phase 2: Research Steps
    print("\n📋 PHASE 2 — 8-STEP RESEARCH BREAKDOWN")
    print("-" * 80)
    step_counts = data.get('step_counts', {})
    research_details = data.get('research_details', {})
    
    steps = [
        ('step1_trends', 'Step 1: Google Trends'),
        ('step2_news', 'Step 2: Google + Bing News'),
        ('step3_reddit', 'Step 3: Reddit Deep Scan'),
        ('step4_twitter', 'Step 4: X/Twitter Signals'),
        ('step5_youtube', 'Step 5: YouTube Trend Scan'),
        ('step6_shortform', 'Step 6: TikTok + Reels'),
        ('step7_blogs', 'Step 7: Niche Blogs + Academic'),
        ('step8_forums', 'Step 8: Forums + Communities'),
    ]
    
    total_sources = 0
    for key, label in steps:
        count = step_counts.get(key, 0)
        total_sources += count
        sources = research_details.get(key, [])
        print(f"\n{label}: {count} sources")
        
        if sources:
            print(f"  Sample sources (showing {min(3, len(sources))}):")
            for i, src in enumerate(sources[:3]):
                title = src.get('title', 'N/A')[:60]
                source = src.get('source', 'N/A')
                date = src.get('date', 'N/A')
                url = src.get('url', 'N/A')[:50]
                print(f"    {i+1}. {title}...")
                print(f"       Source: {source} | Date: {date}")
                print(f"       URL: {url}...")
                if src.get('engagement'):
                    print(f"       Engagement: {src['engagement']}")
    
    print(f"\n📊 Total Unique Sources: {data.get('sources_used', 0)}")
    
    # Ideas
    print("\n📋 PHASE 3 — GENERATED IDEAS")
    print("-" * 80)
    ideas = data.get('ideas', [])
    print(f"Total Ideas: {len(ideas)}")
    
    if ideas:
        print("\nTop 3 Ideas:")
        for i, idea in enumerate(ideas[:3]):
            print(f"\n  #{idea.get('rank', i+1)} — {idea.get('title', 'N/A')}")
            print(f"  Viral Score: {idea.get('viral_score', 0)}/100")
            print(f"  Why Trending: {idea.get('why_trending', 'N/A')[:100]}...")
            print(f"  Format: {idea.get('best_format', 'N/A')} | Risk: {idea.get('risk_level', 'N/A')}")
            sources = idea.get('trend_sources', [])
            print(f"  Backed by {len(sources)} sources")
            if sources:
                print(f"    Sample: {sources[0].get('platform', 'N/A')} — {sources[0].get('title', 'N/A')[:50]}...")
    
    # Trend Summary
    print("\n📋 WEEK SUMMARY")
    print("-" * 80)
    summary = data.get('trend_summary', 'N/A')
    print(summary)
    
    # Protocol Validation
    print("\n" + "=" * 80)
    print("✅ PROTOCOL VALIDATION CHECKLIST")
    print("=" * 80)
    
    checks = [
        ("Channel analyzed", bool(channel.get('channel_name'))),
        ("Niche profile extracted", bool(channel.get('niche'))),
        ("Window label present", bool(data.get('window_label'))),
        ("All 8 steps executed", len(step_counts) == 8),
        ("Research details returned", bool(research_details)),
        ("Step 1 has sources", step_counts.get('step1_trends', 0) > 0),
        ("Step 2 has sources", step_counts.get('step2_news', 0) > 0),
        ("Step 3 has sources", step_counts.get('step3_reddit', 0) > 0),
        ("Step 5 has sources", step_counts.get('step5_youtube', 0) > 0),
        ("Exactly 10 ideas returned", len(ideas) == 10),
        ("Ideas have viral scores", all(idea.get('viral_score') for idea in ideas)),
        ("Ideas have trend sources", all(idea.get('trend_sources') for idea in ideas)),
        ("Ideas have SEO keywords", all(idea.get('seo_keywords') for idea in ideas)),
        ("Week summary present", bool(summary and summary != 'N/A')),
        ("Sources have dates", any(src.get('date') for step_sources in research_details.values() for src in step_sources)),
    ]
    
    passed = sum(1 for _, result in checks if result)
    total = len(checks)
    
    for check, result in checks:
        status = "✅" if result else "❌"
        print(f"{status} {check}")
    
    print("\n" + "=" * 80)
    print(f"FINAL SCORE: {passed}/{total} checks passed ({passed/total*100:.0f}%)")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL CHECKS PASSED! Your app fully implements the protocol.")
    else:
        print(f"\n⚠️  {total - passed} checks failed. Review the output above.")

except requests.exceptions.Timeout:
    print("❌ ERROR: Request timed out after 5 minutes")
    print("The backend may still be processing. Check the backend logs.")
except requests.exceptions.ConnectionError:
    print("❌ ERROR: Could not connect to backend")
    print("Make sure the backend is running at http://127.0.0.1:5000")
except Exception as e:
    print(f"❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
