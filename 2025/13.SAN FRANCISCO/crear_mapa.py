import pandas as pd
import folium
import os
import glob
import numpy as np

def main():
    # Encontrar todos los archivos excel
    archivos = glob.glob('VAC SAN FRANCISCO SEM *.xlsx')
    
    dfs = []
    for archivo in archivos:
        try:
            df = pd.read_excel(archivo)
            dfs.append(df)
        except Exception as e:
            print(f"Error leyendo {archivo}: {e}")
            
    if not dfs:
        print("No se encontraron archivos validos.")
        return
        
    df_completo = pd.concat(dfs, ignore_index=True)
    
    # Filtrar aquellos con georeferenciacion
    df_completo = df_completo.dropna(subset=['GEOREFERENCIACION'])
    
    # Extraer lat y lon
    def parse_coords(coord_str):
        try:
            partes = str(coord_str).split(',')
            if len(partes) == 2:
                return float(partes[0].strip()), float(partes[1].strip())
        except:
            pass
        return None, None
        
    df_completo['lat'], df_completo['lon'] = zip(*df_completo['GEOREFERENCIACION'].apply(parse_coords))
    df_completo = df_completo.dropna(subset=['lat', 'lon'])
    
    # Anadir un pequeno 'jitter' (ruido aleatorio) para evitar que se superpongan exactamente
    # ~0.00005 grados es aprox 5 metros
    np.random.seed(42)
    df_completo['lat'] += np.random.uniform(-0.00005, 0.00005, size=len(df_completo))
    df_completo['lon'] += np.random.uniform(-0.00005, 0.00005, size=len(df_completo))
    
    # Crear el mapa base satelital
    if len(df_completo) > 0:
        centro_lat = df_completo['lat'].mean()
        centro_lon = df_completo['lon'].mean()
    else:
        centro_lat, centro_lon = 0, 0
        
    m = folium.Map(location=[centro_lat, centro_lon], zoom_start=15)
    
    # Anadir capa satelital de Google
    folium.TileLayer(
        tiles='http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}',
        attr='Google Satellite',
        name='Google Satellite',
        overlay=False,
        control=True
    ).add_to(m)

    # Definir colores por especie
    colores = {
        'PERRO': 'blue',
        'GATO': 'orange'
    }
    
    # Iterar sobre las filas y anadir marcadores
    for idx, row in df_completo.iterrows():
        especie = str(row.get('🐩ESPECIE', 'Desconocido')).upper().strip()
        color = colores.get(especie, 'gray')  # gris para otras especies
        
        nombre = row.get('🐶NOMBRE DEL ANIMAL', 'Sin nombre')
        raza = row.get('🐕RAZA', 'Desconocida')
        
        popup_html = f"<b>Especie:</b> {especie}<br><b>Nombre:</b> {nombre}<br><b>Raza:</b> {raza}"
        
        folium.CircleMarker(
            location=[row['lat'], row['lon']],
            radius=6,
            popup=folium.Popup(popup_html, max_width=200),
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.8
        ).add_to(m)
        
    # Anadir leyenda (de forma sencilla)
    leyenda_html = '''
     <div style="position: fixed; 
     bottom: 50px; left: 50px; width: 120px; height: 90px; 
     border:2px solid grey; z-index:9999; font-size:14px;
     background-color:white; opacity: 0.9;
     ">&nbsp; <b>Especies</b> <br>
     &nbsp; Perro &nbsp; <i class="fa fa-circle" style="color:blue"></i><br>
     &nbsp; Gato &nbsp; <i class="fa fa-circle" style="color:orange"></i>
      </div>
     '''
    m.get_root().html.add_child(folium.Element(leyenda_html))

    output_file = 'mapa_especies_satelital.html'
    m.save(output_file)
    print(f"Mapa guardado exitosamente en: {output_file}")

if __name__ == '__main__':
    main()
