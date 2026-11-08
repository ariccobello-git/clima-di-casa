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
    return big + '<div><b>' + tit + '</b><small>' + txt + '</small>' + (acts.length ? '<ul class="acts">' + acts.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ul>' : '') + '</div>';
  }
  // Quale fonte conviene nel mese (solo inverno: d'estate si raffresca sempre con l'elettricità).
  function conv(x) {
    var S = x.S, E = root.ENERGIA, C = root.CLIMA, d = S.MESI[x.month], today = x.today;
    if (x.key !== 'inverno') return '<div class="nw tn">⚡</div><div><b>In estate si rinfresca con l’elettricità</b><small>Il condizionatore in Freddo è la scelta giusta: il gas qui non c’entra.</small></div>';
    if (E.INV.indexOf(x.month) < 0) return '<div class="nw off">—</div><div><b>In ' + d.nome.toLowerCase() + ' non serve scaldare</b></div>';
    var st = E.load(), tm = E.tmedDa(S, C, today), pr = E.prezzi(st, x.mkt), k = E.costi(E.caloreMese(st, x.month, tm), tm(x.month), pr);
    var best = k.elettrica <= k.gas ? 'elettrica' : 'gas', v = E.verdetto(st.fonte, k), b = E.etichetta(best), us = E.etichetta(st.fonte);
    var eur = function (n) { return Math.round(n) + ' €'; };
    return '<div class="nw tn">' + b.sym + '</div><div><b>In ' + d.nome.toLowerCase() + ' conviene: ' + b.nome.toLowerCase() + '</b>' +
      '<small>Costo per scaldare nel mese: gas ' + eur(k.gas) + ', elettrica ' + eur(k.elettrica) + '.</small>' +
      (v.cambia ? '<small class="warn">Stai usando ' + us.nome.toLowerCase() + ': passando a ' + E.etichetta(v.verso).nome.toLowerCase() + ' risparmi circa ' + eur(v.risparmio) + ' al mese.</small>'
        : '<small class="good">Stai già usando la fonte giusta.</small>') + '</div>';
  }
  root.AZIONE = { azione: azione, conv: conv };
})(typeof window !== 'undefined' ? window : globalThis);
