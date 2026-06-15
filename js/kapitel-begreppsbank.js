// kapitel-begreppsbank.js – begreppsbank för ETT kapitel.
//
// Läser en KURATERAD begreppsfil: data/begreppsbank-{delkapitel}.json
//   { upplasning:{min_ord, anvand_nyckelord}, begrepp:[{id, avsnitt, avsnitt_titel,
//     rubrik, expertdefinition, nyckelord?, etymologi?}] }
//
// Eleven skriver egen definition. Expertdefinitionen låses upp enligt
// filens upplasning-config: minst N ord, och (om anvand_nyckelord) minst
// 1 av begreppets nyckelord. En gång upplåst = alltid tillgänglig.
//
// Lagring: geo-elev-begrepp-{delkapitel} → { id:{text,upplast,upplast_datum} }
// (fångas av export/import och ämnesvyn).
//
// Globaler: DELKAPITEL_ID. Beroenden: avsnitt.js (autoExpandTextarea, valfri),
// elevdata-overforing.js (valfri).

(function () {
  'use strict';

  var INNEHALL = document.getElementById('kapitel-begreppsbank-innehall');
  var NAV = document.getElementById('kapitel-begreppsbank-nav');
  var VERKTYG = document.getElementById('kapitel-begreppsbank-verktyg');
  var SOK = document.getElementById('kapitel-begreppsbank-sok');
  if (!INNEHALL) { return; }

  var DK = (typeof DELKAPITEL_ID !== 'undefined') ? DELKAPITEL_ID : '';
  var BEGREPP_URL = (typeof window.BEGREPP_URL !== 'undefined')
    ? window.BEGREPP_URL : ('data/begreppsbank-' + DK + '.json');
  var STORAGE = 'geo-elev-begrepp-' + DK;
  var DEBOUNCE = 2000, SPARAD_TID = 3000;
  var minOrd = 8, anvandNyckelord = false;

  // ---- lagring ----
  function lasObj() { try { return JSON.parse(localStorage.getItem(STORAGE)) || {}; } catch (e) { return {}; } }
  function skrivObj(o) { try { localStorage.setItem(STORAGE, JSON.stringify(o)); } catch (e) {} }
  function hamtaStatus(id) { var o = lasObj(); return o[id] || { text: '', upplast: false }; }
  function sparaText(id, text) { var o = lasObj(); var s = o[id] || {}; s.text = text; o[id] = s; skrivObj(o); }
  function markeraUpplast(id) {
    var o = lasObj(); var s = o[id] || {};
    if (!s.upplast) { s.upplast = true; s.upplast_datum = new Date().toISOString(); o[id] = s; skrivObj(o); }
  }

  // ---- hjälpare ----
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

  // ---- laddning ----
  function start() {
    fetch(BEGREPP_URL)
      .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.json(); })
      .then(function (data) {
        var u = data.upplasning || {};
        minOrd = (typeof u.min_ord === 'number') ? u.min_ord : 8;
        anvandNyckelord = !!u.anvand_nyckelord;
        rendera(grupperaPerAvsnitt(normalisera(data)));
      })
      .catch(function (e) { console.error('kapitel-begreppsbank:', e); visaFel(); });
  }

  // Stödjer både flat schema (begrepp[] med rubrik/expertdefinition + valfritt
  // term) och demografins nested schema (avsnitt[].begrepp[] med term/forklaring).
  // Normaliserar till { id, term, forklaring, nyckelord, etymologi, __avsnitt, __titel }.
  function normalisera(data) {
    if (Array.isArray(data.begrepp)) {
      return data.begrepp.map(function (b) {
        return {
          id: b.id, term: b.term || b.rubrik, forklaring: b.expertdefinition || b.forklaring,
          nyckelord: b.nyckelord || [], etymologi: b.etymologi || '',
          __avsnitt: b.avsnitt, __titel: b.avsnitt_titel
        };
      });
    }
    var ut = [];
    (data.avsnitt || []).forEach(function (a) {
      (a.begrepp || []).forEach(function (b) {
        ut.push({
          id: b.id, term: b.term, forklaring: b.forklaring,
          nyckelord: b.nyckelord || [], etymologi: b.etymologi || '',
          __avsnitt: a.nummer, __titel: a.titel
        });
      });
    });
    return ut;
  }

  function grupperaPerAvsnitt(begrepp) {
    var ordning = [], karta = {};
    begrepp.forEach(function (b) {
      var nyckel = b.__avsnitt;
      if (!karta[nyckel]) {
        karta[nyckel] = { nummer: b.__avsnitt, titel: b.__titel || '', begrepp: [] };
        ordning.push(karta[nyckel]);
      }
      karta[nyckel].begrepp.push(b);
    });
    return ordning;
  }

  function visaFel() {
    INNEHALL.innerHTML = '<p class="laddar-fel">Kunde inte ladda begreppen. ' +
      'Kontrollera att ' + BEGREPP_URL + ' finns.</p>';
  }

  function rendera(grupper) {
    var totalt = 0, medDef = 0;
    grupper.forEach(function (g) {
      g.begrepp.forEach(function (b) { totalt++; if ((hamtaStatus(b.id).text || '').trim()) { medDef++; } });
    });

    if (VERKTYG && window.ElevdataOverforing) {
      VERKTYG.innerHTML = '';
      ElevdataOverforing.montera(VERKTYG, { scope: 'kapitel', scopeId: DK, amne: 'geografi' });
    }

    INNEHALL.innerHTML = '';
    var stats = el('div', 'kelev-stats');
    var procent = totalt ? Math.round((medDef / totalt) * 100) : 0;
    stats.appendChild(el('span', 'kelev-stats-text',
      'Du har skrivit definition för ' + medDef + ' av ' + totalt + ' begrepp'));
    var bar = el('div', 'kelev-progressbar');
    var fyll = el('div', 'kelev-progressfyll'); fyll.style.width = procent + '%';
    bar.appendChild(fyll); stats.appendChild(bar);
    INNEHALL.appendChild(stats);

    if (NAV) {
      NAV.innerHTML = '';
      grupper.forEach(function (g) {
        var lank = el('a', 'kelev-nav-lank', g.nummer + '. ' + g.titel);
        lank.href = '#kbeg-avsnitt-' + g.nummer;
        NAV.appendChild(lank);
      });
    }

    if (!grupper.length) {
      INNEHALL.appendChild(el('p', 'laddar-fel', 'Inga begrepp hittades i detta kapitel.'));
      return;
    }

    grupper.forEach(function (g) {
      var sektion = el('section', 'avsnitt-grupp');
      sektion.id = 'kbeg-avsnitt-' + g.nummer;
      sektion.appendChild(el('h2', 'avsnitt-grupp-rubrik', g.nummer + '. ' + g.titel));
      var grid = el('div', 'begrepp-grid');
      g.begrepp.forEach(function (b) { grid.appendChild(byggKort(b)); });
      sektion.appendChild(grid);
      INNEHALL.appendChild(sektion);
    });

    if (SOK) { kopplaSok(); }
  }

  function byggKort(begrepp) {
    var harNyckelord = anvandNyckelord && !!(begrepp.nyckelord && begrepp.nyckelord.length);
    var status = hamtaStatus(begrepp.id);

    var kort = el('div', 'begrepp-kort');
    kort.setAttribute('data-term', (begrepp.term || '').toLowerCase());

    var ikon = el('span', 'begrepp-ikon', status.upplast ? '✓' : '◯');
    var term = el('h3', 'begrepp-term', begrepp.term || begrepp.id);
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
      var text = textarea.value;
      var ord = raknaOrd(text);
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
        if (!panel.classList.contains('dold')) { dolj(); } // återlås om texten faller under tröskeln
        knapp.textContent = harNyckelord
          ? ('Visa förklaring (skriv ' + minOrd + '+ ord + 1 nyckelord)')
          : ('Visa förklaring (skriv ' + minOrd + '+ ord)');
      } else if (panel.classList.contains('dold')) {
        knapp.textContent = 'Visa förklaring';
      }
    }

    var sparaTimer = null, sparadTimer = null;
    textarea.addEventListener('input', function () {
      if (window.autoExpandTextarea) { window.autoExpandTextarea(textarea); }
      uppdatera();
      if (sparaTimer) { clearTimeout(sparaTimer); }
      sparstatus.textContent = '';
      sparaTimer = setTimeout(function () {
        sparstatus.textContent = 'Sparar…';
        sparaText(begrepp.id, textarea.value);
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
