import { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';

const defaultFilters = {
  min_rating: 0,
  max_rating: 5,
  sentiment: '',
  borough: '',
  min_reviews: 0,
  days: 90
};

const FilterPanel = ({ filters: parentFilters, onFilterChange, isOpen, onToggle }) => {
  const [filters, setFilters] = useState(parentFilters || defaultFilters);

  // Keep in sync with parent (e.g. when time period is changed in header)
  useEffect(() => {
    if (parentFilters) setFilters(parentFilters);
  }, [parentFilters]);

  const handleChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-[1000] glass p-3 rounded-lg card-hover"
      >
        <Filter className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed top-4 left-4 z-[1000] glass rounded-xl p-6 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold font-display flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filters
        </h2>
        <button onClick={onToggle} className="p-2 hover:bg-slate-700 rounded-lg transition">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Rating Range */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Rating Range
          </label>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={filters.min_rating}
                onChange={(e) => handleChange('min_rating', parseFloat(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Min"
              />
            </div>
            <span className="text-slate-400">to</span>
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={filters.max_rating}
                onChange={(e) => handleChange('max_rating', parseFloat(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Max"
              />
            </div>
          </div>
        </div>

        {/* Sentiment Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Sentiment
          </label>
          <select
            value={filters.sentiment}
            onChange={(e) => handleChange('sentiment', e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>

        {/* Borough Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Borough
          </label>
          <select
            value={filters.borough}
            onChange={(e) => handleChange('borough', e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="">All Boroughs</option>
            <option value="Central">Central</option>
            <option value="East">East</option>
            <option value="West">West</option>
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="North East">North East</option>
            <option value="North West">North West</option>
            <option value="South East">South East</option>
            <option value="South West">South West</option>
          </select>
        </div>

        {/* Minimum Reviews */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Minimum Reviews: {filters.min_reviews}
          </label>
          <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={filters.min_reviews}
            onChange={(e) => handleChange('min_reviews', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #FBCE07 0%, #FBCE07 ${(filters.min_reviews / 500) * 100}%, #475569 ${(filters.min_reviews / 500) * 100}%, #475569 100%)`
            }}
          />
        </div>

        {/* Time Period */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Time Period
          </label>
          <select
            value={filters.days}
            onChange={(e) => handleChange('days', parseInt(e.target.value))}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetFilters}
          className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition"
        >
          Reset All Filters
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;
