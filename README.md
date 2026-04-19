# Simulación de Sistema IoT - Clima en Tiempo Real 🌦️

Este documento explica de forma detallada la construcción y funcionamiento de nuestro sistema IoT diseñado para capturar, transmitir y visualizar datos de clima utilizando **Redis** como Message Broker. 

## 🏗️ Estructura del Proyecto

Hemos dividido el proyecto en tres capas fundamentales para garantizar escalar e implementar de forma sencilla en entornos cloud reales (ej. Vercel, AWS):

1. **`redis-server/`**: La infraestructura Base de Datos en memoria instalada en Docker.
2. **`backend/`**: El núcleo lógico (Node.js). Aquí viven los scripts **Publisher** (que actúan como sensores) y el **Subscriber** (API WebSockets puente).
3. **`frontend/`**: La interfaz gráfica desarrollada en Vite + React (para visualización web final).

---

## 🛠️ Punto 3: El Publisher (Simulador de Sensores)

**Ubicación:** `backend/publisher.js`

El reto solicitaba crear un script que cada cierta cantidad de segundos ("X") consultara de una API gratuita variables de clima reales (Temperatura, Humedad, Velocidad de viento) emulando hardware localizado en distintos puntos geográficos.

### ¿Cómo se hizo y cómo funciona?
1. **Librerías principales:** Utilizamos `axios` para hacer las peticiones HTTP a internet y la librería oficial de `redis` para NodeJS.
2. **Ubicaciones Geográficas:** Definimos un arreglo estático en el código con coordenadas reales de 4 ciudades (Bogotá, Medellín, Cali, Barranquilla). Actúan como el "Hardware IoT".
3. **Petición a API:** Empleamos la API gratuita de **Open-Meteo**. No requiere autenticación por Token/Keys, reduciendo fricción, pero ofrece todas las métricas solicitadas con enorme precisión.
4. **Ciclo (Loop):** Utilizamos la función predeterminada de NodeJS `setInterval()` configurada cada **15 segundos**. En cada intervalo, el programa realiza una petición a Open-Meteo tomando la latitud y longitud. 
5. **Enviando a Redis:** Al obtener el clima actual (JSON), usamos el comando `redisClient.publish('clima_updates', <datos_comprimidos>)`. Esto realiza una distribución en tiempo real ("Pub/Sub"); literalmente arroja los datos a cualquier máquina o script que esté escuchando, y desecha los datos de la memoria inmediata para mantener bajo costo computacional.

---

## 🎧 Punto 4: El Subscriber (Receptor Web y Conector)

**Ubicación:** `backend/subscriber.js`

El reto solicitaba un script "web o Node.js" capaz de interceptar los eventos arrojados por el Publisher dentro de la base de datos de Redis en tiempo real. 

### ¿Cómo se hizo y cómo funciona?
1. **El Servidor Web (Express + Socket.io):** Levantamos un pequeño servidor web usando *Express.js* en el puerto **4000**. Le dotamos superpoderes con *Socket.io* para ofrecer conexión de **WebSockets**. Los WebSockets son los encargados de mantener túneles abiertos en doble vía con navegadores web, previniendo recargar la página para ver datos frescos.
2. **La Conexión de Subsistema:** Inicializamos un cliente paralelo de  `redis`. Este cliente tiene una única misión en su existencia a través del comando:
   ```javascript
   redisClient.subscribe('clima_updates', (mensaje) => { ... })
   ```
3. **Funcionamiento Real:** 
   - El *Publisher* consulta Open-Meteo e inserta la cadena en Redis.
   - Redis notifica instantáneamente a nuestro *Subscriber.js*.
   - El Subscriber decodifica el mensaje y ejecuta `io.emit('nuevo_clima', mensaje)`.
   - Como resultado final, todos los usuarios o navegadores que tengan abierto tu futuro Frontend de React y Vercel verán los puntajes de Temperatura y Humedad actualizarse como por arte de magia y al unísono.

---

## 🚀 Paso a Paso: Guía de Inicialización

Para ver operar el ecosistema (y probar tanto el Paso 3 como el Paso 4 en tu propia máquina), sigue estos pasos:

### 1. Activar el cerebro (Redis)
Tu contenedor de Redis debe estar online.
```powershell
cd redis-server
docker-compose up -d
cd ..
```

### 2. Inicializar el proyecto Backend (Node)
Si es la primera vez que clonas o abres el proyecto, instala las dependencias (dentro de la carpeta backend):
```powershell
cd backend
npm install
```

### 3. Iniciar el Subscriber (El Orejotas 🎧)
Te sugiero iniciar primero el que "escucha" y que habilita el servidor WebSockets para el Frontend:
Abre una terminal en la carpeta de `backend` y corre:
```powershell
node subscriber.js
```
*(Verás un mensaje diciendo que está conectado a Redis y al Puerto 4000 de Sockets).*

### 4. Iniciar el Publisher (Los Sensores 📡)
Abre **otra pestaña o ventana** de consola, dirígete nuevamente a `backend` y enciende la simulación:
```powershell
node publisher.js
```

A partir de este instante, verás en la consola del *Publisher* confirmando las peticiones a la nube, y en la consola paralela del *Subscriber* observando exactamente en tiempo real cuando llega el paquete empujado por Redis.

¡Arquitectura Pub/Sub asíncrona completada!
