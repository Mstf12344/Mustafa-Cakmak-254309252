"use strict";
/* Üçüncü tur: kalan fotoğrafsız tarifler için elle hazırlanmış eşleme.
   Her tarif için sırayla denenecek adaylar:
     E:Başlık  → Wikipedia'da yemeğin kendi sayfası (birebir)
     R:Başlık  → benzer/üst tür yemeğin sayfası (temsilî, "r":1)
     C:sorgu   → Commons'ta dosya araması (temsilî, "r":1)
   Sonuçlar tools/wikibooks/fotolar.json'a eklenir. */
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
const BAD=/flag|\bmap\b|logo|icon|coat of arms|locator|seal|emblem|diagram|chart|portrait|signature|menu|poster|advert|packag|label|cover|truck|storefront|shop|restaurant|street|market|stall|festival|museum|statue|fryer|vendor|seller|temple|church|\.svg$|\.gif$|\.tif/i;
const FOOD=/dish|cuisine|food|soup|stew|bread|dessert|cake|cookie|biscuit|pastr|sauce|condiment|salad|beverage|drink|snack|curr(y|ies)|rice|noodle|pasta|meat|fish|seafood|vegetable|confection|pudding|pie|sandwich|porridge|dumpling|breakfast|cheese|egg|tea|coffee|candy|sweets|fried|baked|grilled|roast|stuffed|kebab|sausage|chutney|pickle|beans|lentil|chicken|beef|pork|lamb|pancake|fritter|spice|dip|casserole|cooking|steak|omelet|plantain|cassava|yam|greens|insects/i;

