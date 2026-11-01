"use strict";
/* Fotoğrafı olmayan Wikibooks tarifleri için Wikimedia Commons'tan özgür lisanslı fotoğraf bulur.
   1) Aynı adlı İngilizce Wikipedia yemek sayfasının ana görseli (görsel Commons'ta olmalı)
   2) Bulunamazsa Commons'ta dosya araması (dosya adı tarif adını içermeli ve yemek kategorisinde olmalı)
   Sonuç: tools/wikibooks/fotolar.json  { "<pageid>": {u,a,l,lu,p,k} }  — donustur.js bunu WB_DATA'ya ekler. */
const fs=require("fs"),path=require("path");
const ROOT=path.join(__dirname,"..","..");
const OUT=path.join(__dirname,"fotolar.json");
const UA="DunyaMutfagiStudentProject/1.0 (https://github.com/Mstf12344/Mustafa-Cakmak-254309252)";
const WP="https://en.wikipedia.org/w/api.php",CM="https://commons.wikimedia.org/w/api.php";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function q(api,params){
  const body=new URLSearchParams({format:"json",formatversion:"2",maxlag:"5",...params});
  for(let i=0;i<6;i++){
    try{const r=await fetch(api,{method:"POST",headers:{"User-Agent":UA,"Content-Type":"application/x-www-form-urlencoded"},body});
      if(r.ok){const j=await r.json();if(!j.error)return j;if(j.error.code!=="maxlag")return {}}}catch(e){}
    await sleep(1500*(i+1));
  }
  return {};
}
const clean=s=>String(s||"").replace(/<[^>]+>/g," ").replace(/&[a-z#0-9]+;/gi," ").replace(/\s+/g," ").trim();
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\(.*?\)/g," ").replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();
const STOP=new Set(["a","an","the","and","with","of","in","on","style","recipe","i","ii","iii","iv","v","vi","basic","simple","easy","quick","homemade","traditional","classic","my","mom","s","grandma","vegan","vegetarian","version","de","la","le","el","al","con","con","y","au","aux","di","da","e"]);
const words=s=>norm(s).split(" ").filter(w=>w&&!STOP.has(w));
const FOOD=/dish|cuisine|food|soup|stew|bread|dessert|cake|cookie|biscuit|pastr|sauce|condiment|salad|beverage|drink|snack|curr(y|ies)|rice|noodle|pasta|meat|fish|seafood|vegetable|confection|pudding|pie|sandwich|porridge|dumpling|breakfast|appetizer|cheese|egg|cocktail|tea|coffee|liqueur|candy|candies|sweets|fried|baked|grilled|roast|stuffed|kebab|sausage|chutney|pickle|jam|beans|legume|lentil|chicken|beef|pork|lamb|tortilla|flatbread|pancake|doughnut|fritter|spice|seasoning|dip|spread|stew|casserole|cuisine of/i;
const BAD=/flag|map|logo|icon|coat of arms|locator|seal|emblem|diagram|chart|portrait|signature|\.svg$|\.gif$|\.tif/i;

function baseNames(t){
  const out=new Set();
  const noPar=t.replace(/\(.*?\)/g," ").replace(/\b(I|II|III|IV|V|VI)\b\s*$/,"").replace(/\s+/g," ").trim();
  if(noPar)out.add(noPar);
  const par=(t.match(/\(([^)]+)\)/)||[])[1];
  if(par&&!/vegan|vegetarian|version|recipe|style|variation|quick|easy/i.test(par))out.add(par.trim());
  return [...out];
}
// sayfa/dosya adı tarif adıyla örtüşüyor mu?
function nameMatch(base,cand){
  const b=words(base),c=new Set(words(cand));
  if(!b.length)return false;
  const hit=b.filter(w=>c.has(w)||c.has(w.replace(/s$/,""))||c.has(w+"s")).length;
  if(b.length===1)return hit===1&&b[0].length>=4;
  return hit/b.length>=0.75;
}
async function wikipediaPhoto(base){
  const j=await q(WP,{action:"query",generator:"search",gsrsearch:base,gsrlimit:"4",gsrnamespace:"0",prop:"pageimages|categories|pageprops",piprop:"name",cllimit:"max",clshow:"!hidden",ppprop:"disambiguation",redirects:"1"});
  const pages=(j.query&&j.query.pages||[]).sort((a,b)=>(a.index||0)-(b.index||0));
  for(const p of pages){
    if(!p.pageimage||(p.pageprops&&"disambiguation" in p.pageprops))continue;
    if(!nameMatch(base,p.title))continue;
    const cats=(p.categories||[]).map(c=>c.title).join(" | ");
    if(!FOOD.test(cats)&&!FOOD.test(p.title))continue;
    if(BAD.test(p.pageimage))continue;
    return {file:p.pageimage,k:"wp:"+p.title};
  }
  return null;
}
async function commonsSearch(base){
  const j=await q(CM,{action:"query",generator:"search",gsrsearch:base+" filetype:bitmap",gsrlimit:"6",gsrnamespace:"6",prop:"categories",cllimit:"max",clshow:"!hidden"});
  const pages=(j.query&&j.query.pages||[]).sort((a,b)=>(a.index||0)-(b.index||0));
  for(const p of pages){
    const name=p.title.replace(/^File:/,"");
    if(BAD.test(name)||!/\.(jpe?g|png|webp)$/i.test(name))continue;
    if(!nameMatch(base,name.replace(/\.[a-z]+$/i,"").replace(/[_-]/g," ")))continue;
    const cats=(p.categories||[]).map(c=>c.title).join(" | ");
    if(!FOOD.test(cats))continue;
    return {file:name,k:"c:"+name};
  }
  return null;
}
async function imageInfo(files){
  const res={};
  for(let i=0;i<files.length;i+=40){
    const chunk=files.slice(i,i+40);
    const j=await q(CM,{action:"query",titles:chunk.map(f=>"File:"+f).join("|"),prop:"imageinfo",iiprop:"url|extmetadata|size",iiurlwidth:"640",iiextmetadatafilter:"Artist|LicenseShortName|LicenseUrl"});
    const norm2={};((j.query&&j.query.normalized)||[]).forEach(n=>norm2[n.to]=n.from);
    for(const p of (j.query&&j.query.pages)||[]){
      const ii=p.imageinfo&&p.imageinfo[0];if(!ii||p.missing)continue;
      const em=ii.extmetadata||{},lic=clean((em.LicenseShortName||{}).value||"");
      if(!lic||/fair use|non-free|copyrighted/i.test(lic))continue;
      if((ii.width||0)<300||(ii.height||0)<200)continue;
      const key=(norm2[p.title]||p.title).replace(/^File:/,"");
      res[key]={u:ii.thumburl||ii.url,a:clean((em.Artist||{}).value||"").slice(0,120),l:lic,lu:(em.LicenseUrl||{}).value||"",p:ii.descriptionurl};
    }
    await sleep(300);
  }
  return res;
}
/* ---- son eleme: ad tam tutmalı; menü, tabela, dükkân gibi fotoğraflar elenir ---- */
const norm2=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\(.*?\)/g," ").replace(/\.[a-z]{3,4}$/i,"").replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();
const STOP2=new Set(["a","an","the","and","with","of","in","on","style","recipe","i","ii","iii","iv","v","vi","basic","simple","easy","quick","homemade","traditional","classic","my","mom","s","grandma","vegan","vegetarian","version","de","la","le","el","al","con","y","au","aux","di","da","e","at","from","for","jpg","jpeg","png"]);
const W2=s=>norm2(s).split(" ").filter(w=>w&&!STOP2.has(w)&&!/^\d+$/.test(w));
const sing=w=>w;const eq=(a,b)=>a===b||a+"s"===b||b+"s"===a||a+"es"===b||b+"es"===a;const has=(arr,w)=>arr.some(x=>eq(x,w));
const BADC=/menu|sign|poster|advert|logo|packag|label|book|cover|truck|storefront|store|shop|bottle|restaurant|street|market|stall|festival|sale|price|box|tin|can of|museum|statue|plate set|wiki ?cinema/i;
function bases(t){const o=[];const np=t.replace(/\(.*?\)/g," ").replace(/\b(I|II|III|IV|V|VI)\b\s*$/,"").trim();if(np)o.push(np);const p=(t.match(/\(([^)]+)\)/)||[])[1];if(p)o.push(p);return o}
function okWp(t,page){
  for(const b of bases(t)){const bw=W2(b).map(sing),pw=W2(page).map(sing);if(!bw.length||!pw.length)continue;
    const hit=bw.filter(w=>has(pw,w)).length,extra=pw.filter(w=>!has(bw,w)).length;
    if(bw.length===1){if(pw.length===1&&hit===1)return true;continue}
    if(hit/bw.length>=0.75&&extra<=1)return true}
  return false}
