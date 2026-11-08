(function () {
  var S = window.SCHED, U = window.UI, key = window.SEASON, cfg = S.SEASONS[key], emb = key === 'inverno' ? 'snow' : 'sun';
  var today = new Date(), active = S.stagioneOggi(today) === key;
  // Inverno con la caldaia: termostato ambiente e temperatura dell'acqua dei termosifoni al posto del condizionatore.
  function calcSis() { return (key === 'inverno' && window.ENERGIA && window.ENERGIA.load().fonte === 'gas') ? 'caldaia' : 'split'; }
  var sis = calcSis();
  var month = active ? today.getMonth() + 1 : cfg.ordine[0];
  var perche = {
    inverno: [
      ['thermo', 'Temperatura: 19 °C a novembre, marzo e aprile, 20 °C da dicembre a febbraio. Il limite di legge per le case è 20 °C, con 2 °C di tolleranza.'],
      ['clock', 'Orari: acceso la mattina e dalle 17:00 nei giorni lavorativi, tutto il giorno nel weekend. Spento fuori casa e di notte.'],
      ['euro', 'Nei giorni più freddi il condizionatore rende meno, ma resta più economico del gas.']
    ],
    caldaia: [
      ['thermo', 'Temperatura del termostato ambiente: 19 °C a novembre, marzo e aprile, 20 °C da dicembre a febbraio. ENEA ritiene 19 °C sufficienti; il limite di legge è 20 °C con 2 °C di tolleranza.'],
      ['clock', 'Fuori casa e di notte il termostato si abbassa di 3 °C, ma non scende sotto 16 °C: ENEA consiglia di non scendere sotto 12–13 °C per evitare condense. Riaccendere da molto freddo costa più gas.'],
      ['flame', 'Temperatura di mandata: con il ritorno sotto 55 °C la caldaia a condensazione recupera calore dai fumi. Più fa freddo fuori, più l’acqua può essere calda, ma conviene stare tra 45 e 60 °C.']
    ],
    estate: [
      ['thermo', 'Temperatura: 26 °C a giugno e settembre, 27 °C a luglio e agosto. Meno di 26 °C fa consumare molto di più e non serve.'],
      ['sun', 'Perché: il 2024 e il 2025 sono stati tra gli anni più caldi a Roma dal 1991, e giugno 2025 è stato circa 4 °C sopra la media 1991–2020 (CMCC). Con punte di 34–35 °C, 27 °C dentro tiene la differenza con l’esterno entro 8 °C.'],
      ['clock', 'Orari: acceso solo la sera nei giorni lavorativi e dalle 11:00 nel weekend. Al mattino le finestre aperte bastano.']
    ]
  };
  var regole = {
    inverno: [
      ['power', 'Modalità Caldo, ventola in automatico, niente Turbo.'],
      ['clock', 'Appena acceso lavora al massimo: servono 30–45 minuti per sentire caldo.'],
      ['moon', 'Spegni 20 minuti prima di andare a letto: il caldo resta in casa.'],
      ['door', 'Se una stanza resta fredda, alza solo quella di 1 °C.'],
      ['bolt', 'Contatore da 3 kW: all’accensione, con forno o piastra in funzione, può scattare. Accendi prima di cucinare.'],
      ['filter', 'Filtri puliti e bocchette libere.']
    ],
    caldaia: [
      ['power', 'Il termostato ambiente comanda la caldaia: imposta i gradi indicati e lascia fare a lui.'],
      ['flame', 'Imposta sulla caldaia la temperatura di mandata consigliata. Se ha la sonda esterna, usa la curva climatica invece del valore fisso (circa 1,0–1,5 per termosifoni). Se la casa si scalda troppo o la caldaia si accende e spegne di continuo, abbassa la mandata di 5 °C.'],
      ['clock', 'Non alzare il termostato di molto per scaldare prima: l’acqua non scalda più in fretta, la casa supera solo la temperatura voluta.'],
      ['door', 'Camere poco usate: termostato a 17–18 °C.'],
      ['window', 'Arieggia 5–10 minuti con finestre spalancate, poi chiudi: meglio di finestre socchiuse a lungo.'],
      ['filter', 'Caldaia con manutenzione annuale: consuma meno e dura di più.']
    ],
    estate: [
      ['power', 'Modalità Freddo, ventola in automatico, niente Turbo.'],
      ['window', 'Finestre aperte al mattino presto, persiane chiuse sul lato sole appena entra il caldo.'],
      ['fan', 'Un ventilatore accanto al condizionatore ti fa sentire fresco anche con 1–2 °C in più.'],
      ['drop', 'Con tanta umidità prova la modalità Deumidifica: consuma meno.'],
      ['bolt', 'Contatore da 3 kW: forno e piastra insieme al condizionatore possono farlo scattare.'],
      ['filter', 'Filtri puliti e unità esterna libera e all’ombra.']
    ]
  };
  var els = {}, perDati = sis === 'caldaia' ? 'caldaia' : key;
  function chiudiNota() {}
  function deg(t, rid) { return t === null ? '<span class="deg o">Spento</span>' : '<span class="deg' + (rid ? ' o' : ' tn') + '">' + t + ' °C</span>'; }

  function card(tipo) {
    var d = S.MESI[month], list = S.lista(month, tipo, sis), ph = S.phases(month, tipo, sis);
    var nowMin = today.getHours() * 60 + today.getMinutes();
    var showNow = active && today.getMonth() + 1 === month && S.tipoOggi(today) === tipo;
    var cur = showNow ? S.at(month, tipo, nowMin, sis) : null;
    var title = tipo === 'fer' ? 'Giorni lavorativi' : 'Weekend e festivi';
    var sub = sis === 'caldaia' ? (tipo === 'fer' ? 'Termostato: ' + 'acceso 45 minuti prima di rientrare' : 'Termostato alto tutto il giorno') : tipo === 'fer' ? (key === 'inverno' ? 'In casa la mattina e dalle 17:00' : 'In casa dalle 17:00') : 'In casa tutto il giorno';
    var h = '<header><div><h3>' + title + '</h3><span>' + sub + '</span></div></header>';
    h += '<div class="bar">' + ph.map(function (p) { return '<i class="' + (p.temp === null || p.rid ? 'off' : 'on') + '" style="width:' + ((p.to - p.from) / 14.4) + '%"></i>'; }).join('');
    if (showNow) h += '<span class="mark" style="left:' + (nowMin / 14.4) + '%"></span>';
    h += '</div><div class="ticks" aria-hidden="true"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>';
    h += '<ul class="rows">' + list.map(function (r) {
      var isCur = cur && cur.label === r.label && (r.from < r.to ? (nowMin >= r.from && nowMin < r.to) : (nowMin >= r.from || nowMin < r.to));
      return '<li class="' + (r.temp !== null && !r.rid ? 'is' : '') + (isCur ? ' cur' : '') + '"><span class="sw"></span><span><strong>' + r.label + '</strong><span class="wh tn">' + S.fmt(r.from) + ' – ' + S.fmt(r.to) + '</span><span class="wh">' + r.hint + '</span></span>' + deg(r.temp, r.rid) + '</li>';
    }).join('') + '</ul>';
    if (d.nota && tipo === 'fer') h += '<p class="note">' + d.nota + '</p>';
    els[tipo].innerHTML = h;
  }

  function fonteBadge() {
    if (!window.ENERGIA) return '';
    var e = window.ENERGIA.etichetta(key === 'inverno' ? window.ENERGIA.load().fonte : 'elettrica');
    return '<span class="src">' + U.I(e.icon) + e.sym + ' \u00b7 ' + e.nome + '</span>';
  }
  function hero() {
    var d = S.MESI[month], verb = cfg.modo, t = S.setPoint(month);
    els.hero.className = 'hero';
    var te = d.media; if (info && info.live && month === today.getMonth() + 1 && info.live.giorni[0]) te = info.live.giorni[0].mean;
    var riga = sis === 'caldaia' ? 'Termostato ambiente' + (t === null ? ' · non serve scaldare' : ' · mandata caldaia circa ' + S.mandata(te) + ' °C') + U.aiuto('mandata') : 'Modalità ' + verb + ' · media del mese ' + String(d.media).replace('.', ',') + ' °C';
    els.hero.innerHTML = '<div style="min-width:0"><small>' + (sis === 'caldaia' ? 'Termostato di ' : 'Temperatura di ') + d.nome + '</small><span class="big tn">' + (t === null ? 'Spento' : t + ' °C') + '</span><span class="amt">' + riga + '</span>' + fonteBadge() + '</div><div class="wm">' + U.I(emb) + '</div>';
  }

  function azione() {
    var el = els.azione; if (!el) return;
    if (!active) { el.style.display = 'none'; return; }
    var C = window.CLIMA, st = C ? C.load() : { stile: 'bilanciato', fonte: 'live' };
    var live = st.fonte === 'live' && info && info.live && info.live.adesso;
    var tf = live ? Math.round(info.live.adesso.t) : Math.round(S.MESI[today.getMonth() + 1].media);
    el.style.display = ''; el.innerHTML = window.AZIONE.azione({ S: S, key: key, sis: sis, today: today, tf: tf, stile: st.stile, live: !!live, anno: C ? C.annoScorso() : '' });
  }

  function chips() {
    var ora = today.getMonth() + 1;
    els.chips.innerHTML = (active && month !== ora ? '<button type="button" class="chip oggi" data-oggi="1">' + U.I('clock') + 'Oggi</button>' : '') + cfg.ordine.map(function (m) {
      var d = S.MESI[m];
      return '<button type="button" class="chip" data-m="' + m + '" aria-pressed="' + (m === month) + '" style="--dc:hsl(' + Math.round(U.hueFor(d.media)) + ' 85% 50%)"><i></i>' + d.nome + '</button>';
    }).join('');
  }

  var info = null, errore = false;
  function banner() {
    var el = els.meteo, st = window.CLIMA.load(), l = window.CLIMA.luogo(st), C = window.CLIMA;
    var h = '<div><b>' + (l ? l.nome + (l.casa ? ' · Casa' : ' · Sessione fuori casa') : 'Nessun luogo scelto') + '</b><small>';
    if (!l) h += 'Scegli il luogo nel Setup per usare il meteo.';
    else if (errore) h += 'Meteo non raggiungibile: uso i valori standard. Stile ' + C.STILI[st.stile].nome + '.';
    else if (!info) h += 'Controllo il meteo…';
    else if (st.fonte === 'storico') h += 'Medie del ' + info.anno + ' · stile ' + C.STILI[st.stile].nome + '.';
    else h += 'Previsioni di oggi, ora ' + Math.round(info.live.adesso.t) + ' °C fuori · stile ' + C.STILI[st.stile].nome + '.';
    var mo = info && info.motivi[month]; if (mo && (st.fonte === 'storico' || month === today.getMonth() + 1)) h += ' ' + mo;
    els.meteo.innerHTML = h + '</small></div><a class="back" href="setup.html?p=1">' + (l ? 'Cambia' : 'Scegli') + '</a>';
    var f = Object.keys(C.STILI);
    var sist = '';
    if (key === 'inverno' && window.ENERGIA) { var f0 = window.ENERGIA.load().fonte; sist = '<div class="fld" style="margin:6px 4px 0">Cosa usi per scaldare' + U.aiuto('sistema') + '</div><div class="seg" role="group" aria-label="Sistema"><button type="button" data-sis="elettrica" aria-pressed="' + (f0 !== 'gas') + '">Condizionatore</button><button type="button" data-sis="gas" aria-pressed="' + (f0 === 'gas') + '">Caldaia</button></div>'; }
    var dati = '<div class="fld" style="margin:10px 4px 0">Dati per le temperature</div><div class="seg" role="group" aria-label="Dati">' + [['live', 'Meteo live'], ['storico', 'Anno ' + C.annoScorso()]].map(function (x) { return '<button type="button" data-fonte="' + x[0] + '" aria-pressed="' + (x[0] === st.fonte) + '">' + x[1] + '</button>'; }).join('') + '</div><p class="sm" style="margin:0 4px">' + (st.fonte === 'live' ? 'A ogni apertura legge le previsioni di oggi e ricalcola il mese in corso.' : 'Usa le medie consolidate del ' + C.annoScorso() + ' per ogni mese. Dall’anno nuovo passa da solo all’anno concluso.') + '</p>';
    els.fonte.innerHTML = sist + dati + '<div class="fld" style="margin:10px 4px 0">Stile</div><div class="seg" role="group" aria-label="Stile">' + f.map(function (x) { return '<button type="button" data-stile="' + x + '" aria-pressed="' + (x === st.stile) + '">' + C.STILI[x].nome + '</button>'; }).join('') + '</div><p class="sm" style="margin:0 4px 10px">' + C.STILI[st.stile].d + '</p>';
  }
  function paint() {
    U.applyHue(U.hueFor(S.MESI[month].media));
    Array.prototype.forEach.call(els.chips.children, function (c) { c.setAttribute('aria-pressed', +c.getAttribute('data-m') === month ? 'true' : 'false'); });
    hero(); azione(); card('fer'); card('we'); if (window.CLIMA) banner();
  }

  function aggiorna() {
    info = null; errore = false; paint();
    window.CLIMA.applica(S).then(function (i) { info = i; paint(); }).catch(function () { errore = true; paint(); });
  }
  function build() {
    var main = document.getElementById('app');
    var other = key === 'inverno' ? ['estate.html', 'Stagione estate', 'sun'] : ['inverno.html', 'Stagione inverno', 'snow'];
    main.innerHTML =
      '<div class="hd"><a class="back" href="index.html">' + U.I('back') + 'Stagioni</a><span class="emb" aria-hidden="true">' + U.I(emb) + '</span></div>' +
      '<div><h1>' + cfg.nome + '</h1><p>' + (sis === 'caldaia' ? 'Scegli il mese. Imposta il termostato ambiente: la caldaia parte da sola solo quando serve.' : 'Scegli il mese. Accendi il condizionatore (modalità ' + cfg.modo + ') solo quando sei in casa. Spegnilo quando esci e di notte.') + '</p></div>' +
      '<div class="chips" id="chips" role="group" aria-label="Mese"></div>' +
      '<section class="fare" id="azione" aria-live="polite"></section><div id="hero"></div><div id="cons"></div><div class="al" id="meteo"></div><div id="fonte"></div>' +
      '<section class="card" id="fer"></section><section class="card" id="we"></section>' +
      '<h2>Perché questi valori</h2><section class="card"><ul class="rules">' + perche[perDati].map(function (r) { return '<li>' + U.I(r[0]) + '<span>' + r[1] + '</span></li>'; }).join('') + '</ul></section>' +
      '<h2>Per farlo bene</h2><section class="card"><ul class="rules">' + regole[perDati].map(function (r) { return '<li>' + U.I(r[0]) + '<span>' + r[1] + '</span></li>'; }).join('') + '</ul></section>' +
      '<div class="cmds"><a class="cm" href="consigli.html"><i class="ab">' + U.I('bulb') + '</i><b>Consigli di risparmio</b><small>Come spendere il meno possibile</small></a>' +
      (key === 'inverno' ? '<a class="cm" href="spiegazione.html"><i class="ab">' + U.I('bolt') + '</i><b>Perché elettrico e non gas</b><small>Costi a confronto</small></a>' : '<a class="cm" href="' + other[0] + '"><i class="ab">' + U.I(other[2]) + '</i><b>' + other[1] + '</b><small>Temperature da novembre ad aprile</small></a>') + '</div>' +
      '<p class="sm" style="text-align:center;margin-top:8px">Valori indicativi per un appartamento a Roma.' + (sis === 'caldaia' ? ' La mandata consigliata è una stima: se la tua caldaia ha una curva climatica, vale quella dell’installatore.' : '') + '</p>';
    els.chips = document.getElementById('chips'); els.hero = document.getElementById('hero'); els.meteo = document.getElementById('meteo'); els.fonte = document.getElementById('fonte'); els.cons = document.getElementById('cons'); els.azione = document.getElementById('azione');  els.fer = document.getElementById('fer'); els.we = document.getElementById('we');
    chips();
    els.chips.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; month = b.hasAttribute('data-oggi') ? today.getMonth() + 1 : +b.getAttribute('data-m'); chips(); paint(); var on = els.chips.querySelector('[aria-pressed=true]'); if (on && on.scrollIntoView) { try { on.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (x) {} } });
    paint(); U.nav(key);
    if (window.CLIMA) {
      els.fonte.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.hasAttribute('data-sis')) { var en = window.ENERGIA.load(); en.fonte = b.getAttribute('data-sis'); en.consiglio = null; window.ENERGIA.save(en); sis = calcSis(); perDati = sis === 'caldaia' ? 'caldaia' : key; build(); return; }
        if (b.hasAttribute('data-fonte')) { var C0 = window.CLIMA, s0 = C0.load(); s0.fonte = b.getAttribute('data-fonte'); C0.save(s0); aggiorna(); return; }
        if (!b.hasAttribute('data-stile')) return;
        var C = window.CLIMA, st = C.load(); st.stile = b.getAttribute('data-stile'); C.save(st); aggiorna();
      });
      if (window.ENERGIA) window.ENERGIA.banner(els.cons, S, window.CLIMA, U, function () { paint(); });
      aggiorna();
    }
  }
  build();
})();
