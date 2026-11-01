/* Bokmotorn – ett delkapitels sida (hubben) och dess läsböcker. Fysik; pilot 2026-10-29, motorn fryst 2026-10-31.
 *
 * MOTORN ÄNDRAS INTE NÄR INNEHÅLL LÄGGS TILL. Ett delkapitel är en mapp med bara data (mall: Fysik/mall/delkapitel/):
 *
 *   index.html               mallen, ordagrant – laddar motorn och delkapitel.js
 *   delkapitel.js            Bok.delkapitel({...}): titel, nivåer och hjälpmedel
 *   innehall/<nivå>.js       Bok.niva('<nivå>', {avsnitt: [...]}): en självbärande bok per nivå
 *
 * Hubben är delkapitlets sida, byggd som plattformens avsnittssida (geografiboken): hero-banner, flikarna Föreläsning ·
 * Läs · Öva · Elevboken, och i Läs texterna (A, B …) och nivåerna (📗 Enkel · 📘 Standard · 📕 Fördjupning). Ett tryck
 * på en text öppnar boken där, på vald nivå, i helskärm. ✕ Stäng, Esc eller bakåt går tillbaka till hubben, och boken
 * minns sidan. Boken läses och spelas inte: hela sidan visas direkt och eleven bläddrar själv.
 *
 * Statusen härleds ur innehållet och skrivs aldrig för hand: en nivå utan avsnitt och ett hjälpmedel utan adress
 * syns, är märkta "kommer" och går inte att välja.
 *
 * Utbyggnad som inte är innehåll – görs i motorn, inte av den som skriver:
 *   Bok.blocktyp(namn, fn)   en ny sorts block, t.ex. en övning (fn(data, ctx) → element)
 *   Bok.figur(namn, fn)      en ny sorts figur (fn(data) → SVG-text eller {svg, beskrivning}), se figurer.js
 *
 * Fungerar direkt från disken (file://), utan server. Se Fysik/README.md. */
