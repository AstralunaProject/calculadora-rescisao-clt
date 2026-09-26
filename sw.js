const CACHE = "rescisao-v2";
const ARQUIVOS = [
  "./",
  "./index.html",
  "./style.css",
  "./src/app.js",
  "./src/rescisao.js",
  "./icon.svg",
  "./manifest.webmanifest",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((nome) => nome !== CACHE).map((nome) => caches.delete(nome))))
      .then(() => self.clients.claim()),
  );
});

// Rede primeiro para que correções nas regras cheguem logo; o cache só cobre o uso offline.
self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  evento.respondWith(
    fetch(request)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((salvo) => salvo ?? Response.error())),
  );
});