function okC(t,file){
  if(BADC.test(file))return false;
  for(const b of bases(t)){const bw=W2(b).map(sing),fw=W2(file).map(sing);if(!bw.length)continue;
    const hit=bw.filter(w=>has(fw,w)).length,extra=fw.filter(w=>!has(bw,w)).length;
    if(bw.length===1){if(hit===1&&extra<=2&&bw[0].length>=4)return true;continue}
    if(hit/bw.length>=0.75&&extra<=3)return true}
  return false}

(async()=>{
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  const data=JSON.parse(html.match(/const WB_DATA=(\[.*?\]);\/\*WB_DATA\*\//s)[1]);
  const prev=fs.existsSync(OUT)?JSON.parse(fs.readFileSync(OUT,"utf8")):{};
  const todo=data.filter(o=>!o.p&&!prev[o.i]);
  console.log("fotoğrafsız tarif:",data.filter(o=>!o.p).length,"aranacak:",todo.length);
  const found={};let n=0;
  const queue=todo.slice();
  async function worker(){
    while(queue.length){const o=queue.shift();n++;
      let hit=null;
      for(const b of baseNames(o.n)){hit=await wikipediaPhoto(b);if(hit)break}
      if(!hit)for(const b of baseNames(o.n)){hit=await commonsSearch(b);if(hit)break}
      if(hit)found[o.i]={...hit,t:o.n};
      if(n%100===0)console.log(n,"/",todo.length,"bulunan:",Object.keys(found).length);
      await sleep(120);
    }
  }
  await Promise.all([worker(),worker(),worker()]);
  const files=[...new Set(Object.values(found).map(f=>f.file.replace(/ /g,"_")))];
  const info=await imageInfo(files.map(f=>f.replace(/_/g," ")));
  const infoN={};Object.entries(info).forEach(([k,v])=>infoN[k.replace(/ /g,"_")]=v);
  const out={...prev};let ok=0;
  for(const [id,f] of Object.entries(found)){const im=infoN[f.file.replace(/ /g,"_")];if(!im)continue;
    if(!(f.k.startsWith("wp:")?okWp(f.t,f.k.slice(3)):okC(f.t,f.k.slice(2))))continue;out[id]={...im,k:f.k,t:f.t};ok++}
  fs.writeFileSync(OUT,JSON.stringify(out,null,0));
  console.log(`Wikimedia: ${ok} tarife fotoğraf bulundu (toplam kayıt ${Object.keys(out).length}).`);
})().catch(e=>{console.error(e);process.exit(1)});
