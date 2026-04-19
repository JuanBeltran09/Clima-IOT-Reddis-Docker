# Usar la imagen oficial de Redis, versión ligera (alpine)
FROM redis:7.2-alpine

# Copiar el archivo de configuración a la ruta correcta en el contenedor
COPY redis.conf /usr/local/etc/redis/redis.conf

# Exponer el puerto por defecto de Redis
EXPOSE 6379

# Iniciar Redis utilizando el archivo de configuración personalizado
CMD [ "redis-server", "/usr/local/etc/redis/redis.conf" ]
