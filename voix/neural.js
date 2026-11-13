/* Dokimasia – voix neuronales françaises hors ligne (Piper, ONNX Runtime Web).
   Modèles : rhasspy/piper-voices (Hugging Face). Moteur : onnxruntime-web 1.18 (MIT),
   piper_phonemize/espeak-ng (WASM). Tout est mis en cache dans le navigateur après le premier téléchargement. */
(function(){
"use strict";
var HF=window.DOKI_HF||"https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/";
var BASE=new URL("./",document.currentScript?document.currentScript.src:location.href).href;
var CACHE="dokimasia-voix-neurales-v1";
var ENGINE=[{u:BASE+"ort.wasm.min.js",s:142930},{u:BASE+"ort-wasm-simd.wasm",s:10595041},{u:BASE+"piper_phonemize.mjs",s:158217},{u:BASE+"piper_phonemize.wasm",s:635212},{u:BASE+"piper_phonemize.data",s:18077249}];
var MODELS={
 siwis:{file:"siwis/medium/fr_FR-siwis-medium",size:63221984},
 upmc:{file:"upmc/medium/fr_FR-upmc-medium",size:76733615}
};
var VOICES=[
 {id:"siwis",nom:"Siwis",genre:"femme",model:"siwis",sid:0,credit:"Corpus SIWIS (Université d’Édimbourg), licence CC BY 4.0"},
 {id:"pierre",nom:"Pierre",genre:"homme",model:"upmc",sid:1,credit:"Corpus UPMC Pierre / MaryTTS, licence CC BY-SA 4.0"},
 {id:"jessica",nom:"Jessica",genre:"femme",model:"upmc",sid:0,credit:"Corpus UPMC Jessica / MaryTTS, licence CC BY-SA 4.0"}
];
function engineSize(){return ENGINE.reduce(function(a,f){return a+f.s},0);}
function mo(n){return Math.round(n/1048576)+" Mo";}
function modelUrls(m){return [HF+MODELS[m].file+".onnx",HF+MODELS[m].file+".onnx.json"];}

async function cached(url){var c=await caches.open(CACHE);return c.match(url);}
async function isStored(url){try{return !!(await cached(url));}catch(e){return false;}}
async function engineReady(){for(var i=0;i<ENGINE.length;i++)if(!(await isStored(ENGINE[i].u)))return false;return true;}
async function modelReady(m){var u=modelUrls(m);return (await isStored(u[0]))&&(await isStored(u[1]));}
async function voiceReady(id){var v=VOICES.find(function(x){return x.id===id});return !!v&&(await engineReady())&&(await modelReady(v.model));}
async function toDownload(id){var v=VOICES.find(function(x){return x.id===id}),t=0;if(!(await engineReady()))t+=engineSize();if(!(await modelReady(v.model)))t+=MODELS[v.model].size;return t;}

async function fetchStore(url,expected,onBytes){
 var c=await caches.open(CACHE);var hit=await c.match(url);if(hit){onBytes(expected||0);return;}
 var r=await fetch(url,{mode:"cors"});if(!r.ok)throw new Error("Téléchargement impossible ("+r.status+")");
 var reader=r.body&&r.body.getReader?r.body.getReader():null,parts=[],got=0;
 if(reader){for(;;){var x=await reader.read();if(x.done)break;parts.push(x.value);got+=x.value.length;onBytes(got);}}
 else{var b=new Uint8Array(await r.arrayBuffer());parts.push(b);got=b.length;onBytes(got);}
 var type=/\.wasm$/.test(url)?"application/wasm":/\.m?js$/.test(url)?"text/javascript":/\.json$/.test(url)?"application/json":"application/octet-stream";
 await c.put(url,new Response(new Blob(parts,{type:type}),{headers:{"Content-Type":type}}));
}
async function download(id,progress){
 var v=VOICES.find(function(x){return x.id===id});var list=[];
 ENGINE.forEach(function(f){list.push({u:f.u,s:f.s})});
 var mu=modelUrls(v.model);list.push({u:mu[0],s:MODELS[v.model].size});list.push({u:mu[1],s:6000});
 var todo=[];for(var i=0;i<list.length;i++)if(!(await isStored(list[i].u)))todo.push(list[i]);
 var total=todo.reduce(function(a,f){return a+f.s},0),done=0;
 for(var j=0;j<todo.length;j++){var f=todo[j];await fetchStore(f.u,f.s,function(n){progress&&progress(Math.min(total,done+n),total);});done+=f.s;progress&&progress(done,total);}
 try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}
}

/* ---------- moteur ---------- */
var ortP=null,phonP=null,sessions={},configs={},blobUrls={};
async function blobUrl(url){if(blobUrls[url])return blobUrls[url];var r=await cached(url)||await fetch(url);var b=await r.blob();return blobUrls[url]=URL.createObjectURL(b);}
function loadOrt(){if(ortP)return ortP;ortP=(async function(){if(!window.ort){var src=await blobUrl(BASE+"ort.wasm.min.js");await new Promise(function(ok,ko){var s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=function(){ko(new Error("Moteur ONNX introuvable"))};document.head.appendChild(s);});}
 var ort=window.ort;ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
 ort.env.wasm.wasmPaths={"ort-wasm-simd.wasm":await blobUrl(BASE+"ort-wasm-simd.wasm"),"ort-wasm.wasm":await blobUrl(BASE+"ort-wasm-simd.wasm")};
 return ort;})();ortP.catch(function(){ortP=null});return ortP;}
function loadPhon(){if(phonP)return phonP;phonP=(async function(){var src=await blobUrl(BASE+"piper_phonemize.mjs");var mod=await import(src);
 var wasmU=await blobUrl(BASE+"piper_phonemize.wasm"),dataU=await blobUrl(BASE+"piper_phonemize.data");
 return {create:mod.createPiperPhonemize,wasm:wasmU,data:dataU};})();phonP.catch(function(){phonP=null});return phonP;}
async function phonemize(text,voice){var P=await loadPhon();
 return new Promise(function(resolve,reject){var out=null;
  P.create({print:function(d){try{out=JSON.parse(d).phoneme_ids;}catch(e){}},printErr:function(){},
   locateFile:function(u){return u.endsWith(".wasm")?P.wasm:u.endsWith(".data")?P.data:u}}).then(function(m){
   try{m.callMain(["-l",voice,"--input",JSON.stringify([{text:text}]),"--espeak_data","/espeak-ng-data"]);}catch(e){}
   out?resolve(out):reject(new Error("Phonétisation impossible"));},reject);});}
async function session(model){if(sessions[model])return sessions[model];
 sessions[model]=(async function(){var ort=await loadOrt();var mu=modelUrls(model);
  var cfgR=await cached(mu[1])||await fetch(mu[1]);configs[model]=await cfgR.json();
  var r=await cached(mu[0])||await fetch(mu[0]);var buf=await r.arrayBuffer();
  return ort.InferenceSession.create(buf,{executionProviders:["wasm"],graphOptimizationLevel:"all"});})();
 sessions[model].catch(function(){delete sessions[model]});return sessions[model];}
async function synth(text,id,rate){var v=VOICES.find(function(x){return x.id===id});var s=await session(v.model),cfg=configs[v.model],ort=window.ort;
 var ids=await phonemize(text,(cfg.espeak&&cfg.espeak.voice)||"fr");
 var inf=cfg.inference||{};var feeds={input:new ort.Tensor("int64",BigInt64Array.from(ids.map(BigInt)),[1,ids.length]),
  input_lengths:new ort.Tensor("int64",BigInt64Array.from([BigInt(ids.length)]),[1]),
  scales:new ort.Tensor("float32",Float32Array.from([inf.noise_scale!=null?inf.noise_scale:0.667,(inf.length_scale||1)/(rate||1),inf.noise_w!=null?inf.noise_w:0.8]),[3])};
 if(cfg.num_speakers>1)feeds.sid=new ort.Tensor("int64",BigInt64Array.from([BigInt(v.sid)]),[1]);
 var res=await s.run(feeds);return {pcm:res.output.data,rate:cfg.audio.sample_rate};}

/* ---------- lecture ---------- */
var ctx=null,src=null;
function audio(){if(!ctx){var AC=window.AudioContext||window.webkitAudioContext;ctx=new AC();}if(ctx.state==="suspended")ctx.resume();return ctx;}
function stopAudio(){try{if(src){src.onended=null;src.stop();}}catch(e){}src=null;}
function play(r){return new Promise(function(ok){var c=audio();var b=c.createBuffer(1,r.pcm.length,r.rate);b.copyToChannel?b.copyToChannel(r.pcm,0):b.getChannelData(0).set(r.pcm);
 stopAudio();src=c.createBufferSource();src.buffer=b;src.connect(c.destination);src.onended=function(){src=null;ok();};src.start();});}

window.DokiNeural={VOICES:VOICES,MODELS:MODELS,engineSize:engineSize,mo:mo,voiceReady:voiceReady,toDownload:toDownload,download:download,synth:synth,play:play,stop:stopAudio,unlock:function(){try{audio()}catch(e){}},
 remove:async function(){stopAudio();sessions={};await caches.delete(CACHE);}};
})();
