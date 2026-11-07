(function () {
  var ICONS = {
    bell: '<path d="M6 16.5V11a6 6 0 1112 0v5.5l1.5 2h-15l1.5-2z"/><path d="M10 20.5a2 2 0 004 0"/>',
    cloud: '<path d="M7 18.5a4 4 0 01-.4-7.98A5.5 5.5 0 0117.2 9.6 4.5 4.5 0 0117.5 18.5H7z"/>',
    rain: '<path d="M7 14.5a4 4 0 01-.4-7.98A5.5 5.5 0 0117.2 5.6 4.5 4.5 0 0117.5 14.5H7z"/><path d="M8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/>',
    cloudsun: '<circle cx="8.5" cy="8.5" r="3"/><path d="M8.5 2.5v1.2M2.5 8.5h1.2M4.3 4.3l.9.9M12.7 4.3l-.9.9"/><path d="M9 20a3.5 3.5 0 01-.3-7 4.8 4.8 0 019.2 1A3.5 3.5 0 0117.5 20H9z"/>',
    fog: '<path d="M5 9h14M3 13h18M6 17h12"/>',
    thunder: '<path d="M7 13.5a4 4 0 01-.4-7.98A5.5 5.5 0 0117.2 4.6 4.5 4.5 0 0117.5 13.5"/><path d="M12.5 11l-3 5h3l-1 4 4-6h-3l1-3z"/>',
    flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 .3 1.2 1 2 2 2 0-3-.5-5 1-8z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
    pin: '<path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 10-13 0c0 5 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/><path d="M9.5 4.8L12 7.3l2.5-2.5M9.5 19.2L12 16.7l2.5 2.5M3.6 11.2l3.4-.9.9 3.4M20.4 11.2l-3.4-.9-.9 3.4M3.6 12.8l3.4.9.9-3.4M20.4 12.8l-3.4.9-.9-3.4" stroke-width="1.5"/>',
    sun: '<circle cx="12" cy="12" r="4.3"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3L7 7M17 17l1.7 1.7M5.3 18.7L7 17M17 7l1.7-1.7"/>',
    home: '<path d="M3.5 11L12 3.5l8.5 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
    bulb: '<path d="M9.5 18.5h5M10.5 21h3"/><path d="M12 3.5a6 6 0 00-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0012 3.5z"/>',
    back: '<path d="M15 5l-7 7 7 7"/>', chev: '<path d="M9 5l7 7-7 7"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', power: '<path d="M12 3.5v8"/><path d="M7 6.8a7.5 7.5 0 1010 0"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z"/>', filter: '<path d="M4 6h16l-6 7.5V19l-4 1.5v-7L4 6z"/>',
    door: '<rect x="6" y="3.5" width="12" height="17" rx="2"/><path d="M14.5 12v.01"/>', window: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M12 4v16M4 12h16"/>',
    fan: '<circle cx="12" cy="12" r="1.8"/><path d="M12 10.2C12 6 14 4 16 4.5c1.5.5 1.2 3-1.2 4.6M13.8 12c4.2 0 6.2 2 5.7 4-.5 1.5-3 1.2-4.6-1.2M12 13.8c0 4.2-2 6.2-4 5.7-1.5-.5-1.2-3 1.2-4.6M10.2 12C6 12 4 10 4.5 8c.5-1.5 3-1.2 4.6 1.2"/>',
    drop: '<path d="M12 3.5s6 6.2 6 10.5a6 6 0 01-12 0c0-4.3 6-10.5 6-10.5z"/>', moon: '<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/>',
    euro: '<path d="M17.5 7.5A6.5 6.5 0 007 10m0 4a6.5 6.5 0 0010.5 2.5M5 10.5h8M5 13.5h8"/>', eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    thermo: '<path d="M10 14.5V5a2 2 0 014 0v9.5a4 4 0 11-4 0z"/><path d="M12 9v7"/>', shield: '<path d="M12 3.5l7 2.5v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6l7-2.5z"/>'
  };
  // Tempo da codice WMO (Open-Meteo): icona e descrizione.
  function meteo(code, notte) {
    var c = +code;
    if (c === 0) return notte ? { i: 'moon', t: 'Sereno' } : { i: 'sun', t: 'Soleggiato' };
    if (c === 1) return notte ? { i: 'moon', t: 'Quasi sereno' } : { i: 'sun', t: 'Quasi sereno' };
    if (c === 2) return { i: 'cloudsun', t: 'Variabile' };
    if (c === 3) return { i: 'cloud', t: 'Coperto' };
    if (c === 45 || c === 48) return { i: 'fog', t: 'Nebbia' };
    if (c >= 51 && c <= 57) return { i: 'rain', t: 'Pioggerella' };
    if (c >= 61 && c <= 67) return { i: 'rain', t: 'Pioggia' };
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return { i: 'snow', t: 'Neve' };
    if (c >= 80 && c <= 82) return { i: 'rain', t: 'Rovesci' };
    if (c >= 95) return { i: 'thunder', t: 'Temporale' };
    return { i: 'cloud', t: 'Nuvoloso' };
  }
  function I(n) { return '<svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + '</svg>'; }

  // Colore del mese: freddo = blu, caldo = arancio (salta il giallo, illeggibile con testo bianco).
  var STOPS = [[7.5, 218], [11, 195], [14, 168], [17, 150], [21, 42], [24.6, 22], [26, 8]];
  function hueFor(t) {
    if (t <= STOPS[0][0]) return STOPS[0][1];
    for (var i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) { var a = STOPS[i - 1], b = STOPS[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
    return STOPS[STOPS.length - 1][1];
  }
  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark') return true; if (t === 'light') return false;
    return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  }
  var H = 215;
  function w(x) { return ((Math.round(x) % 360) + 360) % 360; }
  function applyHue(h) {
    H = h; var d = isDark(), r = document.documentElement, st = r.style;
    r.classList.toggle('dk', d);
    st.setProperty('--h', w(h));
    st.setProperty('--g1', 'hsl(' + w(h) + ' 82% 44%)'); st.setProperty('--g2', 'hsl(' + w(h - 16) + ' 80% 38%)'); st.setProperty('--g3', 'hsl(' + w(h - 34) + ' 76% 32%)');
    st.setProperty('--pri', d ? 'hsl(' + w(h) + ' 92% 68%)' : 'hsl(' + w(h) + ' 86% 34%)');
    var L = d ? [26, 22, 24, 20] : [78, 82, 84, 80], S = d ? [60, 55, 60, 50] : [92, 88, 90, 70];
    [0, 40, -35, 80].forEach(function (o, i) { st.setProperty('--o' + (i + 1), 'hsl(' + w(h + o) + ' ' + S[i] + '% ' + L[i] + '%)'); });
    st.setProperty('--bg', d ? 'hsl(' + w(h) + ' 35% 6%)' : 'hsl(' + w(h) + ' 45% 96%)');
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = d ? '#07070d' : '#eef0f8';
  }
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { applyHue(H); }); } catch (e) {}

  var navAct = null;
  function nav(a) {
    navAct = a; var old = document.querySelector('nav.tabs'); if (old) old.remove();
    var n = window.NOVITA ? window.NOVITA.conteggio() : 0;
    var t = [['home', 'index.html', 'Stagioni', 'home'], ['inverno', 'inverno.html', 'Inverno', 'snow'], ['estate', 'estate.html', 'Estate', 'sun'], ['meteo', 'meteo.html', 'Meteo', 'cloudsun'], ['energia', 'energia.html', 'Energia', 'bolt']];
    if (n) t.push(['novita', 'novita.html', 'Novit\u00e0', 'bell', n]);
    var el = document.createElement('nav'); el.className = 'tabs'; el.setAttribute('aria-label', 'Sezioni');
    el.innerHTML = t.map(function (x) { return '<a href="' + x[1] + '"' + (a === x[0] ? ' class="on" aria-current="page"' : '') + '><span>' + I(x[3]) + (x[4] ? '<b class="bdg" aria-label="' + x[4] + ' novit\u00e0">' + x[4] + '</b>' : '') + '</span>' + x[2] + '</a>'; }).join('');
    document.body.appendChild(el);
  }
  // Quando cambiano le novità la barra si ridisegna da sola.
  window.addEventListener('novita', function () { if (navAct !== null) nav(navAct); });
  window.UI = { meteo: meteo, I: I, hueFor: hueFor, applyHue: applyHue, nav: nav };
})();
