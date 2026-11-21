const ALLOWED_HOSTS = new Set(["startech.com.bd","www.startech.com.bd","shopz.com.bd","www.shopz.com.bd","releva.com.bd","www.releva.com.bd","illin.com.bd","www.illin.com.bd"]);
function attrs(tag){const out={};for(const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))out[m[1].toLowerCase()]=m[2]??m[3]??m[4]??"";return out}
function getImage(html,base){for(const m of html.matchAll(/<meta\b[^>]*>/gi)){const a=attrs(m[0]);const key=(a.property||a.name||"").toLowerCase();if(["og:image","og:image:secure_url","twitter:image","twitter:image:src"].includes(key)&&a.content){try{const u=new URL(a.content.replace(/&amp;/g,"&"),base);if(["https:","http:"].includes(u.protocol))return u.href}catch{}}}return null}
export async function onRequestGet({request}) {
  const incoming=new URL(request.url), raw=incoming.searchParams.get("url");
  if(!raw)return new Response("Missing product URL",{status:400});
  let target;try{target=new URL(raw)}catch{return new Response("Invalid product URL",{status:400})}
  if(target.protocol!=="https:"||!ALLOWED_HOSTS.has(target.hostname))return new Response("Retailer not allowed",{status:403});
  target.hash="";
  const cacheKey=new Request(new URL("/__product-image-cache/"+encodeURIComponent(target.href),incoming.origin));
  const cache=caches.default;const cached=await cache.match(cacheKey);if(cached)return cached;
  try{
    const upstream=await fetch(target.href,{headers:{"Accept":"text/html,application/xhtml+xml","User-Agent":"Mozilla/5.0 (compatible; MRSSmartFinds/1.0; +https://mrssmartfinds.wordpress.com/)"} ,redirect:"follow"});
    if(!upstream.ok) return new Response("Retailer page unavailable",{status:404,headers:{"Cache-Control":"public, max-age=300"}});
    const html=await upstream.text();const image=getImage(html,upstream.url||target.href);
    if(!image)return new Response("No product image metadata found",{status:404,headers:{"Cache-Control":"public, max-age=900"}});
    const response=new Response(null,{status:302,headers:{"Location":image,"Cache-Control":"public, max-age=86400","Access-Control-Allow-Origin":"*"}});
    await cache.put(cacheKey,response.clone());return response;
  }catch{return new Response("Image lookup failed",{status:502,headers:{"Cache-Control":"public, max-age=300"}})}
}