// ================================================================
//  TERRITÓRIO S-13 — SERVICE WORKER
//  Estratégia: Network-first com fallback para cache
//  Cache individual com try/catch — um arquivo faltando NÃO
//  derruba o registro inteiro do SW.
// ================================================================

const CACHE_NAME    = "s13-v3";
const CACHE_OFFLINE = "s13-offline-v3";

// Arquivos essenciais para funcionamento offline básico.
// REGRA: só liste arquivos que EXISTEM com certeza.
// Se um arquivo não existir, o SW simplesmente o ignora.
const ARQUIVOS_SHELL = [
  "./index.html",
  "./login.html",
  "./Cadastro.html",
  "./Registro_S13.html",
  "./S_13.html",
  "./manifest.json",
  "./css/design-system.css",
  "./Painel/painel.html",
];

// Arquivos opcionais — cacheados individualmente, falha silenciosa
const ARQUIVOS_OPCIONAIS = [
  "./js/supabase_config.js",
  "./Territorio/index_territorio.html",
  "./Territorio/Mapa.html",
];

// ================================================================
//  INSTALL — cachear shell com segurança
// ================================================================
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Cachear arquivos essenciais um a um
      // Se um falhar, continua os demais (não usa addAll)
      const resultados = await Promise.allSettled(
        ARQUIVOS_SHELL.map(url =>
          cache.add(url).catch(err => {
            console.warn(`[SW] Não foi possível cachear: ${url}`, err.message);
          })
        )
      );

      // Cachear opcionais silenciosamente
      await Promise.allSettled(
        ARQUIVOS_OPCIONAIS.map(url =>
          cache.add(url).catch(() => {
            // silencioso — arquivo pode não existir ainda
          })
        )
      );

      const ok = resultados.filter(r => r.status === "fulfilled").length;
      console.log(`[SW] Instalado — ${ok}/${ARQUIVOS_SHELL.length} arquivos cacheados`);
    })()
  );

  // Ativa imediatamente sem esperar abas antigas fecharem
  self.skipWaiting();
});

// ================================================================
//  ACTIVATE — limpar caches antigos
// ================================================================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== CACHE_OFFLINE)
          .map(key => {
            console.log(`[SW] Removendo cache antigo: ${key}`);
            return caches.delete(key);
          })
      );
      // Assume controle de todas as abas abertas
      await self.clients.claim();
      console.log("[SW] Ativado e controlando todas as abas");
    })()
  );
});

// ================================================================
//  FETCH — Network-first com fallback para cache
//
//  Lógica:
//    1. Tenta buscar da rede
//    2. Se sucesso → atualiza o cache e retorna
//    3. Se falha de rede → tenta retornar do cache
//    4. Se não há cache → retorna página offline básica
//
//  Exceções (não intercepta):
//    - Requests para o Supabase (API externa)
//    - Requests para CDN externas (fonts, FA, jsPDF)
//    - Requests com método != GET
// ================================================================
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ignorar requisições não-GET
  if (event.request.method !== "GET") return;

  // Ignorar APIs externas — Supabase, CDNs, fonts
  const EXTERNOS = [
    "supabase.co",
    "cdnjs.cloudflare.com",
    "cdn.jsdelivr.net",
    "fonts.googleapis.com",
    "fonts.gstatic.com",
  ];
  if (EXTERNOS.some(host => url.hostname.includes(host))) return;

  // Ignorar chrome-extension e outros esquemas não-http
  if (!url.protocol.startsWith("http")) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        // 1. Tentar rede
        const resposta = await fetch(event.request);

        // 2. Se OK, atualizar cache e retornar
        if (resposta && resposta.status === 200) {
          cache.put(event.request, resposta.clone()).catch(() => {});
        }

        return resposta;

      } catch (erroRede) {
        // 3. Sem rede — tentar cache
        const cached = await cache.match(event.request);
        if (cached) {
          console.log(`[SW] Offline — servindo do cache: ${url.pathname}`);
          return cached;
        }

        // 4. Sem cache — resposta de fallback para navegação
        if (event.request.mode === "navigate") {
          const fallback = await cache.match("./index.html");
          if (fallback) return fallback;
        }

        // Sem nada — deixar o browser lidar
        return new Response("Sem conexão e sem cache disponível.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })()
  );
});

// ================================================================
//  MESSAGE — forçar atualização a partir da aplicação
// ================================================================
self.addEventListener("message", (event) => {
  if (event.data?.action === "skipWaiting") {
    self.skipWaiting();
  }
});
