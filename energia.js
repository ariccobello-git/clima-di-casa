(function (root) {
  // Casa, costi e consiglio elettrico/gas. Stime indicative, non sostituiscono un APE.
  var KEY = 'clima.casa.v1';
  var P = { gradoPct: 0.07, eff: 0.9, kwhPerSmc: 11.109, presenza: 0.7, altezza: 2.6, marg: 0.85, sogliaEuro: 10, sogliaPct: 0.08, fallbackKwh: 3000 };
  // Fabbisogno utile di riscaldamento (kWh/m² anno) per epoca di costruzione, scala zona D (Roma).
  // Riferimento: ENEA-CTI, Rapporto annuale sulla certificazione energetica (banca dati APE nazionale SIAPE) e tipologie TABULA/EPISCOPE.
  var EPOCHE = [[1945, 190], [1960, 180], [1976, 165], [1991, 125], [2005, 90], [2015, 65], [9999, 40]];
  var DEF = { mq: null, piani: 1, tipo: 'condominio', anno: null, ristr: null, gasSmc: null, fonte: 'elettrica', luce: null, gas: null, ultimaVerifica: null, finestra: null, consiglio: null, budget: null, storico: {}, bollette: {}, revisione: false };
  var INV = [11, 12, 1, 2, 3, 4], GIORNI = { 11: 30, 12: 31, 1: 31, 2: 28, 3: 31, 4: 15 };

  function ls() { try { return root.localStorage; } catch (e) { return null; } }
  function load() { var o = {}, s = {}; try { s = (root.VAULT ? root.VAULT.get(KEY) : JSON.parse(ls().getItem(KEY))) || {}; } catch (e) {} for (var k in DEF) o[k] = s[k] !== undefined ? s[k] : DEF[k]; return o; }
  function chiaveMese(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }
  // Ricorda la fonte usata in ogni mese (ultimi 12), per il report del mese concluso.
  function registra(s, d) {
    var h = s.storico && typeof s.storico === 'object' ? s.storico : {}; h[chiaveMese(d || new Date())] = s.fonte;
    var k = Object.keys(h).sort(); while (k.length > 12) delete h[k.shift()]; s.storico = h; return s;
  }
  function save(s) { registra(s); try { if (root.VAULT) root.VAULT.set(KEY, s); else ls().setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  function annoEff(c) { var a = +c.anno, r = +c.ristr; return (r && r > a) ? a + 0.6 * (r - a) : a; }
  function eph(c) { var y = annoEff(c); for (var i = 0; i < EPOCHE.length; i++) if (y <= EPOCHE[i][0]) return EPOCHE[i][1]; return 40; }
  function classe(e) { return e < 40 ? 'A' : e < 65 ? 'B' : e < 90 ? 'C' : e < 120 ? 'D' : e < 150 ? 'E' : e < 175 ? 'F' : 'G'; }
  function fattore(c) {
    if (c.tipo === 'villino') return 1.15 * (c.piani <= 1 ? 1.08 : c.piani >= 3 ? 0.96 : 1);
    return c.piani >= 5 ? 0.95 : 1;
  }
  function ok(c) { return !!(c && c.mq > 10 && c.anno >= 1800 && c.anno <= 2100); }
  // Volume da scaldare (m³) = superficie × altezza media (non mostrata).
  function volume(c) { return c.mq * P.altezza; }
  function descrivi(c) {
    if (!ok(c)) return null;
    var e = eph(c) * fattore(c);
    return { volume: Math.round(volume(c)), eph: Math.round(e), classe: classe(e) };
  }
  // Segnala valori insoliti (nessuna domanda in più): aiuta a evitare errori di battitura o dati non confrontabili.
  function controllo(c) {
    var w = [], y = new Date().getFullYear();
    if (c.mq && (c.mq < 15 || c.mq > 1000)) w.push('La superficie sembra insolita: controlla i metri quadri.');
    if (c.anno && (c.anno < 1800 || c.anno > y)) w.push('L\u2019anno di costruzione sembra insolito.');
    if (c.ristr && c.anno && c.ristr < c.anno) w.push('La ristrutturazione risulta prima della costruzione: l\u2019anno viene ignorato.');
    if (c.piani && (c.piani < 1 || c.piani > 30)) w.push('Il numero di piani sembra insolito.');
    if (c.gasSmc && c.mq && ok(c)) {
      var r = c.gasSmc / c.mq;
      if (r < 1.5 || r > 25) w.push('Il gas indicato (' + Math.round(r * 10) / 10 + ' Smc per m²) è fuori dal normale per il solo riscaldamento: la stima userà comunque il tuo dato. Controlla di non aver inserito anche cucina e acqua calda.');
    }
    return w;
  }
  // Calore utile da produrre in un anno di riscaldamento (kWh). Con il consumo di gas noto si parte da quello.
  function caloreAnno(c) {
    if (c && c.gasSmc > 0) return c.gasSmc * P.kwhPerSmc * P.eff;
    if (!ok(c)) return P.fallbackKwh;
    return volume(c) * (eph(c) * fattore(c) / 2.7) * P.presenza;
  }
  // Ripartizione per mese in base a quanto fa freddo fuori (gradi-giorno semplificati, base 18 °C).
  function caloreMese(c, m, tmed) {
    var w = function (x) { return Math.max(0, 18 - tmed(x)) * GIORNI[x]; }, tot = 0; INV.forEach(function (x) { tot += w(x); });
    return tot > 0 ? caloreAnno(c) * w(m) / tot : 0;
  }
  // Resa della pompa di calore in funzione della temperatura esterna.
  function cop(t) { return Math.max(2.2, Math.min(5, 3.5 + 0.12 * (t - 7))); }
  function costi(Q, t, pr) {
    // I prezzi "tutto compreso" includono quote fisse che non cambiano passando da una fonte all'altra: conto solo la parte variabile (circa 85 %).
    var gasKwh = pr.gas * (pr.mG || P.marg) / (P.kwhPerSmc * P.eff), elKwh = pr.luce * (pr.mL || P.marg) / cop(t);
    return { gas: Q * gasKwh, elettrica: Q * elKwh, cop: cop(t), gasKwh: gasKwh, elKwh: elKwh, kwhEl: Q / cop(t), smc: Q / (P.kwhPerSmc * P.eff) };
  }
  // Verdetto: cambia solo se il risparmio è tangibile (almeno 10 € al mese e l'8 %).
  function verdetto(fonte, k) {
    var cur = k[fonte], alt = fonte === 'gas' ? 'elettrica' : 'gas', diff = cur - k[alt];
    return { cambia: diff >= P.sogliaEuro && diff / cur >= P.sogliaPct, verso: alt, risparmio: Math.max(0, diff), migliore: k.gas < k.elettrica ? 'gas' : 'elettrica' };
  }
  // Mese da valutare: in ottobre si guarda già novembre; da maggio a settembre non si riscalda.
  function meseRef(d) { var m = d.getMonth() + 1; return m === 10 ? 11 : (INV.indexOf(m) >= 0 ? m : null); }
  function finestra(d) {
    var g = d.getDate(), ult = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), k = d.getFullYear() + '-' + (d.getMonth() + 1);
    return g <= 3 ? k + 'a' : g >= ult - 2 ? k + 'b' : null;
  }
  function dovuta(st, d) {
    if (meseRef(d) === null) return false;
    if (!st.ultimaVerifica) return true;
    if (d - new Date(st.ultimaVerifica) >= 30 * 864e5) return true;
    var f = finestra(d); return !!f && f !== st.finestra;
  }
  // Esegue la verifica se è il momento e salva il consiglio (o lo azzera). Ritorna lo stato aggiornato.
  function verifica(st, d, tmed, pr, forza) {
    if (!forza && !dovuta(st, d)) return st;
    var m = meseRef(d); if (m === null) return st;
    var t = tmed(m), k = costi(caloreMese(st, m, tmed), t, pr), v = verdetto(st.fonte, k);
    st.ultimaVerifica = d.toISOString(); st.finestra = finestra(d) || st.finestra;
    st.consiglio = v.cambia ? { verso: v.verso, mese: m, risparmio: Math.round(v.risparmio), data: st.ultimaVerifica } : null;
    return st;
  }
  // Prezzi da usare: bolletta caricata, poi prezzi scritti nel Setup, poi mercato domestico.
  function prezzi(st, mkt, d) {
    var B = root.BOLLETTA, bl = st.bollette || {}, o = { luce: 0, gas: 0, mL: null, mG: null, fonteL: 'mercato', fonteG: 'mercato' };
    [['luce', 'L', 0.297], ['gas', 'G', 1.339]].forEach(function (x) {
      var k = x[0], b = bl[k], a = B && b ? B.aggiornaIndice(b, mkt, d || new Date()) : null;
      if (a) { o[k] = a.prezzo; o['m' + x[1]] = a.marg; o['fonte' + x[1]] = 'bolletta'; }
      else if (st[k] > 0) { o[k] = st[k]; o['fonte' + x[1]] = 'setup'; }
      else o[k] = (mkt && mkt[k]) || x[2];
    });
    return o;
  }
  function haBollette(st) { var b = st.bollette || {}; return !!(b.luce || b.gas); }
  function mercato() { return fetch('data/mercato.json?v=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).catch(function () { return null; }); }

  // Budget del mese: stima con la fonte in uso a confronto con la cifra scelta. Ogni grado in meno vale circa il 7 % (ENEA: dal 5 al 10 %).
  function budgetInfo(st, d, tmed, pr) {
    var b = +st.budget; if (!(b > 0)) return null;
    var m = meseRef(d); if (m === null) return { budget: b, fuori: true };
    var k = costi(caloreMese(st, m, tmed), tmed(m), pr), costo = k[st.fonte], alt = st.fonte === 'gas' ? 'elettrica' : 'gas';
    var r = { budget: b, mese: m, costo: costo, pct: costo / b, sfora: costo > b, gradi: 0, alt: alt, altCosto: k[alt] };
    if (r.sfora) { var g = Math.ceil((1 - b / costo) / P.gradoPct - 1e-9); r.gradi = g; r.basta = g <= 3; }
    return r;
  }
  // Report del mese concluso: stima con la fonte usata, confronto con l'altra fonte e con il budget.
  function report(st, d, tmed, pr) {
    var p = new Date(d.getFullYear(), d.getMonth() - 1, 15), m = p.getMonth() + 1; if (INV.indexOf(m) < 0) return null;
    var key = chiaveMese(p), h = st.storico || {}, usata = h[key];
    if (!usata) { var prima = Object.keys(h).sort().filter(function (x) { return x < key; }).pop(); usata = prima ? h[prima] : null; }
    if (!usata) return null;
    var k = costi(caloreMese(st, m, tmed), tmed(m), pr), alt = usata === 'gas' ? 'elettrica' : 'gas';
    return { id: key, mese: m, anno: p.getFullYear(), fonte: usata, costo: k[usata], altro: k[alt], alt: alt, risparmio: k[alt] - k[usata], budget: +st.budget > 0 ? +st.budget : null };
  }
  // Dati di mercato più vecchi di 35 giorni: vanno aggiornati.
  function vecchio(mkt, d) { if (!mkt || !mkt.aggiornato) return false; var t = Date.parse(mkt.aggiornato); return isFinite(t) && (d - t) > 35 * 864e5; }

  function etichetta(f) { return f === 'gas' ? { sym: 'G', nome: 'Gas metano', icon: 'flame' } : { sym: 'E', nome: 'Elettrica', icon: 'bolt' }; }
  function tmedDa(S, C, now) {
    var l = C && C.luogo(), stat = l && C.statCache ? C.statCache(l, now) : null;
    return function (m) { return stat && stat[m] ? stat[m].mean : S.MESI[m].media; };
  }
  // Verifica periodica (ogni 30 giorni, a inizio e a fine mese). Ritorna lo stato aggiornato.
  function controlla(S, C, now, forza) {
    return mercato().then(function (mkt) {
      var st = load(); st = verifica(st, now, tmedDa(S, C, now), prezzi(st, mkt), forza); save(st); return st;
    });
  }
  // Messaggio di consiglio, mostrato in cima alle pagine. done() viene chiamata dopo una scelta.
  function banner(el, S, C, U, done) {
    if (!el) return;
    controlla(S, C, new Date()).then(function (st) {
      var c = st.consiglio; if (!c) { el.style.display = 'none'; el.innerHTML = ''; return; }
      var a = etichetta(c.verso), b = etichetta(st.fonte);
      el.style.display = ''; el.className = 'card';
      el.innerHTML = '<b>' + U.I(a.icon) + ' Conviene passare a ' + a.nome + '</b><p class="sm">Per ' + S.MESI[c.mese].nome.toLowerCase() + ' con ' + a.nome.toLowerCase() + ' risparmi circa ' + c.risparmio + ' € al mese rispetto a ' + b.nome.toLowerCase() + '.</p>' +
        '<div class="rw"><button type="button" class="btn sm2" data-ec="passa">Passa a ' + a.nome + '</button><button type="button" class="btn sm2 sec2" data-ec="dopo">Più tardi</button></div>';
      el.onclick = function (e) {
        var x = e.target.closest('button'); if (!x || !x.hasAttribute('data-ec')) return;
        var s2 = load(); if (x.getAttribute('data-ec') === 'passa') s2.fonte = c.verso; s2.consiglio = null; save(s2); if (done) done(); else banner(el, S, C, U);
      };
    });
  }

  root.ENERGIA = { etichetta: etichetta, tmedDa: tmedDa, controlla: controlla, banner: banner, P: P, INV: INV, load: load, save: save, ok: ok, controllo: controllo, descrivi: descrivi, classe: classe, caloreAnno: caloreAnno, caloreMese: caloreMese, cop: cop, costi: costi,
    verdetto: verdetto, registra: registra, chiaveMese: chiaveMese, budgetInfo: budgetInfo, report: report, vecchio: vecchio, meseRef: meseRef, finestra: finestra, dovuta: dovuta, verifica: verifica, prezzi: prezzi, haBollette: haBollette, mercato: mercato };
  if (typeof module !== 'undefined') module.exports = root.ENERGIA;
})(typeof window !== 'undefined' ? window : globalThis);
