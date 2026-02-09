import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { TrendingUp } from 'lucide-react';

const TrendChart = ({ days = 90, stationId = null }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrends();
  }, [days, stationId]);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const url = stationId 
        ? `http://localhost:5001/api/trends?days=${days}&station_id=${stationId}`
        : `http://localhost:5001/api/trends?days=${days}`;
      const response = await axios.get(url);
      setData(response.data.trends);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const metrics = {};
      payload.forEach((p) => {
        if (p && p.dataKey) {
          metrics[p.dataKey] = p.value;
        }
      });
      return (
        <div className="glass p-4 rounded-lg border border-slate-600">
          <p className="text-sm font-semibold mb-2">
            {new Date(label).toLocaleDateString()}
          </p>
          <div className="space-y-1">
            <p className="text-xs text-green-400">
              Positive: {metrics.positive ?? 0}%
            </p>
            <p className="text-xs text-yellow-400">
              Average Rating: {metrics.avg_rating ?? '–'}
            </p>
          </div>
        </div>
      );
    }
    return null;
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

  if (data.length === 0) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="h-80 flex items-center justify-center text-slate-400">
          No trend data available
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <TrendingUp className="w-5 h-5 mr-2" />
        Sentiment Trends Over Time
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="date" 
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis 
            yAxisId="left"
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{ value: 'Positive (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#e5e7eb"
            domain={[0, 5]}
            tick={{ fill: '#e5e7eb', fontSize: 12 }}
            label={{ value: 'Avg Rating', angle: 90, position: 'insideRight', fill: '#e5e7eb' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="positive" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
            name="Positive"
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="avg_rating" 
            stroke="#f59e0b" 
            strokeWidth={2}
            dot={{ fill: '#f59e0b', r: 4 }}
            activeDot={{ r: 6 }}
            name="Average Rating"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;
