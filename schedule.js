(function (root) {
  // Conduzione puntuale: acceso solo quando c'è qualcuno in casa, spento fuori casa e di notte.
  // media = temperatura media del mese a Roma (clima 1991-2020), usata solo per il colore della pagina.
  var SEASONS = {
    inverno: { nome: 'Inverno', modo: 'Caldo', ordine: [11, 12, 1, 2, 3, 4] },
    estate:  { nome: 'Estate',  modo: 'Freddo', ordine: [6, 7, 8, 9] }
  };
  var MESI = {
    11: { nome: 'Novembre', corto: 'Nov', s: 'inverno', media: 12.0, t: 19 },
    12: { nome: 'Dicembre', corto: 'Dic', s: 'inverno', media: 8.5,  t: 20 },
    1:  { nome: 'Gennaio',  corto: 'Gen', s: 'inverno', media: 7.5,  t: 20, nota: 'È il mese più freddo: dopo l\u2019accensione servono anche 45 minuti per sentire caldo.' },
    2:  { nome: 'Febbraio', corto: 'Feb', s: 'inverno', media: 8.3,  t: 20 },
    3:  { nome: 'Marzo',    corto: 'Mar', s: 'inverno', media: 10.8, t: 19 },
    4:  { nome: 'Aprile',   corto: 'Apr', s: 'inverno', media: 13.7, t: 19, nota: 'Fino al 15 aprile. Accendi solo se serve.' },
    6:  { nome: 'Giugno',   corto: 'Giu', s: 'estate',  media: 21.8, t: 26, nota: 'Le sere sono già calde: giugno 2025 è stato circa 4 \u00b0C sopra la media.' },
    7:  { nome: 'Luglio',   corto: 'Lug', s: 'estate',  media: 24.6, t: 27 },
    8:  { nome: 'Agosto',   corto: 'Ago', s: 'estate',  media: 25.5, t: 27, nota: 'È il mese più caldo: tieni le persiane chiuse sul lato sole.' },
    9:  { nome: 'Settembre', corto: 'Set', s: 'estate', media: 21.4, t: 26, nota: 'Con più umidità prova la modalità Deumidifica.' }
  };
  var ov = {}; // set point calcolati col meteo: mese -> gradi (null = non serve)
  var P = { gas: 1.357, luce: 0.2807, kwhPerSmc: 11.109, eff: 0.9, caldo: 3000 };

  function fmt(m) { m = m % 1440; var h = Math.floor(m / 60), mm = m % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; }

  var NOTTE = 'Spegni 20 minuti prima di andare a letto';

  // Fasce da mezzanotte a mezzanotte (temp null = spento).
  function phases(month, tipo) {
    var d = MESI[month], t = (month in ov) ? ov[month] : d.t;
    if (d.s === 'inverno') {
      if (tipo === 'we') return [
        { from: 0, to: 450, label: 'Notte', temp: null, hint: 'Spento mentre dormi' },
        { from: 450, to: 1380, label: 'In casa', temp: t, hint: 'Accendi quando ti alzi, spegni se esci' },
        { from: 1380, to: 1440, label: 'Notte', temp: null, hint: NOTTE }
      ];
      return [
        { from: 0, to: 420, label: 'Notte', temp: null, hint: 'Spento mentre dormi' },
        { from: 420, to: 480, label: 'Mattina', temp: t, hint: 'Accendi quando ti alzi, spegni quando esci' },
        { from: 480, to: 1020, label: 'Fuori casa', temp: null, hint: 'Tutto spento' },
        { from: 1020, to: 1380, label: 'Sera', temp: t, hint: 'Accendi appena rientri' },
        { from: 1380, to: 1440, label: 'Notte', temp: null, hint: NOTTE }
      ];
    }
    if (tipo === 'we') return [
      { from: 0, to: 480, label: 'Notte', temp: null, hint: 'Spento mentre dormi' },
      { from: 480, to: 660, label: 'Mattina', temp: null, hint: 'Spento: finestre aperte, il fresco entra' },
      { from: 660, to: 1380, label: 'In casa', temp: t, hint: 'Accendi quando fa caldo, spegni se esci' },
      { from: 1380, to: 1440, label: 'Notte', temp: null, hint: NOTTE }
    ];
    return [
      { from: 0, to: 420, label: 'Notte', temp: null, hint: 'Spento mentre dormi' },
      { from: 420, to: 1020, label: 'Mattina e fuori casa', temp: null, hint: 'Spento: finestre aperte al mattino, persiane chiuse quando esci' },
      { from: 1020, to: 1380, label: 'Sera', temp: t, hint: 'Accendi appena rientri' },
      { from: 1380, to: 1440, label: 'Notte', temp: null, hint: NOTTE }
    ];
  }

  // Elenco leggibile: la notte è una sola riga che attraversa la mezzanotte.
  function lista(month, tipo) {
    var ph = phases(month, tipo), rows = ph.slice(1, -1).slice();
    rows.push({ from: ph[ph.length - 1].from, to: ph[0].to, label: 'Notte', temp: null, hint: NOTTE });
    return rows;
  }

  function at(month, tipo, minute) {
    var ph = phases(month, tipo);
    for (var i = 0; i < ph.length; i++) if (minute >= ph[i].from && minute < ph[i].to) return ph[i];
    return ph[ph.length - 1];
  }

  // Stagione in corso: inverno dal 1 novembre al 15 aprile, estate da giugno a settembre; altrimenti null.
  function stagioneOggi(date) {
    var m = date.getMonth() + 1, d = date.getDate();
    if (m === 11 || m === 12 || m === 1 || m === 2 || m === 3 || (m === 4 && d <= 15)) return 'inverno';
    if (m >= 6 && m <= 9) return 'estate';
    return null;
  }
  function tipoOggi(date) { var g = date.getDay(); return (g === 0 || g === 6) ? 'we' : 'fer'; }

  function costoGasKwh() { return P.gas / (P.kwhPerSmc * P.eff); }
  function costoPompaKwh(cop) { return P.luce / cop; }
  function pareggio() { return P.luce / costoGasKwh(); }
  function annuale(cop) {
    var kwhEl = P.caldo / cop;
    return { gas: costoGasKwh() * P.caldo, pompa: kwhEl * P.luce, kwhEl: kwhEl };
  }

  root.SCHED = { ov: ov, setPoint: function (m) { return (m in ov) ? ov[m] : MESI[m].t; }, SEASONS: SEASONS, MESI: MESI, P: P, fmt: fmt, phases: phases, lista: lista, at: at,
    stagioneOggi: stagioneOggi, tipoOggi: tipoOggi, costoGasKwh: costoGasKwh, costoPompaKwh: costoPompaKwh, pareggio: pareggio, annuale: annuale };
  if (typeof module !== 'undefined') module.exports = root.SCHED;
})(typeof window !== 'undefined' ? window : globalThis);
