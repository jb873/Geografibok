// sjalvskattning.js – självskattningsmatris (trafikljus) för
// kapitelnivå och boknivå.
//
// Sidan sätter konfigurationen:
//   const VY_TYP = 'kapitel' | 'huvud';
//   const DELKAPITEL_LISTA = [{ id, titel, matrisUrl }];
//
// Beroenden (inkluderas FÖRE denna fil):
//   - elevbok.js → window.Elevbok (identitet)

(function () {
  'use strict';

  var SKATTNING_NYCKEL = 'geo-elev-skattning';
  var FARGER = ['gron', 'gul', 'orange'];

  function nyEl(tagg, klass) {
    var e = document.createElement(tagg);
    if (klass) { e.className = klass; }
    return e;
  }

  // ---------- Skattningslagring ----------

  function laesSkattningar() {
    try {
      var o = JSON.parse(localStorage.getItem(SKATTNING_NYCKEL));
      return o && typeof o === 'object' ? o : {};
    } catch (e) {
      return {};
    }
  }

  function sparaSkattning(momentId, farg) {
    var o = laesSkattningar();
    o[momentId] = { farg: farg, tid: new Date().toISOString() };
    localStorage.setItem(SKATTNING_NYCKEL, JSON.stringify(o));
  }

  function hamtaSkattning(momentId) {
    var o = laesSkattningar();
    return o[momentId] ? o[momentId].farg : null;
  }

  // ---------- Momentrad ----------

  function skapaMomentRad(moment, uppdateraFordelning) {
    var wrap = nyEl('div', 'matris-moment');

    var rad = nyEl('div', 'matris-rad');
    var harFortydligande = !!moment.fortydligande;

    var text = nyEl('div', 'matris-text');
    if (harFortydligande) {
      text.classList.add('klickbar');
      var pil = nyEl('span', 'matris-expandpil');
      pil.textContent = '▸';
      text.appendChild(pil);
    }
    text.appendChild(document.createTextNode(moment.text));
    rad.appendChild(text);

    var knappar = nyEl('div', 'matris-knappar');
    var aktuell = hamtaSkattning(moment.id);
    var knappRef = {};
    FARGER.forEach(function (farg) {
      var knapp = nyEl('button', 'skattning-knapp ' + farg + (aktuell === farg ? ' aktiv' : ''));
      knapp.type = 'button';
      knapp.setAttribute('aria-label', 'Skatta: ' + farg);
      knapp.addEventListener('click', function () {
        sparaSkattning(moment.id, farg);
        FARGER.forEach(function (f) { knappRef[f].classList.toggle('aktiv', f === farg); });
        uppdateraFordelning();
      });
      knappRef[farg] = knapp;
      knappar.appendChild(knapp);
    });
    rad.appendChild(knappar);

    wrap.appendChild(rad);

    // Inline-förtydligande: enkelt textstycke, ingen panel, inga länkar.
    if (harFortydligande) {
      var fort = nyEl('p', 'matris-fortydligande dold');
      fort.textContent = moment.fortydligande;
      wrap.appendChild(fort);

      text.addEventListener('click', function () {
        var stangd = fort.classList.toggle('dold');
        pil.textContent = stangd ? '▸' : '▾';
      });
    }

    return wrap;
  }

  // ---------- Avsnittsgrupp ----------

  function renderaAvsnitt(avsnitt, dk, container, navInfos) {
    var grupp = nyEl('section', 'matris-avsnitt-grupp');
    var grpId = 'matris-' + dk.id + '-avsnitt-' + avsnitt.nummer;
    grupp.id = grpId;

    var rubrik = nyEl('div', 'matris-avsnitt-rubrik');
    var h2 = nyEl('h2');
    h2.textContent = avsnitt.nummer + '. ' + avsnitt.titel;
    rubrik.appendChild(h2);
    var fordelning = nyEl('span', 'fordelning');
    rubrik.appendChild(fordelning);
    grupp.appendChild(rubrik);

    var moment = avsnitt.moment || [];

    // Bygger fyra färgade prickar med siffror: grön, gul, orange, ej-gjord.
    function renderaPrickar(g, y, o, ejGjord) {
      fordelning.innerHTML = '';
      [['gron', g], ['gul', y], ['orange', o], ['ej-gjord', ejGjord]].forEach(function (par) {
        var pgrupp = nyEl('span', 'fordelning-grupp');
        var prick = nyEl('span', 'fordelning-prick ' + par[0]);
        pgrupp.appendChild(prick);
        pgrupp.appendChild(document.createTextNode(String(par[1])));
        fordelning.appendChild(pgrupp);
      });
    }

    function uppdateraFordelning() {
      var g = 0, y = 0, o = 0;
      moment.forEach(function (m) {
        var f = hamtaSkattning(m.id);
        if (f === 'gron') { g++; }
        else if (f === 'gul') { y++; }
        else if (f === 'orange') { o++; }
      });
      renderaPrickar(g, y, o, moment.length - (g + y + o));
    }

    // Renderar en typ-grupp (Begrepp / Färdigheter) med underrubrik.
    function renderaTypGrupp(label, typ) {
      var lista = moment.filter(function (m) { return m.typ === typ; });
      if (!lista.length) { return; }
      var underrubrik = nyEl('div', 'matris-underrubrik');
      underrubrik.textContent = label;
      grupp.appendChild(underrubrik);
      lista.forEach(function (m) {
        grupp.appendChild(skapaMomentRad(m, uppdateraFordelning));
      });
    }

    if (!moment.length) {
      var tom = nyEl('p', 'matris-tomt-avsnitt');
      tom.textContent = 'Moment för detta avsnitt fylls i senare.';
      grupp.appendChild(tom);
      renderaPrickar(0, 0, 0, 0);
    } else {
      renderaTypGrupp('Begrepp', 'begrepp');
      renderaTypGrupp('Färdigheter', 'fardighet');
      uppdateraFordelning();
    }

    container.appendChild(grupp);
    navInfos.push({ delkapitelId: dk.id, id: grpId, nummer: avsnitt.nummer, titel: avsnitt.titel });
  }

  // ---------- Utfällbar boknivå-navigation ----------
  var NAV_NYCKEL = 'geo-nav-tillstand-sjalvskattning';
  var navTillstand = {};
  var navGrupper = {};

  function laesNavTillstand() {
    try {
      var o = JSON.parse(localStorage.getItem(NAV_NYCKEL));
      return o && typeof o === 'object' ? o : {};
    } catch (e) {
      return {};
    }
  }

  // Default: ensamt byggt delkapitel = expanderat. Flera byggda = alla
  // kollapsade. Sparad preferens per delkapitel vinner.
  function bestamTillstand(konfig) {
    var sparat = laesNavTillstand();
    var byggda = konfig.filter(function (d) { return d.byggt; });
    var defaultExp = byggda.length === 1;
    var tillstand = {};
    byggda.forEach(function (d) {
      tillstand[d.id] = (sparat[d.id] === 'expanderat' || sparat[d.id] === 'kollapsat')
        ? sparat[d.id]
        : (defaultExp ? 'expanderat' : 'kollapsat');
    });
    return tillstand;
  }

  function settDelkapitelTillstand(id, expanderat, spara) {
    var ref = navGrupper[id];
    if (!ref) { return; }
    if (expanderat) {
      ref.innehall.classList.remove('kollapsat');
      ref.pil.textContent = '▾';
    } else {
      ref.innehall.classList.add('kollapsat');
      ref.pil.textContent = '▸';
    }
    navTillstand[id] = expanderat ? 'expanderat' : 'kollapsat';
    if (spara) {
      localStorage.setItem(NAV_NYCKEL, JSON.stringify(navTillstand));
    }
  }

  // ---------- Navigation ----------

  function avsnittNavLank(info) {
    var lank = nyEl('a', 'nav-avsnitt-huvudlank');
    lank.href = '#' + info.id;
    lank.setAttribute('data-nav', info.id);
    lank.textContent = info.nummer + '.  ' + info.titel;
    return lank;
  }

  // Kapitelnivå: platt lista av avsnittslänkar (oförändrad).
  function byggNav(navInfos) {
    var navContainer = document.getElementById('matris-nav');
    if (!navContainer) { return; }
    navContainer.innerHTML = '';
    navInfos.forEach(function (info) {
      navContainer.appendChild(avsnittNavLank(info));
    });
  }

  // Boknivå: en grupp per delkapitel (alla sju). Byggda är utfällbara,
  // dimmade visas bara som en kompakt rubrikrad (ingen pil, ej klickbar).
  function byggNavBok(konfig, navInfos) {
    var navContainer = document.getElementById('matris-nav');
    if (!navContainer) { return; }
    navContainer.innerHTML = '';
    navTillstand = bestamTillstand(konfig);
    navGrupper = {};

    konfig.forEach(function (dk) {
      var grupp = nyEl('div', 'nav-delkapitel-grupp');

      if (dk.byggt) {
        var rubrik = nyEl('div', 'nav-delkapitel-rubrik klickbar');
        var pil = nyEl('span', 'nav-delkapitel-pil');
        rubrik.appendChild(pil);
        rubrik.appendChild(document.createTextNode(' ' + dk.titel));
        grupp.appendChild(rubrik);

        var innehall = nyEl('div', 'nav-delkapitel-innehall');
        innehall.setAttribute('data-dk', dk.id);
        navInfos.filter(function (i) { return i.delkapitelId === dk.id; })
          .forEach(function (info) { innehall.appendChild(avsnittNavLank(info)); });
        grupp.appendChild(innehall);

        navGrupper[dk.id] = { innehall: innehall, pil: pil };
        settDelkapitelTillstand(dk.id, navTillstand[dk.id] === 'expanderat', false);

        rubrik.addEventListener('click', function () {
          settDelkapitelTillstand(dk.id, navTillstand[dk.id] !== 'expanderat', true);
        });
      } else {
        grupp.classList.add('dimmad');
        var rubrikDim = nyEl('div', 'nav-delkapitel-rubrik');
        rubrikDim.textContent = dk.titel;
        grupp.appendChild(rubrikDim);
      }

      navContainer.appendChild(grupp);
    });
  }

  function aktiveraNavMarkering() {
    var navContainer = document.getElementById('matris-nav');
    if (!navContainer || !('IntersectionObserver' in window)) { return; }
    var lankar = navContainer.querySelectorAll('.nav-avsnitt-huvudlank');
    var observer = new IntersectionObserver(function (poster) {
      poster.forEach(function (post) {
        if (post.isIntersecting) {
          var aktivLank = null;
          lankar.forEach(function (l) {
            var traff = l.getAttribute('data-nav') === post.target.id;
            l.classList.toggle('nav-aktiv', traff);
            if (traff) { aktivLank = l; }
          });
          // Auto-expandera delkapitlet om eleven scrollar in i en
          // kollapsad sektion.
          if (aktivLank) {
            var innehall = aktivLank.closest('.nav-delkapitel-innehall');
            if (innehall && innehall.classList.contains('kollapsat')) {
              settDelkapitelTillstand(innehall.getAttribute('data-dk'), true, true);
            }
          }
        }
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    document.querySelectorAll('.matris-avsnitt-grupp').forEach(function (g) {
      observer.observe(g);
    });
  }

  // ---------- Scrolla till topp ----------

  function initScrollTillTopp() {
    var knapp = nyEl('button', 'scroll-till-topp-knapp');
    knapp.type = 'button';
    knapp.title = 'Till toppen';
    knapp.setAttribute('aria-label', 'Scrolla till toppen');
    knapp.textContent = '↑';
    knapp.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(knapp);
    window.addEventListener('scroll', function () {
      knapp.classList.toggle('synlig', window.scrollY > 400);
    });
  }

  // ---------- Huvudbygge ----------

  function visaFel() {
    var container = document.getElementById('matris-innehall');
    if (container) {
      container.innerHTML =
        '<p class="laddar-fel">Kunde inte ladda matrisen. Kontrollera att ' +
        'data/matris.json finns.</p>';
    }
  }

  // ALLA_DELKAPITEL fungerar som single source of truth för bokens
  // struktur. När ett nytt delkapitel byggs:
  // 1. Sätt byggt: true för det delkapitlet
  // 2. Lägg till dataSokvag som pekar mot dess fragor.json/begrepp.json/matris.json
  // 3. Sätt upp delkapitlets egna sidor enligt demografi-mönstret
  // 4. Allt övrigt sker automatiskt
  //
  // Boknivå (ALLA_DELKAPITEL) → hela bokens struktur, dimmade där byggt=false.
  // Kapitelnivå (DELKAPITEL_LISTA) → ett enda, redan byggt delkapitel.
  function hamtaDelkapitelKonfig() {
    if (typeof ALLA_DELKAPITEL !== 'undefined') {
      return ALLA_DELKAPITEL.map(function (dk) {
        var n = { id: dk.id, titel: dk.titel, byggt: !!dk.byggt };
        if (dk.byggt && dk.dataSokvag) {
          n.matrisUrl = dk.dataSokvag + 'matris.json';
        }
        return n;
      });
    }
    return DELKAPITEL_LISTA.map(function (dk) {
      return { id: dk.id, titel: dk.titel, byggt: true, matrisUrl: dk.matrisUrl };
    });
  }

  function bygg() {
    var container = document.getElementById('matris-innehall');
    if (!container) { return; }
    container.innerHTML = '';
    var navInfos = [];

    var konfig = hamtaDelkapitelKonfig();
    var byggda = konfig.filter(function (d) { return d.byggt; });
    var arBok = typeof VY_TYP !== 'undefined' && VY_TYP === 'huvud';

    var laddningar = byggda.map(function (dk) {
      return fetch(dk.matrisUrl)
        .then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); })
        .then(function (matris) { return { dk: dk, matris: matris }; });
    });

    Promise.all(laddningar).then(function (resultat) {
      resultat.forEach(function (paket) {
        var dk = paket.dk;

        if (arBok) {
          var dkRubrik = nyEl('h2', 'delkapitel-rubrik');
          dkRubrik.textContent = dk.titel;
          container.appendChild(dkRubrik);
        }

        (paket.matris.avsnitt || []).forEach(function (avsnitt) {
          renderaAvsnitt(avsnitt, dk, container, navInfos);
        });
      });

      if (arBok) {
        byggNavBok(konfig, navInfos);
      } else {
        byggNav(navInfos);
      }
      aktiveraNavMarkering();
    }).catch(function (e) {
      console.error('Kunde inte ladda matris-data:', e);
      visaFel();
    });
  }

  function start() {
    bygg();
    initScrollTillTopp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
