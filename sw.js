const V="dokimasia-v8-2026-11-13";
const DATA=["data/atsem.json", "data/avocat.json", "data/cfip.json", "data/cpe.json", "data/gbpm.json", "data/gpx.json", "data/greffier.json", "data/ingenieur-terr.json", "data/inspt.json", "data/redacteur.json", "data/sa.json", "data/sog.json", "data/surveillant.json"];
const FILES=["./","index.html","dokimasia-hors-ligne.html","manifest.webmanifest","icon-192.png","icon-512.png","icon-maskable-512.png","apple-touch-icon.png","favicon.png","voix/neural.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()).then(()=>caches.open(V)).then(c=>Promise.all((typeof DATA!=="undefined"?DATA:[]).map(u=>c.add(u).catch(()=>{})))));});
self.addEventListener("fetch",e=>{const r=e.request;const U=new URL(r.url);if(r.method!=="GET"||U.origin!==location.origin)return;if(U.pathname.includes("/voix/")&&!U.pathname.endsWith("neural.js"))return;
e.respondWith(caches.open(V).then(c=>c.match(r,{ignoreSearch:true}).then(hit=>{const net=fetch(r).then(res=>{if(res&&res.ok)c.put(r,res.clone());return res;}).catch(()=>hit||c.match("index.html"));return hit?(e.waitUntil(net.catch(()=>{})),hit):net;})));});
