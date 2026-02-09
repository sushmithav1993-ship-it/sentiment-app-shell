import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Star, MessageSquare, X } from 'lucide-react';
import axios from 'axios';
import ThemeTrendChart from './ThemeTrendChart';
import NotableSpikes from './NotableSpikes';
import TopicSentimentChart from './TopicSentimentChart';
import KeyInsightsCards from './KeyInsightsCards';

const Dashboard = ({ days = 90, stationId = null, onClearStationFilter }) => {
  const [overview, setOverview] = useState(null);
  const [stationData, setStationData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (stationId) {
      fetchStationDetails();
    } else {
      fetchOverview();
    }
  }, [days, stationId]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5001/api/overview?days=${days}`);
      setOverview(response.data);
      setStationData(null);
    } catch (error) {
      console.error('Error fetching overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStationDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5001/api/stations/${stationId}?days=${days}`);
      setStationData(response.data);
      setOverview(null);
    } catch (error) {
      console.error('Error fetching station details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    if (sentiment >= 50) return 'text-green-400';
    if (sentiment >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass rounded-xl p-6 animate-pulse">
            <div className="h-20 bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // Station-specific view
  if (stationData) {
    const { station, sentiment_breakdown, overall_sentiment_breakdown, overall_avg_rating, overall_review_count, current_avg_rating, current_review_count, top_positives, top_negatives } = stationData;
    const currentSentiment = sentiment_breakdown || { positive: 0, neutral: 0, negative: 0 };
    
    return (
      <div className="space-y-6 mb-6">
        {/* Station Filter Banner */}
        <div className="glass rounded-xl p-4 flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20">
          <div>
            <h2 className="text-lg font-bold text-slate-200">{station.name}</h2>
            <p className="text-sm text-slate-400">{station.address}</p>
          </div>
          <button
            onClick={onClearStationFilter}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
            title="View all stations"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Key Metrics - Station Specific */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-6 card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <span className={`text-2xl font-bold ${getSentimentColor(currentSentiment.positive)}`}>
                {currentSentiment.positive}%
              </span>
            </div>
            <h3 className="text-slate-400 text-sm">Positive Sentiment</h3>
            <p className="text-xs text-slate-500 mt-1">Last {days} days</p>
          </div>

          <div className="glass rounded-xl p-6 card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Star className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="text-2xl font-bold text-yellow-400">
                {current_avg_rating || '–'}
              </span>
            </div>
            <h3 className="text-slate-400 text-sm">Average Rating</h3>
            <p className="text-xs text-slate-500 mt-1">Last {days} days</p>
          </div>

          <div className="glass rounded-xl p-6 card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-blue-400">
                {current_review_count || 0}
              </span>
            </div>
            <h3 className="text-slate-400 text-sm">Reviews</h3>
            <p className="text-xs text-slate-500 mt-1">Last {days} days ({overall_review_count || 0} total)</p>
          </div>

          <div className="glass rounded-xl p-6 card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
              <span className={`text-2xl font-bold ${getSentimentColor(currentSentiment.negative)}`}>
                {currentSentiment.negative}%
              </span>
            </div>
            <h3 className="text-slate-400 text-sm">Negative Sentiment</h3>
            <p className="text-xs text-slate-500 mt-1">Last {days} days</p>
          </div>
        </div>

        {/* Topic Sentiment Overview */}
        <TopicSentimentChart days={days} stationId={stationId} />

        {/* Top Insights - Station Specific */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Positives */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
              Top Praised Aspects
            </h3>
            <div className="space-y-3">
              {top_positives && top_positives.length > 0 ? (
                top_positives.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{item.theme}</span>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                      {item.count} mentions
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No praised aspects found</p>
              )}
            </div>
          </div>

          {/* Top Negatives */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingDown className="w-5 h-5 mr-2 text-red-400" />
              Top Complaints
            </h3>
            <div className="space-y-3">
              {top_negatives && top_negatives.length > 0 ? (
                top_negatives.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{item.theme}</span>
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                      {item.count} mentions
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No complaints found</p>
              )}
            </div>
          </div>
        </div>

        {/* Note: Station-specific charts would go here if needed */}
      </div>
    );
  }

  // Overview view (all stations)
  if (!overview) return null;

  return (
    <div className="space-y-6 mb-6">
      {/* Key Insights At-a-Glance */}
      <KeyInsightsCards days={days} />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <span className={`text-2xl font-bold ${getSentimentColor(overview.overall_sentiment.positive)}`}>
              {overview.overall_sentiment.positive}%
            </span>
          </div>
          <h3 className="text-slate-400 text-sm">Positive Sentiment</h3>
          <p className="text-xs text-slate-500 mt-1">Last {days} days</p>
        </div>

        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Star className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="text-2xl font-bold text-yellow-400">
              {overview.avg_rating}
            </span>
          </div>
          <h3 className="text-slate-400 text-sm">Average Rating</h3>
          <p className="text-xs text-slate-500 mt-1">Across all stations</p>
        </div>

        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-blue-400">
              {overview.total_reviews}
            </span>
          </div>
          <h3 className="text-slate-400 text-sm">Total Reviews</h3>
          <p className="text-xs text-slate-500 mt-1">{overview.total_stations} stations</p>
        </div>

        <div className="glass rounded-xl p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-500/20 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-400" />
            </div>
            <span className={`text-2xl font-bold ${getSentimentColor(overview.overall_sentiment.negative)}`}>
              {overview.overall_sentiment.negative}%
            </span>
          </div>
          <h3 className="text-slate-400 text-sm">Negative Sentiment</h3>
          <p className="text-xs text-slate-500 mt-1">Needs attention</p>
        </div>
      </div>

      {/* Topic Sentiment Overview */}
      <TopicSentimentChart days={days} stationId={null} />

      {/* Top Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Positives */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
            Top Praised Aspects
          </h3>
          <div className="space-y-3">
            {overview.top_positives.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{item.theme}</span>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                  {item.count} mentions
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Negatives */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingDown className="w-5 h-5 mr-2 text-red-400" />
            Top Complaints
          </h3>
          <div className="space-y-3">
            {overview.top_negatives.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{item.theme}</span>
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                  {item.count} mentions
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notable Spikes Across All Stations */}
      <NotableSpikes days={days} />

      {/* Top 5 themes trend chart */}
      <ThemeTrendChart days={days} />
    </div>
  );
};

export default Dashboard;