const MAP={
"Accra Cassava (Cameroonian Cassava Fritters)":"R:Akara;C:cassava fritters",
"Acid Drops":"E:Acid drop",
"Albanian Meat with Walnuts":"C:meat walnut sauce;R:Stew",
"Alicha Wot (Mild Ethiopian Stew)":"R:Wat (food)",
"Alsatian Fresh Noodles (Nouilles fraîches à l'Alsacienne)":"R:Egg noodles;C:fresh egg noodles",
"Apple Brown Betty":"E:Brown Betty (dessert)",
"Arambasici (Croatian Sour Cabbage Rolls)":"E:Arambašići;R:Sarma (food);R:Cabbage roll",
"Arjoli (Maltese Herbed Bread Dip)":"C:arjoli maltese;R:Dip (food)",
"Asa iwa":"R:Fritter",
"Atkilt Wat (Ethiopian Cabbage and Potato Stew)":"E:Atakilt wat;C:atkilt wat;R:Wat (food)",
"Ator mboro":"R:Stew",
"Atropellado de Coco (Coconut and Sweet Potato Dessert)":"R:Dulce de batata;C:coconut sweet potato dessert",
"Bacon and Egg Stuffed Tomatoes":"R:Stuffed tomatoes;C:stuffed tomatoes egg",
"Baked Leeks":"C:baked leeks;R:Gratin",
"Baked Penne":"R:Baked ziti;R:Penne",
"Baklava with Pistachio Nuts":"E:Baklava",
"Barbecue Prime Rib":"E:Standing rib roast",
"Basic Chai":"E:Masala chai",
"Bazeen bil Lahm (Libyan Meat Bazeen)":"E:Bazeen",
"Beef and Vegetable Kabobs":"E:Shish kebab",
"Beef Jerky":"E:Jerky",
"Beef Pasties":"E:Pasty",
"Beef Stock":"E:Stock (food)",
"Bengal Potatoes":"R:Aloo posto;R:Dum aloo",
"Beurre à la Bourguignonne (Garlic Scallion Butter)":"R:Compound butter;C:garlic butter",
"Beurre Monté":"E:Beurre monté;R:Beurre blanc",
"Bife de tartaruga":"C:bife de tartaruga;R:Steak",
"Black Forest Torte":"E:Black Forest gateau",
"Blackened Sirloin":"R:Blackening (cooking);R:Sirloin steak",
"Boiled Collard Greens":"C:cooked collard greens;R:Collard greens",
"Bonga Fish Domoda (Gambian Fish in Peanut Sauce)":"E:Domoda;R:Groundnut stew",
"Booyah (Chicken Vegetable Stew)":"E:Booyah (stew)",
"Bouchée à la Reine":"E:Bouchée à la Reine;R:Vol-au-vent",
"Boule-Di (Senegalese Fish and Rice)":"R:Thieboudienne",
"Braai (Zambian Barbecue)":"E:Braai",
"Braised Collard Greens":"C:cooked collard greens;R:Collard greens",
"Broccoli Kugel":"R:Kugel",
"Cabbie Claw (Scottish Whitefish with Egg and Potato)":"E:Cabbie claw;C:poached haddock",
"Canjeero (Somali Pancake)":"E:Canjeero;E:Lahoh",
"Caramelized Sweet and Sour Onion Marmalade":"R:Caramelized onions;C:onion jam",
"Carpetbag Steak":"E:Carpetbag steak",
"Carrot Kugel":"R:Kugel",
"Carrots Cooked Kinpira Style":"E:Kinpira",
"Causa Rellena con Pollo (Peruvian Layered Potato and Chicken)":"E:Causa limeña",
"Chadian Gilled Fish":"C:grilled fish whole;R:Grilled fish",
"Champ (Irish Mashed Potato with Scallion)":"E:Champ (food)",
"Char Sui (Asian Barbecued Pork)":"E:Char siu",
"Cheese Enchilada":"E:Enchilada",
"Cheese Filling for Peynirli Börek":"E:Börek",
"Chicken Madras":"E:Madras curry",
"Chipotle Sliders":"E:Slider (sandwich)",
"Choucroute (Sauerkraut with Meat and Potatoes)":"E:Choucroute garnie",
"Chuck Wagon Beans":"R:Baked beans",
"Colonial Goose":"E:Colonial goose;R:Roast lamb",
"Confederate Cush":"C:cush cornbread;R:Cornbread",
"Cornbread Stuffed Zucchini":"C:stuffed zucchini;R:Dolma",
"Corny Soufflé":"R:Corn pudding;R:Soufflé",
"Corom Chatni (Mango Chutney with Hot Chillies)":"R:Mango chutney;R:Chutney",
"Crab Meat Ravioli Filling":"R:Ravioli",
"Cream Cheese Mints":"C:cream cheese mints;R:Mint (candy)",
"Cream Cheese Wontons":"R:Crab rangoon",
"Crème Saint-Honoré":"R:Gâteau St. Honoré;R:Crème chiboust",
"Crispy Santa Fe Chicken":"R:Fried chicken",
"Danish Braised Cabbage (Rødkål)":"C:rødkål;R:Braised red cabbage;C:braised red cabbage",
"Deep Fried Chickpea Dough with Lemon (Panissa)":"E:Panissa;R:Panisse;R:Panelle",
"Deep Fried Turkey":"C:deep fried turkey;R:Roast turkey",
"Doro Dabo (Ethiopian Chicken with Spiced Bread)":"R:Doro wat",
"Doro Fitfit (Ethiopian Chicken Salad)":"R:Fit-fit",
"Doro Tibs (Ethiopian Sauteed Chicken)":"R:Tibs",
"Dorowot Fitfit (Ethiopian Chicken Stew Salad)":"R:Fit-fit;R:Doro wat",
"Dry Rub":"E:Spice rub",
"Duonos Gira (Lithuanian Rye Drink)":"E:Kvass",
"Dutch Oven Beans":"R:Baked beans",
"Eba with Efo Gbure (Cassava Flake Swallow with Waterleaf Soup)":"E:Eba (food);R:Garri",
"Ebiripo (Nigerian Mashed Taro)":"C:ebiripo;R:Pounded yam",
"Eel alla Milanese":"C:eel stew;R:Jellied eels",
"Egg Soda":"E:Egg soda;R:Egg cream",
"Egidi (Pounded Corn)":"C:egidi;R:Ogi (food)",
"Egyptian Stuffed Eggplant (Mahshi Betinjan)":"E:Mahshi;R:Dolma",
"Enchiladas Rojas":"E:Enchilada",
"Euneo-juk (Korean Sweetfish Porridge)":"R:Juk (food);R:Congee",
"Fasolia (Ethiopian Green Bean Stew)":"C:fasolia ethiopian;R:Fasolakia",
"Firfir (Ethiopian Spicy Scrambled Eggs with Injera)":"E:Fit-fit",
"Fondue Neuchateloise":"E:Fondue",
"Fresh Herb and Cheese Ravioli Filling":"R:Ravioli",
"Fresh Tomato Galette":"C:tomato galette;R:Galette",
"Frog's Legs à la Parisienne":"E:Frog legs",
"Fuk-Thong Pad Khai (Thai Stir-Fried Pumpkin)":"C:stir fried pumpkin egg;C:fak thong phat khai",
"Gobi Bhagi (Spiced Cauliflower Stew)":"R:Aloo gobi",
"Gomen (Ethiopian Collard Greens)":"C:gomen ethiopian;C:cooked collard greens",
"Gonja (Ugandan Fried Plantains)":"R:Fried plantain",
"Gorgonzola Stuffed Chateaubriand":"E:Chateaubriand (dish)",
"Grilled Dog":"E:Hot dog",
"Grotten Hans (Steamed Sweet Bread)":"C:Großer Hans;R:Steamed bread",
"Gyuveche (Bulgarian Casserole) II":"E:Güveç",
"Hanjin Ligidi (Nigerian Lollipops)":"C:hanjin ligidi;R:Lollipop",
"Herbed Corn":"R:Corn on the cob",
"Hlib Tmer (Algerian Date Milk)":"C:date milk drink;R:Date shake",
"Holzknechtnocken with Strawberry Curd au Gratin":"C:topfen gratin;R:Gratin",
"Hush Puppies":"E:Hushpuppy",
"Ibirayi n'Ibishyimbo (Rwandan Bean Soup with Fish)":"R:Bean soup",
"Ifinkubala (Zambian Fried Caterpillars)":"E:Mopane worm",
"Ikokore":"E:Ikokore;R:Pottage",
"Indian Beans":"R:Rajma",
"Indian Potatoes":"R:Bombay potatoes;R:Dum aloo",
"Indian Rice":"R:Jeera rice;R:Pulao",
"Inguday Tibs (Ethiopian Mushroom Stir-Fry)":"R:Tibs",
"Inswa (Zambian Fried Flying Ants)":"C:fried termites;C:fried flying ants",
"Irish Pastie":"E:Pastie",
"Italian Braised Shortribs":"R:Short ribs",
"Jailhouse Chili":"R:Chili con carne",
"Kal Kals (Sweet Curled Fritters)":"E:Kulkul;C:kulkuls",
"Katchi Biryani":"R:Hyderabadi biryani;R:Biryani",
"Keralan Prawns":"C:kerala prawn curry;R:Prawn curry",
"Key Wat (Ethiopian Red Stew)":"E:Key wat;R:Wat (food)",
"Kokoro (Nigerian Cornmeal Snacks)":"E:Kokoro (snack);C:kokoro snack",
"Komle (Norwegian Potato Dumplings)":"E:Raspeball",
"Kuku Paka":"E:Kuku paka",
"Kunun kanwa":"R:Kunu",
"Kurma (Trinidadian Fried Dough in Syrup)":"C:kurma trinidad;R:Fritter",
"Lady Arundel's Manchet":"E:Manchet",
"Liberian Butter Rice":"C:butter rice;R:Pilaf",
"Liberian Country Beans Torborgee":"C:torborgee;R:Bean stew",
"Liberian Fried Sweet Potato Puffs":"C:sweet potato fritters;R:Fritter",
"Maitorieska (Finnish Barley Flatbread)":"E:Rieska",
"Mango Atchar":"E:Mango pickle;R:Achar",
"Maple Beans":"R:Baked beans",
"Maple Syrup Planked Salmon":"C:cedar plank salmon;R:Plank cooking",
"Marsala Chicken Scallopini":"E:Chicken marsala",
"Mbahal (Gambian Fish and Okra)":"C:mbahal;R:Okra soup",
"Mchemsho (Tanzanian cuisine)":"E:Mchemsho;R:Stew",
"Meatloaf Dinner":"R:Meatloaf",
"Mediterranean Green Chicken":"R:Roast chicken",
"Meringata (Cream-filled Meringue Gateaux)":"C:meringata;R:Pavlova",
"Mesir Wat (Spicy Ethiopian Lentil Stew)":"E:Misir wot;C:misir wat;R:Wat (food)",
"Mesquite BBQ Salmon":"C:grilled salmon fillet;R:Salmon as food",
"Mexican Chocolate Cake with Mocha Buttercream":"R:Chocolate cake",
"Mexican Seasoning":"R:Taco seasoning;R:Spice mix",
"Minestra":"E:Minestra;R:Minestrone",
"Minestrone alla Capucina":"R:Minestrone",
"Mini Three-Cheese English Muffin Pizzas":"R:Pizza bagel;C:english muffin pizza",
"Miyan Karkashi (Nigerian Sesame Leaf Soup)":"C:miyan karkashi;R:Ewedu soup",
"Mocha Buttercream":"R:Buttercream",
"Mực Nhồi Thịt (Vietnamese Stuffed Squid)":"C:mực nhồi thịt;C:stuffed squid",
"Mukhbaza":"E:Mukhbaza;C:mukhbaza",
"Mushroom Caps Stuffed with Bacon and Cheese":"E:Stuffed mushrooms",
"Nettle Pesto":"C:nettle pesto;R:Pesto",
"New Mexico Chili Verde":"E:Chile verde",
"Nigerian Coco Pops":"C:coco pops snack",
"Nigerian Cocoyam Chips":"C:cocoyam chips;C:taro chips",
"Nigerian Coleslaw":"R:Coleslaw",
"Nigerian Miyan Giyada":"C:miyan giyada;R:Groundnut soup",
"Nigerian Yanrin":"C:yanrin;C:efo riro",
"Nni Ede (Nigerian Pounded Cocoyam)":"R:Fufu",
"Nutty Brownie Bars":"R:Chocolate brownie",
"Obuwunga (Ugandan Traditional Bread)":"R:Ugali",
"Ofe Owerri":"E:Ofe Owerri;C:ofe owerri",
"Pan-Seared Duck Breast with Cabernet Reduction":"R:Magret;C:duck breast",
"Pancetta Fusilli with Herb Shallot Cream":"R:Fusilli",
"Panna Cotta with Red Fruit Sauce":"E:Panna cotta",
"Pasta and Bean Soup":"E:Pasta e fagioli",
"Pasta Marinata":"C:pasta tomato sauce;R:Pasta",
"Penne alla Casa (Penne in Creamy Tomato Sauce)":"R:Penne alla vodka",
"Persian Apple Dessert":"C:apple dessert;R:Faloodeh",
"Pizza Rollups":"R:Pizza roll;R:Stromboli (food)",
"Poached Salmon with wild Huckleberries":"C:poached salmon",
"Polish Cauliflower with Breadcrumbs":"C:cauliflower polonaise;R:Polonaise (garnish)",
"Ponche de Crème":"E:Ponche crema;R:Eggnog",
"Pork Aachi":"C:pork curry;R:Pork curry",
"Pork Chops Cacciatore":"R:Cacciatore",
"Posho and Beans":"R:Ugali",
"Potage Parmentier":"R:Vichyssoise;R:Leek soup",
"Potato and Garlic Ravioli Filling":"R:Ravioli",
"Potato Lángos":"E:Lángos",
"Poundo Potato":"R:Fufu",
"Poundo Yam":"E:Pounded yam",
"Prata":"E:Roti prata;E:Roti canai",
"Proja (Serbian Cornbread)":"E:Proja",
"Pudding with Coconut Topping (Tako)":"E:Tako (dessert);C:khanom tako",
"Pudina Hilsa (Bengali Fish with Mint)":"R:Shorshe ilish",
"Pufftaloons":"E:Pufftaloon",
"Quick Finnish Lemon Mead (Sima)":"E:Sima (mead)",
"Rabbit with Abbey Beer (Konijn met Paterbier)":"C:konijn met pruimen;C:rabbit stew",
"Rice Modak (Coconut Pastries) I":"E:Modak",
"Rice Modak (Coconut Pastries) II":"E:Modak",
"Risengrød":"E:Risengrød;R:Rice pudding",
"Rocky Road Confectionery I":"E:Rocky road (dessert)",
"Romanian Roasted Eggplant Spread I":"E:Salată de vinete;R:Baba ghanoush",
"Rwandan Goat Brochette":"R:Brochette;R:Shish kebab",
"Sarmale (Romanian Cabbage Rolls)":"E:Sarma (food)",
"Sauerkraut Pierogi Filling":"E:Pierogi",
"Scribbled Eggs":"R:Scrambled eggs",
"Seared Duck Breast with Pinot Noir Reduction":"R:Magret;C:duck breast",
"Sega Wat (Spicy Ethiopian Beef Stew)":"R:Wat (food)",
"Sese Plaintains (Cameroonian Plantain Stew)":"C:plantain stew;R:Fried plantain",
"Seven Minute Icing":"E:Seven-minute frosting;R:Icing (food)",
"Sharba Libya (Libyan Soup)":"E:Sharba;R:Shorba",
"Sharmoula bil Lahm (Libyan Marinated Meat Sharmoula)":"R:Chermoula",
"Shiro Wat (Ethiopian Pea Stew)":"E:Shiro (food)",
"Sindhi Raitha":"R:Raita",
"Sindhi Spiced Fish":"C:fried fish masala;R:Fish curry",
"Sindhi Vegetable Kofta":"R:Kofta",
"Sirniki (Russian Cheese Fritters)":"E:Syrniki",
"Smoked Salmon Ravioli Filling":"R:Ravioli",
"Smothered Okra":"C:smothered okra;C:stewed okra",
"Sombi":"C:sombi;R:Rice pudding",
"Southern Style Greens":"C:cooked collard greens;R:Collard greens",
"Southwestern Scramble":"R:Scrambled eggs",
"Spaghetti Bake":"C:baked spaghetti;R:Spaghetti",
"Spicy Miso Udon":"R:Udon",
"Supu Ya Ndizi":"C:banana soup;R:Matoke",
"Sweet and Spicy Asian Chicken":"R:General Tso's chicken",
"Sweet Italian Sausage Skillet":"R:Italian sausage",
"Sweet Rice I":"R:Rice pudding",
"Tagliatelle Bake":"R:Tagliatelle",
"Tajine bil Samak (Libyan Fish Tajine)":"C:fish tajine;R:Tajine",
"Tamate Ka Kut (Hyderabadi Tomato Curry)":"C:tamatar ka kut;R:Curry",
"Tapai Ketan (Indonesian Fermented Sticky Rice)":"E:Tapai",
"Tea Eggs":"E:Tea egg",
"Tegabino Shiro (Ethiopian Spiced Chickpea Dip)":"R:Shiro (food)",
"Telur Dadar":"E:Telur dadar;R:Omelette",
"Thobwa la Mtedza (Malawian Sesame Seed Drink)":"E:Thobwa;C:thobwa",
"Timatim Fitfit (Ethiopian Tomato Salad)":"E:Timatim;C:timatim;R:Fit-fit",
"Tomato Sauce Piquante":"R:Sauce piquante",
"Torta de Acelga (Chard Pie)":"R:Torta pascualina",
"Tortilla Española de Patatas":"E:Spanish omelette",
"Tourte à la Lorraine":"E:Tourte lorraine;R:Pâté lorrain",
"Turkish Dolma Pilav":"R:Pilaf",
"Tuscan Bean Soup":"R:Ribollita",
"Tyropita (Greek Cheese Pie)":"E:Tiropita",
"Ume-shu (Japanese Plum Juice)":"E:Umeshu",
"Upeseru (Indian Lentils with Greens)":"C:upeseru;R:Dal",
"Veal Stock":"R:Stock (food)",
"Wali Wa Nazi":"E:Wali wa nazi;R:Coconut rice",
"Wonjo Bissap (Gambian Hibiscus Beverage)":"R:Hibiscus tea",
"Wonton Wrappers":"E:Wonton wrapper;R:Wonton",
"Yetakelt Wot (Ethiopian Spiced Vegetable Stew)":"R:Wat (food)",
"Yetsom Shiro (Ethiopian Vegan Chickpea Stew)":"R:Shiro (food)",
"Zilzil Tibs (Spicy Ethiopian Beef Strips)":"R:Tibs"
};

