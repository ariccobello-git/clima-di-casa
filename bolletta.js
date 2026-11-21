(function (root) {
  // Lettura delle bollette luce e gas (PDF). Il file resta sul telefono: si salvano solo i numeri confermati dall'utente.
  var U = { luce: 'kWh', gas: 'Smc' };
  var RANGE = { luce: [0.08, 1.5], gas: [0.3, 4] };
  var IVA = 1.1;
  var FORNITORI = ['Servizio Elettrico Nazionale', 'Enel Energia', 'Enel', 'Eni Plenitude', 'Plenitude', 'Edison', 'A2A', 'Hera', 'Iren', 'Acea', 'Sorgenia', 'Engie', 'Illumia', 'Octopus', 'Iberdrola', 'E.ON', 'Axpo', 'Wekiwi', 'Pulsee', 'NeN', 'Duferco', 'Lene', 'Metamer', 'Tate', 'Fastweb', 'Iliad', 'Estra', 'Dolomiti Energia', 'Alperia', 'AGSM AIM', 'Bluenergy', 'Optima', 'Argos', 'Green Network', 'Sinergas', 'Egea'];

  function num(s) { if (s == null) return null; s = String(s).replace(/\s/g, ''); if (/,\d+$/.test(s) || /\.\d{3}(,|$)/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); var n = parseFloat(s); return isFinite(n) ? n : null; }
  function norma(t) { return String(t || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/€/g, ' € ').replace(/[ \t]+/g, ' '); }
  function data(s) { var m = /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/.exec(s || ''); if (!m) return null; var y = +m[3]; if (y < 100) y += 2000; var d = new Date(y, +m[2] - 1, +m[1]); return isNaN(d) ? null : d; }
  function iso(d) { return d ? d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) : null; }
  var NUM = '(\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?|\\d+(?:,\\d+)?)';

  function primo(t, res) { for (var i = 0; i < res.length; i++) { var m = res[i].exec(t); if (m) return m; } return null; }
  function tipoDa(t) {
    var l = (t.match(/kWh/gi) || []).length + (/\bPOD\b/i.test(t) ? 5 : 0), g = (t.match(/\bS?mc\b|Smc|Sm3/gi) || []).length + (/\bPDR\b/i.test(t) ? 5 : 0);
    return l === 0 && g === 0 ? null : l >= g ? 'luce' : 'gas';
  }
  function leggi(testo, tipo) {
    var t = norma(testo), u = tipo === 'gas' ? '(?:Smc|smc|Sm3|SMC|mc)' : '(?:kWh|KWh|kwh)', w = [];
    var f = { tipo: tipo, fornitore: null, dal: null, al: null, giorni: null, consumo: null, totale: null, materia: null, indicizzata: false, indice: null, spread: null, prezzoMateria: null, quotaFissa: null };
    for (var i = 0; i < FORNITORI.length; i++) if (new RegExp('\\b' + FORNITORI[i].replace('.', '\\.') + '\\b', 'i').test(t)) { f.fornitore = FORNITORI[i]; break; }
    var p = primo(t, [/(?:periodo|fornitura|consumi)[^\n]{0,40}?dal\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\s*(?:al|a|-|–)\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i, /dal\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\s*al\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i, /(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})\s*[-–]\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/]);
    if (p) { var a = data(p[1]), b = data(p[2]); if (a && b && b > a) { f.dal = iso(a); f.al = iso(b); f.giorni = Math.round((b - a) / 864e5) + 1; } }
    var c = primo(t, [new RegExp('consum\\w*\\s+(?:fatturat\\w*|totale|totali|effettiv\\w*|del periodo|rilevat\\w*|reale|reali)[^\\d\\n]{0,40}?' + NUM + '\\s*' + u, 'i'), new RegExp('totale\\s+consum\\w*[^\\d\\n]{0,40}?' + NUM + '\\s*' + u, 'i'), new RegExp('consum\\w*[^\\d\\n]{0,40}?' + NUM + '\\s*' + u, 'i')]);
    if (c) f.consumo = num(c[1]);
    var tt = primo(t, [new RegExp('(?:totale|importo)\\s+(?:da\\s+pagare|bolletta|fattura|documento|da\\s+versare)[^\\d\\n]{0,30}?(?:€\\s*)?' + NUM + '\\s*€?', 'i'), new RegExp('da\\s+pagare[^\\d\\n]{0,30}?(?:€\\s*)?' + NUM, 'i')]);
    if (tt) f.totale = num(tt[1]);
    var mt = primo(t, [new RegExp('spesa\\s+per\\s+(?:la\\s+)?materia\\s+(?:energia|gas\\s+naturale|gas|prima)?[^\\d\\n]{0,30}?(?:€\\s*)?' + NUM, 'i')]);
    if (mt) f.materia = num(mt[1]);
    var ix = /\b(PUN|PSV)\b/i.exec(t); f.indicizzata = !!ix || /indicizzat|variabile/i.test(t) && !/prezzo\s+fisso|bloccat/i.test(t);
    if (ix) f.indice = ix[1].toUpperCase();
    var sp = primo(t, [/\b(?:PUN|PSV)\b[^\n\d]{0,20}\+\s*(?:€\s*)?(\d+,\d+)/i, /spread[^\d\n]{0,30}?(\d+,\d+)/i]);
    if (sp) f.spread = num(sp[1]);
    var pm = primo(t, [new RegExp('(?:prezzo|componente\\s+energia|corrispettivo)[^\\n]{0,60}?(\\d+,\\d{3,6})\\s*€?\\s*\\/\\s*' + u, 'i')]);
    if (pm) f.prezzoMateria = num(pm[1]);
    if (f.indicizzata && f.prezzoMateria === f.spread) f.prezzoMateria = null;
    var qf = primo(t, [/quota\s+fissa[^\n]{0,40}?(\d+,\d+)\s*€?\s*\/\s*mese/i, /quota\s+fissa[^\n]{0,40}?(\d+,\d+)\s*€\s*al\s*mese/i]);
    if (qf) f.quotaFissa = num(qf[1]);
    if (/conguagli|ricalcol|rimborso/i.test(t)) w.push('conguaglio');
    return { campi: f, avvisi: w };
  }
  // Prezzo medio tutto compreso della bolletta e quota che cresce con i consumi.
  function prezzo(f) {
    if (!(f && f.consumo > 0 && f.totale > 0)) return null;
    var pr = f.totale / f.consumo, mesi = f.giorni ? f.giorni / 30.4 : null, marg = null;
    if (f.quotaFissa > 0 && mesi) marg = Math.max(0.6, Math.min(0.98, 1 - f.quotaFissa * mesi * IVA / f.totale));
    var r = RANGE[f.tipo] || [0, 99];
    return { prezzo: pr, marg: marg, plausibile: pr >= r[0] && pr <= r[1] };
  }
  // Offerta indicizzata: sposta il prezzo della bolletta di quanto è cambiato l'indice (PUN o PSV), IVA inclusa, se i due mesi sono noti.
  function aggiornaIndice(b, mkt, d) {
    var p = prezzo(b); if (!p) return null;
    var out = { prezzo: p.prezzo, marg: p.marg, adeguato: false };
    if (!b.indicizzata || !mkt || !mkt.indici || !b.al) return out;
    var k = b.tipo === 'gas' ? 'psv' : 'pun', kb = b.al.slice(0, 7), kn = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
    var ib = mkt.indici[kb], keys = Object.keys(mkt.indici).filter(function (x) { return x <= kn; }).sort(), inow = keys.length ? mkt.indici[keys[keys.length - 1]] : null;
    if (!ib || !inow || !(ib[k] > 0) || !(inow[k] > 0)) return out;
    out.prezzo = Math.max(0.01, p.prezzo + (inow[k] - ib[k]) * IVA); out.adeguato = keys[keys.length - 1] !== kb; return out;
  }
  // Testo di un PDF (pdf.js, caricato solo quando serve). Le righe si ricostruiscono dalla posizione verticale.
  function testoPdf(file) {
    var base = new URL('vendor/pdfjs/', root.location.href).href;
    return import(base + 'pdf.min.mjs').then(function (pdfjs) {
      pdfjs.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.mjs';
      return file.arrayBuffer().then(function (buf) { return pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise; });
    }).then(function (doc) {
      var n = Math.min(doc.numPages, 8), ps = [];
      for (var i = 1; i <= n; i++) ps.push(doc.getPage(i).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
        var righe = [], y = null, cur = [];
        tc.items.forEach(function (it) { var yy = Math.round(it.transform[5]); if (y !== null && Math.abs(yy - y) > 2) { righe.push(cur.join(' ')); cur = []; } y = yy; if (it.str) cur.push(it.str); });
        righe.push(cur.join(' ')); return righe.join('\n');
      }));
      return Promise.all(ps).then(function (a) { return a.join('\n'); });
    });
  }
  root.BOLLETTA = { U: U, num: num, leggi: leggi, tipoDa: tipoDa, prezzo: prezzo, aggiornaIndice: aggiornaIndice, testoPdf: testoPdf, RANGE: RANGE };
  if (typeof module !== 'undefined') module.exports = root.BOLLETTA;
})(typeof window !== 'undefined' ? window : globalThis);
