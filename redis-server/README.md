# Servidor Redis - IoT Clima 🌦️

Este directorio contiene la configuración necesaria para desplegar una base de datos **Redis** adaptada para nuestro sistema IoT de recolección de clima. Ha sido empaquetada en un contenedor de Docker para facilitar su portabilidad y despliegue tanto en entornos locales como en la nube.

## 📁 Archivos Clave

### 1. `redis.conf`
Es el archivo de configuración personalizado de Redis.
* **`bind 0.0.0.0`**: Permite que la base de datos acepte conexiones desde cualquier IP (necesario cuando corre dentro de un contenedor e interactúa con otros servicios o la nube).
* **`protected-mode no`**: Desactiva el modo protegido para facilitar el acceso remoto (ideal para pruebas y simulaciones rápidas, aunque en producción estricta requeriría contraseñas).
* **`appendonly yes`**: Habilita la persistencia de datos (AOF - Append Only File). A pesar de ser una base de datos en memoria (RAM), esto asegura que las lecturas del clima se guarden en disco. Si el contenedor se reinicia o se cae, no perderemos el historial.

### 2. `Dockerfile`
Instrucciones para construir la imagen de nuestro servidor.
* Toma como base a `redis:7.2-alpine`, una versión oficial y muy ligera.
* Copia nuestro archivo `redis.conf` dentro de la ruta adecuada del contenedor.
* Expone el puerto `6379` (el puerto estándar de Redis).
* Define el comando de arranque para que Redis inicie leyendo nuestra configuración especial en lugar de usar los valores por defecto.

### 3. `docker-compose.yml` (Opcional - Pruebas locales)
Sirve para desplegar rápidamente nuestra base de datos localmente.
* Vincula los puertos de nuestra máquina con los del contenedor (`6379:6379`).
* Crea un **volumen** (`redis_data:/data`) que permite que la persistencia (el archivo `.aof`) sobreviva en nuestro propio disco duro, resistiendo el borrado del contenedor.

---

## 🚀 Despliegue en Docker Hub

Ya hemos construido y publicado nuestra imagen en Docker Hub. Los comandos utilizados fueron:

1. **Construir la imagen:**
   ```powershell
   docker build -t juanbeltran09/redis-clima-iot:latest .
   ```
2. **Autenticación (Login):**
   ```powershell
   docker login
   ```
3. **Subir a Docker Hub:**
   ```powershell
   docker push juanbeltran09/redis-clima-iot:latest
   ```
La imagen está oficialmente alojada en: `juanbeltran09/redis-clima-iot`.

---

## 💻 ¿Cómo usar este Redis?

### Opción A: Despliegue en la Nube / Cualquier PC
Dado que la imagen es pública en Docker Hub, cualquier compañero del grupo o servidor virtual (ej. AWS EC2, Digital Ocean) solo necesita tener Docker instalado y ejecutar:

```powershell
docker run -d -p 6379:6379 --name servidor-redis-clima juanbeltran09/redis-clima-iot:latest
```

### Opción B: Desarrollo Local
Para trabajar programando el Publicador (que tomará datos de la API de clima) y el Suscriptor en tu máquina, basta con levantar el archivo compose que preparé en esta carpeta:

```powershell
docker-compose up -d
```
Para detenerlo puedes ejecutar:
```powershell
docker-compose down
```
