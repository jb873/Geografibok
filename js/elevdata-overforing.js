// elevdata-overforing.js – Export/Import av elevdata via JSON-fil.
//
// Persistens-lösning "Alt A": eleven kan ladda ner all sin data som en
// JSON-fil och läsa tillbaka den på en annan enhet. Löser problemet att
// localStorage försvinner när en Chromebook byts/rensas.
//
// Hanterar de FAKTISKA localStorage-nycklarna som plattformen använder:
//   geo-elev-svar-{delkapitel}      → elevbokssvar (objekt per kapitel)
//   geo-elev-begrepp-{delkapitel}   → begreppsbankens definitioner
//   geo-elev-skattning              → självskattning (globalt objekt)
//   geo-niva-{delkapitel}-avsnitt-N → vald läsnivå
//   geo-elev-identitet              → klass + namn
//
// Exporten är en rå nyckel→värde-karta (lossless round-trip). Vid import
// kan eleven slå samman eller ersätta.
//
// API:
//   ElevdataOverforing.montera(container, {
//     scope: 'kapitel' | 'amne',
//     scopeId: 'geologi',     // delkapitel-id (krävs för scope 'kapitel')
//     amne: 'geografi'        // för filnamn
//   });

(function () {
  'use strict';

  var FORMAT_VERSION = 1;

  function el(tagg, klass, text) {
    var e = document.createElement(tagg);
    if (klass) { e.className = klass; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  // ---- nyckel-urval -------------------------------------------------

  // Avgör om en localStorage-nyckel hör till aktuell scope.
  function horTillScope(nyckel, opts) {
    if (nyckel.indexOf('geo-elev-') !== 0 &&
        nyckel.indexOf('geo-niva-') !== 0) {
      return false;
    }
    if (opts.scope === 'amne') {
      return true; // hela ämnet: all elevdata
    }
    // scope === 'kapitel': bara nycklar för detta delkapitel + globalt skattning
    var id = opts.scopeId;
    if (nyckel === 'geo-elev-svar-' + id) { return true; }
    if (nyckel === 'geo-elev-begrepp-' + id) { return true; }
    if (nyckel.indexOf('geo-niva-' + id + '-') === 0) { return true; }
    if (nyckel === 'geo-elev-skattning') { return true; }
    if (nyckel === 'geo-elev-identitet') { return true; }
    return false;
  }

  function samlaData(opts) {
    var data = {};
    for (var i = 0; i < localStorage.length; i++) {
      var nyckel = localStorage.key(i);
      if (nyckel && horTillScope(nyckel, opts)) {
        data[nyckel] = localStorage.getItem(nyckel);
      }
    }
    return data;
  }

  // ---- räkning för förhandsgranskning -------------------------------

  function raknaPoster(data) {
    var res = { elevbok: 0, begrepp: 0, skattning: 0, niva: 0, ovrigt: 0 };
    Object.keys(data).forEach(function (n) {
      if (n.indexOf('geo-elev-svar-') === 0) { res.elevbok += antalIObjekt(data[n], ['_historik']); }
      else if (n.indexOf('geo-elev-begrepp-') === 0) { res.begrepp += antalIObjekt(data[n], []); }
      else if (n === 'geo-elev-skattning') { res.skattning += antalIObjekt(data[n], []); }
      else if (n.indexOf('geo-niva-') === 0) { res.niva += 1; }
      else { res.ovrigt += 1; }
    });
    return res;
  }

  function antalIObjekt(varde, ignorera) {
    try {
      var o = JSON.parse(varde);
      if (o && typeof o === 'object') {
        return Object.keys(o).filter(function (k) {
          return ignorera.indexOf(k) === -1;
        }).length;
      }
    } catch (e) {}
    return varde ? 1 : 0;
  }

  // ---- export -------------------------------------------------------

  function tvasiffrig(n) { return (n < 10 ? '0' : '') + n; }
  function datumStr() {
    var d = new Date();
    return d.getFullYear() + '-' + tvasiffrig(d.getMonth() + 1) + '-' + tvasiffrig(d.getDate());
  }

  function exportera(opts) {
    var data = samlaData(opts);
    var paket = {
      version: FORMAT_VERSION,
      exporterad: new Date().toISOString(),
      scope: opts.scope,
      scope_id: opts.scope === 'kapitel' ? opts.scopeId : null,
      amne: opts.amne || null,
      data: data
    };
    var json = JSON.stringify(paket, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var del = opts.scope === 'amne' ? 'allt' : opts.scopeId;
    a.download = (opts.amne || 'geografi') + '-' + del + '-' + datumStr() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---- import -------------------------------------------------------

  function validera(paket) {
    if (!paket || typeof paket !== 'object') { return 'Filen är inte ett giltigt dataobjekt.'; }
    if (paket.version !== FORMAT_VERSION) { return 'Filen har ett okänt format (version ' + paket.version + ').'; }
    if (!paket.data || typeof paket.data !== 'object') { return 'Filen saknar elevdata.'; }
    return null; // ok
  }

  function tillampa(data, lage, opts) {
    // lage: 'sammanfoga' (filens värde vinner per nyckel) eller 'ersatt'
    if (lage === 'ersatt') {
      // Radera bara nycklar i aktuell scope, skriv sedan filens.
      var attRadera = [];
      for (var i = 0; i < localStorage.length; i++) {
        var n = localStorage.key(i);
        if (n && horTillScope(n, opts)) { attRadera.push(n); }
      }
      attRadera.forEach(function (n) { localStorage.removeItem(n); });
    }
    Object.keys(data).forEach(function (n) {
      // Importera bara nycklar som hör till scopen (skydd mot förorening).
      if (horTillScope(n, opts)) {
        localStorage.setItem(n, data[n]);
      }
    });
  }

  function oppnaImportModal(opts, onKlart) {
    var input = el('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      var fil = input.files && input.files[0];
      document.body.removeChild(input);
      if (!fil) { return; }
      var lasare = new FileReader();
      lasare.onload = function () {
        var paket;
        try { paket = JSON.parse(lasare.result); }
        catch (e) { visaFel('Filen kunde inte läsas som JSON.'); return; }
        var fel = validera(paket);
        if (fel) { visaFel(fel); return; }
        visaForhandsgranskning(paket, opts, onKlart);
      };
      lasare.onerror = function () { visaFel('Filen kunde inte läsas.'); };
      lasare.readAsText(fil);
    });
    input.click();
  }

  function byggOverlay() {
    var overlay = el('div', 'elevdata-overlay');
    var panel = el('div', 'elevdata-panel');
    overlay.appendChild(panel);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) { overlay.remove(); }
    });
    document.body.appendChild(overlay);
    return { overlay: overlay, panel: panel };
  }

  function visaFel(meddelande) {
    var m = byggOverlay();
    m.panel.appendChild(el('h3', 'elevdata-rubrik', 'Kunde inte läsa filen'));
    m.panel.appendChild(el('p', null, meddelande));
    var rad = el('div', 'elevdata-knapprad');
    var ok = el('button', 'flip-knapp', 'Stäng');
    ok.type = 'button';
    ok.addEventListener('click', function () { m.overlay.remove(); });
    rad.appendChild(ok);
    m.panel.appendChild(rad);
  }

  function visaForhandsgranskning(paket, opts, onKlart) {
    var antal = raknaPoster(paket.data);
    var m = byggOverlay();
    m.panel.appendChild(el('h3', 'elevdata-rubrik', 'Läs in sparat arbete'));

    var sammanfattning = el('p', 'elevdata-sammanfattning');
    sammanfattning.textContent = 'Vi hittade ' + antal.elevbok + ' elevbokstexter, ' +
      antal.begrepp + ' begreppsdefinitioner och ' + antal.skattning + ' självskattningar' +
      (paket.exporterad ? ' (sparad ' + paket.exporterad.slice(0, 10) + ').' : '.');
    m.panel.appendChild(sammanfattning);

    m.panel.appendChild(el('p', 'elevdata-varning',
      'Detta kan inte ångras. Spara gärna ditt nuvarande arbete först.'));

    var fraga = el('p', null, 'Vad vill du göra?');
    m.panel.appendChild(fraga);

    var rad = el('div', 'elevdata-knapprad');

    var sammanfoga = el('button', 'flip-knapp', 'Slå samman');
    sammanfoga.type = 'button';
    sammanfoga.title = 'Behåll din nuvarande data och lägg till från filen. Vid krock vinner filen.';
    sammanfoga.addEventListener('click', function () {
      tillampa(paket.data, 'sammanfoga', opts);
      m.overlay.remove();
      if (onKlart) { onKlart('sammanfoga'); }
    });

    var ersatt = el('button', 'flip-knapp sekundar', 'Ersätt allt');
    ersatt.type = 'button';
    ersatt.title = 'Radera din nuvarande data i denna vy och använd bara filens.';
    ersatt.addEventListener('click', function () {
      bekraftaErsatt(opts, paket, m, onKlart);
    });

    var avbryt = el('button', 'flip-knapp sekundar', 'Avbryt');
    avbryt.type = 'button';
    avbryt.addEventListener('click', function () { m.overlay.remove(); });

    rad.appendChild(sammanfoga);
    rad.appendChild(ersatt);
    rad.appendChild(avbryt);
    m.panel.appendChild(rad);
  }

  function bekraftaErsatt(opts, paket, forraModal, onKlart) {
    forraModal.overlay.remove();
    var m = byggOverlay();
    m.panel.appendChild(el('h3', 'elevdata-rubrik', 'Säker på att ersätta?'));
    m.panel.appendChild(el('p', 'elevdata-varning',
      'All din nuvarande data i den här vyn raderas och ersätts med filens. ' +
      'Detta går inte att ångra.'));
    var rad = el('div', 'elevdata-knapprad');
    var ja = el('button', 'flip-knapp', 'Ja, ersätt allt');
    ja.type = 'button';
    ja.addEventListener('click', function () {
      tillampa(paket.data, 'ersatt', opts);
      m.overlay.remove();
      if (onKlart) { onKlart('ersatt'); }
    });
    var nej = el('button', 'flip-knapp sekundar', 'Avbryt');
    nej.type = 'button';
    nej.addEventListener('click', function () { m.overlay.remove(); });
    rad.appendChild(ja);
    rad.appendChild(nej);
    m.panel.appendChild(rad);
  }

  // ---- montering ----------------------------------------------------

  function montera(container, opts) {
    if (!container) { return; }
    opts = opts || {};
    if (opts.scope === 'kapitel' && !opts.scopeId) {
      console.warn('ElevdataOverforing: scope "kapitel" kräver scopeId.');
    }
    var rad = el('div', 'elevdata-knappar');

    var spara = el('button', 'elevdata-knapp', '💾 Spara mitt arbete');
    spara.type = 'button';
    spara.addEventListener('click', function () { exportera(opts); });

    var ladda = el('button', 'elevdata-knapp', '📂 Ladda från fil');
    ladda.type = 'button';
    ladda.addEventListener('click', function () {
      oppnaImportModal(opts, function () {
        // Enklast och säkrast: ladda om sidan så alla vyer speglar ny data.
        location.reload();
      });
    });

    rad.appendChild(spara);
    rad.appendChild(ladda);
    container.appendChild(rad);
  }

  window.ElevdataOverforing = { montera: montera };
})();
