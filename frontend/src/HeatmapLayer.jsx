import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// El truco definitivo para entornos de React/Vite + Leaflet Heat
window.L = L;
import 'leaflet.heat';

export default function HeatmapLayer({ data }) {
  const map = useMap();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Eliminar las capas de calor viejas antes de redibujar para evitar saturación de RAM
    map.eachLayer((layer) => {
      // Identificamos internamente al plugin heat
      if (layer._heat) {
        map.removeLayer(layer);
      }
    });

    const heatData = data.map(d => [
      d.lat,
      d.lon,
      d.intensity * 2 // Se extrapola x2 la intensidad artificialmente para que destaque al ser pocos sensores
    ]);

    const heatLayer = L.heatLayer(heatData, {
      radius: 45, // Radio amplio estilo manchas
      blur: 25,
      maxZoom: 8,
      gradient: {
        0.2: '#00d2ff', // Frio 
        0.5: '#00ff88', // Templado
        0.7: '#ffcc00', // Calido
        1.0: '#ff0055'  // Ardiente
      }
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, data]);

  return null;
}
