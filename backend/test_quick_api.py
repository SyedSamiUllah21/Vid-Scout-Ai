import requests, json

# Quick 30s probe — just to see if the endpoint starts and what it returns
try:
    r = requests.post(
        'http://127.0.0.1:5000/api/trending-ideas',
        json={'channel_url': 'https://www.youtube.com/@MrBeast', 'timeframe': '7d'},
        timeout=30
    )
    d = r.json()
    print('STATUS:', r.status_code)
    print('ERROR:', d.get('error'))
    print('IDEAS:', len(d.get('ideas', [])))
    print('SOURCES:', d.get('sources_used'))
    print('STEP_COUNTS:', json.dumps(d.get('step_counts', {}), indent=2))
    if d.get('ideas'):
        print('\nFIRST IDEA KEYS:', list(d['ideas'][0].keys()))
except requests.exceptions.Timeout:
    print('TIMEOUT after 30s — backend is still running (expected for full research)')
except Exception as e:
    print('ERROR:', e)
