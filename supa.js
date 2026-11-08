(function () {
  var URL_ = 'https://agwydrzrhalzwpjvojux.supabase.co', KEY = 'sb_publishable_T6DIn_sDca3tv3T5M_WZVg_fQiUrE3V';
  function rpc(fn, args) {
    return fetch(URL_ + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) })
      .then(function (r) { return r.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (e) {} if (!r.ok) throw new Error((j && j.message) || 'HTTP ' + r.status); return j; }); });
  }
  // Numero in formato internazionale; senza prefisso si assume l'Italia (+39).
  function norm(t) {
    t = String(t || '').replace(/[^0-9+]/g, ''); if (t.indexOf('00') === 0) t = '+' + t.slice(2);
    if (t.charAt(0) !== '+') t = '+39' + t.replace(/^0+(?=3)/, ''); return t;
  }
  // L'accesso vale solo finché usi l'app: scade dopo 1 minuto senza tocchi, a schermo spento o se esci dall'app per più di 10 secondi.
  var GRACE = 130, IDLE = 60;
  function ss() { try { return window.sessionStorage; } catch (e) { return null; } }
  // Pulizia di vecchi accessi salvati in modo permanente.
  try { localStorage.removeItem('clima.tok'); localStorage.removeItem('clima.me'); ['clima_tok', 'clima_me'].forEach(function (k) { document.cookie = k + '=; path=/; max-age=0'; }); } catch (e) {}
  function aggiorna() {
    var p = (window.caches && caches.keys) ? caches.keys().then(function (k) { return Promise.all(k.map(function (x) { return caches.delete(x); })); }) : Promise.resolve();
    p.catch(function () {}).then(function () { location.replace(location.pathname + '?r=' + Date.now()); });
  }
  var VER = '1.7 · 08/11/2026';
  window.SB = {
    ver: VER,
    rpc: rpc, norm: norm, aggiorna: aggiorna,
    tok: function () {
      var s = ss(), t = s && s.getItem('clima.tok'); if (!t) return null;
      if (Date.now() - (+s.getItem('clima.seen') || 0) > GRACE * 1000 || (!s.getItem('clima.bg') && Date.now() - (+s.getItem('clima.act') || 0) > IDLE * 1000)) { window.SB.clear(); return null; }
      return t;
    },
    bg: function (on) { var s = ss(); try { if (s) { if (on) s.setItem('clima.bg', '1'); else s.removeItem('clima.bg'); } } catch (e) {} },
    act: function () { var s = ss(); try { if (s && s.getItem('clima.tok')) s.setItem('clima.act', String(Date.now())); } catch (e) {} },
    touch: function () { var s = ss(); try { if (s && s.getItem('clima.tok')) s.setItem('clima.seen', String(Date.now())); } catch (e) {} },
    me: function () { try { return JSON.parse(ss().getItem('clima.me')); } catch (e) { return null; } },
    set: function (tok, nome, admin) { var s = ss(); try { if (s) { s.setItem('clima.tok', tok); s.setItem('clima.me', JSON.stringify({ nome: nome, admin: !!admin })); s.setItem('clima.seen', String(Date.now())); s.setItem('clima.act', String(Date.now())); } } catch (e) {} },
    clear: function () { var s = ss(); try { if (s) ['clima.tok', 'clima.me', 'clima.seen', 'clima.act', 'clima.bg', 'clima.mirror', 'clima.dek', 'clima.vh'].forEach(function (k) { s.removeItem(k); }); } catch (e) {} }
  };

  // Nell'app sulla Home non c'è "tira per aggiornare": lo aggiungo io.
  var standalone = window.navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  if (standalone) {
    var y0 = null, pill = null;
    function pl() { if (!pill) { pill = document.createElement('div'); pill.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top) + 8px);left:50%;transform:translateX(-50%);padding:8px 16px;border-radius:99px;background:rgba(0,0,0,.72);color:#fff;font:600 14px -apple-system,sans-serif;z-index:99;display:none'; document.body.appendChild(pill); } return pill; }
    document.addEventListener('touchstart', function (e) { y0 = (window.scrollY <= 0 && e.touches.length === 1) ? e.touches[0].clientY : null; }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (y0 === null) return; var d = e.touches[0].clientY - y0, p = pl();
      if (d > 20) { p.style.display = 'block'; p.textContent = d > 110 ? 'Rilascia per aggiornare' : 'Tira per aggiornare'; } else p.style.display = 'none';
    }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (y0 === null) return; var d = (e.changedTouches[0].clientY - y0); y0 = null; if (pill) pill.style.display = 'none'; if (d > 110) aggiorna();
    }, { passive: true });
  }
})();