(function () {
  'use strict';

  // Målskärmen är en Chromebook på 13–14 tum med 1366 × 768 (i webbläsaren ca 1366 × 633). Där är höjden det som
  // begränsar, så sidan får bli bredare än en vanlig boksida (upp till KVOT_MAX) när det finns plats i sidled.
  const KVOT = 0.8, KVOT_MIN = 0.72, KVOT_MAX = 0.92;   // sidans bredd / höjd: vanlig, smalast och bredast
  // Textstorleken. Uppmätt 2026-10-31 med Bok.matSidor i ?kontroll: den största text där alla sidor i Materia får plats
  // är 0,0329 × sidhöjden vid sidformatet 0,9 och följer (format / 0,9)^0,45 för smalare sidor (0,0292 vid 0,7).
  // 0,0322 ger 2 % marginal. Tätaste sidan styr: en tätare sida delas, textstorleken ändras inte för den.
  const TEXT_PER_HOJD = 0.0322, TEXT_BREDD_EXP = 0.45;
  const UPPSLAG_MIN_B = 760, UPPSLAG_MIN_H = 480, UPPSLAG_MIN_KVOT = 1.2;
  const MARGINAL = 88, PAD = 8;               // bredvid boken: pilarna och de tysta reglagen
  const MOBIL = '(max-width: 599px)';         // samma gräns som i bok.css
  // Kontrolläget mäter alltid målskärmen, oavsett vilken dator det körs på.
  const MALSKARMAR = [['Chromebook i fönstret', 1366, 633], ['Chromebook i helskärm', 1366, 768]];
  // Ett svep som börjar här bläddrar inte (fält och sådant som eleven drar i). Ett svep över en knapp bläddrar,
  // och klicket som följer på svepet tas bort.
  const INTERAKTIVT = 'input, textarea, select, [contenteditable], [data-ingen-svep]';
  // Plattformens nivåer och standardhjälpmedel. Delkapitlet kan lägga till (t.ex. djupdykning) och byta namn i data.
  const NIVAER = [{ id: 'enkel', namn: 'Enkel', ikon: '📗' }, { id: 'standard', namn: 'Standard', ikon: '📘' },
    { id: 'fordjupning', namn: 'Fördjupning', ikon: '📕' }];
  const HJALPMEDEL = [['forelasning', 'Föreläsning'], ['ova', 'Öva'], ['sjalvskattning', 'Självskattning'],
    ['begreppslista', 'Begreppslista'], ['elevbok', 'Elevbok']];
  // Delkapitelsidans flikar, som i plattformens andra böcker: [flik, namn, hjälpmedlet den visar]. Läs är boken.
  const FLIKAR = [['forelasning', 'Föreläsning', 'forelasning'], ['laes', 'Läs', null], ['ova', 'Öva', 'ova'],
    ['elevboken', 'Elevboken', 'elevbok']];

  const blocktyper = {}, figurer = {}, nivadata = {}, bocker = {}, problem = [];
  let info, nivaId = null, sidor = [], nr = 1, uppslag = false, smal = false, oppen = false, kontroll = false;
  let tillbaka = null, vandning = 'snabb', helskarm = true, reglage = 'alltid', vilaTimer = null;
  let fokusEfter = null, panelFran = null, senasteEsc = 0;
  const ui = {};

  /* ---------- Hjälpfunktioner ---------- */

  function h(tag, attr, ...barn) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attr || {})) {
      if (v == null || v === false) continue;
      if (k === 'html') e.innerHTML = v;
      else if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const b of barn.flat(Infinity)) {
      if (b != null && b !== false) e.append(b.nodeType ? b : document.createTextNode(String(b)));
    }
    return e;
  }

  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Textens enda markering: *begrepp* (betonat, djupblått), *böjd form|grundform* när begreppet står böjt,
  // [[täljare|nämnare]] (bråk) och <sub>/<sup>. Har delkapitlet en begreppslista blir varje begrepp en länk dit.
  function inline(s, lankar = true) {
    return esc(s)
      .replace(/&lt;(\/?)(sub|sup)&gt;/g, '<$1$2>')
      .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g,
        '<span class="brak"><span class="brak-t">$1</span><span class="brak-n">$2</span></span>')
      .replace(/\*([^*|]+)(?:\|([^*]+))?\*/g, (_, text, grund) => {
        const url = lankar && hjalpmedelUrl('begreppslista', { begrepp: (grund || text).trim().toLowerCase() });
        return url ? `<a class="begrepp" href="${esc(url)}" data-hjalpmedel="begreppslista">${text}</a>`
          : `<strong class="begrepp">${text}</strong>`;
      });
  }
  const renText = s => String(s || '').replace(/\*([^*|]+)(?:\|[^*]+)?\*/g, '$1').replace(/<\/?su[bp]>/g, '');

  const lager = {
    hamta(k, standard) {
      try { const v = localStorage.getItem(k); return v === null ? standard : JSON.parse(v); } catch (e) { return standard; }
    },
    spara(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privat läge: inget sparas */ } }
  };
  const nyckel = k => `bok:${info.id}:${k}`;
  const minskadRorelse = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const anmal = text => { problem.push(text); console.warn('Bok:', text); };

  /* ---------- Hjälpmedlen: plattformens, länkade – aldrig byggda här ---------- */

  function hjalpmedel() {
    const data = info.hjalpmedel || {};
    const ids = HJALPMEDEL.map(([id]) => id).concat(Object.keys(data).filter(id => !HJALPMEDEL.some(([k]) => k === id)));
    return ids.map(id => ({
      id, namn: (data[id] && data[id].namn) || (HJALPMEDEL.find(([k]) => k === id) || [id, id])[1],
      href: (data[id] && data[id].href) || null
    }));
  }
  const hjalpmedelNamn = id => (hjalpmedel().find(x => x.id === id) || { namn: id }).namn;
  // {begrepp}, {avsnitt} och {niva} i adressen fylls i där länken står.
  function hjalpmedelUrl(id, varden = {}) {
    const hm = info && info.hjalpmedel && info.hjalpmedel[id];
    if (!hm || !hm.href) return null;
    const v = Object.assign({ niva: nivaId }, varden);
    return hm.href.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(v[k] == null ? '' : v[k]));
  }
  // Inifrån boken öppnas hjälpmedlet inbäddat (plattformens ?embed=1), så att eleven behåller sidan och helskärmen.
  function medEmbed(url) {
    const i = url.indexOf('#'), bas = i < 0 ? url : url.slice(0, i), hash = i < 0 ? '' : url.slice(i);
    return bas + (bas.includes('?') ? '&' : '?') + 'embed=1' + hash;
  }

  /* ---------- Blocktyper ---------- */

  const lista = p => h('ul', { class: 'b-punkter' }, p.map(x => h('li', { html: inline(x) })));

  blocktyper.text = d => h('p', { class: 'b-text', html: inline(d.text) });
  blocktyper.rubrik = d => h('h3', { class: 'b-rubrik', html: inline(d.text) });
  blocktyper.punkter = d => lista(d.punkter);
  blocktyper.ruta = d => h('aside', { class: 'b-ruta' + (d.stil ? ' b-ruta-' + d.stil : '') },
    d.rubrik && h('h4', { html: inline(d.rubrik) }),
    d.text && h('p', { html: inline(d.text) }),
    d.punkter && lista(d.punkter));
  blocktyper.jamforelse = d => h('div', { class: 'b-jamforelse' },
    d.kolumner.map(k => h('section', null, h('h4', { html: inline(k.rubrik) }), lista(k.punkter))));
  blocktyper.formel = d => h('div', { class: 'b-formel' },
    h('div', { class: 'formel-uttryck', html: inline(d.uttryck) }),
    d.forklaring && h('dl', null, d.forklaring.map(([t, f]) => [h('dt', { html: inline(t) }), h('dd', { html: inline(f) })])));
  blocktyper.exempel = d => h('div', { class: 'b-exempel' },
    h('h4', null, d.rubrik || 'Exempel'), d.rader.map(r => h('p', { html: inline(r) })));
  blocktyper.tabell = d => h('div', { class: 'b-tabell' },
    h('table', null,
      d.rubriker && h('thead', null, h('tr', null, d.rubriker.map(r => h('th', { scope: 'col', html: inline(r) })))),
      h('tbody', null, d.rader.map(rad => h('tr', null,
        rad.map((c, i) => h(i ? 'td' : 'th', { scope: i ? null : 'row', html: inline(c) })))))),
    d.fotnot && h('p', { class: 'tabell-fotnot', html: inline(d.fotnot) }));
  // Figuren specificeras i data och ritas av motorn (figurer.js). Saknas den syns en markering, och ?kontroll säger till.
  blocktyper.figur = d => {
    const f = figurer[d.namn];
    if (!f) return h('figure', { class: 'b-figur' }, h('div', { class: 'figur-saknas' }, `Figuren ”${d.namn}” finns inte (bokskal/figurer.js)`));
    const r = f(d), svg = typeof r === 'string' ? r : r.svg;
    return h('figure', { class: 'b-figur' },
      h('div', { class: 'figur-bild', role: 'img', 'aria-label': d.beskrivning || r.beskrivning || renText(d.bildtext) || d.namn, html: svg }),
      d.bildtext && h('figcaption', { html: inline(d.bildtext) }));
  };
  // Länken ut till plattformens hjälpmedel, t.ex. i slutet av ett avsnitt: {typ: 'lank', till: ['ova', 'sjalvskattning']}.
  // Den står alltid på sin plats, så att sidan rymmer den redan innan hjälpmedlet finns; utan adress är den tonad.
  blocktyper.lank = (d, ctx) => h('nav', { class: 'b-lank', 'aria-label': 'Hjälpmedel' }, [].concat(d.till || []).map(id => {
    const namn = hjalpmedelNamn(id), url = hjalpmedelUrl(id, { avsnitt: ctx.avsnitt });
    return url
      ? h('a', { class: 'lank-post', href: url, 'data-hjalpmedel': id }, namn, h('span', { class: 'lank-pil', 'aria-hidden': 'true' }, ' →'))
      : h('span', { class: 'lank-post kommer', 'aria-disabled': 'true' }, namn, h('span', { class: 'kommer-chip' }, 'kommer'));
  }));

  function blockElement(b, s, i) {
    const typ = blocktyper[b.typ];
    if (!typ) return h('div', { class: 'block-okand' }, `Okänd blocktyp: ${b.typ}`);
    const id = b.id || `${s.avsnitt.id}-${s.index + 1}-${i + 1}`;
    const k = n => nyckel(`${s.niva}:${id}:${n}`);
    // ctx: det ett interaktivt block behöver. Sidans element byggs en gång per nivå och sparas, så det som eleven
    // gör ligger kvar vid bläddring fram och tillbaka; hamta/spara behåller det också mellan lektionerna.
    const ctx = {
      sida: s.nr, avsnitt: s.avsnitt.id, niva: s.niva, blockId: id, h, inline,
      hamta: (n, standard) => lager.hamta(k(n), standard),
      spara: (n, v) => lager.spara(k(n), v),
      vidVisning: fn => s.vidVisning.push(fn)       // fn() körs varje gång sidan visas
    };
    try { return typ(b, ctx); } catch (e) {
      anmal(`sida ${s.nr}: blocket ${b.typ}${b.namn ? ' ”' + b.namn + '”' : ''} kunde inte ritas – ${e.message}`);
      return h('div', { class: 'block-okand' }, `Blocket ”${b.typ}” kunde inte ritas: ${e.message}`);
    }
  }

  /* ---------- Innehåll → böcker och sidor (en självbärande bok per nivå) ---------- */

  function normalisera(id, data) {
    if (!data || !Array.isArray(data.avsnitt)) throw new Error(`innehall/${id}.js: Bok.niva('${id}', {avsnitt: [...]}) saknar avsnitt`);
    let n = 0;
    data.avsnitt.forEach((a, i) => {
      if (!a.id) a.id = 'avsnitt-' + (i + 1);
      a.nummer = a.numrerad === false ? null : ++n;
      if (!a.sidor || !a.sidor.length) throw new Error(`innehall/${id}.js: avsnittet ”${a.titel}” har inga sidor`);
    });
    return data;
  }
  const harInnehall = id => !!(nivadata[id] && nivadata[id].avsnitt.length);
  const nivaNamn = id => (info.nivaer.find(n => n.id === id) || { namn: id }).namn;

  function byggBok(id) {
    if (bocker[id]) return bocker[id];
    const avsnitt = nivadata[id].avsnitt;
    const s = [{ typ: 'innehall', avsnitt: { id: 'innehall', titel: 'Innehåll', nummer: null }, data: { titel: 'Innehåll' }, index: 0 }];
    for (const a of avsnitt) a.sidor.forEach((data, i) => s.push({ avsnitt: a, data, index: i, forsta: i === 0 }));
    s.forEach((x, i) => { x.nr = i + 1; x.niva = id; x.vidVisning = []; });
    return (bocker[id] = { id, avsnitt, sidor: s });
  }
  const forstaSida = (bok, a) => bok.sidor.find(s => s.avsnitt === a).nr;

  function satsNiva(id) {
    nivaId = id;
    sidor = byggBok(id).sidor;
    lager.spara(nyckel('niva'), id);
  }

  // Sidhuvudets text: avsnittets nummer och namn. Numret sätts i Garamond (span.nr), där 1 inte liknar ett I.
  const sidhuvud = s => s.typ === 'innehall' ? [info.titel, info.undertitel].filter(Boolean).join(' · ')
    : (s.avsnitt.nummer ? `${s.avsnitt.nummer} · ` : '') + (s.avsnitt.kort || s.avsnitt.titel);
  const sidhuvudNoder = s => s.typ !== 'innehall' && s.avsnitt.nummer
    ? [h('span', { class: 'nr' }, s.avsnitt.nummer), ' · ', s.avsnitt.kort || s.avsnitt.titel] : [sidhuvud(s)];

  function byggSida(s) {
    if (s.el) return s.el;
    const bok = bocker[s.niva], inne = h('div', { class: 'sidinnehall' }), fot = h('footer', { class: 'sidfot' });
    if (s.typ === 'innehall') inne.append(...innehallssida(bok));
    else {
      if (s.forsta && s.avsnitt.nummer) {
        inne.append(h('div', { class: 'avsnittsstart' },
          h('span', { class: 'avsnittsnr' }, s.avsnitt.nummer), h('h1', { html: inline(s.avsnitt.titel, false) })));
      }
      if (s.data.titel) inne.append(h('h2', { class: 'sidtitel', html: inline(s.data.titel, false) }));
      // Länken ut till hjälpmedlen står i sidans fot, var i sidan den än är skriven: en tyst rad under texten.
      (s.data.block || []).forEach((b, i) => (b.typ === 'lank' ? fot : inne).append(blockElement(b, s, i)));
    }
    if (s.nr === bok.sidor.length && info.upphov) inne.append(h('p', { class: 'upphov' }, `© ${info.upphov.ar} ${info.upphov.namn}`));
    inne.addEventListener('scroll', () => markeraMer(s), { passive: true });
    // Sidnumret står i sidhuvudets yttre hörn, som i en tryckt bok; foten är fri för länken till hjälpmedlen.
    s.el = h('article', { class: 'sida' + (s.typ === 'innehall' ? ' innehallssida' : '') + (fot.childNodes.length ? ' har-fot' : ''),
      'data-nr': s.nr, 'aria-label': `Sida ${s.nr}` },
      h('header', { class: 'sidhuvud' }, h('span', { class: 'sh-namn' }, sidhuvudNoder(s)), h('span', { class: 'sh-folio' }, s.nr)),
      inne,
      fot.childNodes.length > 0 && fot,
      h('div', { class: 'mer-hint', 'aria-hidden': 'true' }, '▾ mer längre ner på sidan'));
    return s.el;
  }

  function innehallssida(bok) {
    return [
      h('div', { class: 'titelblock' },
        info.overrad && h('p', { class: 'overrad' }, info.overrad),
        h('h1', { class: 'boktitel' }, info.titel, info.undertitel && h('span', { class: 'undertitel' }, info.undertitel))),
      h('h2', { class: 'innehall-rubrik' }, 'Innehåll'),
      innehallslista(bok)
    ];
  }

  function innehallslista(bok) {
    const tocKnapp = (till, klass, ...inne) => h('button', { type: 'button', class: 'toc-knapp ' + klass, 'data-till': till },
      inne, h('span', { class: 'toc-prickar', 'aria-hidden': 'true' }), h('span', { class: 'toc-sida' }, till));
    return h('ol', { class: 'toc' }, bok.avsnitt.map(a => {
      const egna = bok.sidor.filter(s => s.avsnitt === a);
      return h('li', null,
        tocKnapp(egna[0].nr, 'toc-a', h('span', { class: 'toc-nr' }, a.nummer || ''), h('span', { class: 'toc-titel', html: inline(a.titel, false) })),
        egna.length > 1 && h('ol', { class: 'toc-sidor' }, egna.map(s =>
          h('li', null, tocKnapp(s.nr, 'toc-s', h('span', { class: 'toc-titel', html: inline(s.data.titel || '', false) }))))));
    }));
  }

  /* ---------- Storlek: uppslag på dator, en sida i taget på mobil ---------- */

  // Sidans mått och textstorlek för en scen på B0 × H0. Samma uträkning på skärmen och i kontrolläget.
  function geometri(B0, H0, mobil) {
    const pad = mobil ? 0 : PAD, marginal = mobil ? 0 : MARGINAL;
    const B = B0 - 2 * pad - 2 * marginal, H = H0 - 2 * pad;
    const upp = !mobil && B >= UPPSLAG_MIN_B && H >= UPPSLAG_MIN_H && B / H >= UPPSLAG_MIN_KVOT;
    let sb, sh;
    // Sidan får hela höjden; är bredden det som begränsar blir sidan smalare (ned till KVOT_MIN) i stället för lägre.
    if (upp) { sh = Math.min(H, B / 2 / KVOT_MIN); sb = Math.min(B / 2, sh * KVOT_MAX); }
    else if (mobil) { sb = B; sh = H; }
    else { sh = H; sb = Math.min(B, Math.max(sh * KVOT, 640)); }
    // Textstorleken följer sidans höjd och format (se TEXT_PER_HOJD), så att en sida rymmer lika mycket i alla
    // storlekar. Bara vid taket (26 px) eller golvet (15 px) kan en sida behöva rullas.
    const format = Math.pow(Math.min(sb / sh, 0.9) / 0.9, TEXT_BREDD_EXP);
    const fs = mobil ? 16.5 : Math.max(15, Math.min(26, TEXT_PER_HOJD * sh * format));
    return { sb, sh, fs, uppslag: upp };
  }
  function sattStorlek(el, g) {
    el.style.setProperty('--sb', g.sb.toFixed(1) + 'px');
    el.style.setProperty('--sh', g.sh.toFixed(1) + 'px');
    el.style.setProperty('--fs', g.fs.toFixed(2) + 'px');
  }

  function layout() {
    smal = matchMedia(MOBIL).matches;
    ui.app.classList.toggle('smal', smal);
    (smal ? ui.toppNiva : ui.lasHoger).append(ui.niva);
    const r = ui.scen.getBoundingClientRect();
    const g = geometri(r.width, r.height, smal);
    uppslag = g.uppslag;
    sattStorlek(ui.scen, g);
    ui.lasRemsa.style.width = Math.round((uppslag ? 2 : 1) * g.sb) + 'px';
    // Innehållsförteckningen ska alltid rymmas på sida 1, också när avsnitt läggs till (passaInnehall).
    const e = byggSida(sidor[0]);
    if (ui.scen.contains(e)) passaInnehall(e);
    else { const m = h('div', { class: 'matning' }, e); ui.scen.append(m); passaInnehall(e); m.remove(); }
  }

  // Bara innehållsförteckningen krymper sin text (ned till 70 %) tills den får plats. Alla andra sidor har bokens storlek.
  function passaInnehall(e) {
    const inne = e.querySelector('.sidinnehall');
    let skala = 1;
    e.style.setProperty('--toc-skala', 1);
    while (skala > 0.7 && inne.scrollHeight - inne.clientHeight > 1) {
      skala = Math.round((skala - 0.025) * 1000) / 1000;
      e.style.setProperty('--toc-skala', skala);
    }
  }

  /* ---------- Visa och bläddra ---------- */

  function synliga(n) {
    if (!uppslag) return [n];
    const v = n % 2 ? n : n - 1;                 // udda sidor till vänster: 1–2, 3–4, …
    return v + 1 <= sidor.length ? [v, v + 1] : [v];
  }

  function rita(riktning) {
    const vis = synliga(nr);
    const u = h('div', { class: 'uppslag ' + (uppslag ? 'ar-uppslag' : 'ar-enkel') + (smal ? ' smal' : '') });
    vis.forEach((n, i) => {
      const e = byggSida(sidor[n - 1]);
      e.classList.toggle('vanstersida', uppslag && i === 0);
      e.classList.toggle('hogersida', uppslag && i === 1);
      u.append(e);
    });
    if (uppslag && vis.length === 1) u.append(h('div', { class: 'sida hogersida tom-sida', 'aria-hidden': 'true' }));
    if (riktning && vandning === 'snabb' && !minskadRorelse()) u.classList.add(riktning > 0 ? 'in-framat' : 'in-bakat');
    ui.scen.replaceChildren(u);
    if (riktning !== null) vis.forEach(n => { sidor[n - 1].el.querySelector('.sidinnehall').scrollTop = 0; });
    requestAnimationFrame(() => vis.forEach(n => markeraMer(sidor[n - 1])));
    uppdateraLage(vis, riktning !== null);
  }

  function uppdateraLage(vis, nyttLage) {
    const forsta = sidor[vis[0] - 1], sista = sidor[vis[vis.length - 1] - 1];
    const olika = vis.map(n => sidor[n - 1]).filter((s, i, a) => !i || sidhuvud(s) !== sidhuvud(a[i - 1]));
    const sidor_ = vis.length > 1 ? `Sida ${vis[0]}–${vis[1]}` : `Sida ${vis[0]}`, sidtext = `${sidor_} av ${sidor.length}`;
    ui.position.replaceChildren(h('span', { class: 'pos-avsnitt' }, olika.map((s, i) => [i ? ' / ' : '', sidhuvudNoder(s)])),
      h('span', { class: 'pos-skiljetecken' }, ' · '), h('span', { class: 'pos-sida' }, sidtext));
    ui.lasSidtext.replaceChildren(h('span', null, sidor_), h('span', null, `av ${sidor.length}`));
    ui.lasRemsa.querySelectorAll('.lr-sida').forEach(d => d.classList.toggle('synlig', vis.includes(+d.dataset.nr)));
    ui.bak.disabled = ui.pilBak.disabled = forsta.nr === 1;
    ui.fram.disabled = ui.pilFram.disabled = sista.nr === sidor.length;
    if (tillbaka && vis.includes(tillbaka)) tillbaka = null;
    ui.chipar.forEach(c => { c.hidden = !tillbaka; if (tillbaka) c.textContent = `↩ Tillbaka till sida ${tillbaka}`; });
    ui.position.hidden = !!tillbaka;
    lager.spara(nyckel(nivaId + ':sida'), nr);
    if (nyttLage) {
      ui.meddela.textContent = `${sidtext}. ${olika.map(sidhuvud).join(' / ')}.`;
      vis.forEach(n => sidor[n - 1].vidVisning.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }));
    }
  }

  // Sidan får inte plats: den kan rullas, och en svag toning och en rad längst ner säger att det finns mer.
  function markeraMer(s) {
    const inne = s.el && s.el.querySelector('.sidinnehall');
    if (!inne) return;
    s.el.classList.toggle('har-mer', inne.scrollTop + inne.clientHeight < inne.scrollHeight - 4);
  }

  // hopp: via innehållet. Då kommer "Tillbaka till sida x". Ett hopp från innehållssidan (sida 1) behåller ett
  // tidigare "tillbaka": eleven gick dit för att hitta något annat. Boken är en enda post i webbläsarens historik,
  // så att bakåt alltid leder tillbaka till delkapitlet; adressen följer med sidan (#sida-7).
  function gaTill(n, { hopp = false, minnas = hopp } = {}) {
    n = Math.max(1, Math.min(sidor.length, n | 0 || 1));
    const fore = synliga(nr)[0], efter = synliga(n)[0];
    if (minnas && efter !== fore && !(fore === 1 && tillbaka)) tillbaka = nr;
    nr = n;
    history.replaceState({ bok: true }, '', '#sida-' + n);
    rita(Math.sign(efter - fore));
  }
  const bladdra = steg => { const v = synliga(nr); gaTill(steg > 0 ? v[v.length - 1] + 1 : v[0] - 1); };
  const sidaIAdressen = () => { const m = location.hash.match(/^#sida-(\d+)$/); return m ? +m[1] : null; };
  const utanHash = () => location.pathname + location.search;

  /* ---------- Hubben: delkapitlets sida, som plattformens avsnittssida ---------- */

  // Skalet och klassnamnen är plattformens (geografiboken: delkapitel/geologi/avsnitt-2-plattektonik.html), så att
  // fysiken ser ut som de andra böckerna. Det enda som skiljer: Läs visar inte texten på sidan – en text öppnar boken.
  const romersk = n => [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].reduce((s, [v, t]) => {
    while (n >= v) { s += t; n -= v; } return s; }, '');
  const delkapitelNamn = () => (info.nummer ? info.nummer + '. ' : '') + info.titel;
  const iHubben = e => ui.hubb.some(d => d.contains(e));

  function byggHubb() {
    const smulor = (info.smulor || []).map(x => typeof x === 'string' ? { text: x } : x);
    // Flikarna: Läs är boken, de andra är plattformens hjälpmedel. Utan adress är fliken tonad och "kommer".
    ui.flikar = FLIKAR.map(([id, namn, hm]) => {
      const kommer = !!hm && !hjalpmedelUrl(hm);
      return h('button', { type: 'button', class: 'flik' + (id === 'laes' ? ' aktiv' : ''), 'data-flik': id, role: 'tab',
        'aria-selected': String(id === 'laes'), 'aria-disabled': kommer ? 'true' : null, title: kommer ? `${namn} – kommer` : null,
        onclick: () => { if (!kommer) visaFlik(id); } }, namn);
    });
    ui.texter = h('div', { class: 'underdel-valjare', role: 'group', 'aria-label': 'Textval' });
    ui.nivaval = h('div', { class: 'niva-valjare', role: 'group', 'aria-label': 'Textnivå' });
    ui.lasLage = h('p', { class: 'intro' });
    ui.flikInnehall = FLIKAR.map(([id, namn]) => h('section', { class: 'flik-innehall' + (id === 'laes' ? '' : ' dold'),
      'data-flik': id, role: 'tabpanel', 'aria-label': namn }, id === 'laes' && [ui.texter, ui.nivaval, ui.lasLage]));
    const hero = h('header', { class: 'hero-banner' },
      h('div', { class: 'hero-inner' },
        h('nav', { class: 'brodsmulor', 'aria-label': 'Brödsmulor' },
          smulor.map(x => [x.href ? h('a', { href: x.href }, x.text) : h('span', null, x.text),
            h('span', { class: 'skiljare', 'aria-hidden': 'true' }, '›')]),
          h('span', { class: 'aktuell', 'aria-current': 'page' },                // numret i Garamond: 1 liknar inte I
            info.nummer && [h('span', { class: 'nr' }, info.nummer), '. '], info.titel)),
        info.nummer && h('span', { class: 'avsnitt-label' }, 'Avsnitt ' + romersk(info.nummer)),
        h('h1', null, info.titel),
        info.undertitel && h('p', { class: 'subtitel' }, `— ${info.undertitel} —`)));
    const sida = h('main', { class: 'sida' },
      h('div', { class: 'flikar-rad', role: 'tablist' }, ui.flikar),
      ui.flikInnehall,
      info.upphov && h('p', { class: 'footnote' }, `© ${info.upphov.ar} ${info.upphov.namn}`));
    ui.hubb = [hero, sida];
    document.body.append(hero, sida);
  }

  // En hjälpmedelsflik visar plattformens hjälpmedel inbäddat (?embed=1), laddat första gången fliken väljs.
  function visaFlik(id) {
    ui.flikar.forEach(f => { const pa = f.dataset.flik === id; f.classList.toggle('aktiv', pa); f.setAttribute('aria-selected', String(pa)); });
    ui.flikInnehall.forEach(s => s.classList.toggle('dold', s.dataset.flik !== id));
    const [, namn, hm] = FLIKAR.find(f => f[0] === id), sek = ui.flikInnehall.find(s => s.dataset.flik === id);
    if (hm && !sek.querySelector('iframe')) sek.append(h('iframe', { class: 'flik-ram', title: namn, src: medEmbed(hjalpmedelUrl(hm)) }));
  }

  // Texterna är bokens numrerade avsnitt (A, B …); Inledning och Sammanfattning ligger i boken runt dem. Texten där
  // eleven är markeras och öppnar boken på sidan eleven var på; de andra öppnar boken där texten börjar.
  function ritaHubb() {
    ui.nivaval.replaceChildren(...info.nivaer.map(n => {
      const har = harInnehall(n.id);
      return h('button', { type: 'button', class: 'niva-knapp' + (n.id === nivaId ? ' aktiv' : ''), 'data-niva': n.id,
        'aria-pressed': String(n.id === nivaId), 'aria-disabled': har ? null : 'true', title: har ? null : `${n.namn} – kommer`,
        onclick: () => { if (har && n.id !== nivaId) { satsNiva(n.id); ritaHubb(); } } },
        n.ikon ? `${n.ikon} ${n.namn}` : n.namn);
    }));
    ui.texter.hidden = !nivaId;
    if (!nivaId) { ui.lasLage.textContent = 'Texterna kommer.'; return; }
    const bok = byggBok(nivaId), numrerade = bok.avsnitt.filter(a => a.nummer);
    const texter = numrerade.length ? numrerade : bok.avsnitt;
    const start = texter.map(a => forstaSida(bok, a));
    const sparad = lager.hamta(nyckel(nivaId + ':sida'), 0), minns = sparad > 1 && sparad <= bok.sidor.length;
    const har = Math.max(0, start.filter(s => s <= sparad).length - 1);   // texten där eleven är (före A: A)
    ui.texter.replaceChildren(...texter.map((a, i) => {
      const bokstav = String.fromCharCode(97 + i), dar = i === har;
      const oppna = dar && minns && sparad >= start[i] ? sparad : start[i];
      return h('button', { type: 'button', class: 'underdel-knapp' + (dar ? ' aktiv' : ''), 'data-underdel': bokstav,
        'data-oppna': oppna, 'data-fokus': 'text-' + bokstav, 'aria-current': dar ? 'true' : null },
        h('span', { class: 'underdel-bokstav' }, bokstav.toUpperCase()), h('span', { class: 'underdel-titel', html: inline(a.titel, false) }));
    }));
    ui.lasLage.textContent = (minns ? `Du läste senast sida ${sparad} av ${bok.sidor.length}. ` : '') + 'Välj en text så öppnas boken.';
  }

  /* ---------- Boken: öppna och stäng ---------- */

  // Öppnas av ett tryck i hubben, eller när adressen pekar på en sida (#sida-7). Helskärm om inställningen säger så
  // och trycket tillåter det. Boken läggs som en egen post i historiken, så att bakåt stänger den.
  function oppnaBok(n, { historik = false } = {}) {
    if (oppen || !nivaId) return;
    oppen = true;
    satsNiva(nivaId);
    byggRemsa(); ritaNivaval();
    ui.app.hidden = false;
    ui.hubb.forEach(d => { d.inert = true; });
    document.body.classList.add('bok-oppen');
    if (!historik) history.pushState({ bok: true }, '', '#sida-' + n);
    const rot = document.documentElement, gest = !navigator.userActivation || navigator.userActivation.isActive;
    if (helskarm && gest && rot.requestFullscreen && !document.fullscreenElement) rot.requestFullscreen().catch(() => {});
    tillbaka = null;
    vakna();
    layout();
    nr = Math.max(1, Math.min(sidor.length, n | 0 || 1));
    history.replaceState({ bok: true }, '', '#sida-' + nr);
    rita(0);
    ui.scen.focus({ preventScroll: true });
    ui.meddela.textContent = `${info.titel}, ${nivaNamn(nivaId)}. Esc stänger boken.`;
  }

  // ✕ Stäng och Esc går samma väg som webbläsarens bakåt: boken tas bort ur historiken.
  function stangBok() {
    if (!oppen) return;
    if (history.state && history.state.bok) history.back();     // → popstate → stangBokNu
    else { stangBokNu(); history.replaceState(null, '', utanHash()); }
  }
  function stangBokNu() {
    if (!oppen) return;
    oppen = false;
    stangMeny(false); stangPanel(false); visaNivaLista(false);
    clearTimeout(vilaTimer);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    ui.app.hidden = true;
    ui.app.classList.remove('vila');
    ui.hubb.forEach(d => { d.inert = false; });
    document.body.classList.remove('bok-oppen');
    ritaHubb();                                                  // texten där eleven är, och sidan
    const f = fokusEfter && ui.texter.querySelector(`[data-fokus="${fokusEfter}"]`);
    (f || ui.texter.querySelector('[data-oppna]') || ui.hubb[1]).focus({ preventScroll: !f });
  }

  // Esc: det översta lagret stängs först (hjälpmedel, nivålistan, menyn), sist boken. I helskärm tar webbläsaren Esc
  // själv och lämnar helskärmen; det räknas som samma Esc.
  function esc_() {
    senasteEsc = Date.now();
    if (!ui.panel.hidden) stangPanel();
    else if (!ui.nivaLista.hidden) { visaNivaLista(false); ui.nivaKnapp.focus(); }
    else if (!ui.meny.hidden) stangMeny();
    else stangBok();
  }

  /* ---------- Gränssnittet runt boken ---------- */

  function byggBokram() {
    ui.scen = h('main', { class: 'scen', tabindex: '-1', 'aria-label': 'Boken' });
    ui.bak = h('button', { type: 'button', class: 'knapp', 'aria-label': 'Föregående sida', onclick: () => bladdra(-1) }, '‹');
    ui.fram = h('button', { type: 'button', class: 'knapp', 'aria-label': 'Nästa sida', onclick: () => bladdra(1) }, '›');
    ui.position = h('div', { class: 'position', 'aria-hidden': 'true' });
    ui.pilBak = h('button', { type: 'button', class: 'sidpil sidpil-bak', 'aria-label': 'Föregående sida', onclick: () => bladdra(-1) }, '‹');
    ui.pilFram = h('button', { type: 'button', class: 'sidpil sidpil-fram', 'aria-label': 'Nästa sida', onclick: () => bladdra(1) }, '›');
    // "Tillbaka till sida x" efter ett hopp: i vänstermarginalen på dator, i stället för sidpositionen på mobil.
    const tillbakaKnapp = () => h('button', { type: 'button', class: 'tillbaka-chip', hidden: true,
      onclick: () => { const t = tillbaka; tillbaka = null; gaTill(t, { hopp: true, minnas: false }); } });
    ui.chipar = [tillbakaKnapp(), tillbakaKnapp()];
    ui.meddela = h('div', { class: 'sr-only', 'aria-live': 'polite' });

    // Nivåknappen: liten och tyst, med de andra nivåerna i en lista. Nivåer utan innehåll är märkta "kommer".
    ui.nivaKnapp = h('button', { type: 'button', class: 'niva-knapp', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      onclick: () => visaNivaLista(ui.nivaLista.hidden) });
    ui.nivaLista = h('div', { class: 'niva-lista', role: 'menu', hidden: true });
    ui.niva = h('div', { class: 'niva' }, ui.nivaKnapp, ui.nivaLista);

    const stangKnapp = klass => h('button', { type: 'button', class: klass + ' bok-stang', title: 'Tillbaka till delkapitlet (Esc)',
      onclick: stangBok }, h('span', { class: 'las-x', 'aria-hidden': 'true' }, '✕'), 'Stäng');
    const innehallKnapp = klass => h('button', { type: 'button', class: klass + ' bok-innehall', 'aria-haspopup': 'dialog',
      onclick: oppnaMeny }, h('span', { class: 'las-x', 'aria-hidden': 'true' }, '☰'), 'Innehåll');
    ui.innehall = [innehallKnapp('las-knapp'), innehallKnapp('knapp')];

    ui.menyLista = h('nav', { 'aria-label': 'Innehåll' });
    ui.val = [
      valGrupp('Sidvändning', [['snabb', 'Snabb'], ['direkt', 'Direkt']], () => vandning,
        v => { vandning = v; lager.spara(nyckel('vandning'), v); }),
      valGrupp('Boken öppnas', [['ja', 'I helskärm'], ['nej', 'I fönstret']], () => helskarm ? 'ja' : 'nej',
        v => { helskarm = v === 'ja'; lager.spara(nyckel('lashelskarm'), helskarm); }),
      valGrupp('Sidnummer och remsa', [['alltid', 'Syns alltid'], ['rorelse', 'Vid musrörelse']], () => reglage,
        v => { reglage = v; lager.spara(nyckel('lasreglage'), v); vakna(); })
    ];
    ui.meny = h('div', { class: 'meny', hidden: true, onclick: e => { if (e.target === ui.meny) stangMeny(); } },
      h('div', { class: 'meny-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Innehåll' },
        h('div', { class: 'meny-huvud' }, h('h2', null, 'Innehåll'),
          h('button', { type: 'button', class: 'stang', onclick: () => stangMeny() }, 'Stäng')),
        ui.menyLista,
        h('section', { class: 'installningar' },
          h('h3', null, 'Sidvändning'), ui.val[0],
          h('h3', null, 'Boken öppnas'), ui.val[1],
          h('h3', { class: 'underrubrik' }, 'Sidnummer och remsa'), ui.val[2],
          h('p', { class: 'tangenter' }, 'Bläddra med pilarna bredvid boken, med ← och → på tangentbordet eller genom att svepa. Esc eller Stäng tar dig tillbaka till delkapitlet.'))));

    // Ett hjälpmedel som öppnas inifrån boken (ett begrepp, Öva i slutet av ett avsnitt) läggs ovanpå boken.
    ui.panelRubrik = h('h2', { id: 'hm-rubrik' });
    ui.panelFlik = h('a', { class: 'hm-flik', target: '_blank', rel: 'noopener' }, 'Öppna i egen flik ↗');
    ui.panelRam = h('iframe', { class: 'hm-ram', title: '' });
    ui.panelStang = h('button', { type: 'button', class: 'stang', onclick: () => stangPanel() }, 'Tillbaka till boken');
    ui.panel = h('div', { class: 'hm-panel', hidden: true, onclick: e => { if (e.target === ui.panel) stangPanel(); } },
      h('div', { class: 'hm-ruta', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'hm-rubrik' },
        h('div', { class: 'hm-huvud' }, ui.panelRubrik, ui.panelFlik, ui.panelStang), ui.panelRam));

    // Dator: bara boken, och reglagen tysta i marginalerna bredvid den (de tar ingen höjd från sidorna).
    ui.lasSidtext = h('div', { class: 'las-sidtext', 'aria-hidden': 'true' });
    ui.lasRemsa = h('div', { class: 'las-remsa las-reglage', 'aria-hidden': 'true' });
    ui.lasHoger = h('div', { class: 'las-kolumn las-hoger las-reglage' });     // nivåknappen
    ui.lasVanster = h('div', { class: 'las-kolumn las-vanster las-reglage' },
      h('div', { class: 'las-topp' }, stangKnapp('las-knapp'), ui.innehall[0]),
      h('div', { class: 'las-botten' }, ui.chipar[1], ui.lasSidtext));
    ui.scenRam = h('div', { class: 'scen-ram' }, ui.scen, ui.pilBak, ui.pilFram, ui.lasVanster, ui.lasHoger, ui.lasRemsa);
    // Mobil: en list överst (Stäng, nivå, Innehåll) och bläddring längst ner.
    ui.toppNiva = h('div', { class: 'topp-niva' });

    ui.app = h('div', { class: 'bokapp', hidden: true, 'aria-label': [info.titel, info.undertitel].filter(Boolean).join(' – ') },
      h('header', { class: 'topplist' }, stangKnapp('knapp'), ui.toppNiva, ui.innehall[1]),
      ui.scenRam,
      h('footer', { class: 'bottenlist' }, ui.bak, h('div', { class: 'botten-mitt' }, ui.position, ui.chipar[0]), ui.fram),
      ui.meny, ui.panel, ui.meddela);
    document.body.append(ui.app);

    document.addEventListener('click', e => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      if (!oppen) {
        const o = t.closest('[data-oppna]');
        if (o && iHubben(o)) { fokusEfter = o.dataset.fokus; oppnaBok(+o.dataset.oppna); }
        return;
      }
      if (!ui.niva.contains(t)) visaNivaLista(false);
      const hm = t.closest('a[data-hjalpmedel]');
      if (hm) { e.preventDefault(); oppnaPanel(hm.dataset.hjalpmedel, hm.getAttribute('href'), hm); return; }
      const till = t.closest('[data-till]');
      if (!till) return;
      if (ui.meny.contains(till)) stangMeny(false);
      gaTill(+till.dataset.till, { hopp: true });
    });
    document.addEventListener('keydown', e => {
      if (!oppen) return;
      if (e.key === 'Escape') { e.preventDefault(); esc_(); return; }
      if (!ui.meny.hidden || !ui.panel.hidden || !ui.nivaLista.hidden) return;
      const mal = e.target instanceof Element ? e.target : null;
      if (e.altKey || e.ctrlKey || e.metaKey || (mal && mal.closest('input, textarea, select, [contenteditable], [data-egna-tangenter]'))) return;
      const k = { ArrowRight: () => bladdra(1), PageDown: () => bladdra(1), ArrowLeft: () => bladdra(-1),
        PageUp: () => bladdra(-1), Home: () => gaTill(1, { hopp: true }), End: () => gaTill(sidor.length, { hopp: true }) }[e.key];
      if (k) { e.preventDefault(); k(); }
    });
    let svep = null, svepTid = 0;
    ui.scen.addEventListener('click', e => {
      if (Date.now() - svepTid < 500) { e.stopPropagation(); e.preventDefault(); }
    }, true);
    ui.scen.addEventListener('pointerdown', e => {
      svep = e.pointerType !== 'mouse' && !(e.target instanceof Element && e.target.closest(INTERAKTIVT)) ? { x: e.clientX, y: e.clientY } : null;
    });
    ui.scen.addEventListener('pointercancel', () => { svep = null; });
    ui.scen.addEventListener('pointerup', e => {
      if (!svep) return;
      const dx = e.clientX - svep.x, dy = e.clientY - svep.y;
      svep = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > 1.6 * Math.abs(dy)) { svepTid = Date.now(); bladdra(dx < 0 ? 1 : -1); }
    });
    let vantar = false;
    window.addEventListener('resize', () => {
      if (vantar || !oppen) return;
      vantar = true;
      requestAnimationFrame(() => { vantar = false; if (oppen) { layout(); rita(null); } });
    });
    window.addEventListener('popstate', () => {
      const n = sidaIAdressen();
      if (n && !oppen) oppnaBok(n, { historik: true });
      else if (!n && oppen) stangBokNu();
    });
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && oppen && Date.now() - senasteEsc > 400) esc_();
    });
    document.addEventListener('pointermove', vakna, { passive: true });
    document.addEventListener('pointerdown', vakna, { passive: true });
  }

  function valGrupp(etikett, alternativ, nuvarande, valj) {
    const g = h('div', { class: 'val', role: 'group', 'aria-label': etikett });
    g.markera = () => g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === nuvarande())));
    alternativ.forEach(([v, text]) => g.append(h('button', { type: 'button', 'data-v': v, onclick: () => { valj(v); g.markera(); } }, text)));
    return g;
  }

  // "Vid musrörelse": reglagen tonar bort efter en stund utan rörelse och kommer tillbaka när musen rör sig eller
  // skärmen trycks på, som kontrollerna i en videospelare. Sidhuvudet med sidnumret ligger kvar på papperet.
  function vakna() {
    clearTimeout(vilaTimer);
    if (!ui.app) return;
    ui.app.classList.remove('vila');
    if (oppen && reglage === 'rorelse') vilaTimer = setTimeout(() => ui.app.classList.add('vila'), 2500);
  }

  function ritaNivaval() {
    ui.nivaKnapp.replaceChildren(h('span', null, nivaNamn(nivaId)), h('span', { class: 'niva-pil', 'aria-hidden': 'true' }, '▾'));
    ui.nivaKnapp.setAttribute('aria-label', `Nivå: ${nivaNamn(nivaId)}. Byt nivå`);
    ui.nivaLista.replaceChildren(...info.nivaer.map(n => {
      const har = harInnehall(n.id);
      return h('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(n.id === nivaId),
        'aria-disabled': har ? null : 'true',
        onclick: () => { if (!har) return; visaNivaLista(false); ui.nivaKnapp.focus(); if (n.id !== nivaId) bytNiva(n.id); } },
        n.namn, !har && h('span', { class: 'kommer-chip' }, 'kommer'));
    }));
  }
  function visaNivaLista(pa) {
    if (!ui.nivaLista || ui.nivaLista.hidden === !pa) return;
    ui.nivaLista.hidden = !pa;
    ui.nivaKnapp.setAttribute('aria-expanded', String(pa));
    if (pa) (ui.nivaLista.querySelector('[aria-checked="true"]') || ui.nivaLista.querySelector('button')).focus();
  }

  function byggRemsa() {
    const grupper = [];
    for (const s of sidor) {
      if (!grupper.length || grupper[grupper.length - 1].avsnitt !== s.avsnitt) grupper.push({ avsnitt: s.avsnitt, sidor: [] });
      grupper[grupper.length - 1].sidor.push(s);
    }
    // lägesremsan: en markering per sida, grupperad per avsnitt – bara att se, inte att klicka på
    ui.lasRemsa.replaceChildren(...grupper.map(g => h('div', { class: 'lr-grupp', style: `flex: ${g.sidor.length}` },
      g.sidor.map(s => h('div', { class: 'lr-sida', 'data-nr': s.nr })))));
  }

  function oppnaMeny() {
    visaNivaLista(false);
    ui.menyLista.replaceChildren(innehallslista(bocker[nivaId]));
    const vis = synliga(nr);
    ui.menyLista.querySelectorAll('.toc-s, .toc-a').forEach(b => {
      // varje synlig sida markeras en gång: underraden om avsnittet har flera sidor, annars avsnittsraden
      const egen = b.classList.contains('toc-s') || !b.parentElement.querySelector('.toc-sidor');
      if (egen && vis.includes(+b.dataset.till)) b.setAttribute('aria-current', 'page');
    });
    ui.val.forEach(g => g.markera());
    ui.meny.hidden = false;
    (ui.menyLista.querySelector('[aria-current]') || ui.menyLista.querySelector('button')).focus();
  }
  function stangMeny(fokus = true) {
    if (!ui.meny || ui.meny.hidden) return;
    ui.meny.hidden = true;
    if (fokus) ui.innehall[smal ? 1 : 0].focus();
  }

  // En ny ram varje gång, och den gamla tas bort när panelen stängs: en ram som byter adress lägger poster i
  // webbläsarens historik, och då skulle Stäng (som går bakåt) backa i hjälpmedlet i stället för att stänga boken.
  function bytRam(attr) {
    const ram = h('iframe', Object.assign({ class: 'hm-ram' }, attr));
    ui.panelRam.replaceWith(ram);
    ui.panelRam = ram;
  }
  function oppnaPanel(id, url, fran) {
    panelFran = fran || null;
    ui.panelRubrik.textContent = hjalpmedelNamn(id);
    ui.panelFlik.href = url;
    bytRam({ title: hjalpmedelNamn(id), src: medEmbed(url) });
    ui.panel.hidden = false;
    ui.panelStang.focus();
  }
  function stangPanel(fokus = true) {
    if (!ui.panel || ui.panel.hidden) return;
    ui.panel.hidden = true;
    bytRam({ title: '' });
    if (fokus && panelFran && document.contains(panelFran)) panelFran.focus();
  }

  function bytNiva(id) {
    const avsnitt = sidor[nr - 1].avsnitt.id;
    satsNiva(id);
    byggRemsa(); ritaNivaval();
    const samma = sidor.find(s => s.avsnitt.id === avsnitt);
    tillbaka = null;
    nr = samma ? samma.nr : 1;
    history.replaceState({ bok: true }, '', '#sida-' + nr);
    layout();
    rita(0);
    ui.meddela.textContent = `Nivå: ${nivaNamn(id)}.`;
  }

  /* ---------- Nivåfilerna: en per nivå, innehall/<nivå>.js. En tom fil ger en nivå som kommer. ---------- */

  function laddaNiva(n) {
    return new Promise(ok => {
      const fil = `innehall/${n.id}.js`;
      const s = h('script', { src: fil });
      s.onload = () => { if (!(n.id in nivadata)) anmal(`${fil} anropade inte Bok.niva('${n.id}', …)`); ok(); };
      s.onerror = () => { anmal(`${fil} saknas – varje nivå har en fil, också en tom`); ok(); };
      document.head.append(s);
    });
  }

  /* ---------- Kontrolläget: ?kontroll i adressen ---------- */

  // Mäter en bok i en given storlek, utanför skärmen, och returnerar de sidor som inte får plats.
  function matSidor(bok, g) {
    const vard = h('div', { class: 'matning' });
    sattStorlek(vard, g);
    document.body.append(vard);
    const for_stora = [];
    for (const s of bok.sidor) {
      const e = byggSida(s), plats = e.parentNode, nasta = e.nextSibling;
      e.classList.toggle('vanstersida', g.uppslag && s.nr % 2 === 1);
      e.classList.toggle('hogersida', g.uppslag && s.nr % 2 === 0);
      vard.append(e);
      if (s.typ === 'innehall') passaInnehall(e);
      const inne = e.querySelector('.sidinnehall'), over = inne.scrollHeight - inne.clientHeight;
      if (over > 1) for_stora.push({ sida: s.nr, px: over });
      if (plats) plats.insertBefore(e, nasta); else e.remove();
    }
    vard.remove();
    return for_stora;
  }

  // Det som motorn kan se i data men inte rita rätt: okända blocktyper och figurer, länkar till okända hjälpmedel, och
  // numrerade avsnitt som inte slutar med en länk till öva/självskattning (varning).
  function strukturkoll(bok, ut) {
    const ids = hjalpmedel().map(x => x.id);
    for (const s of bok.sidor) {
      (s.data.block || []).forEach(b => {
        if (!blocktyper[b.typ]) ut.problem.push(`${bok.id}, sida ${s.nr}: okänd blocktyp ”${b.typ}”`);
        if (b.typ === 'figur' && !figurer[b.namn]) ut.problem.push(`${bok.id}, sida ${s.nr}: figuren ”${b.namn}” finns inte`);
        if (b.typ === 'lank') [].concat(b.till || []).filter(id => !ids.includes(id))
          .forEach(id => ut.problem.push(`${bok.id}, sida ${s.nr}: länk till okänt hjälpmedel ”${id}”`));
      });
    }
    for (const a of bok.avsnitt) {
      if (!a.nummer) continue;
      const sista = a.sidor[a.sidor.length - 1].block || [];
      if (!sista.length || sista[sista.length - 1].typ !== 'lank') ut.varningar.push(`${bok.id}: avsnittet ”${a.titel}” slutar inte med en länk till hjälpmedlen`);
    }
  }

  function kontrollera() {
    const ut = { problem: problem.slice(), varningar: [], nivaer: {} };
    const storlekar = MALSKARMAR.slice();
    if (!matchMedia(MOBIL).matches) storlekar.push(['det här fönstret', innerWidth, innerHeight]);
    let antalForStora = 0;
    for (const n of info.nivaer) {
      if (!(n.id in nivadata)) { ut.nivaer[n.id] = 'saknas'; continue; }
      if (!harInnehall(n.id)) { ut.nivaer[n.id] = 'tom – kommer'; continue; }
      const bok = byggBok(n.id), matt = {};
      strukturkoll(bok, ut);
      for (const [namn, B, H] of storlekar) {
        const g = geometri(B, H, false), for_stora = matSidor(bok, g);
        antalForStora += for_stora.length;
        matt[namn] = { storlek: `${B}×${H}`, text: g.fs.toFixed(2) + ' px', uppslag: g.uppslag, for_stora };
      }
      ut.nivaer[n.id] = { sidor: bok.sidor.length, matt };
    }
    ut.gron = !ut.problem.length && !antalForStora;
    document.body.dataset.kontroll = JSON.stringify(ut);
    let p = document.querySelector('.kontrollpanel');
    if (!p) { p = h('div', { class: 'kontrollpanel' }); document.body.append(p); }
    p.classList.toggle('fel', !ut.gron);
    const rader = [];
    for (const [id, v] of Object.entries(ut.nivaer)) {
      if (typeof v === 'string') { rader.push(`${nivaNamn(id)}: ${v}`); continue; }
      rader.push(`${nivaNamn(id)}, ${v.sidor} sidor: ` + Object.entries(v.matt).map(([namn, m]) =>
        `${namn} (${m.storlek}, ${m.text}) ` + (m.for_stora.length ? 'får inte plats – ' + m.for_stora.map(f => `sida ${f.sida} (+${f.px} px)`).join(', ') : 'alla får plats')).join('; '));
    }
    p.replaceChildren(h('strong', null, 'Kontroll: '), ut.gron ? 'grönt' : 'rött',
      ...rader.map(r => h('div', null, r)),
      ...ut.problem.map(r => h('div', { class: 'kp-fel' }, r)),
      ...ut.varningar.map(r => h('div', { class: 'kp-varning' }, r)));
    if (oppen) { layout(); rita(null); }
  }

  function visaFel(e) {
    console.error(e);
    document.body.append(h('div', { class: 'felmeddelande' }, h('strong', null, 'Boken kunde inte visas. '), e.message));
  }

  /* ---------- Det som innehållet anropar ---------- */

  window.Bok = {
    delkapitel(uppgifter) {
      info = Object.assign({ nivaer: NIVAER, standardniva: 'standard' }, uppgifter);
      // som i plattformens andra böcker: "Fysik – Kraft och rörelse – 1. Repetition"
      const smulor = (info.smulor || [info.amne]).map(x => typeof x === 'string' ? x : x.text);
      document.title = smulor.concat(delkapitelNamn()).filter(Boolean).join(' – ');
      const adress = new URLSearchParams(location.search);
      kontroll = adress.has('kontroll');
      vandning = lager.hamta(nyckel('vandning'), 'snabb');
      helskarm = lager.hamta(nyckel('lashelskarm'), true);
      reglage = lager.hamta(nyckel('lasreglage'), 'alltid');
      byggHubb();
      byggBokram();
      Promise.all(info.nivaer.map(laddaNiva)).then(() => {
        const id = [adress.get('niva'), lager.hamta(nyckel('niva'), null), info.standardniva, ...info.nivaer.map(n => n.id)].find(x => x && harInnehall(x));
        if (id) satsNiva(id);
        ritaHubb();
        // En adress som pekar på en sida öppnar boken där. Hubben läggs under i historiken, så att Stäng och bakåt
        // leder dit och inte bort från delkapitlet.
        const n = sidaIAdressen();
        if (n && nivaId) { history.replaceState(null, '', utanHash()); oppnaBok(n); }
        if (kontroll) (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(kontrollera));
        document.body.dataset.klar = '1';
      }).catch(visaFel);
    },
    niva(id, data) {
      try { nivadata[id] = normalisera(id, data); } catch (e) { anmal(e.message); }
    },
    blocktyp(namn, fn) { blocktyper[namn] = fn; },
    figur(namn, fn) { figurer[namn] = fn; },
    get sida() { return nr; },
    get oppen() { return oppen; },
    // Bok.matSidor() mäter den öppna boken i sin storlek; Bok.matSidor({sb, sh, fs}) provar andra mått.
    matSidor(storlek) {
      if (!nivaId) return [];
      const g = storlek ? Object.assign({ uppslag }, storlek)
        : oppen ? Object.assign({ uppslag }, ...['sb', 'sh', 'fs'].map(k => ({ [k]: parseFloat(ui.scen.style.getPropertyValue('--' + k)) })))
          : geometri(MALSKARMAR[0][1], MALSKARMAR[0][2], false);
      const f = matSidor(bocker[nivaId], g);
      if (oppen) { layout(); rita(null); }
      return f;
    },
    gaTill: n => { if (oppen) gaTill(n, { hopp: true }); else oppnaBok(n); }
  };
})();
