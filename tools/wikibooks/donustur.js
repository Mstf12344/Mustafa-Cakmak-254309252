"use strict";
/* Wikibooks ham verisini (out/wikibooks_ham.json) sitenin kullandığı sade biçime çevirir
   ve index.html içindeki WB_DATA alanına gömer.  Kullanım: node tools/wikibooks/donustur.js */
const fs=require("fs"),path=require("path");
const ROOT=path.join(__dirname,"..","..");
const HTML=path.join(ROOT,"index.html");
const raw=JSON.parse(fs.readFileSync(path.join(__dirname,"out","wikibooks_ham.json"),"utf8"));
let html=fs.readFileSync(HTML,"utf8");
const AREA=JSON.parse(html.match(/const MDB_AREA_TR=(\{.*?\});/s)[1]);

/* Wikibooks kategorisi → sitedeki ülke anahtarı (MDB_AREA_TR'deki İngilizce sıfat) */
const ALIAS={
  "United States":"American","Southern U.S.":"American","Southwestern":"American","Tex-Mex":"American","Texas":"American","Californian":"American",
  "Louisiana":"American","Midwestern U.S.":"American","Native American":"American","Hawaiian":"American","Italian-American":"American",
  "National Nigerian":"Nigerian","Hausa":"Nigerian","Yoruba":"Nigerian","Igbo":"Nigerian","Tiv":"Nigerian","Efik":"Nigerian",
  "English":"British","Scottish":"British","Welsh":"British","Cornish":"British","Northern Irish":"British","Manx":"British",
  "Sindhi":"Pakistani","Pashtun":"Pakistani","Punjabi":"Indian","South Indian":"Indian","Bengali":"Indian","Sylheti":"Bangladeshi",
  "Alsatian":"French","Sundanese":"Indonesian","Tibetan":"Chinese","Ghanian":"Ghanaian","Trinidadian and Tobagonian":"Trinidadian",
  "Surinamese":"Surinamer","Gibraltarian":"Gibraltar","Icelandic":"Icelander","Slovenian":"Slovene","New Zealand":"New Zealander","Nepali":"Nepalese",
  "Jewish Yemenite":"Jewish","Sabbath":"Jewish","Recipes for kugel":"Jewish"
};
/* ülke dışı bölgeler (bayraksız) */
const REGION={African:"Afrika",Asian:"Asya",European:"Avrupa","Middle Eastern":"Orta Doğu",Mediterranean:"Akdeniz","South Asian":"Güney Asya",
  "Southeast Asian":"Güneydoğu Asya","East Asian":"Doğu Asya",Caribbean:"Karayipler","North African":"Kuzey Afrika","South American":"Güney Amerika",
  "Central American":"Orta Amerika","North American":"Kuzey Amerika","West Asian":"Batı Asya",Pacific:"Pasifik",Jewish:"Yahudi mutfağı"};
const COURSE=[["Main course","Main course"],["Dessert","Dessert"],["Cake","Dessert"],["Cookie","Dessert"],["Pie","Dessert"],["Candy","Dessert"],["Soup","Soup"],["Stew","Soup"],
  ["Salad","Salad"],["Side dish","Side dish"],["Appetizer","Appetizer"],["Snack","Snack"],["Bread","Bread"],["Breakfast","Breakfast"],["Beverage","Beverage"],["Drink","Beverage"],
  ["Sauce","Sauce"],["Condiment","Sauce"],["Spice mix","Sauce"]];

function pickArea(origins){
  let best=null;
  for(const o of origins){
    let d=o.c.replace(/ recipes$/,"");d=ALIAS[d]||d;
    const national=!!(AREA[d]&&AREA[d][1]),region=!national&&(REGION[d]||AREA[d]);
    if(!national&&!region)continue;
    const score=(national?100:0)+o.d;
    if(!best||score>best.s)best={k:d,s:score};
  }
  return best?best.k:"Unknown";
}
const out=[];const stat={};const unknown={};
for(const r of raw){
  const ing=r.ing.filter(x=>x&&x!=="§"),st=r.st.filter(x=>x&&!/^§\s*$/.test(x));
  if(ing.filter(x=>!x.startsWith("§ ")).length<2||st.filter(x=>!x.startsWith("§ ")).length<2)continue;
  const a=pickArea(r.o);if(a==="Unknown")r.o.forEach(o=>unknown[o.c]=(unknown[o.c]||0)+1);
  const cs=r.cs||[];
  const c=(COURSE.find(([k])=>cs.some(x=>x.toLowerCase().startsWith(k.toLowerCase()+" recipes")))||[])[1]||"";
  const v=cs.includes("Vegan recipes")?2:cs.includes("Vegetarian recipes")?1:0;
  const o={i:r.i,n:r.n,a,L:ing,s:st};
  if(c)o.c=c;
  const GENERIC=new Set(["pasta and noodles","nuts and seeds","oil and fat","herbs and spices","fat or oil"]);
  const k=(r.k||[]).filter(x=>!GENERIC.has(x));
  if(k.length)o.k=k.slice(0,40);
  if(r.nt&&r.nt.length)o.nt=r.nt.slice(0,3).map(x=>x.slice(0,400));
  if(r.in&&r.in.length>20)o.in=r.in.slice(0,400);
  if(r.sv)o.sv=r.sv.slice(0,30);if(r.tm)o.tm=r.tm.slice(0,60);if(/^[1-5]$/.test(r.df))o.df=+r.df;if(v)o.v=v;
  if(r.img&&r.img.u){o.p=r.img.u;if(r.img.a)o.pa=r.img.a;if(r.img.l)o.pl=r.img.l;if(r.img.p)o.pu=r.img.p}
  out.push(o);stat[a]=(stat[a]||0)+1;
}
const regions={};Object.entries(REGION).forEach(([k,v])=>{if(!AREA[k]||!AREA[k][1])regions[k]=[v,""]});
const json=JSON.stringify(out).replace(/</g,"\\u003c").replace(new RegExp(String.fromCharCode(0x2028),"g"),"\\u2028").replace(new RegExp(String.fromCharCode(0x2029),"g"),"\\u2029");
const re=/const WB_DATA=[\s\S]*?;\/\*WB_DATA\*\//;
if(!re.test(html))throw new Error("index.html içinde WB_DATA işareti yok");
html=html.replace(re,()=>"const WB_DATA="+json+";/*WB_DATA*/");
const rr=/const WB_REGIONS=\{[^;]*\};/;
if(rr.test(html))html=html.replace(rr,()=>"const WB_REGIONS="+JSON.stringify(regions)+";");
fs.writeFileSync(HTML,html);
console.log(`Wikibooks: ${out.length} tarif, ${Object.keys(stat).length} mutfak, ${out.filter(o=>o.p).length} görselli; ${(json.length/1048576).toFixed(2)} MB gömüldü.`);
if(Object.keys(unknown).length)console.log("Eşleşmeyen kategoriler:",JSON.stringify(unknown));
