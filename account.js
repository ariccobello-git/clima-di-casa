(function () {
  var SB = window.SB, U = window.UI, app = document.getElementById('app');
  var me = SB.me() || { nome: '', admin: false }, users = null, st = { msg: '', bad: false, open: null, nuova: null, conf: null, add: { nome: '', tel: '+39 ', pwd: '' }, av: { t: '', x: '' }, avm: '', inv: null, pm: '', pbad: false };
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function gen() { var a = new Uint32Array(1); (window.crypto || window.msCrypto).getRandomValues(a); return String(a[0] % 1000000).padStart(6, '0'); }
  // Invito su WhatsApp: si apre WhatsApp con il messaggio già scritto, l'amministratore preme Invia. Funziona solo con nome, numero e password appena creati.
  function invito(nome, tel, pwd) {
    var url = new URL('accesso.html', location.href).href.split('?')[0].split('#')[0] + '?u=' + encodeURIComponent(nome);
    var t = 'Ciao ' + nome + ', ti ho creato un account su Snug Save: l\u2019app che ti dice a quanti gradi impostare condizionatore e caldaia, mese per mese.\n\n1) Apri questo link: ' + url + '\n2) Entra con la password: ' + pwd + '\n3) Per averla come app: tocca Condividi, poi Aggiungi alla schermata Home.\n\nPuoi cambiare la password da Account.';
    return 'https://wa.me/' + String(tel || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(t);
  }
  function waCodice(u) {
    var t = 'Ciao ' + u.nome + ', il tuo codice per reimpostare la password di Snug Save è ' + u.codice + '. Vale 15 minuti: inseriscilo nella pagina di accesso insieme alla nuova password.';
    return 'https://wa.me/' + String(u.telefono || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(t);
  }
  function say(t, bad) { st.msg = t; st.bad = !!bad; st.pm = ''; render(); }
  function pw(t, bad) { st.pm = t; st.pbad = !!bad; render(); }
  function msg() { return st.msg ? '<p class="' + (st.bad ? 'err' : 'ok') + '" role="status">' + esc(st.msg) + '</p>' : ''; }
  var E = { nome: 'Nome da 2 a 30 caratteri.', password: 'La password deve avere 6 cifre.', telefono: 'Numero non valido: serve il prefisso, per esempio +39…', esistente: 'Esiste già un account con questo nome.', se_stesso: 'Non puoi eliminare il tuo account.', vecchia: 'La password attuale non è corretta.', formato: 'La nuova password deve avere 6 cifre.', sessione: 'Sessione scaduta: accedi di nuovo.', uguale: 'La nuova password deve essere diversa da quella attuale.' };

  function lista() {
    if (!users) return '<p class="sm">Carico…</p>';
    return '<ul class="lst">' + users.map(function (u) {
      var h = '<li style="flex-wrap:wrap"><span><strong>' + esc(u.nome) + (u.admin ? ' · Admin' : '') + '</strong><span class="wh">' + esc(u.telefono) + (u.bloccato ? ' · <b style="color:#c0392b">Bloccato</b>' : '') + '</span>' +
        (u.codice ? '<span class="wh">Richiesta reset: codice <b class="tn">' + esc(u.codice) + '</b> da comunicare</span><a class="btn sm2" href="' + waCodice(u) + '" target="_blank" rel="noopener">Invia codice su WhatsApp</a>' : '') + '</span>' +
        '<span class="rw">' + (u.bloccato ? '<button class="chip" data-a="sblocca" data-id="' + u.id + '">Sblocca</button>' : '') +
        '<button class="chip" data-a="pwd" data-id="' + u.id + '">Nuova password</button><button class="chip" data-a="tel" data-id="' + u.id + '">Telefono</button>' +
        (u.nome === me.nome ? '' : '<button class="chip" data-a="del" data-id="' + u.id + '">' + (st.conf === u.id ? 'Conferma elimina' : 'Elimina') + '</button>') + '</span>';
      if (st.nuova && st.nuova.id === u.id) h += '<div style="flex-basis:100%"><p class="ok">Nuova password di ' + esc(u.nome) + ': <span class="cd">' + esc(st.nuova.p) + '</span><br><a class="btn sm2" href="' + invito(u.nome, u.telefono, st.nuova.p) + '" target="_blank" rel="noopener">Invia su WhatsApp</a><br><span class="wh">Comunicala all’utente. Non verrà più mostrata. Con una nuova password i dati personali salvati sul suo telefono (casa, indirizzo, prezzi) vanno reinseriti.</span></p></div>';
      if (st.open === u.id) h += '<div style="flex-basis:100%"><input class="in" id="nt" type="tel" value="' + esc(u.telefono) + '" aria-label="Telefono"><button class="btn sm2" data-a="savetel" data-id="' + u.id + '">Salva numero</button></div>';
      return h + '</li>';
    }).join('') + '</ul>';
  }

  function render() {
    var h = '<div class="hd"><a class="back" href="index.html">' + U.I('back') + 'Stagioni</a></div><div><h1>Account</h1><p>' + esc(me.nome) + (me.admin ? ' · amministratore' : '') + '</p></div>';
    h += '<section class="card"><b>Cambia password</b><input class="in pin" id="old" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password" placeholder="Attuale" aria-label="Password attuale">' +
      '<input class="in pin" id="new" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="Nuova" aria-label="Nuova password">' + (st.pm ? '<p class="' + (st.pbad ? 'err' : 'ok') + '" role="status">' + esc(st.pm) + '</p>' : '') +
      '<button class="btn" data-a="chg">Cambia password</button><button class="btn sec2" data-a="out">Esci</button></section>' +
      '<section class="card"><b>Aggiorna l\u2019app</b><p class="sm">Se non vedi le novit\u00e0, tocca qui. Funziona anche dall\u2019icona sulla Home. In alternativa tira gi\u00f9 dalla cima di una pagina.</p><button class="btn sec2" data-a="upd">Aggiorna ora</button></section>';
    if (me.admin) {
      h += '<h2>Utenti</h2><section class="card">' + msg() + lista() + '</section>' +
        '<h2>Avviso a tutti</h2><section class="card"><input class="in" id="avt" placeholder="Titolo" maxlength="80" value="' + esc(st.av.t) + '" aria-label="Titolo"><textarea class="in" id="avx" rows="3" maxlength="400" placeholder="Testo dell\u2019avviso" aria-label="Testo" style="resize:vertical">' + esc(st.av.x) + '</textarea>' + (st.avm ? '<p class="ok" role="status">' + esc(st.avm) + '</p>' : '') + '<button class="btn" data-a="avviso">Invia a tutti</button><p class="sm">Compare nella pagina Novità di ogni utente, con il numero rosso.</p></section>' +
        '<h2>Nuovo utente</h2><section class="card"><input class="in" id="an" placeholder="Nome" value="' + esc(st.add.nome) + '" aria-label="Nome" maxlength="30">' +
        '<input class="in" id="at" type="tel" placeholder="Telefono" value="' + esc(st.add.tel) + '" aria-label="Telefono">' +
        '<input class="in pin" id="ap" type="text" inputmode="numeric" maxlength="6" placeholder="Password" value="' + esc(st.add.pwd) + '" aria-label="Password"><button class="btn sec2" data-a="gen">Genera password</button>' +
        '<button class="btn" data-a="add">Crea utente</button><p class="sm">Dopo la creazione puoi inviare l’invito su WhatsApp con il link e la password. Poi la password non è più visibile a nessuno.</p></section>' +
        (st.inv ? '<section class="card"><b>Utente ' + esc(st.inv.nome) + ' creato</b><p class="sm">Si apre WhatsApp con il messaggio pronto: premi Invia. Il messaggio contiene il link e la password.</p><a class="btn" href="' + invito(st.inv.nome, st.inv.tel, st.inv.pwd) + '" target="_blank" rel="noopener">Invia su WhatsApp</a><p class="sm">Chi lo riceve apre il link, entra con la password e può aggiungere l’app alla Home. Da questa schermata la password non si potrà più rivedere.</p></section>' : '');
    }
    h += '<div class="cmds"><a class="cm" href="guida-reset.html"><i class="ab">' + U.I('shield') + '</i><b>Guida al reset</b><small>Password dimenticata</small></a></div>';
    app.innerHTML = h; U.applyHue(235); U.nav('account');
  }
  function carica() { return SB.rpc('admin_elenco', { tok: SB.tok() }).then(function (r) { users = r; render(); }).catch(function () { say('Elenco non disponibile.', true); }); }
  function rd(id) { return users.filter(function (u) { return String(u.id) === String(id); })[0]; }
  function tok() { return SB.tok(); }

  app.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || !b.hasAttribute('data-a')) return;
    var a = b.getAttribute('data-a'), id = b.getAttribute('data-id') && +b.getAttribute('data-id');
    if (me.admin && document.getElementById('an')) st.add = { nome: document.getElementById('an').value, tel: document.getElementById('at').value, pwd: document.getElementById('ap').value };
    if (me.admin && document.getElementById('avt')) st.av = { t: document.getElementById('avt').value, x: document.getElementById('avx').value };
    if (a === 'upd') { SB.aggiorna(); return; }
    if (a === 'avviso') {
      if (!st.av.t.trim() || !st.av.x.trim()) { st.avm = ''; return say('Scrivi titolo e testo dell\u2019avviso.', true); }
      SB.rpc('admin_avviso', { tok: tok(), p_chiave: 'manuale-' + Date.now() + '-' + gen(), p_titolo: st.av.t, p_testo: st.av.x, p_href: null }).then(function (r) {
        if (r && r.ok) { st.av = { t: '', x: '' }; st.avm = 'Avviso inviato a tutti.'; st.msg = ''; render(); } else say('Avviso non inviato.', true);
      }).catch(function () { say('Collegamento non riuscito.', true); });
      return;
    }
    if (a === 'out') { SB.rpc('esci', { tok: tok() }).catch(function () {}).then(function () { SB.clear(); location.replace('accesso.html'); }); return; }
    if (a === 'chg') {
      var o = document.getElementById('old').value, n = document.getElementById('new').value;
      if (!/^\d{6}$/.test(o)) return pw('La password attuale ha 6 cifre.', true);
      if (!/^\d{6}$/.test(n)) return pw(E.formato, true);
      if (o === n) return pw(E.uguale, true);
      b.disabled = true;
      SB.rpc('cambia_password', { tok: tok(), vecchia: o, nuova: n }).then(function (r) {
        if (!r || !r.ok) return pw(E[r && r.errore] || 'Errore.', true);
        return window.VAULT.rewrap(me.nome, n).then(function () { pw('Password cambiata. Usa la nuova al prossimo accesso.'); }, function () { pw('Password cambiata. I dati della casa andranno reinseriti nel Setup.'); });
      }).catch(function () { pw('Collegamento non riuscito. Riprova.', true); });
    } else if (a === 'gen') { st.add.pwd = gen(); render(); }
    else if (a === 'add') {
      var d = st.add; SB.rpc('admin_crea', { tok: tok(), p_nome: d.nome, p_pwd: d.pwd, p_tel: SB.norm(d.tel) }).then(function (r) {
        if (r.ok) { st.inv = { nome: d.nome.trim(), tel: SB.norm(d.tel), pwd: d.pwd }; st.add = { nome: '', tel: '+39 ', pwd: '' }; st.msg = 'Utente creato.'; st.bad = false; carica(); } else say(E[r.errore] || 'Errore.', true);
      }).catch(function () { say('Collegamento non riuscito.', true); });
    } else if (a === 'sblocca') SB.rpc('admin_sblocca', { tok: tok(), p_id: id }).then(function () { st.msg = 'Sbloccato.'; st.bad = false; carica(); });
    else if (a === 'pwd') SB.rpc('admin_nuova_password', { tok: tok(), p_id: id }).then(function (r) { st.nuova = { id: id, p: r.password }; st.msg = ''; carica(); }).catch(function () { say('Operazione non riuscita.', true); });
    else if (a === 'tel') { st.open = st.open === id ? null : id; render(); }
    else if (a === 'savetel') SB.rpc('admin_telefono', { tok: tok(), p_id: id, p_tel: SB.norm(document.getElementById('nt').value) }).then(function (r) { if (r.ok) { st.open = null; st.msg = 'Numero aggiornato.'; st.bad = false; carica(); } else say(E[r.errore] || 'Errore.', true); });
    else if (a === 'del') { if (st.conf !== id) { st.conf = id; render(); return; } st.conf = null; SB.rpc('admin_elimina', { tok: tok(), p_id: id }).then(function (r) { r.ok ? (st.msg = 'Eliminato.', st.bad = false, carica()) : say(E[r.errore] || 'Errore.', true); }); }
  });
  render(); if (me.admin) carica();
  SB.rpc('sessione', { tok: tok() }).then(function (r) { if (r && r.admin !== me.admin) { me = r; render(); if (r.admin) carica(); } }).catch(function () {});
})();
