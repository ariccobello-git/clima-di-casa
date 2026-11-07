(function () {
  var S = window.SCHED, C = window.CLIMA, U = window.UI, app = document.getElementById('app');
  var info = null, err = false, live = null, liveErr = false;
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function seg(name, items, cur) { return '<div class="seg" role="group">' + items.map(function (i) { return '<button type="button" data-' + name + '="' + i[0] + '" aria-pressed="' + (i[0] === cur) + '">' + i[1] + '</button>'; }).join('') + '</div>'; }
  function r(x) { return Math.round(x); }
  var GG = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

  function adesso() {
    var a = live.adesso, w = U.meteo(a.code, a.notte), d = a.app - a.t;
    var h = '<section class="hero wx"><div class="row"><div style="min-width:0"><small>Adesso · ' + w.t + '</small><span class="big tn">' + r(a.t) + '°</span><small>Percepita ' + r(a.app) + '°</small></div><div class="ic">' + U.I(w.i) + '</div></div></section>';
    var pp = live.giorni[0].pp, um = a.um;
    h += '<div class="tiles"><div class="tile">' + U.I('thermo') + '<b class="tn">' + r(a.app) + '°</b><span>' + (d >= 2 ? 'Si sente più caldo' : d <= -2 ? 'Si sente più freddo' : 'Come il reale') + '</span></div>' +
      '<div class="tile">' + U.I('drop') + '<b class="tn">' + r(um) + '%</b><div class="gauge"><i style="width:' + Math.max(4, Math.min(100, um)) + '%"></i></div><span>' + (um < 40 ? 'Aria secca' : um <= 60 ? 'Umidità ideale' : 'Aria umida') + '</span></div>' +
      '<div class="tile">' + U.I('rain') + '<b class="tn">' + (pp == null ? '–' : r(pp) + '%') + '</b><span>' + (pp == null ? 'Pioggia' : pp >= 60 ? 'Porta l’ombrello' : pp >= 30 ? 'Possibile pioggia' : 'Pioggia improbabile') + '</span></div></div>';
    h += '<section class="card"><b>Prossimi giorni</b><div class="days" style="margin-top:10px">' + live.giorni.map(function (g, i) {
      var x = U.meteo(g.code, false), dt = new Date(g.data + 'T12:00:00');
      return '<div class="dy">' + U.I(x.i) + '<b>' + (i === 0 ? 'Oggi' : GG[dt.getDay()]) + '</b><span class="tn">' + r(g.min) + '° / ' + r(g.max) + '°</span></div>';
    }).join('') + '</div></section>';
    return h;
  }

  function tabella() {
    var rows = S.SEASONS.inverno.ordine.concat(S.SEASONS.estate.ordine).map(function (m) {
      var d = S.MESI[m], t = S.setPoint(m);
      return '<li><span><strong>' + d.nome + '</strong><span class="wh">Standard ' + d.t + ' °C' + (info && info.motivi[m] ? ' · ' + esc(info.motivi[m]) : '') + '</span></span><span class="deg ' + (t === null ? 'o' : 'tn') + '">' + (t === null ? 'Spento' : t + ' °C') + '</span></li>';
    });
    return '<ul class="lst">' + rows.join('') + '</ul>';
  }

  function render() {
    var st = C.load(), l = C.luogo(st), casa = C.casa(st), h = '';
    var hue = 215;
    if (live && l) { var a = live.adesso, c = +a.code; hue = a.notte ? 245 : c === 0 || c === 1 ? 32 : c === 2 ? 205 : c >= 51 ? 212 : 220; }
    h += '<div class="hd"><a class="back" href="index.html">' + U.I('back') + 'Stagioni</a><a class="back" href="setup.html">' + U.I('gear') + 'Setup</a></div><div><h1>Meteo</h1></div>';
    if (!l) {
      h += '<section class="card"><b>Scegli il luogo</b><p class="sm">Per vedere il meteo e adattare le temperature serve l’indirizzo della casa.</p><a class="btn" href="setup.html">Vai al Setup</a></section>';
    } else {
      h += '<div class="chips wrap" role="group" aria-label="Luogo">' + st.luoghi.map(function (x) { return '<button type="button" class="chip u" data-use="' + x.id + '" aria-pressed="' + (x.id === st.attivo) + '">' + U.I(x.casa ? 'home' : 'pin') + esc(x.nome.split(',')[0]) + '</button>'; }).join('') + '</div>';
      if (!l.casa) h += '<p class="note2"><b>Sessione fuori casa</b>: stai gestendo ' + esc(l.nome) + '.' + (casa ? ' <button type="button" class="chip" data-use="' + casa.id + '">Torna a ' + esc(casa.nome.split(',')[0]) + '</button>' : '') + '</p>';
      if (live) h += adesso(); else h += '<section class="card"><p class="sm">' + (liveErr ? 'Meteo non raggiungibile ora. Riprova tra poco.' : 'Carico il meteo…') + '</p></section>';
    }
    h += '<h2>Dati per le temperature</h2><section class="card">' + seg('fonte', [['live', 'Meteo live'], ['storico', 'Anno ' + C.annoScorso()]], st.fonte) +
      '<p class="sm">' + (st.fonte === 'live' ? 'A ogni apertura legge le previsioni di oggi e ricalcola il mese in corso.' : 'Usa le medie consolidate del ' + C.annoScorso() + ' per ogni mese. Dall’anno nuovo passa da solo all’anno concluso.') + '</p></section>';
    h += '<h2>Temperature da impostare</h2><section class="card">' + (err ? '<p class="sm">Meteo non raggiungibile: valori standard.</p>' : '') + tabella() + '<p class="sm">Lo stile (risparmio, bilanciato, comfort) si sceglie nelle pagine Inverno ed Estate.</p></section>';
    h += '<p class="sm" style="text-align:center">Dati meteo: <a href="https://open-meteo.com/">Open-Meteo.com</a> (CC BY 4.0).</p>';
    app.innerHTML = h; U.applyHue(hue);
  }

  function carica() {
    var l = C.luogo();
    err = false; info = null;
    C.applica(S).then(function (i) { info = i; }).catch(function () { err = true; }).then(render);
    if (l) { liveErr = false; C.live(l).then(function (v) { live = v; render(); }).catch(function () { liveErr = true; live = null; render(); }); } else { live = null; }
    render();
  }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return; var st = C.load();
    if (b.hasAttribute('data-fonte')) { st.fonte = b.getAttribute('data-fonte'); C.save(st); carica(); }
    else if (b.hasAttribute('data-use')) { st.attivo = b.getAttribute('data-use'); C.save(st); live = null; carica(); }
  });
  render(); U.nav('meteo'); carica();
})();
