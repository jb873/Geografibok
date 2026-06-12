// ⏸ AVAKTIVERAD 2026-06-10 (pedagogiskt val) – denna fil laddas INTE från
//    någon avsnittssida just nu. Sammanfattningsrutan pausades eftersom
//    eleverna skriver i de små frågerutorna, inte i en separat sammanfattning.
//    Filen är bevarad för möjlig återanvändning (ev. i Alphaskolans
//    lärplattform-ramverk). Återaktivera genom att åter länka in
//    css/elevbok-stodlarare.css + sprakgranskning.js + sambandsled-detektor.js
//    + denna fil i avsnittssidorna.
//
// elevbok-stodlarare.js – stödläraren i Elevboken-fliken.
//
// Lägger till EN sammanfattningsruta ("Sammanfattning – din
// provförberedelse") längst ner i Elevboken-fliken, efter alla
// befintliga frågerutor. De befintliga frågerutorna lämnas helt
// orörda (de hanteras av avsnitt-elevbok.js + elevbok.js).
//
// Stödläraren granskar sammanfattningstexten i tre dimensioner:
//   1. Begrepp     (mot uppgift.begrepp)
//   2. Sambandsled (window.SambandsledDetektor)
//   3. Språk       (window.Sprakgranskning)
//
// Beroenden (inkluderas FÖRE denna fil):
//   - sambandsled-detektor.js  -> window.SambandsledDetektor
//   - sprakgranskning.js       -> window.Sprakgranskning
// Valfritt:
//   - avsnitt.js               -> window.autoExpandTextarea
//
// Kräver globalen AVSNITT_ID (sätts i avsnittssidans <script>).
// Inga LLM-anrop. Kriterierna läses från demografi-kvalitetskriterier.json
// i projektets rot. Saknas filen körs sidan vidare utan stödläraren
// (graceful degradation).

