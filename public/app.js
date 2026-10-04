const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let items=[];
const saved=JSON.parse(localStorage.getItem("m3uServers")||"[]");
function addServer(v={}){const d=document.createElement("div");d.className="server";d.innerHTML='<input class="srv" placeholder="http://servidor:porta"><input class="usr" placeholder="Usuário"><input class="pwd" type="password" placeholder="Senha"><button class="remove">×</button>';d.querySelector(".srv").value=v.server||"";d.querySelector(".usr").value=v.username||"";d.querySelector(".pwd").value=v.password||"";d.querySelector(".remove").onclick=()=>{if($$(".server").length>1)d.remove()};$("#servers").appendChild(d)}
(saved.length?saved:[{}]).slice(0,5).forEach(addServer);
function servers(){return $$(".server").map(d=>({server:d.querySelector(".srv").value.trim(),username:d.querySelector(".usr").value.trim(),password:d.querySelector(".pwd").value})).filter(x=>x.server)}
function active(){const s=servers()[0];if(!s)throw Error("Informe pelo menos um servidor.");return s}
function status(t){$("#status").textContent=t}
async function post(url,data){const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw Error(j.error||"Falha");return j}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function attr(v){return String(v??"").replace(/"/g,"&quot;")}
function parseM3U(text,source="Importado"){
 const lines=String(text||"").replace(/^\uFEFF/,"").split(/\r?\n/),out=[];let meta=null;
 for(const line of lines){const l=line.trim();if(!l)continue;if(l.toUpperCase().startsWith("#EXTINF")){meta=l;continue}if(l.startsWith("#"))continue;if(meta){const comma=meta.indexOf(",");const title=comma>=0?meta.slice(comma+1).trim():"Sem nome";const get=k=>{const m=meta.match(new RegExp(k+'="([^"]*)"',"i"));return m?m[1]:""};out.push({name:title,logo:get("tvg-logo"),group:get("group-title")||"Importados",url:l,server:source,type:"import"});meta=null}}
 return out;
}
function refreshFilters(){const groups=[...new Set(items.map(x=>x.group||"Sem grupo"))].sort((a,b)=>a.localeCompare(b));const servers=[...new Set(items.map(x=>x.server||"Importado"))].sort((a,b)=>a.localeCompare(b));$("#groupFilter").innerHTML='<option value="">Todos os grupos</option>'+groups.map(x=>'<option>'+esc(x)+'</option>').join("");$("#serverFilter").innerHTML='<option value="">Todos os servidores</option>'+servers.map(x=>'<option>'+esc(x)+'</option>').join("")}
function visible(){const q=$("#filter").value.toLowerCase(),g=$("#groupFilter").value,s=$("#serverFilter").value;return items.map((x,i)=>({...x,_i:i})).filter(x=>(!q||(x.name+" "+x.group+" "+x.server).toLowerCase().includes(q))&&(!g||x.group===g)&&(!s||x.server===s))}
function render(){refreshFilters();const shown=visible();$("#stats").textContent=shown.length+" exibidos de "+items.length+" itens";$("#list").innerHTML=shown.length?shown.map(x=>'<div class="item" data-i="'+x._i+'"><input type="checkbox" '+(x.selected!==false?"checked":"")+'><img src="'+esc(x.logo||"")+'" onerror="this.style.display=\\'none\\'"><div class="name"><b>'+esc(x.name)+'</b><span class="group">'+esc(x.group||"Sem grupo")+" · "+esc(x.server||"Importado")+'</span></div><div class="itemActions"><button class="edit">Editar</button><button class="removeItem">Excluir</button></div></div>').join(""):'<div class="empty">Nenhum item.</div>';
 $$(".item").forEach(row=>{const i=+row.dataset.i;row.querySelector("input").onchange=e=>items[i].selected=e.target.checked;row.querySelector(".removeItem").onclick=()=>{items.splice(i,1);render()};row.querySelector(".edit").onclick=()=>editRow(row,i)})}
function editRow(row,i){const x=items[i];const e=document.createElement("div");e.className="editor";e.innerHTML='<input class="en" value="'+attr(x.name)+'"><input class="eg" value="'+attr(x.group||"")+'"><input class="el" value="'+attr(x.logo||"")+'"><button class="save">Salvar</button>';row.appendChild(e);row.querySelector(".edit").disabled=true;e.querySelector(".save").onclick=()=>{x.name=e.querySelector(".en").value.trim()||"Sem nome";x.group=e.querySelector(".eg").value.trim()||"Sem grupo";x.logo=e.querySelector(".el").value.trim();render()}}
function dedupe(){const seen=new Set(),out=[];for(const x of items){const key=(x.url||"").trim().toLowerCase()||((x.name||"").trim().toLowerCase()+"|"+(x.group||"").trim().toLowerCase());if(seen.has(key))continue;seen.add(key);out.push(x)}const n=items.length-out.length;items=out;render();alert(n?"Removidos "+n+" duplicados.":"Nenhum duplicado encontrado.")}
function selected(){return items.filter(x=>x.selected!==false)}
function m3u(list){const lines=["#EXTM3U"];for(const x of list){let a='tvg-name="'+attr(x.name)+'"';if(x.logo)a+=' tvg-logo="'+attr(x.logo)+'"';if(x.group)a+=' group-title="'+attr(x.group)+'"';lines.push("#EXTINF:-1 "+a+","+x.name,x.url)}return lines.join("\\n")+"\\n"}
function download(text,name){const blob=new Blob([text],{type:"audio/x-mpegurl"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function exportGrouped(list,key,label){const groups={};list.forEach(x=>(groups[x[key]||"Sem "+label]??=[]).push(x));Object.entries(groups).forEach(([name,arr])=>download(m3u(arr),"M3U-"+name.replace(/[^a-z0-9_-]+/gi,"_")+".m3u"))}
$("#addServer").onclick=()=>{if($$(".server").length<5)addServer();else alert("Limite de 5 servidores.")};
$("#test").onclick=async()=>{try{status("Testando...");await post("/api/test",active());status("Conectado ✓")}catch(e){status("Erro");alert(e.message)}};
async function collectOne(s){const j=await post("/api/collect",{...s,type:$("#type").value});return (j.items||[]).map(x=>({...x,server:s.server,selected:true}))}
$("#collect").onclick=async()=>{try{status("Coletando...");const s=active();localStorage.setItem("m3uServers",JSON.stringify(servers()));items.push(...await collectOne(s));render();status(items.length+" itens")}catch(e){status("Erro");alert(e.message)}};
$("#collectAll").onclick=async()=>{try{const ss=servers();if(!ss.length)throw Error("Informe pelo menos um servidor.");status("Coletando "+ss.length+" servidores...");localStorage.setItem("m3uServers",JSON.stringify(ss));for(const s of ss){try{items.push(...await collectOne(s))}catch(e){console.warn(s.server,e.message)}}render();status(items.length+" itens")}catch(e){status("Erro");alert(e.message)}};
$("#filter").oninput=render;$("#groupFilter").onchange=render;$("#serverFilter").onchange=render;
$("#selectAll").onclick=()=>{items.forEach(x=>x.selected=true);render()};$("#clear").onclick=()=>{items.forEach(x=>x.selected=false);render()};$("#dedupe").onclick=dedupe;
$("#m3uFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;items.push(...parseM3U(await f.text(),f.name));render();status(items.length+" itens")};
$("#importText").onclick=()=>{const text=prompt("Cole aqui o conteúdo M3U:");if(text){items.push(...parseM3U(text));render();status(items.length+" itens")}};
$("#download").onclick=()=>{const s=selected();if(!s.length)return alert("Selecione pelo menos um item.");download(m3u(s),"M3U-Collector.m3u")};
$("#downloadGroups").onclick=()=>{const s=selected();if(!s.length)return alert("Selecione pelo menos um item.");exportGrouped(s,"group","grupo")};
$("#downloadServers").onclick=()=>{const s=selected();if(!s.length)return alert("Selecione pelo menos um item.");exportGrouped(s,"server","servidor")};
