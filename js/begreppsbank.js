// begreppsbank.js – interaktiv begreppsbank med upplåsningslogik.
//
// Beroenden (inkluderas FÖRE denna fil):
//   - elevbok.js → window.Elevbok (hamtaBegreppsText, sparaBegreppsText,
//                  arBegreppUpplast, markeraBegreppUpplast)
//
// Sidan ska sätta globalen DELKAPITEL_ID innan denna fil körs.

(function () {
  'use strict';

  // Tröskel: 15 ord + minst 1 nyckelord
  // Pedagogisk princip: utförlighet (ord) + grundförståelse (nyckelord)
  // Tröskeln kan justeras om vi senare ser att den är för enkel eller svår
  var MIN_ORD = 15;
  var MIN_NYCKELORD = 1;
  var AUTOSPARA_DEBOUNCE = 2000;
  var SPARAD_VISNINGSTID = 3000;

  // ---------- Hjälpfunktioner ----------

  function raknaOrd(text) {
    return text.trim().split(/\s+/).filter(function (o) {
      return o.length > 0;
    }).length;
  }

  function matchaNyckelord(text, nyckelord) {
    var normalText = text.toLowerCase();
    return nyckelord.filter(function (nyckel) {
      return normalText.indexOf(nyckel.toLowerCase()) !== -1;
    });
  }

  function nyEl(tagg, klass) {
    var e = document.createElement(tagg);
    if (klass) {
      e.className = klass;
    }
    return e;
  }

  var romerska = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

  // ---------- Rendering av ett begreppskort ----------

  function skapaBegreppsKort(begrepp, delkapitel) {
    var kort = nyEl('div', 'begrepp-kort');
    kort.setAttribute('data-begrepp-id', begrepp.id);
    kort.id = begrepp.id; // ankarmål för länkar från elevbok-vyerna

    // Statusikon i hörnet
    var ikon = nyEl('span', 'begrepp-ikon');
    kort.appendChild(ikon);

    // Term
    var term = nyEl('h3', 'begrepp-term');
    term.textContent = begrepp.term;
    kort.appendChild(term);

    // Textarea
    var textarea = nyEl('textarea', 'begrepp-textarea');
    textarea.setAttribute('placeholder', 'Skriv din egen definition här...');
    textarea.setAttribute('spellcheck', 'true');
    kort.appendChild(textarea);

    // Rad under textarean: progress + sparstatus
    var rad = nyEl('div', 'begrepp-rad');

    var progress = nyEl('div', 'progress-indikator');
    rad.appendChild(progress);

    var sparstatus = nyEl('div', 'begrepp-sparstatus');
    sparstatus.setAttribute('aria-live', 'polite');
    rad.appendChild(sparstatus);

    kort.appendChild(rad);

    // Visa förklaring-knapp
    var knapp = nyEl('button', 'visa-forklaring-knapp');
    knapp.type = 'button';
    knapp.textContent = 'Visa förklaring';
    kort.appendChild(knapp);

    // Förklaringspanel (byggs en gång, döljs/visas)
    var panel = nyEl('div', 'forklaring-panel dold');
    if (begrepp.etymologi) {
      var ety = nyEl('p', 'forklaring-etymologi');
      ety.textContent = begrepp.etymologi;
      panel.appendChild(ety);
    }
    var fork = nyEl('p', 'forklaring-text');
    fork.textContent = begrepp.forklaring;
    panel.appendChild(fork);
    kort.appendChild(panel);

    // ---------- Tillstånd och logik ----------

    var nyckelord = begrepp.nyckelord || [];
    var antalNyckelord = nyckelord.length;

    function renderaProgress() {
      var text = textarea.value;
      var ord = raknaOrd(text);
      var traffade = matchaNyckelord(text, nyckelord).length;

      // Bygg nyckelords-prickar (visar inte VILKA nyckelord)
      var prickar = '';
      for (var i = 0; i < antalNyckelord; i++) {
        var traffad = i < traffade;
        prickar += '<span class="nyckelord-pricka' +
          (traffad ? ' traffad' : '') + '">' +
          (traffad ? '✓' : '◯') + '</span>';
      }

      progress.innerHTML =
        '<span class="progress-ord">' + ord + ' / ' + MIN_ORD + ' ord</span>' +
        '<span class="progress-sep">•</span>' +
        '<span class="progress-nyckel">Nyckelord: ' + prickar + '</span>';

      return { ord: ord, traffade: traffade };
    }

    function uppfyllerKrav(status) {
      return status.ord >= MIN_ORD && status.traffade >= MIN_NYCKELORD;
    }

    // Sätter kortets visuella tillstånd. Upplåst är permanent.
    function uppdateraTillstand() {
      var status = renderaProgress();
      var redanUpplast = Elevbok.arBegreppUpplast(delkapitel, begrepp.id);
      var harText = textarea.value.trim().length > 0;

      kort.classList.remove('begrepp-tomt', 'begrepp-skriva', 'begrepp-upplast');

      if (redanUpplast) {
        kort.classList.add('begrepp-upplast');
        ikon.textContent = '✓';
        knapp.disabled = false;
      } else if (harText) {
        kort.classList.add('begrepp-skriva');
        ikon.textContent = '◯';
        knapp.disabled = !uppfyllerKrav(status);
      } else {
        kort.classList.add('begrepp-tomt');
        ikon.textContent = '◯';
        knapp.disabled = true;
      }
      return status;
    }

    // Autospara med debounce + diskret statusindikator.
    var sparaTimer = null;
    var doljTimer = null;

    function utforSparning() {
      sparstatus.textContent = 'Sparar...';
      Elevbok.sparaBegreppsText(delkapitel, begrepp.id, textarea.value);
      sparstatus.textContent = 'Sparad';
      if (doljTimer) {
        clearTimeout(doljTimer);
      }
      doljTimer = setTimeout(function () {
        sparstatus.textContent = '';
      }, SPARAD_VISNINGSTID);
    }

    textarea.addEventListener('input', function () {
      autoExpand();
      uppdateraTillstand();
      if (sparaTimer) {
        clearTimeout(sparaTimer);
      }
      sparaTimer = setTimeout(utforSparning, AUTOSPARA_DEBOUNCE);
    });

    function autoExpand() {
      if (window.autoExpandTextarea) {
        window.autoExpandTextarea(textarea);
      }
    }

    // Knapp: lås upp vid första klick, toggla sedan visa/dölj.
    knapp.addEventListener('click', function () {
      if (knapp.disabled) {
        return;
      }
      // Markera upplåst permanent första gången.
      if (!Elevbok.arBegreppUpplast(delkapitel, begrepp.id)) {
        Elevbok.markeraBegreppUpplast(delkapitel, begrepp.id);
        uppdateraTillstand();
        if (typeof onUpplast === 'function') {
          onUpplast();
        }
      }
      var visar = !panel.classList.contains('dold');
      if (visar) {
        panel.classList.add('dold');
        knapp.textContent = 'Visa förklaring';
      } else {
        panel.classList.remove('dold');
        knapp.textContent = 'Dölj förklaring';
      }
    });

    // Callback som sätts av anroparen (för att uppdatera avsnittsprogress).
    var onUpplast = null;
    kort._setOnUpplast = function (cb) { onUpplast = cb; };

    // ---------- Initialt tillstånd ----------
    var sparad = Elevbok.hamtaBegreppsText(delkapitel, begrepp.id);
    if (sparad) {
      textarea.value = sparad;
    }
    uppdateraTillstand();
    // Initialhöjd efter att värdet fyllts i (textarean kan vara i dold flik
    // men sätts ändå; uppdateras även vid input).
    autoExpand();

    kort._arUpplast = function () {
      return Elevbok.arBegreppUpplast(delkapitel, begrepp.id);
    };

    return kort;
  }

  // ---------- Rendering av hela sidan ----------

  function renderaBegreppsbank(data) {
    var container = document.getElementById('begreppsbank-innehall');
    var navContainer = document.getElementById('begreppsbank-nav');
    if (!container) {
      return;
    }

    var avsnittLista = data.avsnitt || [];
    container.innerHTML = '';
    if (navContainer) {
      navContainer.innerHTML = '';
    }

    if (!avsnittLista.length) {
      visaFel();
      return;
    }

    avsnittLista.forEach(function (avsnitt) {
      var grupp = nyEl('section', 'avsnitt-grupp');
      var sektionId = 'sektion-' + avsnitt.id;
      grupp.id = sektionId;

      var rubrik = nyEl('h2', 'avsnitt-grupp-rubrik');
      rubrik.textContent = romerska[avsnitt.nummer] + '. ' + avsnitt.titel;
      grupp.appendChild(rubrik);

      var progress = nyEl('p', 'avsnitt-progress');
      grupp.appendChild(progress);

      var grid = nyEl('div', 'begrepp-grid');
      var begreppLista = avsnitt.begrepp || [];
      var kortLista = [];

      function uppdateraAvsnittsProgress() {
        var upplasta = kortLista.filter(function (k) {
          return k._arUpplast();
        }).length;
        var totalt = begreppLista.length;
        progress.textContent = totalt + ' begrepp – ' + upplasta + ' av ' + totalt + ' upplåsta';
        // Uppdatera även nav-länken
        if (navContainer) {
          var navLank = navContainer.querySelector('[data-nav="' + sektionId + '"]');
          if (navLank) {
            navLank.querySelector('.nav-progress').textContent =
              '(' + upplasta + '/' + totalt + ')';
          }
        }
      }

      begreppLista.forEach(function (begrepp) {
        var kort = skapaBegreppsKort(begrepp, DELKAPITEL_ID);
        kort._setOnUpplast(uppdateraAvsnittsProgress);
        kortLista.push(kort);
        grid.appendChild(kort);
      });

      grupp.appendChild(grid);
      container.appendChild(grupp);

      uppdateraAvsnittsProgress();

      // Navigationslänk
      if (navContainer) {
        var lank = nyEl('a', 'nav-lank');
        lank.href = '#' + sektionId;
        lank.setAttribute('data-nav', sektionId);
        lank.innerHTML =
          '<span class="nav-titel">Avsnitt ' + avsnitt.nummer + '</span> ' +
          '<span class="nav-progress"></span>';
        navContainer.appendChild(lank);
        // Sätt initial progress i navlänken
        var upplasta = kortLista.filter(function (k) { return k._arUpplast(); }).length;
        lank.querySelector('.nav-progress').textContent =
          '(' + upplasta + '/' + begreppLista.length + ')';
      }
    });

    aktiveraNavMarkering();
  }

  // Markera aktuell sektion i navigationen vid scroll.
  function aktiveraNavMarkering() {
    var navContainer = document.getElementById('begreppsbank-nav');
    if (!navContainer || !('IntersectionObserver' in window)) {
      return;
    }
    var lankar = navContainer.querySelectorAll('.nav-lank');
    var observer = new IntersectionObserver(function (poster) {
      poster.forEach(function (post) {
        if (post.isIntersecting) {
          var id = post.target.id;
          lankar.forEach(function (l) {
            l.classList.toggle('aktiv', l.getAttribute('data-nav') === id);
          });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });

    document.querySelectorAll('.avsnitt-grupp').forEach(function (g) {
      observer.observe(g);
    });
  }

  function visaFel() {
    var container = document.getElementById('begreppsbank-innehall');
    if (container) {
      container.innerHTML =
        '<p class="laddar-fel">Kunde inte ladda begrepp. Kontrollera ' +
        'att data/begrepp.json finns.</p>';
    }
  }

  function start() {
    fetch('data/begrepp.json')
      .then(function (r) {
        if (!r.ok) {
          throw new Error('HTTP ' + r.status);
        }
        return r.json();
      })
      .then(renderaBegreppsbank)
      .catch(function (e) {
        console.error('Kunde inte ladda begrepp.json:', e);
        visaFel();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
