// amne-elevbok.js – samlad, kompakt elevbok på ÄMNESNIVÅ (alla kapitel).
//
// Aggregerar elevens sammanfattningar över alla kapitel i ämnet. Bygger på
// samma fragor-modell som kapitelvyn (varje kapitel har data/fragor.json
// och svar i geo-elev-svar-{kapitel}). Skriver tillbaka till samma nyckel,
// så ändringar syns även i kapitel- och avsnittsvyerna.
//
// Kapitlen upptäcks via data/delkapitel-lista.json (ingen hårdkodning).
//
// Beroenden: elevbok.js, avsnitt.js (autoExpandTextarea), elevdata-overforing.js.

(function () {
  'use strict';

  var INNEHALL = document.getElementById('amne-elevbok-innehall');
  var NAV = document.getElementById('amne-elevbok-nav');
  var VERKTYG = document.getElementById('amne-elevbok-verktyg');
  var CHIPS = document.getElementById('amne-elevbok-chips');
  if (!INNEHALL) { return; }

  var AMNE = (typeof AMNE_ID !== 'undefined') ? AMNE_ID : 'geografi';
  var LISTA_URL = '../data/delkapitel-lista.json';

  function el(tagg, klass, text) {
    var e = document.createElement(tagg);
    if (klass) { e.className = klass; }
    if (text != null) { e.textContent = text; }
    return e;
  }
  function raknaOrd(t) { t = (t || '').trim(); return t ? t.split(/\s+/).length : 0; }

  function start() {
    fetch(LISTA_URL)
      .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.json(); })
      .then(function (lista) {
        var kapitel = ((lista && lista.delkapitel) || [])
          .filter(function (k) { return k.klar; })
          .sort(function (a, b) { return (a.ordning || 0) - (b.ordning || 0); });
        return Promise.all(kapitel.map(function (k) {
          return fetch(k.id + '/data/fragor.json')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) { return data ? { kap: k, avsnitt: data.avsnitt || [] } : null; })
            .catch(function () { return null; });
        }));
      })
      .then(function (kapitelData) {
        rendera(kapitelData.filter(Boolean));
      })
      .catch(function (e) { console.error('amne-elevbok:', e); visaFel(); });
  }

  function visaFel() {
    INNEHALL.innerHTML = '<p class="laddar-fel">Kunde inte ladda kapitel. ' +
      'Kontrollera att data/delkapitel-lista.json finns.</p>';
  }

  function rendera(kapitelData) {
    if (VERKTYG && window.ElevdataOverforing) {
      VERKTYG.innerHTML = '';
      ElevdataOverforing.montera(VERKTYG, { scope: 'amne', amne: AMNE });
    }

    // statistik (alla kapitel)
    var totalt = 0, skrivna = 0;
    kapitelData.forEach(function (kd) {
      kd.avsnitt.forEach(function (a) {
        (a.fragor || []).forEach(function (f) {
          totalt++;
          var s = Elevbok.hamtaSvar(kd.kap.id, f.id);
          if (s && s.trim()) { skrivna++; }
        });
      });
    });

    INNEHALL.innerHTML = '';
    var stats = el('div', 'kelev-stats');
    var procent = totalt ? Math.round((skrivna / totalt) * 100) : 0;
    stats.appendChild(el('span', 'kelev-stats-text',
      'Du har skrivit sammanfattning för ' + skrivna + ' av ' + totalt + ' frågor (alla kapitel)'));
    var bar = el('div', 'kelev-progressbar');
    var fyll = el('div', 'kelev-progressfyll'); fyll.style.width = procent + '%';
    bar.appendChild(fyll); stats.appendChild(bar);
    INNEHALL.appendChild(stats);

    // kapitelfilter-chips
    if (CHIPS) {
      CHIPS.innerHTML = '';
      CHIPS.appendChild(byggChip('Alla kapitel', '*', true));
      kapitelData.forEach(function (kd) {
        CHIPS.appendChild(byggChip(kd.kap.titel, kd.kap.id, false));
      });
    }

    // nav
    if (NAV) {
      NAV.innerHTML = '';
      kapitelData.forEach(function (kd) {
        NAV.appendChild(el('div', 'kelev-nav-kapitel', kd.kap.titel));
        kd.avsnitt.forEach(function (a) {
          var lank = el('a', 'kelev-nav-lank', a.nummer + '. ' + a.titel);
          lank.href = '#aelev-' + kd.kap.id + '-' + a.nummer;
          NAV.appendChild(lank);
        });
      });
    }

    if (!kapitelData.length) {
      INNEHALL.appendChild(el('p', 'laddar-fel', 'Inga kapitel hittades.'));
      return;
    }

    kapitelData.forEach(function (kd) {
      var kapBlock = el('section', 'kelev-kapitel');
      kapBlock.setAttribute('data-kapitel', kd.kap.id);
      kapBlock.appendChild(el('h2', 'kelev-kapitel-rubrik', kd.kap.titel));

      kd.avsnitt.forEach(function (a) {
        var grupp = el('section', 'kelev-avsnitt');
        grupp.id = 'aelev-' + kd.kap.id + '-' + a.nummer;
        grupp.appendChild(el('h3', 'kelev-avsnitt-rubrik', a.nummer + '. ' + a.titel));
        (a.fragor || []).forEach(function (f) {
          grupp.appendChild(byggFragaBlock(kd.kap.id, a, f));
        });
        kapBlock.appendChild(grupp);
      });
      INNEHALL.appendChild(kapBlock);
    });

    startaSynk(kapitelData);
  }

  function byggChip(text, id, aktiv) {
    var chip = el('button', 'kelev-chip' + (aktiv ? ' aktiv' : ''), text);
    chip.type = 'button';
    chip.setAttribute('data-kapitel', id);
    chip.addEventListener('click', function () {
      CHIPS.querySelectorAll('.kelev-chip').forEach(function (c) { c.classList.remove('aktiv'); });
      chip.classList.add('aktiv');
      INNEHALL.querySelectorAll('.kelev-kapitel').forEach(function (k) {
        k.style.display = (id === '*' || k.getAttribute('data-kapitel') === id) ? '' : 'none';
      });
    });
    return chip;
  }

  function byggFragaBlock(kapitelId, avsnitt, fraga) {
    var block = el('div', 'kelev-fraga');
    if (fraga.typ === 'fordjupning') { block.classList.add('kelev-fordjupning'); }
    if (fraga.typ === 'fordjupning') {
      block.appendChild(el('div', 'kelev-fraga-kontext', 'Fördjupning'));
    }
    block.appendChild(el('div', 'kelev-fraga-text', fraga.fraga));

    var textarea = el('textarea', 'kelev-textarea');
    textarea.setAttribute('data-delkapitel', kapitelId);
    textarea.setAttribute('data-fraga-id', fraga.id);
    textarea.setAttribute('placeholder', 'Skriv din sammanfattning här …');
    textarea.setAttribute('spellcheck', 'true');
    var sparat = Elevbok.hamtaSvar(kapitelId, fraga.id);
    if (sparat) { textarea.value = sparat; }
    block.appendChild(textarea);

    var meta = el('div', 'kelev-meta');
    var ord = el('span', 'kelev-ord', raknaOrd(textarea.value) + ' ord');
    var status = el('span', 'sparstatus'); status.setAttribute('aria-live', 'polite');
    meta.appendChild(ord); meta.appendChild(status);
    block.appendChild(meta);

    if (window.autoExpandTextarea) {
      window.autoExpandTextarea(textarea);
      textarea.addEventListener('input', function () { window.autoExpandTextarea(textarea); });
    }
    textarea.addEventListener('input', function () {
      ord.textContent = raknaOrd(textarea.value) + ' ord';
    });
    Elevbok.skapaAutospara(textarea, kapitelId, fraga.id, status);
    return block;
  }

  function startaSynk(kapitelData) {
    if (!Elevbok.startaFlikSynk) { return; }
    var nycklar = {};
    kapitelData.forEach(function (kd) { nycklar['geo-elev-svar-' + kd.kap.id] = true; });
    Elevbok.startaFlikSynk(function (andrad) {
      if (!nycklar[andrad]) { return; }
      INNEHALL.querySelectorAll('.kelev-textarea').forEach(function (ta) {
        var aktuell = Elevbok.hamtaSvar(ta.dataset.delkapitel, ta.dataset.fragaId);
        if (document.activeElement !== ta && ta.value !== aktuell) {
          ta.value = aktuell || '';
          if (window.autoExpandTextarea) { window.autoExpandTextarea(ta); }
          var o = ta.parentNode.querySelector('.kelev-ord');
          if (o) { o.textContent = raknaOrd(ta.value) + ' ord'; }
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
