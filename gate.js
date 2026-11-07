(function () {
  var tok = window.SB.tok(), root = document.documentElement;
  if (!tok || !(window.VAULT && window.VAULT.ok())) { window.SB.clear(); location.replace('accesso.html'); return; }
  function fuori() { if (!window.SB.tok()) location.replace('accesso.html'); }
  // Si esce da soli dopo 1 minuto senza tocchi e quando lo schermo si spegne o l'app va in secondo piano.
  var nascosto = 0, ultimo = 0;
  function attivita() { var n = Date.now(); if (n - ultimo > 1500) { ultimo = n; window.SB.act(); } }
  ['touchstart', 'pointerdown', 'keydown', 'scroll', 'input', 'click'].forEach(function (ev) { document.addEventListener(ev, attivita, { passive: true, capture: true }); });
  window.SB.act(); ultimo = Date.now();
  setInterval(function () { if (!document.hidden) { window.SB.touch(); if (!window.SB.tok()) fuori(); } }, 3000);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { nascosto = Date.now(); window.SB.touch(); }
    else if (nascosto && Date.now() - nascosto > 2000) { window.SB.clear(); fuori(); } else fuori();
  });
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
