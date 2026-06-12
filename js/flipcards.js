// flipcards.js – Öva-flikens flipcard-system.
//
// Tre korttyper (begrepp/modell/redogörelse), fyra plugga-lägen med
// EGEN position och progress per läge, vändanimation, självskattning,
// progress, "repetera svåra". Eleven kan byta läge mitt i sessionen via
// dropdown i sessionsheadern utan att förlora var hen var.
//
// Påbörjad redogörelsetext bevaras vid lägesbyte (in-memory, rensas vid
// sidladdning). Hela sessionen sparas i localStorage så att eleven kan
// fortsätta där hen var efter en sidladdning.
//
// Ingen sparing av elevsvar mellan sidladdningar. Inga LLM-anrop.
//
// Monteras i <div id="flipcards-mount" data-fil="..." data-avsnitt="avsnitt-3">.
//
// Beroenden (FÖRE denna fil): bildmodal.js (valfritt), textbyggar-stodlarare.js.

(function () {
  'use strict';

  function initFlipcards(mount) {

  var FIL = mount.getAttribute('data-fil');
  var AVSNITT = mount.getAttribute('data-avsnitt') || 'avsnitt';
  var SKATT_KEY = 'geo-flipcards-' + AVSNITT + '-skattning';
  var SESSION_KEY = 'geo-flipcards-' + AVSNITT + '-session';
  var BILD_BAS = '../../img/' + (typeof DELKAPITEL_ID !== 'undefined' ? DELKAPITEL_ID : 'demografi') + '/';

  var ETIKETT = { begrepp: '🟢 BEGREPP', modell: '🔵 MODELL', redogorelse: '🔴 STOR FRÅGA' };
  var TYPNAMN = { begrepp: 'begreppskort', modell: 'modellkort', redogorelse: 'stora frågor' };
  // Tre nivåer = tre OLIKA aktiviteter (en korttyp var), matchar
  // textnivåerna 📗📘📕. Inte kumulativa paket av samma material.
  var LAGEN = {
    niva1: { typer: ['begrepp'], nivaer: ['grundlaggande', 'fordjupning'] },
    niva2: { typer: ['modell'], nivaer: ['grundlaggande', 'fordjupning'] },
    niva3: { typer: ['redogorelse'], nivaer: ['grundlaggande', 'fordjupning'] }
  };
  var LAGE_NAMN = {
    niva1: '📗 Nivå 1 · Begrepp',
    niva2: '📘 Nivå 2 · Tillämpning',
    niva3: '📕 Nivå 3 · Resonemang',
    anpassa: '⚙ Anpassa själv',
    repetera: '🔁 Repetera svåra'
  };
  var DROPDOWN_LAGEN = ['niva1', 'niva2', 'niva3', 'anpassa'];

  var alla = [];
  var kortById = {};
  var skattning = laddaObj(SKATT_KEY);

  // Per-läge state. lagen[x] = { currentIndex, seenCards, filteredCardIds, typer?, nivaer? }
  var sessionState = { activeLage: 'niva1', lagen: {} };
  var utkast = {};        // cardId -> påbörjad text (in-memory, ej persisterat)
  var aktiva = [];        // resolverade kort för aktivt läge
  var vand = false;
  var curKort = null, curYta = null, curKontroller = null, curTextarea = null;
  var sparTimer = null;

  // ---- hjälpare -----------------------------------------------------

  function el(tagg, klass, text) {
    var e = document.createElement(tagg);
    if (klass) { e.className = klass; }
    if (text != null) { e.textContent = text; }
    return e;
  }
  function laddaObj(nyckel) {
    try { return JSON.parse(localStorage.getItem(nyckel)) || {}; } catch (e) { return {}; }
  }
  function sparaObj(nyckel, obj) {
    try { localStorage.setItem(nyckel, JSON.stringify(obj)); } catch (e) {}
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function formateraSvar(text) {
    var esc = escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    var rader = esc.split('\n');
    var html = '', iLista = false;
    rader.forEach(function (rad) {
      var t = rad.trim();
      if (/^[-•]\s+/.test(t)) {
        if (!iLista) { html += '<ul>'; iLista = true; }
        html += '<li>' + t.replace(/^[-•]\s+/, '') + '</li>';
      } else {
        if (iLista) { html += '</ul>'; iLista = false; }
        if (t) { html += '<p>' + t + '</p>'; }
      }
    });
    if (iLista) { html += '</ul>'; }
    return html;
  }

  // ---- session-/läge-logik ------------------------------------------

  function L() { return sessionState.lagen[sessionState.activeLage]; }

  function filterIds(typer, nivaer) {
    return alla.filter(function (k) {
      return typer.indexOf(k.type) >= 0 && nivaer.indexOf(k.niva) >= 0;
    }).map(function (k) { return k.id; });
  }

  // Slumpar ordningen på kort som har "shuffla": true i JSON – men bara
  // inom deras egna positioner. Övriga kort står kvar. Körs per session
  // (när ett läge initieras), så eleven får ny ordning varje ny kortlek.
  function blandaShufflagrupp(ids) {
    var positioner = [], grupp = [];
    ids.forEach(function (id, idx) {
      if (kortById[id] && kortById[id].shuffla) { positioner.push(idx); grupp.push(id); }
    });
    for (var i = grupp.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = grupp[i]; grupp[i] = grupp[j]; grupp[j] = tmp;
    }
    var resultat = ids.slice();
    positioner.forEach(function (pos, k) { resultat[pos] = grupp[k]; });
    return resultat;
  }

  function initLage(lage, typer, nivaer) {
    var t = typer, n = nivaer;
    if (LAGEN[lage]) { t = LAGEN[lage].typer; n = LAGEN[lage].nivaer; }
    sessionState.lagen[lage] = {
      currentIndex: 0,
      seenCards: {},
      filteredCardIds: blandaShufflagrupp(filterIds(t, n)),
      typer: t,
      nivaer: n
    };
  }

  function aktivaUppdatera() {
    aktiva = (L().filteredCardIds || [])
      .map(function (id) { return kortById[id]; })
      .filter(Boolean);
  }

  function saveSessionNow() {
    sparaObj(SESSION_KEY, sessionState);
  }
  function saveSessionDebounced() {
    clearTimeout(sparTimer);
    sparTimer = setTimeout(saveSessionNow, 1000);
  }

  // ---- startskärm ---------------------------------------------------

  function visaStart() {
    curKort = null;
    mount.innerHTML = '';
    var box = el('div', 'flipcards');
    box.appendChild(el('div', 'flip-start-rubrik', 'Hur vill du plugga idag?'));

    var lagen = [
      { id: 'niva1', titel: '📗 Nivå 1 · Begrepp', beskr: 'Plugga begreppen. Korta kort, snabb repetition.' },
      { id: 'niva2', titel: '📘 Nivå 2 · Tillämpning', beskr: 'Tolka modeller och pyramider. Tillämpa begreppen.' },
      { id: 'niva3', titel: '📕 Nivå 3 · Resonemang', beskr: 'Stora frågor. Träna att resonera och förklara.' },
      { id: 'anpassa', titel: '⚙ Anpassa själv', beskr: 'Välj vilka korttyper och nivåer.' }
    ];
    lagen.forEach(function (l) {
      var lbl = el('label', 'flip-lage lage-' + l.id + (l.id === 'niva1' ? ' vald' : ''));
      var radio = el('input');
      radio.type = 'radio'; radio.name = 'flip-lage'; radio.value = l.id;
      if (l.id === 'niva1') { radio.checked = true; }
      lbl.appendChild(radio);
      lbl.appendChild(el('span', 'flip-lage-titel', l.titel));
      lbl.appendChild(el('span', 'flip-lage-beskr', l.beskr));
      box.appendChild(lbl);
      if (l.id === 'anpassa') { box.appendChild(byggAnpassa()); }
      radio.addEventListener('change', function () {
        box.querySelectorAll('.flip-lage').forEach(function (x) { x.classList.remove('vald'); });
        lbl.classList.add('vald');
        var anp = box.querySelector('.flip-anpassa');
        if (anp) { anp.classList.toggle('dold', l.id !== 'anpassa'); }
      });
    });

    var borja = el('button', 'flip-borja-knapp', 'Börja plugga');
    borja.type = 'button';
    borja.addEventListener('click', function () {
      var valt = box.querySelector('input[name="flip-lage"]:checked').value;
      sessionState = { activeLage: valt, lagen: {} };
      if (valt === 'anpassa') {
        var typer = sl(box.querySelectorAll('.flip-typ:checked')).map(function (c) { return c.value; });
        var nivaer = sl(box.querySelectorAll('.flip-niva:checked')).map(function (c) { return c.value; });
        if (!typer.length || !nivaer.length) { return; }
        initLage('anpassa', typer, nivaer);
      } else {
        initLage(valt);
      }
      enterSession();
    });
    box.appendChild(borja);
    mount.appendChild(box);
  }

  function sl(nodelist) { return Array.prototype.slice.call(nodelist); }

  function byggAnpassa() {
    var wrap = el('div', 'flip-anpassa dold');
    var f1 = el('fieldset'); f1.appendChild(el('legend', null, 'Korttyper'));
    [['begrepp', 'Begrepp'], ['modell', 'Modell'], ['redogorelse', 'Stora frågor']].forEach(function (t) {
      var lbl = el('label');
      var c = el('input'); c.type = 'checkbox'; c.className = 'flip-typ'; c.value = t[0]; c.checked = true;
      lbl.appendChild(c); lbl.appendChild(document.createTextNode(t[1])); f1.appendChild(lbl);
    });
    wrap.appendChild(f1);
    var f2 = el('fieldset'); f2.appendChild(el('legend', null, 'Nivå'));
    [['grundlaggande', 'Grundläggande'], ['fordjupning', 'Fördjupning']].forEach(function (n) {
      var lbl = el('label');
      var c = el('input'); c.type = 'checkbox'; c.className = 'flip-niva'; c.value = n[0]; c.checked = true;
      lbl.appendChild(c); lbl.appendChild(document.createTextNode(n[1])); f2.appendChild(lbl);
    });
    wrap.appendChild(f2);
    return wrap;
  }

  // ---- ram: sessionsheader + progress + scen ------------------------

  function enterSession() {
    aktivaUppdatera();
    ritaRam();
    renderaKort();
    saveSessionNow();
  }

  function ritaRam() {
    mount.innerHTML = '';
    var box = el('div', 'flipcards');

    var header = el('div', 'flip-session-header');
    var knapp = el('button', 'flip-lage-vald');
    knapp.type = 'button';
    knapp.setAttribute('aria-haspopup', 'true');
    header.appendChild(knapp);
    var dd = el('div', 'flip-lage-dropdown dold');
    DROPDOWN_LAGEN.forEach(function (lage) {
      var b = el('button', null, LAGE_NAMN[lage]);
      b.type = 'button';
      b.setAttribute('data-lage', lage);
      b.addEventListener('click', function () {
        dd.classList.add('dold');
        switchLage(lage);
      });
      dd.appendChild(b);
    });
    header.appendChild(dd);
    knapp.addEventListener('click', function (e) {
      e.stopPropagation();
      dd.classList.toggle('dold');
    });
    box.appendChild(header);

    var prog = el('div', 'flip-progress');
    prog.innerHTML = '<div class="flip-progress-spar"><div class="flip-progress-fyll"></div></div>' +
      '<span class="flip-progress-text"></span>';
    box.appendChild(prog);
    box.appendChild(el('div', 'flip-scen'));
    mount.appendChild(box);
    uppdateraLageLabel();
  }

  function uppdateraLageLabel() {
    var knapp = mount.querySelector('.flip-lage-vald');
    if (!knapp) { return; }
    knapp.className = 'flip-lage-vald lage-' + sessionState.activeLage;
    knapp.innerHTML = escapeHtml(LAGE_NAMN[sessionState.activeLage] || 'Pluggläge') +
      ' <span class="pil">▾</span>';
    mount.querySelectorAll('.flip-lage-dropdown button').forEach(function (b) {
      b.classList.toggle('aktiv', b.getAttribute('data-lage') === sessionState.activeLage);
    });
  }

  function switchLage(lage) {
    if (lage === sessionState.activeLage) { return; }
    captureUtkast();
    if (!sessionState.lagen[lage] || !sessionState.lagen[lage].filteredCardIds) {
      if (lage === 'anpassa') {
        openAnpassaModal(sessionState.lagen.anpassa, function (typer, nivaer) {
          initLage('anpassa', typer, nivaer);
          sessionState.activeLage = 'anpassa';
          aktivaUppdatera(); uppdateraLageLabel(); renderaKort(); saveSessionNow();
        });
        return;
      }
      initLage(lage);
    }
    sessionState.activeLage = lage;
    aktivaUppdatera();
    uppdateraLageLabel();
    renderaKort();
    saveSessionNow();
  }

  function captureUtkast() {
    if (curKort && curKort.type === 'redogorelse' && curTextarea && !vand) {
      utkast[curKort.id] = curTextarea.value;
    }
  }

  // ---- kortrendering ------------------------------------------------

  function uppdateraProgress() {
    var fyll = mount.querySelector('.flip-progress-fyll');
    var text = mount.querySelector('.flip-progress-text');
    if (!fyll) { return; }
    var n = L().currentIndex + 1, tot = aktiva.length;
    fyll.style.width = Math.round((n / tot) * 100) + '%';
    text.textContent = n + '/' + tot + ' kort';
  }

  function typPosition(kort, index) {
    var fore = aktiva.slice(0, index + 1).filter(function (k) { return k.type === kort.type; }).length;
    var tot = aktiva.filter(function (k) { return k.type === kort.type; }).length;
    return fore + ' / ' + tot;
  }

  function renderaKort() {
    var scen = mount.querySelector('.flip-scen');
    if (!scen) { ritaRam(); scen = mount.querySelector('.flip-scen'); }
    scen.innerHTML = '';

    if (!aktiva.length) {
      scen.appendChild(el('p', 'flipcards-fel', 'Inga kort matchar detta läge. Välj ett annat läge i menyn ovan.'));
      return;
    }
    var Lg = L();
    if (Lg.currentIndex >= aktiva.length) { Lg.currentIndex = aktiva.length - 1; }
    if (Lg.currentIndex < 0) { Lg.currentIndex = 0; }

    curKort = aktiva[Lg.currentIndex];
    vand = false;
    curTextarea = null;

    var flip = el('div', 'flipcard');
    curYta = el('div', 'flipcard-yta typ-' + curKort.type);
    flip.appendChild(curYta);
    scen.appendChild(flip);
    curKontroller = el('div', 'flip-kontroller');
    scen.appendChild(curKontroller);

    fyllFram();
    markeraSedd(curKort);
    uppdateraProgress();
  }

  function etikettRad() {
    return '<div class="flip-etikett-rad"><span class="flip-etikett">' +
      ETIKETT[curKort.type] + '</span><span class="flip-raknare">' +
      typPosition(curKort, L().currentIndex) + '</span></div>';
  }

  function bildHtml(kort) {
    if (!kort.bild) { return ''; }
    return '<img class="flip-bild" src="' + BILD_BAS + kort.bild + '" alt="' +
      escapeHtml(kort.bild_alt || '') + '" loading="lazy">';
  }
  function bindBild() {
    var img = curYta.querySelector('.flip-bild');
    if (img && window.BildModal) {
      img.addEventListener('click', function () {
        BildModal.visa(img.getAttribute('src'), curKort.bild_alt || '');
      });
    }
  }

  function fyllFram() {
    var h = etikettRad();
    if (curKort.type === 'modell') { h += bildHtml(curKort); }
    h += '<div class="flip-fraga">' + escapeHtml(curKort.fraga) + '</div>';
    if (curKort.type === 'redogorelse') {
      h += bildHtml(curKort);
      h += '<textarea class="flip-textarea" placeholder="Skriv ditt svar här om du vill, eller tänk igenom det i huvudet innan du vänder kortet …"></textarea>';
      h += '<button type="button" class="flip-hjalp-knapp">💡 Behöver du komma igång?</button>';
    }
    curYta.innerHTML = h;
    bindBild();

    if (curKort.type === 'redogorelse') {
      curTextarea = curYta.querySelector('.flip-textarea');
      if (curTextarea) {
        curTextarea.value = utkast[curKort.id] || '';
        curTextarea.addEventListener('input', function () {
          utkast[curKort.id] = curTextarea.value;
        });
      }
      var hjalp = curYta.querySelector('.flip-hjalp-knapp');
      if (hjalp && window.TextbyggarStodlarare) {
        hjalp.addEventListener('click', function () {
          TextbyggarStodlarare.oppna(curKort, curTextarea);
        });
      }
    }

    curKontroller.innerHTML = '';
    var rad = el('div', 'flip-knapprad');
    var vandKnapp = el('button', 'flip-knapp flip-vand-knapp',
      curKort.type === 'redogorelse' ? 'Vänd kortet och se facit' : 'Vänd kortet');
    vandKnapp.type = 'button';
    vandKnapp.addEventListener('click', vandKort);
    rad.appendChild(vandKnapp);
    curKontroller.appendChild(rad);
    curKontroller.appendChild(byggNav(false));
  }

  function fyllBak() {
    var h = etikettRad();
    if (curKort.type === 'redogorelse') {
      var text = utkast[curKort.id] || '';
      var harSkrivit = text.trim().length > 0;
      h += '<div class="flip-svarspaneler' + (harSkrivit ? ' tva' : '') + '">';
      if (harSkrivit) {
        h += '<div class="flip-panel ditt-svar"><div class="flip-panel-rubrik">DITT SVAR</div>' +
          '<div class="flip-svar">' + formateraSvar(text) + '</div></div>';
      } else {
        h += '<div class="flip-fraga-repris">' + escapeHtml(curKort.fraga) + '</div>';
      }
      h += '<div class="flip-panel modellsvar"><div class="flip-panel-rubrik">MODELLSVAR</div>' +
        '<div class="flip-svar">' + formateraSvar(curKort.modellsvar || curKort.svar || '') + '</div></div>';
      h += '</div>';
    } else {
      h += '<div class="flip-svar">' + formateraSvar(curKort.svar || '') + '</div>';
    }
    curYta.innerHTML = h;

    curKontroller.innerHTML = '';
    var sk = el('div', 'flip-skattning');
    sk.appendChild(el('div', 'flip-skattning-rubrik', 'Hur gick det?'));
    var knappar = el('div', 'flip-skatt-knappar');
    [['behover-ova', '😐 Behöver öva', 'ova'], ['ok', '😊 OK', 'ok'], ['bra', '⭐ Bra', 'bra']].forEach(function (s) {
      var b = el('button', 'flip-skatt', s[1]);
      b.type = 'button';
      b.setAttribute('data-varde', s[0]);
      if (skattning[curKort.id] === s[0]) { b.classList.add('vald-' + s[2]); }
      b.addEventListener('click', function () { skatta(s[0]); });
      knappar.appendChild(b);
    });
    sk.appendChild(knappar);
    curKontroller.appendChild(sk);

    var rad = el('div', 'flip-knapprad');
    var nastaKnapp = el('button', 'flip-knapp flip-vand-knapp',
      L().currentIndex + 1 >= aktiva.length ? 'Avsluta sessionen' : 'Nästa kort');
    nastaKnapp.type = 'button';
    nastaKnapp.addEventListener('click', nasta);
    rad.appendChild(nastaKnapp);
    curKontroller.appendChild(rad);
    curKontroller.appendChild(byggNav(true));
  }

  function byggNav(paBak) {
    var nav = el('div', 'flip-nav');
    var forraKnapp = el('button', 'flip-knapp sekundar', '← Föregående');
    forraKnapp.type = 'button';
    forraKnapp.disabled = L().currentIndex === 0;
    forraKnapp.addEventListener('click', forra);
    nav.appendChild(forraKnapp);
    var hoger = el('button', 'flip-knapp sekundar', paBak ? 'Avsluta' : 'Hoppa över →');
    hoger.type = 'button';
    hoger.addEventListener('click', paBak ? visaSammanfattning : nasta);
    nav.appendChild(hoger);
    return nav;
  }

  function vandKort() {
    if (vand) { return; }
    if (curKort.type === 'redogorelse' && curTextarea) {
      utkast[curKort.id] = curTextarea.value;
    }
    vand = true;
    curYta.classList.add('vand-ut');
    setTimeout(function () {
      fyllBak();
      curYta.classList.remove('vand-ut');
    }, 300);
  }

  function skatta(varde) {
    if (!curKort) { return; }
    skattning[curKort.id] = varde;
    sparaObj(SKATT_KEY, skattning);
    var map = { 'behover-ova': 'vald-ova', 'ok': 'vald-ok', 'bra': 'vald-bra' };
    curKontroller.querySelectorAll('.flip-skatt').forEach(function (b) {
      b.classList.remove('vald-ova', 'vald-ok', 'vald-bra');
      if (b.getAttribute('data-varde') === varde) { b.classList.add(map[varde]); }
    });
  }

  function markeraSedd(kort) { L().seenCards[kort.id] = true; }

  function nasta() {
    if (L().currentIndex + 1 >= aktiva.length) { visaSammanfattning(); return; }
    var nuv = aktiva[L().currentIndex];
    L().currentIndex++;
    saveSessionDebounced();
    var nastaKort = aktiva[L().currentIndex];
    if (nuv.type !== nastaKort.type) { visaInterstitial(nuv.type); } else { renderaKort(); }
  }

  function forra() {
    if (L().currentIndex === 0) { return; }
    L().currentIndex--;
    saveSessionDebounced();
    renderaKort();
  }

  function visaInterstitial(klarTyp) {
    curKort = null;
    var scen = mount.querySelector('.flip-scen');
    scen.innerHTML = '';
    var antal = aktiva.filter(function (k) { return k.type === klarTyp; }).length;
    var box = el('div', 'flip-interstitial');
    box.appendChild(el('h3', null, '✓ Du har sett alla ' + TYPNAMN[klarTyp]));
    box.appendChild(el('p', null, 'Bra jobbat! ' + antal + ' av ' + antal + ' gjorda.'));
    var knappar = el('div', 'flip-interstitial-knappar');
    var forts = el('button', 'flip-knapp', 'Fortsätt med ' + TYPNAMN[aktiva[L().currentIndex].type]);
    forts.type = 'button';
    forts.addEventListener('click', renderaKort);
    knappar.appendChild(forts);
    var avsluta = el('button', 'flip-knapp sekundar', 'Avsluta för idag');
    avsluta.type = 'button';
    avsluta.addEventListener('click', visaSammanfattning);
    knappar.appendChild(avsluta);
    box.appendChild(knappar);
    scen.appendChild(box);
    uppdateraProgress();
  }

  function visaSammanfattning() {
    curKort = null;
    var scen = mount.querySelector('.flip-scen');
    if (!scen) { ritaRam(); scen = mount.querySelector('.flip-scen'); }
    scen.innerHTML = '';
    var box = el('div', 'flip-sammanfattning');
    box.appendChild(el('h3', null, '🎉 Sessionen klar'));
    box.appendChild(el('p', null, 'Du gick igenom:'));
    var ul = el('ul');
    ['begrepp', 'modell', 'redogorelse'].forEach(function (typ) {
      var antal = aktiva.filter(function (k) { return k.type === typ; }).length;
      if (antal) { ul.appendChild(el('li', null, '• ' + antal + ' ' + TYPNAMN[typ])); }
    });
    box.appendChild(ul);

    var svaraIds = Object.keys(skattning).filter(function (id) {
      return (skattning[id] === 'behover-ova' || skattning[id] === 'ok') && kortById[id];
    });
    var knappar = el('div', 'flip-sammanfattning-knappar');
    if (svaraIds.length) {
      box.appendChild(el('p', null, 'Vill du repetera särskilt svåra kort?'));
      var rep = el('button', 'flip-knapp', 'Repetera svåra (' + svaraIds.length + ')');
      rep.type = 'button';
      rep.addEventListener('click', function () { repeteraSvara(svaraIds); });
      knappar.appendChild(rep);
    }
    var ater = el('button', 'flip-knapp sekundar', 'Tillbaka till avsnittet');
    ater.type = 'button';
    ater.addEventListener('click', function () {
      visaStart();
      var flik = document.querySelector('.flik[data-flik="laes"]');
      if (flik) { flik.click(); }
    });
    knappar.appendChild(ater);
    var omStart = el('button', 'flip-knapp sekundar', 'Plugga igen');
    omStart.type = 'button';
    omStart.addEventListener('click', visaStart);
    knappar.appendChild(omStart);
    box.appendChild(knappar);
    scen.appendChild(box);

    var fyll = mount.querySelector('.flip-progress-fyll');
    if (fyll) { fyll.style.width = '100%'; }
    var txt = mount.querySelector('.flip-progress-text');
    if (txt) { txt.textContent = aktiva.length + '/' + aktiva.length + ' kort'; }
  }

  function repeteraSvara(ids) {
    sessionState.lagen.repetera = { currentIndex: 0, seenCards: {}, filteredCardIds: ids.slice() };
    sessionState.activeLage = 'repetera';
    aktivaUppdatera();
    uppdateraLageLabel();
    renderaKort();
    saveSessionNow();
  }

  // ---- "Anpassa själv"-modal (mitt i session) -----------------------

  function openAnpassaModal(forval, onApply) {
    var overlay = el('div', 'txbygg-overlay');
    var panel = el('div', 'txbygg-panel');
    panel.appendChild(el('h3', 'txbygg-rubrik', '⚙ Anpassa själv'));

    function stang() { overlay.remove(); }

    var valdaT = (forval && forval.typer) || ['begrepp', 'modell', 'redogorelse'];
    var valdaN = (forval && forval.nivaer) || ['grundlaggande', 'fordjupning'];

    var s1 = el('div', 'txbygg-sektion');
    s1.appendChild(el('div', 'txbygg-sektion-rubrik', 'Korttyper'));
    [['begrepp', 'Begrepp'], ['modell', 'Modell'], ['redogorelse', 'Stora frågor']].forEach(function (t) {
      var lbl = el('label'); lbl.style.display = 'block'; lbl.style.margin = '0.2rem 0';
      var c = el('input'); c.type = 'checkbox'; c.className = 'flip-typ'; c.value = t[0];
      c.checked = valdaT.indexOf(t[0]) >= 0;
      lbl.appendChild(c); lbl.appendChild(document.createTextNode(' ' + t[1])); s1.appendChild(lbl);
    });
    panel.appendChild(s1);

    var s2 = el('div', 'txbygg-sektion');
    s2.appendChild(el('div', 'txbygg-sektion-rubrik', 'Nivå'));
    [['grundlaggande', 'Grundläggande'], ['fordjupning', 'Fördjupning']].forEach(function (n) {
      var lbl = el('label'); lbl.style.display = 'block'; lbl.style.margin = '0.2rem 0';
      var c = el('input'); c.type = 'checkbox'; c.className = 'flip-niva'; c.value = n[0];
      c.checked = valdaN.indexOf(n[0]) >= 0;
      lbl.appendChild(c); lbl.appendChild(document.createTextNode(' ' + n[1])); s2.appendChild(lbl);
    });
    panel.appendChild(s2);

    var rad = el('div', 'txbygg-knapprad');
    var anvand = el('button', 'flip-knapp', 'Använd');
    anvand.type = 'button';
    anvand.addEventListener('click', function () {
      var typer = sl(panel.querySelectorAll('.flip-typ:checked')).map(function (c) { return c.value; });
      var nivaer = sl(panel.querySelectorAll('.flip-niva:checked')).map(function (c) { return c.value; });
      if (!typer.length || !nivaer.length) { return; }
      stang();
      onApply(typer, nivaer);
    });
    var avbryt = el('button', 'flip-knapp sekundar', 'Avbryt');
    avbryt.type = 'button';
    avbryt.addEventListener('click', stang);
    rad.appendChild(anvand); rad.appendChild(avbryt);
    panel.appendChild(rad);

    overlay.appendChild(panel);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) { stang(); } });
    document.body.appendChild(overlay);
  }

  // ---- resume efter sidladdning -------------------------------------

  function laddaSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }

  function sanera(saved) {
    if (!saved || !saved.lagen || !saved.activeLage) { return null; }
    Object.keys(saved.lagen).forEach(function (lage) {
      var s = saved.lagen[lage];
      if (!s || !Array.isArray(s.filteredCardIds)) { delete saved.lagen[lage]; return; }
      s.filteredCardIds = s.filteredCardIds.filter(function (id) { return kortById[id]; });
      if (!s.seenCards) { s.seenCards = {}; }
      if (typeof s.currentIndex !== 'number') { s.currentIndex = 0; }
      if (s.currentIndex >= s.filteredCardIds.length) { s.currentIndex = Math.max(0, s.filteredCardIds.length - 1); }
    });
    var akt = saved.lagen[saved.activeLage];
    if (!akt || !akt.filteredCardIds.length) { return null; }
    return saved;
  }

  function visaAteruppta(saved) {
    curKort = null;
    mount.innerHTML = '';
    var akt = saved.lagen[saved.activeLage];
    var box = el('div', 'flipcards');
    var dlg = el('div', 'flip-interstitial');
    dlg.appendChild(el('h3', null, 'Välkommen tillbaka'));
    dlg.appendChild(el('p', null,
      'Du var mitt i en pluggsession (kort ' + (akt.currentIndex + 1) + ' av ' +
      akt.filteredCardIds.length + ' i ' + (LAGE_NAMN[saved.activeLage] || saved.activeLage) + ').'));
    var knappar = el('div', 'flip-interstitial-knappar');
    var forts = el('button', 'flip-knapp', 'Fortsätt där du var');
    forts.type = 'button';
    forts.addEventListener('click', function () {
      sessionState = saved;
      utkast = {};
      enterSession();
    });
    var omborja = el('button', 'flip-knapp sekundar', 'Börja om');
    omborja.type = 'button';
    omborja.addEventListener('click', function () {
      try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
      sessionState = { activeLage: 'niva1', lagen: {} };
      visaStart();
    });
    knappar.appendChild(forts); knappar.appendChild(omborja);
    dlg.appendChild(knappar);
    box.appendChild(dlg);
    mount.appendChild(box);
  }

  // ---- tangentbord --------------------------------------------------

  document.addEventListener('keydown', function (e) {
    // Bara den synliga instansen (aktiv underdel + aktiv Öva-flik) reagerar.
    if (mount.offsetParent === null) { return; }
    if (!curKort) { return; }
    var a = document.activeElement;
    if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) { return; }
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (!vand) { vandKort(); }
    } else if (e.key === 'ArrowRight') { nasta(); }
    else if (e.key === 'ArrowLeft') { forra(); }
    else if (vand && (e.key === '1' || e.key === '2' || e.key === '3')) {
      skatta(['behover-ova', 'ok', 'bra'][parseInt(e.key, 10) - 1]);
    }
  });

  // Stäng läge-dropdown vid klick utanför.
  document.addEventListener('click', function (e) {
    var dd = mount.querySelector('.flip-lage-dropdown');
    if (dd && !dd.classList.contains('dold')) {
      var header = mount.querySelector('.flip-session-header');
      if (header && !header.contains(e.target)) { dd.classList.add('dold'); }
    }
  });

  // ---- start --------------------------------------------------------

  function visaLaddningsfel() {
    mount.innerHTML = '';
    mount.appendChild(el('p', 'flipcards-fel', 'Flipcards finns inte för detta avsnitt ännu.'));
  }

  if (!FIL) { visaLaddningsfel(); return; }

  fetch(FIL)
    .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.json(); })
    .then(function (data) {
      alla = [];
      (data.begreppskort || []).forEach(function (k) { alla.push(k); });
      (data.modellkort || []).forEach(function (k) { alla.push(k); });
      (data.redogorelsekort || []).forEach(function (k) { alla.push(k); });
      alla.forEach(function (k) { kortById[k.id] = k; });
      if (!alla.length) { visaLaddningsfel(); return; }

      var saved = sanera(laddaSession());
      if (saved && LAGE_NAMN[saved.activeLage] && saved.lagen[saved.activeLage].currentIndex > 0) {
        visaAteruppta(saved);
      } else {
        visaStart();
      }
    })
    .catch(function (e) {
      console.warn('Kunde inte ladda flipcards-data (' + FIL + ').', e);
      visaLaddningsfel();
    });

  } // slut initFlipcards (en instans per mount)

  // Bootstrap: en flipcard-instans per mount. Stödjer både gammal
  // id-baserad (#flipcards-mount) och ny klassbaserad (.flipcards-mount —
  // flera per sida, en per underdel).
  document.querySelectorAll('#flipcards-mount, .flipcards-mount').forEach(function (m) {
    initFlipcards(m);
  });
})();
