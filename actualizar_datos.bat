@echo off
cd /d "%~dp0"
echo Actualizando bases de datos semanales...
echo ----------------------------------------
py consolidate_data.py
echo ----------------------------------------
echo ¡Actualizacion completada! Ya puedes abrir o actualizar la pagina.
pause
