// ⏸ AVAKTIVERAD 2026-06-10 – används bara av elevbok-stodlarare.js, som är
//    pausad. Filen laddas inte någonstans just nu men är bevarad för återbruk.
//
// sprakgranskning.js – regelbaserad språkriktighetskontroll för
// Elevbokens stödlärare. Inga LLM-anrop; allt körs lokalt i webbläsaren.
//
// API:
//   window.Sprakgranskning.granska(text, opts) -> [anmärkning, ...]
//
// opts = {
//   regler:        globala_kriterier.sprakgranskning (toggles),
//   ortnamn:       [ "Sverige", ... ],
//   sarskrivningar:[ { fel, ratt }, ... ]
// }
//
// Varje anmärkning: { kategori, etikett, snippet, applicera(text) }
// där applicera(text) returnerar en korrigerad version av texten
// (används för klickbara förslag).

(function () {
  'use strict';

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Ersätt första förekomsten av `sok` med `ersatt`.
  function replaceForsta(text, sok, ersatt, ignoreCase) {
    var hay = ignoreCase ? text.toLowerCase() : text;
    var idx = hay.indexOf(ignoreCase ? sok.toLowerCase() : sok);
    if (idx < 0) { return text; }
    return text.slice(0, idx) + ersatt + text.slice(idx + sok.length);
  }

  // Helmatchning med ordgränser (unicode-medvetet, faller tillbaka på
  // enkel substring om webbläsaren saknar \p{L}-stöd).
  function finnsSomOrd(text, fras) {
    try {
      var re = new RegExp('(^|[^\\p{L}\\p{N}])' + escapeRegex(fras) + '($|[^\\p{L}\\p{N}])', 'iu');
      return re.test(text);
    } catch (e) {
      return text.toLowerCase().indexOf(fras.toLowerCase()) >= 0;
    }
  }

  function snitt(text, index, len) {
    return text.slice(index, index + (len || 20)).replace(/\s+/g, ' ').trim();
  }

  function granska(text, opts) {
    opts = opts || {};
    var regler = opts.regler || {};
    var anm = [];
    if (!text || !text.trim()) { return anm; }

    // 1. Stor bokstav i textens början
    if (regler.stor_bokstav_efter_punkt !== false) {
      try {
        var mB = text.match(/^(\s*)(\p{Ll})/u);
        if (mB) {
          anm.push({
            kategori: 'borjan',
            etikett: 'Texten börjar med liten bokstav',
            snippet: snitt(text, mB[1].length, 16),
            applicera: function (t) {
              return t.replace(/^(\s*)(\p{Ll})/u, function (m, p1, p2) {
                return p1 + p2.toUpperCase();
              });
            }
          });
        }
      } catch (e) { /* \p{} stöds ej – hoppa över */ }
    }

    // 2. Stor bokstav efter punkt / ! / ?
    if (regler.stor_bokstav_efter_punkt !== false) {
      try {
        var re = /([.!?])(\s+)(\p{Ll})/gu;
        var m;
        while ((m = re.exec(text)) !== null) {
          (function (matchad, ersatt, pos) {
            anm.push({
              kategori: 'efter-punkt',
              etikett: 'Liten bokstav efter punkt',
              snippet: snitt(text, pos, 18),
              applicera: function (t) { return replaceForsta(t, matchad, ersatt, false); }
            });
          })(m[1] + m[2] + m[3], m[1] + m[2] + m[3].toUpperCase(), m.index + m[1].length);
        }
      } catch (e) { /* hoppa över */ }
    }

    // 3. Punkt i slutet
    if (regler.punkt_i_slutet !== false) {
      var trimmad = text.replace(/\s+$/, '');
      if (trimmad.length && !/[.!?]$/.test(trimmad)) {
        anm.push({
          kategori: 'slut-punkt',
          etikett: 'Saknar avslutande skiljetecken',
          snippet: snitt(trimmad.slice(-18), 0, 18),
          applicera: function (t) { return t.replace(/\s+$/, '') + '.'; }
        });
      }
    }

    // 4. Dubbla mellanslag
    if (regler.dubbla_mellanslag !== false && / {2,}/.test(text)) {
      anm.push({
        kategori: 'dubbla-mellanslag',
        etikett: 'Dubbla mellanslag',
        snippet: '',
        applicera: function (t) { return t.replace(/ {2,}/g, ' '); }
      });
    }

    // 5. Mellanslag före skiljetecken
    if (regler.mellanslag_fore_skiljetecken !== false && / +[.,!?]/.test(text)) {
      anm.push({
        kategori: 'mellanslag-skiljetecken',
        etikett: 'Mellanslag före skiljetecken',
        snippet: '',
        applicera: function (t) { return t.replace(/ +([.,!?])/g, '$1'); }
      });
    }

    // 6. Stor bokstav i ortnamn
    if (regler.stor_bokstav_i_ortnamn !== false && opts.ortnamn) {
      opts.ortnamn.forEach(function (ort) {
        try {
          var re2 = new RegExp('(^|[^\\p{L}\\p{N}])(' + escapeRegex(ort) + ')($|[^\\p{L}\\p{N}])', 'giu');
          var mm;
          while ((mm = re2.exec(text)) !== null) {
            var funnen = mm[2];
            if (funnen !== ort && funnen.toLowerCase() === ort.toLowerCase()) {
              (function (felform) {
                anm.push({
                  kategori: 'ortnamn',
                  etikett: '”' + felform + '” → ”' + ort + '”',
                  snippet: '',
                  fel: felform,
                  ratt: ort,
                  applicera: function (t) { return replaceForsta(t, felform, ort, false); }
                });
              })(funnen);
              break; // en anmärkning per ort räcker
            }
          }
        } catch (e) { /* hoppa över */ }
      });
    }

    // 7. Vanliga särskrivningar
    if (regler.vanliga_sarskrivningar !== false && opts.sarskrivningar) {
      opts.sarskrivningar.forEach(function (par) {
        if (par && par.fel && finnsSomOrd(text, par.fel)) {
          anm.push({
            kategori: 'sarskrivning',
            etikett: '”' + par.fel + '” → ”' + par.ratt + '” (särskrivning)',
            snippet: '',
            fel: par.fel,
            ratt: par.ratt,
            applicera: function (t) { return replaceForsta(t, par.fel, par.ratt, true); }
          });
        }
      });
    }

    return anm;
  }

  window.Sprakgranskning = { granska: granska, finnsSomOrd: finnsSomOrd };
})();
