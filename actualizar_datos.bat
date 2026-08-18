@echo off
cd /d "%~dp0"
echo Actualizando bases de datos semanales...
echo ----------------------------------------
python consolidate_data.py
echo ----------------------------------------
echo ¡Actualizacion completada! Ya puedes abrir o actualizar la pagina.
pause
