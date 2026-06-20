// tidslinje.js – fyller den sticky tidslinje-headern med delkapitlets avsnitt.
// Markerar nuvarande avsnitt (AVSNITT_ID) som "Du är här". Datafilens sökväg
// anges per sida via data-fil-attributet (skiljer mellan Historia och Geografi).

(function () {
  'use strict';

  function nyEl(tagg, klass) {
    var e = document.createElement(tagg);
    if (klass) { e.className = klass; }
    return e;
  }

  function buildTidslinje(data, container) {
    container.innerHTML = '';
    var inner = nyEl('div', 'tidslinje-inner');
    var avsnitt = (data && data.avsnitt) || [];

    avsnitt.forEach(function (a, idx) {
      var aktiv = (typeof AVSNITT_ID !== 'undefined' && a.id === AVSNITT_ID);
      var lank = nyEl('a', 'tidslinje-avsnitt');
      lank.href = a.fil;
      lank.title = a.titel;

      if (aktiv) {
        lank.setAttribute('aria-current', 'page');
        // Aktivt avsnitt är inte en navigeringslänk — hoppas över i tab-ordning.
        lank.removeAttribute('href');
        lank.setAttribute('tabindex', '-1');
        var label = nyEl('span', 'tidslinje-aktuell-label');
        label.textContent = 'Du är här';
        lank.appendChild(label);
      }

      var titel = nyEl('span', 'tidslinje-titel');
      titel.textContent = a.titel;
      lank.appendChild(titel);

      if (a.ar) {
        var ar = nyEl('span', 'tidslinje-ar');
        ar.textContent = a.ar;
        lank.appendChild(ar);
      }

      inner.appendChild(lank);

      if (idx < avsnitt.length - 1) {
        var sep = nyEl('span', 'tidslinje-skiljare');
        sep.textContent = '·';
        inner.appendChild(sep);
      }
    });

    container.appendChild(inner);
  }

  function loadTidslinje() {
    var container = document.querySelector('.tidslinje-header:not(.djupdykning)');
    if (!container) { return; }

    var sokvag = container.dataset.fil || 'data/avsnittslista.json';

    fetch(sokvag)
      .then(function (r) {
        if (!r.ok) { throw new Error('HTTP ' + r.status); }
        return r.json();
      })
      .then(function (data) {
        buildTidslinje(data, container);
      })
      .catch(function (e) {
        console.error('Kunde inte ladda avsnittslista:', e);
        container.style.display = 'none';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTidslinje);
  } else {
    loadTidslinje();
  }
})();
