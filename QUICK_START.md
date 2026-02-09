# Quick Start Guide - Google API Version

## 🔑 Step 1: Get Your Google Places API Key (2 minutes)

### Option A: Quick Setup (Recommended)
1. Visit: https://console.cloud.google.com/
2. Click "Select a Project" → "New Project"
3. Name it (e.g., "Shell Sentiment App")
4. Click "APIs & Services" → "Enable APIs and Services"
5. Search for "Places API" → Enable it
6. Click "Credentials" → "Create Credentials" → "API Key"
7. **Copy your API key** (starts with `AIza...`)

### Option B: Secure Setup (Production)
- Same as above, but add API restrictions:
- Click "Restrict Key"
- API restrictions → Select "Places API"
- Save

## 🚀 Step 2: Backend Setup (2 minutes)

```bash
# Navigate to server
cd server

# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # Mac/Linux
# OR
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file and add your API key
echo "GOOGLE_PLACES_API_KEY=your_key_here" > .env
# Replace 'your_key_here' with your actual key

# Start server
python main.py
```

**What happens on first run:**
```
🔍 Fetching fresh data from Google Places API...
Fetching details for station 1: Shell Kensington
Fetching details for station 2: Shell Camden
...
✅ Fetched 20 stations from Google Places API
 * Running on http://127.0.0.1:5001
```

This takes 1-2 minutes. Data is then cached for 1 hour.

## 🎨 Step 3: Frontend Setup (1 minute)

Open a **new terminal**:

```bash
cd client
npm install
npm run dev
```

Opens automatically at: **http://localhost:5173**

## ✅ You're Done!

### What You Should See:

1. **Map View:**
   - Real Shell stations on London map
   - Color-coded pins (green = good, red = bad)
   - Click pins for details

2. **Dashboard:**
   - Overall sentiment metrics
   - Top complaints and praises
   - Rising issues

3. **AI Assistant:**
   - Ask questions about reviews
   - Get specific answers

## 🧪 Test It Out

### Try These Actions:

1. **Filter by Sentiment:**
   - Click filter icon (top-left)
   - Set sentiment to "negative"
   - See only problematic stations

2. **View Station Details:**
   - Click any red pin
   - See detailed sentiment breakdown
   - Read actual Google reviews

3. **Ask AI Questions:**
   - Go to AI Assistant tab
   - Ask: "Which stations have toilet complaints?"
   - Get data-driven answers

## 🔄 Refresh Data

To get fresh data from Google:

```bash
curl -X POST http://localhost:5001/api/refresh
```

Or just wait 1 hour for automatic refresh.

## ⚠️ Common First-Time Issues

### Issue: "No Google Places API key found"
**Solution:**
```bash
cd server
ls -la  # Check if .env exists
cat .env  # Verify key is there
# If not, create it:
echo "GOOGLE_PLACES_API_KEY=your_actual_key" > .env
```

### Issue: "OVER_QUERY_LIMIT"
**Solution:**
- You've used your free quota for today
- Wait 24 hours or upgrade Google Cloud plan
- App will use cached data automatically

### Issue: "Port already in use"
**Solution:**
```bash
# Kill process on port 5001
lsof -ti:5001 | xargs kill -9  # Mac/Linux
# OR change port in main.py: app.run(port=5002)
```

### Issue: Only seeing 2 stations
**Solution:**
- API key not set correctly
- App is using fallback mock data
- Check .env file has correct key

## 💡 Pro Tips

1. **Test Without API Key First:**
   - App works with 2 sample stations
   - Good for UI testing
   - Add API key when ready

2. **Monitor API Usage:**
   - Check Google Cloud Console
   - Free tier: 500 requests/day
   - Each load = ~21 requests

3. **Save API Calls:**
   - Data cached for 1 hour
   - Only refresh when needed
   - Increase cache to 24hr for production

4. **Add Anthropic API Key (Optional):**
   ```bash
   # In .env file, add:
   ANTHROPIC_API_KEY=sk-ant-...
   ```
   - Enables AI chatbot
   - Not required for map/dashboard

## 📊 What to Expect

**Initial Load:**
- 20 Shell stations in London
- 5 reviews per station (Google limit)
- Real customer ratings
- Actual addresses and coordinates

**Sentiment Analysis:**
- Automatic classification (positive/neutral/negative)
- Theme extraction (toilets, queues, staff, etc.)
- Trend detection (rising issues)

**Performance:**
- Map loads instantly (uses cache)
- Filters apply in real-time
- Smooth animations

## 🎯 Next Steps

1. ✅ Explore different filters
2. ✅ Check dashboard metrics
3. ✅ Ask AI questions
4. ✅ View sentiment trends
5. ✅ Customize for your needs

## 📝 File Checklist

Make sure you have:

- ✅ `server/.env` with `GOOGLE_PLACES_API_KEY`
- ✅ `server/venv/` (virtual environment)
- ✅ `client/node_modules/` (npm packages)
- ✅ Backend running on port 5001
- ✅ Frontend running on port 5173

## 🆘 Still Having Issues?

1. Check Flask console for errors
2. Check browser console (F12)
3. Verify API key works:
   ```bash
   curl "https://maps.googleapis.com/maps/api/place/textsearch/json?query=Shell&key=YOUR_KEY"
   ```
4. Make sure Places API is enabled in Google Cloud

## 🎉 Success!

You now have a fully functional Shell sentiment analysis platform with real Google data!

**Enjoy exploring customer sentiment!** 🚗⛽📊
