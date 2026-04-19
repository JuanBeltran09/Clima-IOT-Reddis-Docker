// Este archivo inicia tanto el suscriptor como el publicador simultáneamente.
// Es necesario para plataformas Cloud como Render que solo permiten correr 1 servidor o comando a la vez.

console.log("Iniciando servicios del Backend simultáneamente para Producción...");

// Iniciamos el orquestador principal (Sockets + Endpoint)
require('./subscriber.js');

// Iniciamos inmediatamente nuestro simulador IoT con 1 segundo de retraso para asegurar conexion
setTimeout(() => {
    require('./publisher.js');
}, 1000);
