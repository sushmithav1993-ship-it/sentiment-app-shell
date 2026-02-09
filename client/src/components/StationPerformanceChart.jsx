import { useEffect, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import axios from 'axios';
import { Star } from 'lucide-react';

const STATUS_COLORS = {
  improving: '#10b981',
  deteriorating: '#ef4444',
  stable: '#9ca3af'
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass p-4 rounded-lg border border-slate-600 min-w-[320px]">
        {/* Station Name & Address */}
        <p className="text-base font-bold mb-1 text-slate-200">{data.name}</p>
        {data.address && (
          <p className="text-xs text-slate-400 mb-4">{data.address}</p>
        )}
        
        {/* Two Column Layout: Previous vs Current */}
        <div className="grid grid-cols-2 gap-4">
          {/* Previous Period */}
          <div className="border-r border-slate-600 pr-3">
            <p className="text-xs font-semibold text-slate-400 mb-2">Previous Period</p>
            <div className="flex items-center gap-1 mb-2">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-bold text-slate-200">{data.prev_rating}</span>
              <span className="text-xs text-slate-500 ml-1">{data.review_counts.prev} reviews</span>
            </div>
            {data.prev_sentiment && (
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-green-400">Positive</span>
                  <span className="text-slate-300">{data.prev_sentiment.positive}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-400">Neutral</span>
                  <span className="text-slate-300">{data.prev_sentiment.neutral}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-400">Negative</span>
                  <span className="text-slate-300">{data.prev_sentiment.negative}%</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Current Period */}
          <div className="pl-3">
            <p className="text-xs font-semibold text-slate-400 mb-2">Current Period</p>
            <div className="flex items-center gap-1 mb-2">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-bold text-slate-200">{data.curr_rating}</span>
              <span className="text-xs text-slate-500 ml-1">{data.review_counts.curr} reviews</span>
            </div>
            {data.curr_sentiment && (
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-green-400">Positive</span>
                  <span className="text-slate-300">{data.curr_sentiment.positive}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-400">Neutral</span>
                  <span className="text-slate-300">{data.curr_sentiment.neutral}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-400">Negative</span>
                  <span className="text-slate-300">{data.curr_sentiment.negative}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Status Indicator */}
        <div className="mt-3 pt-3 border-t border-slate-600">
          <p className={`text-xs font-medium ${
            data.status === 'improving' ? 'text-green-400' :
            data.status === 'deteriorating' ? 'text-red-400' : 'text-slate-400'
          }`}>
            {data.status === 'improving' ? '↑ Improving' :
             data.status === 'deteriorating' ? '↓ Deteriorating' : '→ Stable'}
            {data.change !== 0 && (
              <span className="ml-2">({data.change > 0 ? '+' : ''}{data.change})</span>
            )}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const StationPerformanceChart = ({ days = 90, stationId = null }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformance();
  }, [days, stationId]);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const url = stationId
        ? `http://localhost:5001/api/station_performance?days=${days}&station_id=${stationId}`
        : `http://localhost:5001/api/station_performance?days=${days}`;
      const response = await axios.get(url);
      setData(response.data.stations || []);
    } catch (error) {
      console.error('Error fetching station performance:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-2">Station Performance: Improving vs Deteriorating</h3>
        <p className="text-sm text-slate-400 mb-4">
          Stations above the diagonal line are improving, below are getting worse
        </p>
        <div className="h-80 flex items-center justify-center text-slate-400">
          No performance data available for this period
        </div>
      </div>
    );
  }

  // Find max rating to scale axes (start at 0,0)
  const allRatings = data.flatMap(s => [s.prev_rating, s.curr_rating]);
  const maxRating = Math.ceil(Math.max(...allRatings) * 10) / 10;

  // Group by status for legend
  const improving = data.filter(s => s.status === 'improving');
  const deteriorating = data.filter(s => s.status === 'deteriorating');
  const stable = data.filter(s => s.status === 'stable');

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-1">Station Performance: Improving vs Deteriorating</h3>
      <p className="text-sm text-slate-400 mb-4">
        Stations above the diagonal line are improving, below are getting worse
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            type="number"
            dataKey="prev_rating"
            name="Previous Period Rating"
            domain={[0, maxRating]}
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{ value: 'Previous Period Rating', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="curr_rating"
            name="Current Period Rating"
            domain={[0, maxRating]}
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{ value: 'Current Period Rating', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            segment={[{ x: 0, y: 0 }, { x: maxRating, y: maxRating }]}
            stroke="#64748b"
            strokeDasharray="5 5"
            strokeWidth={1.5}
          />
          {/* Improving stations */}
          {improving.length > 0 && (
            <Scatter name="Improving" data={improving} fill={STATUS_COLORS.improving}>
              {improving.map((entry, index) => (
                <Cell key={`improving-${index}`} fill={STATUS_COLORS.improving} />
              ))}
            </Scatter>
          )}
          {/* Deteriorating stations */}
          {deteriorating.length > 0 && (
            <Scatter name="Deteriorating" data={deteriorating} fill={STATUS_COLORS.deteriorating}>
              {deteriorating.map((entry, index) => (
                <Cell key={`deteriorating-${index}`} fill={STATUS_COLORS.deteriorating} />
              ))}
            </Scatter>
          )}
          {/* Stable stations */}
          {stable.length > 0 && (
            <Scatter name="Stable" data={stable} fill={STATUS_COLORS.stable}>
              {stable.map((entry, index) => (
                <Cell key={`stable-${index}`} fill={STATUS_COLORS.stable} />
              ))}
            </Scatter>
          )}
        </ScatterChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span className="text-xs text-slate-300">Improving</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span className="text-xs text-slate-300">Deteriorating</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-slate-500"></div>
          <span className="text-xs text-slate-300">Stable</span>
        </div>
      </div>
    </div>
  );
};

export default StationPerformanceChart;
