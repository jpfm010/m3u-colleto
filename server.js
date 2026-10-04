const http=require("http");
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");
const {URL}=require("url");
const PORT=process.env.PORT||3000;
const ROOT=path.join(__dirname,"public");
const PANEL_USER=process.env.PANEL_USER||"admin";
const PANEL_PASSWORD=process.env.PANEL_PASSWORD||"admin123";
const sessions=new Map();
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8"};

function send(res,status,data,type="application/json",extra={}){
  res.writeHead(status,{"Content-Type":type,"Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Credentials":"true",...extra});
  res.end(typeof data==="string"?data:JSON.stringify(data));
}
function readBody(req){return new Promise((resolve,reject)=>{let b="";req.on("data",c=>{b+=c;if(b.length>3e6){req.destroy();reject(Error("Payload muito grande"))}});req.on("end",()=>{try{resolve(b?JSON.parse(b):{})}catch(e){reject(e)}});req.on("error",reject)})}
function cookie(req){return (req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("m3u_session="))?.split("=")[1]}
function isAuth(req){const id=cookie(req);return !!(id&&sessions.has(id))}
function requireAuth(req,res){if(isAuth(req))return true;send(res,401,{error:"Não autenticado"});return false}
function panelBase(server){
  const raw=String(server||"").trim();
  const u=new URL(raw);
  let p=u.pathname||"/";
  p=p.replace(/\/player_api\.php\/?$/i,"/");
  p=p.replace(/\/+$/,"");
  return u.origin+(p?"/"+p.replace(/^\/+|\/+$/g,""):"");
}
function xtreamUrl(server){
  const raw=String(server||"").trim();
  const u=new URL(raw);
  if(!/\/player_api\.php\/?$/i.test(u.pathname||"")){
    let p=(u.pathname||"/").replace(/\/+$/,"");
    u.pathname=(p?p:"")+"/player_api.php";
  }
  return u;
}
function authUrl(server,user,pass){
  const u=xtreamUrl(server);
  u.searchParams.set("username",user);
  u.searchParams.set("password",pass);
  return u.toString();
}
async function xtream(server,action,params){
  const u=xtreamUrl(server);
  Object.entries(params||{}).forEach(([k,v])=>u.searchParams.set(k,v));
  if(action)u.searchParams.set("action",action);
  const r=await fetch(u,{headers:{"User-Agent":"M3U-Collector-Web/2.0","Accept":"application/json"},signal:AbortSignal.timeout(20000),redirect:"follow"});
  const t=await r.text();
  if(!r.ok)throw Error("Servidor Xtream retornou HTTP "+r.status+" em "+u.pathname+". Verifique URL, usuário e senha.");
  try{return JSON.parse(t)}catch{throw Error("Servidor Xtream não retornou JSON. URL usada: "+u.pathname)}
}
const clean=s=>String(s??"").replace(/[\r\n]+/g," ").trim();
function base(server,user,pass,pathPart){return String(server).replace(/\/+$/,"")+pathPart.replace(/\{2,}/g,"/")}
function liveEntry(x,s,u,p,map){return {name:clean(x.name),logo:clean(x.stream_icon),group:map[String(x.category_id)]||"Canais",url:base(s,u,p,"/live/"+encodeURIComponent(u)+"/"+encodeURIComponent(p)+"/"+x.stream_id+".m3u8")}}
function vodEntry(x,s,u,p,map){return {name:clean(x.name),logo:clean(x.stream_icon),group:map[String(x.category_id)]||"Filmes",url:base(s,u,p,"/movie/"+encodeURIComponent(u)+"/"+encodeURIComponent(p)+"/"+x.stream_id+"."+(x.container_extension||"mp4"))}}
async function seriesEntries(streams,s,u,p,map){
  const out=[];
  for(const x of streams||[]){
    try{
      const info=await xtream(s,"get_series_info",{username:u,password:p,series_id:x.series_id});
      const eps=info?.episodes||{};
      for(const [season,list] of Object.entries(eps)) for(const e of list||[]){
        const ext=e.container_extension||"mp4";
        const url=base(s,u,p,"/series/"+encodeURIComponent(u)+"/"+encodeURIComponent(p)+"/"+x.series_id+"/"+e.id+"."+ext);
        out.push({name:clean(x.name)+" - S"+String(season).padStart(2,"0")+"E"+String(e.episode_num).padStart(2,"0")+(e.title?" - "+clean(e.title):""),logo:clean(x.cover||x.backdrop_path?.[0]||""),group:map[String(x.category_id)]||"Séries",url,series:x.name,season,episode:e.episode_num});
      }
    }catch{out.push({name:clean(x.name),logo:clean(x.cover||""),group:map[String(x.category_id)]||"Séries",url:s,series:x.name})}
  }
  return out;
}
async function api(req,res){
  const u=new URL(req.url,"http://localhost");
  if(req.method==="OPTIONS"){res.writeHead(204,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Credentials":"true"});return res.end()}
  if(req.method==="GET"&&u.pathname==="/api/health")return send(res,200,{ok:true,app:"M3U Collector Web",version:"2.0.0"});
  if(req.method==="POST"&&u.pathname==="/api/login"){
    let b;try{b=await readBody(req)}catch{return send(res,400,{error:"JSON inválido"})}
    if(b.username!==PANEL_USER||b.password!==PANEL_PASSWORD)return send(res,401,{error:"Usuário ou senha inválidos"});
    const id=crypto.randomBytes(32).toString("hex");sessions.set(id,Date.now());
    return send(res,200,{ok:true,user:PANEL_USER},"application/json",{"Set-Cookie":"m3u_session="+id+"; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200"});
  }
  if(req.method==="POST"&&u.pathname==="/api/logout"){
    const id=cookie(req);if(id)sessions.delete(id);
    return send(res,200,{ok:true},"application/json",{"Set-Cookie":"m3u_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"});
  }
  if(req.method==="GET"&&u.pathname==="/api/session")return send(res,200,{authenticated:isAuth(req)});
  if(req.method!=="POST")return send(res,404,{error:"Not found"});
  if(!requireAuth(req,res))return;
  let b;try{b=await readBody(req)}catch{return send(res,400,{error:"JSON inválido"})}
  try{
    if(u.pathname==="/api/test"){
      const d=await xtream(b.server,"",{username:b.username,password:b.password});
      return send(res,200,{ok:true,serverInfo:{user_info:d.user_info,server_info:d.server_info}});
    }
    if(u.pathname==="/api/stream-test"){
      const target=String(b.url||"");if(!/^https?:\/\//i.test(target))throw Error("URL de stream inválida");
      const r=await fetch(target,{headers:{"User-Agent":"M3U-Collector-Web/2.0","Range":"bytes=0-2047"},redirect:"follow",signal:AbortSignal.timeout(12000)});
      const text=await r.text();
      return send(res,200,{ok:r.ok||r.status===206,status:r.status,contentType:r.headers.get("content-type")||"",bytes:text.length,snippet:text.slice(0,500)});
    }
    if(u.pathname==="/api/collect"){
      const type=b.type||"live";let cats,streams,map;
      if(type==="live"){cats=await xtream(b.server,"get_live_categories",{username:b.username,password:b.password});streams=await xtream(b.server,"get_live_streams",{username:b.username,password:b.password});map=Object.fromEntries((cats||[]).map(x=>[String(x.category_id),x.category_name]));return send(res,200,{type,items:(streams||[]).map(x=>liveEntry(x,b.server,b.username,b.password,map))})}
      if(type==="vod"){cats=await xtream(b.server,"get_vod_categories",{username:b.username,password:b.password});streams=await xtream(b.server,"get_vod_streams",{username:b.username,password:b.password});map=Object.fromEntries((cats||[]).map(x=>[String(x.category_id),x.category_name]));return send(res,200,{type,items:(streams||[]).map(x=>vodEntry(x,b.server,b.username,b.password,map))})}
      if(type==="series"){cats=await xtream(b.server,"get_series_categories",{username:b.username,password:b.password});streams=await xtream(b.server,"get_series",{username:b.username,password:b.password});map=Object.fromEntries((cats||[]).map(x=>[String(x.category_id),x.category_name]));return send(res,200,{type,items:await seriesEntries(streams,b.server,b.username,b.password,map)})}
      throw Error("Tipo de coleta inválido");
    }
    return send(res,404,{error:"Endpoint não encontrado"});
  }catch(e){return send(res,502,{error:e.message||"Falha na operação"})}
}
const server=http.createServer((req,res)=>{
  if(req.url.startsWith("/api/"))return api(req,res);
  let p=new URL(req.url,"http://localhost").pathname;if(p==="/")p="/index.html";
  const file=path.normalize(path.join(ROOT,p));if(!file.startsWith(ROOT))return send(res,403,{error:"Forbidden"});
  fs.readFile(file,(err,data)=>{if(err)return send(res,404,"Not found","text/plain; charset=utf-8");send(res,200,data,MIME[path.extname(file)]||"application/octet-stream")})
});
setInterval(()=>{const now=Date.now();for(const [id,t] of sessions)if(now-t>43200000)sessions.delete(id)},3600000);
server.listen(PORT,()=>console.log("M3U Collector Web em http://localhost:"+PORT));
