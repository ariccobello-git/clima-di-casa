(function (root) {
  // Dati personali (casa, indirizzo, prezzi, novità, cache meteo) cifrati sul telefono con AES-GCM.
  // La chiave dei dati (DEK) è casuale ed è custodita cifrata con una chiave derivata dalla password (PBKDF2, 200000 giri).
  // Su disco c'è solo il testo cifrato. Mentre usi l'app, una copia in chiaro vive in sessionStorage e sparisce quando esci.
  var MIR = 'clima.mirror', DEK = 'clima.dek', UID = 'clima.vh', LEGACY = /^clima\.(v1|casa\.v1|novita\.v1|live3\..*|st\..*)$/;
  var enc = new TextEncoder(), dec = new TextDecoder(), chain = Promise.resolve(), timer = null;
  function ss() { try { return root.sessionStorage; } catch (e) { return null; } }
  function ls() { try { return root.localStorage; } catch (e) { return null; } }
  function sub() { return root.crypto && root.crypto.subtle; }
  function b64(buf) { var a = new Uint8Array(buf), s = ''; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function unb64(t) { var s = atob(t), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function rj(k) { try { return JSON.parse(ls().getItem(k)); } catch (e) { return null; } }
  function mir() { try { var t = ss().getItem(MIR); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
  function put(o) { try { ss().setItem(MIR, JSON.stringify(o)); } catch (e) {} }

  function hid(user) {
    return sub().digest('SHA-256', enc.encode('snug:' + String(user).toLowerCase())).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('').slice(0, 24); });
  }
  function kek(pwd, salt) {
    return sub().importKey('raw', enc.encode(String(pwd)), 'PBKDF2', false, ['deriveKey']).then(function (k) {
      return sub().deriveKey({ name: 'PBKDF2', salt: salt, iterations: 200000, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function dek(raw) { return sub().importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']); }
  function wrap(h, raw, pwd) {
    var salt = root.crypto.getRandomValues(new Uint8Array(16)), iv = root.crypto.getRandomValues(new Uint8Array(12));
    return kek(pwd, salt).then(function (K) { return sub().encrypt({ name: 'AES-GCM', iv: iv }, K, raw); }).then(function (w) {
      ls().setItem('clima.vk.' + h, JSON.stringify({ s: b64(salt), i: b64(iv), w: b64(w) }));
    });
  }
  function nuova(h, pwd) {
    var raw = root.crypto.getRandomValues(new Uint8Array(32));
    try { ls().removeItem('clima.vd.' + h); } catch (e) {}
    return wrap(h, raw, pwd).then(function () { return { raw: raw, fresh: true }; });
  }

  // Dopo l'accesso: apre (o crea) l'archivio cifrato dell'utente e lo copia in sessionStorage.
  function unlock(user, pwd) {
    if (!sub() || !ls() || !ss()) return Promise.reject(new Error('crypto'));
    var h, key;
    return hid(user).then(function (x) {
      h = x; var vk = rj('clima.vk.' + h);
      if (!vk) return nuova(h, pwd);
      return kek(pwd, unb64(vk.s)).then(function (K) { return sub().decrypt({ name: 'AES-GCM', iv: unb64(vk.i) }, K, unb64(vk.w)); })
        .then(function (raw) { return { raw: new Uint8Array(raw), fresh: false }; }, function () { return nuova(h, pwd); });
    }).then(function (r) {
      return dek(r.raw).then(function (K) {
        key = K; var vd = rj('clima.vd.' + h), o = {};
        function fine(obj) {
          if (r.fresh) { var L = ls(), ks = []; for (var i = 0; i < L.length; i++) if (LEGACY.test(L.key(i))) ks.push(L.key(i)); ks.forEach(function (k) { try { obj[k] = JSON.parse(L.getItem(k)); } catch (e) {} L.removeItem(k); }); }
          ss().setItem(DEK, b64(r.raw)); ss().setItem(UID, h); put(obj); return flush();
        }
        if (vd && !r.fresh) return sub().decrypt({ name: 'AES-GCM', iv: unb64(vd.i) }, K, unb64(vd.c)).then(function (p) { return fine(JSON.parse(dec.decode(p))); }, function () { return fine({}); });
        return fine(o);
      });
    });
  }
  function flush() {
    var s = ss(), raw = s && s.getItem(DEK), h = s && s.getItem(UID), o = mir();
    if (!raw || !h || !o || !sub()) return Promise.resolve();
    return dek(unb64(raw)).then(function (K) {
      var iv = root.crypto.getRandomValues(new Uint8Array(12));
      return sub().encrypt({ name: 'AES-GCM', iv: iv }, K, enc.encode(JSON.stringify(o))).then(function (c) { ls().setItem('clima.vd.' + h, JSON.stringify({ i: b64(iv), c: b64(c) })); });
    }).catch(function () {});
  }
  function programma(subito) { clearTimeout(timer); timer = setTimeout(function () { chain = chain.then(flush); }, subito ? 0 : 200); }
  // Cambio password: la chiave dei dati resta la stessa, cambia solo la chiave che la protegge.
  function rewrap(user, nuovaPwd) {
    var s = ss(), raw = s && s.getItem(DEK); if (!raw || !sub()) return Promise.resolve();
    return hid(user).then(function (h) { return wrap(h, unb64(raw), nuovaPwd); });
  }
  function lock() { var s = ss(); try { [MIR, DEK, UID].forEach(function (k) { s.removeItem(k); }); } catch (e) {} }

  root.VAULT = {
    ok: function () { return !!mir(); },
    get: function (k) { var o = mir(); return o && o[k] !== undefined ? o[k] : null; },
    set: function (k, v) { var o = mir(); if (!o) return false; o[k] = v; put(o); programma(); return true; },
    del: function (k) { var o = mir(); if (!o) return; delete o[k]; put(o); programma(); },
    unlock: unlock, rewrap: rewrap, lock: lock, flush: function () { return chain = chain.then(flush); }
  };
  if (root.addEventListener) {
    root.addEventListener('pagehide', function () { programma(true); });
    root.addEventListener('visibilitychange', function () { if (root.document && root.document.hidden) programma(true); });
  }
})(typeof window !== 'undefined' ? window : globalThis);
