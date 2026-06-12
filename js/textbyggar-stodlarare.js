// textbyggar-stodlarare.js – hjälp-popup för redogörelsekort i flipcards.
// Visar stödord, klickbara startfraser, strukturtips och ett universellt
// konnektor-bibliotek. Inget AI – allt är förkurerat i JSON.
//
// API:  window.TextbyggarStodlarare.oppna(kort, textarea)
//   kort     – redogörelsekortobjektet (med .stodlarare)
//   textarea – elevens textruta att infoga fraser i
//
// Konnektorer hämtas från ../../data/konnektorer.json (cachas).

window.TextbyggarStodlarare = (function () {
  'use strict';

  var KONN_URL = '../../data/konnektorer.json';
  var konnCache = null;

  function hamtaKonnektorer() {
    if (konnCache) { return konnCache; }
    konnCache = fetch(KONN_URL)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
    return konnCache;
  }

  function el(tagg, klass, text) {
    var e = document.createElement(tagg);
    if (klass) { e.className = klass; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  function infoga(textarea, text, somForstaMening) {
    var nuv = textarea.value || '';
    if (somForstaMening) {
      textarea.value = text + (nuv.trim() ? ' ' + nuv : ' ');
    } else {
      var sep = (nuv && !/\s$/.test(nuv)) ? ' ' : '';
      textarea.value = nuv + sep + text + ' ';
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  }

  function oppna(kort, textarea) {
    var s = (kort && kort.stodlarare) || {};

    var overlay = el('div', 'txbygg-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Hjälp att komma igång');

    var panel = el('div', 'txbygg-panel');

    panel.appendChild(el('h3', 'txbygg-rubrik', '💡 Lite hjälp på vägen'));

    function stang() {
      overlay.remove();
      document.removeEventListener('keydown', vidEsc);
    }
    function vidEsc(e) { if (e.key === 'Escape') { stang(); } }

    // --- Stödord (visas, ej klickbara – inspiration) ---
    if (s.stodord && s.stodord.length) {
      var sekO = el('div', 'txbygg-sektion');
      sekO.appendChild(el('div', 'txbygg-sektion-rubrik', 'Använd gärna dessa ord i ditt svar:'));
      s.stodord.forEach(function (ord) {
        sekO.appendChild(el('span', 'txbygg-chip', ord));
      });
      panel.appendChild(sekO);
    }

    // --- Startfraser (klickbara → första meningen) ---
    if (s.startfraser && s.startfraser.length) {
      var sekF = el('div', 'txbygg-sektion');
      sekF.appendChild(el('div', 'txbygg-sektion-rubrik', 'Klicka för att börja med en av dessa:'));
      s.startfraser.forEach(function (fras) {
        var knapp = el('button', 'txbygg-fras', fras);
        knapp.type = 'button';
        knapp.addEventListener('click', function () {
          infoga(textarea, fras, true);
          stang();
        });
        sekF.appendChild(knapp);
      });
      panel.appendChild(sekF);
    }

    // --- Strukturtips ---
    if (s.tip_for_struktur) {
      var sekT = el('div', 'txbygg-sektion');
      sekT.appendChild(el('div', 'txbygg-sektion-rubrik', 'Struktur:'));
      sekT.appendChild(el('div', 'txbygg-tip', s.tip_for_struktur));
      panel.appendChild(sekT);
    }

    // --- Konnektorer (laddas på begäran) ---
    var sekK = el('div', 'txbygg-sektion');
    var konnKnapp = el('button', 'txbygg-konn', '🔗 Visa sambandsord (konnektorer)');
    konnKnapp.type = 'button';
    var konnHost = el('div', 'txbygg-konn-host');
    sekK.appendChild(konnKnapp);
    sekK.appendChild(konnHost);
    panel.appendChild(sekK);

    var konnLaddat = false;
    konnKnapp.addEventListener('click', function () {
      if (konnLaddat) {
        konnHost.classList.toggle('dold');
        return;
      }
      konnKnapp.textContent = '🔗 Laddar …';
      hamtaKonnektorer().then(function (data) {
        konnLaddat = true;
        konnKnapp.textContent = '🔗 Sambandsord (konnektorer)';
        if (!data || !data.kategorier) {
          konnHost.appendChild(el('div', 'txbygg-tip', 'Konnektorlistan kunde inte laddas.'));
          return;
        }
        data.kategorier.forEach(function (kat) {
          var grupp = el('div', 'txbygg-konn-grupp');
          grupp.appendChild(el('div', 'txbygg-konn-kategori', kat.rubrik));
          (kat.fraser || []).forEach(function (fras) {
            var k = el('button', 'txbygg-konn', fras);
            k.type = 'button';
            k.addEventListener('click', function () {
              infoga(textarea, fras, false);
              stang();
            });
            grupp.appendChild(k);
          });
          konnHost.appendChild(grupp);
        });
      });
    });

    // --- Stäng ---
    var rad = el('div', 'txbygg-knapprad');
    var stangKnapp = el('button', 'flip-knapp sekundar', 'Stäng');
    stangKnapp.type = 'button';
    stangKnapp.addEventListener('click', stang);
    rad.appendChild(stangKnapp);
    panel.appendChild(rad);

    overlay.appendChild(panel);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) { stang(); }
    });
    document.addEventListener('keydown', vidEsc);
    document.body.appendChild(overlay);
  }

  return { oppna: oppna };
})();
