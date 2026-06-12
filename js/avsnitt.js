// avsnitt.js – interaktion för avsnittsmallen
//
// Funktioner:
//   1. Flikväxlare  (Läs / Öva / Elevboken)
//   2. Nivåväljare  (Enkel / Standard / Fördjupning)
//   3. Underdelsväxlare (A / B / C) – flerdelade avsnitt (modell 2)
//   4. Auto-expand av elevbokens textareor
//   5. Brödtextbilder → lightbox
//
// UNDERDELAR (modell 2):
//   - Avsnittet har EN flikrad (Läs / Öva / Elevboken). Underdelsväljaren
//     ligger inuti Läs-fliken och styr bara texten: den togglar .dold på
//     .underdel-text-divar. Öva och Elevboken är gemensamma för hela
//     avsnittet. Nivåväljaren är gemensam för underdelarnas texter.
//   - Sidor utan underdelar (t.ex. demografi) fungerar oförändrat – en
//     enda scope, exakt som tidigare. scopeRotter() behåller stöd för ev.
//     framtida .underdel-wrappers men returnerar [document] när inga finns.
//
// Ingen localStorage-logik för elevsvar här – den ligger i elevbok.js.

(function () {
  'use strict';

  // ---------- Auto-expand av textarea ----------
  function autoExpandTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
  window.autoExpandTextarea = autoExpandTextarea;

  function initAutoExpand() {
    document.querySelectorAll('.elevbok-textarea').forEach(function (textarea) {
      autoExpandTextarea(textarea);
      textarea.addEventListener('input', function () { autoExpandTextarea(textarea); });
    });
  }

  // ---------- Scope-rötter ----------
  // Lista av element att scopa flik/nivå-logiken inom. Finns .underdel →
  // en scope per underdel. Annars hela dokumentet (gamla strukturen).
  function scopeRotter() {
    var u = document.querySelectorAll('.underdel');
    return u.length ? Array.prototype.slice.call(u) : [document];
  }

  // ---------- Flikväxlare (scoped) ----------
  // Panelens nyckel = data-flik (ny struktur) eller id (gammal struktur).
  function initFlikar() {
    scopeRotter().forEach(function (scope) {
      var flikar = scope.querySelectorAll('.flik');
      var paneler = scope.querySelectorAll('.flik-innehall');
      flikar.forEach(function (flik) {
        flik.addEventListener('click', function () {
          var mal = flik.getAttribute('data-flik');
          flikar.forEach(function (f) { f.classList.toggle('aktiv', f === flik); });
          paneler.forEach(function (panel) {
            var nyckel = panel.getAttribute('data-flik') || panel.id;
            panel.classList.toggle('dold', nyckel !== mal);
          });
        });
      });
    });
  }

  // ---------- Nivåväljare (scoped) ----------
  function initNivaer() {
    scopeRotter().forEach(function (scope) {
      var valjare = scope.querySelector('.niva-valjare');
      if (!valjare) { return; }
      var knappar = valjare.querySelectorAll('.niva-knapp');
      var nyckel = valjare.getAttribute('data-niva-nyckel');
      var innehall = scope.querySelectorAll('.niva-innehall');

      function visaNiva(niva, spara) {
        knappar.forEach(function (k) { k.classList.toggle('aktiv', k.dataset.niva === niva); });
        innehall.forEach(function (block) { block.classList.toggle('dold', block.dataset.niva !== niva); });
        if (spara && nyckel) {
          try { localStorage.setItem(nyckel, niva); } catch (e) {}
        }
      }

      knappar.forEach(function (knapp) {
        knapp.addEventListener('click', function () { visaNiva(knapp.dataset.niva, true); });
      });

      var start = 'standard';
      if (nyckel) {
        try { var s = localStorage.getItem(nyckel); if (s) { start = s; } } catch (e) {}
      }
      visaNiva(start, false);
    });
  }

  // ---------- Underdelsväxlare (A / B / C) – modell 2 ----------
  // Ligger inuti Läs-fliken och styr BARA texten: klick på .underdel-knapp
  // togglar .dold på .underdel-text-divar med matchande data-underdel.
  // Öva och Elevboken är gemensamma för hela avsnittet. Startval:
  // URL-fragment (#a/#b) → localStorage → första underdelen.
  // Körs bara på sidor som har underdelar.
  function initUnderdelar() {
    var knappar = document.querySelectorAll('.underdel-knapp');
    if (!knappar.length) { return; }
    var texter = document.querySelectorAll('.underdel-text');
    var avsnitt = (typeof AVSNITT_ID !== 'undefined') ? AVSNITT_ID : '';
    var delkapitel = (typeof DELKAPITEL_ID !== 'undefined') ? DELKAPITEL_ID : '';
    var nyckel = 'geo-underdel-' + delkapitel + '-' + avsnitt;

    function finns(bokstav) {
      if (!bokstav) { return false; }
      try {
        return !!document.querySelector('.underdel-text[data-underdel="' + bokstav + '"]');
      } catch (e) { return false; }
    }

    function visaUnderdel(bokstav, spara) {
      texter.forEach(function (t) {
        t.classList.toggle('dold', t.getAttribute('data-underdel') !== bokstav);
      });
      knappar.forEach(function (b) {
        b.classList.toggle('aktiv', b.getAttribute('data-underdel') === bokstav);
      });
      if (spara) {
        try { localStorage.setItem(nyckel, bokstav); } catch (e) {}
      }
    }

    knappar.forEach(function (knapp) {
      knapp.addEventListener('click', function () {
        visaUnderdel(knapp.getAttribute('data-underdel'), true);
      });
    });

    var start = null;
    var frag = (location.hash || '').replace(/^#/, '').toLowerCase();
    if (finns(frag)) { start = frag; }
    if (!start) {
      try { var s = localStorage.getItem(nyckel); if (finns(s)) { start = s; } } catch (e) {}
    }
    if (!start) { start = knappar[0].getAttribute('data-underdel'); }
    visaUnderdel(start, false);
  }

  // ---------- Brödtextbilder → lightbox ----------
  function initBrodtextBilder() {
    if (!window.BildModal) { return; }
    document.querySelectorAll('.brodtext-bild img').forEach(function (img) {
      img.addEventListener('click', function () {
        var fig = img.closest('figure');
        var cap = fig ? fig.querySelector('figcaption') : null;
        BildModal.visa(img.getAttribute('src'), cap ? cap.textContent : img.alt);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initFlikar();
    initNivaer();
    initUnderdelar();
    initAutoExpand();
    initBrodtextBilder();
  });
})();
