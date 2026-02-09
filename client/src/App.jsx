import { useState } from 'react';
import { Fuel, Map, MessageSquare, BarChart3 } from 'lucide-react';
import MapView from './components/MapView';
import Dashboard from './components/Dashboard';
import FilterPanel from './components/FilterPanel';
import StationCard from './components/StationCard';
import ChatBot from './components/ChatBot';
import TrendChart from './components/TrendChart';
import StationPerformanceChart from './components/StationPerformanceChart';

function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [filters, setFilters] = useState({
    min_rating: 0,
    max_rating: 5,
    sentiment: '',
    borough: '',
    min_reviews: 0,
    days: 90
  });
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [selectedStationForDashboard, setSelectedStationForDashboard] = useState(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [dashboardOpenedViaMap, setDashboardOpenedViaMap] = useState(false);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleStationSelect = (stationId) => {
    setSelectedStationId(stationId);
  };

  const handleViewDashboard = (stationId) => {
    setSelectedStationForDashboard(stationId);
    setDashboardOpenedViaMap(true);
    setActiveTab('dashboard');
  };

  const handleTabChange = (tabId) => {
    // Clear station filter when clicking Dashboard tab directly (not via map "View Details" button)
    if (tabId === 'dashboard') {
      // If we're not already on dashboard, clear the filter to show overview
      if (activeTab !== 'dashboard') {
        setSelectedStationForDashboard(null);
      }
      // Reset flag after handling the transition
      setDashboardOpenedViaMap(false);
    } else {
      // Reset flag when switching away from dashboard
      setDashboardOpenedViaMap(false);
    }
    setActiveTab(tabId);
  };

  const tabs = [
    { id: 'map', label: 'Map View', icon: Map },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare }
  ];

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <header className="mb-6">
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-500/20 rounded-xl mr-4">
                <Fuel className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold font-display">Shell Sentiment Analytics</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Customer experience insights across London Shell stations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right mr-4">
                <p className="text-xs text-slate-400 mb-1">Analyzing Period</p>
                <select
                  value={filters.days}
                  onChange={(e) => setFilters(f => ({ ...f, days: parseInt(e.target.value) }))}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm font-semibold text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer"
                >
                  <option value="30">Last 30 days</option>
                  <option value="60">Last 60 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="glass rounded-xl p-2 inline-flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center px-6 py-3 rounded-lg transition font-medium ${
                  activeTab === tab.id
                    ? 'bg-yellow-500 text-slate-900'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative">
        {/* Map View */}
        {activeTab === 'map' && (
          <>
            <FilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              isOpen={filterPanelOpen}
              onToggle={() => setFilterPanelOpen(!filterPanelOpen)}
            />
            <div className="h-[calc(100vh-280px)]">
              <MapView
                filters={filters}
                onStationSelect={handleStationSelect}
                onViewDashboard={handleViewDashboard}
              />
            </div>
            {selectedStationId && (
              <StationCard
                stationId={selectedStationId}
                onClose={() => setSelectedStationId(null)}
                days={filters.days}
              />
            )}
          </>
        )}

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <Dashboard 
              days={filters.days} 
              stationId={selectedStationForDashboard}
              onClearStationFilter={() => {
                setSelectedStationForDashboard(null);
                setDashboardOpenedViaMap(false);
              }}
            />
            <TrendChart days={filters.days} stationId={selectedStationForDashboard} />
            <StationPerformanceChart days={filters.days} stationId={selectedStationForDashboard} />
          </div>
        )}

        {/* Chat View */}
        {activeTab === 'chat' && (
          <div className="h-[calc(100vh-280px)]">
            <ChatBot />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-6 text-center text-slate-500 text-xs">
        <p>Shell Customer Sentiment Analysis Platform • Built with React, Flask & Claude AI</p>
      </footer>
    </div>
  );
}

export default App;
