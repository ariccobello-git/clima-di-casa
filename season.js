(function () {
  var S = window.SCHED, U = window.UI, key = window.SEASON, cfg = S.SEASONS[key], emb = key === 'inverno' ? 'snow' : 'sun';
  var today = new Date(), active = S.stagioneOggi(today) === key;
  var month = active ? today.getMonth() + 1 : cfg.ordine[0];
  var perche = {
    inverno: [
      ['thermo', 'Temperatura: 19 °C a novembre, marzo e aprile, 20 °C da dicembre a febbraio. Il limite di legge per le case è 20 °C, con 2 °C di tolleranza.'],
      ['clock', 'Orari: acceso la mattina e dalle 17:00 nei giorni lavorativi, tutto il giorno nel weekend. Spento fuori casa e di notte.'],
      ['euro', 'Nei giorni più freddi il condizionatore rende meno, ma resta più economico del gas.']
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
    estate: [
      ['power', 'Modalità Freddo, ventola in automatico, niente Turbo.'],
      ['window', 'Finestre aperte al mattino presto, persiane chiuse sul lato sole appena entra il caldo.'],
      ['fan', 'Un ventilatore accanto al condizionatore ti fa sentire fresco anche con 1–2 °C in più.'],
      ['drop', 'Con tanta umidità prova la modalità Deumidifica: consuma meno.'],
      ['bolt', 'Contatore da 3 kW: forno e piastra insieme al condizionatore possono farlo scattare.'],
      ['filter', 'Filtri puliti e unità esterna libera e all’ombra.']
    ]
  };
  var els = {};
  function deg(t) { return t === null ? '<span class="deg o">Spento</span>' : '<span class="deg tn">' + t + ' °C</span>'; }

  function card(tipo) {
    var d = S.MESI[month], list = S.lista(month, tipo), ph = S.phases(month, tipo);
    var nowMin = today.getHours() * 60 + today.getMinutes();
    var showNow = active && today.getMonth() + 1 === month && S.tipoOggi(today) === tipo;
    var cur = showNow ? S.at(month, tipo, nowMin) : null;
    var title = tipo === 'fer' ? 'Giorni lavorativi' : 'Weekend e festivi';
    var sub = tipo === 'fer' ? (key === 'inverno' ? 'In casa la mattina e dalle 17:00' : 'In casa dalle 17:00') : 'In casa tutto il giorno';
    var h = '<header><div><h3>' + title + '</h3><span>' + sub + '</span></div></header>';
    h += '<div class="bar">' + ph.map(function (p) { return '<i class="' + (p.temp === null ? 'off' : 'on') + '" style="width:' + ((p.to - p.from) / 14.4) + '%"></i>'; }).join('');
    if (showNow) h += '<span class="mark" style="left:' + (nowMin / 14.4) + '%"></span>';
    h += '</div><div class="ticks" aria-hidden="true"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>';
    h += '<ul class="rows">' + list.map(function (r) {
      var isCur = cur && cur.label === r.label && (r.from < r.to ? (nowMin >= r.from && nowMin < r.to) : (nowMin >= r.from || nowMin < r.to));
      return '<li class="' + (r.temp !== null ? 'is' : '') + (isCur ? ' cur' : '') + '"><span class="sw"></span><span><strong>' + r.label + '</strong><span class="wh tn">' + S.fmt(r.from) + ' – ' + S.fmt(r.to) + '</span><span class="wh">' + r.hint + '</span></span>' + deg(r.temp) + '</li>';
    }).join('') + '</ul>';
    if (d.nota && tipo === 'fer') h += '<p class="note">' + d.nota + '</p>';
    els[tipo].innerHTML = h;
  }

  function hero() {
    var d = S.MESI[month], verb = cfg.modo;
    els.hero.className = 'hero';
    els.hero.innerHTML = '<div style="min-width:0"><small>Set point di ' + d.nome + '</small><span class="big tn">' + d.t + ' °C</span><span class="amt">Modalità ' + verb + ' · media del mese ' + String(d.media).replace('.', ',') + ' °C</span></div><div class="wm">' + U.I(emb) + '</div>';
  }

  function nowCard() {
    var el = els.now;
    if (!active) { el.style.display = 'none'; return; }
    var tipo = S.tipoOggi(today), m = today.getMonth() + 1;
    var p = S.at(m, tipo, today.getHours() * 60 + today.getMinutes());
    el.style.display = '';
    el.innerHTML = (p.temp === null ? '<div class="nw off">Spento</div>' : '<div class="nw tn">' + p.temp + ' °C</div>') +
      '<div><b>Adesso · ' + p.label + '</b><small>' + p.hint + '. ' + (tipo === 'we' ? 'Oggi è weekend.' : 'Oggi è un giorno lavorativo.') + ' Se è festivo, guarda il riquadro Weekend.</small></div>';
  }

  function chips() {
    els.chips.innerHTML = cfg.ordine.map(function (m) {
      var d = S.MESI[m];
      return '<button type="button" class="chip" data-m="' + m + '" aria-pressed="' + (m === month) + '" style="--dc:hsl(' + Math.round(U.hueFor(d.media)) + ' 85% 50%)"><i></i>' + d.nome + '</button>';
    }).join('');
  }

  function paint() {
    U.applyHue(U.hueFor(S.MESI[month].media));
    Array.prototype.forEach.call(els.chips.children, function (c) { c.setAttribute('aria-pressed', +c.getAttribute('data-m') === month ? 'true' : 'false'); });
    hero(); nowCard(); card('fer'); card('we');
  }

  function build() {
    var main = document.getElementById('app');
    var other = key === 'inverno' ? ['estate.html', 'Stagione estate', 'sun'] : ['inverno.html', 'Stagione inverno', 'snow'];
    main.innerHTML =
      '<div class="hd"><a class="back" href="index.html">' + U.I('back') + 'Stagioni</a><span class="emb" aria-hidden="true">' + U.I(emb) + '</span></div>' +
      '<div><h1>' + cfg.nome + '</h1><p>Scegli il mese. Accendi il condizionatore (modalità ' + cfg.modo + ') solo quando sei in casa. Spegnilo quando esci e di notte.</p></div>' +
      '<div class="chips" id="chips" role="group" aria-label="Mese"></div>' +
      '<div id="hero"></div><div class="al" id="now" aria-live="polite"></div>' +
      '<section class="card" id="fer"></section><section class="card" id="we"></section>' +
      '<h2>Perché questi valori</h2><section class="card"><ul class="rules">' + perche[key].map(function (r) { return '<li>' + U.I(r[0]) + '<span>' + r[1] + '</span></li>'; }).join('') + '</ul></section>' +
      '<h2>Per farlo bene</h2><section class="card"><ul class="rules">' + regole[key].map(function (r) { return '<li>' + U.I(r[0]) + '<span>' + r[1] + '</span></li>'; }).join('') + '</ul></section>' +
      '<div class="cmds"><a class="cm" href="consigli.html"><i class="ab">' + U.I('bulb') + '</i><b>Consigli di risparmio</b><small>Come spendere il meno possibile</small></a>' +
      (key === 'inverno' ? '<a class="cm" href="spiegazione.html"><i class="ab">' + U.I('bolt') + '</i><b>Perché elettrico e non gas</b><small>Costi a confronto</small></a>' : '<a class="cm" href="' + other[0] + '"><i class="ab">' + U.I(other[2]) + '</i><b>' + other[1] + '</b><small>Temperature da novembre ad aprile</small></a>') + '</div>' +
      '<p class="sm" style="text-align:center;margin-top:8px">Valori indicativi per un appartamento a Roma.</p>';
    els.chips = document.getElementById('chips'); els.hero = document.getElementById('hero'); els.now = document.getElementById('now'); els.fer = document.getElementById('fer'); els.we = document.getElementById('we');
    chips();
    els.chips.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; month = +b.getAttribute('data-m'); paint(); });
    paint(); U.nav(key);
  }
  build();
})();
