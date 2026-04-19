import { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { MapContainer, TileLayer } from 'react-leaflet';
import HeatmapLayer from './HeatmapLayer';

// Registrar componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// URL del backend (Subscriber)
const SERVER_URL = 'http://localhost:4000';

function App() {
  const [sensorData, setSensorData] = useState({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(SERVER_URL);

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // Escuchamos el evento 'nuevo_clima' que nos bota el Subscriber de Redis
    socket.on('nuevo_clima', (data) => {
      setSensorData(prev => {
        const history = prev[data.name] || [];
        // Guardamos los últimos 15 registros de esa ciudad para hacer la gráfica de tiempo
        const newHistory = [...history, data].slice(-15);
        return { ...prev, [data.name]: newHistory };
      });
    });

    return () => socket.disconnect();
  }, []);

  // Extraemos ciudades y paleta de colores vibrantes para un diseño premium
  const cities = Object.keys(sensorData);
  const colors = ['#00f0ff', '#ff007f', '#8a2be2', '#00ff88'];

  // Constructor de formato de datos compatible con react-chartjs-2
  const buildChartData = (label, dataKey) => {
    let labels = [];
    if (cities.length > 0 && sensorData[cities[0]]) {
      labels = sensorData[cities[0]].map(d => {
        const date = new Date(d.timestamp);
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      });
    }

    const datasets = cities.map((city, i) => ({
      label: city,
      data: sensorData[city].map(d => d[dataKey]),
      borderColor: colors[i % colors.length],
      backgroundColor: colors[i % colors.length],
      tension: 0.4, // Suavizado Glassmorphism
      pointRadius: 4,
      pointHoverRadius: 7
    }));

    return { labels, datasets };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#ffffff', font: { family: 'Outfit', size: 13 } } }
    },
    scales: {
      x: { ticks: { color: '#8b9bb4' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#8b9bb4' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  // Preparar puntos calientes para Leaflet Heat (Usando Temperatura como Intensidad)
  const heatmapPoints = useMemo(() => {
    return cities.map(city => {
      const history = sensorData[city];
      const latest = history[history.length - 1];
      // Normalizamos la temperatura (Ej: 10C min a 35C max) para la intensidad de color
      const intensity = Math.max(0, Math.min(1, (latest.temperature - 10) / 25));
      return {
        lat: latest.coords.lat,
        lon: latest.coords.lon,
        intensity: intensity
      };
    });
  }, [sensorData, cities]);

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>Sensores IoT | Clima Colombia</h1>
        <p>Dashboard en vivo potenciado por Arquitectura Redis Pub/Sub</p>
        <div className="status-badge">
          <div 
            className={`pulse ${!isConnected ? 'disconnected' : ''}`} 
            style={!isConnected ? { backgroundColor: '#ff0055', boxShadow: '0 0 10px #ff0055' } : {}}
          ></div>
          {isConnected ? 'Escuchando Streams de Redis' : 'Desconectado del Backend (Esperando)'}
        </div>
      </header>

      <div className="grid-layout">
        {/* Gráfico 1: Temperatura */}
        <div className="glass-card">
          <h2 className="card-title">🌡️ Temperatura vs Tiempo (°C)</h2>
          <div className="chart-container">
            {cities.length > 0 ? (
              <Line data={buildChartData('Temperatura', 'temperature')} options={chartOptions} />
            ) : <p style={{color: 'grey', textAlign: 'center'}}>Esperando datos de sensores...</p>}
          </div>
        </div>

        {/* Gráfico 2: Humedad */}
        <div className="glass-card">
          <h2 className="card-title">💧 Humedad vs Tiempo (%)</h2>
          <div className="chart-container">
            {cities.length > 0 ? (
              <Line data={buildChartData('Humedad', 'humidity')} options={chartOptions} />
            ) : <p style={{color: 'grey', textAlign: 'center'}}>Esperando datos de sensores...</p>}
          </div>
        </div>

        {/* Gráfico 3: Presión Atmosférica */}
        <div className="glass-card">
          <h2 className="card-title">📉 Presión vs Tiempo (hPa)</h2>
          <div className="chart-container">
            {cities.length > 0 ? (
              <Line data={buildChartData('Presión', 'pressure')} options={chartOptions} />
            ) : <p style={{color: 'grey', textAlign: 'center'}}>Esperando datos de sensores...</p>}
          </div>
        </div>

        {/* Gráfico 4: Mapa de Calor Leaflet */}
        <div className="glass-card">
          <h2 className="card-title">🗺️ Mapa de Calor (Termal)</h2>
          <div className="map-container">
            <MapContainer center={[4.5709, -74.2973]} zoom={5} style={{ height: '100%', width: '100%' }}>
              {/* Capa base oscura adaptada de CartoDB o similar a través de filtro CSS */}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap contributors &copy; CARTO'
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
