(function () {
  var S = window.SCHED, C = window.CLIMA, U = window.UI, app = document.getElementById('app');
  var pend = null, msg = '', busy = false, info = null, err = false;
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function seg(name, items, cur) { return '<div class="seg" role="group">' + items.map(function (i) { return '<button type="button" data-' + name + '="' + i[0] + '" aria-pressed="' + (i[0] === cur) + '">' + i[1] + '</button>'; }).join('') + '</div>'; }

  function tabella(st) {
    var rows = S.SEASONS.inverno.ordine.concat(S.SEASONS.estate.ordine).map(function (m) {
      var d = S.MESI[m], t = S.setPoint(m), diff = t === null || t !== d.t;
      return '<li><span><strong>' + d.nome + '</strong><span class="wh">Standard ' + d.t + ' °C' + (info && info.motivi[m] ? ' · ' + esc(info.motivi[m]) : '') + '</span></span><span class="deg ' + (t === null ? 'o' : 'tn') + '">' + (t === null ? 'Spento' : t + ' °C') + '</span></li>';
    });
    return '<ul class="lst">' + rows.join('') + '</ul>';
  }

  function render() {
    var st = C.load(), l = C.luogo(st), casa = C.casa(st), h = '';
    h += '<div class="hd"><a class="back" href="index.html">' + U.I('back') + 'Stagioni</a></div><div><h1>Meteo e luogo</h1><p>Scegli dove sei e come usare il meteo per affinare i set point.</p></div>';
    h += '<h2>Luogo</h2><section class="card">';
    if (l) h += '<div class="lu" style="margin:0 0 10px"><div><b>' + esc(l.nome) + '</b><small>' + (l.casa ? 'È casa tua: riferimento standard' : 'Sessione fuori casa' + (casa ? ' · casa resta ' + esc(casa.nome) : '')) + '</small></div></div>';
    if (pend) {
      h += '<p class="sm"><b>' + esc(pend.nome) + '</b></p><p>È casa tua?</p><div class="seg"><button type="button" data-casa="1">Sì, è casa</button><button type="button" data-casa="0">No, un altro luogo</button></div>';
    } else {
      h += '<input id="q" type="search" placeholder="Indirizzo o città" autocomplete="street-address" style="width:100%;min-height:46px;border-radius:14px;border:1px solid var(--fill);padding:0 14px;font:16px -apple-system,sans-serif;background:var(--solid);color:var(--tx)">' +
        '<button class="btn" id="cerca" type="button"' + (busy ? ' disabled' : '') + '>Cerca indirizzo</button><button class="btn sec2" id="geo" type="button"' + (busy ? ' disabled' : '') + '>Usa la mia posizione</button>';
    }
    if (msg) h += '<p class="sm" role="status">' + esc(msg) + '</p>';
    h += '</section>';
    if (st.luoghi.length) {
      h += '<h2>Luoghi salvati</h2><section class="card"><ul class="lst">' + st.luoghi.map(function (x) {
        return '<li><span><strong>' + esc(x.nome) + '</strong><span class="wh">' + (x.casa ? 'Casa' : 'Sessione') + (x.id === st.attivo ? ' · in uso' : '') + '</span></span><span><button type="button" class="chip" data-use="' + x.id + '"' + (x.id === st.attivo ? ' disabled' : '') + '>Usa</button> <button type="button" class="chip" data-del="' + x.id + '">Elimina</button></span></li>';
      }).join('') + '</ul>' + (casa && l && !l.casa ? '<button class="btn sec2" type="button" data-use="' + casa.id + '">Torna a casa</button>' : '') + '</section>';
    }
    h += '<h2>Dati meteo</h2><section class="card">' + seg('fonte', [['nessuno', 'Nessuno'], ['live', 'Live'], ['storico', 'Anno ' + C.annoScorso()]], st.fonte) +
      '<p class="sm">' + ({ nessuno: 'Solo i valori standard.', live: 'A ogni apertura legge le previsioni di oggi e ricalcola il mese in corso.', storico: 'Usa le medie consolidate del ' + C.annoScorso() + ' per ogni mese. Dall’anno nuovo passa da solo all’anno concluso.' }[st.fonte]) + '</p></section>';
    h += '<h2>Stile</h2><section class="card">' + seg('stile', Object.keys(C.STILI).map(function (k) { return [k, C.STILI[k].nome]; }), st.stile) + '<p class="sm">' + C.STILI[st.stile].d + '</p></section>';
    h += '<h2>Set point</h2><section class="card">' + (err ? '<p class="sm">Meteo non raggiungibile: valori standard con lo stile scelto.</p>' : '') + tabella(st) + '</section>';
    h += '<p class="sm" style="text-align:center">Dati meteo: <a href="https://open-meteo.com/">Open-Meteo.com</a> (CC BY 4.0). Indirizzi: © OpenStreetMap.</p>';
    app.innerHTML = h; U.applyHue(U.hueFor(8)); 
  }

  function ricalcola() { err = false; return C.applica(S).then(function (i) { info = i; }).catch(function () { err = true; info = null; }).then(render); }
  function fatto(p) { pend = p; msg = ''; busy = false; render(); }
  function fail(m) { msg = m; busy = false; render(); }

  app.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    var st = C.load();
    if (b.id === 'cerca') {
      var q = (document.getElementById('q').value || '').trim(); if (q.length < 2) return fail('Scrivi un indirizzo o una città.');
      busy = true; msg = 'Cerco…'; render();
      C.cerca(q).then(function (p) { p ? fatto(p) : fail('Indirizzo non trovato. Prova con la città.'); }).catch(function () { fail('Ricerca non disponibile ora.'); });
    } else if (b.id === 'geo') {
      if (!navigator.geolocation) return fail('Posizione non disponibile su questo dispositivo.');
      busy = true; msg = 'Rilevo la posizione…'; render();
      navigator.geolocation.getCurrentPosition(function (pos) {
        C.nomeDa(pos.coords.latitude, pos.coords.longitude).then(function (n) { fatto({ nome: n, lat: pos.coords.latitude, lon: pos.coords.longitude }); });
      }, function () { fail('Posizione negata. Scrivi l’indirizzo.'); }, { timeout: 15000, maximumAge: 600000 });
    } else if (b.hasAttribute('data-casa')) {
      var p = pend; pend = null; msg = ''; C.save(C.aggiungi(st, p, b.getAttribute('data-casa') === '1'));
      if (st.fonte === 'nessuno' && C.load().luoghi.length === 1) { st = C.load(); st.fonte = 'storico'; C.save(st); }
      ricalcola();
    } else if (b.hasAttribute('data-fonte')) { st.fonte = b.getAttribute('data-fonte'); C.save(st); ricalcola(); }
    else if (b.hasAttribute('data-stile')) { st.stile = b.getAttribute('data-stile'); C.save(st); ricalcola(); }
    else if (b.hasAttribute('data-use')) { st.attivo = b.getAttribute('data-use'); C.save(st); ricalcola(); }
    else if (b.hasAttribute('data-del')) { C.save(C.rimuovi(st, b.getAttribute('data-del'))); ricalcola(); }
  });
  render(); U.nav('meteo'); ricalcola();
})();
