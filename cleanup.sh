#!/bin/bash

echo "🧹 Limpiando procesos en puertos 3000, 3001, 3002..."

# Puertos a limpiar
PORTS=(3000 3001 3002)

for PORT in "${PORTS[@]}"
do
    PID=$(lsof -t -i:$PORT)
    if [ -z "$PID" ]; then
        echo "✅ Puerto $PORT está libre."
    else
        echo "🔥 Matando proceso en puerto $PORT (PID: $PID)..."
        kill -9 $PID
    fi
done

echo "✨ Limpieza completada. Ahora puedes ejecutar 'npm run dev' desde la raíz."
