# Simulación de Sistema IoT - Clima en Tiempo Real 🌍🌡️

Este proyecto tiene como objetivo simular un ecosistema **IoT (Internet of the Things)**. Estamos capturando datos climáticos "en vivo" desde múltiples sensores geolocalizados, procesándolos mediante una arquitectura basada en eventos a través de **Redis**, y apuntando a visualizarlos en un dashboard moderno web.

## 🏗️ Arquitectura General

El proyecto ha sido dividido deliberadamente en tres capas independientes, siguiendo buenas prácticas empresariales (lo que permitirá desplegar el Frontend en plataformas como Vercel y mantener el backend seguro):

1. **`redis-server/`**: Contiene la infraestructura de la Base de Datos en Memoria (Docker). Actúa como nuestro Intermediario de Mensajes (Message Broker).
2. **`backend/`**: Capa lógica construida en Node.js. Por el momento aloja a nuestro **Publisher** (publicador), el script que actúa como los sensores físicos.
3. **`frontend/`**: Capa visual construida con React (Vite). Será el Dashboard del usuario final.

---

## ⚙️ ¿Cómo funciona el Paso 2 (El Publisher y las APIs Generales)?

Para simular hardware IoT del clima, resolvimos construir un script en Node.js (`backend/publisher.js`). 

**1. Selección de API Pública:**
Se ha optado por utilizar **Open-Meteo**. Las ventajas de esta API sobre alternativas (como OpenWeatherMap) son:
* **No requiere API Keys:** No hay necesidad de registro ni gestionar tarjetas de crédito / tokens. Es inmediata.
* **Múltiples variables:** Ofrece Temperatura, Humedad, Presión y Viento por coordenadas geográficas.

**2. Lógica del Publisher (`publisher.js`):**
El script posee una lista de coordenadas (sensores) estáticas correspondiente a varias ciudades (ej. Bogotá, Medellín). Funciona a través de un ciclo iterativo (`setInterval`) ejecutándose cada `15 segundos`. 
* Por cada ciclo, consulta las métricas biológicas actuales vía `axios` (Librería HTTP).
* Estructura los datos en un formato útil (`JSON`).
* Se conecta localmente al puerto de nuestro **Redis Container** y hace un **Publish**. Publicar en el canal (Pub/Sub) significa "Lanzar el dato al aire para que cualquiera suscrito a 'clima_updates' lo tome inmediatamente".

---

## 🚀 Guía de Inicialización (Paso a Paso)

Sigue estos comandos para echar a andar las herramientas creadas durante el Paso 2:

### Requisito Previo
Asegúrate de que la base de datos Redis esté corriendo en segundo plano:
```powershell
cd redis-server
docker-compose up -d
cd ..
```

### 📡 Levantar el Backend (El Simulador IoT)
El backend requiere sus propias librerías (como el conector a redis y axios) para funcionar.

1. Navega a la carpeta del backend.
   ```powershell
   cd backend
   ```
2. Instala los `node_modules` (descarga las dependencias declaradas).
   ```powershell
   npm install
   ```
3. Ejecuta el script simulador.
   ```powershell
   node publisher.js
   ```
*(Nota: Verás en consola que comienza a hacer peticiones a internet y a confirmar que los datos se publican en Redis exitosamente).* Dejar corriendo en esa terminal.

### 💻 Levantar el Frontend (El Dashboard React)
Al igual que el backend, la web ha sido configurada como su propio microcosmos.

1. Abre una **nueva ventana/pestaña** de terminal y navega hasta el frontend.
   ```powershell
   cd frontend
   ```
2. Descarga sus múltiples dependencias (Librerías de gráficas como `chart.js`, React, Vite, `leaflet` para los mapas).
   ```powershell
   npm install
   ```
3. Inicia el servidor de desarrollo en caliente (Fast Refresh).
   ```powershell
   npm run dev
   ```
4. Podrás visualizar la página esqueleto accediendo por tu navegador a `http://localhost:5173`.
