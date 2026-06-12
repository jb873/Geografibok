// ⏸ AVAKTIVERAD 2026-06-10 – används bara av elevbok-stodlarare.js, som är
//    pausad. Filen laddas inte någonstans just nu men är bevarad för återbruk.
//
// sambandsled-detektor.js – hittar sambandsled (konnektorer) i elevtext.
// Inga LLM-anrop; ren textmatchning med ordgränser.
//
// API:
//   window.SambandsledDetektor.hitta(text, bibliotek) -> {
//     traffar:            [ { kategori, konnektor }, ... ],
//     antalUnika:         antal unika konnektorer som hittats,
//     kategorierMedTraff: [ "orsak_verkan", ... ],
//     saknade:            [ { kategori, namn, forslag }, ... ]
//   }
//
// `bibliotek` = sambandsled_bibliotek-objektet ur kvalitetskriterierna.

(function () {
  'use strict';

  var KATEGORI_NAMN = {
    orsak_verkan: 'orsakssamband',
    exempel: 'exempel',
    kontrast: 'kontrast',
    tillagg: 'tillägg',
    sammanfattning: 'sammanfattning'
  };

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function finnsSomOrd(text, fras) {
    try {
      var re = new RegExp('(^|[^\\p{L}\\p{N}])' + escapeRegex(fras) + '($|[^\\p{L}\\p{N}])', 'iu');
      return re.test(text);
    } catch (e) {
      return text.toLowerCase().indexOf(fras.toLowerCase()) >= 0;
    }
  }

  function hitta(text, bibliotek) {
    var traffar = [];
    var kategorier = {};
    var saknade = [];
    var antalUnika = 0;

    if (!bibliotek || !text) {
      return { traffar: traffar, antalUnika: 0, kategorierMedTraff: [], saknade: [] };
    }

    Object.keys(bibliotek).forEach(function (kat) {
      if (kat === 'beskrivning' || !Array.isArray(bibliotek[kat])) {
        return;
      }
      var nagonTraff = false;
      bibliotek[kat].forEach(function (konn) {
        if (finnsSomOrd(text, konn)) {
          traffar.push({ kategori: kat, konnektor: konn });
          antalUnika++; // varje konnektor testas en gång → redan unik
          nagonTraff = true;
        }
      });
      if (nagonTraff) {
        kategorier[kat] = true;
      } else {
        saknade.push({
          kategori: kat,
          namn: KATEGORI_NAMN[kat] || kat,
          forslag: bibliotek[kat][0]
        });
      }
    });

    return {
      traffar: traffar,
      antalUnika: antalUnika,
      kategorierMedTraff: Object.keys(kategorier),
      saknade: saknade
    };
  }

  window.SambandsledDetektor = { hitta: hitta, KATEGORI_NAMN: KATEGORI_NAMN };
})();
