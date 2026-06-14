// sjalvskattning-vy.js – självskattningsmatris (kapitel- och ämnesnivå).
//
// Trafikljusmodell driven av matrisens "skattningsalternativ". Eleven
// bedömer varje moment; default = "ej gjort bedömning" (ingen lagrad post).
//
// Matris-schema (data/matris/{kapitel}/matris.json):
//   { kapitel_id, kapitel_titel, skattningsalternativ:[{id,label,farg,default?}],
//     moment:[{id, avsnitt, avsnitt_titel, kategori, moment, fortydligande}] }
//
// Lägen:
//   Kapitel: sätt MATRIS_URL (+ KAPITEL_ID, KAPITEL_TITEL).
//   Ämne:    sätt AMNE_ID → läser ../data/delkapitel-lista.json och
//            laddar varje kapitels matrisUrl (kapitel utan matrisUrl hoppas över).
//
// Lagring: geo-elev-skattning → { momentId: { val, tid } }  (globalt, fångas av export).
//
// Beroenden: elevdata-overforing.js (valfri).

(function () {
  'use strict';

  var INNEHALL = document.getElementById('sjalvskattning-innehall');
  var NAV = document.getElementById('sjalvskattning-nav');
  var VERKTYG = document.getElementById('sjalvskattning-verktyg');
  var STATISTIK = document.getElementById('sjalvskattning-statistik');
  var CHIPS = document.getElementById('sjalvskattning-chips');
  if (!INNEHALL) { return; }

  var STORAGE = 'geo-elev-skattning';
  var AMNE = (typeof AMNE_ID !== 'undefined') ? AMNE_ID : null;
  var MATRIS_URL = (typeof window.MATRIS_URL !== 'undefined') ? window.MATRIS_URL : null;
  var KAPITEL_ID = (typeof KAPITEL_ID_VAR !== 'undefined') ? KAPITEL_ID_VAR : null;

  function el(tagg, klass, text) {
    var e = document.createElement(tagg);
    if (klass) { e.className = klass; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  // ---- lagring ----
  function lasObj() { try { return JSON.parse(localStorage.getItem(STORAGE)) || {}; } catch (e) { return {}; } }
  function skrivObj(o) { try { localStorage.setItem(STORAGE, JSON.stringify(o)); } catch (e) {} }
  function hamtaVal(momentId) {
    var o = lasObj(); var p = o[momentId];
    return p ? (p.val || null) : null;
  }
  function sattVal(momentId, val) {
    var o = lasObj();
    if (val) { o[momentId] = { val: val, tid: new Date().toISOString() }; }
    else { delete o[momentId]; }
    skrivObj(o);
  }

  // ---- laddning ----
  function start() {
    if (MATRIS_URL) {
      fetch(MATRIS_URL)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (m) { rendera(m ? [normalisera(m)] : []); })
        .catch(function (e) { console.error('sjalvskattning:', e); rendera([]); });
      return;
    }
    // ämne: läs kapitellistan
    fetch('../data/delkapitel-lista.json')
      .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.json(); })
      .then(function (lista) {
        var kapitel = ((lista && lista.delkapitel) || [])
          .filter(function (k) { return k.klar && k.matrisUrl; })
          .sort(function (a, b) { return (a.ordning || 0) - (b.ordning || 0); });
        return Promise.all(kapitel.map(function (k) {
          return fetch(k.matrisUrl)
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (m) { return m ? normalisera(m, k) : null; })
            .catch(function () { return null; });
        }));
      })
      .then(function (grupper) { rendera(grupper.filter(Boolean)); })
      .catch(function (e) { console.error('sjalvskattning:', e); rendera([]); });
  }

  function normalisera(m, kapMeta) {
    var alternativ = (m.skattningsalternativ || []).filter(function (a) { return !a.default; });
    return {
      kapitelId: m.kapitel_id || (kapMeta && kapMeta.id) || '',
      kapitelTitel: m.kapitel_titel || (kapMeta && kapMeta.titel) || '',
      alternativ: alternativ.length ? alternativ : [
        { id: 'kan', label: 'Kan', farg: 'gron' },
        { id: 'osaker', label: 'Osäker', farg: 'gul' },
        { id: 'kan_ej', label: 'Kan ej', farg: 'rod' }
      ],
      moment: (m.moment || [])
    };
  }

  function rendera(grupper) {
    var amneVy = !MATRIS_URL;

    if (VERKTYG && window.ElevdataOverforing) {
      VERKTYG.innerHTML = '';
      ElevdataOverforing.montera(VERKTYG, amneVy
        ? { scope: 'amne', amne: AMNE || 'geografi' }
        : { scope: 'kapitel', scopeId: KAPITEL_ID, amne: 'geografi' });
    }

    INNEHALL.innerHTML = '';
    if (!grupper.length || !grupper.some(function (g) { return g.moment.length; })) {
      INNEHALL.appendChild(el('p', 'laddar-fel',
        'Inga självskattningsmoment hittades ännu. Matrisen läggs till av läraren.'));
      if (STATISTIK) { STATISTIK.innerHTML = ''; }
      return;
    }

    // gemensamma alternativ (för statistik-legend) – ta från första gruppen
    var alt = grupper[0].alternativ;

    // statistik
    if (STATISTIK) { ritaStatistik(grupper, alt); }

    // chips (ämne)
    if (CHIPS && amneVy) {
      CHIPS.innerHTML = '';
      CHIPS.appendChild(byggChip('Alla kapitel', '*', true));
      grupper.forEach(function (g) { CHIPS.appendChild(byggChip(g.kapitelTitel, g.kapitelId, false)); });
    }

    // nav
    if (NAV) {
      NAV.innerHTML = '';
      grupper.forEach(function (g) {
        if (amneVy) { NAV.appendChild(el('div', 'kelev-nav-kapitel', g.kapitelTitel)); }
        avsnittGrupper(g).forEach(function (a) {
          var lank = el('a', 'kelev-nav-lank', a.nummer + '. ' + a.titel);
          lank.href = '#skatt-' + g.kapitelId + '-' + a.nummer;
          NAV.appendChild(lank);
        });
      });
    }

    grupper.forEach(function (g) {
      var kapBlock = el('section', 'kelev-kapitel');
      kapBlock.setAttribute('data-kapitel', g.kapitelId);
      if (amneVy) { kapBlock.appendChild(el('h2', 'kelev-kapitel-rubrik', g.kapitelTitel)); }
      avsnittGrupper(g).forEach(function (a) {
        var sektion = el('section', 'skatt-avsnitt');
        sektion.id = 'skatt-' + g.kapitelId + '-' + a.nummer;
        sektion.appendChild(el('h3', 'skatt-avsnitt-rubrik', a.nummer + '. ' + a.titel));
        a.moment.forEach(function (mom) { sektion.appendChild(byggMoment(mom, g.alternativ)); });
        kapBlock.appendChild(sektion);
      });
      INNEHALL.appendChild(kapBlock);
    });
  }

  function avsnittGrupper(g) {
    var ordning = [], karta = {};
    g.moment.forEach(function (mom) {
      var nyckel = mom.avsnitt;
      if (!karta[nyckel]) {
        karta[nyckel] = { nummer: mom.avsnitt, titel: mom.avsnitt_titel || '', moment: [] };
        ordning.push(karta[nyckel]);
      }
      karta[nyckel].moment.push(mom);
    });
    return ordning;
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

  function byggMoment(mom, alternativ) {
    var wrap = el('div', 'skatt-moment');
    var rad = el('div', 'skatt-rad');

    var txt = el('div', 'skatt-text klickbar');
    txt.appendChild(el('span', 'skatt-expandpil', '▸'));
    txt.appendChild(document.createTextNode(' ' + mom.moment));
    if (mom.kategori) { txt.appendChild(el('span', 'skatt-kategori', mom.kategori === 'begrepp' ? 'Begrepp' : 'Färdighet')); }
    rad.appendChild(txt);

    var knappar = el('div', 'skatt-knappar');
    var aktuellt = hamtaVal(mom.id);
    alternativ.forEach(function (a) {
      var k = el('button', 'skatt-knapp farg-' + a.farg + (aktuellt === a.id ? ' aktiv' : ''), a.label);
      k.type = 'button';
      k.setAttribute('data-val', a.id);
      k.addEventListener('click', function () {
        var nuv = hamtaVal(mom.id);
        var nytt = (nuv === a.id) ? null : a.id; // klick på aktiv = avmarkera
        sattVal(mom.id, nytt);
        knappar.querySelectorAll('.skatt-knapp').forEach(function (b) {
          b.classList.toggle('aktiv', b.getAttribute('data-val') === nytt);
        });
        if (STATISTIK) { uppdateraStatistikSnabb(); }
      });
      knappar.appendChild(k);
    });
    rad.appendChild(knappar);
    wrap.appendChild(rad);

    if (mom.fortydligande) {
      var fort = el('p', 'skatt-fortydligande dold', mom.fortydligande);
      wrap.appendChild(fort);
      txt.addEventListener('click', function () {
        var dolt = fort.classList.toggle('dold');
        txt.querySelector('.skatt-expandpil').textContent = dolt ? '▸' : '▾';
      });
    }
    return wrap;
  }

  // ---- statistik ----
  var _grupperRef = null, _altRef = null;
  function ritaStatistik(grupper, alt) {
    _grupperRef = grupper; _altRef = alt;
    uppdateraStatistikSnabb();
  }
  function uppdateraStatistikSnabb() {
    if (!STATISTIK || !_grupperRef) { return; }
    var alla = [];
    _grupperRef.forEach(function (g) { g.moment.forEach(function (m) { alla.push(m); }); });
    var total = alla.length;
    var rakn = {}; _altRef.forEach(function (a) { rakn[a.id] = 0; });
    var ejBedomt = 0;
    alla.forEach(function (m) {
      var v = hamtaVal(m.id);
      if (v && rakn.hasOwnProperty(v)) { rakn[v]++; } else { ejBedomt++; }
    });
    STATISTIK.innerHTML = '';
    STATISTIK.appendChild(el('div', 'kelev-stats-text', 'Du har bedömt ' + (total - ejBedomt) + ' av ' + total + ' moment'));
    var rader = el('div', 'skatt-fordelning');
    _altRef.forEach(function (a) { rader.appendChild(byggFordelning(a.label, a.farg, rakn[a.id], total)); });
    rader.appendChild(byggFordelning('Ej bedömt', 'ljus', ejBedomt, total));
    STATISTIK.appendChild(rader);
  }
  function byggFordelning(label, farg, antal, total) {
    var rad = el('div', 'skatt-fordelning-rad');
    rad.appendChild(el('span', 'skatt-prick farg-' + farg));
    rad.appendChild(el('span', 'skatt-fordelning-label', label));
    var spar = el('span', 'skatt-fordelning-spar');
    var fyll = el('span', 'skatt-fordelning-fyll farg-' + farg);
    fyll.style.width = (total ? Math.round((antal / total) * 100) : 0) + '%';
    spar.appendChild(fyll);
    rad.appendChild(spar);
    rad.appendChild(el('span', 'skatt-fordelning-antal', antal + ' / ' + total));
    return rad;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
