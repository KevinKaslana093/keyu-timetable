const BUILD = '__BUILD_ID__';
const CACHE = 'keyu-' + BUILD;
const FILES = __CACHE_FILES__;
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.all(FILES.map(async file=>{
    const url=new URL(file,self.location.href);
    url.searchParams.set('build',BUILD);
    const response=await fetch(url,{cache:'reload'});
    if(!response.ok)throw new Error('Offline resource missing: '+file);
    await cache.put(new URL(file,self.location.href),response);
  }));
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  await Promise.all((await caches.keys()).filter(k=>k.startsWith('keyu-')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(event.request.mode==='navigate')return (await cache.match(new URL('index.html',self.location.href)))||fetch(event.request);
    url.search='';
    return (await cache.match(url))||fetch(event.request);
  })());
});
