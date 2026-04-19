import { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { MapContainer, TileLayer } from 'react-leaflet';
import HeatmapLayer from './HeatmapLayer';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const SERVER_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

function App() {
  const [sensorData, setSensorData] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  
  // Nuevo Estado: Ciudad Seleccionada
  const [selectedCity, setSelectedCity] = useState(null); // null = Vista General

  // Reloj superior principal
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const socket = io(SERVER_URL);

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('nuevo_clima', (data) => {
      const now = Date.now();
      
      // Añadimos marca de tiempo real computada en el navegador para precisión milimétrica
      data.receivedAt = now;
      // Formateo exigido: HH:mm sin segundos
      data.localTime = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute:'2-digit' });
      
      setSensorData(prev => {
        const history = prev[data.name] || [];
        const fifteenMinutesAgo = now - (15 * 60 * 1000); // Exáctos 15 minutos de ventana de tiempo
        
        // Ventana dinámica algorítmica: Filtrar para eliminar automáticamente los datos más antiguos a 15 mins
        const newHistory = [...history, data].filter(d => d.receivedAt >= fifteenMinutesAgo);
        
        return { ...prev, [data.name]: newHistory };
      });
    });

    return () => socket.disconnect();
  }, []);

  const allCities = Object.keys(sensorData);
  // Determina qué ciudades dibujar según si hay una tarifa aislada o vista global activa
  const displayCities = selectedCity ? [selectedCity] : allCities;
  
  const cityColors = {
    'Bogotá': '#ff7a00',
    'Medellín': '#00d2ff',
    'Cali': '#ffcc00',
    'Barranquilla': '#00ff88'
  };
  const fallbackColors = ['#00f0ff', '#ff007f', '#8a2be2', '#00ff88'];

  // Funcion de Ensamblaje Gráfico
  const buildChartData = (label, dataKey) => {
    let labels = [];
    if (displayCities.length > 0 && sensorData[displayCities[0]]) {
      labels = sensorData[displayCities[0]].map(d => d.localTime);
    }

    const datasets = displayCities.map((city, i) => {
      const color = cityColors[city] || fallbackColors[i % fallbackColors.length];
      return {
        label: city,
        data: sensorData[city].map(d => d[dataKey]),
        borderColor: color,
        backgroundColor: color + '2A', // Ligera opacidad para el fill visual
        borderWidth: selectedCity ? 3 : 2, // Lineas más gruesas si vemos solo 1
        pointRadius: selectedCity ? 4 : 2, // Puntos más notorios en modo aislado
        pointBackgroundColor: color,
        fill: label === 'Temperatura' ? false : true,
        tension: 0.1
      };
    });

    return { labels, datasets };
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false } 
    },
    scales: {
      x: { 
        ticks: { color: '#5b6b84', font: { size: 11, family: 'JetBrains Mono' } }, 
        grid: { color: 'rgba(255,255,255,0.04)' } 
      },
      y: { 
        ticks: { color: '#5b6b84', font: { size: 11, family: 'JetBrains Mono' } }, 
        grid: { color: 'rgba(255,255,255,0.04)' } 
      }
    }
  };

  // El heatmap se mantendrá combinado siempre porque un mapa con solo 1 punto no daría perspectiva espacial
  const heatmapPoints = useMemo(() => {
    return allCities.map(city => {
      const history = sensorData[city];
      const latest = history[history.length - 1];
      let intensity = Math.max(0, Math.min(1, (latest.temperature - 5) / 30));
      return {
        lat: latest.coords.lat,
        lon: latest.coords.lon,
        intensity: intensity
      };
    });
  }, [sensorData, allCities]);

  return (
    <div className="dashboard-container">
      {/* Top Navbar */}
      <header className="top-nav">
        <div className="nav-title">
          <span className="icon">🌡️</span>
          <div>
            <h1>IoT Climate Monitor</h1>
            <p>REDIS PUB/SUB • <span style={{color: selectedCity ? '#ffcc00' : '#00d2ff'}}>{selectedCity ? `TRACKING EXCLUSIVO: ${selectedCity.toUpperCase()}` : 'OVERVIEW GLOBAL COMBINADO'}</span></p>
          </div>
        </div>
        <div className="nav-status">
          <span className={`status-dot ${isConnected ? 'live' : 'dead'}`}></span>
          <span className="status-text">{isConnected ? 'EN VIVO' : 'DESCONECTADO'}</span>
          <span className="time-text">🕒 {currentTime}</span>
        </div>
      </header>

      {/* Tarjetas Superiores Interactivas (Seleccionables) */}
      <div className="summary-row">
        {allCities.map((city) => {
          const latest = sensorData[city][sensorData[city].length - 1];
          const isSelected = selectedCity === city;
          const isDimmed = selectedCity !== null && !isSelected;
          
          return (
            <div 
              className={`summary-card interactive-card ${isSelected ? 'selected-card' : ''} ${isDimmed ? 'dimmed-card' : ''}`}
              key={city} 
              onClick={() => setSelectedCity(city)}
              style={isSelected ? {borderColor: cityColors[city], boxShadow: `0 0 15px ${cityColors[city]}40`} : {}}
            >
              <div className="card-header">
                <span className="city-name" style={{color: cityColors[city]}}>◉ {city.toUpperCase()}</span>
                {isSelected ? <span className="live-badge" style={{borderColor: '#ffcc00', color: '#ffcc00'}}>ISOLATED</span> : <span className="live-badge">LIVE</span>}
              </div>
              <div className="card-body">
                <h2 className="main-temp">{latest.temperature.toFixed(1)}°</h2>
                <div className="sub-stats">
                  <p>💧 {latest.humidity}%</p>
                  <p>📊 {latest.pressure} hPa</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Boton regreso a vista global condicional */}
      {selectedCity && (
        <div className="active-filters">
          <button className="clear-filter-btn" onClick={() => setSelectedCity(null)}>
             ⭯ Regresar a Vista General (Todas las Ciudades)
          </button>
        </div>
      )}

      {allCities.length === 0 && (
        <div className="loading-state">Captando radio-telemetría IoT desde Redis...</div>
      )}

      {/* Gráficas con Historial Dinámico de Ventana (15 mins) */}
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-title">
            <span style={{color: '#ff7a00'}}>🌡️ TEMPERATURA HISTÓRICA (VENTANA 15 MIN)</span>
          </div>
          <div className="chart-content">
            <Line data={buildChartData('Temperatura', 'temperature')} options={commonOptions} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">
             <span style={{color: '#00d2ff'}}>💧 HUMEDAD HISTÓRICA (VENTANA 15 MIN)</span>
          </div>
          <div className="chart-content">
            <Line data={buildChartData('Humedad', 'humidity')} options={commonOptions} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">
            <span style={{color: '#c255ff'}}>📊 PRESIÓN ATMOSFÉRICA</span>
          </div>
          <div className="chart-content">
            <Line data={buildChartData('Presión', 'pressure')} options={commonOptions} />
          </div>
        </div>
      </div>

      {/* Mapa de Calor Inferior */}
      <div className="map-row">
        <div className="chart-card map-card">
          <div className="chart-title map-title" style={{display:'flex', justifyContent:'space-between'}}>
            <span>🌍 HEATMAP • VISTA DE CALOR COMBINADA</span>
            <span style={{fontSize: '0.65rem', color: '#6b7a94', textTransform:'none'}}>*El mapa termal se mantiene global estático</span>
          </div>
          <div className="map-frame">
            <MapContainer center={[4.5709, -74.2973]} zoom={5} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; CARTO'
              />
              <HeatmapLayer data={heatmapPoints} />
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
