const assert=require('assert');const mem={};globalThis.localStorage={getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=v}};
const E=require('./energia.js');const S=require('./schedule.js');
const c=(o)=>Object.assign({mq:80,piani:1,tipo:'condominio',anno:1985,ristr:null,gasSmc:null},o);
assert.strictEqual(E.descrivi(c()).volume,208);                       // 80 x 2,6
assert.strictEqual(E.descrivi(c()).classe,'E');
assert.strictEqual(E.descrivi(c({anno:1930})).classe,'G');assert.strictEqual(E.descrivi(c({anno:1970})).classe,'F');
assert.strictEqual(E.descrivi(c({anno:2000})).classe,'D');assert.strictEqual(E.descrivi(c({anno:2010})).classe,'C');assert.strictEqual(E.descrivi(c({anno:2020})).classe,'B');
assert.strictEqual(E.descrivi(c({anno:1975,ristr:2020})).classe,'D');          // la ristrutturazione migliora la classe
assert(E.descrivi(c({tipo:'villino'})).eph>E.descrivi(c()).eph);
assert.strictEqual(E.descrivi({mq:null,anno:1990}),null);
// fabbisogno: con gas noto parte da quello (300 Smc ~ 3000 kWh)
assert(Math.abs(E.caloreAnno(c({gasSmc:300}))-300*11.109*0.9)<1e-6);assert.strictEqual(E.caloreAnno({}),3000);
const tm=m=>S.MESI[m].media;let tot=0;E.INV.forEach(m=>tot+=E.caloreMese(c(),m,tm));assert(Math.abs(tot-E.caloreAnno(c()))<1e-6);
assert(E.caloreMese(c(),1,tm)>E.caloreMese(c(),4,tm));assert(E.caloreMese(c(),4,tm)>=0);
// COP
assert(E.cop(7)===3.5);assert(E.cop(-20)===2.2);assert(E.cop(40)===5);
// prezzi attuali: elettrico conviene (pareggio COP ~2,07)
const pr={luce:0.2807,gas:1.357};let k=E.costi(1000,7,pr);assert(k.elettrica<k.gas);assert(Math.abs(k.gas-135.7)<1);
// luce cara: gas conviene a -> verdetto
const pr2={luce:0.45,gas:1.1};k=E.costi(1000,3,pr2);let v=E.verdetto('elettrica',k);assert(v.cambia&&v.verso==='gas'&&v.risparmio>10);
// differenza piccola: nessun cambio
k=E.costi(100,7,pr);v=E.verdetto('gas',k);assert(!v.cambia);               // risparmio < 10 EUR
// finestra / scadenza
assert.strictEqual(E.finestra(new Date(2026,10,2)),'2026-11a');assert.strictEqual(E.finestra(new Date(2026,10,29)),'2026-11b');assert.strictEqual(E.finestra(new Date(2026,10,15)),null);
assert.strictEqual(E.meseRef(new Date(2026,9,30)),11);assert.strictEqual(E.meseRef(new Date(2026,6,10)),null);
let st=Object.assign({},{ultimaVerifica:null,finestra:null,fonte:'elettrica'},c({gasSmc:300}));
assert(E.dovuta(st,new Date(2026,10,15)));
st=E.verifica(st,new Date(2026,10,15),tm,pr);assert(st.ultimaVerifica);
assert(!E.dovuta(st,new Date(2026,10,20)));                                 // appena fatta: no
assert(E.dovuta(st,new Date(2026,11,16)));                                  // dopo 30 giorni
st.finestra=null;st.ultimaVerifica=new Date(2026,10,15).toISOString();assert(E.dovuta(st,new Date(2026,11,1)));   // inizio mese
assert(E.dovuta(st,new Date(2026,10,29)));                                   // fine mese
const f1=E.finestra(new Date(2026,10,29));st.finestra=f1;st.ultimaVerifica=new Date(2026,10,29).toISOString();assert(!E.dovuta(st,new Date(2026,10,30)));
assert(!E.dovuta(st,new Date(2026,6,1)));                                     // estate: mai
// consiglio con gas piu' conveniente
let s2=Object.assign({},st,{fonte:'elettrica',ultimaVerifica:null,finestra:null});s2=E.verifica(s2,new Date(2026,0,15),tm,{luce:0.6,gas:1.0},true);
assert(s2.consiglio&&s2.consiglio.verso==='gas'&&s2.consiglio.risparmio>=10,JSON.stringify(s2.consiglio));
let s3=E.verifica(Object.assign({},s2,{fonte:'gas'}),new Date(2026,0,15),tm,{luce:0.6,gas:1.0},true);assert.strictEqual(s3.consiglio,null);
// prezzi: override utente
assert.deepStrictEqual(E.prezzi({luce:null,gas:null},{luce:0.3,gas:1.2}),{luce:0.3,gas:1.2});assert.strictEqual(E.prezzi({luce:0.25,gas:null},null).luce,0.25);
E.save(Object.assign(E.load(),{mq:90}));assert.strictEqual(E.load().mq,90);
console.log('OK3');
