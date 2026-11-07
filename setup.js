(function () {
  var C = window.CLIMA, E = window.ENERGIA, U = window.UI, app = document.getElementById('app');
  var pend = null, msg = '', busy = false, mkt = null;
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function v(x) { return x === null || x === undefined ? '' : x; }
  var COL = { A: '#1e8449', B: '#52a447', C: '#9ab52b', D: '#d4a017', E: '#e6862a', F: '#d9531e', G: '#b8281e' };

  function esito(c) {
    var d = E.descrivi(c);
    if (!d) return E.controllo(c).map(function (x) { return '<p class="note2">' + esc(x) + '</p>'; }).join('') + '<p class="sm">Inserisci superficie e anno di costruzione per vedere la classe stimata.</p>';
    var w = E.controllo(c).map(function (x) { return '<p class="note2">' + esc(x) + '</p>'; }).join('');
    return w + '<div class="al" style="margin:10px 0 0"><div class="nw" style="color:' + COL[d.classe] + '">' + d.classe + '</div><div><b>Classe energetica stimata</b><small>Volume da scaldare circa ' + d.volume + ' m³ · fabbisogno circa ' + d.eph + ' kWh/m² all’anno · calore da produrre circa ' + Math.round(E.caloreAnno(c)).toLocaleString('it-IT') + ' kWh all’anno.</small></div></div>' +
      '<p class="hint">Stima statistica per epoca di costruzione, tipo di casa e ristrutturazioni. Fonte: banca dati nazionale degli attestati di prestazione energetica (ENEA-CTI, rapporto annuale) e tipologie TABULA/EPISCOPE. Non sostituisce un APE.</p>';
  }

  function render() {
    var st = C.load(), l = C.luogo(st), c = E.load(), h = '';
    h += '<div class="hd"><a class="back" href="index.html">' + U.I('back') + 'Stagioni</a></div><div><h1>Setup</h1><p>Indirizzo, casa e prezzi dell’energia.</p></div>';
    h += '<h2>Indirizzo</h2><section class="card">';
    if (l) h += '<div class="lu" style="margin:0 0 10px"><b>' + esc(l.nome) + '</b><small>' + (l.casa ? 'È casa tua: riferimento standard' : 'Sessione fuori casa') + '</small></div>';
    if (pend) h += '<p class="sm"><b>' + esc(pend.nome) + '</b></p><p>È casa tua?</p><div class="seg"><button type="button" data-casa="1">Sì, è casa</button><button type="button" data-casa="0">No, un altro luogo</button></div>';
    else h += '<input id="q" class="in" type="search" placeholder="Via, numero civico, città" autocomplete="street-address"><button class="btn" id="cerca" type="button"' + (busy ? ' disabled' : '') + '>Cerca indirizzo</button><button class="btn sec2" id="geo" type="button"' + (busy ? ' disabled' : '') + '>Usa la mia posizione</button>';
    if (msg) h += '<p class="sm" role="status">' + esc(msg) + '</p>';
    if (st.luoghi.length > 1) h += '<ul class="lst">' + st.luoghi.map(function (x) {
      return '<li><span><strong>' + esc(x.nome) + '</strong><span class="wh">' + (x.casa ? 'Casa' : 'Sessione') + (x.id === st.attivo ? ' · in uso' : '') + '</span></span><span><button type="button" class="chip" data-use="' + x.id + '"' + (x.id === st.attivo ? ' disabled' : '') + '>Usa</button> <button type="button" class="chip" data-del="' + x.id + '">Elimina</button></span></li>';
    }).join('') + '</ul>';
    h += '</section>';
    h += '<h2>La casa</h2><section class="card">' +
      '<label class="fld" for="mq">Superficie totale (m²)</label><input class="in" id="mq" type="number" inputmode="decimal" min="10" value="' + v(c.mq) + '">' +
      '<label class="fld">Tipo di abitazione</label><div class="seg" role="group"><button type="button" data-tipo="condominio" aria-pressed="' + (c.tipo === 'condominio') + '">Condominio</button><button type="button" data-tipo="villino" aria-pressed="' + (c.tipo === 'villino') + '">Villino</button></div>' +
      '<label class="fld" for="piani">Numero di piani</label><input class="in" id="piani" type="number" inputmode="numeric" min="1" max="30" value="' + v(c.piani) + '">' +
      '<label class="fld" for="anno">Anno di costruzione</label><input class="in" id="anno" type="number" inputmode="numeric" placeholder="per esempio 1985" value="' + v(c.anno) + '">' +
      '<label class="fld" for="ristr">Anno dell’ultima ristrutturazione (facoltativo)</label><input class="in" id="ristr" type="number" inputmode="numeric" placeholder="infissi, cappotto, caldaia" value="' + v(c.ristr) + '">' +
      '<label class="fld" for="gas">Gas del riscaldamento in un anno, in Smc (facoltativo)</label><input class="in" id="gas" type="number" inputmode="decimal" placeholder="lo trovi in bolletta" value="' + v(c.gasSmc) + '"><p class="hint">Smc sono i metri cubi di gas che trovi in bolletta. Se lo conosci, i calcoli partono dal tuo consumo reale. Conta solo il riscaldamento: se hai solo il totale annuo, togli circa 150 Smc per acqua calda e cucina.</p>' +
      '<p class="ok" id="sv" role="status"></p><div id="esito">' + esito(c) + '</div></section>';
    h += '<h2>Prezzi dell’energia</h2><section class="card"><p class="sm">Prezzi tutto compreso, imposte incluse. Lascia vuoto per usare quelli di mercato' + (mkt ? ' (aggiornati al ' + esc(mkt.aggiornato) + ': luce ' + mkt.luce.toLocaleString('it-IT') + ' €/kWh, gas ' + mkt.gas.toLocaleString('it-IT') + ' €/Smc)' : '') + '.</p>' +
      '<label class="fld" for="luce">Luce (€/kWh)</label><input class="in" id="luce" type="number" inputmode="decimal" step="0.0001" placeholder="per esempio 0,30" value="' + v(c.luce) + '">' +
      '<label class="fld" for="gasp">Gas (€/Smc)</label><input class="in" id="gasp" type="number" inputmode="decimal" step="0.001" placeholder="per esempio 1,34" value="' + v(c.gas) + '">' +
      '<a class="btn sec2" href="energia.html">Vedi il consiglio elettrico o gas</a></section>';
    app.innerHTML = h; U.applyHue(235); U.nav('home');
  }

  function leggi() {
    var c = E.load(), n = function (id) { var x = parseFloat(String(document.getElementById(id).value).replace(',', '.')); return isFinite(x) && x > 0 ? x : null; };
    c.mq = n('mq'); c.piani = n('piani') || 1; c.anno = n('anno'); c.ristr = n('ristr'); c.gasSmc = n('gas'); c.luce = n('luce'); c.gas = n('gasp');
    E.save(c); document.getElementById('esito').innerHTML = esito(c); var sv = document.getElementById('sv'); if (sv) { sv.textContent = 'Salvato \u2713'; }
  }
  app.addEventListener('input', function (e) { if (e.target.matches('input.in') && e.target.id !== 'q') leggi(); });
  function say(t) { msg = t; busy = false; render(); }
  function trovato(p) { pend = p; msg = ''; busy = false; render(); }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return; var st = C.load();
    if (b.hasAttribute('data-tipo')) { var c = E.load(); leggi(); c = E.load(); c.tipo = b.getAttribute('data-tipo'); E.save(c); render(); }
    else if (b.id === 'cerca') {
      var q = (document.getElementById('q').value || '').trim(); if (q.length < 2) return say('Scrivi un indirizzo o una città.');
      busy = true; msg = 'Cerco…'; render();
      C.cerca(q).then(function (p) { p ? trovato(p) : say('Indirizzo non trovato. Prova con la città.'); }).catch(function () { say('Ricerca non disponibile ora.'); });
    } else if (b.id === 'geo') {
      if (!navigator.geolocation) return say('Posizione non disponibile su questo dispositivo.');
      busy = true; msg = 'Rilevo la posizione…'; render();
      navigator.geolocation.getCurrentPosition(function (pos) { C.nomeDa(pos.coords.latitude, pos.coords.longitude).then(function (n) { trovato({ nome: n, lat: pos.coords.latitude, lon: pos.coords.longitude }); }); }, function () { say('Posizione negata. Scrivi l’indirizzo.'); }, { timeout: 15000, maximumAge: 600000 });
    } else if (b.hasAttribute('data-casa')) { var p = pend; pend = null; msg = ''; C.save(C.aggiungi(st, p, b.getAttribute('data-casa') === '1')); render(); }
    else if (b.hasAttribute('data-use')) { st.attivo = b.getAttribute('data-use'); C.save(st); render(); }
    else if (b.hasAttribute('data-del')) { C.save(C.rimuovi(st, b.getAttribute('data-del'))); render(); }
  });
  render(); E.mercato().then(function (m) { mkt = m; if (m) { var y = document.activeElement; if (!y || y === document.body) render(); } });
})();
