const CACHE_NAME = "arranjo-campo-v2";

const FILES_TO_CACHE = [
  "./index.html",
  "./login.html",
  "./Cadastro.html",
  "./Registro_S13.html",
  "./S_13.html",

  "./manifest.json",

  // JS
  "./js/index.js",
  "./js/home.js",
  "./js/Cadastro.js",
  "./js/editar.js",
  "./js/Firebaseconfig.js",
  "./js/generatePdf.js",
  "./js/Registro_S13.js",
  "./js/S_13.js",
  "./js/UIManager.js",
  "./js/UnifiedDataManager.js",

  // Painel
  "./Painel/painel.html",
  "./Painel/script.js",
  "./Painel/style.css",

  // Territorio
  "./Territorio/index_territorio.html",
  "./Territorio/Mapa.html",
  "./Territorio/tabela.html",
  "./Territorio/especial.html",
  "./Territorio/Prog_campo.js",
  "./Territorio/script.js",
  "./Territorio/tela_cheia.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Cacheando arquivos");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});
