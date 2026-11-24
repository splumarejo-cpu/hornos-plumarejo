/**
 * Buba Identity & Match Bidireccional — hornosplumarejo.com
 * Genera ID persistente (HP-XXXXXX), codigo Match BUBA-HP-XXXXXX para WhatsApp
 * y perfil local + slot listo para Google Identity Services.
 */
(function (win, doc) {
  "use strict";

  var CFG = win.BUBA_IDENTITY_CONFIG = Object.assign({
    googleClientId: "255363114817-8e1k9l84b6kacg9nmb49b0sbdsakqm40.apps.googleusercontent.com",
    enableGoogleGsi: true
  }, win.BUBA_IDENTITY_CONFIG || {});

  var PROFILE_KEY = "hp_client_profile_v1";

  function safeParse(raw, fb) {
    try {
      return raw ? JSON.parse(raw) : fb;
    } catch (_) {
      return fb;
    }
  }

  function escHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isSafeClientId(cid) {
    return /^HP-[A-Z0-9]{4,12}$/i.test(String(cid || "").trim());
  }

  function genVisitorId() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var out = "HP-";
    if (win.crypto && win.crypto.getRandomValues) {
      var rnd = new Uint8Array(6);
      win.crypto.getRandomValues(rnd);
      for (var i = 0; i < 6; i++) out += chars.charAt(rnd[i] % chars.length);
      return out;
    }
    for (var j = 0; j < 6; j++) out += chars.charAt(Math.floor(Math.random() * chars.length));
    return out;
  }

  function loadProfile() {
    var raw = "";
    try {
      raw = win.localStorage.getItem(PROFILE_KEY) || "";
    } catch (_) {
      raw = "";
    }
    var p = safeParse(raw, null);
    if (!p || !isSafeClientId(p.clientId)) {
      p = {
        clientId: genVisitorId(),
        nombre: "",
        tel: "",
        email: "",
        googleSub: "",
        verifiedGoogle: false,
        createdAt: new Date().toISOString()
      };
      saveProfile(p);
    }
    return p;
  }

  function saveProfile(p) {
    try {
      win.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch (_) {}
    return p;
  }

  function decodeJwtPayload(jwt) {
    try {
      var parts = String(jwt || "").split(".");
      if (parts.length < 2) return null;
      var b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (_) {
      return null;
    }
  }

  function hasValidGoogleClientId() {
    var id = String(CFG.googleClientId || "").trim();
    return Boolean(CFG.enableGoogleGsi) && id.length > 20 && id.indexOf(".apps.googleusercontent.com") !== -1;
  }

  function makeGoogleGIcon() {
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = doc.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "15");
    svg.setAttribute("height", "15");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "flex-shrink:0;vertical-align:middle;";
    var paths = [
      { d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z", fill: "#4285F4" },
      { d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z", fill: "#34A853" },
      { d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z", fill: "#FBBC05" },
      { d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z", fill: "#EA4335" }
    ];
    paths.forEach(function (item) {
      var pt = doc.createElementNS(svgNS, "path");
      pt.setAttribute("d", item.d);
      pt.setAttribute("fill", item.fill);
      svg.appendChild(pt);
    });
    return svg;
  }

  function prefillFormsFromProfile() {
    var p = loadProfile();
    var n = doc.getElementById("c-nombre"); if (n && !n.value && p.nombre) n.value = p.nombre;
    var t = doc.getElementById("c-telefono"); if (t && !t.value && p.tel) t.value = p.tel;
    var c = doc.getElementById("c-correo"); if (c && !c.value && p.email) c.value = p.email;
  }

  function formatMatchBullets() {
    var p = loadProfile();
    var lines = ["• Código Match: BUBA-" + p.clientId];
    if (p.nombre || p.email || p.verifiedGoogle) {
      lines.push("• Cuenta Web: " + (p.nombre || "Visitante Web") + (p.email ? " (" + p.email + ")" : "") + (p.verifiedGoogle ? " [Google Verificado]" : ""));
    }
    return lines;
  }

  function ensureAccountUi() {
    if (doc.getElementById("bubaAccountModal")) return;
    var modal = doc.createElement("div");
    modal.id = "bubaAccountModal";
    modal.setAttribute("aria-hidden", "true");
    modal.style.cssText = "display:none;position:fixed;inset:0;background:rgba(10,6,3,.78);backdrop-filter:blur(4px);z-index:1200;align-items:center;justify-content:center;padding:16px;";

    var card = doc.createElement("div");
    card.style.cssText = "background:#140C05;color:#F5F0E8;max-width:430px;width:100%;border-radius:12px;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.6);border:1px solid rgba(232,96,10,0.45);position:relative;font-family:inherit;";
    card.innerHTML = [
      '<button type="button" id="bubaAccClose" aria-label="Cerrar" style="position:absolute;top:12px;right:12px;border:0;background:#1E1208;color:#F5A020;width:30px;height:30px;border-radius:50%;cursor:pointer;font-weight:700;">✕</button>',
      '<div style="font-size:11px;font-weight:800;letter-spacing:.1em;color:#F5A020;text-transform:uppercase;">CUENTA &amp; MATCH BUBA · HORNOS PLUMAREJO</div>',
      '<h3 style="margin:6px 0 8px;font-size:19px;font-family:\'Playfair Display\',serif;color:#fff;">Identifícate para seguimiento exacto</h3>',
      '<p style="margin:0 0 14px;font-size:13px;color:#9C8878;line-height:1.45;">Vincula tu código único con Buba por WhatsApp para cotizaciones, tiempos de fabricación y envíos.</p>',
      '<div id="bubaAccCodePill" style="background:#0A0603;border:1px solid rgba(232,96,10,0.35);border-radius:8px;padding:8px 12px;font-size:12px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;"></div>',
      '<div id="bubaGoogleBtnSlot" style="margin-bottom:14px;"></div>',
      '<form id="bubaAccLocalForm" style="display:grid;gap:8px;">',
      '  <input type="text" id="bubaAccName" placeholder="Tu nombre completo" style="padding:9px 11px;background:#0A0603;color:#F5F0E8;border:1px solid rgba(255,255,255,.15);border-radius:6px;font-size:13px;">',
      '  <input type="tel" id="bubaAccTel" placeholder="WhatsApp (10 dígitos)" style="padding:9px 11px;background:#0A0603;color:#F5F0E8;border:1px solid rgba(255,255,255,.15);border-radius:6px;font-size:13px;">',
      '  <input type="email" id="bubaAccEmail" placeholder="Correo electrónico (opcional)" style="padding:9px 11px;background:#0A0603;color:#F5F0E8;border:1px solid rgba(255,255,255,.15);border-radius:6px;font-size:13px;">',
      '  <button type="submit" style="background:#E8600A;color:#fff;border:0;border-radius:6px;padding:10px;font-weight:700;cursor:pointer;font-size:13px;">Guardar perfil y vincular Match</button>',
      '</form>'
    ].join("");

    modal.appendChild(card);
    doc.body.appendChild(modal);

    function refreshModalBody() {
      var p = loadProfile();
      var codeEl = doc.getElementById("bubaAccCodePill");
      if (codeEl) {
        codeEl.innerHTML = '<span>Código Match: <strong style="color:#F5A020;">BUBA-' + escHtml(p.clientId) + '</strong></span><span style="color:' + (p.verifiedGoogle ? '#4ade80' : '#9C8878') + ';font-weight:700;">' + (p.verifiedGoogle ? '✓ Google' : 'Local') + '</span>';
      }
      var nEl = doc.getElementById("bubaAccName"); if (nEl) nEl.value = p.nombre || "";
      var tEl = doc.getElementById("bubaAccTel"); if (tEl) tEl.value = p.tel || "";
      var eEl = doc.getElementById("bubaAccEmail"); if (eEl) eEl.value = p.email || "";

      var slot = doc.getElementById("bubaGoogleBtnSlot");
      if (slot) {
        slot.innerHTML = "";
        if (hasValidGoogleClientId()) {
          var wrap = doc.createElement("div");
          wrap.id = "g_id_signin_target";
          slot.appendChild(wrap);
          if (win.google && win.google.accounts && win.google.accounts.id) {
            win.google.accounts.id.renderButton(wrap, { theme: "filled_black", size: "large", width: 380, text: "continue_with", locale: "es" });
          } else {
            slot.textContent = "Cargando botón de Google...";
          }
        } else {
          slot.textContent = "";
        }
      }
    }

    doc.getElementById("bubaAccClose").addEventListener("click", function () {
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    });
    modal.addEventListener("click", function (ev) {
      if (ev.target === modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
      }
    });
    doc.getElementById("bubaAccLocalForm").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var p = loadProfile();
      p.nombre = (doc.getElementById("bubaAccName").value || "").trim();
      p.tel = (doc.getElementById("bubaAccTel").value || "").trim();
      p.email = (doc.getElementById("bubaAccEmail").value || "").trim();
      saveProfile(p);
      prefillFormsFromProfile();
      updateHeaderTrigger();
      renderInlineCards();
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
      showIdentityToast("✓ Perfil vinculado · Código Match BUBA-" + p.clientId);
    });

    win._bubaOpenAccountModal = function () {
      refreshModalBody();
      modal.style.display = "flex";
      modal.setAttribute("aria-hidden", "false");
    };
    win._bubaRefreshAccountModal = refreshModalBody;
    win._bubaCloseAccountModal = function () {
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    };
  }

  function showIdentityToast(msg) {
    try {
      var prev = doc.getElementById("bubaIdentityToast");
      if (prev) prev.remove();
      var toast = doc.createElement("div");
      toast.id = "bubaIdentityToast";
      toast.setAttribute("role", "status");
      toast.style.cssText = "position:fixed;top:18px;right:18px;z-index:2000;max-width:390px;background:#052e16;color:#ecfdf5;border:2px solid #22c55e;border-radius:10px;padding:12px 16px;box-shadow:0 18px 42px rgba(0,0,0,.55);display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;font-weight:700;line-height:1.4;";
      var tx = doc.createElement("span");
      tx.textContent = msg;
      var cls = doc.createElement("button");
      cls.type = "button";
      cls.textContent = "✕";
      cls.style.cssText = "background:transparent;border:0;color:#86efac;font-size:15px;font-weight:700;cursor:pointer;";
      cls.addEventListener("click", function () { toast.remove(); });
      toast.appendChild(tx);
      toast.appendChild(cls);
      doc.body.appendChild(toast);
      setTimeout(function () {
        if (toast && toast.parentNode) toast.remove();
      }, 6500);
    } catch (_) {}
  }

  function renderInlineCards() {
    var hosts = doc.querySelectorAll('[data-buba-google-inline="1"]');
    if (!hosts.length) return;
    var p = loadProfile();
    hosts.forEach(function (host, idx) {
      host.innerHTML = "";
      var box = doc.createElement("div");
      box.style.cssText = "background:#140C05;border:1px solid rgba(232,96,10,0.4);border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;";

      var info = doc.createElement("div");
      info.style.cssText = "font-size:12px;color:#d6cdc2;";
      var st = doc.createElement("strong");
      st.style.color = "#F5A020";
      st.textContent = p.nombre ? (p.nombre + " · BUBA-" + p.clientId) : ("Código Match: BUBA-" + p.clientId);
      info.appendChild(st);

      box.appendChild(info);

      if (hasValidGoogleClientId() && !p.verifiedGoogle) {
        var wrap = doc.createElement("div");
        wrap.id = "hp_g_inline_" + idx;
        box.appendChild(wrap);
        if (win.google && win.google.accounts && win.google.accounts.id) {
          win.google.accounts.id.renderButton(wrap, { theme: "filled_black", size: "medium", text: "continue_with", locale: "es", width: 220 });
        }
      } else {
        var btn = doc.createElement("button");
        btn.type = "button";
        btn.style.cssText = "display:inline-flex;align-items:center;gap:6px;background:#fff;color:#111;border:0;border-radius:6px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;";
        btn.appendChild(makeGoogleGIcon());
        btn.appendChild(doc.createTextNode(p.nombre ? "Editar Perfil / Google" : "Identifícate con Google"));
        btn.addEventListener("click", function () {
          ensureAccountUi();
          if (win._bubaOpenAccountModal) win._bubaOpenAccountModal();
        });
        box.appendChild(btn);
      }

      host.appendChild(box);
    });
  }

  function updateHeaderTrigger() {
    var btn = doc.getElementById("bubaAccountTriggerBtn");
    if (!btn) return;
    var p = loadProfile();
    btn.innerHTML = "";
    btn.appendChild(makeGoogleGIcon());
    var sp = doc.createElement("span");
    sp.textContent = (p.nombre || p.verifiedGoogle)
      ? (String(p.nombre || p.email).split(" ")[0].slice(0, 12) + " · " + p.clientId)
      : "Google · Match";
    btn.appendChild(sp);
  }

  function initGoogleIdentity() {
    if (!hasValidGoogleClientId()) return;
    var clientIdTrim = String(CFG.googleClientId).trim();
    var s = doc.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = function () {
      if (!win.google || !win.google.accounts || !win.google.accounts.id) return;
      win.google.accounts.id.initialize({
        client_id: clientIdTrim,
        ux_mode: "popup",
        callback: function (response) {
          var payload = decodeJwtPayload(response && response.credential);
          if (!payload || payload.aud !== clientIdTrim) return;
          if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") return;
          var p = loadProfile();
          p.googleSub = payload.sub || "";
          p.email = payload.email || p.email;
          p.nombre = payload.name || p.nombre;
          p.verifiedGoogle = (payload.email_verified !== false) && Boolean(payload.email || payload.sub);
          saveProfile(p);
          prefillFormsFromProfile();
          updateHeaderTrigger();
          renderInlineCards();
          if (win._bubaRefreshAccountModal) win._bubaRefreshAccountModal();
          if (win._bubaCloseAccountModal) win._bubaCloseAccountModal();
          showIdentityToast("✓ ¡Cuenta Google conectada! " + (p.nombre || p.email) + " · Match BUBA-" + p.clientId);
        }
      });
      var modal = doc.getElementById("bubaAccountModal");
      if (modal && modal.style.display === "flex" && win._bubaRefreshAccountModal) {
        win._bubaRefreshAccountModal();
      }
      updateHeaderTrigger();
      renderInlineCards();
    };
    doc.head.appendChild(s);
  }

  function bindProfileTrigger() {
    var btn = doc.getElementById("bubaAccountTriggerBtn");
    if (btn && !btn.dataset.bubaBound) {
      btn.dataset.bubaBound = "1";
      btn.addEventListener("click", function () {
        ensureAccountUi();
        if (win._bubaOpenAccountModal) win._bubaOpenAccountModal();
      });
    }
  }

  win.BubaIdentity = {
    getProfile: loadProfile,
    saveProfile: saveProfile,
    formatMatchBullets: formatMatchBullets,
    openModal: function () {
      ensureAccountUi();
      if (win._bubaOpenAccountModal) win._bubaOpenAccountModal();
    },
    config: CFG
  };

  function boot() {
    loadProfile();
    ensureAccountUi();
    bindProfileTrigger();
    updateHeaderTrigger();
    renderInlineCards();
    prefillFormsFromProfile();
    initGoogleIdentity();
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window, document);
