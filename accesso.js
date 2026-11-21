(function () {
  var SB = window.SB, U = window.UI, app = document.getElementById('app');
  var st = { v: 'login', nomi: null, nome: '', msg: '', bad: false, tel: '+39 ', busy: false, inv: false };
  // Link di invito: accesso.html?u=Nome. Il nome è già scelto; la password arriva nel messaggio dell'amministratore, mai nel link.
  var invNome = (function () { try { var m = /[?&]u=([^&]+)/.exec(location.search); return m ? decodeURIComponent(m[1]).slice(0, 30) : ''; } catch (e) { return ''; } })();
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function m() { return st.msg ? '<p class="' + (st.bad ? 'err' : 'ok') + '" role="status">' + esc(st.msg) + '</p>' : ''; }
  function say(t, bad) { st.msg = t; st.bad = !!bad; st.busy = false; render(); }
  var ERR = { credenziali: 'Nome o password non corretti.', bloccato: 'Account bloccato. Chiedi all’amministratore di sbloccarlo.', codice: 'Codice o numero non corretti, oppure codice scaduto.', formato: 'La password deve avere 6 cifre.' };

  function render() {
    var h = '<div><h1>Snug Save</h1><p>Scegli il tuo nome e inserisci la password di 6 cifre.</p></div>';
    if (st.inv && st.v === 'login') h += '<section class="card"><b>Benvenuto, ' + esc(st.nome) + '</b><p class="sm">Sei stato invitato su Snug Save. Inserisci la password che hai ricevuto nel messaggio e tocca Accedi.</p></section>';
    if (st.nomi === null) h += '<section class="card"><p class="sm">Carico…</p>' + m() + '</section>';
    else if (st.v === 'login') {
      h += '<section class="card"><div class="chips wrap" role="group" aria-label="Nome">' + st.nomi.map(function (n) { return '<button type="button" class="chip u" data-nome="' + esc(n) + '" aria-pressed="' + (n === st.nome) + '">' + esc(n) + '</button>'; }).join('') + '</div>' +
        '<input class="in pin" id="pw" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="current-password" placeholder="••••••" aria-label="Password">' +
        m() + '<button class="btn" id="go" type="button"' + (st.busy ? ' disabled' : '') + '>Accedi</button>' +
        '<button class="btn sec2" id="forgot" type="button">Password dimenticata</button></section>';
    } else if (st.v === 'r1') {
      h += '<section class="card"><b>Reset password per ' + esc(st.nome) + '</b><p class="sm">Inserisci il tuo numero di telefono completo di prefisso. Deve essere quello che hai dato all’amministratore.</p>' +
        '<input class="in" id="tel" type="tel" inputmode="tel" autocomplete="tel" value="' + esc(st.tel) + '" aria-label="Telefono">' + m() +
        '<button class="btn" id="send" type="button"' + (st.busy ? ' disabled' : '') + '>Invia il codice</button><button class="btn sec2" id="back" type="button">Indietro</button></section>';
    } else {
      h += '<section class="card"><b>Inserisci il codice</b><p class="sm">L’amministratore vede il codice nella sua pagina Account e te lo manda su WhatsApp. Il codice ha 6 cifre e vale 15 minuti.</p>' +
        '<input class="in pin" id="cod" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" placeholder="Codice" aria-label="Codice">' +
        '<input class="in pin" id="np" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="new-password" placeholder="Nuova password" aria-label="Nuova password">' + m() +
        '<button class="btn" id="conf" type="button"' + (st.busy ? ' disabled' : '') + '>Cambia password</button><button class="btn sec2" id="back" type="button">Indietro</button></section>';
    }
    h += '<p class="sm" style="text-align:center"><a href="guida-reset.html">Guida al reset della password</a></p>';
    var lg = window.I18N ? window.I18N.lingua() : 'it', LN = { it: 'Italiano', en: 'English', fr: 'Fran\u00e7ais' };
    h += '<div class="lgs" role="group" aria-label="Lingua">' + ['it', 'en', 'fr'].map(function (l) { return '<button type="button" lang="' + l + '" data-lang="' + l + '" aria-pressed="' + (lg === l) + '">' + LN[l] + '</button>'; }).join('') + '</div>';
    h += '<p class="ver">Snug Save · versione ' + window.SB.ver + '</p>';
    app.innerHTML = h; U.applyHue(235);
  }

  app.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.hasAttribute('data-lang')) { if (window.I18N) { window.I18N.imposta(b.getAttribute('data-lang')); location.reload(); } return; }
    if (b.hasAttribute('data-nome')) { st.nome = b.getAttribute('data-nome'); st.msg = ''; var pw = document.getElementById('pw'); render(); document.getElementById('pw').focus(); return; }
    if (b.id === 'go') {
      var p = document.getElementById('pw').value;
      if (!st.nome) return say('Scegli il tuo nome.', true);
      if (!/^\d{6}$/.test(p)) return say('La password ha 6 cifre.', true);
      st.busy = true; st.msg = ''; render();
      SB.rpc('accedi', { p_nome: st.nome, p_pwd: p }).then(function (r) {
        if (r.token) {
          SB.set(r.token, r.nome, r.admin);
          if (st.inv) { try { localStorage.setItem('clima.guida', '1'); } catch (x) {} }
          window.VAULT.unlock(r.nome, p).then(function () { location.replace('index.html'); })
            .catch(function () { SB.clear(); say('Questo browser non supporta la protezione dei dati. Aggiorna Safari.', true); });
        }
        else say((ERR[r.errore] || 'Errore.') + (r.restanti != null ? ' Tentativi rimasti: ' + r.restanti + '.' : ''), true);
      }).catch(function () { say('Collegamento non riuscito. Riprova.', true); });
    } else if (b.id === 'forgot') { if (!st.nome) return say('Prima scegli il tuo nome.', true); st.v = 'r1'; st.msg = ''; render(); }
    else if (b.id === 'back') { st.v = 'login'; st.msg = ''; render(); }
    else if (b.id === 'send') {
      st.tel = document.getElementById('tel').value; var n = SB.norm(st.tel);
      if (!/^\+\d{8,15}$/.test(n)) return say('Numero non valido.', true);
      st.busy = true; st.msg = ''; render();
      SB.rpc('reset_richiedi', { p_nome: st.nome, p_tel: n }).then(function (r) {
        if (r && r.admin) { st.v = 'login'; return say('L’account amministratore non si reimposta dall’app, per sicurezza. Chiedi il reset al supporto.', true); }
        st.v = 'r2'; st.tel = n; say('Richiesta inviata all’amministratore.');
      })
        .catch(function () { say('Collegamento non riuscito. Riprova.', true); });
    } else if (b.id === 'conf') {
      var c = document.getElementById('cod').value.trim(), np = document.getElementById('np').value;
      if (!/^\d{6}$/.test(c)) return say('Il codice ha 6 cifre.', true);
      if (!/^\d{6}$/.test(np)) return say('La nuova password ha 6 cifre.', true);
      st.busy = true; st.msg = ''; render();
      SB.rpc('reset_conferma', { p_nome: st.nome, p_tel: SB.norm(st.tel), p_codice: c, p_nuova: np }).then(function (r) {
        if (r.ok) { st.v = 'login'; say('Password cambiata. Ora puoi accedere. I dati della casa vanno reinseriti nel Setup.'); } else say(ERR[r.errore] || 'Errore.', true);
      }).catch(function () { say('Collegamento non riuscito. Riprova.', true); });
    }
  });
  render();
  SB.rpc('elenco_nomi').then(function (n) {
    st.nomi = n || []; if (!st.nomi.length) st.msg = 'Nessun account creato.';
    if (invNome) { var t = st.nomi.filter(function (x) { return String(x).toLowerCase() === invNome.toLowerCase(); })[0]; if (t) { st.nome = t; st.inv = true; } }
    render(); if (st.inv) { var pw = document.getElementById('pw'); if (pw && pw.focus) try { pw.focus(); } catch (x) {} }
  })
    .catch(function () { st.nomi = []; say('Collegamento non riuscito. Riprova.', true); });
})();
