(function () {
  var URL_ = 'https://agwydrzrhalzwpjvojux.supabase.co', KEY = 'sb_publishable_T6DIn_sDca3tv3T5M_WZVg_fQiUrE3V';
  function ls() { try { return window.localStorage; } catch (e) { return null; } }
  function rpc(fn, args) {
    return fetch(URL_ + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) })
      .then(function (r) { return r.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (e) {} if (!r.ok) throw new Error((j && j.message) || 'HTTP ' + r.status); return j; }); });
  }
  // Numero in formato internazionale; senza prefisso si assume l'Italia (+39).
  function norm(t) {
    t = String(t || '').replace(/[^0-9+]/g, ''); if (t.indexOf('00') === 0) t = '+' + t.slice(2);
    if (t.charAt(0) !== '+') t = '+39' + t.replace(/^0+(?=3)/, ''); return t;
  }
  // La sessione resta in due posti (localStorage e cookie di un anno): se iOS ne svuota uno, l'altro la ripristina.
  function ck(k) { var m = document.cookie.match(new RegExp('(?:^|; )' + k + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; }
  function ckSet(k, v) { document.cookie = k + '=' + (v === null ? '' : encodeURIComponent(v)) + '; path=/; max-age=' + (v === null ? 0 : 31536000) + '; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : ''); }
  function get(k) { var s = ls(), v = null; try { v = s && s.getItem(k); } catch (e) {} if (v === null || v === undefined) { v = ck(k.replace('.', '_')); if (v && s) { try { s.setItem(k, v); } catch (e) {} } } return v; }
  function put(k, v) { var s = ls(); try { if (s) { v === null ? s.removeItem(k) : s.setItem(k, v); } } catch (e) {} ckSet(k.replace('.', '_'), v); }
  function aggiorna() {
    var p = (window.caches && caches.keys) ? caches.keys().then(function (k) { return Promise.all(k.map(function (x) { return caches.delete(x); })); }) : Promise.resolve();
    p.catch(function () {}).then(function () { location.replace(location.pathname + '?r=' + Date.now()); });
  }
  window.SB = {
    rpc: rpc, norm: norm, aggiorna: aggiorna,
    tok: function () { return get('clima.tok'); },
    me: function () { try { return JSON.parse(get('clima.me')); } catch (e) { return null; } },
    set: function (tok, nome, admin) { put('clima.tok', tok); put('clima.me', JSON.stringify({ nome: nome, admin: !!admin })); },
    clear: function () { put('clima.tok', null); put('clima.me', null); }
  };
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

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
