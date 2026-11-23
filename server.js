import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||10000);
const HOSTS=new Set(["startech.com.bd","www.startech.com.bd","shopz.com.bd","www.shopz.com.bd","releva.com.bd","www.releva.com.bd","illin.com.bd","www.illin.com.bd","amazon.com","www.amazon.com"]);
const cache=new Map();
const MIME={".html":"text/html; charset=utf-8",".json":"application/json; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".ico":"image/x-icon"};

function attrs(tag){const out={};for(const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))out[m[1].toLowerCase()]=m[2]??m[3]??m[4]??"";return out}
function extractImage(html,base){
 const candidates=[];
 for(const m of html.matchAll(/<meta\b[^>]*>/gi)){const x=attrs(m[0]),k=(x.property||x.name||"").toLowerCase();if(["og:image","og:image:secure_url","twitter:image","twitter:image:src"].includes(k)&&x.content)candidates.push(x.content)}
 for(const m of html.matchAll(/<img\b[^>]*>/gi)){const x=attrs(m[0]),alt=(x.alt||"").toLowerCase();const src=x["data-src"]||x["data-lazy-src"]||x["data-original"]||x.srcset?.split(",")[0]?.trim().split(/\s+/)[0]||x.src;if(!src||/logo|banner|icon|avatar|payment|placeholder|spinner/i.test(alt+" "+src))continue;candidates.push(src)}
 for(const raw of candidates){try{const u=new URL(raw.replace(/&amp;/g,"&"),base);if(["https:","http:"].includes(u.protocol)&&! /\.(?:svg|gif)(?:[?#]|$)/i.test(u.href))return u.href}catch{}}
 return null;
}
function collectOffers(o,out,depth=0){if(!o||depth>12)return;if(Array.isArray(o)){for(const x of o)collectOffers(x,out,depth+1);return}if(typeof o!=="object")return;const p=o.price??o.lowPrice??o.highPrice,c=o.priceCurrency??o.currency;if(p!==undefined&&c){const amount=String(p).replace(/[^0-9.]/g,"");if(Number(amount)>0)out.push({price:amount,currency:String(c).toUpperCase()})}for(const v of Object.values(o))if(v&&typeof v==="object")collectOffers(v,out,depth+1)}
function extractPrice(html){const found=[];for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{collectOffers(JSON.parse(m[1]),found)}catch{}}for(const m of html.matchAll(/<meta\b[^>]*>/gi)){const a=attrs(m[0]),k=(a.property||a.name||"").toLowerCase();if(["product:price:amount","og:price:amount","price"].includes(k)&&a.content){const currency=(a.currency||a["product:price:currency"]||"BDT").toUpperCase();found.push({price:a.content,currency})}}return found.find(x=>Number.isFinite(Number(x.price))&&Number(x.price)>0&&/^[A-Z]{3}$/.test(x.currency))||null}
async function retailerPage(raw){
 let target;try{target=new URL(raw)}catch{throw new Error("Invalid product URL")}
 if(target.protocol!=="https:"||!HOSTS.has(target.hostname))throw new Error("Retailer host not allowed");
 target.hash="";
 const key=target.href,hit=cache.get(key);if(hit&&hit.expires>Date.now())return hit;
 let current=target;
 for(let n=0;n<6;n++){
  const res=await fetch(current,{headers:{"Accept":"text/html,application/xhtml+xml","User-Agent":"Mozilla/5.0 (compatible; MRSSmartFinds/1.0; +https://mrssmartfinds.wordpress.com/)"},redirect:"manual",signal:AbortSignal.timeout(12000)});
  if([301,302,303,307,308].includes(res.status)){const loc=res.headers.get("location");if(!loc)throw new Error("Retailer redirect missing location");const next=new URL(loc,current);if(next.protocol!=="https:"||!HOSTS.has(next.hostname))throw new Error("Retailer redirected outside allowed hosts");current=next;continue}
  if(!res.ok)throw new Error("Retailer page returned "+res.status);
  const html=await res.text();const value={html,url:current.href,expires:Date.now()+30*60*1000};cache.set(key,value);return value;
 }
 throw new Error("Too many retailer redirects");
}
function send(res,status,body,headers={}){res.writeHead(status,{"Cache-Control":"no-store",...headers});res.end(body)}
async function handleApi(req,res,url){
 const raw=url.searchParams.get("url");if(!raw)return send(res,400,"Missing product URL");
 try{
  const page=await retailerPage(raw);
  if(url.pathname==="/api/product-image"){const image=extractImage(page.html,page.url);if(!image)return send(res,404,"No product image found");return send(res,302,"",{"Location":image,"Cache-Control":"public, max-age=86400"})}
  if(url.pathname==="/api/product-price"){const price=extractPrice(page.html);return send(res,200,JSON.stringify(price||{price:null}),{"Content-Type":"application/json; charset=utf-8","Cache-Control":"public, max-age=1800"})}
  return send(res,404,"Not found");
 }catch(e){if(url.pathname==="/api/product-price")return send(res,200,JSON.stringify({price:null}),{"Content-Type":"application/json; charset=utf-8","Cache-Control":"public, max-age=300"});return send(res,404,e.message)}
}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url||"/","http://localhost");
 if(url.pathname==="/health")return send(res,200,"ok",{"Content-Type":"text/plain; charset=utf-8"});
 if(url.pathname==="/api/product-image"||url.pathname==="/api/product-price")return handleApi(req,res,url);
 let pathname=decodeURIComponent(url.pathname);if(pathname==="/")pathname="/index.html";
 const file=path.resolve(ROOT,"."+pathname);if(!file.startsWith(ROOT+path.sep))return send(res,403,"Forbidden");
 try{const info=await stat(file);if(!info.isFile())return send(res,404,"Not found");const data=await readFile(file);return send(res,200,data,{"Content-Type":MIME[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":path.extname(file)===".html"?"no-cache":"public, max-age=300"})}catch{return send(res,404,"Not found")}
});
server.listen(PORT,"0.0.0.0",()=>console.log("MRS Smart Finds listening on "+PORT));
