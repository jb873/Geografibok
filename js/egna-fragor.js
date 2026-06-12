// egna-fragor.js – elevens egna frågor per avsnitt.
//
// Datalager + rendering, delad mellan avsnittssidorna (full vy med
// "+ Lägg till") och pluggvyerna Kapitel-/Huvudelevbok (lista + redigera).
// Exponeras som window.EgnaFragor.
//
// LocalStorage-nyckel: "geo-elev-egna-fragor-[delkapitel]"
// Värde: { [avsnitt_id]: [ {id, fraga, svar, skapad, senast_uppdaterad} ] }
//
// Beroende (valfritt): window.autoExpandTextarea (avsnitt.js) för auto-höjd.

window.EgnaFragor = (function () {
  'use strict';

  var PREFIX = 'geo-elev-egna-fragor-';
  var AUTOSPARA_DEBOUNCE = 2000;
  var SPARAD_VISNINGSTID = 3000;

  function nyEl(tagg, klass) {
    var e = document.createElement(tagg);
    if (klass) { e.className = klass; }
    return e;
  }

  function autoExpand(ta) {
    if (window.autoExpandTextarea) { window.autoExpandTextarea(ta); }
  }

  // ---------- Datalager ----------

  function nyckel(dk) { return PREFIX + dk; }

  function las(dk) {
    try {
      var o = JSON.parse(localStorage.getItem(nyckel(dk)));
      return o && typeof o === 'object' ? o : {};
    } catch (e) { return {}; }
  }

  function skriv(dk, o) { localStorage.setItem(nyckel(dk), JSON.stringify(o)); }

  function hamta(dk, avsnittId) {
    var o = las(dk);
    return Array.isArray(o[avsnittId]) ? o[avsnittId] : [];
  }

  function harNagra(dk, avsnittId) { return hamta(dk, avsnittId).length > 0; }

  function genereraId() {
    return 'egen_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function laggTill(dk, avsnittId, fraga, svar) {
    var o = las(dk);
    if (!Array.isArray(o[avsnittId])) { o[avsnittId] = []; }
    var nu = new Date().toISOString();
    var post = { id: genereraId(), fraga: fraga, svar: svar || '', skapad: nu, senast_uppdaterad: nu };
    o[avsnittId].push(post);
    skriv(dk, o);
    return post;
  }

  function hittaPost(o, avsnittId, id) {
    var lista = o[avsnittId] || [];
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === id) { return lista[i]; }
    }
    return null;
  }

  function uppdateraFraga(dk, avsnittId, id, nyFraga) {
    var o = las(dk);
    var p = hittaPost(o, avsnittId, id);
    if (p) { p.fraga = nyFraga; p.senast_uppdaterad = new Date().toISOString(); skriv(dk, o); }
  }

  function sparaSvar(dk, avsnittId, id, svar) {
    var o = las(dk);
    var p = hittaPost(o, avsnittId, id);
    if (p) { p.svar = svar; p.senast_uppdaterad = new Date().toISOString(); skriv(dk, o); }
  }

  function taBort(dk, avsnittId, id) {
    var o = las(dk);
    if (Array.isArray(o[avsnittId])) {
      o[avsnittId] = o[avsnittId].filter(function (x) { return x.id !== id; });
      skriv(dk, o);
    }
  }

  // ---------- Rendering ----------

  // Kopplar autospara (debounce + diskret status) på en svar-textarea.
  function kopplaAutospara(ta, status, sparaFn) {
    var t1 = null, t2 = null;
    ta.addEventListener('input', function () {
      autoExpand(ta);
      if (t1) { clearTimeout(t1); }
      t1 = setTimeout(function () {
        status.textContent = 'Sparar...';
        sparaFn(ta.value);
        status.textContent = 'Sparad';
        if (t2) { clearTimeout(t2); }
        t2 = setTimeout(function () { status.textContent = ''; }, SPARAD_VISNINGSTID);
      }, AUTOSPARA_DEBOUNCE);
    });
  }

  function skapaKort(f, dk, avsnittId, ritaOm) {
    var kort = nyEl('div', 'egen-fraga-kort');

    var ikon = nyEl('span', 'egen-fraga-ikon');
    ikon.setAttribute('aria-hidden', 'true');
    ikon.title = 'Egen fråga';
    ikon.textContent = '✏';
    kort.appendChild(ikon);

    var titelOmrade = nyEl('div', 'egen-fraga-titel-omrade');
    kort.appendChild(titelOmrade);

    function visaTitel() {
      titelOmrade.innerHTML = '';
      var h = nyEl('h4', 'egen-fraga-titel');
      h.textContent = f.fraga;
      titelOmrade.appendChild(h);
    }
    function visaTitelRedigering() {
      titelOmrade.innerHTML = '';
      var inp = nyEl('input', 'egen-fraga-input');
      inp.type = 'text';
      inp.value = f.fraga;
      var spara = nyEl('button', 'egen-fraga-spara');
      spara.type = 'button';
      spara.textContent = 'Spara';
      var avbryt = nyEl('button', 'egen-fraga-avbryt');
      avbryt.type = 'button';
      avbryt.textContent = 'Avbryt';
      spara.addEventListener('click', function () {
        var v = inp.value.trim();
        if (!v) { return; }
        uppdateraFraga(dk, avsnittId, f.id, v);
        f.fraga = v;
        visaTitel();
      });
      avbryt.addEventListener('click', visaTitel);
      titelOmrade.appendChild(inp);
      titelOmrade.appendChild(spara);
      titelOmrade.appendChild(avbryt);
      inp.focus();
    }
    visaTitel();

    // Svar-textarea (auto-expand + autospara)
    var ta = nyEl('textarea', 'begrepp-textarea');
    ta.setAttribute('placeholder', 'Ditt svar...');
    ta.setAttribute('spellcheck', 'true');
    ta.value = f.svar || '';
    kort.appendChild(ta);

    var status = nyEl('div', 'elevbok-sparstatus');
    status.setAttribute('aria-live', 'polite');
    kort.appendChild(status);

    kopplaAutospara(ta, status, function (text) {
      sparaSvar(dk, avsnittId, f.id, text);
    });
    autoExpand(ta);

    // Länkar: Redigera fråga / Ta bort
    var lankar = nyEl('div', 'egen-fraga-lankar');
    var red = nyEl('button', 'egen-fraga-redigera-knapp');
    red.type = 'button';
    red.textContent = 'Redigera fråga';
    red.addEventListener('click', visaTitelRedigering);
    var bort = nyEl('button', 'egen-fraga-ta-bort-knapp');
    bort.type = 'button';
    bort.textContent = 'Ta bort';
    bort.addEventListener('click', function () {
      if (window.confirm('Är du säker på att du vill ta bort den här frågan?')) {
        taBort(dk, avsnittId, f.id);
        ritaOm();
      }
    });
    lankar.appendChild(red);
    lankar.appendChild(bort);
    kort.appendChild(lankar);

    return kort;
  }

  // "+ Lägg till egen fråga": knapp som växlar till ett kompakt formulär.
  function skapaLaggTill(dk, avsnittId, ritaOm) {
    var omrade = nyEl('div', 'lagg-till-omrade');

    var knapp = nyEl('button', 'lagg-till-fraga-knapp');
    knapp.type = 'button';
    knapp.textContent = '+ Lägg till egen fråga';

    knapp.addEventListener('click', function () {
      omrade.innerHTML = '';
      var form = nyEl('div', 'lagg-till-fraga-formular');

      var inp = nyEl('input', 'egen-fraga-input');
      inp.type = 'text';
      inp.placeholder = 'Din fråga...';

      var ta = nyEl('textarea', 'begrepp-textarea');
      ta.placeholder = 'Ditt svar...';
      ta.setAttribute('spellcheck', 'true');

      var knappar = nyEl('div', 'egen-fraga-lankar');
      var spara = nyEl('button', 'egen-fraga-spara');
      spara.type = 'button';
      spara.textContent = 'Spara';
      var avbryt = nyEl('button', 'egen-fraga-avbryt');
      avbryt.type = 'button';
      avbryt.textContent = 'Avbryt';
      knappar.appendChild(spara);
      knappar.appendChild(avbryt);

      spara.addEventListener('click', function () {
        var fragaText = inp.value.trim();
        if (!fragaText) { inp.focus(); return; } // frågetext krävs
        laggTill(dk, avsnittId, fragaText, ta.value);
        ritaOm();
      });
      avbryt.addEventListener('click', ritaOm);

      form.appendChild(inp);
      form.appendChild(ta);
      form.appendChild(knappar);
      omrade.appendChild(form);
      inp.focus();
    });

    omrade.appendChild(knapp);
    return omrade;
  }

  // ---------- Mount + synk ----------

  var monterade = [];
  var synkStartad = false;

  function startaSynk() {
    if (synkStartad) { return; }
    synkStartad = true;
    window.addEventListener('storage', function (e) {
      if (!e.key || e.key.indexOf(PREFIX) !== 0) { return; }
      monterade.forEach(function (m) {
        // Stör inte en ruta som redigeras i denna flik.
        if (m.host.contains(document.activeElement)) { return; }
        rita(m.host, m.dk, m.avsnittId, m.opts);
      });
    });
  }

  function rita(host, dk, avsnittId, opts) {
    host.innerHTML = '';
    if (opts.sektionId) { host.id = opts.sektionId; }

    var fragor = hamta(dk, avsnittId);

    // Pluggvy utan egna frågor → visa ingenting alls.
    if (!fragor.length && !opts.visaLaggTill) { return; }

    function ritaOm() { rita(host, dk, avsnittId, opts); }

    var sep = nyEl('div', 'egna-fragor-separator');
    var linje = nyEl('hr', 'fordjupning-linje');
    sep.appendChild(linje);
    var label = nyEl('div', 'egna-fragor-label');
    label.textContent = '✏ Egna frågor';
    sep.appendChild(label);
    host.appendChild(sep);

    fragor.forEach(function (f) {
      host.appendChild(skapaKort(f, dk, avsnittId, ritaOm));
    });

    if (opts.visaLaggTill) {
      host.appendChild(skapaLaggTill(dk, avsnittId, ritaOm));
    }
  }

  function renderaEgnaFragor(host, dk, avsnittId, opts) {
    opts = opts || {};
    if (!host._egnaRegistrerad) {
      monterade.push({ host: host, dk: dk, avsnittId: avsnittId, opts: opts });
      host._egnaRegistrerad = true;
    }
    startaSynk();
    rita(host, dk, avsnittId, opts);
  }

  return {
    hamta: hamta,
    harNagra: harNagra,
    laggTill: laggTill,
    uppdateraFraga: uppdateraFraga,
    sparaSvar: sparaSvar,
    taBort: taBort,
    renderaEgnaFragor: renderaEgnaFragor
  };
})();
