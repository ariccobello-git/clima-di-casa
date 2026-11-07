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
  window.SB = {
    rpc: rpc, norm: norm,
    tok: function () { var s = ls(); return s && s.getItem('clima.tok'); },
    me: function () { try { return JSON.parse(ls().getItem('clima.me')); } catch (e) { return null; } },
    set: function (tok, nome, admin) { var s = ls(); if (s) { s.setItem('clima.tok', tok); s.setItem('clima.me', JSON.stringify({ nome: nome, admin: !!admin })); } },
    clear: function () { var s = ls(); if (s) { s.removeItem('clima.tok'); s.removeItem('clima.me'); } }
  };
})();
