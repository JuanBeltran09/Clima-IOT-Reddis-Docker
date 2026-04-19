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

  // Reloj superior
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const socket = io(SERVER_URL);

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('nuevo_clima', (data) => {
      // Usamos la HORA LOCAL exacta del navegador al recibir el dato, 
      // solventando el intervalo largo/desconocido de la API origen.
      data.localTime = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute:'2-digit', second:'2-digit' });
      
      setSensorData(prev => {
        const history = prev[data.name] || [];
        const newHistory = [...history, data].slice(-20); // Guardar los ultimos 20
        return { ...prev, [data.name]: newHistory };
      });
    });

    return () => socket.disconnect();
  }, []);

  const cities = Object.keys(sensorData);
  
  // Colores dedicados (simulando los vistos en la imagen de referencia)
  const cityColors = {
    'Bogotá': '#ff7a00',
    'Medellín': '#00d2ff',
    'Cali': '#ffcc00',
    'Barranquilla': '#00ff88'
  };
  const fallbackColors = ['#00f0ff', '#ff007f', '#8a2be2', '#00ff88'];

  const buildChartData = (label, dataKey, baseColorHex) => {
    let labels = [];
    if (cities.length > 0 && sensorData[cities[0]]) {
      labels = sensorData[cities[0]].map(d => d.localTime);
    }

    const datasets = cities.map((city, i) => {
      const color = cityColors[city] || fallbackColors[i % fallbackColors.length];
      return {
        label: city,
        data: sensorData[city].map(d => d[dataKey]),
        borderColor: color,
        backgroundColor: color + '1A', // Relleno con transparencia leve
        borderWidth: 2,
        pointRadius: 2,
        pointBackgroundColor: color,
        fill: label === 'Temperatura' ? false : true, // La temperatura sin relleno según lo visual
        tension: 0.1 // Interpolar mas recto
      };
    });

    return { labels, datasets };
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false } // Escondemos las labels porque el mapa visual lo hace evidente
    },
    scales: {
      x: { 
        ticks: { color: '#5b6b84', font: { size: 9, family: 'JetBrains Mono' } }, 
        grid: { color: 'rgba(255,255,255,0.04)' } 
      },
      y: { 
        ticks: { color: '#5b6b84', font: { size: 9, family: 'JetBrains Mono' } }, 
        grid: { color: 'rgba(255,255,255,0.04)' } 
      }
    }
  };

  const heatmapPoints = useMemo(() => {
    return cities.map(city => {
      const history = sensorData[city];
      const latest = history[history.length - 1];
      // Intensidad de 0 a 1 calculada por el calor (Temp. max ~35C)
      let intensity = Math.max(0, Math.min(1, (latest.temperature - 5) / 30));
      return {
        lat: latest.coords.lat,
        lon: latest.coords.lon,
        intensity: intensity
      };
    });
  }, [sensorData, cities]);

  return (
    <div className="dashboard-container">
      {/* Top Navbar */}
      <header className="top-nav">
        <div className="nav-title">
          <span className="icon">🌡️</span>
          <div>
            <h1>IoT Climate Monitor</h1>
            <p>REDIS PUB/SUB • OPEN-METEO</p>
          </div>
        </div>
        <div className="nav-status">
          <span className={`status-dot ${isConnected ? 'live' : 'dead'}`}></span>
          <span className="status-text">{isConnected ? 'EN VIVO' : 'DESCONECTADO'}</span>
          <span className="time-text">Última actualización: {currentTime}</span>
        </div>
      </header>

      {/* Tarjetas Superiores */}
      <div className="summary-row">
        {cities.map((city, index) => {
          const latest = sensorData[city][sensorData[city].length - 1];
          return (
            <div className="summary-card" key={city}>
              <div className="card-header">
                <span className="city-name" style={{color: cityColors[city]}}>◉ {city.toUpperCase()}</span>
                <span className="live-badge">LIVE</span>
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

      {cities.length === 0 && (
        <div className="loading-state">Esperando señales de telemetría de los sensores IoT...</div>
      )}

      {/* Gráficas Base */}
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-title">
            <span style={{color: '#ff7a00'}}>🌡️ TEMPERATURA </span>
          </div>
          <div className="chart-content">
            <Line data={buildChartData('Temperatura', 'temperature')} options={commonOptions} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">
             <span style={{color: '#00d2ff'}}>💧 HUMEDAD</span>
          </div>
          <div className="chart-content">
            <Line data={buildChartData('Humedad', 'humidity')} options={commonOptions} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">
            <span style={{color: '#c255ff'}}>📊 PRESIÓN</span>
          </div>
          <div className="chart-content">
            <Line data={buildChartData('Presión', 'pressure')} options={commonOptions} />
          </div>
        </div>
      </div>

      {/* Mapa de Calor */}
      <div className="map-row">
        <div className="chart-card map-card">
          <div className="chart-title map-title">
            <span>🌍 HEATMAP • TEMPERATURA POR SENSOR</span>
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
