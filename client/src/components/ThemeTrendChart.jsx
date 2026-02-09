import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { TrendingUp } from 'lucide-react';

// One distinct color per legend item (6 lines: 3 rising praise + 3 rising complaint)
const TOPIC_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const TREND_LABELS = { rising_praise: 'Rising Praise', rising_complaint: 'Rising Complaint' };

const ThemeTrendChart = ({ days = 90 }) => {
  const [data, setData] = useState({ labels: [], themes: [] });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThemeTrends();
  }, [days]);

  const fetchThemeTrends = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5001/api/theme_trends?days=${days}`);
      setData(response.data);
      const { labels = [], themes = [] } = response.data;
      const built = labels.map((name, i) => {
        const point = { name };
        themes.forEach((t) => {
          point[t.key] = t.series[i] ?? 0;
        });
        return point;
      });
      setChartData(built);
    } catch (error) {
      console.error('Error fetching theme trends:', error);
      setChartData([]);
      setData({ labels: [], themes: [] });
    } finally {
      setLoading(false);
    }
  };

  const periodLabel = days <= 30 ? 'past month' : `past ${Math.round(days / 30)} months`;

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      </div>
    );
  }

  if (!data.themes?.length || chartData.length === 0) {
    return (
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-2">Rising Complaints & Praises (Trend Lines)</h3>
        <p className="text-sm text-slate-400 mb-4">Topics trending up or down over the {periodLabel}</p>
        <div className="h-80 flex items-center justify-center text-slate-400">
          No theme trend data available for this period
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-1">Rising Complaints & Praises (Trend Lines)</h3>
      <p className="text-sm text-slate-400 mb-4">
        Mention frequency over the {periodLabel} ({data.labels?.length || 0} {data.labels?.length === 1 ? 'month' : 'months'})
      </p>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={chartData} margin={{ top: 10, right: 25, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="name"
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v) => {
              if (data.labels?.length === 1) return 'This month';
              try {
                const [y, m] = v.split('-');
                return new Date(parseInt(y), parseInt(m, 10) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
              } catch {
                return v;
              }
            }}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{ value: 'Number of Mentions', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value) => [value, '']}
            labelFormatter={(label) => (label === 'This month' ? label : `Month: ${label}`)}
          />
          <Legend
            wrapperStyle={{ paddingTop: '16px' }}
            formatter={(value) => {
              const theme = data.themes?.find((t) => t.key === value);
              const trend = theme?.trend || 'rising_praise';
              const idx = data.themes?.findIndex((t) => t.key === value) ?? 0;
              const color = TOPIC_COLORS[idx % TOPIC_COLORS.length];
              const label = TREND_LABELS[trend] || trend;
              return (
                <span className="flex items-center gap-2 text-sm" style={{ color }}>
                  <TrendingUp className="w-4 h-4" />
                  {theme?.short_name ?? value} ({label})
                </span>
              );
            }}
          />
          {data.themes?.map((t, i) => {
            const color = TOPIC_COLORS[i % TOPIC_COLORS.length];
            return (
              <Line
                key={t.key}
                type="monotone"
                dataKey={t.key}
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, r: 4 }}
                activeDot={{ r: 6 }}
                name={t.key}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ThemeTrendChart;
