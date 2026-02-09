from flask import Flask, jsonify, request
from flask_cors import CORS
import json
from datetime import datetime, timedelta
import os
from anthropic import Anthropic
import requests
import time
from typing import List, Dict
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, origins='*')

# Initialize clients
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")
USE_LLM_SENTIMENT = os.environ.get("USE_LLM_SENTIMENT", "").lower() in ("1", "true", "yes")

# Cache for station data
STATION_CACHE = {
    'data': None,
    'timestamp': None,
    'ttl': 3600  # 1 hour cache
}

class GooglePlacesCollector:
    """Collect data from Google Places API"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://maps.googleapis.com/maps/api/place"
    
    def search_places(self, query: str, location: str = None, max_results: int = 60) -> List[Dict]:
        """Search for places using text search. Paginates to get up to max_results."""
        url = f"{self.base_url}/textsearch/json"
        
        params = {
            'query': query,
            'key': self.api_key
        }
        
        if location:
            params['location'] = location
            params['radius'] = 50000  # 50km radius
        
        all_results = []
        
        try:
            # Initial request
            response = requests.get(url, params=params)
            data = response.json()
            
            if data['status'] != 'OK':
                print(f"Error: {data['status']}")
                return []
            
            all_results.extend(data.get('results', []))
            
            # Handle pagination (Google returns 20 per page, max 60 per search)
            while len(all_results) < max_results and 'next_page_token' in data:
                time.sleep(2)  # Required by Google before using token
                token = data['next_page_token']
                # Token must be the only param besides key (no query/location)
                page_url = f"{url}?pagetoken={requests.utils.quote(token)}&key={self.api_key}"
                response = requests.get(page_url)
                data = response.json()
                
                if data['status'] == 'OK':
                    all_results.extend(data.get('results', []))
                else:
                    break
            
            return all_results[:max_results]
        except Exception as e:
            print(f"Error searching places: {e}")
            return []
    
    def get_place_details(self, place_id: str) -> Dict:
        """Get detailed information for a place"""
        url = f"{self.base_url}/details/json"
        
        params = {
            'place_id': place_id,
            'fields': 'name,rating,reviews,geometry,user_ratings_total,formatted_address,opening_hours,website,formatted_phone_number',
            'key': self.api_key
        }
        
        try:
            response = requests.get(url, params=params)
            data = response.json()
            
            if data['status'] != 'OK':
                print(f"Error getting details for {place_id}: {data['status']}")
                return {}
            
            return data.get('result', {})
        except Exception as e:
            print(f"Error fetching place details: {e}")
            return {}

def fetch_shell_stations():
    """Fetch Shell stations from Google Places API with caching"""
    
    # Check cache
    if STATION_CACHE['data'] and STATION_CACHE['timestamp']:
        elapsed = (datetime.now() - STATION_CACHE['timestamp']).total_seconds()
        if elapsed < STATION_CACHE['ttl']:
            print("Using cached station data")
            return STATION_CACHE['data']
    
    if not GOOGLE_PLACES_API_KEY:
        print("WARNING: No Google Places API key found, using fallback data")
        return get_fallback_stations()
    
    print("Fetching fresh data from Google Places API...")
    
    collector = GooglePlacesCollector(GOOGLE_PLACES_API_KEY)
    
    # Multiple queries and London area centers to get 58+ results
    # (Text Search returns ~20 per request; different queries + locations surface more)
    queries = [
        "Shell gas station in London",
        "Shell petrol station London",
        "Shell filling station London",
    ]
    london_centers = [
        "51.5074,-0.1278",   # Central
        "51.5155,-0.0924",   # East
        "51.4643,-0.2132",   # South
        "51.5560,-0.2790",   # North West
        "51.4296,-0.0936",   # South East
        "51.5014,-0.1419",   # Westminster
        "51.4894,-0.1157",   # City
        "51.5364,-0.1375",   # North (Camden/Islington)
        "51.4054,-0.3012",   # South West (Richmond)
        "51.4583,-0.0586",   # East (Canary Wharf)
    ]
    seen_ids = set()
    stations = []
    for query in queries:
        for loc in london_centers:
            if len(stations) >= 60:
                break
            page = collector.search_places(query, location=loc, max_results=60)
            for s in page:
                if s["place_id"] not in seen_ids:
                    seen_ids.add(s["place_id"])
                    stations.append(s)
            time.sleep(0.3)
        if len(stations) >= 60:
            break
        time.sleep(0.3)
    
    stations = stations[:60]
    print(f"Found {len(stations)} unique Shell stations")
    
    detailed_stations = []
    
    for i, station in enumerate(stations, 1):
        print(f"Fetching details for station {i}: {station.get('name')}")
        
        details = collector.get_place_details(station['place_id'])
        
        if details:
            location = details.get('geometry', {}).get('location', {})
            
            # Determine borough based on location
            lat = location.get('lat', 0)
            lng = location.get('lng', 0)
            borough = determine_borough(lat, lng)
            
            detailed_stations.append({
                'id': i,
                'place_id': station['place_id'],
                'name': details.get('name', 'Shell Station'),
                'address': details.get('formatted_address', ''),
                'lat': lat,
                'lng': lng,
                'borough': borough,
                'avg_rating': details.get('rating', 0),
                'review_count': details.get('user_ratings_total', 0),
                'reviews': details.get('reviews', []),
                'phone': details.get('formatted_phone_number'),
                'website': details.get('website'),
                'opening_hours': details.get('opening_hours')
            })
        
        time.sleep(0.5)  # Rate limiting
    
    # Update cache
    STATION_CACHE['data'] = detailed_stations
    STATION_CACHE['timestamp'] = datetime.now()
    
    print(f"✅ Fetched {len(detailed_stations)} stations from Google Places API")
    
    return detailed_stations

def determine_borough(lat: float, lng: float) -> str:
    """Determine London borough based on coordinates"""
    # Determine North/South based on latitude
    # London approximate boundaries:
    # North: lat > 51.52 (Camden, Islington, Haringey, etc.)
    # South: lat < 51.48 (Southwark, Lambeth, Greenwich, etc.)
    # Central: 51.48 <= lat <= 51.52
    
    # Determine East/West based on longitude
    # West: lng < -0.15
    # East: lng > -0.05
    # Central: -0.15 <= lng <= -0.05
    
    # Combine both dimensions
    if lat > 51.52:
        # North
        if lng < -0.15:
            return "North West"
        elif lng > -0.05:
            return "North East"
        else:
            return "North"
    elif lat < 51.48:
        # South
        if lng < -0.15:
            return "South West"
        elif lng > -0.05:
            return "South East"
        else:
            return "South"
    else:
        # Central
        if lng < -0.15:
            return "West"
        elif lng > -0.05:
            return "East"
        else:
            return "Central"

def get_fallback_stations():
    """Fallback mock data if API key not available"""
    return [
        {
            "id": 1,
            "name": "Shell Kensington",
            "address": "234 Kensington High Street, London W8 6AG",
            "lat": 51.5001,
            "lng": -0.1947,
            "borough": "West",
            "avg_rating": 4.2,
            "review_count": 156,
            "reviews": []
        },
        {
            "id": 2,
            "name": "Shell Camden",
            "address": "89 Camden Road, London NW1 9EX",
            "lat": 51.5426,
            "lng": -0.1396,
            "borough": "North",
            "avg_rating": 3.1,
            "review_count": 243,
            "reviews": []
        }
    ]

def _classify_sentiment_llm(review_text: str) -> str:
    """Use Claude to classify review sentiment (positive/neutral/negative). Optional, for best accuracy."""
    if not client.api_key or not review_text.strip():
        return "neutral"
    try:
        response = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=20,
            messages=[{
                "role": "user",
                "content": f"Classify this customer review sentiment as exactly one word: positive, neutral, or negative. Review: \"{review_text[:800]}\""
            }]
        )
        text = (response.content[0].text or "").strip().lower()
        if "positive" in text:
            return "positive"
        if "negative" in text:
            return "negative"
        return "neutral"
    except Exception:
        return "neutral"


def _text_sentiment_cues(text: str) -> str | None:
    """Simple keyword-based sentiment from text. Returns 'positive', 'negative', or None if unclear.
    Used to nudge 3-star reviews or when rating is missing/unreliable."""
    if not text or not text.strip():
        return None
    t = text.lower()
    positive_phrases = [
        "cheaper", "cheap", "always fill", "fill up here", "recommend", "great", "good value",
        "good price", "competitive", "helpful", "friendly", "clean", "quick", "convenient",
        "love", "best", "excellent", "always use", "in the area"
    ]
    negative_phrases = [
        "expensive", "overpriced", "rude", "dirty", "never again", "worst", "avoid",
        "broken", "out of order", "terrible", "poor", "disappointed", "waste"
    ]
    pos = sum(1 for p in positive_phrases if p in t)
    neg = sum(1 for p in negative_phrases if p in t)
    if pos > neg:
        return "positive"
    if neg > pos:
        return "negative"
    return None


def analyze_review_sentiment(review_text: str, rating: int) -> str:
    """Determine sentiment from review text and rating. Rating is primary; text nudges 3-star and edge cases."""
    # Normalize rating to 1-5 (Google can return int/float or missing)
    try:
        r = int(float(rating)) if rating is not None else 3
    except (TypeError, ValueError):
        r = 3
    r = max(1, min(5, r))

    if r >= 4:
        return "positive"
    if r <= 2:
        # 1-2 star: always negative. Do not override with text (complaints often mention "fill up here" etc. in a negative context)
        return "negative"
    text_cue = _text_sentiment_cues(review_text or "")
    # 3-star: use text cues so positive-sounding reviews aren't marked neutral/negative
    if text_cue == "positive":
        return "positive"
    if text_cue == "negative":
        return "negative"
    return "neutral"

def extract_themes_from_review(review_text: str, sentiment: str) -> List[str]:
    """Extract themes from review text using keyword matching"""
    themes = []
    text_lower = review_text.lower()
    
    # Positive themes
    positive_keywords = {
        'Staff were incredibly helpful and friendly': ['helpful', 'friendly', 'staff', 'service', 'polite', 'courteous'],
        'Very clean facilities, toilets were spotless': ['clean', 'spotless', 'tidy', 'toilet', 'bathroom', 'hygienic'],
        'Quick service, no waiting time': ['quick', 'fast', 'no wait', 'efficient', 'speedy'],
        'Great location, easy to access': ['location', 'easy access', 'convenient', 'accessible'],
        'EV charging stations working perfectly': ['ev', 'charging', 'electric', 'charger', 'charge point'],
        'Car wash service was excellent': ['car wash', 'wash', 'clean car', 'valeting'],
        'Competitive fuel prices': ['cheap', 'good price', 'competitive', 'affordable', 'value'],
        'Well-lit and feels safe at night': ['safe', 'secure', 'well-lit', 'lighting', 'bright'],
        'Convenience store well-stocked': ['shop', 'store', 'well-stocked', 'products'],
        'Loyalty program is great value': ['loyalty', 'points', 'rewards', 'shell go']
    }
    
    # Negative themes
    negative_keywords = {
        'Long queues during rush hour': ['queue', 'wait', 'busy', 'crowded', 'long wait', 'slow'],
        'Toilets were dirty and unmaintained': ['dirty toilet', 'filthy', 'disgusting bathroom', 'unclean'],
        'Rude staff, poor customer service': ['rude', 'unhelpful', 'poor service', 'bad service', 'unprofessional'],
        'EV chargers out of order': ['charger broken', 'not working', 'out of order', 'ev broken', 'charger down'],
        'Prices higher than competitors': ['expensive', 'overpriced', 'high price', 'too expensive', 'costly'],
        'Poorly lit, doesn\'t feel safe': ['dark', 'unsafe', 'dangerous', 'scary', 'poorly lit'],
        'Car wash damaged my vehicle': ['damage', 'scratched', 'car wash problem', 'broken'],
        'Pumps frequently out of service': ['pump broken', 'out of service', 'not working', 'pump down'],
        'Limited parking space': ['no parking', 'parking', 'hard to park', 'difficult parking'],
        'Credit card machine not working': ['payment', 'card machine', 'can\'t pay', 'payment issue']
    }
    
    keyword_map = positive_keywords if sentiment == 'positive' else negative_keywords
    
    for theme, keywords in keyword_map.items():
        if any(keyword in text_lower for keyword in keywords):
            themes.append(theme)
    
    return themes[:3] if themes else []  # Return up to 3 themes

def process_reviews(reviews: List[Dict], days: int = 365) -> List[Dict]:
    """Process Google reviews into our format"""
    cutoff_date = datetime.now() - timedelta(days=days)
    processed = []
    
    for review in reviews:
        # Google review time is in Unix timestamp
        review_time = review.get('time', 0)
        review_date = datetime.fromtimestamp(review_time)
        
        if review_date < cutoff_date:
            continue
        
        # Google can return rating as int, float, or sometimes missing; normalize to 1-5
        raw_rating = review.get('rating', 3)
        try:
            rating = max(1, min(5, int(float(raw_rating))))
        except (TypeError, ValueError):
            rating = 3
        text = (review.get('text') or '').strip()
        
        sentiment = analyze_review_sentiment(text, rating)
        # Optional: use LLM for 3-star reviews with text to improve accuracy (set USE_LLM_SENTIMENT=1)
        if USE_LLM_SENTIMENT and sentiment == "neutral" and text and client.api_key:
            sentiment = _classify_sentiment_llm(text)
        themes = extract_themes_from_review(text, sentiment)
        
        processed.append({
            'id': review.get('author_name', '') + str(review_time),
            'rating': rating,
            'sentiment': sentiment,
            'text': text,
            'author': review.get('author_name', 'Anonymous'),
            'date': review_date.isoformat(),
            'themes': themes,
            'relative_time': review.get('relative_time_description', '')
        })
    
    return processed

def analyze_sentiment_trends(reviews: List[Dict], days: int = 90) -> Dict:
    """Analyze sentiment trends over time"""
    cutoff_date = datetime.now() - timedelta(days=days)
    recent_reviews = [r for r in reviews if datetime.fromisoformat(r["date"]) >= cutoff_date]
    
    sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}
    for review in recent_reviews:
        sentiment_counts[review["sentiment"]] += 1
    
    total = len(recent_reviews)
    if total == 0:
        return {"positive": 0, "neutral": 0, "negative": 0}
    
    return {
        "positive": round(sentiment_counts["positive"] / total * 100, 1),
        "neutral": round(sentiment_counts["neutral"] / total * 100, 1),
        "negative": round(sentiment_counts["negative"] / total * 100, 1)
    }

def get_monthly_sentiment_trends(reviews: List[Dict], days: int = 90) -> List[Dict]:
    """Group reviews by calendar month and return sentiment breakdown per month (oldest first)."""
    cutoff_date = datetime.now() - timedelta(days=days)
    by_month = defaultdict(list)  # (year, month) -> list of reviews
    for r in reviews:
        dt = datetime.fromisoformat(r["date"])
        if dt >= cutoff_date:
            by_month[(dt.year, dt.month)].append(r)
    if not by_month:
        return []
    months_sorted = sorted(by_month.keys())
    result = []
    for y, m in months_sorted:
        revs = by_month[(y, m)]
        counts = {"positive": 0, "neutral": 0, "negative": 0}
        for r in revs:
            counts[r["sentiment"]] += 1
        total = len(revs)
        result.append({
            "month": f"{y}-{m:02d}",
            "positive": round(counts["positive"] / total * 100, 1) if total else 0,
            "neutral": round(counts["neutral"] / total * 100, 1) if total else 0,
            "negative": round(counts["negative"] / total * 100, 1) if total else 0,
            "review_count": total
        })
    return result


def get_improvement_summary(monthly_trends: List[Dict]) -> Dict:
    """From monthly trends, return a short summary: first vs last month positive %, and trend label."""
    if not monthly_trends or len(monthly_trends) < 2:
        return {"trend": "insufficient_data", "first_month_positive": None, "last_month_positive": None, "change_pct": None}
    first = monthly_trends[0]["positive"]
    last = monthly_trends[-1]["positive"]
    change = round(last - first, 1)
    if change > 5:
        trend = "improving"
    elif change < -5:
        trend = "declining"
    else:
        trend = "stable"
    return {
        "trend": trend,
        "first_month_positive": first,
        "last_month_positive": last,
        "change_pct": change
    }


# Short labels, type, and canonical topic (same topic = one line; praise + complaint combined)
THEME_DISPLAY = {
    "Staff were incredibly helpful and friendly": {"short": "Staff", "type": "praise", "topic": "Staff"},
    "Rude staff, poor customer service": {"short": "Staff", "type": "complaint", "topic": "Staff"},
    "Very clean facilities, toilets were spotless": {"short": "Cleanliness", "type": "praise", "topic": "Cleanliness"},
    "Toilets were dirty and unmaintained": {"short": "Toilets", "type": "complaint", "topic": "Cleanliness"},
    "Quick service, no waiting time": {"short": "Wait Times", "type": "praise", "topic": "Wait Times"},
    "Long queues during rush hour": {"short": "Wait Times", "type": "complaint", "topic": "Wait Times"},
    "Great location, easy to access": {"short": "Location", "type": "praise", "topic": "Location"},
    "EV charging stations working perfectly": {"short": "EV Charging", "type": "praise", "topic": "EV Charging"},
    "EV chargers out of order": {"short": "EV Charging", "type": "complaint", "topic": "EV Charging"},
    "Car wash service was excellent": {"short": "Car Wash", "type": "praise", "topic": "Car Wash"},
    "Car wash damaged my vehicle": {"short": "Car Wash", "type": "complaint", "topic": "Car Wash"},
    "Competitive fuel prices": {"short": "Pricing", "type": "praise", "topic": "Pricing"},
    "Prices higher than competitors": {"short": "Pricing", "type": "complaint", "topic": "Pricing"},
    "Well-lit and feels safe at night": {"short": "Safety", "type": "praise", "topic": "Safety"},
    "Poorly lit, doesn't feel safe": {"short": "Safety", "type": "complaint", "topic": "Safety"},
    "Convenience store well-stocked": {"short": "Store", "type": "praise", "topic": "Store"},
    "Loyalty program is great value": {"short": "Loyalty", "type": "praise", "topic": "Loyalty"},
    "Pumps frequently out of service": {"short": "Equipment", "type": "complaint", "topic": "Equipment"},
    "Credit card machine not working": {"short": "Equipment", "type": "complaint", "topic": "Equipment"},
    "Limited parking space": {"short": "Parking", "type": "complaint", "topic": "Parking"},
}


def get_notable_spikes(days: int) -> List[Dict]:
    """
    Detect notable spikes in theme mentions across all stations.
    Compares current period vs previous period (both of length `days`).
    High sensitivity: flags even relatively small increases.
    """
    all_stations = fetch_shell_stations()
    # Use 2 * days to have enough history for both previous and current periods
    all_reviews: List[Dict] = []
    for station in all_stations:
        reviews = process_reviews(station.get("reviews", []), days * 2)
        all_reviews.extend(reviews)

    if not all_reviews:
        return []

    now = datetime.now()
    current_start = now - timedelta(days=days)
    previous_start = now - timedelta(days=days * 2)

    current_reviews: List[Dict] = []
    previous_reviews: List[Dict] = []

    for r in all_reviews:
        dt = datetime.fromisoformat(r["date"])
        if dt >= current_start:
            current_reviews.append(r)
        elif previous_start <= dt < current_start:
            previous_reviews.append(r)

    # Count themes in each period
    prev_counts: Dict[str, int] = defaultdict(int)
    curr_counts: Dict[str, int] = defaultdict(int)

    for r in previous_reviews:
        for theme in r.get("themes", []):
            prev_counts[theme] += 1

    for r in current_reviews:
        for theme in r.get("themes", []):
            curr_counts[theme] += 1

    # Build spikes with high sensitivity but still avoiding pure noise
    spikes: List[Dict] = []
    all_themes = set(prev_counts.keys()) | set(curr_counts.keys())

    for theme in all_themes:
        prev = prev_counts.get(theme, 0)
        curr = curr_counts.get(theme, 0)
        if curr == 0:
            continue  # nothing happening now

        # Smooth baseline to avoid divide-by-zero and give some weight to previous period
        baseline = max(prev, 1)
        change_pct = ((curr - prev) / baseline) * 100

        # High sensitivity: flag if
        # - brand new theme with at least 2 mentions, OR
        # - increase >= 40% with at least 2 current mentions, OR
        # - small absolute bump (prev < 3) and +1 or more mentions
        is_new_theme = prev == 0 and curr >= 2
        is_large_relative_increase = curr >= 2 and change_pct >= 40
        is_small_base_bump = prev < 3 and (curr - prev) >= 1

        if not (is_new_theme or is_large_relative_increase or is_small_base_bump):
            continue

        display = THEME_DISPLAY.get(theme, {"short": theme[:40], "type": "complaint", "topic": theme[:40]})
        spikes.append(
            {
                "theme": theme,
                "topic": display.get("topic", theme[:40]),
                "short_name": display.get("short", theme[:40]),
                "type": display.get("type", "complaint"),
                "previous_count": prev,
                "current_count": curr,
                "change_percent": round(change_pct, 1),
            }
        )

    # Sort by magnitude of change, desc, and keep top few
    spikes.sort(key=lambda x: (x["change_percent"], x["current_count"]), reverse=True)
    return spikes[:8]


def get_theme_trends(days: int) -> Dict:
    """Top 3 rising praise + top 3 rising complaint topics (6 lines). Separate praise/complaint series per topic."""
    all_stations = fetch_shell_stations()
    all_reviews = []
    for station in all_stations:
        reviews = process_reviews(station.get("reviews", []), days)
        all_reviews.extend(reviews)
    if not all_reviews:
        return {"period_label": "Month", "labels": [], "themes": [], "periods": 0}

    cutoff = datetime.now() - timedelta(days=days)
    praise_by_bucket = defaultdict(lambda: defaultdict(int))   # (y, m) -> topic -> count
    complaint_by_bucket = defaultdict(lambda: defaultdict(int))  # (y, m) -> topic -> count
    topic_praise_totals = defaultdict(int)
    topic_complaint_totals = defaultdict(int)

    for r in all_reviews:
        dt = datetime.fromisoformat(r["date"])
        if dt < cutoff:
            continue
        bucket = (dt.year, dt.month)
        for theme in r.get("themes", []):
            info = THEME_DISPLAY.get(theme, {"topic": theme[:30], "short": theme[:30], "type": "complaint"})
            topic = info.get("topic", theme[:30])
            t = info.get("type", "complaint")
            if t == "praise":
                praise_by_bucket[bucket][topic] += 1
                topic_praise_totals[topic] += 1
            else:
                complaint_by_bucket[bucket][topic] += 1
                topic_complaint_totals[topic] += 1

    all_buckets = sorted(set(praise_by_bucket.keys()) | set(complaint_by_bucket.keys()))
    if not all_buckets:
        return {"period_label": "Month", "labels": [], "themes": [], "periods": 0}

    labels = [f"{y}-{m:02d}" for y, m in all_buckets]
    n_periods = len(labels)
    mid = max(1, n_periods // 2)

    def _trend(series: List[int]) -> str:
        if n_periods <= 1:
            return "stable"
        first_half = sum(series[:mid])
        second_half = sum(series[mid:])
        if second_half > first_half * 1.2:
            return "rising"
        if second_half < first_half * 0.8:
            return "declining"
        return "stable"

    # Top 3 rising praise (by total praise mentions, among topics with rising praise trend)
    praise_candidates = []
    for topic in topic_praise_totals:
        series = [praise_by_bucket[b].get(topic, 0) for b in all_buckets]
        if _trend(series) == "rising":
            praise_candidates.append((topic, topic_praise_totals[topic], series))
    top3_praise = sorted(praise_candidates, key=lambda x: -x[1])[:3]

    # Top 3 rising complaint (by total complaint mentions, among topics with rising complaint trend)
    complaint_candidates = []
    for topic in topic_complaint_totals:
        series = [complaint_by_bucket[b].get(topic, 0) for b in all_buckets]
        if _trend(series) == "rising":
            complaint_candidates.append((topic, topic_complaint_totals[topic], series))
    top3_complaint = sorted(complaint_candidates, key=lambda x: -x[1])[:3]

    themes_out = []
    for topic_name, _, series in top3_praise:
        themes_out.append({
            "topic": topic_name,
            "key": f"{topic_name}_praise",
            "short_name": topic_name,
            "trend": "rising_praise",
            "series": series,
        })
    for topic_name, _, series in top3_complaint:
        themes_out.append({
            "topic": topic_name,
            "key": f"{topic_name}_complaint",
            "short_name": topic_name,
            "trend": "rising_complaint",
            "series": series,
        })
    return {"period_label": "Month", "labels": labels, "themes": themes_out, "periods": n_periods}


def get_top_themes(reviews: List[Dict], sentiment_filter=None, limit=5) -> List[Dict]:
    """Extract top themes from reviews"""
    theme_counts = {}
    
    for review in reviews:
        if sentiment_filter and review["sentiment"] != sentiment_filter:
            continue
        
        for theme in review.get("themes", []):
            theme_counts[theme] = theme_counts.get(theme, 0) + 1
    
    sorted_themes = sorted(theme_counts.items(), key=lambda x: x[1], reverse=True)
    return [{"theme": theme, "count": count} for theme, count in sorted_themes[:limit]]


def get_key_insights(days: int) -> Dict:
    """
    Compute 4 key insights for dashboard at-a-glance:
    - biggest_riser: topic with largest % increase in positive (praise) mentions
    - biggest_decliner: topic with largest % increase in complaint mentions
    - hot_topic: topic with highest spike multiplier (current/previous mentions)
    - most_improved_station: station with largest rating gain (current vs previous period)
    """
    all_stations = fetch_shell_stations()
    all_reviews = []
    for station in all_stations:
        reviews = process_reviews(station.get("reviews", []), days * 2)
        all_reviews.extend(reviews)

    now = datetime.now()
    current_start = now - timedelta(days=days)
    previous_start = now - timedelta(days=days * 2)
    current_reviews = [r for r in all_reviews if datetime.fromisoformat(r["date"]) >= current_start]
    previous_reviews = [r for r in all_reviews if previous_start <= datetime.fromisoformat(r["date"]) < current_start]

    # Count by topic and type (praise vs complaint) per period
    prev_praise: Dict[str, int] = defaultdict(int)
    prev_complaint: Dict[str, int] = defaultdict(int)
    curr_praise: Dict[str, int] = defaultdict(int)
    curr_complaint: Dict[str, int] = defaultdict(int)

    for r in previous_reviews:
        for theme in r.get("themes", []):
            info = THEME_DISPLAY.get(theme, {"topic": theme[:30], "type": "complaint"})
            topic = info.get("topic", theme[:30])
            if info.get("type") == "praise":
                prev_praise[topic] += 1
            else:
                prev_complaint[topic] += 1
    for r in current_reviews:
        for theme in r.get("themes", []):
            info = THEME_DISPLAY.get(theme, {"topic": theme[:30], "type": "complaint"})
            topic = info.get("topic", theme[:30])
            if info.get("type") == "praise":
                curr_praise[topic] += 1
            else:
                curr_complaint[topic] += 1

    # Biggest Riser: topic with largest % increase in praise mentions
    biggest_riser = None
    best_rise_pct = -1
    for topic in set(prev_praise.keys()) | set(curr_praise.keys()):
        prev, curr = prev_praise.get(topic, 0), curr_praise.get(topic, 0)
        if curr > prev and prev >= 0:
            pct = ((curr - prev) / max(prev, 1)) * 100
            if pct > best_rise_pct:
                best_rise_pct = pct
                biggest_riser = {"topic": topic, "change_pct": round(pct, 1)}
    if not biggest_riser and curr_praise:
        t = max(curr_praise.items(), key=lambda x: x[1])
        biggest_riser = {"topic": t[0], "change_pct": 100.0}

    # Biggest Decliner: topic with largest % increase in complaint mentions
    biggest_decliner = None
    best_decline_pct = -1
    for topic in set(prev_complaint.keys()) | set(curr_complaint.keys()):
        prev, curr = prev_complaint.get(topic, 0), curr_complaint.get(topic, 0)
        if curr > prev and prev >= 0:
            pct = ((curr - prev) / max(prev, 1)) * 100
            if pct > best_decline_pct:
                best_decline_pct = pct
                biggest_decliner = {"topic": topic, "change_pct": round(pct, 1)}
    if not biggest_decliner and curr_complaint:
        t = max(curr_complaint.items(), key=lambda x: x[1])
        biggest_decliner = {"topic": t[0], "change_pct": 100.0}

    # Hot Topic: topic with highest spike (current / max(previous, 1))
    all_topics = set(prev_praise.keys()) | set(prev_complaint.keys()) | set(curr_praise.keys()) | set(curr_complaint.keys())
    hot_topic = None
    best_mult = 0
    for topic in all_topics:
        prev = prev_praise.get(topic, 0) + prev_complaint.get(topic, 0)
        curr = curr_praise.get(topic, 0) + curr_complaint.get(topic, 0)
        if curr > 0:
            mult = curr / max(prev, 1)
            if mult > best_mult:
                best_mult = mult
                hot_topic = {"topic": topic, "multiplier": round(mult, 1)}
    if not hot_topic and all_topics:
        hot_topic = {"topic": list(all_topics)[0], "multiplier": 1.0}

    # Most Improved Station: from performance data
    performance_data = []
    for station in all_stations:
        station_reviews = process_reviews(station.get("reviews", []), days * 2)
        if not station_reviews:
            continue
        prev_revs = [r for r in station_reviews if previous_start <= datetime.fromisoformat(r["date"]) < current_start]
        curr_revs = [r for r in station_reviews if datetime.fromisoformat(r["date"]) >= current_start]
        if not prev_revs or not curr_revs:
            continue
        prev_avg = sum(r["rating"] for r in prev_revs) / len(prev_revs)
        curr_avg = sum(r["rating"] for r in curr_revs) / len(curr_revs)
        change = curr_avg - prev_avg
        if change > 0:
            performance_data.append({
                "name": station["name"],
                "address": station.get("address", ""),
                "prev_rating": round(prev_avg, 1),
                "curr_rating": round(curr_avg, 1),
                "change": round(change, 2),
            })
    most_improved = None
    if performance_data:
        best = max(performance_data, key=lambda x: x["change"])
        most_improved = {
            "name": best["name"],
            "address": best.get("address", ""),
            "prev_rating": best["prev_rating"],
            "curr_rating": best["curr_rating"],
        }

    return {
        "biggest_riser": biggest_riser,
        "biggest_decliner": biggest_decliner,
        "hot_topic": hot_topic,
        "most_improved_station": most_improved,
        "period_days": days,
    }


@app.route('/api/key_insights', methods=['GET'])
def api_key_insights():
    """Key insights at-a-glance for dashboard."""
    try:
        days = int(request.args.get('days', 90))
        insights = get_key_insights(days)
        return jsonify(insights)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/stations', methods=['GET'])
def get_stations():
    """Get all Shell stations with optional filtering"""
    try:
        # Fetch stations from Google Places API
        all_stations = fetch_shell_stations()
        
        # Get filter parameters
        min_rating = float(request.args.get('min_rating', 0))
        max_rating = float(request.args.get('max_rating', 5))
        sentiment = request.args.get('sentiment')
        borough = request.args.get('borough')
        min_reviews = int(request.args.get('min_reviews', 0))
        days = int(request.args.get('days', 90))
        
        filtered_stations = []
        
        for station in all_stations:
            # Apply filters
            if station['avg_rating'] < min_rating or station['avg_rating'] > max_rating:
                continue
            if borough and station['borough'] != borough:
                continue
            if station['review_count'] < min_reviews:
                continue
            
            # Process reviews: overall (all we have) and current period
            all_reviews_overall = process_reviews(station.get('reviews', []), 9999)
            processed_reviews = process_reviews(station.get('reviews', []), days)
            sentiment_data = analyze_sentiment_trends(processed_reviews, days)
            overall_sentiment_data = analyze_sentiment_trends(all_reviews_overall, 9999)
            
            # Determine dominant sentiment (from current period)
            if not sentiment_data or sum(sentiment_data.values()) == 0:
                dominant_sentiment = "neutral"
            else:
                dominant_sentiment = max(sentiment_data.items(), key=lambda x: x[1])[0]
            
            if sentiment and dominant_sentiment != sentiment:
                continue
            
            station_data = station.copy()
            station_data['sentiment_breakdown'] = sentiment_data
            station_data['dominant_sentiment'] = dominant_sentiment
            # Overall (all reviews we have from API; review_count from Google)
            station_data['overall_sentiment_breakdown'] = overall_sentiment_data
            station_data['overall_avg_rating'] = round(sum(r['rating'] for r in all_reviews_overall) / len(all_reviews_overall), 2) if all_reviews_overall else station.get('avg_rating', 0)
            station_data['overall_review_count'] = station.get('review_count', len(all_reviews_overall))
            # Current period
            station_data['current_avg_rating'] = round(sum(r['rating'] for r in processed_reviews) / len(processed_reviews), 2) if processed_reviews else 0
            station_data['current_review_count'] = len(processed_reviews)
            
            filtered_stations.append(station_data)
        
        return jsonify({
            "stations": filtered_stations,
            "total": len(filtered_stations)
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stations/<int:station_id>', methods=['GET'])
def get_station_details(station_id):
    """Get detailed information about a specific station"""
    try:
        all_stations = fetch_shell_stations()
        station = next((s for s in all_stations if s["id"] == station_id), None)
        
        if not station:
            return jsonify({"error": "Station not found"}), 404
        
        days = int(request.args.get('days', 90))
        
        # Overall: all reviews we have from API (no time filter); review_count from Google
        all_reviews_overall = process_reviews(station.get('reviews', []), 9999)
        overall_sentiment = analyze_sentiment_trends(all_reviews_overall, 9999)
        overall_avg_rating = round(sum(r['rating'] for r in all_reviews_overall) / len(all_reviews_overall), 2) if all_reviews_overall else station.get('avg_rating', 0)
        overall_review_count = station.get('review_count', len(all_reviews_overall))
        
        # Current period
        all_reviews = process_reviews(station.get('reviews', []), days)
        sentiment_data = analyze_sentiment_trends(all_reviews, days)
        current_avg_rating = round(sum(r['rating'] for r in all_reviews) / len(all_reviews), 2) if all_reviews else 0
        current_review_count = len(all_reviews)
        
        # Get top themes (from current period)
        top_positives = get_top_themes(all_reviews, "positive", 3)
        top_negatives = get_top_themes(all_reviews, "negative", 3)
        all_themes = get_top_themes(all_reviews, None, 10)
        
        # Get sample reviews
        positive_samples = [r for r in all_reviews if r["sentiment"] == "positive"][:3]
        negative_samples = [r for r in all_reviews if r["sentiment"] == "negative"][:3]
        
        return jsonify({
            "station": station,
            "sentiment_breakdown": sentiment_data,
            "overall_sentiment_breakdown": overall_sentiment,
            "overall_avg_rating": overall_avg_rating,
            "overall_review_count": overall_review_count,
            "current_avg_rating": current_avg_rating,
            "current_review_count": current_review_count,
            "top_positives": top_positives,
            "top_negatives": top_negatives,
            "all_themes": all_themes,
            "positive_samples": positive_samples,
            "negative_samples": negative_samples,
            "review_count": station.get("review_count", 0),  # Google user_ratings_total
            "recent_reviews": all_reviews[:10]
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_topic_sentiment_overview(days: int, station_id: int = None) -> List[Dict]:
    """
    Calculate net sentiment per topic for diverging bar chart.
    Returns list of topics with net sentiment score (-100 to +100).
    Net sentiment = (positive_mentions - negative_mentions) / total_mentions * 100
    """
    all_stations = fetch_shell_stations()
    
    if station_id:
        station = next((s for s in all_stations if s['id'] == station_id), None)
        if not station:
            return []
        all_reviews = process_reviews(station.get('reviews', []), days)
    else:
        all_reviews = []
        for station in all_stations:
            reviews = process_reviews(station.get('reviews', []), days)
            all_reviews.extend(reviews)
    
    # Count positive and negative mentions per topic
    topic_counts = defaultdict(lambda: {"positive": 0, "negative": 0, "total": 0})
    
    for review in all_reviews:
        for theme in review.get("themes", []):
            display_info = THEME_DISPLAY.get(theme, {"topic": theme[:30], "type": "complaint"})
            topic = display_info.get("topic", theme[:30])
            theme_type = display_info.get("type", "complaint")
            
            topic_counts[topic]["total"] += 1
            if theme_type == "praise":
                topic_counts[topic]["positive"] += 1
            elif theme_type == "complaint":
                topic_counts[topic]["negative"] += 1
    
    # Calculate net sentiment for each topic
    results = []
    for topic, counts in topic_counts.items():
        total = counts["total"]
        if total == 0:
            continue
        
        positive = counts["positive"]
        negative = counts["negative"]
        # Net sentiment: (positive - negative) / total * 100, range -100 to +100
        net_sentiment = round(((positive - negative) / total) * 100, 1)
        
        results.append({
            "topic": topic,
            "net_sentiment": net_sentiment,
            "positive_count": positive,
            "negative_count": negative,
            "total_count": total
        })
    
    # Sort by net sentiment (most positive first, then most negative)
    results.sort(key=lambda x: -x["net_sentiment"])
    return results


@app.route('/api/topic_sentiment_overview', methods=['GET'])
def api_topic_sentiment_overview():
    """API endpoint for topic sentiment overview (diverging bar chart data)"""
    try:
        days = int(request.args.get('days', 90))
        station_id = request.args.get('station_id')
        station_id_int = int(station_id) if station_id else None
        
        topics = get_topic_sentiment_overview(days, station_id_int)
        return jsonify({
            "topics": topics,
            "period_days": days
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/overview', methods=['GET'])
def get_overview():
    """Get overall sentiment and statistics across all stations"""
    try:
        days = int(request.args.get('days', 90))
        all_stations = fetch_shell_stations()
        
        all_reviews = []
        for station in all_stations:
            reviews = process_reviews(station.get('reviews', []), days)
            all_reviews.extend(reviews)
        
        # Overall sentiment
        sentiment_data = analyze_sentiment_trends(all_reviews, days)
        
        # Top themes
        top_themes = get_top_themes(all_reviews, None, 10)
        top_positives = get_top_themes(all_reviews, "positive", 5)
        top_negatives = get_top_themes(all_reviews, "negative", 5)
        
        # Calculate average rating
        total_rating = sum(r['rating'] for r in all_reviews)
        avg_rating = round(total_rating / len(all_reviews), 2) if all_reviews else 0
        
        # Rising issues (last 30 vs previous 30)
        recent_30 = [r for r in all_reviews if datetime.fromisoformat(r["date"]) >= datetime.now() - timedelta(days=30)]
        prev_30 = [r for r in all_reviews if datetime.now() - timedelta(days=60) <= datetime.fromisoformat(r["date"]) < datetime.now() - timedelta(days=30)]
        
        recent_themes = get_top_themes(recent_30, None, 10)
        prev_themes = get_top_themes(prev_30, None, 10)
        
        rising_issues = []
        for theme in recent_themes:
            prev_count = next((t['count'] for t in prev_themes if t['theme'] == theme['theme']), 0)
            if theme['count'] > prev_count * 1.5:
                display = THEME_DISPLAY.get(
                    theme['theme'],
                    {"short": theme['theme'][:40], "type": "complaint", "topic": theme['theme'][:40]},
                )
                rising_issues.append({
                    "theme": theme['theme'],
                    "topic": display.get("topic", theme['theme'][:40]),
                    "short_name": display.get("short", theme['theme'][:40]),
                    "type": display.get("type", "complaint"),
                    "current_count": theme['count'],
                    "previous_count": prev_count,
                    "change_percent": round(((theme['count'] - prev_count) / max(prev_count, 1)) * 100, 1)
                })
        
        return jsonify({
            "overall_sentiment": sentiment_data,
            "avg_rating": avg_rating,
            "total_reviews": len(all_reviews),
            "total_stations": len(all_stations),
            "top_themes": top_themes,
            "top_positives": top_positives,
            "top_negatives": top_negatives,
            "rising_issues": rising_issues[:5],
            "period_days": days
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/notable_spikes', methods=['GET'])
def api_notable_spikes():
    """API endpoint to expose notable spikes in theme mentions across all stations."""
    try:
        days = int(request.args.get("days", 90))
        spikes = get_notable_spikes(days)
        return jsonify(
            {
                "spikes": spikes,
                "period_days": days,
                "current_window_days": days,
                "previous_window_days": days,
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/trends', methods=['GET'])
def get_trends():
    """Get sentiment trends over time"""
    try:
        days = int(request.args.get('days', 90))
        station_id = request.args.get('station_id')
        
        all_stations = fetch_shell_stations()
        
        if station_id:
            station = next((s for s in all_stations if s['id'] == int(station_id)), None)
            if not station:
                return jsonify({"error": "Station not found"}), 404
            reviews = process_reviews(station.get('reviews', []), days)
        else:
            all_reviews = []
            for station in all_stations:
                reviews = process_reviews(station.get('reviews', []), days)
                all_reviews.extend(reviews)
            reviews = all_reviews
        
        # Group by week
        data_points = []
        weeks = days // 7
        
        for week in range(weeks, 0, -1):
            start_date = datetime.now() - timedelta(days=week * 7)
            end_date = start_date + timedelta(days=7)
            
            week_reviews = [r for r in reviews if start_date <= datetime.fromisoformat(r["date"]) < end_date]
            
            if week_reviews:
                sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}
                total_rating = 0.0
                for review in week_reviews:
                    sentiment_counts[review["sentiment"]] += 1
                    total_rating += review.get("rating", 0)
                
                total = len(week_reviews)
                avg_rating = round(total_rating / total, 2) if total else 0
                data_points.append({
                    "date": start_date.strftime("%Y-%m-%d"),
                    "positive": round(sentiment_counts["positive"] / total * 100, 1),
                    "neutral": round(sentiment_counts["neutral"] / total * 100, 1),
                    "negative": round(sentiment_counts["negative"] / total * 100, 1),
                    "avg_rating": avg_rating,
                    "review_count": total
                })
        
        return jsonify({
            "trends": data_points,
            "period_days": days
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/theme_trends', methods=['GET'])
def api_theme_trends():
    """Top 5 themes shaping sentiment with monthly mention trend (for 30d: single month)."""
    try:
        days = int(request.args.get('days', 90))
        result = get_theme_trends(days)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/station_performance', methods=['GET'])
def get_station_performance():
    """Compare station ratings: current period vs previous period (same length)."""
    try:
        days = int(request.args.get('days', 90))
        station_id = request.args.get('station_id')
        all_stations = fetch_shell_stations()
        threshold = 0.1  # Rating change threshold for improving/deteriorating
        
        # Filter to specific station if station_id provided
        if station_id:
            station = next((s for s in all_stations if s['id'] == int(station_id)), None)
            if not station:
                return jsonify({"error": "Station not found"}), 404
            all_stations = [station]
        
        performance_data = []
        
        for station in all_stations:
            # Get reviews for both periods (current + previous)
            all_reviews = process_reviews(station.get('reviews', []), days * 2)
            
            if not all_reviews:
                continue
            
            now = datetime.now()
            current_start = now - timedelta(days=days)
            previous_start = now - timedelta(days=days * 2)
            
            # Split into current and previous period
            current_reviews = []
            previous_reviews = []
            
            for review in all_reviews:
                review_date = datetime.fromisoformat(review['date'])
                if review_date >= current_start:
                    current_reviews.append(review)
                elif review_date >= previous_start:
                    previous_reviews.append(review)
            
            # Skip if either period has no reviews
            if not current_reviews or not previous_reviews:
                continue
            
            # Calculate average ratings
            prev_avg = round(sum(r['rating'] for r in previous_reviews) / len(previous_reviews), 2)
            curr_avg = round(sum(r['rating'] for r in current_reviews) / len(current_reviews), 2)
            
            # Calculate sentiment breakdowns for both periods (reviews already filtered)
            prev_counts = {"positive": 0, "neutral": 0, "negative": 0}
            for r in previous_reviews:
                prev_counts[r["sentiment"]] += 1
            prev_total = len(previous_reviews)
            prev_sentiment = {
                "positive": round(prev_counts["positive"] / prev_total * 100, 1) if prev_total else 0,
                "neutral": round(prev_counts["neutral"] / prev_total * 100, 1) if prev_total else 0,
                "negative": round(prev_counts["negative"] / prev_total * 100, 1) if prev_total else 0
            }
            
            curr_counts = {"positive": 0, "neutral": 0, "negative": 0}
            for r in current_reviews:
                curr_counts[r["sentiment"]] += 1
            curr_total = len(current_reviews)
            curr_sentiment = {
                "positive": round(curr_counts["positive"] / curr_total * 100, 1) if curr_total else 0,
                "neutral": round(curr_counts["neutral"] / curr_total * 100, 1) if curr_total else 0,
                "negative": round(curr_counts["negative"] / curr_total * 100, 1) if curr_total else 0
            }
            
            # Determine status
            change = curr_avg - prev_avg
            if change > threshold:
                status = 'improving'
            elif change < -threshold:
                status = 'deteriorating'
            else:
                status = 'stable'
            
            performance_data.append({
                'id': station['id'],
                'name': station['name'],
                'address': station.get('address', ''),
                'prev_rating': prev_avg,
                'curr_rating': curr_avg,
                'prev_sentiment': prev_sentiment,
                'curr_sentiment': curr_sentiment,
                'status': status,
                'change': round(change, 2),
                'review_counts': {
                    'prev': len(previous_reviews),
                    'curr': len(current_reviews)
                }
            })
        
        return jsonify({
            'period_days': days,
            'stations': performance_data
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/chat', methods=['POST'])
def chat():
    """AI-powered chatbot for answering questions about reviews"""
    try:
        data = request.json or {}
        user_question = data.get('question', '')

        if not user_question:
            return jsonify({"error": "Question is required"}), 400

        # Chatbot always uses full span of data (ignore Analyzing Period filter)
        CHAT_DAYS = 365 * 2  # 2 years so we include all reviews we have from Google

        # Gather context from all stations: snapshot + monthly trends + improvement summary
        all_stations = fetch_shell_stations()
        context_data = []

        for station in all_stations:
            reviews = process_reviews(station.get('reviews', []), CHAT_DAYS)
            sentiment_data = analyze_sentiment_trends(reviews, CHAT_DAYS)
            themes = get_top_themes(reviews, None, 5)
            top_positives = get_top_themes(reviews, "positive", 5)
            top_negatives = get_top_themes(reviews, "negative", 5)
            monthly_trends = get_monthly_sentiment_trends(reviews, CHAT_DAYS)
            improvement = get_improvement_summary(monthly_trends)
            # Sample reviews for evidence: 2 negative + 2 positive, with snippet, rating, date
            neg_samples = [r for r in reviews if r["sentiment"] == "negative"][:2]
            pos_samples = [r for r in reviews if r["sentiment"] == "positive"][:2]
            sample_reviews = []
            for r in neg_samples + pos_samples:
                sample_reviews.append({
                    "snippet": (r.get("text") or "")[:300].strip() or "(no text)",
                    "rating": r.get("rating"),
                    "sentiment": r.get("sentiment"),
                    "date": r.get("date", "")[:10],
                    "themes": r.get("themes", [])[:3]
                })

            context_data.append({
                "name": station['name'],
                "address": station['address'],
                "borough": station['borough'],
                "avg_rating": station['avg_rating'],
                "review_count": len(reviews),
                "sentiment": sentiment_data,
                "top_themes": themes,
                "top_positive_themes": top_positives,
                "top_negative_themes": top_negatives,
                "monthly_trends": monthly_trends,
                "improvement": improvement,
                "sample_reviews": sample_reviews
            })

        # Create context for Claude
        context = f"""You are an analyst for Shell gas station customer reviews in London (Google Places API data). Answer using only the data below.

