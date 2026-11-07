(function (root) {
  var KEY = 'clima.v1';
  var STILI = {
    risparmio:  { nome: 'Risparmio',  w: -1, s: 1,  d: 'Un grado in meno d’inverno e uno in più d’estate.' },
    bilanciato: { nome: 'Bilanciato', w: 0,  s: 0,  d: 'I valori standard.' },
    comfort:    { nome: 'Comfort',    w: 1,  s: -1, d: 'Un grado in più d’inverno e uno in meno d’estate.' }
  };
  var DEF = { luoghi: [], attivo: null, fonte: 'storico', stile: 'bilanciato' };
  var api = {
    STILI: STILI,
    getJson: function (url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); },
    store: function () { try { return root.localStorage; } catch (e) { return null; } }
  };
  function rd(k) { try { return JSON.parse(api.store().getItem(k)); } catch (e) { return null; } }
  function wr(k, v) { try { api.store().setItem(k, JSON.stringify(v)); } catch (e) {} }
  api.load = function () { var s = rd(KEY) || {}; var o = {}; for (var k in DEF) o[k] = s[k] !== undefined ? s[k] : DEF[k]; o.luoghi = o.luoghi || []; if (o.fonte === 'nessuno') o.fonte = 'storico'; return o; };
  api.save = function (s) { wr(KEY, s); };
  api.luogo = function (s) { s = s || api.load(); return s.luoghi.filter(function (l) { return l.id === s.attivo; })[0] || null; };
  api.casa = function (s) { s = s || api.load(); return s.luoghi.filter(function (l) { return l.casa; })[0] || null; };
  // Aggiunge un luogo e lo rende attivo. Se casa=true diventa il riferimento standard (l'altra casa perde il flag).
  api.aggiungi = function (s, p, casa) {
    var id = 'l' + p.lat.toFixed(3) + '_' + p.lon.toFixed(3);
    s.luoghi = s.luoghi.filter(function (l) { return l.id !== id; });
    if (casa) s.luoghi.forEach(function (l) { l.casa = false; });
    s.luoghi.push({ id: id, nome: p.nome, lat: p.lat, lon: p.lon, casa: !!casa });
    s.attivo = id; return s;
  };
  api.rimuovi = function (s, id) {
    s.luoghi = s.luoghi.filter(function (l) { return l.id !== id; });
    if (s.attivo === id) { var c = api.casa(s); s.attivo = c ? c.id : (s.luoghi[0] ? s.luoghi[0].id : null); }
    return s;
  };

  // Set point = base del mese + stile, corretto dal meteo {mean, max} (°C esterni). Ritorna {t, motivo}; t null = spento.
  api.ottimizza = function (base, stagione, stile, w) {
    var st = STILI[stile] || STILI.bilanciato, t = base + (stagione === 'inverno' ? st.w : st.s), motivo = '';
    if (w && isFinite(w.mean) && isFinite(w.max)) {
      if (stagione === 'inverno') {
        if (w.mean >= 16) return { t: null, motivo: 'Fuori è mite (' + Math.round(w.mean) + ' °C): non serve riscaldare.' };
        if (w.mean >= 13) { t -= 1; motivo = 'Fuori è mite: un grado in meno basta.'; }
        else if (w.mean <= 4) motivo = 'Fuori è molto freddo: serve più tempo per scaldare.';
      } else {
        if (w.max <= 26) return { t: null, motivo: 'Fuori non fa caldo (max ' + Math.round(w.max) + ' °C): apri le finestre.' };
        if (w.max >= 35) { t += 1; motivo = 'Caldo estremo (' + Math.round(w.max) + ' °C): un grado in più per non esagerare.'; }
        else if (w.max <= 30) { t += 1; motivo = 'Caldo moderato: un grado in più basta.'; }
      }
    }
    var lo = stagione === 'inverno' ? 17 : 24, hi = stagione === 'inverno' ? 22 : 29;
    return { t: Math.max(lo, Math.min(hi, t)), motivo: motivo };
  };

  // Medie mensili dai dati giornalieri: {mese: {mean, max, n}} con mean = media di (tmax+tmin)/2, max = media delle massime.
  api.statMesi = function (d) {
    var acc = {};
    for (var i = 0; i < d.time.length; i++) {
      var a = d.temperature_2m_max[i], b = d.temperature_2m_min[i]; if (a == null || b == null) continue;
      var m = +d.time[i].slice(5, 7); var o = acc[m] || (acc[m] = { s: 0, x: 0, n: 0 });
      o.s += (a + b) / 2; o.x += a; o.n++;
    }
    var r = {}; for (var k in acc) r[k] = { mean: acc[k].s / acc[k].n, max: acc[k].x / acc[k].n, n: acc[k].n };
    return r;
  };
  // Ultimo anno solare concluso: si aggiorna da solo ogni anno.
  api.annoScorso = function (now) { return (now || new Date()).getFullYear() - 1; };

  function key(l, y) { return 'clima.st.' + l.lat.toFixed(2) + '.' + l.lon.toFixed(2) + '.' + y; }
  api.storico = function (l, now) {
    var y = api.annoScorso(now), c = rd(key(l, y));
    if (c) return Promise.resolve({ anno: y, mesi: c, cache: true });
    var u = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + l.lat + '&longitude=' + l.lon + '&start_date=' + y + '-01-01&end_date=' + y + '-12-31&daily=temperature_2m_max,temperature_2m_min&timezone=auto';
    return api.getJson(u).then(function (j) { var m = api.statMesi(j.daily); wr(key(l, y), m); return { anno: y, mesi: m }; });
  };
  // Adesso: temperatura, percepita, umidità, tempo (codice WMO), pioggia. Giorni: previsioni di oggi e dei due successivi.
  api.live = function (l, now) {
    var k = 'clima.live2.' + l.lat.toFixed(2) + '.' + l.lon.toFixed(2), c = rd(k), t = (now || new Date()).getTime();
    if (c && t - c.t < 1800000) return Promise.resolve(c.v);
    var u = 'https://api.open-meteo.com/v1/forecast?latitude=' + l.lat + '&longitude=' + l.lon + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,precipitation&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&forecast_days=3&timezone=auto';
    return api.getJson(u).then(function (j) {
      var q = j.current || {}, d = j.daily;
      var v = { adesso: { t: q.temperature_2m, app: q.apparent_temperature, um: q.relative_humidity_2m, code: q.weather_code, notte: q.is_day === 0, prec: q.precipitation },
        giorni: d.time.map(function (x, i) { var a = d.temperature_2m_max[i], b = d.temperature_2m_min[i]; return { data: x, max: a, min: b, mean: (a + b) / 2, code: d.weather_code && d.weather_code[i], pp: d.precipitation_probability_max && d.precipitation_probability_max[i] }; }) };
      wr(k, { t: t, v: v }); return v;
    }).catch(function (e) { if (c) return c.v; throw e; });
  };
  // Medie dell'anno scorso già scaricate (nessuna rete): servono per il consiglio elettrico/gas.
  api.statCache = function (l, now) { return l ? rd(key(l, api.annoScorso(now))) : null; };

  // Calcola i set point di tutti i mesi e li mette in SCHED.ov. Ritorna info per la pagina.
  api.applica = function (S, now) {
    now = now || new Date();
    var st = api.load(), l = api.luogo(st), info = { stile: st.stile, fonte: st.fonte, luogo: l, motivi: {} };
    Object.keys(S.ov).forEach(function (k) { delete S.ov[k]; });
    function calc(w, soloMese) {
      Object.keys(S.MESI).forEach(function (m) {
        var d = S.MESI[m], x = (w && (!soloMese || +m === soloMese)) ? w(+m) : null, r = api.ottimizza(d.t, d.s, st.stile, x);
        S.ov[m] = r.t; if (r.motivo) info.motivi[m] = r.motivo;
      });
    }
    if (!l || st.fonte === 'nessuno') { calc(null); return Promise.resolve(info); }
    if (st.fonte === 'storico') return api.storico(l, now).then(function (r) { info.anno = r.anno; calc(function (m) { return r.mesi[m]; }); return info; });
    return api.live(l, now).then(function (v) { info.live = v; var oggi = v.giorni[0], mm = now.getMonth() + 1; calc(function () { return oggi; }, mm); return info; });
  };

  // Ricerca luogo: indirizzi (con numero civico) via Nominatim, nomi di città via Open-Meteo, poi Nominatim come ripiego.
  api.cerca = function (q) {
    function nom() { return api.getJson('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=it&q=' + encodeURIComponent(q)).then(function (r) { return r[0] ? { nome: r[0].display_name.split(',').slice(0, 3).join(',').trim(), lat: +r[0].lat, lon: +r[0].lon } : null; }); }
    function om() { return api.getJson('https://geocoding-api.open-meteo.com/v1/search?count=1&language=it&name=' + encodeURIComponent(q)).then(function (j) { var r = j.results && j.results[0]; return r ? { nome: r.name + (r.admin1 ? ', ' + r.admin1 : ''), lat: r.latitude, lon: r.longitude } : null; }); }
    var first = /\d/.test(q) || /,/.test(q) ? nom : om, second = first === nom ? om : nom;
    return first().then(function (r) { return r || second(); });
  };
  api.nomeDa = function (lat, lon) {
    return api.getJson('https://nominatim.openstreetmap.org/reverse?format=json&zoom=14&accept-language=it&lat=' + lat + '&lon=' + lon).then(function (r) {
      var a = r.address || {}; return a.city || a.town || a.village || a.municipality || 'Posizione attuale';
    }).catch(function () { return 'Posizione attuale'; });
  };
  root.CLIMA = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
