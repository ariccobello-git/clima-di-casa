(function (root) {
  // Lingue: italiano (testo originale), inglese, francese. Il testo dell'app resta in italiano nel codice;
  // qui lo si traduce a video con un dizionario. Numeri e mesi sono "segnaposto", così le frasi con valori variabili si traducono comunque.
  var LS = 'clima.lang', LINGUE = ['it', 'en', 'fr'];
  var MESI = {
    it: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  };
  var GIORNI = {
    it: ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  };
  var LOC = { it: 'it-IT', en: 'en-GB', fr: 'fr-FR' };
  function ls() { try { return root.localStorage; } catch (e) { return null; } }
  function scelta() {
    try { var s = ls().getItem(LS); if (LINGUE.indexOf(s) >= 0) return s; } catch (e) {}
    var n = ((root.navigator && (navigator.language || '')) || '').slice(0, 2).toLowerCase();
    return LINGUE.indexOf(n) >= 0 ? n : 'it';
  }
  var L = scelta(), usata = false, D = {}, mancanti = {}, orig = new WeakMap(), attrOrig = new WeakMap(), titoloIt = null, busy = false, timer = null;

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  var RE_MESE = new RegExp('\\b(' + MESI.it.join('|') + ')\\b', 'gi');
  var RE_GIORNO = new RegExp('\\b(' + GIORNI.it.join('|') + ')\\b', 'gi');
  var RE_NUM = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g;

  function numOut(s, lang) {
    if (lang === 'it') return s;
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return lang === 'en' ? s.replace(/\./g, ',').replace(/,(\d+)$/, '.$1') : s.replace(/\./g, ' ').replace(/,(\d+)$/, ',$1');
    if (/^\d+,\d+$/.test(s)) return lang === 'en' ? s.replace(',', '.') : s;
    return s;
  }
  // Testo -> chiave (numeri = #, mesi = {M}, giorni = {W}) e valori trovati, nell'ordine.
  function chiave(t) {
    var nums = [], mesi = [], gg = [];
    var k = t.replace(RE_MESE, function (m) { mesi.push(m); return '\u0001'; }).replace(RE_GIORNO, function (m) { gg.push(m); return '\u0002'; });
    k = k.replace(RE_NUM, function (m) { nums.push(m); return '#'; });
    k = k.replace(/\u0001/g, '{M}').replace(/\u0002/g, '{W}');
    return { k: k, nums: nums, mesi: mesi, gg: gg };
  }
  function riempi(tpl, c, lang) {
    var i = 0, m = 0, g = 0;
    return tpl.replace(/#|\{M\}|\{W\}/g, function (x) {
      if (x === '#') return c.nums[i] !== undefined ? numOut(c.nums[i++], lang) : '#';
      if (x === '{M}') { var o = c.mesi[m++] || ''; var idx = MESI.it.indexOf(o.toLowerCase()); var t = idx >= 0 ? MESI[lang][idx] : o; return lang === 'en' || o.charAt(0) !== o.charAt(0).toLowerCase() ? cap(t) : t; }
      var o2 = c.gg[g++] || ''; var j = GIORNI.it.indexOf(o2.toLowerCase()); var t2 = j >= 0 ? GIORNI[lang][j] : o2;
      return lang === 'en' || o2.charAt(0) !== o2.charAt(0).toLowerCase() ? cap(t2) : t2;
    });
  }
  function tr(testo, lang) {
    lang = lang || L; if (lang === 'it' || !testo) return testo;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(testo), core = m[2]; if (!core) return testo;
    var r = una(core, lang);
    if (r === null) {
      // frasi separate: ogni frase si traduce da sola, le altre restano come sono
      var parti = core.replace(/([.!?])\s+/g, '$1\u0001').split('\u0001');
      if (parti.length > 1) {
        var ok = false, out = parti.map(function (p) { var x = una(p, lang); if (x === null) { var cc = chiave(p); if (/[A-Za-zÀ-ÿ]{3}/.test(cc.k)) mancanti[cc.k] = 1; return p; } ok = true; return x; });
        if (ok) return m[1] + out.join(' ') + m[3];
        return testo;
      }
      var c = chiave(core);
      if (c.k.replace(/\{[MW]\}|#|[\s\W]/g, '') === '') return riempi(c.k, c, lang) === c.k ? testo : m[1] + riempi(c.k, c, lang) + m[3];
      if (/[A-Za-zÀ-ÿ]{3}/.test(c.k)) mancanti[c.k] = 1;
      return testo;
    }
    return m[1] + r + m[3];
  }
  var PAT = [];
  function pat(re, en, fr) { PAT.push({ re: new RegExp(re), en: en, fr: fr }); }
  function applicaPat(core, lang) {
    for (var i = 0; i < PAT.length; i++) {
      var m = PAT[i].re.exec(core); if (!m) continue;
      return (lang === 'en' ? PAT[i].en : PAT[i].fr).replace(/\$(\d)/g, function (x, n) { return tr(m[+n] || '', lang); });
    }
    return null;
  }
  function una(core, lang) {
    var c = chiave(core), e = D[c.k];
    if (e) { var v = e[lang === 'en' ? 0 : 1]; if (v !== undefined && v !== null) return riempi(v, c, lang); }
    return applicaPat(core, lang);
  }
  var ATTR = ['placeholder', 'aria-label', 'title', 'alt'];
  function nodo(n) {
    if (n.nodeType === 3) {
      var p = n.parentNode && n.parentNode.nodeName; if (p === 'SCRIPT' || p === 'STYLE' || p === 'TEXTAREA') return;
      var o = orig.get(n);
      if (o && n.data === o.out) { var nuovo = tr(o.it); if (nuovo !== o.out) { o.out = nuovo; n.data = nuovo; } return; }
      var it = n.data; if (!it.trim()) return;
      var out = tr(it); orig.set(n, { it: it, out: out }); if (out !== it) n.data = out;
    } else if (n.nodeType === 1) {
      if (n.nodeName === 'SCRIPT' || n.nodeName === 'STYLE') return;
      ATTR.forEach(function (a) {
        if (!n.hasAttribute(a)) return; var v = n.getAttribute(a), rec = attrOrig.get(n) || {};
        if (rec[a] && rec[a].out === v) { var x = tr(rec[a].it); if (x !== v) { rec[a].out = x; n.setAttribute(a, x); } return; }
        var y = tr(v); rec[a] = { it: v, out: y }; attrOrig.set(n, rec); if (y !== v) n.setAttribute(a, y);
      });
      for (var c = n.firstChild; c; c = c.nextSibling) nodo(c);
    }
  }
  function titolo() {
    if (titoloIt === null || document.title !== titoloIt.out) titoloIt = { it: document.title, out: document.title };
    var x = tr(titoloIt.it); if (x !== document.title) { document.title = x; titoloIt.out = x; }
  }
  function tutto() {
    if (busy || !document.body) return; busy = true;
    try { document.documentElement.setAttribute('lang', L); nodo(document.body); titolo(); } finally { busy = false; }
  }
  function pianifica() { if (L === 'it' && !usata) return; clearTimeout(timer); timer = setTimeout(tutto, 0); }
  function avvia() {
    if (L !== 'it') usata = true;
    tutto();
    try { new MutationObserver(function () { if (!busy) pianifica(); }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR }); } catch (e) {}
  }
  function imposta(l) {
    if (LINGUE.indexOf(l) < 0) return; try { sessionStorage.setItem('clima.sy', String(Math.round(window.scrollY || 0))); } catch (e) {} L = l; if (l !== 'it') usata = true; try { ls().setItem(LS, l); } catch (e) {}
    tutto();
    try { root.dispatchEvent(new Event('lingua')); } catch (e) {}
  }
  function aggiungi(obj) { for (var k in obj) D[k] = obj[k]; }
  root.I18N = { lingua: function () { return L; }, imposta: imposta, LINGUE: LINGUE, tr: tr, aggiungi: aggiungi, pat: pat, loc: function () { return LOC[L]; }, mancanti: function () { return Object.keys(mancanti); }, azzera: function () { mancanti = {}; }, dati: D, mesi: MESI, giorni: GIORNI };
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', L);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
  }
  // Dopo il cambio lingua la pagina si ricarica: rimetto lo scroll dov'era, senza salti.
  (function () {
    var y = null; try { y = sessionStorage.getItem('clima.sy'); sessionStorage.removeItem('clima.sy'); if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
    if (y === null) return; y = +y; var fermo = false;
    ['touchstart', 'wheel', 'keydown'].forEach(function (ev) { window.addEventListener(ev, function () { fermo = true; }, { passive: true, once: true }); });
    function vai() { if (!fermo) window.scrollTo(0, y); }
    [0, 60, 150, 300, 600, 1000].forEach(function (t) { setTimeout(vai, t); }); document.addEventListener('DOMContentLoaded', vai); window.addEventListener('load', vai);
  })();
})(typeof window !== 'undefined' ? window : this);
