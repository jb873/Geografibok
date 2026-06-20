// forelasningar.js – laddar och renderar avsnittets YouTube-föreläsningar
// högst upp i Läs-fliken.
//
// Sidan ska sätta globalen AVSNITT_ID innan denna fil körs.
// Hämtar data/forelasningar.json och visar de föreläsningar vars
// avsnitt_id matchar sidans AVSNITT_ID. Saknas föreläsningar visas
// ingenting (rubrik + lista döljs helt).

(function () {
  'use strict';

  function nyEl(tagg, klass) {
    var e = document.createElement(tagg);
    if (klass) { e.className = klass; }
    return e;
  }

  // Bygger ett kollapsat föreläsningskort som expanderar till spelare.
  function skapaForelasning(forelasning) {
    var kort = nyEl('div', 'forelasning');
    kort.setAttribute('data-yt', forelasning.youtube_id);

    // ----- Kollapsat huvud (klickbar rad) -----
    var huvud = nyEl('button', 'forelasning-huvud');
    huvud.type = 'button';

    var thumb = nyEl('span', 'forelasning-thumb');
    var img = nyEl('img');
    img.src = 'https://img.youtube.com/vi/' + forelasning.youtube_id + '/mqdefault.jpg';
    img.alt = '';
    img.loading = 'lazy';
    thumb.appendChild(img);
    var play = nyEl('span', 'forelasning-play');
    play.setAttribute('aria-hidden', 'true');
    play.textContent = '▶';
    thumb.appendChild(play);
    huvud.appendChild(thumb);

    var info = nyEl('span', 'forelasning-info');
    var titel = nyEl('span', 'forelasning-titel');
    titel.textContent = forelasning.titel;
    info.appendChild(titel);
    var langd = nyEl('span', 'forelasning-langd');
    langd.textContent = forelasning.langd;
    info.appendChild(langd);
    huvud.appendChild(info);

    kort.appendChild(huvud);

    // ----- Expandering -----
    function expandera() {
      huvud.style.display = 'none';

      var spelare = nyEl('div', 'forelasning-spelare');

      var stang = nyEl('button', 'forelasning-stang');
      stang.type = 'button';
      stang.setAttribute('aria-label', 'Stäng spelaren');
      stang.textContent = '×';
      stang.addEventListener('click', kollapsa);
      spelare.appendChild(stang);

      var video = nyEl('div', 'forelasning-video');
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube.com/embed/' + forelasning.youtube_id;
      iframe.title = forelasning.titel;
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      video.appendChild(iframe);
      spelare.appendChild(video);

      kort.appendChild(spelare);
    }

    function kollapsa() {
      var spelare = kort.querySelector('.forelasning-spelare');
      if (spelare) { spelare.remove(); }
      huvud.style.display = '';
    }

    huvud.addEventListener('click', expandera);

    return kort;
  }

  // Scope-id för en container: underdelens data-underdel-id (flerdelade
  // avsnitt) annars sidans AVSNITT_ID (gamla strukturen).
  function skopId(container) {
    var u = container.closest ? container.closest('.underdel') : null;
    if (u && u.getAttribute('data-underdel-id')) {
      return u.getAttribute('data-underdel-id');
    }
    return (typeof AVSNITT_ID !== 'undefined') ? AVSNITT_ID : null;
  }

  function renderaIContainer(data, container, scopeId) {
    var mina = (data.forelasningar || []).filter(function (f) {
      return f.avsnitt_id === scopeId;
    });

    container.innerHTML = '';

    // Inga föreläsningar → dölj just denna komponent.
    if (!mina.length) {
      container.style.display = 'none';
      return;
    }
    container.style.display = '';

    var rubrik = nyEl('div', 'forelasningar-rubrik');
    rubrik.textContent = 'Föreläsningar';
    container.appendChild(rubrik);

    mina.forEach(function (f) {
      container.appendChild(skapaForelasning(f));
    });
  }

  // Sätter Föreläsning-flikknappen disabled (ingen föreläsning) eller aktiv.
  function sattForelasningFlik(harForelasning) {
    document.querySelectorAll('.flik[data-flik="forelasning"]').forEach(function (knapp) {
      knapp.disabled = !harForelasning;
      if (harForelasning) { knapp.removeAttribute('aria-disabled'); }
      else { knapp.setAttribute('aria-disabled', 'true'); }
    });
  }

  function renderaForelasningar(data) {
    // Klassbaserat → fungerar med flera listor per sida (en per underdel).
    var containers = document.querySelectorAll('.forelasningar-lista');
    var totalt = 0;
    containers.forEach(function (container) {
      var scopeId = skopId(container);
      totalt += (data.forelasningar || []).filter(function (f) { return f.avsnitt_id === scopeId; }).length;
      renderaIContainer(data, container, scopeId);
    });
    // Inga föreläsningar för avsnittet → disabla flikknappen, annars aktiv.
    sattForelasningFlik(totalt > 0);
  }

  function start() {
    var containers = document.querySelectorAll('.forelasningar-lista');
    if (!containers.length) { return; }
    fetch('data/forelasningar.json')
      .then(function (r) {
        if (!r.ok) { throw new Error('HTTP ' + r.status); }
        return r.json();
      })
      .then(renderaForelasningar)
      .catch(function (e) {
        console.error('Kunde inte ladda forelasningar.json:', e);
        document.querySelectorAll('.forelasningar-lista').forEach(function (c) {
          c.style.display = 'none';
        });
        sattForelasningFlik(false);   // fetch-fel/404 → disabla fliken (t.ex. saknad forelasningar.json)
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
