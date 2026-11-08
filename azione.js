(function (root) {
  // Suggerimento istantaneo (cosa fare adesso) e convenienza della fonte di energia nel mese.
  // ctx: { S, key, sis, today, tf (°C fuori, ora o media del mese), stile }
  function azione(x) {
    var S = x.S, today = x.today, key = x.key, sis = x.sis, stile = x.stile || 'bilanciato', tf = x.tf;
    var tipo = S.tipoOggi(today), m = today.getMonth() + 1;
    var p = S.at(m, tipo, today.getHours() * 60 + today.getMinutes(), sis), t = p.temp;
    var inv = key === 'inverno', caldaia = sis === 'caldaia', big, tit, txt, acts = [];
    if (t === null) {
      big = '<div class="nw off">Spento</div>'; tit = 'Adesso tieni spento'; txt = p.hint + '.';
      if (!inv && tf < 26) acts.push('Fuori ci sono ' + tf + ' °C: apri le finestre e fai entrare il fresco.');
    } else if (p.rid) {
      big = '<div class="nw off">' + t + ' °C</div>'; tit = 'Abbassa il termostato a ' + t + ' °C'; txt = 'Non spegnerlo: così la casa non si raffredda troppo.';
    } else if (inv && tf >= 17) {
      big = '<div class="nw off">Spento</div>'; tit = 'Non serve scaldare'; txt = 'Fuori ci sono ' + tf + ' °C: la casa si mantiene da sola.';
      acts.push('Apri le finestre per 5 minuti e poi richiudi.');
    } else if (!inv && tf < 26) {
      big = '<div class="nw off">Spento</div>'; tit = 'Non serve rinfrescare'; txt = 'Fuori ci sono ' + tf + ' °C.';
      acts.push('Apri le finestre per far entrare il fresco.');
    } else if (inv) {
      big = '<div class="nw tn">' + t + ' °C</div>';
      tit = caldaia ? 'Imposta il termostato a ' + t + ' °C' : 'Accendi il condizionatore in Caldo a ' + t + ' °C';
      txt = 'Fuori ci sono ' + tf + ' °C.';
      if (stile === 'risparmio') acts.push('Se hai freddo, metti un maglione prima di alzare la temperatura.', 'Spegni 15 minuti prima di uscire o di andare a letto.');
      else if (stile === 'comfort') acts.push('Accendi 15 minuti prima di rientrare, così trovi già caldo.', 'Se hai ancora freddo, sali di 1 °C ma non oltre ' + (t + 1) + ' °C.');
      else acts.push(caldaia ? 'Lascia che sia il termostato a regolare la caldaia.' : 'Ventola in automatico, niente Turbo.', 'Spegni 10 minuti prima di uscire o di andare a letto.');
      if (tf <= 5) acts.push('Fa molto freddo: tieni porte e finestre chiuse, ci vorrà più tempo per scaldare.');
    } else {
      big = '<div class="nw tn">' + t + ' °C</div>'; tit = 'Accendi il condizionatore in Freddo a ' + t + ' °C'; txt = 'Fuori ci sono ' + tf + ' °C.';
      acts.push('Chiudi le tapparelle dal lato del sole.');
      if (stile === 'risparmio') acts.push('Con un ventilatore acceso resti bene anche a ' + t + ' °C.');
      else if (stile === 'comfort') acts.push('Accendi 15 minuti prima di rientrare e non scendere sotto ' + t + ' °C.');
      else acts.push('Ventola in automatico, niente Turbo.');
      if (tf >= 32) acts.push('Caldo forte: tieni le tapparelle chiuse fin dalla mattina.');
    }
    var I = root.UI ? root.UI.I : function () { return ''; };
    var big2 = t === null ? '<div class="ftp off">' + I('power') + '</div>' : '<div class="ftp' + (p.rid ? ' rid' : '') + '"><b>' + t + '</b><i>°C</i></div>';
    var pill = function (c) { return '<span class="bd">' + c + '</span>'; };
    var STN = { risparmio: 'Risparmio', bilanciato: 'Bilanciato', comfort: 'Comfort' };
    return '<div class="fh"><span class="fl"><i class="dot"></i>Cosa fare ora</span><span class="fo">' + p.label + '</span></div>' +
      '<div class="fm"><div class="ftx"><b>' + tit + '</b><small>' + txt + '</small></div>' + big2 + '</div>' +
      (acts.length ? '<ul class="fa">' + acts.map(function (a) { return '<li><span class="ck">' + I('check') + '</span><span>' + a + '</span></li>'; }).join('') + '</ul>' : '') +
      '<div class="fp">' + (x.key === 'inverno' ? pill(caldaia ? I('flame') + 'Caldaia' : I('bolt') + 'Condizionatore') : pill(I('bolt') + 'Condizionatore')) + pill(STN[stile] || 'Bilanciato') + pill(x.live ? 'Meteo live' : 'Anno ' + x.anno) + '</div>';
  }
  // Quale fonte conviene nel mese (solo inverno: d'estate si raffresca sempre con l'elettricità). Card per la home.
  function conv(x) {
    var S = x.S, E = root.ENERGIA, C = root.CLIMA, I = root.UI.I, d = S.MESI[x.month], today = x.today;
    var link = function (inner) { return '<a class="enc" href="energia.html">' + inner + '<span class="go" aria-hidden="true">' + I('chev') + '</span></a>'; };
    if (x.key !== 'inverno') return link('<span class="eic">' + I('bolt') + '</span><div class="etx"><small>Energia</small><b>In estate si rinfresca con l’elettricità</b><small>Il condizionatore in Freddo è la scelta giusta.</small></div>');
    if (E.INV.indexOf(x.month) < 0) return link('<span class="eic">' + I('flame') + '</span><div class="etx"><small>Energia</small><b>In ' + d.nome.toLowerCase() + ' non serve scaldare</b></div>');
    var st = E.load(), tm = E.tmedDa(S, C, today), pr = E.prezzi(st, x.mkt), k = E.costi(E.caloreMese(st, x.month, tm), tm(x.month), pr);
    var elBest = k.elettrica <= k.gas, best = elBest ? 'elettrica' : 'gas', v = E.verdetto(st.fonte, k), b = E.etichetta(best), us = E.etichetta(st.fonte);
    var mx = Math.max(k.gas, k.elettrica, 1), eur = function (n) { return Math.round(n) + ' €'; };
    var row = function (ic, nome, val, win) { return '<div class="er' + (win ? ' win' : '') + '"><span class="en">' + I(ic) + nome + '</span><span class="eb"><i style="width:' + Math.max(8, Math.round(val / mx * 100)) + '%"></i></span><span class="ev tn">' + eur(val) + '</span></div>'; };
    var stato = v.cambia ? '<span class="est warn">' + I('bolt') + 'Stai usando ' + us.nome.toLowerCase() + ': passando a ' + E.etichetta(v.verso).nome.toLowerCase() + ' risparmi circa ' + eur(v.risparmio) + ' al mese.</span>'
      : '<span class="est good">' + I('check') + 'Stai già usando la fonte giusta.</span>';
    return link('<span class="eic">' + I(elBest ? 'bolt' : 'flame') + '</span><div class="etx"><small>Energia · ' + d.nome + '</small><b>' + (elBest ? 'Conviene l’elettrico' : 'Conviene il gas') + '</b>' +
      '<div class="ebars">' + row('bolt', 'Elettrico', k.elettrica, elBest) + row('flame', 'Gas metano', k.gas, !elBest) + '</div>' + stato + '</div>');
  }
  root.AZIONE = { azione: azione, conv: conv };
})(typeof window !== 'undefined' ? window : globalThis);
