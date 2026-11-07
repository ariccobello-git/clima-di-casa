(function () {
  var N = window.NOVITA, U = window.UI, app = document.getElementById('app');
  var IC = { prezzi: 'euro', consiglio: 'bolt', stagione: 'sun', anno: 'cloudsun', assente: 'clock' };
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function data(iso) { return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }); }
  function render() {
    var it = N.stato().items.slice().reverse(), h = '<div class="hd"><a class="back" href="index.html">' + U.I('back') + 'Stagioni</a></div><div><h1>Novità</h1><p>Cosa è cambiato dall’ultima volta. Le indicazioni restano qui finché non le cancelli.</p></div>';
    if (!it.length) h += '<section class="card"><b>Tutto a posto</b><p class="sm">Nessuna novità da vedere.</p><a class="btn" href="index.html">Torna alla home</a></section>';
    h += it.map(function (x) {
      var ic = x.tipo === 'stagione' && /inverno/i.test(x.titolo) ? 'snow' : (IC[x.tipo] || 'bulb');
      return '<section class="card nv" data-id="' + esc(x.id) + '"><div class="th"><span class="ab">' + U.I(ic) + '</span><div><b>' + esc(x.titolo) + '</b><div class="dt">' + data(x.data) + '</div></div></div><p class="sm" style="margin:0">' + esc(x.testo) + '</p>' +
        (x.href ? '<a class="btn sec2" style="min-height:46px;margin:2px 0" href="' + esc(x.href) + '">' + esc(x.label || 'Apri') + '</a>' : '') +
        '<label class="ck"><input type="checkbox" data-id="' + esc(x.id) + '"> Cancella indicazione</label></section>';
    }).join('');
    if (navigator.standalone && 'setAppBadge' in navigator && window.Notification && Notification.permission === 'default') h += '<p class="sm" style="text-align:center"><button type="button" class="chip" id="perm">Mostra il numero rosso sull’icona</button></p>';
    app.innerHTML = h; U.applyHue(8); U.nav('novita');
  }
  app.addEventListener('change', function (e) {
    var c = e.target; if (!c.matches('input[type=checkbox]') || !c.checked) return;
    var card = c.closest('.nv'); card.classList.add('out'); N.rimuovi(c.getAttribute('data-id')); setTimeout(render, 360);
  });
  app.addEventListener('click', function (e) { if (e.target.id === 'perm') Notification.requestPermission().then(function () { N.badge(); render(); }); });
  render();
})();
