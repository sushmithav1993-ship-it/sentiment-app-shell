import { useEffect, useState } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, Zap, Award } from 'lucide-react';

const KeyInsightsCards = ({ days = 90 }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:5001/api/key_insights?days=${days}`);
        setInsights(response.data);
      } catch (error) {
        console.error('Error fetching key insights:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, [days]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-700/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!insights) return null;

  const cards = [
    {
      title: 'Biggest Riser',
      subtitle: 'Quick snapshot of the most important changes',
      label: insights.biggest_riser?.topic || '—',
      detail: insights.biggest_riser
        ? `↑ +${insights.biggest_riser.change_pct}% mentions (positive)`
        : 'No data',
      gradient: 'from-emerald-600 to-emerald-800',
      icon: TrendingUp,
    },
    {
      title: 'Biggest Decliner',
      label: insights.biggest_decliner?.topic || '—',
      detail: insights.biggest_decliner
        ? `↓ +${insights.biggest_decliner.change_pct}% complaints`
        : 'No data',
      gradient: 'from-red-600 to-orange-700',
      icon: TrendingDown,
    },
    {
      title: 'Hot Topic This Week',
      label: insights.hot_topic?.topic || '—',
      detail: insights.hot_topic
        ? `⚡ ${insights.hot_topic.multiplier}x spike in mentions`
        : 'No data',
      gradient: 'from-sky-500 to-blue-600',
      icon: Zap,
    },
    {
      title: 'Most Improved Station',
      label: insights.most_improved_station?.name || '—',
      detail: insights.most_improved_station
        ? `↑ ${insights.most_improved_station.prev_rating} → ${insights.most_improved_station.curr_rating} stars`
        : 'No data',
      address: insights.most_improved_station?.address || null,
      gradient: 'from-violet-600 to-purple-800',
      icon: Award,
    },
  ];

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-slate-200 mb-1">Key Insights At-a-Glance</h2>
      <p className="text-xs text-slate-500 mb-4">Quick snapshot of the most important changes</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`rounded-xl p-5 bg-gradient-to-br ${card.gradient} shadow-lg border border-white/10`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-white/90" />
                <span className="text-xs font-medium text-white/80 uppercase tracking-wide">
                  {card.title}
                </span>
              </div>
              <p className="text-lg font-bold text-white mb-1 truncate" title={card.label}>
                {card.label}
              </p>
              <p className="text-sm text-white/90">{card.detail}</p>
              {card.address && (
                <p className="text-xs text-white/80 mt-2 truncate" title={card.address}>
                  {card.address}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KeyInsightsCards;
