(function (root) {
  // Novità: indicazioni che restano finché non vengono cancellate. Il numero rosso compare sulla scheda e, dove il telefono lo permette, sull'icona.
  var KEY = 'clima.novita.v1', CASA = 'clima.casa.v1';
  function ls() { try { return root.localStorage; } catch (e) { return null; } }
  function rd(k, d) { try { return (root.VAULT ? root.VAULT.get(k) : JSON.parse(ls().getItem(k))) || d; } catch (e) { return d; } }
  function stato() { var s = rd(KEY, {}); return { items: s.items || [], visto: s.visto || {}, chiusi: s.chiusi || [], ultima: s.ultima || null }; }
  function salva(s) { try { if (root.VAULT) root.VAULT.set(KEY, s); else ls().setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function stagione(d) {
    var m = d.getMonth() + 1, g = d.getDate();
    if (m === 11 || m === 12 || m <= 3 || (m === 4 && g <= 15)) return 'inverno';
    if (m >= 6 && m <= 9) return 'estate';
    return '-';
  }
  function n4(x) { return Number(x).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 }); }
  function giorni(a, b) { return Math.floor((b - a) / 864e5); }

  // Calcolo puro: aggiunge le nuove indicazioni a st. ctx = { now, mercato, consiglio, report, budget, nomeMese }. Alla prima apertura registra solo il punto di partenza.
  function calcola(st, ctx) {
    var v = st.visto, now = ctx.now, nuovi = [], primo = !st.ultima && !Object.keys(v).length, iso = now.toISOString();
    function add(id, tipo, titolo, testo, href, label) {
      if (st.chiusi.indexOf(id) >= 0 || st.items.some(function (x) { return x.id === id; })) return;
      nuovi.push({ id: id, tipo: tipo, titolo: titolo, testo: testo, data: iso, href: href, label: label });
    }
    if (st.ultima && giorni(new Date(st.ultima), now) > 30) {
      add('assente-' + iso.slice(0, 10), 'assente', 'Bentornato', 'Non aprivi l’app da ' + giorni(new Date(st.ultima), now) + ' giorni. Qui sotto trovi cosa è cambiato nel frattempo.', 'index.html', 'Vai alla home');
    }
    var m = ctx.mercato;
    if (m && m.aggiornato) {
      if (!primo && v.mercato && v.mercato !== m.aggiornato) {
        add('mercato-' + m.aggiornato, 'prezzi', 'Prezzi dell’energia aggiornati', 'Luce da ' + n4(v.luce) + ' a ' + n4(m.luce) + ' €/kWh, gas da ' + n4(v.gas) + ' a ' + n4(m.gas) + ' €/Smc. Controlla se conviene ancora la fonte che usi.', 'energia.html', 'Apri Energia');
      }
      v.mercato = m.aggiornato; v.luce = m.luce; v.gas = m.gas;
    }
    var s = stagione(now);
    if (!primo && v.stagione !== undefined && v.stagione !== s) {
      add('stagione-' + now.getFullYear() + '-' + s, 'stagione',
        s === 'inverno' ? 'Inizia l’inverno' : s === 'estate' ? 'Inizia l’estate' : 'Fuori stagione',
        s === 'inverno' ? 'Da oggi vale il calendario del riscaldamento (fino al 15 aprile). Le temperature da impostare sono nella pagina Inverno.' : s === 'estate' ? 'Da oggi servono le temperature d’estate, con il condizionatore acceso solo quando sei in casa.' : 'Per ora non serve scaldare né raffrescare: accendi solo se davvero necessario.',
        s === 'estate' ? 'estate.html' : 'inverno.html', 'Apri la stagione');
    }
    v.stagione = s;
    var y = now.getFullYear() - 1;
    if (!primo && v.anno && v.anno !== y) add('anno-' + y, 'anno', 'Nuovi dati meteo dell’anno ' + y, 'Per l’opzione "Anno scorso" ora uso le medie del ' + y + ', l’ultimo anno concluso.', 'meteo.html', 'Apri Meteo');
    v.anno = y;
    var r = ctx.report;
    if (r && !primo) add('report-' + r.id, 'report', 'Report di ' + ctx.nomeMese(r.mese), 'Il riepilogo del mese concluso è pronto: spesa stimata e confronto tra le due fonti.', 'energia.html', 'Apri Energia');
    var b = ctx.budget;
    if (b && b.sfora) add('budget-' + now.getFullYear() + '-' + (now.getMonth() + 1), 'budget', 'Budget del mese a rischio', 'La stima di questo mese supera il budget che hai scelto. Nella pagina Energia trovi come rientrare.', 'energia.html', 'Apri Energia');
    var c = ctx.consiglio;
    if (c && c.data) add('consiglio-' + c.data, 'consiglio', 'Conviene passare a ' + (c.verso === 'gas' ? 'gas metano' : 'elettrica'), 'Risparmio stimato circa ' + c.risparmio + ' € al mese. Decidi dalla pagina Energia.', 'energia.html', 'Apri Energia');
    st.items = st.items.concat(nuovi); st.ultima = iso;
    return st;
  }
  // Avvisi condivisi dall'amministratore (ultimi 14 giorni): compaiono come novità, anche al primo accesso.
  function unisci(st, lista) {
    var nuovi = 0;
    (lista || []).forEach(function (a) {
      var id = 'avviso-' + a.id;
      if (st.chiusi.indexOf(id) >= 0 || st.items.some(function (x) { return x.id === id; })) return;
      st.items.push({ id: id, tipo: 'avviso', titolo: String(a.titolo), testo: String(a.testo), data: a.creato, href: /^[a-z]+\.html$/.test(a.href || '') ? a.href : null, label: 'Apri' }); nuovi++;
    });
    return nuovi;
  }
  function conteggio() { return stato().items.length; }
  function rimuovi(id) { var s = stato(); s.items = s.items.filter(function (x) { return x.id !== id; }); if (s.chiusi.indexOf(id) < 0) s.chiusi.push(id); s.chiusi = s.chiusi.slice(-60); salva(s); badge(); notifica(); }
  function notifica() { try { root.dispatchEvent(new Event('novita')); } catch (e) {} }
  // Numero sull'icona, dove il telefono lo consente (app sulla Home con permesso).
  function badge() { try { var n = conteggio(); if (navigator.setAppBadge) { n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); } } catch (e) {} }
  function avvia() {
    var fine = function (mkt) {
      var s = stato(), casa = rd(CASA, {});
      var now = new Date(), ctx = { now: now, mercato: mkt, consiglio: casa.consiglio }, E = root.ENERGIA, S = root.SCHED;
      if (E && S) { try { var st = E.load(), tm = E.tmedDa(S, root.CLIMA, now), pr = E.prezzi(st, mkt); ctx.report = E.report(st, now, tm, pr); ctx.budget = E.budgetInfo(st, now, tm, pr); ctx.nomeMese = function (m) { return S.MESI[m].nome.toLowerCase(); }; } catch (e) {} }
      s = calcola(s, ctx); salva(s); badge(); notifica();
      var SB = root.SB, tok = SB && SB.tok && SB.tok();
      if (tok) SB.rpc('avvisi_elenco', { tok: tok }).then(function (l) { var s2 = stato(); if (unisci(s2, l)) { salva(s2); badge(); notifica(); } }).catch(function () {});
    };
    if (typeof fetch !== 'function') return fine(null);
    fetch('data/mercato.json?v=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(fine);
  }
  root.NOVITA = { stato: stato, salva: salva, calcola: calcola, unisci: unisci, conteggio: conteggio, rimuovi: rimuovi, avvia: avvia, badge: badge, stagione: stagione };
  if (typeof module !== 'undefined') module.exports = root.NOVITA; else avvia();
})(typeof window !== 'undefined' ? window : globalThis);
