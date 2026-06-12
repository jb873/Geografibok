// bildmodal.js – universell bild-lightbox för hela boken.
//
// Användning: BildModal.visa(src, bildtext)
//   - src: bildens URL
//   - bildtext: valfri text som visas under bilden (utelämnas → ingen text)
//
// Stängs med ×, klick utanför bilden, eller Esc. Modalen skapas en gång
// och återanvänds. Inga beroenden.

window.BildModal = (function () {
  'use strict';

  var modal = null;
  var imgEl = null;
  var capEl = null;

  function skapa() {
    if (modal) { return; }
    modal = document.createElement('div');
    modal.className = 'bild-modal dold';
    modal.innerHTML =
      '<button type="button" class="bild-modal-stang" aria-label="Stäng">×</button>' +
      '<figure class="bild-modal-figur">' +
        '<img class="bild-modal-innehall" alt="">' +
        '<figcaption class="bild-modal-text"></figcaption>' +
      '</figure>';
    document.body.appendChild(modal);

    imgEl = modal.querySelector('.bild-modal-innehall');
    capEl = modal.querySelector('.bild-modal-text');

    modal.addEventListener('click', function (h) {
      // Klick på overlay eller stäng-knappen (inte på bilden) stänger.
      if (h.target === modal || h.target.classList.contains('bild-modal-stang')) {
        stang();
      }
    });
    document.addEventListener('keydown', function (h) {
      if (h.key === 'Escape') { stang(); }
    });
  }

  function visa(src, bildtext) {
    skapa();
    imgEl.src = src;
    imgEl.alt = bildtext || '';
    if (bildtext) {
      capEl.textContent = bildtext;
      capEl.style.display = '';
    } else {
      capEl.textContent = '';
      capEl.style.display = 'none';
    }
    modal.classList.remove('dold');
  }

  function stang() {
    if (modal) { modal.classList.add('dold'); }
  }

  return { visa: visa, stang: stang };
})();
