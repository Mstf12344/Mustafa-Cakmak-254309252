"use strict";
/* Wikibooks Cookbook'tan ülke mutfaklarına göre tarifleri çeker ve sadeleştirir.
   Lisans: Wikibooks metinleri CC BY-SA 4.0; görsellerin lisansı Wikimedia Commons'tan ayrıca alınır. */
const fs=require("fs"),path=require("path");
const API="https://en.wikibooks.org/w/api.php";
const OUT=path.join(__dirname,"out");fs.mkdirSync(OUT,{recursive:true});
const UA="DunyaMutfagiStudentProject/1.0 (https://github.com/Mstf12344/Mustafa-Cakmak-254309252)";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function q(params){
  const body=new URLSearchParams({format:"json",formatversion:"2",maxlag:"5",...params});
  for(let i=0;i<6;i++){
    try{const r=await fetch(API,{method:"POST",headers:{"User-Agent":UA,"Content-Type":"application/x-www-form-urlencoded"},body});
      if(r.ok){const j=await r.json();if(!j.error)return j;if(j.error.code!=="maxlag")throw new Error(JSON.stringify(j.error))}}catch(e){if(i===5)throw e}
    await sleep(2000*(i+1));
  }
  throw new Error("istek başarısız");
}
async function members(cat,type){let out=[],c;do{const j=await q({action:"query",list:"categorymembers",cmtitle:cat,cmtype:type,cmlimit:"500",...(type==="page"?{cmnamespace:"102"}:{}),...(c?{cmcontinue:c}:{})});out.push(...j.query.categorymembers);c=j.continue&&j.continue.cmcontinue;await sleep(150)}while(c);return out}

