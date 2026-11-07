(function () {
  var tok = window.SB.tok(), root = document.documentElement;
  if (!tok || !(window.VAULT && window.VAULT.ok())) { window.SB.clear(); location.replace('accesso.html'); return; }
  function fuori() { if (!window.SB.tok()) location.replace('accesso.html'); }
  // Finché l'app è aperta l'accesso resta attivo; se esci e torni dopo più di pochi secondi, viene richiesto di nuovo.
  setInterval(function () { if (!document.hidden) window.SB.touch(); }, 3000);
  document.addEventListener('visibilitychange', function () { if (document.hidden) window.SB.touch(); else fuori(); });
  window.addEventListener('pagehide', function () { window.SB.touch(); });
  window.addEventListener('pageshow', fuori);
  root.style.visibility = 'hidden';
  function show() { root.style.visibility = ''; }
  window.SB.rpc('sessione', { tok: tok }).then(function (r) {
    if (!r) { window.SB.clear(); location.replace('accesso.html'); return; }
    window.SB.set(tok, r.nome, r.admin); show();
  }).catch(show);
  setTimeout(show, 4000);
})();
