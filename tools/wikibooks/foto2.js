"use strict";
/* foto.js'in bulamadığı tarifler için ikinci tur:
   1) Wikidata: yemeğin kendisi (etiket/diğer adı tarif adıyla örtüşen, açıklaması yemek olan ve görseli P18 bulunan öğe) → birebir fotoğraf
   2) Temsilî: tarif adının sonundaki yemek türü ("Barbecue Meatloaf" → "Meatloaf", "Abak Atama Soup" → "Soup")
      için Wikipedia sayfa görseli ya da Commons'ta yemek kategorisindeki bir fotoğraf → "r":1 (temsilî) işaretlenir
   Sonuçlar tools/wikibooks/fotolar.json'a eklenir. */
const fs=require("fs"),path=require("path");
const ROOT=path.join(__dirname,"..","..");
const OUT=path.join(__dirname,"fotolar.json");
const UA="DunyaMutfagiStudentProject/1.0 (https://github.com/Mstf12344/Mustafa-Cakmak-254309252)";
const WP="https://en.wikipedia.org/w/api.php",CM="https://commons.wikimedia.org/w/api.php",WD="https://www.wikidata.org/w/api.php";
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
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\(.*?\)/g," ").replace(/\.(jpe?g|png|webp)$/i,"").replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();
const STOP=new Set(["a","an","the","and","with","of","in","on","style","recipe","i","ii","iii","iv","v","vi","basic","simple","easy","quick","homemade","traditional","classic","my","mom","s","grandma","vegan","vegetarian","version","de","la","le","el","al","con","y","au","aux","di","da","e","at","from","for","jpg","jpeg","png","modern","old","fashioned","best","favorite","special","authentic","healthy","low","fat","no","bake","fast"]);
const W=s=>norm(s).split(" ").filter(w=>w&&!STOP.has(w)&&!/^\d+$/.test(w));
const eq=(a,b)=>a===b||a+"s"===b||b+"s"===a||a+"es"===b||b+"es"===a;
const has=(arr,w)=>arr.some(x=>eq(x,w));
const FOOD=/dish|cuisine|food|soup|stew|bread|dessert|cake|cookie|biscuit|pastr|sauce|condiment|salad|beverage|drink|snack|curr(y|ies)|rice|noodle|pasta|meat|fish|seafood|vegetable|confection|pudding|pie|sandwich|porridge|dumpling|breakfast|appetizer|cheese|egg|cocktail|tea|coffee|liqueur|candy|candies|sweets|fried|baked|grilled|roast|stuffed|kebab|sausage|chutney|pickle|jam|beans|legume|lentil|chicken|beef|pork|lamb|tortilla|flatbread|pancake|doughnut|fritter|spice|seasoning|dip|spread|casserole|recipe|cooking|preparation|delicacy|staple|swallow|fufu|beverage|juice|punch/i;
const BAD=/flag|map|logo|icon|coat of arms|locator|seal|emblem|diagram|chart|portrait|signature|menu|sign|poster|advert|packag|label|book|cover|truck|storefront|store|shop|bottle|restaurant|street|market|stall|festival|sale|price|museum|statue|wiki ?cinema|\.svg$|\.gif$|\.tif/i;

function bases(t){
  const o=[];const np=t.replace(/\(.*?\)/g," ").replace(/\b(I|II|III|IV|V|VI)\b\s*$/,"").replace(/\s+/g," ").trim();if(np)o.push(np);
  const p=(t.match(/\(([^)]+)\)/)||[])[1];if(p&&!/^(vegan|vegetarian|version|modern|quick|easy|meatless|traditional)/i.test(p.trim()))o.push(p.trim());
  return o;
}
function exactish(base,cand){const bw=W(base),cw=W(cand);if(!bw.length||!cw.length)return false;
  const hit=bw.filter(w=>has(cw,w)).length,extra=cw.filter(w=>!has(bw,w)).length;
  if(bw.length===1)return cw.length===1&&hit===1;
  return hit/bw.length>=0.75&&extra<=1;}
