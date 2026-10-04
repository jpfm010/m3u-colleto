const http=require("http");
const fs=require("fs");
const path=require("path");
const {URL}=require("url");
const PORT=process.env.PORT||3000;
const ROOT=path.join(__dirname,"public");
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8"};

function send(res,status,data,type="application/json"){
  res.writeHead(status,{"Content-Type":type,"Access-Control-Allow-Origin":"*","Cache-Control":"no-store"});
  res.end(typeof data==="string"?data:JSON.stringify(data));
}
function readBody(req){return new Promise((resolve,reject)=>{let b="";req.on("data",c=>{b+=c;if(b.length>2e6)req.destroy()});req.on("end",()=>{try{resolve(b?JSON.parse(b):{})}catch(e){reject(e)}});req.on("error",reject)})}
function authUrl(server,user,pass){const u=new URL(String(server||"").replace(/\/+$/,""));u.searchParams.set("username",user);u.searchParams.set("password",pass);return u.toString()}
async function xtream(server,action,params){
  const u=new URL(String(server||"").replace(/\/+$/,""));
  Object.entries(params||{}).forEach(([k,v])=>u.searchParams.set(k,v));
  if(action)u.searchParams.set("action",action);
  const r=await fetch(u,{headers:{"User-Agent":"M3U-Collector-Web/1.0"},signal:AbortSignal.timeout(20000)});
  const t=await r.text(); if(!r.ok)throw Error("Xtream HTTP "+r.status);
  try{return JSON.parse(t)}catch{throw Error("Resposta não é JSON")}
}
const clean=s=>String(s??"").replace(/[\r\n]+/g," ").trim();
function liveEntry(x,server,user,pass,map){return {name:x.name,logo:clean(x.stream_icon),group:map[String(x.category_id)]||"Canais",url:authUrl(server,user,pass).replace(/\/+$/,"")+"/live/"+encodeURIComponent(user)+"/"+encodeURIComponent(pass)+"/"+x.stream_id+".m3u8"}}
function vodEntry(x,server,user,pass,map){return {name:x.name,logo:clean(x.stream_icon),group:map[String(x.category_id)]||"Filmes",url:authUrl(server,user,pass).replace(/\/+$/,"")+"/movie/"+encodeURIComponent(user)+"/"+encodeURIComponent(pass)+"/"+x.stream_id+"."+(x.container_extension||"mp4")}}
async function api(req,res){
  const u=new URL(req.url,"http://localhost");
  if(req.method==="OPTIONS"){res.writeHead(204,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type"});return res.end()}
  if(req.method==="GET"&&u.pathname==="/api/health")return send(res,200,{ok:true,app:"M3U Collector Web",version:"1.0.0"});
  if(req.method!=="POST")return send(res,404,{error:"Not found"});
  let b;try{b=await readBody(req)}catch{return send(res,400,{error:"JSON inválido"})}
  try{
    if(u.pathname==="/api/test"){const d=await xtream(b.server,"",{username:b.username,password:b.password});return send(res,200,{ok:true,serverInfo:{user_info:d.user_info,server_info:d.server_info}})}
    if(u.pathname==="/api/collect"){
      const type=b.type||"live";let cats,streams,map;
      if(type==="live"){cats=await xtream(b.server,"get_live_categories",{username:b.username,password:b.password});streams=await xtream(b.server,"get_live_streams",{username:b.username,password:b.password});map=Object.fromEntries((cats||[]).map(x=>[String(x.category_id),x.category_name]));return send(res,200,{type,items:(streams||[]).map(x=>liveEntry(x,b.server,b.username,b.password,map))})}
      if(type==="vod"){cats=await xtream(b.server,"get_vod_categories",{username:b.username,password:b.password});streams=await xtream(b.server,"get_vod_streams",{username:b.username,password:b.password});map=Object.fromEntries((cats||[]).map(x=>[String(x.category_id),x.category_name]));return send(res,200,{type,items:(streams||[]).map(x=>vodEntry(x,b.server,b.username,b.password,map))})}
      if(type==="series"){cats=await xtream(b.server,"get_series_categories",{username:b.username,password:b.password});streams=await xtream(b.server,"get_series",{username:b.username,password:b.password});map=Object.fromEntries((cats||[]).map(x=>[String(x.category_id),x.category_name]));return send(res,200,{type,items:(streams||[]).map(x=>({name:x.name,logo:clean(x.cover||""),group:map[String(x.category_id)]||"Séries",url:b.server}))})}
      throw Error("Tipo de coleta inválido")
    }
    return send(res,404,{error:"Endpoint não encontrado"})
  }catch(e){return send(res,502,{error:e.message||"Falha na operação"})}
}
const server=http.createServer((req,res)=>{
  if(req.url.startsWith("/api/"))return api(req,res);
  let p=new URL(req.url,"http://localhost").pathname;if(p==="/")p="/index.html";
  const file=path.normalize(path.join(ROOT,p));if(!file.startsWith(ROOT))return send(res,403,{error:"Forbidden"});
  fs.readFile(file,(err,data)=>{if(err)return send(res,404,"Not found","text/plain; charset=utf-8");send(res,200,data,MIME[path.extname(file)]||"application/octet-stream")})
});
server.listen(PORT,()=>console.log("M3U Collector Web em http://localhost:"+PORT));
