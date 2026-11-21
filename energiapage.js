(function () {
  var S = window.SCHED, C = window.CLIMA, E = window.ENERGIA, U = window.UI, BU = window.BOLLUI, app = document.getElementById('app');
  var mkt = null, mktErr = false, busy = false;
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function eur(x) { return Math.round(x).toLocaleString('it-IT') + ' €'; }
  function it(x, d) { return x.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }); }

  function fonti(pr) {
    var N = { bolletta: 'dalla tua bolletta', setup: 'inseriti nel Setup', setup1: 'inserito nel Setup', mercato: 'di mercato' };
    return pr.fonteL === pr.fonteG ? (pr.fonteL === 'mercato' ? '' : 'Luce e gas: prezzi ' + N[pr.fonteL] + '. ') : 'Luce: prezzo ' + N[pr.fonteL === 'setup' ? 'setup1' : pr.fonteL] + '. Gas: prezzo ' + N[pr.fonteG === 'setup' ? 'setup1' : pr.fonteG] + '. ';
  }
  function nm(f) { return E.etichetta(f).nome.toLowerCase(); }
  function budgetCard(st, now, tm, pr) {
    var b = E.budgetInfo(st, now, tm, pr), h = '<h2>Budget del mese</h2><section class="card">';
    if (!b) h += '<p class="sm">Scegli quanto vuoi spendere al mese per scaldare casa: ti avviso se la stima lo supera.</p>';
    else if (b.fuori) h += '<p class="sm">Fuori stagione: per ora non ci sono costi di riscaldamento.</p>';
    else {
      var w = Math.min(100, Math.round(b.pct * 100)), diff = Math.abs(b.budget - b.costo);
      h += '<p class="result">Stima di ' + S.MESI[b.mese].nome.toLowerCase() + ': ' + eur(b.costo) + ' su ' + eur(b.budget) + '</p>' +
        '<div class="bar" role="img" aria-label="' + w + '%"><i class="' + (b.sfora ? 'over' : 'on') + '" style="width:' + Math.max(w, 3) + '%"></i><i class="off" style="flex:1"></i></div>';
      if (!b.sfora) h += '<p class="ok">Sei dentro il budget: restano circa ' + eur(diff) + '.</p>';
      else if (b.basta) h += '<p class="ovr">Superi il budget di ' + eur(diff) + '. Per rientrare abbassa di ' + b.gradi + ' °C le temperature consigliate.</p>';
      else if (b.altCosto <= b.budget) h += '<p class="ovr">Superi il budget di ' + eur(diff) + '. Passando a ' + nm(b.alt) + ' la stima scende a ' + eur(b.altCosto) + '.</p>';
      else h += '<p class="ovr">Superi il budget di ' + eur(diff) + ': anche abbassando di 3 °C non basta. Valuta un budget più alto.</p>';
      h += '<p class="hint">Ogni grado in meno fa risparmiare circa il 7 % (stima ENEA).</p>';
    }
    h += '<label class="fld" for="bud">Budget mensile (€)</label><input class="in" id="bud" type="number" inputmode="decimal" min="1" max="2000" step="1" value="' + (st.budget > 0 ? st.budget : '') + '">' +
      '<p class="hint" id="berr" hidden>Inserisci una cifra tra 1 e 2.000 €.</p>' +
      '<div class="rw"><button type="button" class="btn sm2" id="bsave">Salva budget</button>' + (st.budget > 0 ? '<button type="button" class="btn sm2 sec2" id="bdel">Togli budget</button>' : '') + '</div></section>';
    return h;
  }
  function reportCard(st, now, tm, pr) {
    var r = E.report(st, now, tm, pr); if (!r) return '';
    var h = '<section class="card"><b>Report di ' + S.MESI[r.mese].nome.toLowerCase() + '</b><p class="sm">Con ' + nm(r.fonte) + ' hai speso circa ' + eur(r.costo) + '.</p>';
    h += '<p class="sm">' + (r.risparmio >= 1 ? 'Rispetto a ' + nm(r.alt) + ' hai risparmiato circa ' + eur(r.risparmio) + '.' : r.risparmio <= -1 ? 'Con ' + nm(r.alt) + ' avresti speso circa ' + eur(-r.risparmio) + ' in meno.' : 'Le due fonti costavano quasi uguale.') + '</p>';
    if (r.budget) h += '<p class="' + (r.costo > r.budget ? 'ovr' : 'ok') + '">' + (r.costo > r.budget ? 'Budget superato di ' + eur(r.costo - r.budget) + '.' : 'Budget rispettato: ' + eur(r.budget - r.costo) + ' in meno del previsto.') + '</p>';
    return h + '<p class="hint">Stima con i prezzi di oggi e il meteo del mese.</p></section>';
  }
  function salvaBudget(v) { var st = E.load(); st.budget = v; E.save(st); render(); }
  function render() {
    var st = E.load(), now = new Date(), pr = E.prezzi(st, mkt, now), tm = E.tmedDa(S, C, now), m = E.meseRef(now) || 11;
    var rows = E.INV.map(function (x) { var Q = E.caloreMese(st, x, tm), k = E.costi(Q, tm(x), pr); return { m: x, Q: Q, k: k, w: k.gas < k.elettrica ? 'gas' : 'elettrica' }; });
    var kM = rows.filter(function (r) { return r.m === m; })[0], v = E.verdetto(st.fonte, kM.k);
    var stag = { gas: 0, elettrica: 0, best: 0 }; rows.forEach(function (r) { stag.gas += r.k.gas; stag.elettrica += r.k.elettrica; stag.best += Math.min(r.k.gas, r.k.elettrica); });
    var altra = st.fonte === 'gas' ? 'elettrica' : 'gas', e1 = E.etichetta(st.fonte);
    var h = '<div class="hd"><a class="back" href="index.html">' + U.I('back') + 'Stagioni</a><a class="back" href="setup.html">' + U.I('gear') + 'Setup</a></div><div><h1>Energia</h1><p>Quale fonte conviene per scaldare casa, con i prezzi di oggi.</p></div>';
    h += '<section class="hero"><div style="min-width:0"><small>Stai usando</small><span class="big tn" style="font-size:40px">' + e1.nome + '</span><span class="amt">' + (v.cambia ? 'Conviene passare a ' + E.etichetta(v.verso).nome.toLowerCase() : 'Va bene così') + '</span></div><div class="wm">' + U.I(e1.icon) + '</div></section>';
    h += BU.revisione(st) + '<div id="cons"></div>' + reportCard(st, now, tm, pr);
    h += '<section class="card"><b>Giudizio per ' + S.MESI[m].nome.toLowerCase() + '</b>' +
      (v.cambia ? '<p class="ok">Passa a ' + E.etichetta(v.verso).nome.toLowerCase() + ': risparmi circa ' + eur(v.risparmio) + ' al mese.</p>'
        : '<p class="ok">Resta con ' + e1.nome.toLowerCase() + '. ' + (v.risparmio > 0 ? 'Cambiare farebbe risparmiare solo ' + eur(v.risparmio) + ' al mese: non vale la pena.' : 'È già la scelta più economica (' + eur(Math.abs(kM.k[altra] - kM.k[st.fonte])) + ' al mese in meno rispetto a ' + E.etichetta(altra).nome.toLowerCase() + ').') + '</p>') +
      '<p class="hint">Fuori ci sono circa ' + it(tm(m), 0) + ' °C: la pompa di calore rende ' + it(kM.k.cop, 1) + ' kWh di calore per ogni kWh di corrente. Si cambia solo se il risparmio è tangibile: almeno 10 € al mese.' + U.aiuto('pompa') + '</p>' +
      '<p class="hint">' + (v.cambia ? '' : 'Il gas tornerebbe conveniente solo se la luce superasse circa ' + it(pr.gas * (pr.mG || E.P.marg) / (E.P.kwhPerSmc * E.P.eff) * kM.k.cop / (pr.mL || E.P.marg), 2) + ' €/kWh, con il gas a ' + it(pr.gas, 2) + ' €/Smc.') + '</p><div class="seg" role="group" aria-label="Fonte in uso"><button type="button" data-f="elettrica" aria-pressed="' + (st.fonte === 'elettrica') + '">' + U.I('bolt') + 'Elettrica</button><button type="button" data-f="gas" aria-pressed="' + (st.fonte === 'gas') + '">' + U.I('flame') + 'Gas metano</button></div></section>';
    h += budgetCard(st, now, tm, pr) + BU.html(st);
    h += '<h2>Prezzi di mercato</h2><section class="card"><ul class="lst"><li><span><strong>Luce</strong><span class="wh">tutto compreso</span></span><span class="deg tn">' + it(pr.luce, 4) + ' €/kWh</span></li><li><span><strong>Gas</strong><span class="wh">tutto compreso</span></span><span class="deg tn">' + it(pr.gas, 3) + ' €/Smc</span></li></ul>' +
      '<p class="hint">' + fonti(pr) + (mkt ? (E.vecchio(mkt, now) ? '<span class="ovr">Dati di mercato di oltre un mese fa: tocca Cerca nuovi dati di mercato.</span> ' : '') + 'Dati di mercato aggiornati al ' + esc(mkt.aggiornato) + '. ' + esc(mkt.fonte || '') : (mktErr ? 'Dati di mercato non raggiungibili ora.' : 'Carico i dati…')) + '</p>' +
      '<button class="btn sec2" id="agg" type="button"' + (busy ? ' disabled' : '') + '>Cerca nuovi dati di mercato</button><p class="hint">I dati di mercato si aggiornano ogni mese. Quando arriva una bolletta nuova, inserisci i tuoi prezzi nel Setup: sono i più precisi.</p></section>';
    h += '<h2>Mese per mese</h2><section class="card"><ul class="lst">' + rows.map(function (r) {
      var d = Math.abs(r.k.gas - r.k.elettrica);
      return '<li><span><strong>' + S.MESI[r.m].nome + '</strong><span class="wh">Gas ' + eur(r.k.gas) + ' · Elettrica ' + eur(r.k.elettrica) + '</span></span><span class="deg tn" style="text-align:right">' + '<span class="tn" style="display:inline-flex">' + U.I(E.etichetta(r.w).icon) + '</span><span class="wh">−' + eur(d) + '</span></span></li>';
    }).join('') + '</ul><p class="hint">Il simbolo a destra indica la fonte più economica (fulmine = elettrica, fiamma = gas) e quanto si risparmia nel mese.</p></section>';
    h += '<section class="card"><b>Nella stagione</b><p class="sm">Scegliendo sempre la fonte più economica ' + eur(stag.best) + ' contro ' + eur(stag.elettrica) + ' con la sola elettrica e ' + eur(stag.gas) + ' con il solo gas.</p>' +
      '<p class="hint">Intervallo realistico per la stagione: da ' + eur(stag.best * (st.gasSmc ? 0.85 : 0.75)) + ' a ' + eur(stag.best * (st.gasSmc ? 1.15 : 1.25)) + '. ' + (st.gasSmc ? 'La stima è tarata sul gas della tua bolletta: lo scarto atteso è di circa il ' + 15 + '%.' : 'È una stima: lo scarto atteso è di circa il ' + 25 + '%. Inserisci nel Setup il gas della bolletta per ridurlo.') + '</p>' +
      (E.ok(st) || st.gasSmc ? '' : '<p class="note2">Hai usato valori medi. Inserisci metri quadri e anno di costruzione nel <a href="setup.html">Setup</a> per un calcolo preciso.</p>') + '</section>';
    h += '<p class="sm" style="text-align:center">Estate: il raffrescamento è sempre elettrico. Stime indicative. <a href="spiegazione.html">Perché elettrico e non gas</a></p>';
    app.innerHTML = h; U.applyHue(235); U.nav('energia'); BU.anteprima();
    E.banner(document.getElementById('cons'), S, C, U, render);
  }
  function carica() { busy = true; E.mercato().then(function (m) { mkt = m; mktErr = !m; busy = false; render(); }); }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.hasAttribute('data-b')) { BU.click(b, render); return; }
    if (b.hasAttribute('data-f')) { var st = E.load(); st.fonte = b.getAttribute('data-f'); st.consiglio = null; E.save(st); render(); }
    else if (b.id === 'agg') carica();
    else if (b.id === 'bdel') salvaBudget(null);
    else if (b.id === 'bsave') {
      var x = document.getElementById('bud'), v = Math.round(+String(x.value).replace(',', '.'));
      if (!(v >= 1 && v <= 2000)) { document.getElementById('berr').hidden = false; x.focus(); return; }
      salvaBudget(v);
    }
  });
  BU.attiva(app, render); render(); carica();
  if (location.hash === '#bollette') setTimeout(function () { var x = document.getElementById('bollette'); if (x) x.scrollIntoView({ block: 'start' }); }, 300);
})();