For each station you have:
- name, address, borough, avg_rating, review_count
- sentiment: overall positive/neutral/negative % for the period
- top_themes: all common themes; top_positive_themes: praised aspects; top_negative_themes: complaints (use these for "complaints about X" and "reasons for 1-star reviews")
- monthly_trends: sentiment by calendar month (oldest first); improvement: improving/declining/stable + first vs last month positive % (use for "which stations improved the most")
- sample_reviews: short snippets with rating, date, sentiment, themes — quote these when giving supporting evidence

Instructions:
1. Be specific: always name stations and cite themes (e.g. "Shell Kensington – complaints about cleanliness").
2. Provide evidence: when relevant, quote or paraphrase from sample_reviews (e.g. "One customer wrote: '...'").
3. If the data does not support an answer (e.g. no reviews, no themes for that topic), say so clearly: "Information is insufficient because ...".

Data covers the full span of available reviews (not limited by the dashboard time filter).

Stations data:
{json.dumps(context_data, indent=2)}

User question: {user_question}

Answer as an analyst: specific, with station names, themes, and supporting evidence. State clearly when information is insufficient."""

        # Call Claude API
        if not os.environ.get("ANTHROPIC_API_KEY"):
            return jsonify({
                "answer": f"AI chatbot requires an Anthropic API key. Based on the data: We have {len(all_stations)} Shell stations in London. " +
                         "Common positive themes include helpful staff and clean facilities. " +
                         "Common negative themes include long queues and maintenance issues."
            })
        
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": context}
            ]
        )
        
        answer = message.content[0].text
        
        return jsonify({
            "answer": answer,
            "question": user_question
        })
    
    except Exception as e:
        return jsonify({
            "answer": f"I encountered an error processing your question. Error: {str(e)}",
            "error": str(e)
        }), 200

@app.route('/api/refresh', methods=['POST'])
def refresh_data():
    """Force refresh station data from Google Places API"""
    try:
        STATION_CACHE['data'] = None
        STATION_CACHE['timestamp'] = None
        
        stations = fetch_shell_stations()
        
        return jsonify({
            "message": "Data refreshed successfully",
            "station_count": len(stations)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
