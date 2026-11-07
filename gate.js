(function () {
  var tok = window.SB.tok(), root = document.documentElement;
  if (!tok) { location.replace('accesso.html'); return; }
  root.style.visibility = 'hidden';
  function show() { root.style.visibility = ''; }
  window.SB.rpc('sessione', { tok: tok }).then(function (r) {
    if (!r) { window.SB.clear(); location.replace('accesso.html'); return; }
    window.SB.set(tok, r.nome, r.admin); show();
  }).catch(show);
  setTimeout(show, 4000);
})();

// Dall'icona Home iOS non ha il gesto "tira per aggiornare": lo aggiungo (tira giù dalla cima della pagina).
(function () {
  var y0 = null, tip = null;
  document.addEventListener('touchstart', function (e) { y0 = (window.scrollY <= 0 && e.touches.length === 1) ? e.touches[0].clientY : null; }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (y0 === null) return; var d = e.touches[0].clientY - y0;
    if (d > 20 && !tip) { tip = document.createElement('div'); tip.style.cssText = 'position:fixed;top:env(safe-area-inset-top,0);left:0;right:0;text-align:center;font:600 13px -apple-system,sans-serif;padding:8px;color:#555;z-index:99'; document.body.appendChild(tip); }
    if (tip) tip.textContent = d > 110 ? 'Rilascia per aggiornare' : 'Tira giù per aggiornare';
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (y0 === null) return; var d = (e.changedTouches[0].clientY - y0);
    if (tip) { tip.remove(); tip = null; } y0 = null;
    if (d > 110) window.SB.aggiorna();
  }, { passive: true });
})();
