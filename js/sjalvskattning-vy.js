// sjalvskattning-vy.js – självskattningsmatris (kapitel- och ämnesnivå).
//
// Trafikljusmodell driven av matrisens "skattningsalternativ". Eleven
// bedömer varje moment; default = "ej gjort bedömning" (ingen lagrad post).
//
// Layout (demografi-stil, kanonisk): ramade moment, runda färgknappar,
// expandbart förtydligande (dolt by default), kompakt total-progress på en
// rad (fyra färgprickar), per-avsnitts-progress-pille, BEGREPP/FÄRDIGHETER
// som underrubriker.
//
// Matris-schema (data/matris/{kapitel}/matris.json):
//   { kapitel_id, kapitel_titel, skattningsalternativ:[{id,label,farg,default?}],
//     moment:[{id, avsnitt, avsnitt_titel, kategori, moment, fortydligande}] }
//
// Lägen:
//   Kapitel: sätt MATRIS_URL (+ KAPITEL_ID_VAR).
//   Ämne:    sätt AMNE_ID → läser ../data/delkapitel-lista.json och laddar
//            varje kapitels matrisUrl (kapitel utan matrisUrl hoppas över).
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
  var KATEGORI_LABEL = { begrepp: 'Begrepp', fardighet: 'Färdigheter', fardigheter: 'Färdigheter' };
  var KATEGORI_ORDNING = ['begrepp', 'fardighet', 'fardigheter'];

  function el(tagg, klass, text) {
    var e = document.createElement(tagg);
    if (klass) { e.className = klass; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  // ---- lagring ----
  function lasObj() { try { return JSON.parse(localStorage.getItem(STORAGE)) || {}; } catch (e) { return {}; } }
  function skrivObj(o) { try { localStorage.setItem(STORAGE, JSON.stringify(o)); } catch (e) {} }
  function hamtaVal(momentId) { var o = lasObj(); var p = o[momentId]; return p ? (p.val || null) : null; }
  function sattVal(momentId, val) {
    var o = lasObj();
    if (val) { o[momentId] = { val: val, tid: new Date().toISOString() }; } else { delete o[momentId]; }
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

  // Stödjer både flat schema (moment[] med avsnitt/kategori) och demografins
  // nested schema (avsnitt[].moment[] med text/typ).
  function normalisera(m, kapMeta) {
    var alternativ = (m.skattningsalternativ || []).filter(function (a) { return !a.default; });
    if (!alternativ.length) {
      alternativ = [
        { id: 'kan', label: 'Kan', farg: 'gron' },
        { id: 'osaker', label: 'Osäker', farg: 'gul' },
        { id: 'kan_ej', label: 'Kan ej', farg: 'rod' }
      ];
    }
    var moment;
    if (Array.isArray(m.moment)) {
      moment = m.moment;
    } else {
      moment = [];
      (m.avsnitt || []).forEach(function (a) {
        (a.moment || []).forEach(function (mm) {
          moment.push({
            id: mm.id, avsnitt: String(a.nummer), avsnitt_titel: a.titel,
            kategori: mm.typ || mm.kategori, moment: mm.text || mm.moment, fortydligande: mm.fortydligande
          });
        });
      });
    }
    return {
      kapitelId: m.kapitel_id || (kapMeta && kapMeta.id) || '',
      kapitelTitel: m.kapitel_titel || (kapMeta && kapMeta.titel) || '',
      alternativ: alternativ,
      moment: moment
    };
  }

  function avsnittGrupper(g) {
    var ordning = [], karta = {};
    g.moment.forEach(function (mom) {
      var n = mom.avsnitt;
      if (!karta[n]) { karta[n] = { nummer: mom.avsnitt, titel: mom.avsnitt_titel || '', moment: [] }; ordning.push(karta[n]); }
      karta[n].moment.push(mom);
    });
    return ordning;
  }

  // ---- progress (prickrad) ----
  var _alt = null;
  var _prickytor = []; // [{ el, moment[] }] – total + per avsnitt, för live-uppdatering

  function ritaPrickrad(container, moment) {
    container.innerHTML = '';
    var rakn = {}; _alt.forEach(function (a) { rakn[a.id] = 0; });
    var ej = 0;
    moment.forEach(function (m) { var v = hamtaVal(m.id); if (v && rakn.hasOwnProperty(v)) { rakn[v]++; } else { ej++; } });
    _alt.forEach(function (a) { container.appendChild(prick(a.farg, rakn[a.id], a.label)); });
    container.appendChild(prick('ljus', ej, 'Ej bedömt'));
  }
  function prick(farg, antal, titel) {
    var s = el('span', 'skatt-mini');
    s.title = titel;
    s.appendChild(el('span', 'skatt-prick farg-' + farg));
    s.appendChild(el('span', 'skatt-mini-antal', String(antal)));
    return s;
  }
  function uppdateraProgress() { _prickytor.forEach(function (p) { ritaPrickrad(p.el, p.moment); }); }

  // ---- rendering ----
  function rendera(grupper) {
    var amneVy = !MATRIS_URL;
    _prickytor = [];

    if (VERKTYG && window.ElevdataOverforing) {
      VERKTYG.innerHTML = '';
      ElevdataOverforing.montera(VERKTYG, amneVy
        ? { scope: 'amne', amne: AMNE || 'geografi' }
        : { scope: 'kapitel', scopeId: KAPITEL_ID, amne: 'geografi' });
    }

    INNEHALL.innerHTML = '';
    if (STATISTIK) { STATISTIK.innerHTML = ''; }

    if (!grupper.length || !grupper.some(function (g) { return g.moment.length; })) {
      INNEHALL.appendChild(el('p', 'laddar-fel',
        'Inga självskattningsmoment hittades ännu. Matrisen läggs till av läraren.'));
      return;
    }

    _alt = grupper[0].alternativ;

    // Kompakt total-progress (en rad med fyra färgprickar) överst.
    if (STATISTIK) {
      var allaMoment = [];
      grupper.forEach(function (g) { g.moment.forEach(function (m) { allaMoment.push(m); }); });
      var totalPrickar = el('div', 'skatt-prickrad');
      STATISTIK.appendChild(totalPrickar);
      _prickytor.push({ el: totalPrickar, moment: allaMoment });
    }

    if (CHIPS && amneVy) {
      CHIPS.innerHTML = '';
      CHIPS.appendChild(byggChip('Alla kapitel', '*', true));
      grupper.forEach(function (g) { CHIPS.appendChild(byggChip(g.kapitelTitel, g.kapitelId, false)); });
    }

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

        // Per-avsnitts-pille: rubrik + egen prickrad
        var pille = el('div', 'skatt-avsnitt-pille');
        pille.appendChild(el('span', 'skatt-avsnitt-titel', a.nummer + '. ' + a.titel));
        var pillePrickar = el('span', 'skatt-prickrad');
        pille.appendChild(pillePrickar);
        sektion.appendChild(pille);
        _prickytor.push({ el: pillePrickar, moment: a.moment });

        // Gruppera moment per kategori med gold-versal-underrubrik
        var grupperade = grupperaPerKategori(a.moment);
        grupperade.forEach(function (kg) {
          if (kg.label) { sektion.appendChild(el('div', 'skatt-underrubrik', kg.label)); }
          kg.moment.forEach(function (mom) { sektion.appendChild(byggMoment(mom, g.alternativ)); });
        });

        kapBlock.appendChild(sektion);
      });
      INNEHALL.appendChild(kapBlock);
    });

    uppdateraProgress();
  }

  function grupperaPerKategori(moment) {
    var karta = {}, ordning = [];
    moment.forEach(function (m) {
      var kat = (m.kategori || '').toLowerCase();
      if (!karta[kat]) { karta[kat] = { kat: kat, label: kategoriLabel(kat), moment: [] }; ordning.push(karta[kat]); }
      karta[kat].moment.push(m);
    });
    // sortera kända kategorier först (begrepp, färdighet), okända sist i inläsningsordning
    ordning.sort(function (a, b) {
      var ia = KATEGORI_ORDNING.indexOf(a.kat); var ib = KATEGORI_ORDNING.indexOf(b.kat);
      if (ia === -1) { ia = 99; } if (ib === -1) { ib = 99; }
      return ia - ib;
    });
    return ordning;
  }
  function kategoriLabel(kat) {
    if (KATEGORI_LABEL[kat]) { return KATEGORI_LABEL[kat]; }
    return kat ? (kat.charAt(0).toUpperCase() + kat.slice(1)) : '';
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
    rad.appendChild(txt);

    var knappar = el('div', 'skatt-knappar');
    var aktuellt = hamtaVal(mom.id);
    alternativ.forEach(function (a) {
      var k = el('button', 'skatt-knapp farg-' + a.farg + (aktuellt === a.id ? ' aktiv' : ''));
      k.type = 'button';
      k.title = a.label;
      k.setAttribute('aria-label', a.label);
      k.setAttribute('data-val', a.id);
      k.addEventListener('click', function () {
        var nuv = hamtaVal(mom.id);
        var nytt = (nuv === a.id) ? null : a.id;
        sattVal(mom.id, nytt);
        knappar.querySelectorAll('.skatt-knapp').forEach(function (b) {
          b.classList.toggle('aktiv', b.getAttribute('data-val') === nytt);
        });
        uppdateraProgress();
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
