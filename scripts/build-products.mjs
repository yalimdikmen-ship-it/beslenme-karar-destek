import * as XLSX from "xlsx";
import fs from "node:fs";

const workbook = XLSX.readFile("data/products.xlsx", {cellDates:false});
const enSheet = workbook.Sheets["Enteral_Erişkin"];
const pnSheet = workbook.Sheets["Parenteral_3_Oda"];
if(!enSheet || !pnSheet) throw new Error("Gerekli sayfalar bulunamadı: Enteral_Erişkin / Parenteral_3_Oda");

const enRows = XLSX.utils.sheet_to_json(enSheet, {defval:null, raw:true, range:1});
const pnRows = XLSX.utils.sheet_to_json(pnSheet, {defval:null, raw:true, range:1});

const num = v => (typeof v==="number" && Number.isFinite(v)) ? v : null;
const text = v => v==null ? "" : String(v).trim();
const first = (...xs) => xs.find(v => num(v)!==null);
const banned = /fresenius|smofkabiven|kabiven|pediasure|fortini|nutrini|isosource junior|infasource/i;

function mEq100(row, direct, mg, divisor){
  const d=num(row[direct]); if(d!==null) return d/100;
  const m=num(row[mg]); return m!==null ? (m/divisor)/100 : null;
}
function phosphate100(row){
  const d=num(row["Fosfat nominal (mEq/100 mL)"]); if(d!==null) return d/100;
  const mg=num(row["P (mg/100 mL)"]); return mg!==null ? ((mg/30.9738)*2)/100 : null;
}
function pnMEqPerMl(row, meqBag, mmolBag, factor=1){
  const bag=num(row["Torba (mL)"]); if(!bag) return null;
  const m=num(row[meqBag]); if(m!==null) return m/bag;
  const mm=num(row[mmolBag]); return mm!==null ? (mm*factor)/bag : null;
}

let en = enRows.filter(r=>text(r["Ürün"])).map((r,i)=>{
  const manufacturer=text(r["Üretici"]), product=text(r["Ürün"]), pack=num(r["Paket (mL)"]);
  if(banned.test(manufacturer+" "+product)) throw new Error("Kapsam dışı enteral kayıt: "+manufacturer+" "+product);
  const kcal=num(r["Enerji (kcal/mL)"]), protein100=num(r["Protein (g/100 mL)"]);
  if(!kcal || protein100===null) return null;
  return {
    id:"",
    manufacturer, product,
    label:`${manufacturer} — ${product}${pack?` (${pack} mL)`:""}`,
    form:text(r["Form"]), packMl:pack, status:text(r["Piyasa/kanıt durumu"]),
    kcalPerMl:kcal, proteinGPerMl:protein100/100,
    fatGPerMl:num(r["Yağ (g/100 mL)"])===null?null:num(r["Yağ (g/100 mL)"])/100,
    waterMlPerMl:num(r["Su (mL/100 mL)"])===null?null:num(r["Su (mL/100 mL)"])/100,
    waterType:text(r["Su veri tipi"]),
    electrolytes:{
      na:mEq100(r,"Na (mEq/100 mL)","Na (mg/100 mL)",22.9898),
      k:mEq100(r,"K (mEq/100 mL)","K (mg/100 mL)",39.0983),
      cl:mEq100(r,"Cl (mEq/100 mL)","Cl (mg/100 mL)",35.453),
      ca:mEq100(r,"Ca (mEq/100 mL)","Ca (mg/100 mL)",20.039),
      mg:mEq100(r,"Mg (mEq/100 mL)","Mg (mg/100 mL)",12.1525),
      phos:phosphate100(r)
    },
    electrolyteStatus:text(r["Elektrolit veri durumu"]),
    source:text(r["İçerik kaynağı"])||text(r["Piyasa kaynağı"]),
    marketSource:text(r["Piyasa kaynağı"]), note:text(r["Notlar"])
  };
}).filter(Boolean);

let pnRef=0;
let pn = pnRows.filter(r=>text(r["Ürün"])).map(r=>{
  const manufacturer=text(r["Üretici"]), product=text(r["Ürün"]);
  if(banned.test(manufacturer+" "+product)) throw new Error("Kapsam dışı PN kayıt: "+manufacturer+" "+product);
  const status=text(r["Piyasa/kanıt durumu"]);
  if(!status.startsWith("Geçerli ruhsat")){ pnRef++; return null; }
  const bag=num(r["Torba (mL)"]), kcal=first(r["Enerji (kcal/mL)"], num(r["Enerji (kcal/torba)"])!==null&&bag?num(r["Enerji (kcal/torba)"])/bag:null);
  const aa=num(r["Amino asit (g/torba)"]);
  if(!bag || !kcal || aa===null) return null;
  return {
    id:"",
    manufacturer, product,
    label:`${manufacturer} — ${product} ${bag} mL (${text(r["Uygulama yolu"])})`,
    route:text(r["Uygulama yolu"]), bagMl:bag, status,
    kcalPerMl:kcal, proteinGPerMl:aa/bag,
    fatGPerMl:num(r["Lipid (g/torba)"])===null?null:num(r["Lipid (g/torba)"])/bag,
    waterMlPerMl:1,
    electrolytes:{
      na:pnMEqPerMl(r,"Na (mEq/torba)","Na (mmol/torba)",1),
      k:pnMEqPerMl(r,"K (mEq/torba)","K (mmol/torba)",1),
      cl:pnMEqPerMl(r,"Cl (mEq/torba)","Cl (mmol/torba)",1),
      ca:pnMEqPerMl(r,"Ca (mEq/torba)","Ca (mmol/torba)",2),
      mg:pnMEqPerMl(r,"Mg (mEq/torba)","Mg (mmol/torba)",2),
      phos:pnMEqPerMl(r,"Fosfat nominal (mEq/torba)","Fosfat (mmol/torba)",2)
    },
    source:text(r["KÜB kaynağı"])||text(r["Piyasa/eşdeğer kaynağı"]),
    marketSource:text(r["Piyasa/eşdeğer kaynağı"]), note:text(r["Notlar"])
  };
}).filter(Boolean);

en.sort((a,b)=>a.manufacturer.localeCompare(b.manufacturer,"tr")||a.product.localeCompare(b.product,"tr")||(a.packMl||0)-(b.packMl||0));
pn.sort((a,b)=>a.manufacturer.localeCompare(b.manufacturer,"tr")||a.product.localeCompare(b.product,"tr")||(a.bagMl||0)-(b.bagMl||0));
en.forEach((p,i)=>p.id=`EN${String(i+1).padStart(3,"0")}`);
pn.forEach((p,i)=>p.id=`PN${String(i+1).padStart(3,"0")}`);

if(en.length<1 || pn.length<1) throw new Error("Ürün verisi boş üretildi");
const today=new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Istanbul"});
const human=today.split("-").reverse().join(".");
const db={schemaVersion:1,databaseVersion:today,enteral:en,parenteral:pn};
const version={schemaVersion:1,databaseVersion:today,updated:human,enteralCount:en.length,parenteralActiveCount:pn.length,parenteralReferenceCount:pnRef,sourceWorkbook:"products.xlsx"};

fs.writeFileSync("data/products.json",JSON.stringify(db,null,2)+"\n","utf8");
fs.writeFileSync("data/version.json",JSON.stringify(version,null,2)+"\n","utf8");
console.log(`OK: ${en.length} enteral, ${pn.length} aktif PN, ${pnRef} referans PN`);
