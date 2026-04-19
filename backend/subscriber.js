const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const redis = require('redis');
const cors = require('cors');

// Configuración de Express y Sockets
const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // En producción, es importante limitar a la URL de Vercel
        methods: ["GET", "POST"]
    }
});

// Configuración de la conexión a Redis
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('❌ Error en Redis Subscriber:', err));

async function startSubscriber() {
    await redisClient.connect();
    console.log('✅ Subscriber conectado a Redis exitosamente.');

    // Nos suscribimos al canal donde el Publisher envía la información ('clima_updates')
    await redisClient.subscribe('clima_updates', (message) => {
        const climaData = JSON.parse(message);
        console.log(`📥 RECIBIDO desde Redis: ${climaData.name} -> Temp: ${climaData.temperature}°C`);
        
        // Emitir los datos recibidos a todas las interfaces Web (Vite/React) conectadas mediante WebSockets
        io.emit('nuevo_clima', climaData);
    });
}

// Render inyecta su propio puerto en la variable process.env.PORT
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor Socket.io corriendo en el puerto ${PORT}`);
    startSubscriber();
});
