import { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, AlertTriangle } from 'lucide-react';

const NotableSpikes = ({ days = 90 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpikes = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:5001/api/notable_spikes?days=${days}`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching notable spikes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpikes();
  }, [days]);

  if (loading) return null;
  if (!data || !data.spikes || data.spikes.length === 0) return null;

  const { spikes } = data;

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Activity className="w-5 h-5 mr-2 text-emerald-400" />
        Notable Spikes (Themes)
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        Comparing current vs previous {days}-day period across all stations. High sensitivity to catch even small anomalies.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {spikes.map((item, index) => (
          <div
            key={`${item.topic}-${item.type}-${index}`}
            className="p-4 bg-slate-800/50 rounded-lg border border-emerald-500/20"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  {item.topic || item.short_name}
                </p>
                <p className="text-xs text-slate-400">
                  {item.type === 'complaint' ? 'Complaints' : 'Praises'} about {item.short_name}
                </p>
              </div>
              <span
                className={`inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-full ${
                  item.type === 'complaint'
                    ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                    : 'bg-green-500/10 text-green-300 border border-green-500/30'
                }`}
              >
                {item.type === 'complaint' ? 'Complaint spike' : 'Praise spike'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400">
                {item.previous_count} → {item.current_count} mentions
              </span>
              <span className="text-emerald-400 font-semibold">
                {item.change_percent >= 0 ? '+' : ''}
                {item.change_percent}%
              </span>
            </div>

            {item.previous_count === 0 && item.current_count >= 2 && (
              <div className="flex items-center text-[11px] text-amber-300 mt-1">
                <AlertTriangle className="w-3 h-3 mr-1" />
                New emerging theme in this period
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotableSpikes;