(function () {
  'use strict';

  if (typeof AVSNITT_ID === 'undefined' || !AVSNITT_ID) { return; }

  var CRITERIA_URL = '../../demografi-kvalitetskriterier.json';
  var kriterier = null;
  var uppgift = null;
  var globala = {};

  // ---- hjälpare -----------------------------------------------------

  function nyEl(tagg, klass) {
    var e = document.createElement(tagg);
    if (klass) { e.className = klass; }
    return e;
  }

  function avsnittNummer(id) {
    var m = String(id).match(/a(\d+)/i);
    return m ? m[1] : null;
  }

  function nyckel() {
    return 'geo-elevbok-' + AVSNITT_ID + '-sammanfattning';
  }

  function laddaText() {
    try { return localStorage.getItem(nyckel()) || ''; } catch (e) { return ''; }
  }

  // ---- analys -------------------------------------------------------

  function analysera(text) {
    var lower = (text || '').toLowerCase();
    var begreppFunna = uppgift.begrepp.filter(function (b) {
      return lower.indexOf(b.toLowerCase()) >= 0;
    });
    var begreppSaknas = uppgift.begrepp.filter(function (b) {
      return lower.indexOf(b.toLowerCase()) < 0;
    });
    var minBegrepp = uppgift.begrepp_minimum_anvanda || uppgift.begrepp.length;

    var samband = window.SambandsledDetektor
      ? SambandsledDetektor.hitta(text, kriterier.sambandsled_bibliotek)
      : { traffar: [], antalUnika: 0, kategorierMedTraff: [], saknade: [] };

    var sprak = window.Sprakgranskning
      ? Sprakgranskning.granska(text, {
          regler: globala.sprakgranskning || {},
          ortnamn: uppgift.ortnamn || [],
          sarskrivningar: globala.vanliga_sarskrivningar || []
        })
      : [];

    return {
      begreppFunna: begreppFunna,
      begreppSaknas: begreppSaknas,
      minBegrepp: minBegrepp,
      sambandMin: uppgift.sambandsled_minimum || 0,
      samband: samband,
      sprak: sprak
    };
  }

  // ---- indikator (alltid synlig, live) ------------------------------

  function dots(funna, denom) {
    var fyllda = Math.min(funna, denom);
    var s = '';
    for (var i = 0; i < denom; i++) { s += (i < fyllda) ? '🟢' : '⚪'; }
    return s;
  }

  function uppdateraIndikator(indikator, res) {
    var antB = res.begreppFunna.length;
    var antS = res.samband.antalUnika;
    var antSpr = res.sprak.length;

    var sambandSymbol = (antS >= res.sambandMin && res.sambandMin > 0) ? '🟢'
      : (antS > 0 ? '🟡' : '⚪');
    var sambandText = antS + (antS === 1 ? ' hittat' : ' hittade')
      + (res.sambandMin ? ' (mål ' + res.sambandMin + ')' : '');

    var sprakSymbol = (antSpr === 0) ? '✅' : '⚠️';
    var sprakText = (antSpr === 0)
      ? 'inga anmärkningar'
      : antSpr + (antSpr === 1 ? ' sak att se över' : ' saker att se över');

    indikator.innerHTML =
      '<span class="stodind-rad"><span class="stodind-namn">📚 Begrepp</span>' +
        '<span class="stodind-dots">' + dots(antB, res.minBegrepp) + '</span>' +
        '<span class="stodind-varde">' + antB + ' av ' + res.minBegrepp + '</span></span>' +
      '<span class="stodind-rad"><span class="stodind-namn">🔗 Samband</span>' +
        '<span class="stodind-symbol">' + sambandSymbol + '</span>' +
        '<span class="stodind-varde">' + sambandText + '</span></span>' +
      '<span class="stodind-rad"><span class="stodind-namn">✍️ Språk</span>' +
        '<span class="stodind-symbol">' + sprakSymbol + '</span>' +
        '<span class="stodind-varde">' + sprakText + '</span></span>';
  }

  // ---- detaljerad rapport (på begäran, positiv inramning) -----------

  function notis(text) {
    var n = document.getElementById('stodlarare-notis');
    if (!n) {
      n = nyEl('div'); n.id = 'stodlarare-notis'; n.className = 'stodlarare-notis';
      document.body.appendChild(n);
    }
    n.textContent = text;
    n.classList.add('visar');
    setTimeout(function () { n.classList.remove('visar'); }, 2200);
  }

  function byggRapport(rapport, textarea, indikator) {
    var res = analysera(textarea.value);
    rapport.innerHTML = '';

    var h = nyEl('div', 'stodrapport-rubrik');
    h.textContent = '📋 Kvalitetskontroll';
    rapport.appendChild(h);

    // --- BEGREPP (det som fungerar först) ---
    var bSekt = nyEl('div', 'stodrapport-sektion');
    var bH = nyEl('div', 'stodrapport-sektionsrubrik');
    bH.textContent = '📚 Begrepp – ' + res.begreppFunna.length + ' av ' + res.minBegrepp +
      (uppgift.begrepp_minimum_anvanda ? ' (minimum)' : '');
    bSekt.appendChild(bH);
    res.begreppFunna.forEach(function (b) {
      var rad = nyEl('div', 'stodrad ok');
      rad.textContent = '✓ ' + b;
      bSekt.appendChild(rad);
    });
    if (res.begreppFunna.length < res.minBegrepp && res.begreppSaknas.length) {
      var tipsB = nyEl('div', 'stodrad tips');
      tipsB.textContent = '💡 Fler du kan väva in: ' +
        res.begreppSaknas.slice(0, 5).join(', ');
      bSekt.appendChild(tipsB);
    }
    rapport.appendChild(bSekt);

    // --- SAMBANDSLED ---
    var sSekt = nyEl('div', 'stodrapport-sektion');
    var sH = nyEl('div', 'stodrapport-sektionsrubrik');
    sH.textContent = '🔗 Sambandsled – ' + res.samband.antalUnika + ' hittade' +
      (res.sambandMin ? ' (minimum ' + res.sambandMin + ')' : '');
    sSekt.appendChild(sH);
    res.samband.traffar.forEach(function (t) {
      var rad = nyEl('div', 'stodrad ok');
      rad.textContent = '✓ ”' + t.konnektor + '” – ' +
        (SambandsledDetektor.KATEGORI_NAMN[t.kategori] || t.kategori);
      sSekt.appendChild(rad);
    });
    if (res.samband.saknade.length) {
      var tipsS = nyEl('div', 'stodrad tips');
      tipsS.textContent = '💡 Stärk texten med fler sambandsled – klicka för att kopiera:';
      sSekt.appendChild(tipsS);
      res.samband.saknade.slice(0, 4).forEach(function (s) {
        var knapp = nyEl('button', 'stodforslag');
        knapp.type = 'button';
        knapp.textContent = '”' + s.forslag + '” (' + s.namn + ')';
        knapp.addEventListener('click', function () {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(s.forslag).then(function () {
              notis('Kopierat: ”' + s.forslag + '”');
            }, function () { notis('”' + s.forslag + '”'); });
          } else {
            notis('”' + s.forslag + '”');
          }
        });
        sSekt.appendChild(knapp);
      });
    }
    rapport.appendChild(sSekt);

    // --- SPRÅKRIKTIGHET ---
    var spSekt = nyEl('div', 'stodrapport-sektion');
    var spH = nyEl('div', 'stodrapport-sektionsrubrik');
    spH.textContent = res.sprak.length === 0
      ? '✍️ Språkriktighet – inga anmärkningar'
      : '✍️ Språkriktighet – ' + res.sprak.length + ' saker att se över';
    spSekt.appendChild(spH);
    if (res.sprak.length === 0) {
      var okRad = nyEl('div', 'stodrad ok');
      okRad.textContent = '✓ Texten ser språkligt fin ut';
      spSekt.appendChild(okRad);
    } else {
      res.sprak.forEach(function (a) {
        var knapp = nyEl('button', 'stodforslag fix');
        knapp.type = 'button';
        knapp.textContent = '✎ ' + a.etikett + (a.snippet ? '  (…' + a.snippet + '…)' : '');
        knapp.title = 'Klicka för att rätta automatiskt';
        knapp.addEventListener('click', function () {
          textarea.value = a.applicera(textarea.value);
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          byggRapport(rapport, textarea, indikator);
        });
        spSekt.appendChild(knapp);
      });
    }
    rapport.appendChild(spSekt);

    // --- uppmuntran / mjuk påminnelse (aldrig skuldläggande) ---
    var klart = res.begreppFunna.length >= res.minBegrepp &&
      res.samband.antalUnika >= res.sambandMin &&
      res.sprak.length === 0;
    var slut = nyEl('div', 'stodrapport-slutord');
    if (klart) {
      slut.textContent = '🎉 Stark provförberedelse – du har med begreppen, visar samband och skriver tydligt!';
    } else if (res.begreppFunna.length < res.minBegrepp) {
      slut.textContent = '💪 Du är på god väg! På provet behöver du gärna ha med fler av begreppen.';
    } else {
      slut.textContent = '💪 Du är på god väg!';
    }
    rapport.appendChild(slut);
  }

  // ---- skrivyta -----------------------------------------------------

  function laggTillYta(container) {
    if (document.getElementById('stodlarare-sammanfattning')) { return; }

    var sektion = nyEl('section', 'stodlarare-sammanfattning');
    sektion.id = 'stodlarare-sammanfattning';

    var rubrik = nyEl('h3', 'stodlarare-rubrik');
    rubrik.textContent = 'Sammanfattning – din provförberedelse';
    sektion.appendChild(rubrik);

    var instr = nyEl('p', 'stodlarare-instruktion');
    instr.textContent = 'Skriv en sammanhängande sammanfattning av avsnittet. ' +
      'Använd begreppen och visa hur saker hänger ihop. ' +
      'Stödläraren hjälper dig granska kvaliteten.';
    sektion.appendChild(instr);

    var wrapper = nyEl('div', 'stodlarare-textarea-wrapper');
    var textarea = nyEl('textarea', 'stodlarare-textarea');
    textarea.setAttribute('placeholder', 'Skriv din sammanfattning här …');
    textarea.setAttribute('spellcheck', 'true');
    textarea.value = laddaText();
    wrapper.appendChild(textarea);
    sektion.appendChild(wrapper);

    var status = nyEl('div', 'sparstatus');
    status.setAttribute('aria-live', 'polite');
    sektion.appendChild(status);

    var indikator = nyEl('div', 'stodlarare-indikator');
    indikator.setAttribute('role', 'status');
    sektion.appendChild(indikator);

    var knapp = nyEl('button', 'stodlarare-granska-knapp');
    knapp.type = 'button';
    knapp.textContent = 'Granska kvaliteten';
    sektion.appendChild(knapp);

    var rapport = nyEl('div', 'stodlarare-rapport dold');
    sektion.appendChild(rapport);

    container.appendChild(sektion);

    // Auto-expand om hjälpfunktionen finns.
    if (window.autoExpandTextarea) {
      window.autoExpandTextarea(textarea);
      textarea.addEventListener('input', function () { window.autoExpandTextarea(textarea); });
    }

    // Autospara (debounce 800 ms) – sammanfattningen är provförberedelse
    // och är värd att bevara, precis som frågesvaren.
    var sparTimer = null;
    textarea.addEventListener('input', function () {
      status.textContent = 'Sparar …';
      status.classList.add('visar');
      clearTimeout(sparTimer);
      sparTimer = setTimeout(function () {
        try { localStorage.setItem(nyckel(), textarea.value); } catch (e) {}
        status.textContent = 'Sparad';
        setTimeout(function () { status.classList.remove('visar'); }, 3000);
      }, 800);
    });

    // Live-indikator (debounce 500 ms).
    var indTimer = null;
    function koraIndikator() {
      uppdateraIndikator(indikator, analysera(textarea.value));
      if (!rapport.classList.contains('dold')) {
        byggRapport(rapport, textarea, indikator);
      }
    }
    textarea.addEventListener('input', function () {
      clearTimeout(indTimer);
      indTimer = setTimeout(koraIndikator, 500);
    });

    knapp.addEventListener('click', function () {
      var dold = rapport.classList.toggle('dold');
      knapp.textContent = dold ? 'Granska kvaliteten' : 'Dölj granskning';
      if (!dold) { byggRapport(rapport, textarea, indikator); }
    });

    koraIndikator();
  }

  // ---- start --------------------------------------------------------

  function vantaPaFragor() {
    var container = document.getElementById('elevbok-fragor');
    if (!container) { return; }
    if (container.querySelector('.elevbok-fraga-block')) {
      laggTillYta(container);
      return;
    }
    var obs = new MutationObserver(function () {
      if (container.querySelector('.elevbok-fraga-block')) {
        obs.disconnect();
        laggTillYta(container);
      }
    });
    obs.observe(container, { childList: true });
  }

  function init(data) {
    kriterier = data;
    globala = kriterier.globala_kriterier || {};
    var nr = avsnittNummer(AVSNITT_ID);
    uppgift = (kriterier.uppgifter || {})['elevbok-avsnitt-' + nr];
    if (!uppgift) {
      console.warn('Stödläraren: inga kvalitetskriterier för avsnitt ' + nr + ' – hoppar över.');
      return;
    }
    vantaPaFragor();
  }

  function start() {
    fetch(CRITERIA_URL)
      .then(function (r) {
        if (!r.ok) { throw new Error('HTTP ' + r.status); }
        return r.json();
      })
      .then(init)
      .catch(function (e) {
        console.warn('Stödläraren inaktiv: kunde inte ladda demografi-kvalitetskriterier.json.', e);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
