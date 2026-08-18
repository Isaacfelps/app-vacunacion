#!/bin/bash
# Obtener el directorio donde se encuentra este script
cd "$(dirname "$0")"

echo "Actualizando bases de datos semanales..."
echo "----------------------------------------"
python3 consolidate_data.py
echo "----------------------------------------"
echo "¡Actualización completada! Ya puedes abrir o actualizar la página."
echo "Puedes cerrar esta ventana."
