// kapitel-elevbok.js – samlad, kompakt elevbok för ETT kapitel.
//
// Aggregerar elevens sammanfattningar (svar på avsnittens frågor) i en
// tät översiktsvy där eleven kan redigera direkt. Skriver till samma
// localStorage-nyckel som avsnittssidorna (geo-elev-svar-{delkapitel}),
// så ändringar syns på båda ställena.
//
// Globaler som sidan ska sätta:
//   DELKAPITEL_ID    – t.ex. 'geologi'
//   DELKAPITEL_TITEL – t.ex. 'Geologi'
//
// Beroenden (FÖRE denna fil):
//   elevbok.js  → window.Elevbok (hamtaSvar, skapaAutospara, startaFlikSynk, visaHistorik)
//   avsnitt.js  → window.autoExpandTextarea
//   elevdata-overforing.js → window.ElevdataOverforing (valfri)

(function () {
  'use strict';

  var INNEHALL = document.getElementById('kapitel-elevbok-innehall');
  var NAV = document.getElementById('kapitel-elevbok-nav');
  var VERKTYG = document.getElementById('kapitel-elevbok-verktyg');
  if (!INNEHALL) { return; }

  var DK = (typeof DELKAPITEL_ID !== 'undefined') ? DELKAPITEL_ID : '';
  var DK_TITEL = (typeof DELKAPITEL_TITEL !== 'undefined') ? DELKAPITEL_TITEL : DK;

  function el(tagg, klass, text) {
    var e = document.createElement(tagg);
    if (klass) { e.className = klass; }
    if (text != null) { e.textContent = text; }
    return e;
  }
  function raknaOrd(text) {
    var t = (text || '').trim();
    return t ? t.split(/\s+/).length : 0;
  }

  function blockId(fragaId) { return 'kelev-' + fragaId; }

  function rendera(data) {
    var avsnitt = (data && data.avsnitt) || [];

    // ---- statistik ----
    var totalt = 0, skrivna = 0;
    avsnitt.forEach(function (a) {
      (a.fragor || []).forEach(function (f) {
        totalt++;
        var svar = Elevbok.hamtaSvar(DK, f.id);
        if (svar && svar.trim()) { skrivna++; }
      });
    });

    // ---- verktyg (export/import) ----
    if (VERKTYG && window.ElevdataOverforing) {
      VERKTYG.innerHTML = '';
      ElevdataOverforing.montera(VERKTYG, { scope: 'kapitel', scopeId: DK, amne: 'geografi' });
    }

    // ---- statistik-rad ----
    var stats = el('div', 'kelev-stats');
    var procent = totalt ? Math.round((skrivna / totalt) * 100) : 0;
    stats.appendChild(el('span', 'kelev-stats-text',
      'Du har skrivit sammanfattning för ' + skrivna + ' av ' + totalt + ' frågor'));
    var bar = el('div', 'kelev-progressbar');
    var fyll = el('div', 'kelev-progressfyll');
    fyll.style.width = procent + '%';
    bar.appendChild(fyll);
    stats.appendChild(bar);
    INNEHALL.innerHTML = '';
    INNEHALL.appendChild(stats);

    // ---- navigation ----
    if (NAV) {
      NAV.innerHTML = '';
      avsnitt.forEach(function (a) {
        var lank = el('a', 'kelev-nav-lank', a.nummer + '. ' + a.titel);
        lank.href = '#kelev-avsnitt-' + a.nummer;
        NAV.appendChild(lank);
      });
    }

    // ---- innehåll per avsnitt ----
    if (!avsnitt.length) {
      INNEHALL.appendChild(el('p', 'laddar-fel', 'Inga frågor hittades för detta kapitel.'));
      return;
    }

    avsnitt.forEach(function (a) {
      var grupp = el('section', 'kelev-avsnitt');
      grupp.id = 'kelev-avsnitt-' + a.nummer;
      grupp.appendChild(el('h2', 'kelev-avsnitt-rubrik', a.nummer + '. ' + a.titel));

      (a.fragor || []).forEach(function (f) {
        grupp.appendChild(byggFragaBlock(a, f));
      });
      INNEHALL.appendChild(grupp);
    });

    startaSynk();
  }

  function byggFragaBlock(avsnitt, fraga) {
    var block = el('div', 'kelev-fraga');
    block.id = blockId(fraga.id);
    if (fraga.typ === 'fordjupning') { block.classList.add('kelev-fordjupning'); }

    var kontext = 'Avsnitt ' + avsnitt.nummer +
      (fraga.typ === 'fordjupning' ? ' · Fördjupning' : '');
    block.appendChild(el('div', 'kelev-fraga-kontext', kontext));
    block.appendChild(el('div', 'kelev-fraga-text', fraga.fraga));

    var textarea = el('textarea', 'kelev-textarea');
    textarea.setAttribute('data-delkapitel', DK);
    textarea.setAttribute('data-fraga-id', fraga.id);
    textarea.setAttribute('placeholder', 'Skriv din sammanfattning här …');
    textarea.setAttribute('spellcheck', 'true');
    var sparat = Elevbok.hamtaSvar(DK, fraga.id);
    if (sparat) { textarea.value = sparat; }
    block.appendChild(textarea);

    var meta = el('div', 'kelev-meta');
    var ord = el('span', 'kelev-ord', raknaOrd(textarea.value) + ' ord');
    var status = el('span', 'sparstatus');
    status.setAttribute('aria-live', 'polite');
    meta.appendChild(ord);
    meta.appendChild(status);
    block.appendChild(meta);

    // auto-expand + ordräknare + autospara
    if (window.autoExpandTextarea) {
      window.autoExpandTextarea(textarea);
      textarea.addEventListener('input', function () { window.autoExpandTextarea(textarea); });
    }
    textarea.addEventListener('input', function () {
      ord.textContent = raknaOrd(textarea.value) + ' ord';
    });
    Elevbok.skapaAutospara(textarea, DK, fraga.id, status);

    return block;
  }

  function startaSynk() {
    if (!Elevbok.startaFlikSynk) { return; }
    var nyckel = 'geo-elev-svar-' + DK;
    Elevbok.startaFlikSynk(function (andrad) {
      if (andrad !== nyckel) { return; }
      INNEHALL.querySelectorAll('.kelev-textarea').forEach(function (ta) {
        var aktuell = Elevbok.hamtaSvar(ta.dataset.delkapitel, ta.dataset.fragaId);
        if (document.activeElement !== ta && ta.value !== aktuell) {
          ta.value = aktuell || '';
          if (window.autoExpandTextarea) { window.autoExpandTextarea(ta); }
          var meta = ta.parentNode.querySelector('.kelev-ord');
          if (meta) { meta.textContent = raknaOrd(ta.value) + ' ord'; }
        }
      });
    });
  }

  function visaFel() {
    INNEHALL.innerHTML = '<p class="laddar-fel">Kunde inte ladda frågor. ' +
      'Kontrollera att data/fragor.json finns.</p>';
  }

  function start() {
    fetch('data/fragor.json')
      .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.json(); })
      .then(rendera)
      .catch(function (e) { console.error('kapitel-elevbok:', e); visaFel(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
