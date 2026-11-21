(function () {
  // Pagina Energia: bollette di riferimento (facoltative). Lettura del PDF sul telefono, conferma dei dati, revisione dopo 6 mesi di assenza.
  var E = window.ENERGIA, B = window.BOLLETTA, U = window.UI;
  var stato = { attesa: null, lettura: false, chiedi: null, tipoFile: null };
  var NOMI = { luce: 'Luce', gas: 'Gas' };
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function it(x, d) { return (+x).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function gg(s) { if (!s) return ''; var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function v(x) { return x == null ? '' : x; }

  function riga(st, k) {
    var b = st.bollette[k], p = B.prezzo(b), u = B.U[k];
    var h = '<li style="display:block"><span style="display:flex;justify-content:space-between;gap:8px"><strong>' + NOMI[k] + '</strong><span class="deg tn">' + (p ? it(p.prezzo, k === 'gas' ? 3 : 4) + ' €/' + u : '') + '</span></span>';
    h += '<span class="wh" style="display:block">' + (b.fornitore ? '<b translate="no">' + esc(b.fornitore) + '</b> · ' : '') + (b.dal && b.al ? '<span>dal ' + gg(b.dal) + ' al ' + gg(b.al) + '</span> · ' : '') + '<span translate="no">' + it(b.consumo, 0) + ' ' + u + '</span> · <span>' + (b.indicizzata ? 'offerta indicizzata' : 'offerta a prezzo fisso') + '</span>' + (b.indicizzata && b.spread != null ? ' <span translate="no">(' + (b.indice || (k === 'gas' ? 'PSV' : 'PUN')) + ' + ' + it(b.spread, 4) + ')</span>' : '') + '</span>';
    if (stato.chiedi === k) h += '<span class="rw" style="display:flex"><button type="button" class="btn sm2 del" data-b="eliminaok" data-k="' + k + '">Elimina</button><button type="button" class="btn sm2 sec2" data-b="annulla">Annulla</button></span>';
    else h += '<span class="rw" style="display:flex"><button type="button" class="btn sm2 sec2" data-b="carica" data-k="' + k + '">Sostituisci</button><button type="button" class="btn sm2 sec2" data-b="elimina" data-k="' + k + '">Elimina</button></span>';
    return h + '</li>';
  }
  function revisione(st) {
    if (!st.revisione || !E.haBollette(st)) return '';
    var h = '<section class="card hl" id="brev"><b>Bollette di riferimento</b><p class="sm">Non aprivi l’app da almeno 6 mesi. Per i confronti uso ancora queste bollette e il contratto che indicano:</p><ul class="lst">';
    ['luce', 'gas'].forEach(function (k) { var b = st.bollette[k]; if (b) h += '<li><span><strong>' + NOMI[k] + '</strong><span class="wh">' + (b.fornitore ? '<b translate="no">' + esc(b.fornitore) + '</b> · ' : '') + (b.al ? '<span>fino al ' + gg(b.al) + '</span>' : '') + '</span></span></li>'; });
    h += '</ul><p class="sm">Il contratto è ancora questo?</p>';
    if (stato.chiedi === 'tutte') h += '<div class="rw"><button type="button" class="btn sm2 del" data-b="eliminaok" data-k="tutte">Elimina tutte</button><button type="button" class="btn sm2 sec2" data-b="annulla">Annulla</button></div>';
    else h += '<div class="rw"><button type="button" class="btn sm2" data-b="conferma">Confermo</button><a class="btn sm2 sec2" href="#bollette">Sostituisci</a><button type="button" class="btn sm2 sec2" data-b="elimina" data-k="tutte">Elimina</button></div>';
    return h + '</section>';
  }
  function modulo() {
    var a = stato.attesa, f = a.campi, u = B.U[a.tipo], h = '<section class="card" id="bform"><b>Controlla i dati della bolletta ' + (a.tipo === 'gas' ? 'gas' : 'luce') + '</b>';
    if (a.avvisi.indexOf('errore') >= 0) h += '<p class="ovr">Non riesco ad aprire il PDF (forse è protetto da password). Inserisci i dati a mano.</p>';
    else if (a.avvisi.indexOf('scansione') >= 0) h += '<p class="ovr">Il PDF è una scansione senza testo. Inserisci i dati a mano.</p>';
    else if (a.avvisi.indexOf('vuoto') >= 0) h += '<p class="ovr">Non ho trovato i dati principali. Completa i campi qui sotto.</p>';
    else h += '<p class="sm">Ho letto questi valori: correggili se serve, poi salva.</p>';
    if (a.avvisi.indexOf('tipo') >= 0) h += '<p class="ovr">Sembra una bolletta ' + (a.tipo === 'gas' ? 'luce' : 'gas') + ': controlla di aver scelto il file giusto.</p>';
    if (a.avvisi.indexOf('conguaglio') >= 0) h += '<p class="ovr">La bolletta contiene un conguaglio: il prezzo medio può risultare falsato. Se puoi, usa una bolletta senza conguaglio.</p>';
    h += '<label class="fld" for="bf-forn">Fornitore</label><input class="in" id="bf-forn" type="text" autocomplete="off" value="' + esc(f.fornitore || '') + '">' +
      '<label class="fld" for="bf-dal">Periodo dal</label><input class="in" id="bf-dal" type="date" value="' + v(f.dal) + '">' +
      '<label class="fld" for="bf-al">al</label><input class="in" id="bf-al" type="date" value="' + v(f.al) + '">' +
      '<label class="fld" for="bf-cons">Consumo del periodo (' + u + ')</label><input class="in" id="bf-cons" type="number" inputmode="decimal" min="0" value="' + v(f.consumo) + '">' +
      '<label class="fld" for="bf-tot">Totale della bolletta (€)</label><input class="in" id="bf-tot" type="number" inputmode="decimal" min="0" step="0.01" value="' + v(f.totale) + '">' +
      '<label class="fld" for="bf-qf">Quota fissa del fornitore (€/mese, facoltativa)</label><input class="in" id="bf-qf" type="number" inputmode="decimal" min="0" step="0.01" value="' + v(f.quotaFissa) + '">' +
      '<div class="fld">Tipo di offerta</div><div class="seg" role="group" aria-label="Tipo di offerta"><button type="button" data-b="off" data-v="fisso" aria-pressed="' + !f.indicizzata + '">Prezzo fisso</button><button type="button" data-b="off" data-v="indicizzata" aria-pressed="' + !!f.indicizzata + '">Indicizzata</button></div>' +
      (f.indicizzata ? '<label class="fld" for="bf-sp">Spread sull’indice ' + (a.tipo === 'gas' ? 'PSV (€/Smc)' : 'PUN (€/kWh)') + '</label><input class="in" id="bf-sp" type="number" inputmode="decimal" min="0" step="0.0001" value="' + v(f.spread) + '">' : '') +
      '<p class="result" id="bf-pr"></p><p class="err" id="bf-err" hidden></p>' +
      '<div class="rw"><button type="button" class="btn sm2" data-b="salva">Salva bolletta</button><button type="button" class="btn sm2 sec2" data-b="scarta">Annulla</button></div>' +
      '<p class="hint">Il PDF non viene caricato da nessuna parte: restano sul telefono solo questi numeri, protetti come gli altri tuoi dati.</p></section>';
    return h;
  }
  function html(st) {
    var h = '<h2 id="bollette">Bollette di riferimento</h2>';
    if (stato.lettura) return h + '<section class="card"><p class="sm">Leggo la bolletta…</p></section>';
    if (stato.attesa) return h + modulo();
    h += '<section class="card">';
    if (!E.haBollette(st)) h += '<p class="sm">Facoltativo ma consigliato: carica l’ultima bolletta in PDF. I confronti useranno i tuoi prezzi reali, con quote fisse e indicizzazione.</p>';
    else h += '<ul class="lst">' + ['luce', 'gas'].filter(function (k) { return st.bollette[k]; }).map(function (k) { return riga(st, k); }).join('') + '</ul><p class="hint">I calcoli usano queste bollette al posto dei prezzi di mercato.</p>';
    var mancano = ['luce', 'gas'].filter(function (k) { return !st.bollette[k]; });
    if (mancano.length) h += '<div class="rw">' + mancano.map(function (k) { return '<button type="button" class="btn sm2' + (E.haBollette(st) ? ' sec2' : '') + '" data-b="carica" data-k="' + k + '">Carica bolletta ' + (k === 'gas' ? 'gas' : 'luce') + '</button>'; }).join('') + '</div>';
    return h + '<input type="file" id="bfile" accept="application/pdf,.pdf" hidden></section>';
  }
  function leggiForm() {
    var f = stato.attesa.campi, g = function (id) { var x = document.getElementById(id); return x ? x.value : null; }, n = function (id) { var t = g(id); if (t === null || t === '') return null; var x = +String(t).replace(',', '.'); return isFinite(x) ? x : null; };
    f.fornitore = (g('bf-forn') || '').trim().slice(0, 60) || null; f.dal = g('bf-dal') || null; f.al = g('bf-al') || null;
    f.consumo = n('bf-cons'); f.totale = n('bf-tot'); f.quotaFissa = n('bf-qf'); if (f.indicizzata) f.spread = n('bf-sp');
    f.giorni = f.dal && f.al && f.al > f.dal ? Math.round((Date.parse(f.al) - Date.parse(f.dal)) / 864e5) + 1 : null;
    return f;
  }
  function anteprima() {
    var el = document.getElementById('bf-pr'); if (!el || !stato.attesa) return;
    var p = B.prezzo(leggiForm()); el.textContent = p ? 'Prezzo medio tutto compreso: ' + it(p.prezzo, stato.attesa.tipo === 'gas' ? 3 : 4) + ' €/' + B.U[stato.attesa.tipo] : '';
  }
  function file(f, k, rr) {
    stato.lettura = true; rr();
    var vuoto = { campi: B.leggi('', k).campi, avvisi: [] };
    B.testoPdf(f).then(function (t) {
      if (String(t).replace(/\s/g, '').length < 50) { vuoto.avvisi.push('scansione'); return vuoto; }
      var r = B.leggi(t, k), ty = B.tipoDa(t); if (ty && ty !== k && !(/\bPOD\b/i.test(t) && /\bPDR\b/i.test(t))) r.avvisi.push('tipo');
      if (!r.campi.consumo && !r.campi.totale) r.avvisi.push('vuoto'); return r;
    }).catch(function () { vuoto.avvisi.push('errore'); return vuoto; }).then(function (r) {
      stato.lettura = false; stato.attesa = { tipo: k, campi: r.campi, avvisi: r.avvisi }; rr();
      var fm = document.getElementById('bform'); if (fm && fm.scrollIntoView) fm.scrollIntoView({ block: 'start' });
    });
  }
  function click(b, rr) {
    var a = b.getAttribute('data-b'); if (!a) return false;
    var k = b.getAttribute('data-k'), st;
    if (a === 'carica') { stato.tipoFile = k; var inp = document.getElementById('bfile'); if (inp) { inp.value = ''; inp.click(); } }
    else if (a === 'elimina') { stato.chiedi = k; rr(); }
    else if (a === 'annulla') { stato.chiedi = null; rr(); }
    else if (a === 'eliminaok') { st = E.load(); if (k === 'tutte') st.bollette = {}; else delete st.bollette[k]; st.revisione = false; E.save(st); stato.chiedi = null; rr(); }
    else if (a === 'conferma') { st = E.load(); var ora = new Date().toISOString(); Object.keys(st.bollette).forEach(function (x) { st.bollette[x].confermata = ora; }); st.revisione = false; E.save(st); rr(); }
    else if (a === 'off') { leggiForm(); stato.attesa.campi.indicizzata = b.getAttribute('data-v') === 'indicizzata'; rr(); }
    else if (a === 'scarta') { stato.attesa = null; rr(); }
    else if (a === 'salva') {
      var f = leggiForm(), p = B.prezzo(f), err = document.getElementById('bf-err'), r = B.RANGE[stato.attesa.tipo], msg = null;
      if (!(f.consumo > 0) || !(f.totale > 0)) msg = 'Servono consumo e totale della bolletta.';
      else if (!p.plausibile) msg = 'Il prezzo risulta ' + it(p.prezzo, 3) + ' €/' + B.U[stato.attesa.tipo] + ', fuori dal normale (da ' + it(r[0], 2) + ' a ' + it(r[1], 2) + '): controlla consumo e totale.';
      if (msg) { err.textContent = msg; err.hidden = false; return true; }
      st = E.load(); f.caricata = new Date().toISOString(); f.confermata = f.caricata; st.bollette[stato.attesa.tipo] = f; st.revisione = false; E.save(st);
      stato.attesa = null; rr();
    } else return false;
    return true;
  }
  function attiva(app, rr) {
    app.addEventListener('change', function (e) { if (e.target.id === 'bfile' && e.target.files && e.target.files[0]) file(e.target.files[0], stato.tipoFile || 'luce', rr); });
    app.addEventListener('input', function (e) { if (e.target.id && e.target.id.indexOf('bf-') === 0) anteprima(); });
  }
  window.BOLLUI = { html: html, revisione: revisione, click: click, attiva: attiva, anteprima: anteprima, _stato: stato };
})();
