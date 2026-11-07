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
