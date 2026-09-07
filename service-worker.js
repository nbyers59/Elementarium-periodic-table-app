const CACHE_NAME = "elementarium-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg"
];

/*
  Install:
  Save the core Elementarium app files on the phone.
*/
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
  );

  self.skipWaiting();
});

/*
  Activate:
  Remove older saved versions when you update the app.
*/
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

/*
  Fetch:
  - Use the saved app file first when offline.
  - Try the network for live PubChem requests.
  - If PubChem is unavailable, allow your app's local data to keep working.
*/
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /*
    PubChem is live optional data.
    Do not cache its large/detail responses here.
  */
  if (url.hostname.includes("pubchem.ncbi.nlm.nih.gov")) {
    event.respondWith(fetch(request));
    return;
  }

  /*
    App files:
    Use cache first, then download and save new files.
  */
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then(networkResponse => {
          const responseCopy = networkResponse.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseCopy);
          });

          return networkResponse;
        })
        .catch(() => {
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
