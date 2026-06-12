// avsnitt-elevbok.js – laddar och renderar Elevboken-flikens frågor
// dynamiskt från data/fragor.json.
//
// Beroenden (inkluderas FÖRE denna fil):
//   - elevbok.js   → window.Elevbok (hamtaSvar, skapaAutospara,
//                     startaFlikSynk, visaHistorik)
//   - avsnitt.js   → window.autoExpandTextarea
//
// Sidan ska sätta globalerna AVSNITT_ID och DELKAPITEL_ID innan denna
// fil körs (i en <script>-tagg i headet eller början av body).

(function () {
  'use strict';

  // Klock-ikon (samma som tidigare hårdkodades per textarea).
  var KLOCK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 12 a9 9 0 1 0 3-6.7" />' +
      '<polyline points="3 3 3 6 6 6" />' +
      '<polyline points="12 7 12 12 15.5 14" />' +
    '</svg>';

  function nyEl(tagg, klass) {
    var e = document.createElement(tagg);
    if (klass) {
      e.className = klass;
    }
    return e;
  }

  // Bild-lightbox hanteras av den universella komponenten window.BildModal
  // (js/bildmodal.js), som inkluderas före denna fil.

  // Bygger ett bildgalleri (klickbara pyramider med bildtext).
  function skapaBildgalleri(bilder) {
    var galleri = nyEl('div', 'fraga-bilder');
    bilder.forEach(function (bild) {
      var figur = nyEl('figure', 'fraga-bild');
      var img = nyEl('img');
      img.src = bild.src;
      img.alt = bild.alt || '';
      img.loading = 'lazy';
      img.addEventListener('click', function () {
        // Visa bara landsnamn i modalen (skedet döljs av pedagogiska skäl).
        if (window.BildModal) { BildModal.visa(bild.src, bild.land); }
      });
      figur.appendChild(img);
      // Bara landsnamn – skedet döljs medvetet så att fråga 5
      // (placera in i rätt skede) inte besvaras av bildtexten.
      // Skedet finns kvar i fragor.json för framtida övningar.
      var text = nyEl('figcaption', 'fraga-bild-text');
      text.textContent = bild.land;
      figur.appendChild(text);
      galleri.appendChild(figur);
    });
    return galleri;
  }

  // Bygger ett komplett .elevbok-fraga-block för en fråga.
  function skapaFragaBlock(fraga, nummer, delkapitel) {
    var block = nyEl('div', 'elevbok-fraga-block');
    block.setAttribute('data-fraga-id', fraga.id);
    block.id = fraga.id; // ankarmål för länkar (t.ex. från självskattningen)

    var titel = nyEl('h3', 'elevbok-fraga-titel');
    titel.textContent = nummer + '. ' + fraga.fraga;
    block.appendChild(titel);

    // Bildgalleri ovanför textarean om frågan har bilder.
    if (fraga.bilder && fraga.bilder.length) {
      block.appendChild(skapaBildgalleri(fraga.bilder));
    }

    var wrapper = nyEl('div', 'elevbok-textarea-wrapper');

    var textarea = nyEl('textarea', 'elevbok-textarea');
    textarea.setAttribute('data-delkapitel', delkapitel);
    textarea.setAttribute('data-fraga-id', fraga.id);
    textarea.setAttribute('placeholder', 'Skriv ditt svar här …');
    textarea.setAttribute('spellcheck', 'true');
    wrapper.appendChild(textarea);

    var knapp = nyEl('button', 'historik-ikon');
    knapp.type = 'button';
    knapp.title = 'Versionshistorik';
    knapp.setAttribute('aria-label', 'Visa versionshistorik');
    knapp.innerHTML = KLOCK_SVG;
    wrapper.appendChild(knapp);

    block.appendChild(wrapper);

    var status = nyEl('div', 'sparstatus');
    status.setAttribute('aria-live', 'polite');
    block.appendChild(status);

    return block;
  }

  function skapaSeparator() {
    var sep = nyEl('div', 'fordjupning-separator');
    sep.innerHTML =
      '<hr class="fordjupning-linje">' +
      '<div class="fordjupning-label">FÖRDJUPNINGSFRÅGOR</div>';
    return sep;
  }

  // Kopplar datalagret till varje renderad textarea.
  function initTextareor(container) {
    container.querySelectorAll('.elevbok-textarea').forEach(function (textarea) {
      var delkapitel = textarea.dataset.delkapitel;
      var fragaId = textarea.dataset.fragaId;
      var block = textarea.closest('.elevbok-fraga-block');
      var status = block.querySelector('.sparstatus');

      // Fyll i tidigare sparat svar.
      var sparat = Elevbok.hamtaSvar(delkapitel, fragaId);
      if (sparat) {
        textarea.value = sparat;
      }

      // Initialhöjd + auto-expand vid skrivande (textarean finns inte
      // när avsnitt.js körde, så vi binder den här).
      if (window.autoExpandTextarea) {
        window.autoExpandTextarea(textarea);
        textarea.addEventListener('input', function () {
          window.autoExpandTextarea(textarea);
        });
      }

      // Autospara (debounce + statusindikator).
      Elevbok.skapaAutospara(textarea, delkapitel, fragaId, status);
    });

    // Historik-ikon → öppna versionshistorik-modalen.
    container.querySelectorAll('.historik-ikon').forEach(function (ikon) {
      ikon.addEventListener('click', function () {
        var textarea = ikon.closest('.elevbok-textarea-wrapper')
          .querySelector('.elevbok-textarea');
        if (typeof Elevbok.visaHistorik === 'function') {
          Elevbok.visaHistorik(textarea.dataset.delkapitel, textarea.dataset.fragaId);
        }
      });
    });
  }

  // Flik-synk: uppdatera rutorna om eleven skriver i en annan öppen flik.
  function startaFlikSynk() {
    var nyckel = 'geo-elev-svar-' + DELKAPITEL_ID;
    Elevbok.startaFlikSynk(function (andradNyckel) {
      if (andradNyckel !== nyckel) {
        return;
      }
      document.querySelectorAll('#elevbok-fragor .elevbok-textarea').forEach(function (textarea) {
        var aktuell = Elevbok.hamtaSvar(textarea.dataset.delkapitel, textarea.dataset.fragaId);
        // Skriv inte över rutan eleven just nu redigerar.
        if (document.activeElement !== textarea && textarea.value !== aktuell) {
          textarea.value = aktuell;
          if (window.autoExpandTextarea) {
            window.autoExpandTextarea(textarea);
          }
        }
      });
    });
  }

  function renderaFragor(data) {
    var container = document.getElementById('elevbok-fragor');
    if (!container) {
      return;
    }

    var avsnitt = (data.avsnitt || []).filter(function (a) {
      return a.id === AVSNITT_ID;
    })[0];

    container.innerHTML = '';

    if (!avsnitt || !avsnitt.fragor || !avsnitt.fragor.length) {
      var tom = nyEl('p', 'laddar-fel');
      tom.textContent = 'Inga frågor hittades för detta avsnitt.';
      container.appendChild(tom);
      return;
    }

    // Separat 1-baserad numrering för grund- respektive fördjupningsfrågor.
    var grundNr = 0;
    var fordjupNr = 0;
    var separatorInsatt = false;

    avsnitt.fragor.forEach(function (fraga) {
      if (fraga.typ === 'fordjupning') {
        if (!separatorInsatt) {
          container.appendChild(skapaSeparator());
          separatorInsatt = true;
        }
        fordjupNr++;
        container.appendChild(skapaFragaBlock(fraga, fordjupNr, DELKAPITEL_ID));
      } else {
        grundNr++;
        container.appendChild(skapaFragaBlock(fraga, grundNr, DELKAPITEL_ID));
      }
    });

    // Egna frågor sist (med "+ Lägg till"-knapp).
    if (window.EgnaFragor) {
      var egnaHost = nyEl('div', 'egna-fragor-host');
      container.appendChild(egnaHost);
      EgnaFragor.renderaEgnaFragor(egnaHost, DELKAPITEL_ID, AVSNITT_ID, { visaLaggTill: true });
    }

    initTextareor(container);
    startaFlikSynk();
    hanteraHash();
  }

  // Om sidan öppnats med #fraga_id (t.ex. från självskattningen): byt
  // till Elevboken-fliken och scrolla fram frågan.
  function hanteraHash() {
    var hash = location.hash.slice(1);
    if (!hash) { return; }
    var mal = document.getElementById(hash);
    if (!mal || !mal.classList.contains('elevbok-fraga-block')) { return; }
    var flik = document.querySelector('.flik[data-flik="elevboken"]');
    if (flik) { flik.click(); }
    mal.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function visaFel() {
    var container = document.getElementById('elevbok-fragor');
    if (container) {
      container.innerHTML =
        '<p class="laddar-fel">Kunde inte ladda frågor. Kontrollera ' +
        'att data/fragor.json finns.</p>';
    }
  }

  function start() {
    fetch('data/fragor.json')
      .then(function (r) {
        if (!r.ok) {
          throw new Error('HTTP ' + r.status);
        }
        return r.json();
      })
      .then(renderaFragor)
      .catch(function (e) {
        console.error('Kunde inte ladda fragor.json:', e);
        visaFel();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
