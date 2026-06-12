// elevbok.js – datalager för elevboken (ingen UI)
//
// Hanterar elevens identitet, svar, versionshistorik, autospara,
// flik-synk och arkiv av borttagna frågor. All lagring sker i
// localStorage. Modulen exponeras som window.Elevbok (ingen bundler
// – vi kör direkt mot Live Server, så namespace är enklast).
//
// Nyckelstruktur (internt prefix "geo-elev-"):
//   "geo-elev-identitet"        → { klass, namn }
//   "geo-elev-svar-[delkapitel]" → { [fraga_id]: text,
//                                     _historik: { [fraga_id]: [snapshot] } }
//   snapshot = { timestamp, text, antal_ord }

window.Elevbok = (function () {
  'use strict';

  // ---------- Konstanter ----------
  var PREFIX = 'geo-elev-';
  var NYCKEL_IDENTITET = PREFIX + 'identitet';
  var SVAR_PREFIX = PREFIX + 'svar-';
  var BEGREPP_PREFIX = PREFIX + 'begrepp-';

  var SNAPSHOT_INTERVALL = 5 * 60 * 1000; // 5 minuter
  var MAX_SNAPSHOTS = 20;                 // FIFO per fråga
  var AUTOSPARA_DEBOUNCE = 2000;          // 2 sekunder efter sista tangenttryck
  var SPARAD_VISNINGSTID = 3000;          // "Sparad" syns i 3 sekunder

  // ---------- Interna hjälpare ----------

  function svarNyckel(delkapitel) {
    return SVAR_PREFIX + delkapitel;
  }

  // Läser ett JSON-objekt ur localStorage; returnerar {} om saknas/trasigt.
  function laesObjekt(nyckel) {
    var ravara = localStorage.getItem(nyckel);
    if (!ravara) {
      return {};
    }
    try {
      var tolkat = JSON.parse(ravara);
      return tolkat && typeof tolkat === 'object' ? tolkat : {};
    } catch (e) {
      return {};
    }
  }

  function skrivObjekt(nyckel, objekt) {
    localStorage.setItem(nyckel, JSON.stringify(objekt));
  }

  function raknaOrd(text) {
    if (!text) {
      return 0;
    }
    var rensad = text.trim();
    if (rensad === '') {
      return 0;
    }
    return rensad.split(/\s+/).length;
  }

  // Lägger till en snapshot och trimmar enligt FIFO. Hoppar över
  // snapshots som är identiska med den föregående (safety mot
  // skräpsnapshots vid no-op-events, t.ex. beforeunload utan ändring).
  function laggTillSnapshot(objekt, fraga_id, text) {
    if (!objekt._historik) {
      objekt._historik = {};
    }
    if (!objekt._historik[fraga_id]) {
      objekt._historik[fraga_id] = [];
    }
    var lista = objekt._historik[fraga_id];

    // Safety: spara aldrig en snapshot identisk med den föregående.
    var foregaende = lista[lista.length - 1];
    if (foregaende && foregaende.text === text) {
      // [DEV-LOGG – TAS BORT SENARE]
      console.log('[Elevbok] snapshot hoppad (identisk med föregående):', fraga_id);
      return;
    }

    lista.push({
      timestamp: Date.now(),
      text: text,
      antal_ord: raknaOrd(text)
    });

    // FIFO: behåll som mest MAX_SNAPSHOTS – ta bort ÄLDSTA (index 0) först.
    while (lista.length > MAX_SNAPSHOTS) {
      lista.shift();
    }

    // [DEV-LOGG – TAS BORT SENARE]
    console.log('[Elevbok] snapshot sparad:', fraga_id,
      '| totalt nu:', lista.length, '| ord:', raknaOrd(text));
  }

  // Skapar snapshot endast om:
  //   - det är första snapshotten för frågan, ELLER
  //   - minst 5 minuter passerat sedan förra OCH texten har ändrats.
  function kanskeSnapshot(objekt, fraga_id, text) {
    var lista = (objekt._historik && objekt._historik[fraga_id]) || [];
    var senaste = lista[lista.length - 1];

    if (senaste && senaste.text === text) {
      return; // ingen förändring sedan förra snapshot
    }
    if (senaste && (Date.now() - senaste.timestamp) < SNAPSHOT_INTERVALL) {
      // [DEV-LOGG – TAS BORT SENARE]
      console.log('[Elevbok] snapshot ej tagen (mindre än 5 min sedan förra):', fraga_id);
      return; // för tidigt för en ny snapshot
    }
    laggTillSnapshot(objekt, fraga_id, text);
  }

  // ========================================================
  // IDENTITET
  // ========================================================

  function hamtaIdentitet() {
    var ravara = localStorage.getItem(NYCKEL_IDENTITET);
    if (!ravara) {
      return null;
    }
    try {
      return JSON.parse(ravara);
    } catch (e) {
      return null;
    }
  }

  function sparaIdentitet(klass, namn) {
    skrivObjekt(NYCKEL_IDENTITET, { klass: klass, namn: namn });
  }

  function harIdentitet() {
    var identitet = hamtaIdentitet();
    return !!(identitet && identitet.klass && identitet.namn);
  }

  // ========================================================
  // SVAR
  // ========================================================

  function hamtaSvar(delkapitel, fraga_id) {
    var objekt = laesObjekt(svarNyckel(delkapitel));
    var text = objekt[fraga_id];
    return typeof text === 'string' ? text : '';
  }

  function sparaSvar(delkapitel, fraga_id, text) {
    var nyckel = svarNyckel(delkapitel);
    var objekt = laesObjekt(nyckel);
    // Snapshot innan vi skriver över – fångar periodiska versioner.
    kanskeSnapshot(objekt, fraga_id, text);
    objekt[fraga_id] = text;
    skrivObjekt(nyckel, objekt);
  }

  function hamtaAllaSvar(delkapitel) {
    var objekt = laesObjekt(svarNyckel(delkapitel));
    var svar = {};
    for (var nyckel in objekt) {
      if (objekt.hasOwnProperty(nyckel) && nyckel !== '_historik') {
        svar[nyckel] = objekt[nyckel];
      }
    }
    return svar;
  }

  function hamtaAllaSvarAllaDelkapitel() {
    var resultat = {};
    for (var i = 0; i < localStorage.length; i++) {
      var nyckel = localStorage.key(i);
      if (nyckel && nyckel.indexOf(SVAR_PREFIX) === 0) {
        var delkapitel = nyckel.slice(SVAR_PREFIX.length);
        resultat[delkapitel] = hamtaAllaSvar(delkapitel);
      }
    }
    return resultat;
  }

  // ========================================================
  // VERSIONSHISTORIK
  // ========================================================

  function hamtaHistorik(delkapitel, fraga_id) {
    var objekt = laesObjekt(svarNyckel(delkapitel));
    if (objekt._historik && objekt._historik[fraga_id]) {
      return objekt._historik[fraga_id];
    }
    return [];
  }

  function aterstallVersion(delkapitel, fraga_id, snapshot_index) {
    var nyckel = svarNyckel(delkapitel);
    var objekt = laesObjekt(nyckel);
    var lista = (objekt._historik && objekt._historik[fraga_id]) || [];

    if (snapshot_index < 0 || snapshot_index >= lista.length) {
      return; // ogiltigt index – gör inget
    }

    // Fånga måltexten innan vi rör listan.
    var maltext = lista[snapshot_index].text;
    var aktuellText = typeof objekt[fraga_id] === 'string' ? objekt[fraga_id] : '';

    // Spara nuvarande text som snapshot först → återställningen kan ångras.
    laggTillSnapshot(objekt, fraga_id, aktuellText);

    objekt[fraga_id] = maltext;
    skrivObjekt(nyckel, objekt);
  }

  // ========================================================
  // AUTOSPARA
  // ========================================================

  // Binder autospara på en textarea. status_element är valfritt och
  // får texten "Sparar..." / "Sparad".
  function skapaAutospara(textarea_element, delkapitel, fraga_id, status_element) {
    // Fyll i befintligt svar om textarean är tom.
    var befintligt = hamtaSvar(delkapitel, fraga_id);
    if (befintligt && textarea_element.value === '') {
      textarea_element.value = befintligt;
    }

    var timer = null;
    var doljTimer = null;

    function visaStatus(text) {
      if (status_element) {
        status_element.textContent = text;
      }
    }

    function utforSparning() {
      visaStatus('Sparar...');
      sparaSvar(delkapitel, fraga_id, textarea_element.value);
      visaStatus('Sparad');
      if (doljTimer) {
        clearTimeout(doljTimer);
      }
      doljTimer = setTimeout(function () {
        visaStatus('');
      }, SPARAD_VISNINGSTID);
    }

    textarea_element.addEventListener('input', function () {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(utforSparning, AUTOSPARA_DEBOUNCE);
    });

    // Vid sidbyte: spara direkt och ta en snapshot (spec: beforeunload).
    window.addEventListener('beforeunload', function () {
      if (timer) {
        clearTimeout(timer);
      }
      var nyckel = svarNyckel(delkapitel);
      var objekt = laesObjekt(nyckel);
      laggTillSnapshot(objekt, fraga_id, textarea_element.value);
      objekt[fraga_id] = textarea_element.value;
      skrivObjekt(nyckel, objekt);
    });
  }

  // ========================================================
  // SYNK MELLAN FLIKAR
  // ========================================================

  // Anropar callback(nyckel, nyttVarde) när en elevboks-nyckel ändras
  // i en annan flik/fönster.
  function startaFlikSynk(callback) {
    window.addEventListener('storage', function (handelse) {
      if (handelse.key && handelse.key.indexOf(PREFIX) === 0) {
        callback(handelse.key, handelse.newValue);
      }
    });
  }

  // ========================================================
  // ARKIV (borttagna frågor)
  // ========================================================

  // Returnerar svar som finns lagrade men vars id inte längre ingår
  // i aktuella_fraga_ids (föräldralös data).
  function hamtaArkiv(delkapitel, aktuella_fraga_ids) {
    var objekt = laesObjekt(svarNyckel(delkapitel));
    var arkiv = [];
    for (var nyckel in objekt) {
      if (!objekt.hasOwnProperty(nyckel) || nyckel === '_historik') {
        continue;
      }
      var text = objekt[nyckel];
      var finnsKvar = aktuella_fraga_ids.indexOf(nyckel) !== -1;
      if (!finnsKvar && typeof text === 'string' && text !== '') {
        arkiv.push({ fraga_id: nyckel, text: text });
      }
    }
    return arkiv;
  }

  // ========================================================
  // BEGREPPSBANK
  // ========================================================
  // Nyckel: "geo-elev-begrepp-[delkapitel]"
  // Värde: { [begrepp_id]: { text, upplast, upplast_datum } }

  function begreppNyckel(delkapitel) {
    return BEGREPP_PREFIX + delkapitel;
  }

  function hamtaBegreppspost(delkapitel, begrepp_id) {
    var objekt = laesObjekt(begreppNyckel(delkapitel));
    var post = objekt[begrepp_id];
    return post && typeof post === 'object' ? post : null;
  }

  function hamtaBegreppsText(delkapitel, begrepp_id) {
    var post = hamtaBegreppspost(delkapitel, begrepp_id);
    return post && typeof post.text === 'string' ? post.text : '';
  }

  function sparaBegreppsText(delkapitel, begrepp_id, text) {
    var nyckel = begreppNyckel(delkapitel);
    var objekt = laesObjekt(nyckel);
    var post = (objekt[begrepp_id] && typeof objekt[begrepp_id] === 'object')
      ? objekt[begrepp_id]
      : { text: '', upplast: false, upplast_datum: null };
    post.text = text;
    objekt[begrepp_id] = post;
    skrivObjekt(nyckel, objekt);
  }

  function arBegreppUpplast(delkapitel, begrepp_id) {
    var post = hamtaBegreppspost(delkapitel, begrepp_id);
    return !!(post && post.upplast);
  }

  // Sätter upplåst-flaggan permanent. En gång upplåst = alltid upplåst.
  function markeraBegreppUpplast(delkapitel, begrepp_id) {
    var nyckel = begreppNyckel(delkapitel);
    var objekt = laesObjekt(nyckel);
    var post = (objekt[begrepp_id] && typeof objekt[begrepp_id] === 'object')
      ? objekt[begrepp_id]
      : { text: '', upplast: false, upplast_datum: null };
    if (!post.upplast) {
      post.upplast = true;
      post.upplast_datum = new Date().toISOString();
    }
    objekt[begrepp_id] = post;
    skrivObjekt(nyckel, objekt);
  }

  // ========================================================
  // TEST / UTVECKLING
  // ========================================================

  // Skapar en snapshot direkt, oavsett 5-minutersfönstret. Endast tänkt
  // för utveckling/test så att historik-modalen kan provas utan väntan.
  function skapaTestSnapshot(delkapitel, fraga_id) {
    var nyckel = svarNyckel(delkapitel);
    var objekt = laesObjekt(nyckel);
    var text = typeof objekt[fraga_id] === 'string' ? objekt[fraga_id] : '';
    laggTillSnapshot(objekt, fraga_id, text);
    skrivObjekt(nyckel, objekt);
  }

  // ========================================================
  // HISTORIK-MODAL
  // ========================================================

  var modalEl = null; // återanvänds mellan anrop

  // Formaterar en timestamp till läsbar svensk form.
  function formateraTid(timestamp) {
    var d = new Date(timestamp);
    var nu = new Date();
    var idag = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate());
    var datum = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var diffDagar = Math.round((idag - datum) / 86400000);

    var hh = ('0' + d.getHours()).slice(-2);
    var mm = ('0' + d.getMinutes()).slice(-2);
    var klocka = hh + ':' + mm;

    if (diffDagar === 0) {
      return 'Idag ' + klocka;
    }
    if (diffDagar === 1) {
      return 'Igår ' + klocka;
    }
    var manader = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun',
                   'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    return d.getDate() + ' ' + manader[d.getMonth()] + ' ' + klocka;
  }

  function doljModal() {
    if (modalEl) {
      modalEl.classList.add('dold');
    }
  }

  // Bygger modal-skelettet en gång och kopplar stäng-beteende.
  function skapaModal() {
    if (modalEl) {
      return modalEl;
    }
    modalEl = document.createElement('div');
    modalEl.className = 'modal-overlay dold';
    modalEl.innerHTML =
      '<div class="modal">' +
        '<div class="modal-header">' +
          '<h2 class="modal-titel"></h2>' +
          '<button type="button" class="modal-stang" aria-label="Stäng">×</button>' +
        '</div>' +
        '<div class="modal-historik-lista"></div>' +
      '</div>';
    document.body.appendChild(modalEl);

    // Stäng via × eller klick på bakgrunden (men inte på själva modalen).
    modalEl.querySelector('.modal-stang').addEventListener('click', doljModal);
    modalEl.addEventListener('click', function (handelse) {
      if (handelse.target === modalEl) {
        doljModal();
      }
    });

    return modalEl;
  }

  // Hittar textarean på sidan som hör till en viss fråga (om den finns).
  function hittaTextarea(delkapitel, fraga_id) {
    return document.querySelector(
      '.elevbok-textarea[data-delkapitel="' + delkapitel +
      '"][data-fraga-id="' + fraga_id + '"]'
    );
  }

  function visaHistorik(delkapitel, fraga_id) {
    var modal = skapaModal();
    var textarea = hittaTextarea(delkapitel, fraga_id);

    // Titel: använd frågetexten om den går att hitta, annars id:t.
    var fragetext = fraga_id;
    if (textarea) {
      var block = textarea.closest('.elevbok-fraga-block');
      var fragaP = block && block.querySelector('.elevbok-fraga-titel, .elevbok-fraga');
      if (fragaP) {
        fragetext = fragaP.textContent.trim();
      }
    }
    modal.querySelector('.modal-titel').textContent =
      'Versionshistorik – ' + fragetext;

    var lista = modal.querySelector('.modal-historik-lista');
    lista.innerHTML = '';

    var historik = hamtaHistorik(delkapitel, fraga_id);

    if (!historik.length) {
      var tom = document.createElement('p');
      tom.className = 'modal-tom';
      tom.textContent = 'Inga sparade versioner än. Skriv något och vänta ' +
        'minst 5 minuter, så börjar versioner sparas automatiskt.';
      lista.appendChild(tom);
      modal.classList.remove('dold');
      return;
    }

    // Nyast först. Bevara ursprungsindex för aterstallVersion().
    for (var i = historik.length - 1; i >= 0; i--) {
      (function (snapshot, index) {
        var entry = document.createElement('div');
        entry.className = 'historik-entry';

        var rad = document.createElement('div');
        rad.className = 'historik-rad';
        rad.innerHTML =
          '<span class="historik-info">' +
            '<span class="historik-tid">' + formateraTid(snapshot.timestamp) + '</span>' +
            '<span class="historik-ord">' + snapshot.antal_ord + ' ord</span>' +
          '</span>' +
          '<span class="historik-knappar">' +
            '<button type="button" class="historik-knapp forhandsgranska">Förhandsgranska</button>' +
            '<button type="button" class="historik-knapp aterstall">Återställ</button>' +
          '</span>';

        // Förhandsgranska: visa/dölj preview under raden.
        rad.querySelector('.forhandsgranska').addEventListener('click', function () {
          var befintlig = entry.querySelector('.modal-preview');
          if (befintlig) {
            befintlig.remove();
            return;
          }
          var preview = document.createElement('div');
          preview.className = 'modal-preview';
          preview.textContent = snapshot.text || '(tom text)';
          entry.appendChild(preview);
        });

        // Återställ: bekräfta, återställ, stäng och uppdatera textarean.
        rad.querySelector('.aterstall').addEventListener('click', function () {
          var ok = window.confirm('Återställa denna version? Din nuvarande ' +
            'text sparas som en ny version innan återställningen.');
          if (!ok) {
            return;
          }
          aterstallVersion(delkapitel, fraga_id, index);
          doljModal();
          var ta = hittaTextarea(delkapitel, fraga_id);
          if (ta) {
            ta.value = hamtaSvar(delkapitel, fraga_id);
            if (window.autoExpandTextarea) {
              window.autoExpandTextarea(ta);
            }
          }
        });

        entry.appendChild(rad);
        lista.appendChild(entry);
      })(historik[i], i);
    }

    modal.classList.remove('dold');
  }

  // ---------- Publikt API ----------
  return {
    hamtaIdentitet: hamtaIdentitet,
    sparaIdentitet: sparaIdentitet,
    harIdentitet: harIdentitet,
    hamtaSvar: hamtaSvar,
    sparaSvar: sparaSvar,
    hamtaAllaSvar: hamtaAllaSvar,
    hamtaAllaSvarAllaDelkapitel: hamtaAllaSvarAllaDelkapitel,
    hamtaHistorik: hamtaHistorik,
    aterstallVersion: aterstallVersion,
    skapaAutospara: skapaAutospara,
    startaFlikSynk: startaFlikSynk,
    hamtaArkiv: hamtaArkiv,
    visaHistorik: visaHistorik,
    skapaTestSnapshot: skapaTestSnapshot,
    hamtaBegreppsText: hamtaBegreppsText,
    sparaBegreppsText: sparaBegreppsText,
    arBegreppUpplast: arBegreppUpplast,
    markeraBegreppUpplast: markeraBegreppUpplast
  };
})();
