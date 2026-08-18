const CACHE_NAME = 'vacunacion-etv-v1';
const DATA_CACHE_NAME = 'vacunacion-data-cache-v1';

const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './logo SSD.png',
    './icon-192.png',
    './icon-512.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Instalar el Service Worker y guardar recursos estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Precaching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activar el Service Worker y limpiar cachés viejas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// Estrategia de Fetch
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Para el archivo de datos (data.js o data.json), usamos estrategia "Network First, falling back to cache"
    // Esto asegura que si hay conexión, siempre se traiga la última versión de la base de datos semanal.
    if (url.pathname.includes('data.js') || url.pathname.includes('data.json')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Si la red responde, guardamos en la caché de datos
                    const clonedResponse = response.clone();
                    caches.open(DATA_CACHE_NAME).then((cache) => {
                        cache.put(event.request, clonedResponse);
                    });
                    return response;
                })
                .catch(() => {
                    // Si no hay red, buscamos en la caché
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Para el resto de los recursos estáticos, usamos "Cache First, falling back to network"
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                // Opcional: Si queremos guardar en caché todo lo que se va descargando
                // let responseClone = networkResponse.clone();
                // caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                return networkResponse;
            });
        })
    );
});
