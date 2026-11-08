(function () {
  var S = window.SCHED, C = window.CLIMA, E = window.ENERGIA, U = window.UI, app = document.getElementById('app');
  var mkt = null, mktErr = false, busy = false;
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function eur(x) { return Math.round(x).toLocaleString('it-IT') + ' €'; }
  function it(x, d) { return x.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }); }

  function render() {
    var st = E.load(), now = new Date(), pr = E.prezzi(st, mkt), tm = E.tmedDa(S, C, now), m = E.meseRef(now) || 11;
    var rows = E.INV.map(function (x) { var Q = E.caloreMese(st, x, tm), k = E.costi(Q, tm(x), pr); return { m: x, Q: Q, k: k, w: k.gas < k.elettrica ? 'gas' : 'elettrica' }; });
    var kM = rows.filter(function (r) { return r.m === m; })[0], v = E.verdetto(st.fonte, kM.k);
    var stag = { gas: 0, elettrica: 0, best: 0 }; rows.forEach(function (r) { stag.gas += r.k.gas; stag.elettrica += r.k.elettrica; stag.best += Math.min(r.k.gas, r.k.elettrica); });
    var altra = st.fonte === 'gas' ? 'elettrica' : 'gas', e1 = E.etichetta(st.fonte);
    var h = '<div class="hd"><a class="back" href="index.html">' + U.I('back') + 'Stagioni</a><a class="back" href="setup.html">' + U.I('gear') + 'Setup</a></div><div><h1>Energia</h1><p>Quale fonte conviene per scaldare casa, con i prezzi di oggi.</p></div>';
    h += '<section class="hero"><div style="min-width:0"><small>Stai usando</small><span class="big tn" style="font-size:40px">' + e1.nome + '</span><span class="amt">' + (v.cambia ? 'Conviene passare a ' + E.etichetta(v.verso).nome.toLowerCase() : 'Va bene così') + '</span></div><div class="wm">' + U.I(e1.icon) + '</div></section>';
    h += '<div id="cons"></div>';
    h += '<section class="card"><b>Giudizio per ' + S.MESI[m].nome.toLowerCase() + '</b>' +
      (v.cambia ? '<p class="ok">Passa a ' + E.etichetta(v.verso).nome.toLowerCase() + ': risparmi circa ' + eur(v.risparmio) + ' al mese.</p>'
        : '<p class="ok">Resta con ' + e1.nome.toLowerCase() + '. ' + (v.risparmio > 0 ? 'Cambiare farebbe risparmiare solo ' + eur(v.risparmio) + ' al mese: non vale la pena.' : 'È già la scelta più economica (' + eur(Math.abs(kM.k[altra] - kM.k[st.fonte])) + ' al mese in meno rispetto a ' + E.etichetta(altra).nome.toLowerCase() + ').') + '</p>') +
      '<p class="hint">Fuori ci sono circa ' + it(tm(m), 0) + ' °C: la pompa di calore rende ' + it(kM.k.cop, 1) + ' kWh di calore per ogni kWh di corrente. Si cambia solo se il risparmio è tangibile: almeno 10 € al mese.' + U.aiuto('pompa') + '</p>' +
      '<p class="hint">' + (v.cambia ? '' : 'Il gas tornerebbe conveniente solo se la luce superasse circa ' + it(pr.gas / (E.P.kwhPerSmc * E.P.eff) * kM.k.cop, 2) + ' €/kWh, con il gas a ' + it(pr.gas, 2) + ' €/Smc.') + '</p><div class="seg" role="group" aria-label="Fonte in uso"><button type="button" data-f="elettrica" aria-pressed="' + (st.fonte === 'elettrica') + '">' + U.I('bolt') + 'Elettrica</button><button type="button" data-f="gas" aria-pressed="' + (st.fonte === 'gas') + '">' + U.I('flame') + 'Gas metano</button></div></section>';
    h += '<h2>Prezzi di mercato</h2><section class="card"><ul class="lst"><li><span><strong>Luce</strong><span class="wh">tutto compreso</span></span><span class="deg tn">' + it(pr.luce, 4) + ' €/kWh</span></li><li><span><strong>Gas</strong><span class="wh">tutto compreso</span></span><span class="deg tn">' + it(pr.gas, 3) + ' €/Smc</span></li></ul>' +
      '<p class="hint">' + (st.luce > 0 || st.gas > 0 ? 'Stai usando i prezzi inseriti nel Setup. ' : '') + (mkt ? 'Dati di mercato aggiornati al ' + esc(mkt.aggiornato) + '. ' + esc(mkt.fonte || '') : (mktErr ? 'Dati di mercato non raggiungibili ora.' : 'Carico i dati…')) + '</p>' +
      '<button class="btn sec2" id="agg" type="button"' + (busy ? ' disabled' : '') + '>Cerca nuovi dati di mercato</button><p class="hint">I dati di mercato si aggiornano ogni mese. Quando arriva una bolletta nuova, inserisci i tuoi prezzi nel Setup: sono i più precisi.</p></section>';
    h += '<h2>Mese per mese</h2><section class="card"><ul class="lst">' + rows.map(function (r) {
      var d = Math.abs(r.k.gas - r.k.elettrica);
      return '<li><span><strong>' + S.MESI[r.m].nome + '</strong><span class="wh">Gas ' + eur(r.k.gas) + ' · Elettrica ' + eur(r.k.elettrica) + '</span></span><span class="deg tn" style="text-align:right">' + '<span class="tn" style="display:inline-flex">' + U.I(E.etichetta(r.w).icon) + '</span><span class="wh">−' + eur(d) + '</span></span></li>';
    }).join('') + '</ul><p class="hint">Il simbolo a destra indica la fonte più economica (fulmine = elettrica, fiamma = gas) e quanto si risparmia nel mese.</p></section>';
    h += '<section class="card"><b>Nella stagione</b><p class="sm">Scegliendo sempre la fonte più economica ' + eur(stag.best) + ' contro ' + eur(stag.elettrica) + ' con la sola elettrica e ' + eur(stag.gas) + ' con il solo gas.</p>' +
      '<p class="hint">Intervallo realistico per la stagione: da ' + eur(stag.best * (st.gasSmc ? 0.85 : 0.75)) + ' a ' + eur(stag.best * (st.gasSmc ? 1.15 : 1.25)) + '. ' + (st.gasSmc ? 'La stima è tarata sul gas della tua bolletta: lo scarto atteso è di circa il ' + 15 + '%.' : 'È una stima: lo scarto atteso è di circa il ' + 25 + '%. Inserisci nel Setup il gas della bolletta per ridurlo.') + '</p>' +
      (E.ok(st) || st.gasSmc ? '' : '<p class="note2">Hai usato valori medi. Inserisci metri quadri e anno di costruzione nel <a href="setup.html">Setup</a> per un calcolo preciso.</p>') + '</section>';
    h += '<p class="sm" style="text-align:center">Estate: il raffrescamento è sempre elettrico. Stime indicative. <a href="spiegazione.html">Perché elettrico e non gas</a></p>';
    app.innerHTML = h; U.applyHue(235); U.nav('energia');
    E.banner(document.getElementById('cons'), S, C, U, render);
  }
  function carica() { busy = true; E.mercato().then(function (m) { mkt = m; mktErr = !m; busy = false; render(); }); }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.hasAttribute('data-f')) { var st = E.load(); st.fonte = b.getAttribute('data-f'); st.consiglio = null; E.save(st); render(); }
    else if (b.id === 'agg') carica();
  });
  render(); carica();
})();
