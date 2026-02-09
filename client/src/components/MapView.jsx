import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { MapPin, Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons based on sentiment
const createCustomIcon = (sentiment) => {
  const colors = {
    positive: '#10b981',
    neutral: '#f59e0b',
    negative: '#ef4444'
  };
  
  const color = colors[sentiment] || '#64748b';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(45deg);
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const MapUpdater = ({ stations }) => {
  const map = useMap();
  
  useEffect(() => {
    if (stations.length > 0) {
      const bounds = L.latLngBounds(stations.map(s => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stations, map]);
  
  return null;
};

const MapView = ({ filters, onStationSelect, onViewDashboard }) => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStations();
  }, [filters]);

  const fetchStations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null) {
          params.append(key, value);
        }
      });
      
      const response = await axios.get(`http://localhost:5001/api/stations?${params}`);
      setStations(response.data.stations);
    } catch (error) {
      console.error('Error fetching stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch(sentiment) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getSentimentBadge = (sentiment) => {
    const classes = {
      positive: 'sentiment-positive',
      neutral: 'sentiment-neutral',
      negative: 'sentiment-negative'
    };
    return `${classes[sentiment]} px-3 py-1 rounded-full text-xs font-semibold text-white`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-800 rounded-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <MapContainer
        center={[51.5074, -0.1278]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapUpdater stations={stations} />
        
        {stations.map((station) => (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={createCustomIcon(station.dominant_sentiment)}
            eventHandlers={{
              click: () => onStationSelect(station.id)
            }}
          >
            <Popup className="custom-popup">
              <div className="p-2 min-w-[320px]">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg pr-2">{station.name}</h3>
                  {getSentimentIcon(station.dominant_sentiment)}
                </div>
                <p className="text-xs text-slate-400 mb-3">{station.address}</p>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Left: Overall */}
                  <div className="border-r border-slate-600 pr-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Overall</p>
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold text-sm">{station.overall_avg_rating ?? station.avg_rating}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{station.overall_review_count ?? 0} reviews</span>
                    <div className="space-y-0.5 mt-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-green-400">+</span>
                        <span>{(station.overall_sentiment_breakdown || {}).positive ?? 0}%</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-yellow-400">~</span>
                        <span>{(station.overall_sentiment_breakdown || {}).neutral ?? 0}%</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-red-400">−</span>
                        <span>{(station.overall_sentiment_breakdown || {}).negative ?? 0}%</span>
                      </div>
                    </div>
                  </div>
                  {/* Right: Current period */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Last {filters.days ?? 90} days</p>
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold text-sm">{station.current_avg_rating ?? '–'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{station.current_review_count ?? 0} reviews</span>
                    <div className="space-y-0.5 mt-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-green-400">+</span>
                        <span>{station.sentiment_breakdown?.positive ?? 0}%</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-yellow-400">~</span>
                        <span>{station.sentiment_breakdown?.neutral ?? 0}%</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-red-400">−</span>
                        <span>{station.sentiment_breakdown?.negative ?? 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onViewDashboard && onViewDashboard(station.id)}
                  className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold rounded-lg transition text-sm"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {stations.length === 0 && !loading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center bg-slate-800/90 p-8 rounded-xl">
          <MapPin className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-300 font-medium">No stations match your filters</p>
          <p className="text-slate-500 text-sm mt-2">Try adjusting your filter criteria</p>
        </div>
      )}
    </div>
  );
};

export default MapView;
