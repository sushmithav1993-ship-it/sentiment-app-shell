import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';
import { BarChart3 } from 'lucide-react';

const TopicSentimentChart = ({ days = 90, stationId = null }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopicSentiment();
  }, [days, stationId]);

  const fetchTopicSentiment = async () => {
    try {
      setLoading(true);
      const url = stationId
        ? `http://localhost:5001/api/topic_sentiment_overview?days=${days}&station_id=${stationId}`
        : `http://localhost:5001/api/topic_sentiment_overview?days=${days}`;
      const response = await axios.get(url);
      setData(response.data.topics || []);
    } catch (error) {
      console.error('Error fetching topic sentiment:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass p-4 rounded-lg border border-slate-600">
          <p className="text-sm font-semibold mb-2">{data.topic}</p>
          <div className="space-y-1 text-xs">
            <p className="text-green-400">
              Positive: {data.positive_count} mentions
            </p>
            <p className="text-red-400">
              Negative: {data.negative_count} mentions
            </p>
            <p className="text-slate-300">
              Total: {data.total_count} mentions
            </p>
            <p className={`font-semibold ${data.net_sentiment >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              Net Sentiment: {data.net_sentiment > 0 ? '+' : ''}{data.net_sentiment}%
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
          No topic sentiment data available
        </div>
      </div>
    );
  }

  // Prepare data for diverging bar chart
  // We need to show positive values extending right (positive) and negative values extending left (negative)
  const chartData = data.map(item => ({
    ...item,
    // For positive net sentiment, show positive value; for negative, show as negative
    value: item.net_sentiment,
  }));

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <BarChart3 className="w-5 h-5 mr-2" />
        Topic Sentiment Overview
      </h3>
      <p className="text-xs text-slate-400 mb-4">
        Shows which topics are strengths (right/green) vs pain points (left/red)
      </p>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 50)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            type="number"
            domain={[-50, 50]}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{ value: 'Net Sentiment by Topic (Positive → Negative ←)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
            tickFormatter={(value) => `${value >= 0 ? '+' : ''}${value}`}
          />
          <YAxis
            type="category"
            dataKey="topic"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="value"
            radius={[0, 0, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.net_sentiment >= 0 ? '#10b981' : '#ef4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopicSentimentChart;
