// avsnitt.js – interaktion för avsnittsmallen
//
// Funktioner i detta skede:
//   1. Flikväxlare  (Läs / Öva / Elevboken)
//   2. Nivåväljare  (Enkel / Standard / Fördjupning)
//   3. Auto-expand av elevbokens textareor (växer med innehållet)
//
// Ingen localStorage-logik här – den ligger i elevbok.js / sparning.js.

(function () {
  'use strict';

  // ---------- Auto-expand av textarea ----------
  // Justerar höjden så hela texten syns utan intern scroll. Exponeras
  // globalt så avsnittssidan kan kalla den direkt efter att ha fyllt i
  // sparat svar (rätt initialhöjd utan flimmer).
  function autoExpandTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
  window.autoExpandTextarea = autoExpandTextarea;

  function initAutoExpand() {
    document.querySelectorAll('.elevbok-textarea').forEach(function (textarea) {
      // Initialhöjd baserad på befintligt innehåll vid sidladdning.
      autoExpandTextarea(textarea);
      // Justera löpande medan eleven skriver.
      textarea.addEventListener('input', function () {
        autoExpandTextarea(textarea);
      });
    });
  }

  // ---------- Flikväxlare ----------
  // Varje .flik har data-flik="laes|ova|skriv" som matchar
  // id på motsvarande .flik-innehall.
  function initFlikar() {
    var flikar = document.querySelectorAll('.flik');
    var paneler = document.querySelectorAll('.flik-innehall');

    flikar.forEach(function (flik) {
      flik.addEventListener('click', function () {
        var mal = flik.getAttribute('data-flik');

        flikar.forEach(function (f) {
          f.classList.toggle('aktiv', f === flik);
        });

        paneler.forEach(function (panel) {
          panel.classList.toggle('dold', panel.id !== mal);
        });
      });
    });
  }

  // ---------- Nivåväljare ----------
  // Byter aktiv knapp OCH visar rätt nivåinnehåll. Generisk:
  //   - .niva-valjare kan ha data-niva-nyckel="..." → vald nivå sparas
  //     i localStorage och återställs vid sidladdning (annars 'standard').
  //   - Nivåinnehåll: element med klass .niva-innehall och data-niva
  //     ("enkel" | "standard" | "fordjupning"). Saknas sådana sker bara
  //     knappväxling (sidor utan nivåtext påverkas inte).
  function initNivaer() {
    var valjare = document.querySelector('.niva-valjare');
    if (!valjare) { return; }
    var knappar = valjare.querySelectorAll('.niva-knapp');
    var nyckel = valjare.getAttribute('data-niva-nyckel');
    var innehall = document.querySelectorAll('.niva-innehall');

    function visaNiva(niva, spara) {
      knappar.forEach(function (k) {
        k.classList.toggle('aktiv', k.dataset.niva === niva);
      });
      innehall.forEach(function (block) {
        block.classList.toggle('dold', block.dataset.niva !== niva);
      });
      if (spara && nyckel) {
        try { localStorage.setItem(nyckel, niva); } catch (e) {}
      }
    }

    knappar.forEach(function (knapp) {
      knapp.addEventListener('click', function () {
        visaNiva(knapp.dataset.niva, true);
      });
    });

    // Initial nivå: sparad (om nyckel) annars 'standard'.
    var start = 'standard';
    if (nyckel) {
      try { var s = localStorage.getItem(nyckel); if (s) { start = s; } } catch (e) {}
    }
    visaNiva(start, false);
  }

  // ---------- Brödtextbilder → lightbox ----------
  // Gör Läs-flikens bilder (.brodtext-bild img) klickbara; öppnar den
  // universella BildModal med bildtexten (figcaption) under.
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
    initAutoExpand();
    initBrodtextBilder();
  });
})();
