// elevbok-samlad.js – renderar Kapitelelevbok och Huvudelevbok.
//
// Dessa vyer är rena "elevens röst"-vyer: elevens egna sammanfattningar
// samlade som pluggmaterial. De visar INTE expertförklaringar och länkar
// INTE till Begreppsbanken – fokus är helt på elevens egen text.
//
// Sidan sätter konfigurationen:
//   const VY_TYP = 'kapitel' | 'huvud';
//   const DELKAPITEL_LISTA = [{ id, titel, fragorUrl, begreppUrl }];
//
// Beroenden (inkluderas FÖRE denna fil):
//   - elevbok.js → window.Elevbok
//   - avsnitt.js → window.autoExpandTextarea

(function () {
  'use strict';

  var AUTOSPARA_DEBOUNCE = 2000;
  var SPARAD_VISNINGSTID = 3000;

  function nyEl(tagg, klass) {
    var e = document.createElement(tagg);
    if (klass) { e.className = klass; }
    return e;
  }

  function autoExpand(textarea) {
    if (window.autoExpandTextarea) {
      window.autoExpandTextarea(textarea);
    }
  }

  // ---------- Sammanslagning av frågor + begrepp per avsnitt ----------

  function slaSamman(fragorData, begreppData) {
    var karta = {};
    var ordning = [];
    (fragorData.avsnitt || []).forEach(function (a) {
      karta[a.id] = { id: a.id, nummer: a.nummer, titel: a.titel,
                      fragor: a.fragor || [], begrepp: [] };
      ordning.push(a.id);
    });
    (begreppData.avsnitt || []).forEach(function (a) {
      if (!karta[a.id]) {
        karta[a.id] = { id: a.id, nummer: a.nummer, titel: a.titel,
                        fragor: [], begrepp: [] };
        ordning.push(a.id);
      }
      karta[a.id].begrepp = a.begrepp || [];
    });
    return ordning.map(function (id) { return karta[id]; });
  }

  // ---------- Autospara-hjälpare ----------

  function kopplaSparstatus(textarea, statusEl, sparaFn) {
    var sparaTimer = null;
    var doljTimer = null;
    textarea.addEventListener('input', function () {
      autoExpand(textarea);
      if (sparaTimer) { clearTimeout(sparaTimer); }
      sparaTimer = setTimeout(function () {
        statusEl.textContent = 'Sparar...';
        sparaFn(textarea.value);
        statusEl.textContent = 'Sparad';
        if (doljTimer) { clearTimeout(doljTimer); }
        doljTimer = setTimeout(function () { statusEl.textContent = ''; }, SPARAD_VISNINGSTID);
      }, AUTOSPARA_DEBOUNCE);
    });
  }

  // ---------- Begreppskort (ren elevröst – ingen expertförklaring) ----------

  function skapaBegreppsKort(begrepp, delkapitel) {
    var kort = nyEl('div', 'elevbok-begrepp-kort');
    kort.setAttribute('data-begrepp-id', begrepp.id);

    // Statusikon: ◯ tomt/skriva, ✓ upplåst. Ger eleven överblick.
    var status = nyEl('span', 'elevbok-kort-status');
    if (Elevbok.arBegreppUpplast(delkapitel, begrepp.id)) {
      kort.classList.add('begrepp-upplast');
      status.textContent = '✓';
    } else {
      status.textContent = '◯';
    }
    kort.appendChild(status);

    var term = nyEl('h4', 'elevbok-kort-term');
    term.textContent = begrepp.term;
    kort.appendChild(term);

    var textarea = nyEl('textarea', 'begrepp-textarea');
    textarea.setAttribute('placeholder', 'Skriv din egen definition här...');
    textarea.setAttribute('spellcheck', 'true');
    textarea.value = Elevbok.hamtaBegreppsText(delkapitel, begrepp.id);
    kort.appendChild(textarea);

    var sparstatus = nyEl('div', 'elevbok-sparstatus');
    sparstatus.setAttribute('aria-live', 'polite');
    kort.appendChild(sparstatus);

    kopplaSparstatus(textarea, sparstatus, function (text) {
      Elevbok.sparaBegreppsText(delkapitel, begrepp.id, text);
    });

    autoExpand(textarea);
    return kort;
  }

  // ---------- Frågekort ----------

  function skapaFragaKort(fraga, nummer, delkapitel) {
    var kort = nyEl('div', 'elevbok-fraga-kort');
    kort.setAttribute('data-fraga-id', fraga.id);

    var titel = nyEl('h4', 'elevbok-kort-fraga');
    titel.textContent = nummer + '. ' + fraga.fraga;
    kort.appendChild(titel);

    // Pluggvy: visa INTE fullt bildgalleri – bara en kompakt indikator.
    if (fraga.bilder && fraga.bilder.length) {
      var indikator = nyEl('div', 'fraga-bild-indikator');
      indikator.textContent = '📊 ' + fraga.bilder.length + ' pyramider (visas på avsnittssidan)';
      kort.appendChild(indikator);
    }

    var textarea = nyEl('textarea', 'begrepp-textarea');
    textarea.setAttribute('placeholder', 'Skriv ditt svar här ...');
    textarea.setAttribute('spellcheck', 'true');
    textarea.setAttribute('data-delkapitel', delkapitel);
    textarea.setAttribute('data-fraga-id', fraga.id);
    textarea.value = Elevbok.hamtaSvar(delkapitel, fraga.id);
    kort.appendChild(textarea);

    var sparstatus = nyEl('div', 'elevbok-sparstatus');
    sparstatus.setAttribute('aria-live', 'polite');
    kort.appendChild(sparstatus);

    kopplaSparstatus(textarea, sparstatus, function (text) {
      Elevbok.sparaSvar(delkapitel, fraga.id, text);
    });

    autoExpand(textarea);
    return kort;
  }

  function skapaSeparator() {
    var sep = nyEl('div', 'fordjupning-separator');
    sep.innerHTML =
      '<hr class="fordjupning-linje">' +
      '<div class="fordjupning-label">FÖRDJUPNINGSFRÅGOR</div>';
    return sep;
  }

  // Samlad info för att bygga innehållsförteckningen.
  var navInfos = [];

  // ---------- Utfällbar boknivå-navigation ----------
  var NAV_NYCKEL = 'geo-nav-tillstand-huvudelevbok';
  var navTillstand = {};   // { delkapitelId: 'expanderat' | 'kollapsat' }
  var navGrupper = {};     // { delkapitelId: { innehall, pil } }

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

  // ---------- Rendering av ett avsnitt ----------

  function renderaAvsnitt(avsnitt, delkapitelObj, container) {
    var nr = avsnitt.nummer;
    var sektion = nyEl('section', 'avsnitt-sektion');
    sektion.id = 'avsnitt-' + nr;

    var rubrik = nyEl('h2', 'avsnitt-sektion-rubrik');
    rubrik.textContent = nr + '. ' + avsnitt.titel;
    sektion.appendChild(rubrik);

    var harBegrepp = avsnitt.begrepp.length > 0;
    var harFragor = avsnitt.fragor.length > 0;

    // --- Begrepp ---
    if (harBegrepp) {
      var begUnder = nyEl('div', 'elevbok-undersektion');
      begUnder.id = 'avsnitt-' + nr + '-begrepp';
      var begLabel = nyEl('h3', 'elevbok-undersektion-label');
      begLabel.textContent = 'Begrepp';
      begUnder.appendChild(begLabel);
      var begLista = nyEl('div', 'begreppslista');
      avsnitt.begrepp.forEach(function (b) {
        begLista.appendChild(skapaBegreppsKort(b, delkapitelObj.id));
      });
      begUnder.appendChild(begLista);
      sektion.appendChild(begUnder);
    }

    // --- Frågor ---
    if (harFragor) {
      var fUnder = nyEl('div', 'elevbok-undersektion');
      fUnder.id = 'avsnitt-' + nr + '-fragor';
      var fLabel = nyEl('h3', 'elevbok-undersektion-label');
      fLabel.textContent = 'Frågor';
      fUnder.appendChild(fLabel);
      var fLista = nyEl('div', 'frageliste');
      var grundNr = 0, fordjupNr = 0, separatorInsatt = false;
      avsnitt.fragor.forEach(function (fr) {
        if (fr.typ === 'fordjupning') {
          if (!separatorInsatt) { fLista.appendChild(skapaSeparator()); separatorInsatt = true; }
          fordjupNr++;
          fLista.appendChild(skapaFragaKort(fr, fordjupNr, delkapitelObj.id));
        } else {
          grundNr++;
          fLista.appendChild(skapaFragaKort(fr, grundNr, delkapitelObj.id));
        }
      });
      fUnder.appendChild(fLista);
      sektion.appendChild(fUnder);
    }

    // --- Egna frågor (om eleven skapat några för avsnittet) ---
    var harEgna = !!(window.EgnaFragor && EgnaFragor.harNagra(delkapitelObj.id, avsnitt.id));
    if (harEgna) {
      var egnaHost = nyEl('div', 'elevbok-undersektion');
      sektion.appendChild(egnaHost);
      // Pluggvy: lista + redigera/ta bort, men ingen "+ Lägg till"-knapp.
      EgnaFragor.renderaEgnaFragor(egnaHost, delkapitelObj.id, avsnitt.id, {
        visaLaggTill: false,
        sektionId: 'avsnitt-' + nr + '-egna'
      });
    }

    container.appendChild(sektion);

    navInfos.push({
      delkapitelId: delkapitelObj.id,
      nummer: nr,
      titel: avsnitt.titel,
      harBegrepp: harBegrepp,
      harFragor: harFragor,
      harEgna: harEgna
    });
  }

  // ---------- Arkiv (per delkapitel) ----------

  function renderaArkiv(delkapitelObj, container) {
    var aktuella = [];
    delkapitelObj._avsnitt.forEach(function (a) {
      a.fragor.forEach(function (fr) { aktuella.push(fr.id); });
    });
    var arkiv = Elevbok.hamtaArkiv(delkapitelObj.id, aktuella);
    if (!arkiv.length) { return false; }

    var sektion = nyEl('section', 'arkiv-sektion');
    sektion.id = 'arkiv';
    var rubrik = nyEl('h3', 'arkiv-rubrik');
    rubrik.textContent = 'Arkiv – borttagna frågor';
    sektion.appendChild(rubrik);
    arkiv.forEach(function (post) {
      var kort = nyEl('div', 'arkiv-kort');
      var id = nyEl('p', 'arkiv-id');
      id.textContent = post.fraga_id;
      var txt = nyEl('p', 'arkiv-text');
      txt.textContent = post.text;
      kort.appendChild(id);
      kort.appendChild(txt);
      sektion.appendChild(kort);
    });
    container.appendChild(sektion);
    return true;
  }

  // ---------- Innehållsförteckning ----------

  // Bygger en avsnittsgrupp (huvudlänk + under-länkar) – delas av
  // kapitel- och boknivå-navigationen.
  function byggAvsnittNavGrupp(info) {
    var grupp = nyEl('div', 'nav-avsnitt-grupp');

    var huvud = nyEl('a', 'nav-avsnitt-huvudlank');
    huvud.href = '#avsnitt-' + info.nummer;
    huvud.textContent = info.nummer + '.  ' + info.titel;
    grupp.appendChild(huvud);

    if (info.harBegrepp) {
      var ub = nyEl('a', 'nav-avsnitt-underlank');
      ub.href = '#avsnitt-' + info.nummer + '-begrepp';
      ub.setAttribute('data-nav', 'avsnitt-' + info.nummer + '-begrepp');
      ub.textContent = info.nummer + 'a Begrepp';
      grupp.appendChild(ub);
    }
    if (info.harFragor) {
      var uf = nyEl('a', 'nav-avsnitt-underlank');
      uf.href = '#avsnitt-' + info.nummer + '-fragor';
      uf.setAttribute('data-nav', 'avsnitt-' + info.nummer + '-fragor');
      uf.textContent = info.nummer + 'b Frågor';
      grupp.appendChild(uf);
    }
    if (info.harEgna) {
      var ue = nyEl('a', 'nav-avsnitt-underlank');
      ue.href = '#avsnitt-' + info.nummer + '-egna';
      ue.setAttribute('data-nav', 'avsnitt-' + info.nummer + '-egna');
      ue.textContent = info.nummer + 'c Egna frågor';
      grupp.appendChild(ue);
    }
    return grupp;
  }

  function laggTillArkivLank(navContainer) {
    var ark = nyEl('a', 'nav-avsnitt-huvudlank');
    ark.href = '#arkiv';
    ark.textContent = 'Arkiv';
    navContainer.appendChild(ark);
  }

  // Kapitelnivå: platt lista av avsnittsgrupper (oförändrad).
  function byggNav(harArkiv) {
    var navContainer = document.getElementById('elevbok-nav');
    if (!navContainer) { return; }
    navContainer.innerHTML = '';
    navInfos.forEach(function (info) {
      navContainer.appendChild(byggAvsnittNavGrupp(info));
    });
    if (harArkiv) { laggTillArkivLank(navContainer); }
  }

  // Boknivå: en grupp per delkapitel (alla sju). Byggda är utfällbara,
  // dimmade visas bara som en kompakt rubrikrad (ingen pil, ej klickbar).
  function byggNavBok(konfig, harArkiv) {
    var navContainer = document.getElementById('elevbok-nav');
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
          .forEach(function (info) { innehall.appendChild(byggAvsnittNavGrupp(info)); });
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

    if (harArkiv) { laggTillArkivLank(navContainer); }
  }

  // Markerar aktuell under-länk baserat på scrollposition.
  function aktiveraNavMarkering() {
    var navContainer = document.getElementById('elevbok-nav');
    if (!navContainer || !('IntersectionObserver' in window)) { return; }
    var underlankar = navContainer.querySelectorAll('.nav-avsnitt-underlank');

    var observer = new IntersectionObserver(function (poster) {
      poster.forEach(function (post) {
        if (post.isIntersecting) {
          var id = post.target.id;
          var aktivLank = null;
          underlankar.forEach(function (l) {
            var traff = l.getAttribute('data-nav') === id;
            l.classList.toggle('nav-aktiv', traff);
            if (traff) { aktivLank = l; }
          });
          // Auto-expandera delkapitlet om eleven scrollar in i en
          // kollapsad sektion (navigationen ska aldrig vara ur sync).
          if (aktivLank) {
            var innehall = aktivLank.closest('.nav-delkapitel-innehall');
            if (innehall && innehall.classList.contains('kollapsat')) {
              settDelkapitelTillstand(innehall.getAttribute('data-dk'), true, true);
            }
          }
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });

    document.querySelectorAll('.elevbok-undersektion[id]').forEach(function (s) {
      observer.observe(s);
    });
  }

  // ---------- Flik-synk ----------

  function startaSynk() {
    Elevbok.startaFlikSynk(function (nyckel) {
      if (nyckel.indexOf('geo-elev-svar-') === 0) {
        document.querySelectorAll('.elevbok-fraga-kort textarea').forEach(function (ta) {
          var aktuell = Elevbok.hamtaSvar(ta.dataset.delkapitel, ta.dataset.fragaId);
          if (document.activeElement !== ta && ta.value !== aktuell) {
            ta.value = aktuell;
            autoExpand(ta);
          }
        });
      }
      if (nyckel.indexOf('geo-elev-begrepp-') === 0) {
        if (!(document.activeElement && document.activeElement.tagName === 'TEXTAREA')) {
          bygg();
        }
      }
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
    var container = document.getElementById('elevbok-innehall');
    if (container) {
      container.innerHTML =
        '<p class="laddar-fel">Kunde inte ladda innehållet. Kontrollera att ' +
        'data-filerna finns.</p>';
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
          n.fragorUrl = dk.dataSokvag + 'fragor.json';
          n.begreppUrl = dk.dataSokvag + 'begrepp.json';
        }
        return n;
      });
    }
    return DELKAPITEL_LISTA.map(function (dk) {
      return { id: dk.id, titel: dk.titel, byggt: true,
               fragorUrl: dk.fragorUrl, begreppUrl: dk.begreppUrl };
    });
  }

  function bygg() {
    var container = document.getElementById('elevbok-innehall');
    if (!container) { return; }
    container.innerHTML = '';
    navInfos = [];

    var konfig = hamtaDelkapitelKonfig();
    var byggda = konfig.filter(function (d) { return d.byggt; });

    var laddningar = byggda.map(function (dk) {
      return Promise.all([
        fetch(dk.fragorUrl).then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); }),
        fetch(dk.begreppUrl).then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); })
      ]).then(function (res) {
        return { dk: dk, fragor: res[0], begrepp: res[1] };
      });
    });

    var arBok = typeof VY_TYP !== 'undefined' && VY_TYP === 'huvud';

    Promise.all(laddningar).then(function (resultat) {
      var harArkiv = false;
      resultat.forEach(function (paket) {
        var dk = paket.dk;
        var avsnittLista = slaSamman(paket.fragor, paket.begrepp);
        dk._avsnitt = avsnittLista;

        if (arBok) {
          var dkRubrik = nyEl('h2', 'delkapitel-rubrik');
          dkRubrik.textContent = dk.titel;
          container.appendChild(dkRubrik);
        }

        avsnittLista.forEach(function (avsnitt) {
          renderaAvsnitt(avsnitt, dk, container);
        });

        if (renderaArkiv(dk, container)) {
          harArkiv = true;
        }
      });

      if (arBok) {
        byggNavBok(konfig, harArkiv);
      } else {
        byggNav(harArkiv);
      }
      aktiveraNavMarkering();
    }).catch(function (e) {
      console.error('Kunde inte ladda elevbok-data:', e);
      visaFel();
    });
  }

  function start() {
    bygg();
    startaSynk();
    initScrollTillTopp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
