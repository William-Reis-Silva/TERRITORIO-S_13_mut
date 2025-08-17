const CACHE_NAME = "arranjo-campo-v1";

// Use caminhos relativos (sem a barra inicial)
const FILES_TO_CACHE = [
  // HTML
  "/index.html",

  // CSS
  "/css/index.css",
  "/css/editar.css",
  "/css/Formularios.css",
  "/css/Login.css",
  "/css/mapas.css",
  "/css/S_13.css",
  "/painel/style.css",
  "/Territorio/CSS/style.css",



  // JavaScript
  "/js/home.js",
  "/js/index.js",
  "/js/editar.js",
  "/js/UnifiedDataManager.js",
  "/js/UIManager.js",
  "/js/Firebaseconfig.js",
  "/js/Cadastro.js",
  "/js/generatePdf.js",
  "/js/Grafico.js",
  "/js/Registro_S13.js",
  "/js/S_13.js",
  "/Territorio/Index.js",
  "/Territorio/Prog_campo.js",
  "/Territorio/tela_cheia.js",
  "/Territorio/script.js",

  // Imagens
  "/img/icone-32x32.png",
  "/img/icone-192.png",
  "/img/icone-512.png",
  "/img/logo.png",
  "/img/mapas/",

  // Manifest
  "/manifest.json",

  // HTML pages
  "/Analise.html",
  "/Cadastro.html",
  "/login.html",
  "/prog_campo.html",
  "/Registro_S13.html",
  "/relatorio.html",
  "/S_13.html",
  "/Territorio/index_territorio.html",
  "/Territorio/Mapa.html",
  "/Territorio/tabela.html",
];

// Função para obter URL base
function getBaseURL() {
  return self.location.origin + self.location.pathname.replace("/sw.js", "");
}

self.addEventListener("install", (event) => {
event.waitUntil(
  caches
    .open(CACHE_NAME)
    .then((cache) => {
      console.log("[SW] Cacheando arquivos");
      return cache.addAll(FILES_TO_CACHE); // ⬅️ Use diretamente os caminhos
    })
    .catch((error) => {
      console.error("[SW] Erro ao cachear arquivos:", error);
    })
);
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Ativando Service Worker");
  event.waitUntil(  caches.keys().then((keyList) => { return Promise.all( keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith("http")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {

        return response;
      }
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          if (event.request.destination === "document") {
            return caches.match(new URL("/index.html", getBaseURL()).href);
          }
        });
    })
  );
});