/* yemek türü ifadeleri: "Bean and Green Chili Soup" → ["Green Chili Soup","Chili Soup","Soup"] */
function heads(t){
  const out=[];
  for(const b of bases(t)){
    const first=b.split(/\s+(?:with|in|on|over|served|topped|and|&)\s+/i)[0];
    for(const part of [b,first]){
      const ws=norm(part).split(" ").filter(w=>w&&!/^\d+$/.test(w)&&!["i","ii","iii","iv","v","vi"].includes(w));
      for(let k=1;k<ws.length;k++){const s=ws.slice(k).join(" ");if(W(s).length)out.push(s)}
      if(ws.length===1)out.push(ws[0]);
    }
  }
  const NOHEAD=new Set(["oil","flour","salt","sugar","water","butter","milk","cream","spice","spices","powder","paste","leaves","leaf","seeds","seed","palm","starch","yeast","vinegar","stock","broth","mix"]);
  return [...new Set(out)].filter(h=>W(h).length&&!/^(and|with|in|on|of|or|over|served|topped|&) /.test(h)&&!(W(h).length===1&&NOHEAD.has(W(h)[0])));
}
async function wikidataExact(base){
  const s=await q(WD,{action:"wbsearchentities",search:base,language:"en",uselang:"en",limit:"7",type:"item"});
  const ids=(s.search||[]).map(x=>x.id);if(!ids.length)return null;
  const e=await q(WD,{action:"wbgetentities",ids:ids.join("|"),props:"labels|aliases|descriptions|claims",languages:"en"});
  for(const id of ids){
    const it=e.entities&&e.entities[id];if(!it)continue;
    const p18=it.claims&&it.claims.P18&&it.claims.P18[0]&&it.claims.P18[0].mainsnak&&it.claims.P18[0].mainsnak.datavalue;
    if(!p18)continue;
    const desc=(it.descriptions&&it.descriptions.en&&it.descriptions.en.value)||"";
    if(!FOOD.test(desc))continue;
    const names=[(it.labels&&it.labels.en&&it.labels.en.value)||"",...(((it.aliases||{}).en)||[]).map(a=>a.value)].filter(Boolean);
    if(!names.some(n=>exactish(base,n)))continue;
    const file=p18.value;if(BAD.test(file))continue;
    return {file,k:"wd:"+id+" "+names[0]};
  }
  return null;
}
async function wikipediaPage(title){
  const j=await q(WP,{action:"query",titles:title,redirects:"1",prop:"pageimages|categories|pageprops",piprop:"name",cllimit:"max",clshow:"!hidden",ppprop:"disambiguation"});
  const p=(j.query&&j.query.pages||[])[0];
  if(!p||p.missing||!p.pageimage||(p.pageprops&&"disambiguation" in p.pageprops))return null;
  const cats=(p.categories||[]).map(c=>c.title).join(" | ");
  if(!FOOD.test(cats))return null;
  if(BAD.test(p.pageimage))return null;
  return {file:p.pageimage,k:"wp:"+p.title};
}
async function commonsVariety(head,seed){
  const j=await q(CM,{action:"query",generator:"search",gsrsearch:head+" food filetype:bitmap",gsrlimit:"15",gsrnamespace:"6",prop:"categories",cllimit:"max",clshow:"!hidden"});
  const hw=W(head);
  const ok=(j.query&&j.query.pages||[]).sort((a,b)=>(a.index||0)-(b.index||0)).filter(p=>{
    const name=p.title.replace(/^File:/,"");
    if(BAD.test(name)||!/\.(jpe?g|png|webp)$/i.test(name))return false;
    const fw=W(name);if(!hw.every(w=>has(fw,w)))return false;
    if(fw.filter(w=>!has(hw,w)).length>4)return false;
    return FOOD.test((p.categories||[]).map(c=>c.title).join(" | "));
  });
  if(!ok.length)return null;
  const p=ok[seed%Math.min(ok.length,6)];
  return {file:p.title.replace(/^File:/,""),k:"c:"+p.title.replace(/^File:/,"")};
}
async function imageInfo(files){
  const res={};
  for(let i=0;i<files.length;i+=40){
    const chunk=files.slice(i,i+40);
    const j=await q(CM,{action:"query",titles:chunk.map(f=>"File:"+f).join("|"),prop:"imageinfo",iiprop:"url|extmetadata|size",iiurlwidth:"640",iiextmetadatafilter:"Artist|LicenseShortName|LicenseUrl"});
    const nm={};((j.query&&j.query.normalized)||[]).forEach(n=>nm[n.to]=n.from);
    for(const p of (j.query&&j.query.pages)||[]){
      const ii=p.imageinfo&&p.imageinfo[0];if(!ii||p.missing)continue;
      const em=ii.extmetadata||{},lic=clean((em.LicenseShortName||{}).value||"");
      if(!lic||/fair use|non-free|copyrighted/i.test(lic))continue;
      if((ii.width||0)<300||(ii.height||0)<200)continue;
      const key=(nm[p.title]||p.title).replace(/^File:/,"").replace(/ /g,"_");
      res[key]={u:ii.thumburl||ii.url,a:clean((em.Artist||{}).value||"").slice(0,120),l:lic,lu:(em.LicenseUrl||{}).value||"",p:ii.descriptionurl};
    }
    await sleep(300);
  }
  return res;
}
/* temsilî fotoğraf son eleme: ad yemek türüyle bitmeli; tapınak, tabela, satıcı, bitki gibi görseller elenir */
const DISH=new Set("soup soups stew stews salad salads sauce sauces pudding puddings casserole chili curry curries rice pilaf bread breads cake cakes cookie cookies pie pies tart tarts dumpling dumplings fritter fritters pancake pancakes omelet omelette sandwich sandwiches burger burgers meatballs meatloaf dip dressing stuffing drink beverage lassi smoothie tea juice punch porridge fufu swallow nachos quesadilla quesadillas cornbread biscuit biscuits muffin muffins cream jam chutney pickles noodles pasta pizza tacos taco kebab kebabs chicken salmon tenderloin wings ribs steak roast pork beef lamb fish shrimp prawns beans lentils dal dhal gumbo chowder bisque goulash minestrone hummus salsa guacamole flatbread tortillas tortilla scones scone doughnuts donuts brownies fudge custard mousse sorbet trifle crumble cobbler strudel dough buns bun rolls roll gravy relish marinade vinaigrette mayonnaise patties patty skewers satay sushi risotto paella couscous polenta grits quiche frittata crepes waffles toast tamales enchiladas burritos fajitas wraps empanadas samosas pakora pakoras bhaji chapati roti naan paratha idli dosa upma halwa kheer barfi ladoo laddu tea coffee milkshake lemonade cocktail syrup".split(" "));
const BAD2=/fryer|cannery|vendor|ingredients|tradition|fishing|temple|wat phan|fontaine|fountain|krathong|seller|vendor|pedagang|nahsik|dan-o|church|nuts \(|\btrees?\b|\bplants?\b|\bfields?\b|\bharvest|\bfarms?\b|\bgardens?\b|\bbush\b|leaves on/i;
function okRep(x){
    const hw=String(x.h||"").toLowerCase().split(" ").filter(Boolean);const last=hw[hw.length-1]||"";
    const proteinOnly=["chicken","salmon","pork","beef","lamb","fish","shrimp","prawns","steak","roast","beans","lentils","cream","dough","tea","coffee","rice","juice"].includes(last)&&hw.length<2;
    const nm=String(x.k).replace(/^(wp|c):/,"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    const multi=hw.length>=2&&!/^(de|con|au|in|of|la|el|le|di|da|du|a|alla|al|for|stuffed|with)$/.test(hw[0]);
    const own=hw.length===1&&nm.startsWith(hw[0]);
    if(!(DISH.has(last)||multi||own)||proteinOnly||BAD2.test(x.k)||/^wp:List of/.test(x.k)||/^(a|alla|al|stuffed|with)$/.test(hw[0]))return false;
    return true;
}
(async()=>{
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  const data=JSON.parse(html.match(/const WB_DATA=(\[.*?\]);\/\*WB_DATA\*\//s)[1]);
  const prev=fs.existsSync(OUT)?JSON.parse(fs.readFileSync(OUT,"utf8")):{};
  const todo=data.filter(o=>!o.p&&!prev[o.i]);
  console.log("aranacak:",todo.length);
  const found={};let n=0,ex=0,rep=0;const queue=todo.slice();
  async function worker(){
    while(queue.length){const o=queue.shift();n++;let hit=null;
      for(const b of bases(o.n)){hit=await wikidataExact(b);if(hit)break}
      if(hit)ex++;
      if(!hit){
        let seed=0;for(const ch of o.n)seed=(seed*31+ch.charCodeAt(0))>>>0;
        for(const h of heads(o.n)){
          hit=W(h).length>=2?await wikipediaPage(h):null;
          if(!hit)hit=await commonsVariety(h,seed);
          if(!hit&&W(h).length===1)hit=await wikipediaPage(h);
          if(hit){hit.r=1;hit.h=h;break}
        }
        if(hit)rep++;
      }
      if(hit)found[o.i]={...hit,t:o.n};
      if(n%100===0)console.log(n,"/",todo.length,"birebir:",ex,"temsilî:",rep);
      await sleep(100);
    }
  }
  await Promise.all([worker(),worker(),worker()]);
  const files=[...new Set(Object.values(found).map(f=>f.file.replace(/ /g,"_")))];
  const info=await imageInfo(files.map(f=>f.replace(/_/g," ")));
  const out={...prev};let ok=0,okr=0;
  for(const [id,f] of Object.entries(found)){const im=info[f.file.replace(/ /g,"_")];if(!im)continue;
    const rec={...im,k:f.k,t:f.t,...(f.r?{r:1,h:f.h}:{})};if(rec.r&&!okRep(rec))continue;
    out[id]=rec;ok++;if(f.r)okr++}
  fs.writeFileSync(OUT,JSON.stringify(out));
  console.log(`İkinci tur: ${ok} tarife fotoğraf (${ok-okr} birebir, ${okr} temsilî). Toplam kayıt ${Object.keys(out).length}.`);
})().catch(e=>{console.error(e);process.exit(1)});
