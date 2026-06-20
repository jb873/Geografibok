// elevfeedback.js — floating-knapp + modal för elevtips via mailto.
// Eleven väljer kategori + skriver kommentar; JS bygger en mailto-länk
// med sidtitel, URL och tidpunkt och öppnar elevens mail-app.

(function () {
  'use strict';

  var MOTTAGAR_MAIL = 'jb@alphaskolan.se';

  function nyEl(tagg, klass) {
    var e = document.createElement(tagg);
    if (klass) { e.className = klass; }
    return e;
  }

  function skapaKnapp() {
    var knapp = nyEl('button', 'feedback-knapp');
    knapp.type = 'button';
    knapp.setAttribute('aria-label', 'Tipsa oss om förbättringar');
    knapp.innerHTML = '<span class="ikon" aria-hidden="true">💬</span><span>TIPSA</span>';
    knapp.addEventListener('click', oppnaModal);
    document.body.appendChild(knapp);
  }

  function skapaModal() {
    var overlay = nyEl('div', 'feedback-overlay');
    overlay.id = 'feedback-overlay';

    var modal = nyEl('div', 'feedback-modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = [
      '<h2>Tipsa oss om förbättringar <button type="button" class="stang" aria-label="Stäng">✕</button></h2>',
      '<p style="font-size:14px;color:var(--muted);">Vad gäller det?</p>',
      '<label class="kategori"><input type="radio" name="kategori" value="Det är fel"> Det är fel</label>',
      '<label class="kategori"><input type="radio" name="kategori" value="Förbättringsförslag" checked> Förbättringsförslag</label>',
      '<label class="kategori"><input type="radio" name="kategori" value="Ny idé"> Ny idé</label>',
      '<label class="kategori"><input type="radio" name="kategori" value="Annat"> Annat</label>',
      '<p style="font-size:14px;color:var(--muted);margin-top:12px;">Berätta mer:</p>',
      '<textarea id="feedback-kommentar" placeholder="Skriv här..."></textarea>',
      '<p class="sida-info" id="feedback-sida-info"></p>',
      '<div class="knappar">',
      '<button type="button" class="avbryt">Avbryt</button>',
      '<button type="button" class="skicka">SKICKA TIPS</button>',
      '</div>'
    ].join('');

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modal.querySelector('.stang').addEventListener('click', stangModal);
    modal.querySelector('.avbryt').addEventListener('click', stangModal);
    modal.querySelector('.skicka').addEventListener('click', skickaTips);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) { stangModal(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { stangModal(); }
    });
  }

  function oppnaModal() {
    var overlay = document.getElementById('feedback-overlay');
    overlay.classList.add('aktiv');
    var sidtitel = document.title || 'Okänd sida';
    document.getElementById('feedback-sida-info').textContent = 'Sidan: ' + sidtitel;
  }

  function stangModal() {
    var overlay = document.getElementById('feedback-overlay');
    if (overlay) { overlay.classList.remove('aktiv'); }
  }

  function skickaTips() {
    var kategoriEl = document.querySelector('input[name="kategori"]:checked');
    var kategori = kategoriEl ? kategoriEl.value : 'Ej angiven';
    var kommentar = document.getElementById('feedback-kommentar').value;

    if (!kommentar.trim()) {
      alert('Skriv en kommentar innan du skickar.');
      return;
    }

    var sidtitel = document.title || 'Okänd sida';
    var url = window.location.href;
    var tid = new Date().toISOString().slice(0, 16).replace('T', ' ');

    var subject = 'Elevtips — ' + kategori + ' — ' + sidtitel;
    var body = [
      'Kategori: ' + kategori,
      '',
      'Kommentar:',
      kommentar,
      '',
      'Sidan: ' + sidtitel,
      'URL: ' + url,
      'Tid: ' + tid
    ].join('\n');

    var mailto = 'mailto:' + MOTTAGAR_MAIL +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);

    window.location.href = mailto;
    setTimeout(stangModal, 500);
  }

  function start() {
    skapaKnapp();
    skapaModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
