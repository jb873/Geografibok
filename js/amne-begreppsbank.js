// amne-begreppsbank.js – begreppsbank på ÄMNESNIVÅ (alla kapitel).
//
// Cross-model: varje kapitel deklarerar källa i data/delkapitel-lista.json:
//   begreppKalla:'begrepp-json' + begreppUrl → en kuraterad begreppsfil
//       · nytt schema (geologi): { upplasning, begrepp:[{id,avsnitt,avsnitt_titel,rubrik,expertdefinition,nyckelord?,etymologi?}] }
//       · demografi-schema:      { avsnitt:[{nummer,titel,begrepp:[{id,term,forklaring,nyckelord,etymologi?}]}] }
//   begreppKalla:'flipcards' → data/flipcards/{id}/_pooler.json + pooler (begreppskort)
// Alla normaliseras till { id, rubrik, forklaring, nyckelord, etymologi } + per-kapitel
// upplåsnings-config { minOrd, anvandNyckelord }.
//
// Lagring: geo-elev-begrepp-{kapitel} → { id:{text,upplast,upplast_datum} }.
// Beroenden: avsnitt.js (autoExpandTextarea, valfri), elevdata-overforing.js (valfri).

(function () {
  'use strict';

  var INNEHALL = document.getElementById('amne-begreppsbank-innehall');
  var NAV = document.getElementById('amne-begreppsbank-nav');
  var VERKTYG = document.getElementById('amne-begreppsbank-verktyg');
  var CHIPS = document.getElementById('amne-begreppsbank-chips');
  var SOK = document.getElementById('amne-begreppsbank-sok');
  if (!INNEHALL) { return; }

  var AMNE = (typeof AMNE_ID !== 'undefined') ? AMNE_ID : 'geografi';
  var LISTA_URL = '../data/delkapitel-lista.json';
  var DEBOUNCE = 2000, SPARAD_TID = 3000;
  var DEMOGRAFI_CONFIG = { minOrd: 15, anvandNyckelord: true };
  var FLIPCARDS_CONFIG = { minOrd: 15, anvandNyckelord: true };

  function el(tagg, klass, text) {
    var e = document.createElement(tagg);
    if (klass) { e.className = klass; }
    if (text != null) { e.textContent = text; }
    return e;
  }
  function raknaOrd(t) { t = (t || '').trim(); return t ? t.split(/\s+/).length : 0; }
  function matchaNyckelord(text, nyckelord) {
    var nt = (text || '').toLowerCase();
    return (nyckelord || []).filter(function (n) { return nt.indexOf(String(n).toLowerCase()) !== -1; });
  }
  function grupperaPerAvsnitt(begrepp) {
    var ordning = [], karta = {};
    begrepp.forEach(function (b) {
      var n = b.__avsnitt;
      if (!karta[n]) { karta[n] = { nummer: n, titel: b.__titel || '', begrepp: [] }; ordning.push(karta[n]); }
      karta[n].begrepp.push(b);
    });
    return ordning;
  }

  // ---- lagring (per kapitel) ----
  function nyckel(kid) { return 'geo-elev-begrepp-' + kid; }
  function lasObj(kid) { try { return JSON.parse(localStorage.getItem(nyckel(kid))) || {}; } catch (e) { return {}; } }
  function skrivObj(kid, o) { try { localStorage.setItem(nyckel(kid), JSON.stringify(o)); } catch (e) {} }
  function hamtaStatus(kid, id) { var o = lasObj(kid); return o[id] || { text: '', upplast: false }; }
  function sparaText(kid, id, text) { var o = lasObj(kid); var s = o[id] || {}; s.text = text; o[id] = s; skrivObj(kid, o); }
  function markeraUpplast(kid, id) {
    var o = lasObj(kid); var s = o[id] || {};
    if (!s.upplast) { s.upplast = true; s.upplast_datum = new Date().toISOString(); o[id] = s; skrivObj(kid, o); }
  }

  // ---- laddning per kapitel ----
  function laddaKapitel(kap) {
    if (kap.begreppKalla === 'begrepp-json') {
      var url = kap.begreppUrl || (kap.id + '/data/begrepp.json');
      return fetch(url)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data) { return null; }
          if (Array.isArray(data.begrepp)) {
            // nytt schema (kuraterad fil)
            var u = data.upplasning || {};
            var config = { minOrd: (typeof u.min_ord === 'number' ? u.min_ord : 8), anvandNyckelord: !!u.anvand_nyckelord };
            var begr = data.begrepp.map(function (b) {
              return { id: b.id, rubrik: b.rubrik, forklaring: b.expertdefinition,
                nyckelord: b.nyckelord || [], etymologi: b.etymologi || '',
                __avsnitt: b.avsnitt, __titel: b.avsnitt_titel };
            });
            return { kap: kap, grupper: grupperaPerAvsnitt(begr), config: config };
          }
          // demografi-schema (nested)
          var begr2 = [];
          (data.avsnitt || []).forEach(function (a) {
            (a.begrepp || []).forEach(function (b) {
              begr2.push({ id: b.id, rubrik: b.term, forklaring: b.forklaring,
                nyckelord: b.nyckelord || [], etymologi: b.etymologi || '',
                __avsnitt: a.nummer, __titel: a.titel });
            });
          });
          return { kap: kap, grupper: grupperaPerAvsnitt(begr2), config: DEMOGRAFI_CONFIG };
        })
        .catch(function () { return null; });
    }
    // flipcards
    var bas = '../data/flipcards/' + kap.id + '/';
    return fetch(bas + '_pooler.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (man) {
        var filer = (man && man.pooler) || [];
        return Promise.all(filer.map(function (f) {
          return fetch(bas + f).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
        }));
      })
      .then(function (pooler) {
        if (!pooler) { return null; }
        var begr = [];
        pooler.filter(Boolean).sort(function (a, b) { return (a.avsnitt || 0) - (b.avsnitt || 0); })
          .forEach(function (p) {
            (p.begreppskort || []).forEach(function (b) {
              begr.push({ id: b.id, rubrik: b.fraga, forklaring: b.svar,
                nyckelord: b.nyckelord || [], etymologi: '', __avsnitt: p.avsnitt, __titel: p.titel });
            });
          });
        return { kap: kap, grupper: grupperaPerAvsnitt(begr), config: FLIPCARDS_CONFIG };
      })
      .catch(function () { return null; });
  }

  function start() {
    fetch(LISTA_URL)
      .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.json(); })
      .then(function (lista) {
        var kapitel = ((lista && lista.delkapitel) || [])
          .filter(function (k) { return k.klar; })
          .sort(function (a, b) { return (a.ordning || 0) - (b.ordning || 0); });
        return Promise.all(kapitel.map(laddaKapitel));
      })
      .then(function (allt) { rendera(allt.filter(Boolean)); })
      .catch(function (e) { console.error('amne-begreppsbank:', e); visaFel(); });
  }

  function visaFel() { INNEHALL.innerHTML = '<p class="laddar-fel">Kunde inte ladda begreppen.</p>'; }

  function rendera(kapitelData) {
    if (VERKTYG && window.ElevdataOverforing) {
      VERKTYG.innerHTML = '';
      ElevdataOverforing.montera(VERKTYG, { scope: 'amne', amne: AMNE });
    }

    var totalt = 0, medDef = 0;
    kapitelData.forEach(function (kd) {
      kd.grupper.forEach(function (g) {
        g.begrepp.forEach(function (b) { totalt++; if ((hamtaStatus(kd.kap.id, b.id).text || '').trim()) { medDef++; } });
      });
    });

    INNEHALL.innerHTML = '';
    var stats = el('div', 'kelev-stats');
    var procent = totalt ? Math.round((medDef / totalt) * 100) : 0;
    stats.appendChild(el('span', 'kelev-stats-text',
      'Du har skrivit definition för ' + medDef + ' av ' + totalt + ' begrepp (alla kapitel)'));
    var bar = el('div', 'kelev-progressbar');
    var fyll = el('div', 'kelev-progressfyll'); fyll.style.width = procent + '%';
    bar.appendChild(fyll); stats.appendChild(bar);
    INNEHALL.appendChild(stats);

    if (CHIPS) {
      CHIPS.innerHTML = '';
      CHIPS.appendChild(byggChip('Alla kapitel', '*', true));
      kapitelData.forEach(function (kd) { CHIPS.appendChild(byggChip(kd.kap.titel, kd.kap.id, false)); });
    }

    if (NAV) {
      NAV.innerHTML = '';
      kapitelData.forEach(function (kd) {
        NAV.appendChild(el('div', 'kelev-nav-kapitel', kd.kap.titel));
        kd.grupper.forEach(function (g) {
          var lank = el('a', 'kelev-nav-lank', g.nummer + '. ' + g.titel);
          lank.href = '#abeg-' + kd.kap.id + '-' + g.nummer;
          NAV.appendChild(lank);
        });
      });
    }

    if (!kapitelData.length) {
      INNEHALL.appendChild(el('p', 'laddar-fel', 'Inga begrepp hittades.'));
      return;
    }

    kapitelData.forEach(function (kd) {
      var kapBlock = el('section', 'kelev-kapitel');
      kapBlock.setAttribute('data-kapitel', kd.kap.id);
      kapBlock.appendChild(el('h2', 'kelev-kapitel-rubrik', kd.kap.titel));
      kd.grupper.forEach(function (g) {
        var sektion = el('section', 'avsnitt-grupp');
        sektion.id = 'abeg-' + kd.kap.id + '-' + g.nummer;
        sektion.appendChild(el('h3', 'avsnitt-grupp-rubrik', g.nummer + '. ' + g.titel));
        var grid = el('div', 'begrepp-grid');
        g.begrepp.forEach(function (b) { grid.appendChild(byggKort(kd.kap.id, b, kd.config)); });
        sektion.appendChild(grid);
        kapBlock.appendChild(sektion);
      });
      INNEHALL.appendChild(kapBlock);
    });

    if (SOK) { kopplaSok(); }
  }

  function byggChip(text, id, aktiv) {
    var chip = el('button', 'kelev-chip' + (aktiv ? ' aktiv' : ''), text);
    chip.type = 'button';
    chip.addEventListener('click', function () {
      CHIPS.querySelectorAll('.kelev-chip').forEach(function (c) { c.classList.remove('aktiv'); });
      chip.classList.add('aktiv');
      INNEHALL.querySelectorAll('.kelev-kapitel').forEach(function (k) {
        k.style.display = (id === '*' || k.getAttribute('data-kapitel') === id) ? '' : 'none';
      });
    });
    return chip;
  }

  function byggKort(kapitelId, begrepp, config) {
    var minOrd = config.minOrd;
    var harNyckelord = config.anvandNyckelord && !!(begrepp.nyckelord && begrepp.nyckelord.length);
    var status = hamtaStatus(kapitelId, begrepp.id);

    var kort = el('div', 'begrepp-kort');
    kort.setAttribute('data-term', (begrepp.rubrik || '').toLowerCase());

    var ikon = el('span', 'begrepp-ikon', status.upplast ? '✓' : '◯');
    var term = el('h3', 'begrepp-term', begrepp.rubrik || begrepp.id);
    term.insertBefore(ikon, term.firstChild);
    kort.appendChild(term);

    var textarea = el('textarea', 'begrepp-textarea');
    textarea.setAttribute('placeholder', 'Skriv din egen förklaring här …');
    textarea.setAttribute('spellcheck', 'true');
    textarea.value = status.text || '';
    kort.appendChild(textarea);

    var rad = el('div', 'begrepp-rad');
    var progress = el('div', 'progress-indikator');
    var sparstatus = el('span', 'begrepp-sparstatus');
    rad.appendChild(progress); rad.appendChild(sparstatus);
    kort.appendChild(rad);

    var knapp = el('button', 'visa-forklaring-knapp'); knapp.type = 'button';
    kort.appendChild(knapp);

    var panel = el('div', 'forklaring-panel dold');
    if (begrepp.etymologi) { panel.appendChild(el('div', 'forklaring-etymologi', begrepp.etymologi)); }
    panel.appendChild(el('div', 'forklaring-text', begrepp.forklaring || ''));
    kort.appendChild(panel);

    function visa() { panel.classList.remove('dold'); knapp.textContent = 'Dölj förklaring'; }
    function dolj() { panel.classList.add('dold'); knapp.textContent = 'Visa förklaring'; }

    knapp.addEventListener('click', function () {
      if (knapp.disabled) { return; }
      if (panel.classList.contains('dold')) { visa(); } else { dolj(); }
    });

    function uppdatera() {
      var text = textarea.value, ord = raknaOrd(text);
      var traffar = harNyckelord ? matchaNyckelord(text, begrepp.nyckelord) : [];
      progress.innerHTML = '';
      progress.appendChild(el('span', 'progress-ord', ord + ' / ' + minOrd + ' ord'));
      if (harNyckelord) {
        progress.appendChild(el('span', 'progress-sep', '•'));
        var nyckelEl = el('span', 'progress-nyckel');
        begrepp.nyckelord.forEach(function (n, i) {
          var p = el('span', 'nyckelord-pricka');
          if (i < traffar.length) { p.classList.add('traffad'); }
          nyckelEl.appendChild(p);
        });
        progress.appendChild(nyckelEl);
      }
      var uppfyllt = ord >= minOrd && (!harNyckelord || traffar.length >= 1);
      kort.classList.toggle('begrepp-upplast', uppfyllt);
      ikon.textContent = uppfyllt ? '✓' : '◯';
      knapp.disabled = !uppfyllt;
      if (!uppfyllt) {
        if (!panel.classList.contains('dold')) { dolj(); }
        knapp.textContent = harNyckelord ? ('Visa förklaring (skriv ' + minOrd + '+ ord + 1 nyckelord)') : ('Visa förklaring (skriv ' + minOrd + '+ ord)');
      } else if (panel.classList.contains('dold')) { knapp.textContent = 'Visa förklaring'; }
    }

    var sparaTimer = null, sparadTimer = null;
    textarea.addEventListener('input', function () {
      if (window.autoExpandTextarea) { window.autoExpandTextarea(textarea); }
      uppdatera();
      if (sparaTimer) { clearTimeout(sparaTimer); }
      sparstatus.textContent = '';
      sparaTimer = setTimeout(function () {
        sparstatus.textContent = 'Sparar…';
        sparaText(kapitelId, begrepp.id, textarea.value);
        sparstatus.textContent = 'Sparad';
        if (sparadTimer) { clearTimeout(sparadTimer); }
        sparadTimer = setTimeout(function () { sparstatus.textContent = ''; }, SPARAD_TID);
      }, DEBOUNCE);
    });

    if (window.autoExpandTextarea) { window.autoExpandTextarea(textarea); }
    uppdatera();
    return kort;
  }

  function kopplaSok() {
    SOK.addEventListener('input', function () {
      var q = SOK.value.trim().toLowerCase();
      INNEHALL.querySelectorAll('.begrepp-kort').forEach(function (k) {
        k.style.display = (!q || (k.getAttribute('data-term') || '').indexOf(q) !== -1) ? '' : 'none';
      });
      INNEHALL.querySelectorAll('.avsnitt-grupp').forEach(function (s) {
        var synliga = Array.prototype.filter.call(s.querySelectorAll('.begrepp-kort'), function (k) { return k.style.display !== 'none'; });
        s.style.display = synliga.length ? '' : 'none';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
