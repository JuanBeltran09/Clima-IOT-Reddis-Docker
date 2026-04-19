# Simulación de Sistema IoT - Clima en Tiempo Real 🌦️

Este documento técnico explica de forma sumamente detallada la construcción, arquitectura y modo de ejecución de nuestro sistema IoT enfocado en clima. El proyecto captura, transmite y visualiza datos climatológicos (Temperatura, Humedad, Viento y Presión) empleando una arquitectura veloz apoyada en **Redis**.

---

## 🏗️ Arquitectura General del Proyecto

Para emular un escenario profesional a gran escala y permitir un fácil despliegue en la nube (ej. AWS, Vercel), particionamos el ecosistema en tres capas autónomas:

1. **`redis-server/`**: Base de datos clave-valor corriendo dentro de un contenedor Docker. Finge como nuestro *Message Broker* (gestor asíncrono de eventos). 
2. **`backend/`**: El cerebro lógico del sistema (Node.js). Alberga simultáneamente a las "antenas" que recolectan el clima y a la API servidora.
3. **`frontend/`**: La plataforma web construida en React + Vite. Es el Dashboard final del cliente, con gráficas en vivo y adaptable para desplegarse fácilmente por medio de Vercel.

---

## ⚙️ Explicación de los Componentes (Paso a Paso)

### 1. Sistema de Memoria y Colas (Redis en Docker)
Se configuró una imagen de Docker basada en Alpine Linux para correr Redis de forma ultraligera. Fue parametrizada usando el archivo `redis.conf` con persitencia activa de los datos (AOF) y expuesta en el puerto `6379`. Todo esto se unificó en un `docker-compose.yml`.

### 2. & 3. El Publisher IoT (Simulador de Sensores / backend)
**¿Qué hace?**: Ubicado en `backend/publisher.js`, este script funciona como los sensores físicos instalados en la intemperie (simulando 4 ciudades: Bogotá, Medellín, Cali y Barranquilla).
* Utilizamos la API pública **Open-Meteo** (elegida por su gratuidad técnica sin necesidad de API keys).
* Cada **15 segundos**, el script usa un bucle (`setInterval`) para pedir a la API la temperatura, humedad y presión de cada ciudad.
* Una vez recopila el dato, envía un objeto JSON compacto al contenedor de Redis. Utiliza bajo el estándar **Pub/Sub** el canal llamado clave `'clima_updates'`.

### 4. El Subscriber (Radio Receptor y Servidor Web / backend)
**¿Qué hace?**: Ubicado en `backend/subscriber.js`, funciona como el software intermedio encargado de llevar los datos guardados en base de datos al navegador web del cliente sin hacer ruido.
* Es una mini-API en marco de **Express.js** que aloja servicios de **WebSockets (Socket.io)** por el puerto 4000.
* Este archivo levanta otra conexión paralela a Redis. Su única meta de vida es hacer un *Suscribe* escuchando atentamente el canal `'clima_updates'`.
* El milisegundo en el que el *Publisher* avienta un dato climático nuevo, el *Subscriber* lo intercepta de la base de datos redis y genera un `io.emit()` instantáneo, propulsando la información hasta los navegadores web por medio del WebSocket.

### 5. La Interfaz Gráfica Reactiva (El Dashboard Frontend)
**¿Qué hace?**: Ubicado en la carpeta `frontend/`, consta de una aplicación web sumamente estética y responsiva configurada en React + Vite + CSS Dark Mode y Glassmorphism (paneles de "vidrio oscurecido").
* **Gráficas (`Chart.js`):** La página incorpora gráficas vectoriales en el tiempo. Utiliza la librería genérica Chart.js en conjunto con React. Estas observan internamente el historial de las últimas temperaturas y las inyectan dinámicamente haciendo que la curva avance por la pantalla como en una terminal cardíaca real cada vez que Socket.IO recibe un aviso.
* **Mapa de Calor (`react-leaflet`):** Una visualización termal montada sobre las APIs geográficas de *Leaflet*. Empleamos lógica matemática para transformar la Temperatura recibida (`10 C°` a `35 C°`) en rangos de "Intensidad", lo que se traduce como manchas interactivas rojizas y azules sobre el área de Colombia.

---

## 🚀 Guía Definitiva de Orquestación

Para ejecutar todos los engranajes conectados en tu propia computadora, debes aperturar un total de **cuatro ventanas/pestañas de Terminal (Consola de comandos)**.

### Terminal 1: Encender la Base de Datos
Sigue este paso antes de cualquier otro, dado que todos los servidores se conectarán a él.
```powershell
cd redis-server
docker-compose up -d
```
*(Si ya lo hiciste y sigues en la misma sesión, ignora este paso)*.

### Terminal 2: Iniciar el servidor puente (El Subscriber)
Abre una nueva terminal para encender el servidor y activar las antenas WebSockets para la Web.
```powershell
cd backend
npm install   # (Solo requieres npm install si es la primera vez que abres el proyecto).
node subscriber.js
```
*(Avisará que está online en el puerto 4000).*

### Terminal 3: Encender el Simulador IoT (El Publisher)
Abre una tercera terminal para hacer que tus falsas antenas despierten y comiencen a mandar datos.
```powershell
cd backend
node publisher.js
```
*(Verás mensajes impresos indicando que está lanzando clima exitosamente al aire).*

### Terminal 4: Visualizar el Frontend en el Navegador Web
Finalmente, en tu cuarta pestaña abre la interfaz de usuario:
```powershell
cd frontend
npm install   # (Si es tu primera vez).
npm run dev
```
La consola te indicará una ruta local similar a `http://localhost:5173`. Dale clic o pégala en Google Chrome. Al aperturarla, ¡las 3 gráficas y el mapa Leaflet cobrarán vida alimentándose en vivo de todas las piezas anteriores armadas! 

*Nota: Una vez calificados, puedes subir la carpeta de tu Frontend a GitHub y en un click amarrarla a **Vercel** para tener visibilidad mundial.*
