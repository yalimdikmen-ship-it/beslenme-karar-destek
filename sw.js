const APP_CACHE='master-nutrisyon-app-v6-0';
const DATA_CACHE='master-nutrisyon-product-data';
const APP_ASSETS=[
  './','./index.html','./manifest.webmanifest',
  './icon-192.png','./icon-512.png','./apple-touch-icon.png',
  './data/products.json','./data/version.json'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(APP_CACHE).then(c=>c.addAll(APP_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k.startsWith('master-nutrisyon-app-') && k!==APP_CACHE).map(k=>caches.delete(k))
    ))
  );
  self.clients.claim();
});

function isDataRequest(url){
  return url.pathname.endsWith('/data/products.json') || url.pathname.endsWith('/data/version.json');
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(isDataRequest(url)){
    event.respondWith(
      fetch(event.request).then(response=>{
        if(response && response.ok){
          const copy=response.clone();
          caches.open(DATA_CACHE).then(c=>c.put(event.request,copy));
        }
        return response;
      }).catch(()=>caches.match(event.request).then(r=>r||caches.match(url.pathname.endsWith('products.json')?'./data/products.json':'./data/version.json')))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request))
  );
});
