# Shell Customer Sentiment Analysis Platform

A full-stack interactive web application for analyzing customer sentiment across Shell gas stations in London using **real Google Places API data**. Built with React, Flask, and Claude AI.

## 🎯 Key Features

### ✨ Real Google Places API Integration
- **Live data** from Google Places API
- Automatic fetching of Shell stations in London  
- Real customer reviews with ratings and timestamps
- 1-hour intelligent caching to optimize API usage
- Manual refresh endpoint available

### 🗺️ Interactive Map & Analysis
- Visual map of Shell stations across London
- Color-coded sentiment pins (green/yellow/red)
- Advanced filtering (rating, sentiment, borough, time)
- AI-powered chatbot for natural language queries
- Executive dashboard with key metrics
- Sentiment trends over time

## 🚀 Quick Start (5 Minutes)

### Step 1: Get API Keys

**Google Places API (Required):**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable "Places API" → Create API Key
3. Copy your API key

**Anthropic API (Optional for AI chatbot):**
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create API Key
3. Copy your API key

### Step 2: Backend Setup

```bash
cd server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add: GOOGLE_PLACES_API_KEY=your_key_here

python main.py
```

First run fetches Shell stations from Google (takes 1-2 minutes).
Server starts on `http://localhost:5001`

### Step 3: Frontend Setup

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173` - Done! 🎉

## 📊 How It Works

### Data Flow

```
Google Places API → Flask Backend → React Frontend
        ↓                ↓              ↓
   20 Stations      Caching (1hr)   Interactive UI
   Real Reviews     Sentiment        Maps & Charts
                    Theme Extract.   AI Chatbot
```

### What Gets Fetched

1. **Search Query:** "Shell gas station in London"
2. **Stations Found:** Up to 20 Shell locations
3. **Per Station:**
   - Name, address, coordinates
   - Overall rating
   - Up to 5 most relevant reviews
   - Phone, website, hours

4. **Review Processing:**
   - Sentiment classification (positive/neutral/negative)
   - Theme extraction (cleanliness, staff, queues, etc.)
   - Time filtering (30/90/180/365 days)

### Caching Strategy

- Data cached for **1 hour**
- Automatic refresh after cache expires
- Manual refresh: `POST /api/refresh`
- Reduces API costs by ~96%

## 🎮 Usage Examples

### Example 1: Find Problem Stations
1. Open map view
2. Filter: Sentiment = "Negative"
3. Filter: Min Reviews = 50
4. Click red pins to see complaints

### Example 2: Ask AI Questions
1. Click "AI Assistant" tab
2. Ask: "Which stations have toilet complaints?"
3. Get specific answers with station names

### Example 3: Monitor Trends
1. Click "Dashboard" tab
2. View "Rising Issues" section
3. See what's getting worse in last 30 days

## 🔧 API Endpoints

```bash
# Get all stations
GET /api/stations?sentiment=negative&min_rating=0&max_rating=3

# Get station details
GET /api/stations/1?days=90

# Get overview
GET /api/overview?days=90

# Get trends
GET /api/trends?days=90&station_id=1

# Ask AI chatbot
POST /api/chat
Body: {"question": "Which stations need attention?"}

# Refresh data
POST /api/refresh
```

## 💰 API Costs

### Google Places API
- **Free tier:** $200/month credit
- **This app:** ~$0.70 per load (1 search + 20 details)
- **With caching:** ~$17/day (hourly refresh)
- **Recommendation:** Use 24hr cache for production

### Anthropic Claude API
- **Cost:** ~$0.003 per question
- **Optional:** App works without it

## 🐛 Troubleshooting

**"No Google Places API key found"**
- Create `.env` file in `server/` directory
- Add: `GOOGLE_PLACES_API_KEY=your_key`
- Restart Flask server

**"OVER_QUERY_LIMIT" error**
- Exceeded Google API quota (500 free requests/day)
- Wait 24 hours or upgrade plan
- App uses cached data automatically

**No reviews showing**
- Google limits to 5 reviews per station
- Some stations may have fewer reviews
- Try different time periods

**Map not loading**
- Check internet connection (uses online tiles)
- Open browser console for errors

## 📁 Project Structure

```
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/       # 6 React components
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
└── server/                    # Flask Backend
    ├── main.py               # API + Google Places integration
    ├── requirements.txt
    └── .env.example
```

## 🔄 Mock vs Real Data

| Feature | Mock | Real (Google API) |
|---------|------|------------------|
| Stations | 8 hardcoded | 20+ real Shell stations |
| Reviews | Generated | Actual Google reviews |
| Cost | Free | ~$25/month |
| Setup | Ready instantly | Need API key |

**The app works both ways!** Without API key, uses 2 sample stations for testing.

## 🚀 Production Tips

1. **Increase cache to 24 hours:**
   ```python
   'ttl': 86400  # in main.py
   ```

2. **Add database** for historical data

3. **Limit stations** to reduce API calls

4. **Monitor quotas** in Google Cloud Console

## 📝 Environment Variables

```env
# server/.env file

# Required for real data
GOOGLE_PLACES_API_KEY=your_google_key_here

# Optional for AI chatbot
ANTHROPIC_API_KEY=your_anthropic_key_here
```

## 🎨 Features Implemented

✅ Real Google Places API integration  
✅ Interactive Leaflet map  
✅ Advanced filtering system  
✅ AI-powered chatbot (Claude)  
✅ Executive dashboard  
✅ Sentiment trend charts  
✅ Theme extraction  
✅ Rising issues detection  
✅ Manual data refresh  
✅ Intelligent caching  
✅ Fallback mock data  

## 🆘 Need Help?

1. Check logs in Flask console
2. Check browser console (F12)
3. Verify API keys in `.env`
4. Test with: `curl http://localhost:5001/api/stations`

## 📄 License

For demonstration purposes.

---

**Built with React + Flask + Google Places API + Claude AI**

Ready to analyze real Shell customer sentiment! 🚗⛽📊
