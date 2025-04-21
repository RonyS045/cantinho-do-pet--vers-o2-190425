// Versão do cache - atualize para forçar nova instalação
const CACHE_VERSION = 'v6';
const CACHE_NAME = `cantinho-do-pet-${CACHE_VERSION}`;

// Assets para cache inicial (precache)
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
  '/assets/logo/frogCircular2025-03-31 at 13.21.17.jpeg',
  
  // CDNs externas (cache apenas para recursos essenciais)
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.8/main.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.js',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js'
];

// Estratégia: Cache First com atualização em background
const cacheFirstWithUpdate = async (request) => {
  const cachedResponse = await caches.match(request);
  
  // Sempre faz fetch em background para atualizar cache
  if (navigator.onLine) {
    fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
    }).catch(() => {});
  }
  
  return cachedResponse || fetch(request);
};

// Estratégia: Network First com fallback para cache
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

// ========== INSTALAÇÃO ========== //
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log(`[Service Worker] Cache ${CACHE_NAME} criado`);
      
      // Cache apenas os assets essenciais inicialmente
      const assetsToCache = PRECACHE_ASSETS.filter(asset => 
        !asset.startsWith('http') || 
        asset.includes('fonts.googleapis.com') ||
        asset.includes('cdn.jsdelivr.net') ||
        asset.includes('cdnjs.cloudflare.com')
      );
      
      try {
        await cache.addAll(assetsToCache);
        console.log('[Service Worker] Assets pré-cacheados com sucesso');
      } catch (error) {
        console.error('[Service Worker] Falha ao cachear alguns assets:', error);
      }
      
      // Ativação imediata
      self.skipWaiting();
    })()
  );
});

// ========== ATIVAÇÃO ========== //
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Limpa caches antigos
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.map((key) => {
          if (key !== CACHE_NAME && key.startsWith('cantinho-do-pet-')) {
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

// ========== INTERCEPTAÇÃO DE REQUISIÇÕES ========== //
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições que não são GET
  if (request.method !== 'GET') return;
  
  // Ignora requisições de extensões do navegador
  if (url.protocol === 'chrome-extension:') return;
  
  // Páginas e rotas principais - Network First
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Assets estáticos - Cache First com atualização
  if (
    PRECACHE_ASSETS.some(asset => url.pathname === asset) ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(cacheFirstWithUpdate(request));
    return;
  }

  // CDNs externas - Cache First com atualização em background
  if (
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(cacheFirstWithUpdate(request));
    return;
  }

  // Padrão: Network First para outras requisições
  event.respondWith(networkFirst(request));
});

// ========== MENSAGENS PARA ATUALIZAÇÃO ========== //
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'GET_CACHE_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

// ========== TRATAMENTO DE ERROS ========== //
self.addEventListener('error', (error) => {
  console.error('[Service Worker] Error:', error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] Unhandled Rejection:', event.reason);
});

// ========== SINCRONIZAÇÃO EM BACKGROUND ========== //
self.addEventListener('sync', (event) => {
  if (event.tag === 'syncAgendamentos') {
    console.log('[Service Worker] Sincronização em background iniciada');
    // Aqui você pode adicionar lógica para sincronizar dados quando a conexão voltar
  }
});

// ========== NOTIFICAÇÕES ========== //
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});