/* ---------- vikimetin temizliği ---------- */
function stripTemplates(s){
  // iç içe {{...}} şablonlarını işler; convert şablonunu "1 cup" gibi metne çevirir, diğerlerini siler
  let out="",i=0;
  while(i<s.length){
    if(s.startsWith("{{",i)){
      let d=0,j=i;
      for(;j<s.length;j++){if(s.startsWith("{{",j)){d++;j++}else if(s.startsWith("}}",j)){d--;j++;if(d===0)break}}
      const inner=s.slice(i+2,j-1);const name=inner.split("|")[0].trim().toLowerCase();
      const parts=inner.split("|").map(x=>x.trim());
      if(/^(convert|cvt)$/.test(name)&&parts.length>=3)out+=parts[1]+" "+parts[2];
      else if(/^(frac|fraction)$/.test(name))out+=parts.slice(1).join("/");
      else if(/^(nowrap|nobr|lang)$/.test(name))out+=parts[parts.length-1];
      i=j+1;continue;
    }
    out+=s[i++];
  }
  return out;
}
function clean(s){
  s=String(s||"");
  s=s.replace(/<!--[\s\S]*?-->/g,"").replace(/<ref[^>]*\/>/gi,"").replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi,"");
  s=stripTemplates(s);
  s=s.replace(/\[\[(?:File|Image|Category):[^\[\]]*(?:\[\[[^\]]*\]\][^\[\]]*)*\]\]/gi,"");
  s=s.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g,"$1");
  s=s.replace(/\[https?:\/\/[^\s\]]+\s+([^\]]+)\]/g,"$1").replace(/\[https?:\/\/[^\]]+\]/g,"");
  s=s.replace(/'''?/g,"").replace(/<br\s*\/?>/gi," ").replace(/<[^>]+>/g,"");
  s=s.replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&ndash;/g,"–").replace(/&mdash;/g,"—").replace(/&frac12;/g,"½").replace(/&frac14;/g,"¼").replace(/&frac34;/g,"¾").replace(/&quot;/g,'"').replace(/&#0?39;/g,"'");
  return s.replace(/\s+/g," ").replace(/\s+([,.;:)])/g,"$1").replace(/\(\s+/g,"(").trim();
}
const UNITS=new Set(["cup","tablespoon","teaspoon","gram","kilogram","pound","ounce","milliliter","millilitre","liter","litre","pint","quart","gallon","inch","centimeter","pinch","dash","fluid ounce","mililiter","deciliter","clove","stick","can","slice","bunch","handful","sprig","piece","fahrenheit","celsius","oven","bowl","pan","saucepan","knife","whisk","food processor","blender","wok","skillet","frying pan","dice","chop","mince","slice","julienne","grate","boil","fry","bake","simmer","sauté","saute","roast","grill","steam","whip","mix","beat","fold","knead","marinate","blanch","peel","zest","juice","grater","mortar and pestle","baking sheet","oven"]);
function keysOf(wikiLine){
  // bağlantının hedefi birim/teknik değilse, görünen metni (ör. "rice noodles") malzeme adı olarak al
  const ks=[];const re=/\[\[Cookbook:([^|\]#]+)(?:#[^|\]]*)?(?:\|([^\]]*))?\]\]/g;let m;
  while((m=re.exec(wikiLine))){const k=m[1].trim().toLowerCase().replace(/_/g," ");if(UNITS.has(k)||UNITS.has(k.replace(/s$/,"")))continue;
    const shown=clean(m[2]||"").toLowerCase();ks.push(shown&&shown.length<40?shown:k)}
  return ks;
}
function summary(txt){
  const m=txt.match(/\{\{\s*recipe ?summary/i);if(!m)return {};
  let i=m.index,d=0,j=i;for(;j<txt.length;j++){if(txt.startsWith("{{",j)){d++;j++}else if(txt.startsWith("}}",j)){d--;j++;if(d===0)break}}
  const inner=txt.slice(i+2,j-1);const o={};
  // üst düzey | ayırıcılarına göre böl
  let depth=0,cur="",parts=[];
  for(let k=0;k<inner.length;k++){const c=inner[k],n=inner[k+1];
    if((c==="["&&n==="[")||(c==="{"&&n==="{")){depth++;cur+=c+n;k++;continue}
    if((c==="]"&&n==="]")||(c==="}"&&n==="}")){depth--;cur+=c+n;k++;continue}
    if(c==="|"&&depth===0){parts.push(cur);cur="";continue}cur+=c}
  parts.push(cur);
  parts.slice(1).forEach(p=>{const e=p.indexOf("=");if(e>0)o[p.slice(0,e).trim().toLowerCase()]=p.slice(e+1).trim()});
  return o;
}
function sections(txt){
  const lines=txt.split("\n");const secs=[];let cur={h:"",lvl:0,lines:[]};secs.push(cur);
  for(const L of lines){const m=L.match(/^(={2,6})\s*(.*?)\s*\1\s*$/);
    if(m&&m[1].length===2){cur={h:clean(m[2]),lvl:2,lines:[]};secs.push(cur)}else cur.lines.push(L)}
  return secs;
}
function parse(txt){
  const S=summary(txt),secs=sections(txt);
  const find=re=>secs.filter(s=>re.test(s.h));
  const ingS=find(/ingredient/i),stS=find(/procedure|method|direction|preparation|instruction|steps|cooking|assembly/i),ntS=find(/note|tip|variation|serving|serve/i);
  const ing=[],keys=new Set(),st=[],nt=[];
  ingS.forEach(s=>s.lines.forEach(L=>{
    const h=L.match(/^(={3,6})\s*(.*?)\s*\1\s*$/);if(h){const t=clean(h[2]);if(t)ing.push("§ "+t);return}
    const m=L.match(/^[*#:]+\s*(.*)$/);if(!m)return;const t=clean(m[1]);if(!t)return;ing.push(t);keysOf(m[1]).forEach(k=>keys.add(k))}));
  stS.forEach(s=>{let hasNum=s.lines.some(L=>/^#/.test(L));
    s.lines.forEach(L=>{
      const h=L.match(/^(={3,6})\s*(.*?)\s*\1\s*$/);if(h){const t=clean(h[2]);if(t)st.push("§ "+t);return}
      const m=hasNum?L.match(/^(#+)[*:]?\s*(.*)$/):L.match(/^(\*+)\s*(.*)$/);
      if(m){const t=clean(m[2]);if(!t)return;if(m[1].length>1&&st.length&&!st[st.length-1].startsWith("§ "))st[st.length-1]+=" "+t;else st.push(t);return}
      if(!hasNum){const t=clean(L);if(t&&!/^[|{}!]/.test(L.trim())&&t.length>25)st.push(t)}
    })});
  ntS.forEach(s=>s.lines.forEach(L=>{const m=L.match(/^[*#]+\s*(.*)$/);const t=clean(m?m[1]:L);if(t&&t.length>15&&!/^[|{}]/.test(L.trim()))nt.push(t)}));
  // giriş paragrafı (ilk bölüm, şablonlar dışında)
  const intro=clean(secs[0].lines.filter(L=>!/^\s*[|{}_]/.test(L)&&!/^__/.test(L)).join(" ")).slice(0,600);
  return {S,ing,keys:[...keys],st:st.filter(x=>x!=="§"),nt:nt.slice(0,4),intro};
}

(async()=>{
  // 1) köken kategorilerini gez
  const ROOT="Category:Recipes by origin";const cats=new Map();const queue=[[ROOT,0,[]]];
  while(queue.length){const [c,d,chain]=queue.shift();if(cats.has(c))continue;cats.set(c,{depth:d,chain});
    if(d>=6)continue;const subs=await members(c,"subcat");subs.forEach(s=>queue.push([s.title,d+1,[...chain,c]]))}
  console.log("kategori:",cats.size);
  // 2) her kategorinin tarif sayfaları
  const pages=new Map();
  for(const [c,info] of cats){if(c===ROOT)continue;
    const m=await members(c,"page");
    m.forEach(p=>{if(!pages.has(p.pageid))pages.set(p.pageid,{id:p.pageid,title:p.title,origins:[]});pages.get(p.pageid).origins.push({c:c.replace("Category:",""),d:info.depth})})}
  console.log("sayfa:",pages.size);
  // 3) içerik + kategoriler + sayfa görseli
  const ids=[...pages.keys()];const res=[];const imgFiles=new Set();
  for(let i=0;i<ids.length;i+=50){
    const j=await q({action:"query",pageids:ids.slice(i,i+50).join("|"),prop:"revisions|categories|pageimages",rvprop:"content|timestamp",rvslots:"main",cllimit:"max",clshow:"!hidden",piprop:"name"});
    for(const p of j.query.pages||[]){
      if(!p.revisions)continue;const txt=p.revisions[0].slots.main.content||"";
      if(/^#redirect/i.test(txt))continue;
      const P=parse(txt);const base=pages.get(p.pageid);
      const cs=(p.categories||[]).map(c=>c.title.replace("Category:",""));
      const ingKeys=new Set(P.keys);cs.forEach(c=>{const m=c.match(/^Recipes using (.+)$/i);if(m)ingKeys.add(m[1].toLowerCase())});
      const imgName=p.pageimage||((P.S.image||"").match(/\[\[(?:File|Image):([^|\]]+)/i)||[])[1]||"";
      if(imgName)imgFiles.add(imgName.trim().replace(/ /g,"_"));
      res.push({i:p.pageid,n:p.title.replace(/^Cookbook:/,""),o:base.origins,sc:clean(P.S.category||""),sv:clean(P.S.servings||""),tm:clean(P.S.time||""),df:clean(P.S.difficulty||""),
        ing:P.ing,k:[...ingKeys],st:P.st,nt:P.nt,in:P.intro,cs:cs.filter(c=>!/^Recipes using /i.test(c)),im:imgName.trim().replace(/ /g,"_"),rv:p.revisions[0].timestamp});
    }
    await sleep(300);
  }
  // 4) görsellerin küçük boy adresi ve lisansı (Wikimedia Commons)
  const files=[...imgFiles];const IM={};
  for(let i=0;i<files.length;i+=40){
    const j=await q({action:"query",titles:files.slice(i,i+40).map(f=>"File:"+f).join("|"),prop:"imageinfo",iiprop:"url|extmetadata",iiurlwidth:"640",iiextmetadatafilter:"Artist|LicenseShortName|LicenseUrl|UsageTerms"});
    const norm={};(j.query.normalized||[]).forEach(n=>norm[n.to]=n.from);
    for(const p of j.query.pages||[]){const ii=p.imageinfo&&p.imageinfo[0];if(!ii)continue;const em=ii.extmetadata||{};
      const key=(norm[p.title]||p.title).replace(/^File:/,"").replace(/ /g,"_");
      IM[key]={u:ii.thumburl||ii.url,p:ii.descriptionurl,a:clean((em.Artist||{}).value||"").slice(0,120),l:clean((em.LicenseShortName||{}).value||""),lu:(em.LicenseUrl||{}).value||""}}
    await sleep(300);
  }
  res.forEach(r=>{const im=IM[r.im];if(im){r.img=im}delete r.im});
  res.sort((a,b)=>a.n.localeCompare(b.n));
  fs.writeFileSync(path.join(OUT,"wikibooks_ham.json"),JSON.stringify(res));
  const stat={};res.forEach(r=>r.o.forEach(x=>stat[x.c]=(stat[x.c]||0)+1));
  fs.writeFileSync(path.join(OUT,"istatistik.json"),JSON.stringify({kategori:[...cats.entries()].map(([c,v])=>[c,v.depth,v.chain.slice(-1)[0]||""]),tarif:res.length,gorselli:res.filter(r=>r.img).length,
    malzemeli:res.filter(r=>r.ing.length>=2&&r.st.length>=2).length,koken:stat},null,1));
  console.log("tarif:",res.length,"görsel:",Object.keys(IM).length);
})().catch(e=>{console.error(e);process.exit(1)});
