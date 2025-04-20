// Versão do cache - atualize para forçar nova instalação
const CACHE_VERSION = 'v5';
const CACHE_NAME = `cantinho-do-pet-${CACHE_VERSION}`;

// Assets para cache inicial
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/relatorio.js',
  '/manifest.json',
  
  // Assets locais
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/assets/logo/WhatsApp Image 2025-04-18 at 15.16.34.jpeg',
  '/assets/dev-logo.png',
  
  // CDNs externas
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.8/main.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Estratégia: Cache First, falling back to network
const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  return cachedResponse || fetch(request);
};

// Estratégia: Network First, falling back to cache
const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline - Conteúdo não disponível', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({ 'Content-Type': 'text/plain' })
    });
  }
};

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log(`[Service Worker] Cache ${CACHE_NAME} aberto`);
      
      // Adiciona apenas os assets essenciais inicialmente
      const assetsToCache = PRECACHE_ASSETS.filter(asset => 
        !asset.startsWith('http') || 
        asset.includes('fonts.googleapis.com') ||
        asset.includes('cdn.jsdelivr.net/bootstrap') ||
        asset.includes('cdnjs.cloudflare.com/font-awesome')
      );
      
      try {
        await cache.addAll(assetsToCache);
        console.log('[Service Worker] Assets pré-cacheados');
      } catch (error) {
        console.error('[Service Worker] Falha ao cachear alguns assets:', error);
      }
      
      // Pula a espera para ativação imediata
      self.skipWaiting();
    })()
  );
});


const ASSETS = [
  '/cantinho-do-pet/agendamentos/',
  '/cantinho-do-pet/agendamentos/index.html',
  // ... outros caminhos absolutos
];


// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Limpa caches antigos
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
      
      // Assume controle de todas as páginas imediatamente
      await self.clients.claim();
      console.log('[Service Worker] Ativado e pronto para controlar fetches!');
    })()
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições que não são GET ou de outros tipos
  if (request.method !== 'GET') return;
  
  // Ignora requisições de extensões do navegador
  if (url.protocol === 'chrome-extension:') return;
  
  // Páginas e rotas principais - Network First
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Assets estáticos - Cache First
  if (
    PRECACHE_ASSETS.some(asset => url.pathname === asset) ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // CDNs externas - Cache First com atualização em background
  if (
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      (async () => {
        // Retorna do cache imediatamente
        const cachedResponse = await caches.match(request);
        
        // Atualiza o cache em background se online
        if (navigator.onLine) {
          fetch(request).then(async (response) => {
            if (response.ok) {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(request, response);
            }
          }).catch(e => console.log('Background sync failed:', e));
        }
        
        return cachedResponse || fetch(request);
      })()
    );
    return;
  }

  // Padrão: Network First para outras requisições
  event.respondWith(networkFirst(request));
});

// Mensagens para atualização em background
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Tratamento de erros global
self.addEventListener('error', (event) => {
  console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] Unhandled Rejection:', event.reason);
});