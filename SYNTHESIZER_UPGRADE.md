# Synthesizer Prompt Upgrade

## Changes Made

### Enhanced System Prompt
The synthesizer prompt has been upgraded to leverage deep research from all 8 diverse sources:

1. **Google Trends** - Real-time search interest patterns
2. **Google News & Bing News** - Recent articles and events
3. **Reddit** - Community discussions and viral topics
4. **Twitter/LinkedIn** - Social media trends and professional insights
5. **YouTube** - Video content trends and channel styles
6. **TikTok/Instagram** - Short-form viral content patterns
7. **Blogs/Academic** - Industry insights and research papers
8. **Forums/Communities** - Hacker News and niche discussions

### Key Improvements

#### 1. **Cross-Platform Trend Analysis**
- Now prioritizes topics trending across MULTIPLE platforms (e.g., Reddit + News)
- Identifies cross-platform viral patterns for maximum impact

#### 2. **Specific Research Citations**
- Every idea must cite specific research evidence:
  - "Reddit post with 12K upvotes"
  - "New NYT article published this week"
  - "Viral TikTok with 2M views"
- Real URLs from actual research data

#### 3. **Better Title Generation**
- Enhanced examples: "The Shocking Truth About Mind Control in 2026"
- Clear rejection of keyword stuffing: NOT "mind control psychology"
- 40-70 character YouTube-optimized titles

#### 4. **Research Depth Requirements**
- `why_trending` field MUST include specific recent events/studies
- Ideas ranked by research breadth (how many platforms cite it)
- Prioritizes recency of research findings

#### 5. **Quality Scoring**
- Viral score based on:
  - Number of platforms discussing the topic
  - Recency of research sources
  - Cross-platform engagement metrics
  - Alignment with channel niche

## How It Works

### Research Flow
```
Channel Niche Input
    ↓
8-Source Deep Research (parallel)
    ↓
Cross-Platform Aggregation
    ↓
LLM Synthesis with Enhanced Prompt
    ↓
5 Best Viral Ideas (ranked by potential)
```

### Example Output Structure
```json
{
  "ideas": [
    {
      "rank": 1,
      "viral_score": 95,
      "title": "The Dark Secret About [Topic] That Changed Everything",
      "hook": "You won't believe what I found buried in the research...",
      "core_angle": "Expose hidden truth using cross-platform evidence",
      "why_trending": "NYT article published 2 days ago + Reddit thread with 15K upvotes",
      "trend_sources": [
        {
          "platform": "Google News",
          "title": "Real article title from research",
          "url": "https://actual-url-from-research.com"
        }
      ],
      "seo_keywords": ["keyword1", "keyword2", "keyword3"],
      "best_format": "Standard",
      "risk_level": "Low",
      "description": "A deep-dive exposing [specific thing] based on recent NYT investigation and viral Reddit discussion"
    }
  ],
  "trend_summary": "What's dominating across all 8 research platforms right now"
}
```

## Benefits

### 1. **Deeply Researched Ideas**
- Every idea backed by actual internet-wide research
- Not generic guesses but evidence-based recommendations

### 2. **Viral Potential**
- Cross-platform trends have higher viral potential
- Ideas validated by multiple audience segments

### 3. **SEO Optimized**
- Keywords extracted from real search trends
- Titles optimized for YouTube algorithm and human clicks

### 4. **Timely & Relevant**
- Focus on "what's trending RIGHT NOW"
- Recent research sources (past 7 days prioritized)

### 5. **Professional Quality**
- Proper YouTube titles, not keyword spam
- Compelling hooks and angles
- Clear risk assessment

## Token Efficiency

Despite the enhancement, the prompt remains token-efficient:
- Compact system prompt (~600 tokens)
- Focused research data summary (max 6000 chars)
- JSON-only output (no extra text)

## Next Steps

The system will automatically:
1. Fetch your channel data from YouTube API
2. Run 8-source deep research in parallel
3. Aggregate findings across platforms
4. Generate 5 best viral ideas using the upgraded prompt
5. Return polished, YouTube-ready video concepts

All with automatic failover across multiple API keys for reliability!