async function wikipediaPage(title){
  const j=await q(WP,{action:"query",titles:title,redirects:"1",prop:"pageimages|categories|pageprops",piprop:"name",cllimit:"max",clshow:"!hidden",ppprop:"disambiguation"});
  const p=(j.query&&j.query.pages||[])[0];
  if(!p||p.missing||!p.pageimage||(p.pageprops&&"disambiguation" in p.pageprops))return null;
  if(BAD.test(p.pageimage))return null;
  return {file:p.pageimage,k:"wp:"+p.title};
}
async function commonsSearch(query){
  const j=await q(CM,{action:"query",generator:"search",gsrsearch:query+" filetype:bitmap",gsrlimit:"12",gsrnamespace:"6",prop:"categories",cllimit:"max",clshow:"!hidden"});
  const words=query.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").split(/\s+/).filter(w=>w.length>2);
  const pages=(j.query&&j.query.pages||[]).sort((a,b)=>(a.index||0)-(b.index||0));
  for(const p of pages){
    const name=p.title.replace(/^File:/,"");
    if(BAD.test(name)||!/\.(jpe?g|png|webp)$/i.test(name))continue;
    const nm=name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
    const cats=(p.categories||[]).map(c=>c.title).join(" | ");
    const hit=words.filter(w=>nm.includes(w.replace(/s$/,""))||cats.toLowerCase().includes(w.replace(/s$/,""))).length;
    if(hit<Math.ceil(words.length*0.6))continue;
    if(!FOOD.test(cats)&&!FOOD.test(name))continue;
    return {file:name,k:"c:"+name};
  }
  return null;
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
      if((ii.width||0)<250||(ii.height||0)<180)continue;
      const key=(nm[p.title]||p.title).replace(/^File:/,"").replace(/ /g,"_");
      res[key]={u:ii.thumburl||ii.url,a:clean((em.Artist||{}).value||"").slice(0,120),l:lic,lu:(em.LicenseUrl||{}).value||"",p:ii.descriptionurl};
    }
    await sleep(300);
  }
  return res;
}
(async()=>{
  const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
  const data=JSON.parse(html.match(/const WB_DATA=(\[.*?\]);\/\*WB_DATA\*\//s)[1]);
  const prev=fs.existsSync(OUT)?JSON.parse(fs.readFileSync(OUT,"utf8")):{};
  const todo=data.filter(o=>!o.p&&!prev[o.i]);
  console.log("aranacak:",todo.length,"eşlemesi olan:",todo.filter(o=>MAP[o.n]).length);
  // her tarif için tüm adayları sırayla dener; lisans kontrolünden geçemeyen aday atlanır
  const cands={};
  for(const o of todo){
    const spec=MAP[o.n];if(!spec)continue;
    const list=[];
    for(const part of spec.split(";")){
      const m=part.match(/^([ERC]):(.+)$/);if(!m)continue;
      const hit=m[1]==="C"?await commonsSearch(m[2]):await wikipediaPage(m[2]);
      if(hit)list.push({...hit,r:m[1]!=="E",h:m[2]});
      await sleep(80);
    }
    cands[o.i]={t:o.n,list};
  }
  const files=[...new Set(Object.values(cands).flatMap(c=>c.list.map(x=>x.file.replace(/ /g,"_"))))];
  const info=await imageInfo(files.map(f=>f.replace(/_/g," ")));
  const out={...prev};let ok=0,ex=0;const miss=[];
  for(const [id,c] of Object.entries(cands)){
    const pick=c.list.find(x=>info[x.file.replace(/ /g,"_")]);
    if(!pick){miss.push(c.t);continue}
    out[id]={...info[pick.file.replace(/ /g,"_")],k:pick.k,t:c.t,...(pick.r?{r:1,h:pick.h}:{})};
    ok++;if(!pick.r)ex++;
    console.log((pick.r?"T ":"B ")+c.t+"  →  "+pick.k);
  }
  fs.writeFileSync(OUT,JSON.stringify(out));
  console.log("BULUNAMAYAN:",miss.join(" | "));
  console.log(`Üçüncü tur: ${ok} tarife fotoğraf (${ex} birebir, ${ok-ex} temsilî). Toplam kayıt ${Object.keys(out).length}.`);
})().catch(e=>{console.error(e);process.exit(1)});
