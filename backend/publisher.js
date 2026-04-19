const axios = require('axios');
const redis = require('redis');

// Configuración de las ubicaciones (sensores simulados en distintas ciudades de Colombia)
const sensors = [
    { id: 'sensor_bogota', name: 'Bogotá', lat: 4.6097, lon: -74.0817 },
    { id: 'sensor_medellin', name: 'Medellín', lat: 6.2518, lon: -75.5636 },
    { id: 'sensor_cali', name: 'Cali', lat: 3.4372, lon: -76.5225 },
    { id: 'sensor_barranquilla', name: 'Barranquilla', lat: 10.9639, lon: -74.7964 }
];

// Conexión a Redis (Apunta a tu contenedor de Docker)
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('❌ Error en Redis:', err));

async function fetchAndPublishData() {
    try {
        for (const sensor of sensors) {
            // Consultar la API de Open-Meteo (No requiere API Key y es excelente para simulaciones)
            const response = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
                params: {
                    latitude: sensor.lat,
                    longitude: sensor.lon,
                    current: 'temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m'
                }
            });

            const currentData = response.data.current;
            
            // Construir el objeto o "mensaje" de nuestro sensor IoT
            const payload = {
                sensorId: sensor.id,
                name: sensor.name,
                timestamp: currentData.time,
                temperature: currentData.temperature_2m,
                humidity: currentData.relative_humidity_2m,
                pressure: currentData.surface_pressure,
                windSpeed: currentData.wind_speed_10m,
                coords: { lat: sensor.lat, lon: sensor.lon }
            };

            // Publicar el dato en el canal de Redis (Pub/Sub)
            // Cualquier "Subscriber" escuchando 'clima_updates', recibirá este JSON instantáneamente
            await redisClient.publish('clima_updates', JSON.stringify(payload));
            
            console.log(`📡 [${sensor.name}] Publicado: Temp ${payload.temperature}°C | Humedad ${payload.humidity}% | Presión ${payload.pressure} hPa`);
        }
    } catch (error) {
        console.error('⚠️ Error obteniendo datos del clima:', error.message);
    }
}

async function startPublisher() {
    await redisClient.connect();
    console.log('✅ Publisher conectado a Redis exitosamente.');
    console.log('⏳ Iniciando simulación de sensores IoT...\n');
    
    // Ejecutar la primera lectura inmediatamente
    fetchAndPublishData();

    // Luego repetir automáticamente cada 15 segundos
    setInterval(fetchAndPublishData, 15000);
}

startPublisher();
