"use strict";
const fs=require("fs"),path=require("path");
const API="https://en.wikibooks.org/w/api.php";
const OUT=path.join(__dirname,"out");fs.mkdirSync(OUT,{recursive:true});
const UA="DunyaMutfagiStudentProject/1.0 (https://github.com/Mstf12344/Mustafa-Cakmak-254309252)";
async function q(params){const u=API+"?"+new URLSearchParams({format:"json",formatversion:"2",...params});
  for(let i=0;i<4;i++){try{const r=await fetch(u,{headers:{"User-Agent":UA}});if(r.ok)return r.json()}catch(e){}await new Promise(r=>setTimeout(r,1500*(i+1)))}throw new Error("fail "+u)}
async function sub(cat){let out=[],c;do{const j=await q({action:"query",list:"categorymembers",cmtitle:cat,cmtype:"subcat",cmlimit:"500",...(c?{cmcontinue:c}:{})});out.push(...j.query.categorymembers.map(x=>x.title));c=j.continue&&j.continue.cmcontinue}while(c);return out}
async function info(titles){const res={};for(let i=0;i<titles.length;i+=50){const j=await q({action:"query",prop:"categoryinfo",titles:titles.slice(i,i+50).join("|")});(j.query.pages||[]).forEach(p=>res[p.title]=p.categoryinfo||null)}return res}
(async()=>{
  const roots=["Category:Recipes by origin","Category:Recipes by cuisine","Category:Cuisines","Category:Recipes","Category:Cookbook","Category:Recipes by region"];
  const r={};
  for(const c of roots){try{const s=await sub(c);r[c]={n:s.length,info:await info(s)}}catch(e){r[c]={err:String(e)}}}
  fs.writeFileSync(path.join(OUT,"kategoriler.json"),JSON.stringify(r,null,1));
  const samples=["Cookbook:Baklava","Cookbook:Menemen","Cookbook:Hummus","Cookbook:Pad Thai","Cookbook:Lasagna"];
  const j=await q({action:"query",prop:"revisions|categories|pageimages",rvprop:"content",rvslots:"main",titles:samples.join("|"),cllimit:"max",piprop:"original"});
  fs.writeFileSync(path.join(OUT,"ornekler.json"),JSON.stringify(j,null,1));
  console.log("ok");
})().catch(e=>{console.error(e);process.exit(1)});
