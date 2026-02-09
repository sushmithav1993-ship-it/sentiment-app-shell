import { useEffect, useState } from 'react';
import { X, Star, ThumbsUp, ThumbsDown, TrendingUp, MessageSquare, Calendar } from 'lucide-react';
import axios from 'axios';

const StationCard = ({ stationId, onClose, days = 90 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (stationId) {
      fetchStationDetails();
    }
  }, [stationId, days]);

  const fetchStationDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5001/api/stations/${stationId}?days=${days}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching station details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!stationId) return null;

  if (loading) {
    return (
      <div className="fixed right-4 top-4 bottom-4 w-[500px] glass rounded-xl p-6 z-[1000] overflow-y-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    station,
    sentiment_breakdown,
    overall_sentiment_breakdown,
    overall_avg_rating,
    overall_review_count,
    current_avg_rating,
    current_review_count,
    top_positives,
    top_negatives,
    positive_samples,
    negative_samples,
    review_count
  } = data;

  const renderSentimentBars = (breakdown) => {
    if (!breakdown) return null;
    return (
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-green-400">Positive</span>
            <span className="text-slate-300">{breakdown.positive}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-green-400" style={{ width: `${breakdown.positive}%` }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-yellow-400">Neutral</span>
            <span className="text-slate-300">{breakdown.neutral}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400" style={{ width: `${breakdown.neutral}%` }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-red-400">Negative</span>
            <span className="text-slate-300">{breakdown.negative}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-500 to-red-400" style={{ width: `${breakdown.negative}%` }}></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed right-4 top-4 bottom-4 w-[500px] glass rounded-xl p-6 z-[1000] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold font-display mb-1">{station.name}</h2>
          <p className="text-sm text-slate-400">{station.address}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition flex-shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Overall (top) */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2" />
          Overall
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center mb-1">
              <Star className="w-4 h-4 text-yellow-400 mr-2" />
              <span className="text-xs text-slate-400">Average Rating</span>
            </div>
            <p className="text-xl font-bold">{overall_avg_rating ?? station.avg_rating}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center mb-1">
              <MessageSquare className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-xs text-slate-400">Reviews</span>
            </div>
            <p className="text-xl font-bold">{overall_review_count ?? review_count}</p>
          </div>
        </div>
        <div className="text-xs text-slate-400 mb-2">Sentiment distribution</div>
        {renderSentimentBars(overall_sentiment_breakdown)}
      </div>

      {/* Current period (bottom) */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2" />
          Last {days} days
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center mb-1">
              <Star className="w-4 h-4 text-yellow-400 mr-2" />
              <span className="text-xs text-slate-400">Average Rating</span>
            </div>
            <p className="text-xl font-bold">{current_avg_rating ?? '–'}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center mb-1">
              <MessageSquare className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-xs text-slate-400">Reviews</span>
            </div>
            <p className="text-xl font-bold">{current_review_count ?? 0}</p>
          </div>
        </div>
        <div className="text-xs text-slate-400 mb-2">Sentiment distribution</div>
        {renderSentimentBars(sentiment_breakdown)}
      </div>

      {/* Top Positives */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
          <ThumbsUp className="w-4 h-4 mr-2 text-green-400" />
          Top Praised Aspects
        </h3>
        <div className="space-y-2">
          {top_positives.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <span className="text-sm text-slate-200">{item.theme}</span>
              <span className="text-xs text-green-400 font-medium">{item.count}×</span>
            </div>
          ))}
        </div>
      </div>

      {/* Positive Samples */}
      {positive_samples.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-medium text-slate-400 mb-2">Sample Positive Reviews:</h4>
          <div className="space-y-2">
            {positive_samples.map((review, index) => (
              <div key={index} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(review.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Negatives */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
          <ThumbsDown className="w-4 h-4 mr-2 text-red-400" />
          Top Complaints
        </h3>
        <div className="space-y-2">
          {top_negatives.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="text-sm text-slate-200">{item.theme}</span>
              <span className="text-xs text-red-400 font-medium">{item.count}×</span>
            </div>
          ))}
        </div>
      </div>

      {/* Negative Samples */}
      {negative_samples.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-medium text-slate-400 mb-2">Sample Negative Reviews:</h4>
          <div className="space-y-2">
            {negative_samples.map((review, index) => (
              <div key={index} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(review.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StationCard;
