/* Bokmotorn – ett delkapitels sida (hubben) och dess läsböcker. Fysik; pilot 2026-10-29, motorn fryst 2026-10-31.
 *
 * MOTORN ÄNDRAS INTE NÄR INNEHÅLL LÄGGS TILL. Ett delkapitel är en mapp med bara data (mall: Fysik/mall/delkapitel/):
 *
 *   index.html               mallen, ordagrant – laddar motorn och delkapitel.js
 *   delkapitel.js            Bok.delkapitel({...}): titel, nivåer och hjälpmedel
 *   innehall/<nivå>.js       Bok.niva('<nivå>', {avsnitt: [...]}): en självbärande bok per nivå
 *
 * En bok per text: med texter: [{id, titel}, …] i delkapitel.js är varje text (A, B …) en egen bok per nivå, i
 * innehall/<text>/<nivå>.js – samma Bok.niva(...) som ovan. Utan texter är texterna bokens numrerade avsnitt.
 *
 * Hubben är delkapitlets sida, byggd som plattformens avsnittssida (geografiboken): hero-banner, flikarna Föreläsning ·
 * Läs · Öva · Elevboken, och i Läs texterna (A, B …) och nivåerna (📗 Enkel · 📘 Standard · 📕 Fördjupning). Ett tryck
 * på en text öppnar boken där, på vald nivå, i helskärm. ✕ Stäng, Esc eller bakåt går tillbaka till hubben, och boken
 * minns läsplatsen. Boken läses och spelas inte: hela sidan visas direkt och eleven bläddrar själv.
 *
 * Texten flödar (2026-11-02): innehållet är en ström av block, och motorn bryter sidorna efter sidans mått (paginera).
 * Sidnumren beror på skärmen; läsplatsen är ett block och adressen pekar på en rubrik.
 *
 * Omslaget (2026-11-04), som i musikvideorna: med kapitel: '../kapitel.js' i delkapitel.js laddas kapitlets
 * Bok.kapitel({overrad, titel, illustration, upphov}), och varje bok får ett omslag före innehållsförteckningen
 * (sida 0, utanför brytningen; undertiteln är textens namn). Se omslaget nedan.
 *
 * Statusen härleds ur innehållet och skrivs aldrig för hand: en nivå utan avsnitt och ett hjälpmedel utan adress
 * syns, är märkta "kommer" och går inte att välja.
 *
 * Utbyggnad som inte är innehåll – görs i motorn, inte av den som skriver:
 *   Bok.blocktyp(namn, fn)   en ny sorts block, t.ex. en övning (fn(data, ctx) → element)
 *   Bok.figur(namn, fn)      en ny sorts figur (fn(data) → SVG-text eller {svg, beskrivning}), se figurer.js
 *   Bok.illustration(namn, fn)  ett kapitels omslagsmotiv (fn({hojd}) → SVG-text), se figurer.js
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

  const blocktyper = {}, figurer = {}, illustrationer = {}, nivadata = {}, bocker = {}, problem = [];
  let kapitel = null;                          // kapitlets gemensamma data (kapitel.js): omslaget
  let info, textId = '', nivaId = null, sidor = [], nr = 1, uppslag = false, smal = false, oppen = false, kontroll = false;
  // aktuell: brytningen som visas (sidorna för bokens sidmått). plats: läsplatsen, ett block (post-id), 'innehall' eller
  // 'omslag'. nr: sidan som visas – 0 är omslaget.
  // flytt räknas upp när blockens element flyttas mellan sidor (en ny brytning), så att sidorna byggs om.
  let aktuell = null, plats = null, flytt = 0, typsnittKlara = false, provaRubrikSist = false, provaLangsam = false;
  let tillbaka = null, vandning = 'blad', helskarm = true, reglage = 'alltid', vilaTimer = null;
  let fokusEfter = null, panelFran = null, senasteEsc = 0, bildNr = 0, bildFran = null;
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

  // Tal och enhet hålls ihop: mellanslaget mellan ett tal och en enhet efter det (10 N, 1 538 °C, 5 m/s) och
  // tusentalsmellanslaget (1 538) blir hårda (U+00A0) när texten ritas, så att raden aldrig bryts där. Källfilerna
  // skrivs med vanliga mellanslag.
  const ENHETER = ['km/h', 'm/s²', 'm/s', 'g/cm³', 'kg/m³', 'kg/dm³', 'kWh', 'cm³', 'dm³', 'm³', 'mm²', 'cm²', 'm²', '°C',
    'kPa', 'hPa', 'MPa', 'Pa', 'kHz', 'Hz', 'dB', 'kN', 'N', 'kJ', 'MJ', 'J', 'kW', 'MW', 'W', 'kg', 'mg', 'g', 'ton',
    'km', 'dm', 'cm', 'mm', 'nm', 'm', 'min', 'ms', 'h', 's', 'dl', 'cl', 'ml', 'l', 'K', 'mA', 'A', 'kV', 'V', 'Ω', '%'];
  const TAL_ENHET = new RegExp(`(\\d) (?=(?:${ENHETER.join('|')})(?![\\p{L}\\p{N}]))`, 'gu');
  const bindTal = s => String(s == null ? '' : s).replace(/(\d) (?=\d{3}(?!\d))/g, '$1 ').replace(TAL_ENHET, '$1 ');

  // Rubriker, innehållsförteckningen, sidhuvudet och tabellhuvuden sätts i kapitäler (Marcellus SC, all-small-caps), och
  // där blev ett g ett G och kg KG. Bokstavssymboler (g, m, F, v, s, t) och enheter (N, kg, N/kg, m/s, °C, cm³ …) märks
  // där (span.sym) och står i vanlig stil: EB Garamond med rätt skiftläge (bok.css). Inte "min" och "ton", som också är
  // vanliga ord. (2026-11-04, Joachims order)
  const SYM_ORD = [...new Set([...ENHETER.filter(e => !['min', 'ton'].includes(e)), 'N/kg', 'g', 'm', 'F', 'v', 's', 't'])]
    .sort((a, b) => b.length - a.length).map(e => e.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'));
  const SYM = new RegExp(`(?<![\\p{L}\\p{N}/])(?:${SYM_ORD.join('|')})(?![\\p{L}\\p{N}/²³])`, 'gu');
  const symboler = html => html.split(/(<[^>]*>)/).map((d, i) => i % 2 ? d : d.replace(SYM, x => `<span class="sym">${x}</span>`)).join('');
  const symText = s => h('span', { html: symboler(esc(s)) });

  // Textens enda markering: *begrepp* (betonat, djupblått), *böjd form|grundform* när begreppet står böjt,
  // [[täljare|nämnare]] (bråk) och <sub>/<sup>. Har delkapitlet en begreppslista blir varje begrepp en länk dit.
  function inline(s, lankar = true) {
    return esc(bindTal(s))
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
  // En bok per text och nivå. Ett delkapitel utan texter har en enda text utan id (''), och då är nycklarna desamma
  // som förut – det eleven sparat ligger kvar.
  const texter = () => info.texter || [{ id: '', titel: info.titel, undertitel: info.undertitel }];
  const textInfo = t => (t && info.texter && info.texter.find(x => x.id === t)) || { id: '', titel: info.titel, undertitel: info.undertitel };
  const bokNyckel = (t, n) => t ? `${t}/${n}` : n;
  // Läsplatsen per bok: ett block (post-id), så att den stämmer på alla sidmått. (Före 2026-11-02: ':sida', ett
  // sidnummer – den nyckeln läses inte längre.)
  const platsNyckel = (t, n) => nyckel(`${t ? t + ':' : ''}${n}:plats`);
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
  // {begrepp}, {avsnitt}, {niva} och {text} i adressen fylls i där länken står.
  function hjalpmedelUrl(id, varden = {}) {
    const hm = info && info.hjalpmedel && info.hjalpmedel[id];
    if (!hm || !hm.href) return null;
    const v = Object.assign({ niva: nivaId, text: textId }, varden);
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
  // rubrik: påståenderubriken (i innehållsförteckningen). underrubrik: en liten rubrik inne i texten.
  // (I det äldre sidformatet är sidans titel rubriken och {typ: 'rubrik'} en underrubrik – se normalisera.)
  blocktyper.rubrik = d => h('h2', { class: 'sidtitel', html: symboler(inline(d.text, false)) });
  blocktyper.underrubrik = d => h('h3', { class: 'b-rubrik', html: symboler(inline(d.text)) });
  blocktyper.punkter = d => lista(d.punkter);
  // fundera (Geografibok, order 15): en fråga att tänka på, kursiv och sist i rutan (bildguiden i Enkel)
  blocktyper.ruta = d => h('aside', { class: 'b-ruta' + (d.stil ? ' b-ruta-' + d.stil : '') },
    d.rubrik && h('h4', { html: symboler(inline(d.rubrik)) }),
    d.text && h('p', { html: inline(d.text) }),
    d.punkter && lista(d.punkter),
    d.fundera && h('p', { class: 'b-ruta-fundera', html: inline(d.fundera) }));
  blocktyper.jamforelse = d => h('div', { class: 'b-jamforelse' },
    d.kolumner.map(k => h('section', null, h('h4', { html: symboler(inline(k.rubrik)) }), lista(k.punkter))));
  blocktyper.formel = d => h('div', { class: 'b-formel' },
    h('div', { class: 'formel-uttryck', html: inline(d.uttryck) }),
    d.forklaring && h('dl', null, d.forklaring.map(([t, f]) => [h('dt', { html: inline(t) }), h('dd', { html: inline(f) })])));
  blocktyper.exempel = d => h('div', { class: 'b-exempel' },
    h('h4', null, symText(d.rubrik || 'Exempel')), d.rader.map(r => h('p', { html: inline(r) })));
  blocktyper.tabell = d => h('div', { class: 'b-tabell' },
    h('table', null,
      d.rubriker && h('thead', null, h('tr', null, d.rubriker.map(r => h('th', { scope: 'col', html: symboler(inline(r)) })))),
      h('tbody', null, d.rader.map(rad => h('tr', null,
        rad.map((c, i) => h(i ? 'td' : 'th', { scope: i ? null : 'row', html: inline(c) })))))),
    d.fotnot && h('p', { class: 'tabell-fotnot', html: inline(d.fotnot) }));
  // Figuren specificeras i data och ritas av motorn (figurer.js). Saknas den syns en markering, och ?kontroll säger till.
  blocktyper.figur = d => {
    const f = figurer[d.namn];
    if (!f) return h('figure', { class: 'b-figur' }, h('div', { class: 'figur-saknas' }, `Figuren ”${d.namn}” finns inte (bokskal/figurer.js)`));
    const r = f(d), svg = typeof r === 'string' ? r : r.svg;
    // En bildfigur (r.bild = {src, bredd, hojd}, t.ex. figuren 'bild'): liten i texten och klickbar till större. Hela
    // figuren är knappen; storleken i texten räknas ur bredd och hojd i data (bildMatt), inte ur den laddade bilden.
    if (r.bild) {
      const besk = d.beskrivning || r.beskrivning, id = 'bildbesk-' + (++bildNr);
      let fig;
      fig = h('figure', { class: 'b-figur b-bild', 'data-bild': r.bild.src, 'data-bredd': r.bild.bredd, 'data-hojd': r.bild.hojd,
        onclick: () => visaBild(fig) },
        h('button', { type: 'button', class: 'figur-knapp', 'aria-label': 'Visa större bild', 'aria-describedby': id },
          h('span', { class: 'figur-bild', html: r.html })),
        h('span', { class: 'sr-only', id }, besk),
        d.bildtext && h('figcaption', { html: inline(d.bildtext) }));
      return fig;
    }
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

  // Ett blocks element byggs en gång per bok och flyttas sedan mellan sidorna när de bryts om (nytt sidmått), så det
  // som eleven gör i ett block ligger kvar; hamta/spara behåller det också mellan lektionerna.
  function blockElement(p, bok) {
    const b = p.b, typ = blocktyper[b.typ];
    if (!typ) return h('div', { class: 'block-okand' }, `Okänd blocktyp: ${b.typ}`);
    const k = n => nyckel(`${bok.id}:${p.id}:${n}`);
    const ctx = {                                    // det ett interaktivt block behöver
      get sida() { const s = aktuell && aktuell.postSida.get(p); return s ? s.nr : null; },
      avsnitt: p.avsnitt.id, niva: bok.niva, blockId: p.id, h, inline,
      hamta: (n, standard) => lager.hamta(k(n), standard),
      spara: (n, v) => lager.spara(k(n), v),
      vidVisning: fn => p.vidVisning.push(fn)        // fn() körs varje gång sidan med blocket visas
    };
    try { return typ(b, ctx); } catch (e) {
      anmal(`${bok.id}, ”${p.avsnitt.titel}”: blocket ${b.typ}${b.namn ? ' ”' + b.namn + '”' : ''} kunde inte ritas – ${e.message}`);
      return h('div', { class: 'block-okand' }, `Blocket ”${b.typ}” kunde inte ritas: ${e.message}`);
    }
  }
  function postElement(p, bok) {
    if (p.el !== undefined) return p.el;
    const a = p.avsnitt;
    p.el = p.typ === 'sidbrytning' ? null
      : p.typ === 'avsnittsstart' ? h('div', { class: 'avsnittsstart' }, h('span', { class: 'avsnittsnr' }, a.nummer), h('h1', { html: symboler(inline(a.titel, false)) }))
      : p.typ === 'upphov' ? h('p', { class: 'upphov' }, `© ${info.upphov.ar} ${info.upphov.namn}`)
      : blockElement(p, bok);
    if (p.el) p.el.setAttribute('data-post', p.id);
    return p.el;
  }

  /* ---------- Innehåll → böcker (en självbärande bok per nivå, och per text om delkapitlet har texter) ----------
   * Boken är en ström av poster (block, rubriker, avsnittets början); sidorna bryts av motorn efter sidmåttet
   * (paginera, nedan). Två format för ett avsnitt:
   *   ström:  {id, titel, block: [{typ: 'rubrik', text}, {typ: 'text', text}, {typ: 'figur', …}, {typ: 'sidbrytning'}, …]}
   *   sidor:  {id, titel, sidor: [{titel, block}]} – formatet före 2026-11-02. Det plattas ut: sidans titel blir en
   *           rubrik, sidor i följd med samma titel (en tät sida som delats för hand) slås ihop, och {typ: 'rubrik'}
   *           inne på en sida är en underrubrik. Blockens id blir desamma som förut (det eleven sparat i ett block). */

  const nivaFil = (t, id) => `innehall/${t ? t + '/' : ''}${id}.js`;
  const RUBRIKER = ['avsnittsstart', 'rubrik', 'underrubrik'];      // står aldrig sist på en sida
  const MED_STYCKET = ['figur', 'formel', 'exempel'];               // står på samma sida som stycket före
  const INNEHALL = { id: 'innehall', titel: 'Innehåll', nummer: null };

  function normalisera(id, data, fil) {
    if (!data || !Array.isArray(data.avsnitt)) throw new Error(`${fil}: Bok.niva('${id}', {avsnitt: [...]}) saknar avsnitt`);
    let n = 0;
    data.avsnitt.forEach((a, i) => {
      if (!a.id) a.id = 'avsnitt-' + (i + 1);
      a.nummer = a.numrerad === false ? null : ++n;
      const post = (b, pid) => ({ typ: b.typ, b, id: b.id || pid, avsnitt: a, fot: b.typ === 'lank' });
      const poster = a.nummer ? [{ typ: 'avsnittsstart', id: a.id + '-start', avsnitt: a }] : [];
      // Blockens id i strömformatet: avsnitt-id-b<n>. Rubrikernas adresser är avsnitt-id-<n> (byggBok), och en
      // läsplats slås upp bland adresserna först – utan b skulle block 7 vara samma namn som rubrik 7.
      if (Array.isArray(a.block)) a.block.forEach((b, j) => poster.push(post(b, `${a.id}-b${j + 1}`)));
      else (a.sidor || []).forEach((s, si) => {
        if (s.titel && (!si || s.titel !== a.sidor[si - 1].titel)) poster.push(post({ typ: 'rubrik', text: s.titel }, `${a.id}-${si + 1}-0`));
        (s.block || []).forEach((b, bi) => poster.push(post(b.typ === 'rubrik' ? Object.assign({}, b, { typ: 'underrubrik' }) : b, `${a.id}-${si + 1}-${bi + 1}`)));
      });
      if (!poster.some(p => !p.fot && p.typ !== 'avsnittsstart')) throw new Error(`${fil}: avsnittet ”${a.titel}” har inget innehåll`);
      a.poster = poster;
    });
    return data;
  }
  const harInnehall = (id, t = textId) => { const d = nivadata[bokNyckel(t, id)]; return !!(d && d.avsnitt.length); };
  const nivaNamn = id => (info.nivaer.find(n => n.id === id) || { namn: id }).namn;
  // Nivån som en text öppnas på: den valda om texten har den, annars standardnivån eller den första med innehåll.
  const nivaFor = t => [nivaId, info.standardniva, ...info.nivaer.map(n => n.id)].find(x => x && harInnehall(x, t)) || null;

  function byggBok(id, t = textId) {
    const nyck = bokNyckel(t, id);
    if (bocker[nyck]) return bocker[nyck];
    const avsnitt = nivadata[nyck].avsnitt, bok = { id: nyck, niva: id, text: t, avsnitt, delar: [], ankare: new Map(), brytningar: {} };
    avsnitt.forEach((a, i) => {
      const poster = a.poster.slice();
      if (i === avsnitt.length - 1 && info.upphov) poster.push({ typ: 'upphov', id: 'upphov', avsnitt: a });
      poster.forEach(p => { p.vidVisning = p.vidVisning || []; });
      bok.delar.push({ avsnitt: a, poster, enheter: enheter(poster) });
      // Adresserna (#…) pekar på en rubrik: avsnittets id för dess början, avsnitt-id-n för dess n:te rubrik
      bok.ankare.set(a.id, poster[0]);
      poster.filter(p => p.typ === 'rubrik').forEach((p, k) => { p.ankare = `${a.id}-${k + 1}`; bok.ankare.set(p.ankare, p); });
    });
    bok.poster = bok.delar.flatMap(d => d.poster);
    return (bocker[nyck] = bok);
  }
  const iFlodet = p => !p.fot && p.typ !== 'sidbrytning';
  const postFor = (bok, x) => x && (bok.ankare.get(x) || bok.poster.find(p => p.id === x)) || null;

  // Grupper som inte delas mellan sidor: rubrikerna + nästa block; ett stycke + figurerna, formlerna och exemplen
  // direkt efter (delVid: där gruppen får delas om stycket och figuren inte ryms på en sida); länken i foten och
  // upphovsraden följer med gruppen före. {typ: 'sidbrytning'} gör att nästa grupp börjar på ny sida.
  function enheter(poster) {
    const ut = [];
    let i = 0, bryt = false;
    while (i < poster.length) {
      if (poster[i].typ === 'sidbrytning') { bryt = true; i++; continue; }
      const u = { poster: [], brytFore: bryt, rubrik: poster[i].typ === 'rubrik', delVid: null };
      bryt = false;
      while (i < poster.length && RUBRIKER.includes(poster[i].typ)) u.poster.push(poster[i++]);
      if (i < poster.length && iFlodet(poster[i]) && poster[i].typ !== 'upphov') {
        const forsta = poster[i++];
        u.poster.push(forsta);
        if (forsta.typ === 'text' && i < poster.length && MED_STYCKET.includes(poster[i].typ)) {
          u.delVid = u.poster.length;
          while (i < poster.length && MED_STYCKET.includes(poster[i].typ)) u.poster.push(poster[i++]);
        }
      }
      while (i < poster.length && (poster[i].fot || poster[i].typ === 'upphov')) u.poster.push(poster[i++]);
      ut.push(u);
    }
    return ut;
  }

  function satsNiva(id) {
    nivaId = id;
    aktuell = null; sidor = [];                  // bryts när boken visas (layout), efter sidmåttet
    lager.spara(nyckel('niva'), id);
  }

  // Sidhuvudets text: avsnittets nummer och namn. Numret sätts i Garamond (span.nr), där 1 inte liknar ett I.
  const bokTitlar = t => { const x = textInfo(t); return [x.titel, x.undertitel]; };
  const sidhuvud = s => s.typ === 'omslag' ? 'Omslag' : s.typ === 'innehall' ? bokTitlar(s.bok.text).filter(Boolean).join(' · ')
    : (s.avsnitt.nummer ? `${s.avsnitt.nummer} · ` : '') + (s.avsnitt.kort || s.avsnitt.titel);
  const sidhuvudNoder = s => s.avsnitt && s.avsnitt.nummer
    ? [h('span', { class: 'nr' }, s.avsnitt.nummer), ' · ', symText(s.avsnitt.kort || s.avsnitt.titel)] : [symText(sidhuvud(s))];

  // En sidas element. Blockens element flyttas hit; har de flyttats sedan (en ny brytning) byggs sidan om.
  function sidElement(s) {
    const inne = h('div', { class: 'sidinnehall' }), fot = h('footer', { class: 'sidfot' });
    if (s.typ === 'innehall') inne.append(...innehallssida(s.bok, s.brytning));
    // Länken ut till hjälpmedlen står i sidans fot, var i sidan den än är skriven: en tyst rad under texten.
    else s.poster.forEach(p => { const e = postElement(p, s.bok); if (e) (p.fot ? fot : inne).append(e); });
    return h('article', { class: 'sida' + (s.typ === 'innehall' ? ' innehallssida' : '') + (fot.childNodes.length ? ' har-fot' : ''),
      'data-nr': s.nr, 'aria-label': `Sida ${s.nr}` },
      // Sidnumret står i sidhuvudets yttre hörn, som i en tryckt bok; foten är fri för länken till hjälpmedlen.
      h('header', { class: 'sidhuvud' }, h('span', { class: 'sh-namn' }, sidhuvudNoder(s)), h('span', { class: 'sh-folio' }, s.nr)),
      inne,
      fot.childNodes.length > 0 && fot,
      h('div', { class: 'mer-hint', 'aria-hidden': 'true' }, '▾ mer längre ner på sidan'));
  }
  function byggSida(s) {
    if (s.el && s.flytt === flytt) return s.el;
    s.el = sidElement(s);
    s.flytt = flytt;
    s.el.querySelector('.sidinnehall').addEventListener('scroll', () => markeraMer(s), { passive: true });
    return s.el;
  }

  function innehallssida(bok, r) {
    const [titel, undertitel] = bokTitlar(bok.text);
    return [
      h('div', { class: 'titelblock', 'data-post': 'innehall' },
        info.overrad && h('p', { class: 'overrad' }, info.overrad),
        h('h1', { class: 'boktitel' }, symText(titel), undertitel && h('span', { class: 'undertitel' }, undertitel))),
      h('h2', { class: 'innehall-rubrik' }, 'Innehåll'),
      innehallslista(bok, r)
    ];
  }

  // Som i en tryckt bok står bara huvudrubrikerna i förteckningen: avsnitten (Inledning, de numrerade avsnitten,
  // Sammanfattning), med sidan där avsnittet börjar. ###-rubrikerna står bara i texten (Joachims beslut 2026-11-04).
  function innehallslista(bok, r) {
    const tocKnapp = (till, klass, ...inne) => h('button', { type: 'button', class: 'toc-knapp ' + klass, 'data-till': till },
      inne, h('span', { class: 'toc-prickar', 'aria-hidden': 'true' }), h('span', { class: 'toc-sida' }, till));
    return h('ol', { class: 'toc' }, bok.delar.map(d => {
      const a = d.avsnitt, k = tocKnapp(r.postSida.get(d.poster.find(iFlodet)).nr, 'toc-a', h('span', { class: 'toc-nr' }, a.nummer || ''),
        h('span', { class: 'toc-titel', html: symboler(inline(a.titel, false)) }));
      k.dataset.avsnitt = a.id;
      return h('li', null, k);
    }));
  }

  /* ---------- Omslaget: som i musikvideorna ----------
   * Filmernas omslag (1800-talet/verktyg/bok.py: closed_book_fysik och fysiktemat, bara läst) ritat i SVG:
   * midnattsblått band med prägling i koppar (ram, hörnprickar, överrad, titel och linje), rutnät och skala i
   * ljusblått, undertiteln i ljust tryck, kapitlets motiv (Bok.illustration) och upphovet. Måtten är filmens:
   * omslaget är 1036 enheter högt (filmens pixlar) och bredden följer sidans form, så texterna står på filmens
   * baslinjer i alla storlekar. Ryms titeln inte på en rad blir den två balanserade rader, som i filmen; på ett
   * smalare omslag (mobil) krymper motivet. Filmens tygstruktur är inte med.
   * Omslaget är sida 0: före innehållsförteckningen och utanför brytningen, så sidnumren är desamma som utan omslag.
   * Data: kapitlets kapitel.js (överrad, titel, illustration, upphov) och textens namn som undertitel – eller
   * delkapitlets omslag.undertitel, där {text} blir textens namn ('Repetition: {text}'). */
  const OMSLAG_H = 1036;
  const OMSLAG = { band: '#162040', koppar: '#ce8250', kopparLjus: '#f4be8e', kopparMork: '#040816', ljusbla: '#96c4ec', text: '#e8ecf2' };
  const OMSLAGET = { typ: 'omslag', nr: 0, ankare: 'omslag', poster: [] };
  let omslagNr = 0, matDuk = null;
  const harOmslag = () => !!kapitel;
  const forstaSida = () => harOmslag() ? 0 : 1;
  const sida = n => n === 0 ? OMSLAGET : sidor[n - 1];
  // En nivå utöver plattformens tre (Djupdykning) står på omslaget: "Rörelse – djupdykning"
  const egenNiva = n => n && !NIVAER.some(x => x.id === n);
  function omslagsdata(t = textId) {
    const mall = (info.omslag && info.omslag.undertitel) || '{text}';
    const niva = egenNiva(nivaId) ? ' – ' + nivaNamn(nivaId).toLowerCase() : '';
    return { overrad: kapitel.overrad, titel: kapitel.titel, undertitel: mall.replace('{text}', textInfo(t).titel) + niva,
      illustration: kapitel.illustration, upphov: kapitel.upphov || info.upphov };
  }
  // Textens bredd i omslagets enheter, med filmens spärrning (tracking: lika mycket efter varje tecken utom det sista)
  function textBredd(text, storlek, typsnitt, sparr) {
    const c = matDuk || (matDuk = document.createElement('canvas').getContext('2d'));
    c.font = `${storlek}px "${typsnitt}"`;
    return c.measureText(text).width + sparr * Math.max(0, [...text].length - 1);
  }
  const fallande = (fran, till, d) => Array.from({ length: Math.floor((fran - till) / d) + 1 }, (_, i) => fran - i * d);
  // En rad i den största storleken som ryms, annars två rader (helst balanserade, eller efter ett kolon).
  function radbryt(text, bredd, typsnitt, enRad, tvaRader, sparr = () => 0, efterKolon = false) {
    const w = (t, s) => textBredd(t, s, typsnitt, sparr(s));
    for (const s of enRad) if (w(text, s) <= bredd) return { rader: [text], storlek: s };
    const ord = text.split(' ');
    const delningar = s => ord.slice(1).map((_, k) => [ord.slice(0, k + 1).join(' '), ord.slice(k + 1).join(' ')])
      .sort((a, b) => Math.abs(w(a[0], s) - w(a[1], s)) - Math.abs(w(b[0], s) - w(b[1], s)));
    // efter ett kolon ("Repetition:" ensam på första raden) hellre än i en mindre storlek, ned till 30 (16 px på mobilen)
    const kolon = efterKolon ? ord.findIndex(o => o.endsWith(':')) : -1;
    if (kolon >= 0 && kolon < ord.length - 1) {
      const d = [ord.slice(0, kolon + 1).join(' '), ord.slice(kolon + 1).join(' ')];
      for (const s of fallande(tvaRader[0], 30, 2)) if (Math.max(w(d[0], s), w(d[1], s)) <= bredd) return { rader: d, storlek: s };
    }
    for (const s of tvaRader) {
      const ryms = delningar(s).filter(d => Math.max(w(d[0], s), w(d[1], s)) <= bredd);
      if (ryms.length) return { rader: ryms[0], storlek: s };
    }
    const s = tvaRader[tvaRader.length - 1];      // ryms inte ens så: grinden mäter omslaget och säger till
    return { rader: ord.length > 1 ? delningar(s)[0] : [text], storlek: s };
  }

  function omslagElement() {
    const g = aktuell.g, d = omslagsdata();
    const nyck = [geoNyckel(g), textId, nivaId, typsnittKlara, d.undertitel].join('|');
    if (OMSLAGET.el && OMSLAGET.nyckel === nyck) return OMSLAGET.el;
    const H = OMSLAG_H, W = Math.round(H * g.sb / g.sh), id = 'omslag' + (++omslagNr), o = OMSLAG;
    const r1 = v => Math.round(v * 10) / 10;
    // Filmens mått, i omslagets enheter (filmens omslag börjar 22 px ned i bilden): ryggen 44, ramen 52 innanför kanten
    const fx0 = 44 + 52, fx1 = W - 52, fy0 = 52, fy1 = H - 52, cx = (fx0 + fx1) / 2;
    const T = radbryt(d.titel.toUpperCase(), fx1 - fx0 - 110, 'Marcellus SC', fallande(108, 60, 4), fallande(88, 60, 4), s => 8 * s / 108);
    const sparrT = 8 * T.storlek / 108;
    const titelY = T.rader.map((_, k) => 140 + Math.max(T.storlek, 104) + 14 + k * T.storlek * 1.02);
    const linjeY = titelY[titelY.length - 1] + 38;
    const U = d.undertitel ? radbryt(d.undertitel, fx1 - fx0 - 60, 'Marcellus', fallande(50, 42, 2), fallande(46, 34, 2), undefined, true) : null;
    const underY = U ? U.rader.map((_, k) => linjeY + 72 + k * U.storlek * 1.18) : [linjeY + 72];
    const topp = Math.max(underY[underY.length - 1] + 44, 448), yb = 878;
    // text-anchor middle räknar spärrningen efter sista tecknet: flytta tillbaka en halv spärrning
    const text = (x, y, t, typsnitt, storlek, sparr = 0, attr = '') => `<text x="${r1(x + sparr / 2)}" y="${r1(y)}" font-family="${typsnitt}" ` +
      `font-size="${r1(storlek)}"${sparr ? ` letter-spacing="${r1(sparr)}"` : ''} text-anchor="middle" ${attr}>${esc(t)}</text>`;
    // Präglingen: ram, hörn, överrad, titel och linjen – i tre lager: skugga, ljuskant och kopparn
    const folie = `<rect x="${fx0}" y="${fy0}" width="${fx1 - fx0}" height="${fy1 - fy0}" fill="none" stroke="currentColor" stroke-width="3"/>` +
      `<rect x="${fx0 + 12}" y="${fy0 + 12}" width="${fx1 - fx0 - 24}" height="${fy1 - fy0 - 24}" fill="none" stroke="currentColor" stroke-width="1.2"/>` +
      [[fx0, fy0], [fx1, fy0], [fx0, fy1], [fx1, fy1]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="currentColor"/>`).join('') +
      (d.overrad ? text(cx, 140, d.overrad.toUpperCase(), 'Marcellus SC', 30, 7, 'fill="currentColor"') : '') +
      T.rader.map((t, k) => text(cx, titelY[k], t, 'Marcellus SC', T.storlek, sparrT, 'fill="currentColor"')).join('') +
      `<line x1="${r1(cx - 190)}" y1="${r1(linjeY)}" x2="${r1(cx + 190)}" y2="${r1(linjeY)}" stroke="currentColor" stroke-width="2.5"/>` +
      `<circle cx="${r1(cx)}" cy="${r1(linjeY)}" r="8" fill="currentColor"/>`;
    // Rutnätet (32 enheter) och millimeterskalan längs vänstra kanten – svagt, som tryck i bandet
    let nat = '';
    for (let x = fx0 + 24; x < fx1 - 12; x += 32) nat += `M${x} ${fy0 + 24}V${fy1 - 24}`;
    for (let y = fy0 + 24; y < fy1 - 12; y += 32) nat += `M${fx0 + 24} ${y}H${fx1 - 24}`;
    let skala = '';
    for (let k = 0; k <= 40; k++) skala += `M${fx0 + 26} ${fy0 + 120 + k * 18}h${k % 5 ? 11 : 22}`;
    // Motivet i filmens bredd (792), krympt om omslaget är smalare, från toppen ned till marken
    const MB = 792, s = Math.min(1, (fx1 - fx0) / MB), ill = illustrationer[d.illustration];
    let motiv = '';
    if (ill) {
      try { motiv = `<g class="omslag-motiv" transform="translate(${r1(cx - MB * s / 2)} ${r1(topp)}) scale(${Math.round(s * 1000) / 1000})">${ill({ hojd: (yb - topp) / s, id })}</g>`; }
      catch (e) { anmal(`omslaget: illustrationen ”${d.illustration}” kunde inte ritas: ${e.message}`); }
    }
    const upphov = d.upphov ? `${d.upphov.namn}  ·  © ${d.upphov.ar}`.replace(/ /g, ' ') : '';
    const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">` +
      `<defs><linearGradient id="${id}-ljus" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".045"/>` +
      `<stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>` +
      `<linearGradient id="${id}-rygg"><stop offset="0" stop-opacity=".4"/><stop offset=".3" stop-opacity=".24"/><stop offset=".6" stop-opacity=".1"/><stop offset="1" stop-opacity="0"/></linearGradient>` +
      `<clipPath id="${id}-yta"><rect x="${fx0 + 14}" y="${fy0 + 14}" width="${fx1 - fx0 - 28}" height="${fy1 - fy0 - 28}"/></clipPath>` +
      `<filter id="${id}-sudd" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="1.6"/></filter></defs>` +
      `<rect width="${W}" height="${H}" fill="${o.band}"/><rect width="${W}" height="${H}" fill="url(#${id}-ljus)"/>` +
      `<rect width="44" height="${H}" fill="url(#${id}-rygg)"/><rect x="44" width="3" height="${H}" opacity=".35"/>` +
      `<g clip-path="url(#${id}-yta)"><path d="${nat}" stroke="${o.ljusbla}" stroke-width="1" opacity=".07" fill="none"/>` +
      `<path d="${skala}" stroke="${o.ljusbla}" stroke-width="1.5" opacity=".22" fill="none"/>${motiv}</g>` +
      `<g color="${o.kopparMork}" opacity=".8" transform="translate(2 2)" filter="url(#${id}-sudd)">${folie}</g>` +
      `<g color="${o.kopparLjus}" opacity=".5" transform="translate(-1 -1)">${folie}</g><g color="${o.koppar}" class="omslag-folie" data-ram="${fx0 + 12} ${fy0 + 12} ${fx1 - 12} ${fy1 - 12}">${folie}</g>` +
      (U ? U.rader.map((t, k) => text(cx, underY[k], t, 'Marcellus', U.storlek, 0, `fill="${o.text}" class="omslag-under"`)).join('') : '') +
      (upphov ? text(cx, 950, upphov, 'Marcellus', 24, 1, `fill="${o.ljusbla}" opacity=".62" class="omslag-upphov"`) : '') +
      `</svg>`;
    // Skärmläsaren får texten en gång, i vanlig stavning
    const las = [d.overrad, d.titel, d.undertitel, d.upphov && `${d.upphov.namn}, © ${d.upphov.ar}`].filter(Boolean);
    OMSLAGET.el = h('article', { class: 'sida omslag', 'data-nr': 0, 'aria-label': 'Omslag' },
      h('div', { class: 'omslag-bild', 'data-post': 'omslag', html: svg }),
      h('div', { class: 'sr-only' }, las.map(t => h('p', null, t))));
    OMSLAGET.nyckel = nyck;
    return OMSLAGET.el;
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
    // Nytt sidmått: boken bryts om, och läsplatsen (ett block) behålls
    const b = bryt(byggBok(nivaId), g);
    sattBildB(b.bildB);                            // bildfigurernas bredd för det här sidmåttet (bildMatt)
    if (b !== aktuell) {
      aktuell = b;
      sidor = b.sidor;
      tillbaka = null;
      byggRemsa();
      if (oppen) nr = sidaFor(plats);
    }
    // Innehållsförteckningen ska alltid rymmas på sida 1, också när avsnitt läggs till (passaInnehall).
    const e = byggSida(sidor[0]);
    if (ui.scen.contains(e)) passaInnehall(e);
    else { const m = h('div', { class: 'matning' }, e); ui.scen.append(m); passaInnehall(e); m.remove(); }
  }

  // Bara innehållsförteckningen krymper sin text (ned till 70 %) tills den får plats. Alla andra sidor har bokens storlek.
  function passaInnehall(e) {
    const inne = e.querySelector('.sidinnehall');
    e.style.setProperty('--toc-skala', 1);
    // Första gissningen ur hur mycket som inte får plats; sedan i små steg
    let skala = Math.max(0.7, Math.min(1, Math.floor(40 * inne.clientHeight / inne.scrollHeight) / 40 + 0.025));
    if (skala < 1) e.style.setProperty('--toc-skala', skala);
    while (skala > 0.7 && inne.scrollHeight - inne.clientHeight > 1) {
      skala = Math.round((skala - 0.025) * 1000) / 1000;
      e.style.setProperty('--toc-skala', skala);
    }
  }

  /* ---------- Brytningen: strömmen av block → sidor, efter sidmåttet ----------
   * Reglerna: ingen sida slutar med en rubrik; ett stycke delas inte (står det ensamt och är högre än sidan kan sidan
   * rullas, och kontrolläget säger till); en figur, formel eller ett exempel står på samma sida som stycket före –
   * ryms de inte tillsammans på en sida, eller skulle sidan före stycket då bli tunn (under 40 %), stannar stycket
   * och figuren står först på nästa sida (figuren delas aldrig); Inledning, huvudtext och
   * Sammanfattning (varje avsnitt) börjar på ny sida; en rubrik börjar ny sida om mindre än en tredjedel av sidan är
   * kvar (den mjuka idéregeln); {typ: 'sidbrytning'} ger ny sida. Textstorleken ändras aldrig för att få plats.
   * Blir en sida mitt i ett avsnitt tunn tar den sista gruppen från sidan före, om den ryms där (balansen).
   * Alla block mäts i en spalt i ett enda layoutvarv; sedan packas grupperna med räkning, och varje sida provas en
   * gång i en riktig sida (ryms den inte går den sista gruppen vidare). Brytningen sparas per sidmått. */

  /* Bildfigurens storlek i texten: högst BILD_ANDEL av sidhöjden tillsammans med bildtexten, högst spaltens bredd, i
   * bildens proportioner (bredd och hojd i data). Räknas ur data och sidmåttet – inte ur den laddade bilden – så att
   * brytningen är densamma innan och efter att bilden laddats. Ett läsvarv (spaltens bredd och bildtextens höjd, som
   * inte beror på bilden), sedan sätts bredden (--bild-b) på varje figur. Bredderna sparas med brytningen (bildB) och
   * sätts igen när brytningen används (layout), eftersom samma element används för alla sidmått. */
  const BILD_ANDEL = 0.35;
  function bildMatt(figurer_, g) {
    const ut = new Map();
    if (!figurer_.length) return ut;
    figurer_.forEach(e => e.style.removeProperty('--bild-b'));
    const las = figurer_.map(e => {
      const cap = e.querySelector('figcaption');
      return { e, spalt: e.clientWidth, cap: cap ? cap.getBoundingClientRect().height + parseFloat(getComputedStyle(cap).marginTop) : 0 };
    });
    for (const { e, spalt, cap } of las) {
      const kvot = +e.dataset.bredd / +e.dataset.hojd;
      const hojd = Math.max(0, Math.min(spalt / kvot, BILD_ANDEL * g.sh - cap));
      ut.set(e, Math.floor(10 * Math.min(spalt, hojd * kvot)) / 10);
    }
    sattBildB(ut);
    return ut;
  }
  function sattBildB(m) { if (m) m.forEach((b, e) => e.style.setProperty('--bild-b', b + 'px')); }

  const TUNN = 0.4;                                   // en sida som är mindre fylld än så är tunn
  const NARA = 24;                                    // px: en sida så nära full provas i en riktig sida
  const geoNyckel = g => `${g.sb.toFixed(1)}x${g.sh.toFixed(1)}x${g.fs.toFixed(2)}`;
  function bryt(bok, g) {
    const k = geoNyckel(g);
    if (bok.brytningar[k]) return bok.brytningar[k];
    const r = paginera(bok, g);
    if (typsnittKlara) bok.brytningar[k] = r;         // före typsnitten är mätningen preliminär (görs om, se nedan)
    return r;
  }

  // strikt (kontrolläget): varje sida provas i en riktig sida, inte bara de nästan fulla
  function paginera(bok, g, strikt = kontroll) {
    const t0 = performance.now();
    flytt++;
    const vard = h('div', { class: 'matning' });
    sattStorlek(vard, g);
    document.body.append(vard);
    const pad = el => { const cs = getComputedStyle(el); return parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom); };
    // Sidans plats för text, utan och med fot (länken till hjälpmedlen)
    const lankProv = bok.poster.find(p => p.fot);
    const skal = medFot => {
      const inne = h('div', { class: 'sidinnehall' });
      const el = h('article', { class: 'sida' + (medFot ? ' har-fot' : '') },
        h('header', { class: 'sidhuvud' }, h('span', { class: 'sh-namn' }, 'X'), h('span', { class: 'sh-folio' }, '1')), inne,
        medFot && h('footer', { class: 'sidfot' }, postElement(lankProv, bok).cloneNode(true)));
      vard.append(el);
      return inne.clientHeight - pad(inne);
    };
    const kap0 = skal(false), kapFot = lankProv ? skal(true) : kap0;
    // Spalten: alla block i sidans bredd, mätta i ett varv
    const kinne = h('div', { class: 'sidinnehall', style: 'flex: none; overflow: visible' });
    vard.append(h('article', { class: 'sida', style: 'height: auto' }, kinne));
    const flode = bok.poster.filter(iFlodet);
    flode.forEach(p => kinne.append(postElement(p, bok)));
    // Bildfigurernas bredd för det här sidmåttet (bildMatt), innan blocken mäts
    const bildB = bildMatt(flode.map(p => p.el).filter(e => e && e.classList.contains('b-bild')), g);
    const bas = kinne.getBoundingClientRect().top, matt = new Map();
    flode.forEach(p => { const rr = p.el.getBoundingClientRect(); matt.set(p, { top: rr.top - bas, bottom: rr.bottom - bas }); });
    // Höjden för block i följd på en sida: från det första till det sista (det sista har ingen marginal under, bok.css)
    const hojd = ps => { const f = ps.filter(p => matt.has(p)); if (!f.length) return 0; return matt.get(f[f.length - 1]).bottom - matt.get(f[0]).top; };
    const kap = ps => ps.some(p => p.fot) ? kapFot : kap0;
    // En sida provas i en riktig sida: får den plats, och hur fylld blir den?
    const prova = s => {
      const el = sidElement(s); vard.append(el);
      const inne = el.querySelector('.sidinnehall'), barn = [...inne.children];
      s.over = inne.scrollHeight - inne.clientHeight > 1 ? inne.scrollHeight - inne.clientHeight : 0;
      const topp = inne.getBoundingClientRect().top + parseFloat(getComputedStyle(inne).paddingTop);
      s.fyll = barn.length ? (barn[barn.length - 1].getBoundingClientRect().bottom - topp) / (inne.clientHeight - pad(inne)) : 0;
      el.remove();
      return s.over;
    };

    // En stängd sida: provas i en riktig sida om den är nästan full (alltid i kontrolläget), annars räknas fyllnaden
    const mat = s => {
      if (strikt || hojd(s.poster) > kap(s.poster) - NARA) return prova(s);
      s.over = 0; s.fyll = hojd(s.poster) / kap(s.poster); return 0;
    };

    const sidor = [{ typ: 'innehall', bok, avsnitt: INNEHALL, poster: [] }];
    for (const d of bok.delar) {
      const E = d.enheter.map(u => Object.assign({}, u));
      const ny = forsta => { const s = { bok, avsnitt: d.avsnitt, poster: [], enheter: [], forsta }; sidor.push(s); return s; };
      const fran = sidor.length;
      let s = ny(true), i = 0;
      for (;;) {
        if (i < E.length) {
          let u = E[i];
          // Regelkonflikten: ryms inte stycket och figuren på en tom sida delas gruppen – figuren börjar nästa sida.
          // Står flera figurer efter stycket stannar så många som ryms med det; gruppen delas före den första som
          // inte ryms (två foton efter ett stycke: stycket och det första fotot ihop, det andra på nästa sida).
          if (u.delVid !== null && hojd(u.poster) > kap(u.poster)) {
            let vid = u.delVid;
            while (vid + 1 < u.poster.length && MED_STYCKET.includes(u.poster[vid + 1].typ) &&
              hojd(u.poster.slice(0, vid + 1)) <= kap(u.poster.slice(0, vid + 1))) vid++;
            // (står det kvar figurer med stycket får den delen fortfarande delas enligt 40 %-regeln nedan; resten
            // behöver då ingen egen sida – den ryms ändå inte med stycket, men får följa en figur som flyttats fram)
            E.splice(i, 1, Object.assign({}, u, { poster: u.poster.slice(0, vid), delVid: vid > u.delVid ? u.delVid : null }),
              { poster: u.poster.slice(vid), brytFore: vid === u.delVid, rubrik: false, delVid: null });
            u = E[i];
          }
          // …och om sidan annars skulle bli under 40 % fylld: då stannar stycket här och figuren börjar nästa sida.
          // Nära gränsen (inom NARA) avgör en riktig sida, som i kontrollen av tunna sidor; mätningen sparas
          // (fyllFore), så att regelkontrollen kan se att delningen var tillåten.
          const forDel = u.delVid !== null && u.poster.slice(0, u.delVid);
          const tunnUtan = () => {
            const hh = hojd(s.poster), k = kap(s.poster);
            if (hh < TUNN * k) return true;
            if (hh >= TUNN * k + NARA) return false;
            prova(s); s.fyllFore = s.fyll; return s.fyll < TUNN;
          };
          if (forDel && s.enheter.length && !u.brytFore && hojd(s.poster.concat(u.poster)) > kap(s.poster.concat(u.poster)) &&
            hojd(s.poster.concat(forDel)) <= kap(s.poster.concat(forDel)) && tunnUtan()) {
            E.splice(i, 1, Object.assign({}, u, { poster: forDel, delVid: null }),
              { poster: u.poster.slice(u.delVid), brytFore: true, rubrik: false, delVid: null });
            u = E[i];
          }
          const med = s.poster.concat(u.poster);
          const nySida = s.enheter.length && (u.brytFore || hojd(med) > kap(med) ||
            (u.rubrik && kap(s.poster) - hojd(s.poster) < kap(s.poster) / 3));
          if (!nySida) { s.enheter.push(u); s.poster.push(...u.poster); i++; continue; }
        }
        // Sidan stängs. Räkningen är exakt (samma bredd, sista blockets marginal är borttagen), så bara en nästan full
        // sida provas i en riktig sida; ryms den inte där går de sista grupperna vidare (minst en blir kvar).
        while (mat(s) && s.enheter.length > 1) { const u = s.enheter.pop(); s.poster.length -= u.poster.length; i--; }
        if (i >= E.length) break;
        s = ny(false);
      }
      s.sist = true;                                  // sista sidan i avsnittet: får vara kort
      // Balansen: packningen är girig, så en sida blir tunn (under 40 %) när nästa grupp inte får plats. Då tar den
      // den sista gruppen från sidan före, om gruppen ryms och sidan före inte själv blir tunn. En grupp som börjar
      // efter en sidbrytning eller en delad figur (brytFore) står kvar först på sin sida. Avgörs med räkningen och
      // marginalen NARA, så att elevens snabba brytning och kontrollägets provade blir samma vid 40-procentsgränsen.
      const tunn = ps => hojd(ps) < TUNN * kap(ps) + NARA;
      // Sidan före får inte själv bli tunn. Nära gränsen (inom NARA) avgör en riktig sida, som vid delningen av stycke
      // och figur (tunnUtan): båda brytningarna mäter då likadant (2026-11-04, III C Djupdykning – sidan före hade blivit
      // 44 %, men räkningen med marginalen kallade den tunn och den efter blev 37 %).
      const tunnKvar = ps => {
        const hh = hojd(ps), k = kap(ps);
        if (hh < TUNN * k) return true;
        if (hh >= TUNN * k + NARA) return false;
        const prov = { bok, avsnitt: d.avsnitt, poster: ps };
        prova(prov); return prov.fyll < TUNN;
      };
      for (let j = fran + 1; j < sidor.length; j++) {
        const t = sidor[j], P = sidor[j - 1], nasta = sidor[j + 1];
        if (t.sist || !tunn(t.poster) || (nasta && nasta.avsnitt === t.avsnitt && nasta.enheter[0].brytFore)) continue;
        const u = P.enheter[P.enheter.length - 1];
        if (P.enheter.length < 2 || u.brytFore || t.enheter[0].brytFore) continue;
        const ihop = u.poster.concat(t.poster), kvar = P.poster.slice(0, P.poster.length - u.poster.length);
        if (hojd(ihop) > kap(ihop) - NARA || tunnKvar(kvar)) continue;
        P.enheter.pop(); P.poster = kvar; t.enheter.unshift(u); t.poster = ihop;
        if (mat(t) || mat(P)) {                       // ryms inte i en riktig sida: tillbaka
          t.enheter.shift(); t.poster = t.poster.slice(u.poster.length); P.enheter.push(u); P.poster = P.poster.concat(u.poster);
          mat(t); mat(P);
        }
      }
    }
    // Provkrok för grindens negativa prov (bara med ?kontroll&prova=rubrik-sist): en rubrik flyttas sist på sidan före
    if (provaRubrikSist) {
      const s = sidor.find((x, j) => j > 1 && x.poster[0] && x.poster[0].typ === 'rubrik' && sidor[j - 1].avsnitt === x.avsnitt && x.poster.length > 1);
      if (s) { const fore = sidor[sidor.indexOf(s) - 1]; fore.poster.push(s.poster.shift()); }
    }
    const postSida = new Map();
    sidor.forEach((x, j) => {
      x.nr = j + 1;
      x.poster.forEach(p => postSida.set(p, x));
      // Adressen för sidan: den senaste rubriken på eller före sidans första block, annars avsnittets början
      if (x.typ === 'innehall') { x.ankare = 'innehall'; return; }
      const d = bok.delar.find(dd => dd.avsnitt === x.avsnitt), forsta = d.poster.indexOf(x.poster.find(iFlodet));
      const rubrik = d.poster.slice(0, forsta + 1).reverse().find(p => p.ankare);
      x.ankare = rubrik ? rubrik.ankare : x.avsnitt.id;
    });
    const r = { sidor, postSida, matt, kap: kap0, g, bildB };
    sidor[0].brytning = r;
    // Innehållsförteckningen (sida 1) ska rymmas; den krymper själv sin text (passaInnehall)
    const toc = sidElement(sidor[0]); vard.append(toc); passaInnehall(toc);
    const ti = toc.querySelector('.sidinnehall');
    sidor[0].over = ti.scrollHeight - ti.clientHeight > 1 ? ti.scrollHeight - ti.clientHeight : 0;
    vard.remove();
    // En brytning för ett annat sidmått (kontrolläget, tidsprovet) får inte lämna sina bildbredder kvar i boken som visas
    if (aktuell && aktuell !== r) sattBildB(aktuell.bildB);
    // Provkrok för grindens negativa prov (bara med ?kontroll&prova=langsam): brytningen tar 250 ms längre
    if (provaLangsam) { const slut = performance.now() + 250; while (performance.now() < slut); }
    r.ms = Math.round(10 * (performance.now() - t0)) / 10;
    return r;
  }

  // Reglerna prövade på en färdig brytning (kontrolläget och grinden): det som bryter mot dem, och sidor som är tunna.
  function regelkoll(r, bok) {
    const brott = [], tunna = [];
    const forstaPa = s => s.poster.find(iFlodet);
    r.sidor.forEach((s, j) => {
      if (s.typ === 'innehall') return;
      const fl = s.poster.filter(p => iFlodet(p) && p.typ !== 'upphov'), sista = fl[fl.length - 1], forsta = fl[0];
      if (sista && RUBRIKER.includes(sista.typ) && fl.length > 1) brott.push(`sida ${s.nr} slutar med en rubrik`);
      const d = bok.delar.find(dd => dd.avsnitt === s.avsnitt);
      if (forsta && MED_STYCKET.includes(forsta.typ)) {
        const fore = d.poster[d.poster.indexOf(forsta) - 1];
        if (fore && fore.typ === 'text' && r.postSida.get(fore) !== s) {
          // Tillåtet bara om stycket och figuren inte ryms tillsammans på en sida, eller om stycket annars hade
          // lämnat sin sida tunn (det som står på sidan före stycket och dess rubriker är under 40 %)
          const ihop = r.matt.get(forsta).bottom - r.matt.get(fore).top;
          const P = r.postSida.get(fore), fl = P.poster.filter(p => r.matt.has(p));
          let start = fl.indexOf(fore);
          while (start > 0 && RUBRIKER.includes(fl[start - 1].typ)) start--;
          const innan = start > 0 ? r.matt.get(fl[start - 1]).bottom - r.matt.get(fl[0]).top : 0;
          // (nära gränsen avgjorde en riktig sida: fyllFore, se paginera)
          if (ihop <= r.kap && innan >= TUNN * r.kap && !(P.fyllFore < TUNN)) brott.push(`sida ${s.nr}: ${forsta.typ} står skild från stycket före, fast de ryms tillsammans`);
        }
      }
      if (s.forsta && forsta !== d.poster.find(iFlodet)) brott.push(`sida ${s.nr}: avsnittet ”${s.avsnitt.titel}” börjar inte på ny sida`);
      if (j > 1 && r.sidor[j - 1].avsnitt === s.avsnitt && s.forsta) brott.push(`sida ${s.nr}: avsnittet börjar två gånger`);
      const nasta = r.sidor[j + 1], brytEfter = nasta && nasta.avsnitt === s.avsnitt &&
        d.poster[d.poster.indexOf(forstaPa(nasta)) - 1] && d.poster[d.poster.indexOf(forstaPa(nasta)) - 1].typ === 'sidbrytning';
      if (!s.sist && !brytEfter && s.fyll < TUNN) tunna.push(`sida ${s.nr} är bara ${Math.round(100 * s.fyll)} % fylld`);
    });
    bok.poster.forEach((p, j) => {
      if (p.typ !== 'sidbrytning') return;
      const efter = bok.poster.slice(j + 1).find(iFlodet), s = efter && r.postSida.get(efter);
      if (s && forstaPa(s) !== efter && efter.avsnitt === p.avsnitt) brott.push(`sida ${s.nr}: blocket efter en sidbrytning börjar inte sidan`);
    });
    return { brott, tunna };
  }

  /* ---------- Visa och bläddra ---------- */

  function synliga(n) {
    if (!uppslag || n === 0) return [n];         // omslaget står ensamt (på ett uppslag som högersida)
    const v = n % 2 ? n : n - 1;                 // udda sidor till vänster: 1–2, 3–4, …
    return v + 1 <= sidor.length ? [v, v + 1] : [v];
  }

  // riktning: +1/−1 vid ett sidbyte (null: samma sidor ritas om); blad: ett blad vänds (bläddring, inte hopp)
  function rita(riktning, blad = false) {
    if (bladKlar) bladKlar();                    // en pågående vändning blir klar direkt – aldrig en kö
    const gammal = ui.scen.firstElementChild, gamla = gammal && gammal.classList.contains('uppslag') ? [...gammal.children] : [];
    const vis = synliga(nr), med = vis[0] === 0;
    const u = h('div', { class: 'uppslag ' + (uppslag ? 'ar-uppslag' : 'ar-enkel') + (smal ? ' smal' : '') + (med ? ' med-omslag' : '') });
    // Omslaget på ett uppslag: boken är stängd – tomt till vänster (bordet), omslaget till höger. Bläddras det framåt
    // vänds omslaget som ett blad och sida 1–2 öppnas.
    if (uppslag && med) u.append(h('div', { class: 'sida vanstersida fore-omslag', 'aria-hidden': 'true' }));
    vis.forEach((n, i) => {
      const e = n === 0 ? omslagElement() : byggSida(sidor[n - 1]);
      e.classList.toggle('vanstersida', uppslag && i === 0 && n !== 0);
      e.classList.toggle('hogersida', uppslag && (i === 1 || n === 0));
      u.append(e);
    });
    if (uppslag && vis.length === 1 && !med) u.append(h('div', { class: 'sida hogersida tom-sida', 'aria-hidden': 'true' }));
    // Bladvändning vid bläddring; vid ett hopp (innehållet, en länk, Home/End) bara den korta glidningen
    const rorelse = riktning && vandning === 'blad' && !minskadRorelse();
    const vand = rorelse && blad && gamla.length === u.children.length && !gamla.some(e => u.contains(e));
    if (rorelse && !vand) u.classList.add(riktning > 0 ? 'in-framat' : 'in-bakat');
    ui.scen.replaceChildren(u);
    vis.forEach(n => passaEtiketter(sida(n).el));
    if (vand) vandBlad(gamla, u, riktning);
    if (riktning !== null) vis.forEach(n => { const inne = sida(n).el.querySelector('.sidinnehall'); if (inne) inne.scrollTop = 0; });
    requestAnimationFrame(() => vis.forEach(n => markeraMer(sida(n))));
    uppdateraLage(vis, riktning !== null);
  }

  // Bildpilarnas etiketter är aldrig mindre än 14 px på skärmen (Joachims order 2026-11-04). figurer.js ritar dem 18
  // enheter höga i figurens 440 enheter; när fotot skalas ner (ett stående foto, en smal sida) växer etiketten och
  // pilarnas tjocklek i figurens enheter (--bp-k, bok.css), så att de syns lika stora. Figurens storlek, och därmed
  // brytningen, ändras inte.
  const ETIKETT_MIN = 14;
  function passaEtiketter(rot) {
    if (!rot) return;
    rot.querySelectorAll('svg[data-bildpilar]').forEach(s => {
      // figurens skala: rutan kan vara bredare än bilden (ett stående foto begränsas av höjden och står i mitten)
      const r = s.getBoundingClientRect(), vb = s.viewBox.baseVal;
      if (!r.width || !vb || !vb.width) return;
      const skala = Math.min(r.width / vb.width, r.height / vb.height);
      const k = Math.max(1, Math.ceil(1000 * ETIKETT_MIN / (18 * skala)) / 1000);
      if (s.style.getPropertyValue('--bp-k') !== String(k)) s.style.setProperty('--bp-k', String(k));
    });
  }

  /* Bladvändningen – modellen ur filmernas bok (1800-talet/verktyg/bok.py, turn_frame), det som går lätt i CSS:
   * bladet vrids runt ryggen i perspektiv (rotateY, perspektivet ≈ 5 sidbredder som filmens kamera), med mjuk start
   * och slut, en skugga på sidan under bladet och ett blad som mörknar när det står på högkant.
   * Det nya uppslaget står redan i scenen när vändningen börjar: läsplatsen, adressen och skärmläsaren väntar aldrig.
   * Vändningen spelas i ett eget lager ovanpå scenen (utanför den), som tas bort när den är klar.
   *   Uppslag framåt: den gamla vänstersidan ligger kvar; bladet har den gamla högersidan på framsidan och den nya
   *   vänstersidan på baksidan och vänds från höger till vänster. Bakåt: spegelvänt.
   *   En sida (mobil) framåt: sidan lyfts runt sin vänsterkant och den nya syns under. Bakåt: den förra sidan läggs
   *   ner över den gamla.
   * De gamla sidornas egna element flyttas in i lagret. Den nya sidan på bladet (den står också i scenen) är en kopia
   * utan id; på ett uppslag syns den först när bladet passerat högkant, så att ett foto i den hinner ritas. */
  const BLAD_MS = 340, BLAD_EASE = 'cubic-bezier(.33, 0, .67, 1)';   // ungefär filmens smoothstep
  let bladKlar = null;                                                // gör en pågående vändning klar
  function vandBlad(gamla, u, riktning) {
    const nya = [...u.children], fram = riktning > 0;
    const ram = ui.scenRam.getBoundingClientRect(), r = u.getBoundingClientRect();
    const lager = h('div', { class: 'blad-lager' + (uppslag ? ' blad-uppslag' : ' ar-enkel') + (smal ? ' smal' : ''), 'aria-hidden': 'true' });
    ['--sb', '--sh', '--fs'].forEach(p => lager.style.setProperty(p, ui.scen.style.getPropertyValue(p)));
    Object.assign(lager.style, { left: r.left - ram.left + 'px', top: r.top - ram.top + 'px', width: r.width + 'px', height: r.height + 'px',
      // bladet växer i perspektivet men går aldrig ut över listerna: klipps vid scenens kant
      clipPath: `inset(${ram.top - r.top}px ${r.right - ram.right}px ${r.bottom - ram.bottom}px ${ram.left - r.left}px)` });
    const kopia = el => { const k = el.cloneNode(true); k.querySelectorAll('[id]').forEach(e => e.removeAttribute('id')); return k; };
    const del = (klass, vanster, ...barn) => h('div', { class: klass, style: `left: ${vanster}; width: ${uppslag ? '50%' : '100%'}` }, ...barn);
    const yta = (el, klass) => h('div', { class: 'blad-sida ' + klass }, el, h('div', { class: 'blad-ljus' }));
    let blad, fast = null, skugga, vinkel, ljus;
    if (uppslag) {
      // [vänster, höger]: framåt vänds den gamla högersidan, bakåt den gamla vänstersidan
      const [stilla, vands, under] = fram ? [gamla[0], gamla[1], nya[0]] : [gamla[1], gamla[0], nya[1]];
      fast = del('blad-fast', fram ? '0' : '50%', stilla);
      skugga = del('blad-skugga ' + (fram ? 'mot-hoger' : 'mot-vanster'), fram ? '50%' : '0');
      blad = del('blad ' + (fram ? 'fran-hoger' : 'fran-vanster'), fram ? '50%' : '0', yta(vands, 'fram'), yta(kopia(under), 'bak'));
      vinkel = fram ? ['rotateY(0deg)', 'rotateY(-180deg)'] : ['rotateY(0deg)', 'rotateY(180deg)'];
      ljus = [{ opacity: 0 }, { opacity: .35, offset: .5 }, { opacity: 0 }];
    } else if (fram) {
      skugga = del('blad-skugga mot-hoger', '0');
      blad = del('blad fran-hoger', '0', yta(gamla[0], 'fram'));
      vinkel = ['rotateY(0deg)', 'rotateY(-90deg)'];
      ljus = [{ opacity: 0 }, { opacity: .35 }];
    } else {
      fast = del('blad-fast', '0', gamla[0]);
      skugga = del('blad-skugga mot-hoger', '0');
      blad = del('blad fran-hoger', '0', yta(kopia(nya[0]), 'fram'));
      vinkel = ['rotateY(-90deg)', 'rotateY(0deg)'];
      ljus = [{ opacity: .35 }, { opacity: 0 }];
    }
    lager.append(...[fast, skugga, blad].filter(Boolean));
    ui.scenRam.insertBefore(lager, ui.scen.nextSibling);
    // fill: slutläget står kvar tills lagret tas bort (annars syns det gamla uppslaget en bildruta när den är klar)
    const t = { duration: BLAD_MS, easing: BLAD_EASE, fill: 'forwards' };
    const anim = [blad.animate(vinkel.map(transform => ({ transform })), t),
      skugga.animate([{ opacity: 0 }, { opacity: 1, offset: .5 }, { opacity: 0 }], t),
      ...[...blad.querySelectorAll('.blad-ljus')].map(e => e.animate(ljus, t))];
    let klar = false;
    bladKlar = () => {
      if (klar) return;
      klar = true; bladKlar = null;
      anim.forEach(a => a.cancel());
      lager.remove();
    };
    anim[0].finished.then(() => bladKlar && !klar && bladKlar(), () => {});
  }

  function uppdateraLage(vis, nyttLage) {
    const forsta = sida(vis[0]), sista = sida(vis[vis.length - 1]), omslag = forsta.typ === 'omslag';
    const olika = vis.map(sida).filter((s, i, a) => !i || sidhuvud(s) !== sidhuvud(a[i - 1]));
    const sidor_ = omslag ? 'Omslag' : vis.length > 1 ? `Sida ${vis[0]}–${vis[1]}` : `Sida ${vis[0]}`;
    const sidtext = omslag ? `Omslag, ${sidor.length} sidor` : `${sidor_} av ${sidor.length}`;
    ui.position.replaceChildren(h('span', { class: 'pos-avsnitt' }, omslag ? bokTitlar(textId)[0] : olika.map((s, i) => [i ? ' / ' : '', sidhuvudNoder(s)])),
      h('span', { class: 'pos-skiljetecken' }, ' · '), h('span', { class: 'pos-sida' }, sidtext));
    ui.lasSidtext.replaceChildren(h('span', null, sidor_), h('span', null, omslag ? `${sidor.length} sidor` : `av ${sidor.length}`));
    ui.lasRemsa.querySelectorAll('.lr-sida').forEach(d => d.classList.toggle('synlig', vis.includes(+d.dataset.nr)));
    ui.bak.disabled = ui.pilBak.disabled = forsta.nr === forstaSida();
    ui.fram.disabled = ui.pilFram.disabled = sista.nr === sidor.length;
    if (tillbaka && vis.includes(tillbaka)) tillbaka = null;
    ui.chipar.forEach(c => { c.hidden = !tillbaka; if (tillbaka) c.textContent = `↩ Tillbaka till sida ${tillbaka}`; });
    ui.position.hidden = !!tillbaka;
    lager.spara(platsNyckel(textId, nivaId), plats);
    if (nyttLage) {
      ui.meddela.textContent = omslag ? `Omslag. ${[omslagsdata().titel, omslagsdata().undertitel].filter(Boolean).join(' – ')}.`
        : `${sidtext}. ${olika.map(sidhuvud).join(' / ')}.`;
      vis.forEach(n => sida(n).poster.forEach(p => p.vidVisning.forEach(fn => { try { fn(); } catch (e) { console.error(e); } })));
    }
  }

  // Läsplatsen är ett block, inte ett sidnummer: sidnumren beror på sidmåttet. platsFor: sidans första block.
  // sidaFor: sidan med ett block, en rubrik (adressen), 'innehall' eller ett sidnummer (#sida-7 från förr).
  const platsFor = s => s.typ === 'omslag' || s.typ === 'innehall' ? s.typ : (s.poster.find(iFlodet) || {}).id;
  function sidaFor(x) {
    if (x === 'omslag') return forstaSida();
    const m = /^sida-(\d+)$/.exec(x || '');
    if (m || typeof x === 'number') return Math.max(forstaSida(), Math.min(sidor.length, m ? +m[1] : x));
    const bok = byggBok(nivaId), p = x && x !== 'innehall' && postFor(bok, x);
    const s = p && (aktuell.postSida.get(p) || aktuell.postSida.get(bok.poster.slice(bok.poster.indexOf(p)).find(iFlodet)));
    return s ? s.nr : 1;
  }

  // Sidan får inte plats: den kan rullas, och en svag toning och en rad längst ner säger att det finns mer.
  function markeraMer(s) {
    const inne = s.el && s.el.querySelector('.sidinnehall');
    if (!inne) return;
    s.el.classList.toggle('har-mer', inne.scrollTop + inne.clientHeight < inne.scrollHeight - 4);
  }

  // hopp: via innehållet. Då kommer "Tillbaka till sida x". Ett hopp från innehållssidan (sida 1) behåller ett
  // tidigare "tillbaka": eleven gick dit för att hitta något annat. Boken är en enda post i webbläsarens historik,
  // så att bakåt alltid leder tillbaka till delkapitlet; adressen följer med och pekar på sidans rubrik (#atomer-2).
  function gaTill(n, { hopp = false, minnas = hopp } = {}) {
    n = Number.isFinite(+n) ? Math.max(forstaSida(), Math.min(sidor.length, Math.trunc(+n))) : 1;   // 0: omslaget
    const fore = synliga(nr)[0], efter = synliga(n)[0];
    // (från omslaget blir det inget "Tillbaka till sida …")
    if (minnas && efter !== fore && !(fore === 1 && tillbaka)) tillbaka = nr || null;
    nr = n;
    plats = platsFor(sida(n));
    history.replaceState({ bok: true }, '', adress(sida(n).ankare));
    rita(Math.sign(efter - fore), !hopp);           // bläddring vänder ett blad, ett hopp gör det inte
  }
  // Medan en bild visas större (visaBild) bläddras inte boken
  const bladdra = steg => { if (bildVisas()) return; const v = synliga(nr); gaTill(steg > 0 ? v[v.length - 1] + 1 : v[0] - 1); };
  // Adressen: #<rubrik>, och med texter #<text>/<rubrik> (#atomen/periodiska-systemet-2), så att en länk öppnar rätt bok
  const adress = ankare => '#' + (info.texter ? textId + '/' : '') + ankare;
  const platsIAdressen = () => { const x = decodeURIComponent(location.hash.slice(1)); return x || null; };
  // Öppnar boken på en adress: byter först text om adressen säger det
  function oppnaAdress(x, valfritt) {
    const i = x.indexOf('/');
    if (i > 0 && info.texter) { valjText(x.slice(0, i)); x = x.slice(i + 1); }
    oppnaBok(x, valfritt);
  }
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

  // Med texter i delkapitel.js är varje text (A, B …) en egen bok: den öppnas där eleven var i den, annars från
  // början, och den text eleven läste senast är markerad. En text utan innehåll på någon nivå är tonad ("kommer").
  // Utan texter är texterna bokens numrerade avsnitt; Inledning och Sammanfattning ligger i boken runt dem. Texten där
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
    // Läsplatsen är ett block (platsNyckel); finns det inte längre i boken börjar texten om
    const sparadPost = (bok, t, n) => postFor(bok, lager.hamta(platsNyckel(t, n), null));
    // Utan läsplats i boken: omslaget (första gången, eller om eleven var där), innehållet om eleven var där
    const borjan = (t, n) => harOmslag() && lager.hamta(platsNyckel(t, n), null) !== 'innehall' ? 'omslag' : 'innehall';
    const bok = byggBok(nivaId), sp = sparadPost(bok, textId, nivaId);
    let knappar;
    if (info.texter) {
      knappar = info.texter.map(t => {
        const n = nivaFor(t.id), p = n && sparadPost(byggBok(n, t.id), t.id, n);
        return { titel: t.titel, text: t.id, dar: t.id === textId, kommer: !n, oppna: p ? p.id : borjan(t.id, n) };
      });
    } else {
      const numrerade = bok.avsnitt.filter(a => a.nummer), avsnitt = numrerade.length ? numrerade : bok.avsnitt;
      const ix = a => bok.avsnitt.indexOf(a);
      // texten där eleven är (i Inledningen: A, i Sammanfattningen: den sista); den öppnar boken där eleven var
      const har = sp ? Math.max(0, avsnitt.filter(a => ix(a) <= ix(sp.avsnitt)).length - 1) : 0;
      const forst = !sp && borjan('', nivaId) === 'omslag' ? 'omslag' : null;
      knappar = avsnitt.map((a, i) => ({ titel: a.titel, dar: i === har,
        oppna: i === har && sp ? sp.id : i === har && forst ? forst : bok.delar[ix(a)].poster[0].id }));
    }
    ui.texter.replaceChildren(...knappar.map((k, i) => {
      const bokstav = String.fromCharCode(97 + i);
      return h('button', { type: 'button', class: 'underdel-knapp' + (k.dar ? ' aktiv' : ''), 'data-underdel': bokstav,
        'data-text': k.text || null, 'data-oppna': k.kommer ? null : k.oppna, 'data-fokus': 'text-' + bokstav,
        'aria-current': k.dar ? 'true' : null, 'aria-disabled': k.kommer ? 'true' : null, title: k.kommer ? `${k.titel} – kommer` : null },
        h('span', { class: 'underdel-bokstav' }, bokstav.toUpperCase()), h('span', { class: 'underdel-titel', html: inline(k.titel, false) }));
    }));
    // "Du läste senast vid …": rubriken på eller före blocket (sidnummer används inte – de beror på skärmen)
    const iText = info.texter ? ` i ${textInfo(textId).titel}` : '';
    const d = sp && bok.delar.find(x => x.avsnitt === sp.avsnitt);
    const rubrik = d && d.poster.slice(0, d.poster.indexOf(sp) + 1).reverse().find(p => p.typ === 'rubrik');
    const vid = rubrik ? `”${renText(rubrik.b.text)}”` : sp ? `”${renText(sp.avsnitt.titel)}”` : '';
    ui.lasLage.textContent = (sp ? `Du läste senast vid ${vid}${iText}. ` : '') + 'Välj en text så öppnas boken.';
  }

  // En text väljs (ett tryck på den i hubben): dess bok, på den valda nivån om texten har den.
  function valjText(t) {
    if (!info.texter || !nivaFor(t)) return;
    textId = t;
    lager.spara(nyckel('text'), t);
    satsNiva(nivaFor(t));
  }

  /* ---------- Boken: öppna och stäng ---------- */

  // Öppnas av ett tryck i hubben (på läsplatsen: ett block) eller när adressen pekar på en rubrik (#atomer-2).
  // Helskärm om inställningen säger så och trycket tillåter det. Boken läggs som en egen post i historiken, så att
  // bakåt stänger den.
  function oppnaBok(mal, { historik = false } = {}) {
    if (oppen || !nivaId) return;
    oppen = true;
    satsNiva(nivaId);
    ritaNivaval();
    ui.app.setAttribute('aria-label', bokTitlar(textId).filter(Boolean).join(' – '));
    ui.app.hidden = false;
    ui.hubb.forEach(d => { d.inert = true; });
    document.body.classList.add('bok-oppen');
    if (!historik) history.pushState({ bok: true }, '', adress('innehall'));
    const rot = document.documentElement, gest = !navigator.userActivation || navigator.userActivation.isActive;
    if (helskarm && gest && rot.requestFullscreen && !document.fullscreenElement) rot.requestFullscreen().catch(() => {});
    tillbaka = null;
    vakna();
    layout();                                      // bryter boken efter sidmåttet
    nr = sidaFor(mal);
    const p = postFor(byggBok(nivaId), mal);
    plats = p && iFlodet(p) ? p.id : platsFor(sida(nr));            // läsplatsen följer med när sidmåttet ändras
    history.replaceState({ bok: true }, '', adress(sida(nr).ankare));
    rita(0);
    ui.scen.focus({ preventScroll: true });
    ui.meddela.textContent = `${bokTitlar(textId)[0]}, ${nivaNamn(nivaId)}. Esc stänger boken.`;
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
    if (bladKlar) bladKlar();
    stangBild(false); stangMeny(false); stangPanel(false); visaNivaLista(false);
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
    if (bildVisas()) stangBild();
    else if (!ui.panel.hidden) stangPanel();
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
      valGrupp('Bladvändning', [['blad', 'På'], ['direkt', 'Av']], () => vandning,
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
          h('h3', null, 'Bladvändning'), ui.val[0],
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

    // En bildfigur visas större ovanpå boken (visaBild): bilden på mörk botten, så att boken anas runt om.
    ui.bildImg = h('img', { class: 'bild-stor', alt: '' });
    ui.bildStang = h('button', { type: 'button', class: 'bild-stang', 'aria-label': 'Stäng bilden', onclick: () => stangBild() },
      h('span', { 'aria-hidden': 'true' }, '✕'), ' Stäng');
    ui.bildLager = h('div', { class: 'bild-lager', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Större bild',
      onclick: e => { if (e.target === ui.bildLager) stangBild(); } }, ui.bildImg, ui.bildStang);

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

    ui.app = h('div', { class: 'bokapp', hidden: true },
      h('header', { class: 'topplist' }, stangKnapp('knapp'), ui.toppNiva, ui.innehall[1]),
      ui.scenRam,
      h('footer', { class: 'bottenlist' }, ui.bak, h('div', { class: 'botten-mitt' }, ui.position, ui.chipar[0]), ui.fram),
      ui.meny, ui.panel, ui.bildLager, ui.meddela);
    document.body.append(ui.app);

    document.addEventListener('click', e => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      if (!oppen) {
        const o = t.closest('[data-oppna]');
        if (o && iHubben(o)) { fokusEfter = o.dataset.fokus; if (o.dataset.text) valjText(o.dataset.text); oppnaBok(o.dataset.oppna); }
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
      if (bildVisas() || !ui.meny.hidden || !ui.panel.hidden || !ui.nivaLista.hidden) return;
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
      const mal = platsIAdressen();
      if (mal && !oppen) oppnaAdress(mal, { historik: true });
      else if (!mal && oppen) stangBokNu();
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
    ui.menyLista.replaceChildren(innehallslista(byggBok(nivaId), aktuell));
    // du är här: avsnittet som de synliga sidorna hör till (på omslaget inget)
    const har = new Set(synliga(nr).filter(n => n > 0).map(n => sidor[n - 1].avsnitt.id));
    ui.menyLista.querySelectorAll('.toc-a').forEach(b => { if (har.has(b.dataset.avsnitt)) b.setAttribute('aria-current', 'page'); });
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

  // En bildfigur större: bildens egen storlek (bredd och hojd i data), men högst BILD_STOR av fönstret – och aldrig
  // mindre än i texten. Klick utanför bilden, ✕ Stäng och Esc stänger; fokus går tillbaka till figuren. Medan bilden
  // visas bläddras inte boken (bladdra, tangenterna).
  const BILD_STOR = { bredd: 0.9, hojd: 0.85 };
  const bildVisas = () => !!ui.bildLager && !ui.bildLager.hidden;
  function visaBild(fig) {
    if (!oppen || bildVisas()) return;
    const B = +fig.dataset.bredd, H = +fig.dataset.hojd, kvot = B / H;
    const iTexten = fig.querySelector('.figur-bild img').getBoundingClientRect();
    let b = Math.min(B, BILD_STOR.bredd * innerWidth, BILD_STOR.hojd * innerHeight * kvot);
    if (b < iTexten.width) b = iTexten.width;
    bildFran = fig.querySelector('.figur-knapp');
    ui.bildImg.src = fig.dataset.bild;
    ui.bildImg.alt = (fig.querySelector('.sr-only') || {}).textContent || '';
    ui.bildImg.style.width = b.toFixed(1) + 'px';
    ui.bildImg.style.height = (b / kvot).toFixed(1) + 'px';
    ui.bildLager.hidden = false;
    ui.bildStang.focus({ preventScroll: true });
  }
  function stangBild(fokus = true) {
    if (!bildVisas()) return;
    ui.bildLager.hidden = true;
    if (fokus && bildFran && document.contains(bildFran)) bildFran.focus({ preventScroll: true });
    bildFran = null;
  }

  function bytNiva(id) {
    const pa = nr, avsnitt = pa ? sidor[pa - 1].avsnitt.id : null;
    // avsnitten fram till och med det där eleven är, närmast först (Fördjupning kan ha ett avsnitt som andra nivåer
    // saknar: då det närmaste föregående som finns på den nya nivån)
    const fore = byggBok(nivaId).avsnitt.map(a => a.id), bakat = fore.slice(0, fore.indexOf(avsnitt) + 1).reverse();
    satsNiva(id);
    ritaNivaval();
    tillbaka = null;
    layout();
    // samma avsnitt på den andra nivån, från dess början (på omslaget: omslaget)
    const delar = byggBok(id).delar, d = bakat.map(x => delar.find(dd => dd.avsnitt.id === x)).find(Boolean);
    nr = pa === 0 ? 0 : d ? sidaFor(d.poster[0].id) : 1;
    plats = platsFor(sida(nr));
    history.replaceState({ bok: true }, '', adress(sida(nr).ankare));
    rita(0);
    ui.meddela.textContent = `Nivå: ${nivaNamn(id)}.`;
  }

  /* ---------- Nivåfilerna: en per nivå, innehall/<nivå>.js (med texter innehall/<text>/<nivå>.js). En tom fil ger
     en nivå som kommer. Filen anropar Bok.niva(...) som vanligt; vilken text den hör till står på dess script-tagg. ---------- */

  // Kapitlets gemensamma data (omslaget): kapitel: '../kapitel.js' i delkapitel.js. Filen anropar Bok.kapitel(...).
  function laddaKapitel() {
    if (!info.kapitel) return Promise.resolve();
    return new Promise(ok => {
      const s = h('script', { src: info.kapitel });
      s.onload = () => { if (!kapitel) anmal(`${info.kapitel} anropade inte Bok.kapitel(…)`); ok(); };
      s.onerror = () => { anmal(`${info.kapitel} saknas (kapitel i delkapitel.js)`); ok(); };
      document.head.append(s);
    });
  }

  function laddaNiva(n, t = '') {
    return new Promise(ok => {
      const fil = nivaFil(t, n.id);
      const s = h('script', { src: fil, 'data-text': t || null });
      s.onload = () => { if (!(bokNyckel(t, n.id) in nivadata)) anmal(`${fil} anropade inte Bok.niva('${n.id}', …)`); ok(); };
      s.onerror = () => { anmal(`${fil} saknas – varje nivå har en fil, också en tom`); ok(); };
      document.head.append(s);
    });
  }

  /* ---------- Kontrolläget: ?kontroll i adressen ---------- */

  // Det som motorn kan se i data men inte rita rätt: okända blocktyper och figurer, länkar till okända hjälpmedel, och
  // numrerade avsnitt som inte slutar med en länk till öva/självskattning (varning).
  function strukturkoll(bok, ut) {
    const ids = hjalpmedel().map(x => x.id);
    for (const p of bok.poster) {
      const b = p.b, kalla = `${bok.id}, ”${p.avsnitt.titel}”`;
      if (!b) continue;
      if (!blocktyper[b.typ] && b.typ !== 'sidbrytning') ut.problem.push(`${kalla}: okänd blocktyp ”${b.typ}”`);
      if (b.typ === 'figur' && !figurer[b.namn]) ut.problem.push(`${kalla}: figuren ”${b.namn}” finns inte`);
      if (b.typ === 'lank') [].concat(b.till || []).filter(id => !ids.includes(id))
        .forEach(id => ut.problem.push(`${kalla}: länk till okänt hjälpmedel ”${id}”`));
      // En läsplats (ett block-id) slås upp bland adresserna först: samma namn som en annan rubriks adress ger fel plats
      const a = bok.ankare.get(p.id);
      if (a && a !== p) ut.problem.push(`${kalla}: blockets id ”${p.id}” är också adressen till rubriken ”${renText(a.b ? a.b.text : a.avsnitt.titel)}” – byt id`);
    }
    // Länken till hjälpmedlen står sist i det sista numrerade avsnittet (och i Sammanfattningen), inte i varje avsnitt.
    // En nivå utöver plattformens tre (Djupdykning) behöver ingen länk.
    const numrerade = egenNiva(bok.niva) ? [] : bok.delar.filter(d => d.avsnitt.nummer), d = numrerade[numrerade.length - 1];
    const sista = d && d.poster.filter(p => p.typ !== 'upphov').pop();
    if (d && (!sista || sista.typ !== 'lank')) ut.varningar.push(`${bok.id}: det sista avsnittet ”${d.avsnitt.titel}” slutar inte med en länk till hjälpmedlen`);
  }

  // Varje bok bryts i Chromebookens två mått och i det här fönstret (på mobilen: mobilens mått). Rött: en sida som
  // inte får plats, ett brott mot brytningsreglerna eller en tunn sida (under 40 %, utom sist i ett avsnitt eller
  // före en sidbrytning).
  function kontrollera() {
    const ut = { problem: problem.slice(), varningar: [], nivaer: {} };
    if (harOmslag() && kapitel.illustration && !illustrationer[kapitel.illustration]) ut.problem.push(`kapitel.js: illustrationen ”${kapitel.illustration}” finns inte (Bok.illustration i figurer.js)`);
    ut.omslag = harOmslag();
    const mobil = matchMedia(MOBIL).matches;
    const storlekar = MALSKARMAR.map(([n, B, H]) => [n, B, H, false]);
    // Mobilen: boken har en list överst (44 px) och en längst ner (52 px), se bok.css
    storlekar.push(mobil ? ['mobilen (det här fönstret)', innerWidth, innerHeight - 96, true] : ['det här fönstret', innerWidth, innerHeight, false]);
    let antalFel = 0;
    const rader = [];
    // Varje bok: en per nivå, och per text om delkapitlet har texter (nyckeln då "text/nivå")
    for (const t of texter()) for (const n of info.nivaer) {
      const nyck = bokNyckel(t.id, n.id), namn = (t.id ? t.titel + ', ' : '') + nivaNamn(n.id);
      if (!(nyck in nivadata)) { ut.nivaer[nyck] = 'saknas'; rader.push(`${namn}: saknas`); continue; }
      if (!harInnehall(n.id, t.id)) { ut.nivaer[nyck] = 'tom – kommer'; rader.push(`${namn}: tom – kommer`); continue; }
      const bok = byggBok(n.id, t.id), matt = {};
      strukturkoll(bok, ut);
      for (const [mnamn, B, H, m] of storlekar) {
        const g = geometri(B, H, m), r = bryt(bok, g), { brott, tunna } = regelkoll(r, bok);
        const for_stora = r.sidor.filter(s => s.over).map(s => ({ sida: s.nr, px: s.over }));
        // Elevens brytning litar på räkningen (provar bara nästan fulla sidor); den ska bli densamma som den provade
        const spar = x => x.sidor.map(s => s.poster.map(p => p.id).join(',')).join('|');
        if (spar(paginera(bok, g, false)) !== spar(r)) brott.push('elevens snabba brytning skiljer sig från den provade (räkningen stämmer inte)');
        antalFel += for_stora.length + brott.length + tunna.length;
        brott.concat(tunna).forEach(x => ut.problem.push(`${namn}, ${mnamn}: ${x}`));
        matt[mnamn] = { storlek: `${Math.round(B)}×${Math.round(H)}`, text: g.fs.toFixed(2) + ' px', uppslag: g.uppslag, sidor: r.sidor.length,
          ms: r.ms, for_stora, brott, tunna, minstFylld: Math.round(100 * Math.min(...r.sidor.filter(s => s.typ !== 'innehall' && !s.sist).map(s => s.fyll), 1)) };
      }
      ut.nivaer[nyck] = { sidor: Math.max(...Object.values(matt).map(m => m.sidor)), matt };
      rader.push(`${namn}: ` + Object.entries(matt).map(([mnamn, m]) =>
        `${mnamn} (${m.storlek}, ${m.text}) ${m.sidor} sidor, ` + (m.for_stora.length ? 'får inte plats – ' + m.for_stora.map(f => `sida ${f.sida} (+${f.px} px)`).join(', ') : 'alla får plats')).join('; '));
    }
    // Grindens prov: rubrikernas adresser i boken som visas (adress → block)
    // (rubrikernas adresser räknas per nivå: avsnitt-id-n är den n:te rubriken i avsnittet på just den nivån)
    if (nivaId) { ut.ankare = [...byggBok(nivaId).ankare].map(([a, p]) => [adress(a).slice(1), p.id]); ut.niva = nivaId; }
    ut.gron = !ut.problem.length && !antalFel;
    document.body.dataset.kontroll = JSON.stringify(ut);
    let p = document.querySelector('.kontrollpanel');
    if (!p) { p = h('div', { class: 'kontrollpanel' }); document.body.append(p); }
    p.classList.toggle('fel', !ut.gron);
    p.replaceChildren(h('strong', null, 'Kontroll: '), ut.gron ? 'grönt' : 'rött',
      ...rader.map(r => h('div', null, r)),
      ...ut.problem.map(r => h('div', { class: 'kp-fel' }, r)),
      ...ut.varningar.map(r => h('div', { class: 'kp-varning' }, r)));
    if (oppen) { aktuell = null; layout(); rita(null); }
  }

  function visaFel(e) {
    console.error(e);
    document.body.append(h('div', { class: 'felmeddelande' }, h('strong', null, 'Boken kunde inte visas. '), e.message));
  }

  /* ---------- Det som innehållet anropar ---------- */

  window.Bok = {
    delkapitel(uppgifter) {
      info = Object.assign({ nivaer: NIVAER, standardniva: 'standard' }, uppgifter);
      if (info.texter && !info.texter.length) delete info.texter;
      if (info.texter) info.texter.forEach((t, i) => {
        if (!t.id || !/^[a-z0-9-]+$/.test(t.id) || info.texter.findIndex(x => x.id === t.id) !== i) anmal(`delkapitel.js: text ${i + 1} behöver ett eget id (a–z, 0–9, -), det blir mappen innehall/<id>/`);
        if (!t.titel) anmal(`delkapitel.js: texten ”${t.id}” saknar titel`);
      });
      // som i plattformens andra böcker: "Fysik – Kraft och rörelse – 1. Repetition"
      const smulor = (info.smulor || [info.amne]).map(x => typeof x === 'string' ? x : x.text);
      document.title = smulor.concat(delkapitelNamn()).filter(Boolean).join(' – ');
      const adress = new URLSearchParams(location.search);
      kontroll = adress.has('kontroll');
      provaRubrikSist = kontroll && adress.get('prova') === 'rubrik-sist';   // grindens negativa prov, se paginera
      provaLangsam = kontroll && adress.get('prova') === 'langsam';
      // Bladvändning På (blad) eller Av (direkt); den som valt "Snabb" (före 2026-11-04) får På
      vandning = lager.hamta(nyckel('vandning'), 'blad') === 'direkt' ? 'direkt' : 'blad';
      helskarm = lager.hamta(nyckel('lashelskarm'), true);
      reglage = lager.hamta(nyckel('lasreglage'), 'alltid');
      byggHubb();
      byggBokram();
      Promise.all([laddaKapitel(), ...texter().flatMap(t => info.nivaer.map(n => laddaNiva(n, t.id)))]).then(() => {
        // Texten: den i adressen (?text=), den eleven läste senast, annars den första som har innehåll
        if (info.texter) textId = [adress.get('text'), lager.hamta(nyckel('text'), null), ...info.texter.map(t => t.id)]
          .find(t => t && info.texter.some(x => x.id === t) && info.nivaer.some(n => harInnehall(n.id, t))) || info.texter[0].id;
        const id = [adress.get('niva'), lager.hamta(nyckel('niva'), null), info.standardniva, ...info.nivaer.map(n => n.id)].find(x => x && harInnehall(x));
        if (id) satsNiva(id);
        ritaHubb();
        // En adress som pekar på en rubrik (#atomer-2) öppnar boken där. Hubben läggs under i historiken, så att
        // Stäng och bakåt leder dit och inte bort från delkapitlet.
        const mal = platsIAdressen();
        if (mal && nivaId) { history.replaceState(null, '', utanHash()); oppnaAdress(mal); }
        // Brytningen mäter texten: när typsnitten har laddats görs den om (och sparas), och först då kontrolleras boken.
        // Omslagets typsnitt laddas med (Marcellus används bara där), så att titeln mäts i rätt typsnitt.
        const typsnitt = !document.fonts ? [] : [document.fonts.ready,
          ...(harOmslag() ? ['30px "Marcellus SC"', '50px "Marcellus"'].map(f => document.fonts.load(f).catch(() => {})) : [])];
        Promise.all(typsnitt).then(() => {
          typsnittKlara = true;
          Object.values(bocker).forEach(b => { b.brytningar = {}; });
          if (oppen) { aktuell = null; layout(); rita(null); }
          if (kontroll) requestAnimationFrame(kontrollera);
        });
        document.body.dataset.klar = '1';
      }).catch(visaFel);
    },
    niva(id, data) {
      const s = document.currentScript, t = (s && s.dataset.text) || '';
      try { nivadata[bokNyckel(t, id)] = normalisera(id, data, nivaFil(t, id)); } catch (e) { anmal(e.message); }
    },
    // Kapitlets kapitel.js: det som är gemensamt för delkapitlen – omslagets överrad, titel, illustration och upphov
    kapitel(uppgifter) {
      kapitel = Object.assign({}, uppgifter);
      ['titel', 'illustration'].forEach(k => { if (!kapitel[k]) anmal(`kapitel.js: omslaget saknar ${k}`); });
    },
    blocktyp(namn, fn) { blocktyper[namn] = fn; },
    figur(namn, fn) { figurer[namn] = fn; },
    illustration(namn, fn) { illustrationer[namn] = fn; },
    get sida() { return nr; },
    get plats() { return plats; },                 // läsplatsen: ett block (post-id), 'innehall' eller 'omslag'
    get oppen() { return oppen; },
    sidaFor: x => oppen ? sidaFor(x) : null,       // sidan med ett block eller en rubrik, i den öppna boken
    // Bok.matSidor() bryter boken i Chromebookens fönstermått (eller {sb, sh, fs}) och returnerar sidorna som inte
    // får plats och brotten mot reglerna.
    matSidor(storlek) {
      if (!nivaId) return [];
      const g = storlek ? Object.assign({ uppslag }, storlek) : geometri(MALSKARMAR[0][1], MALSKARMAR[0][2], false);
      const bok = byggBok(nivaId), r = paginera(bok, g);
      if (oppen) { aktuell = null; layout(); rita(null); }
      // sidor: blocken (post-id) på varje sida – grinden jämför brytningen innan och efter att bilderna laddats
      return { for_stora: r.sidor.filter(s => s.over).map(s => ({ sida: s.nr, px: s.over })), ...regelkoll(r, bok),
        sidor: r.sidor.map(s => s.poster.filter(iFlodet).map(p => p.id)),
        bilder: [...r.bildB.keys()].map(e => { const p = bok.poster.find(q => q.el === e), m = p && r.matt.get(p);
          return { post: e.dataset.post, laddad: e.querySelector('img').naturalWidth > 0, bredd: r.bildB.get(e), hojd: m ? Math.round(10 * (m.bottom - m.top)) / 10 : null }; }) };
    },
    // Brytningens tid (ms) för varje bok (text × nivå med innehåll), som för eleven (inte strikt), utan sparad
    // brytning. Ett varv bryter boken i vart och ett av Chromebookens två mått och räknar det längsta av de två. Först
    // ett uppvärmningsvarv som inte räknas, sedan `varv` mätvarv (minst 5): medianen och det längsta per bok.
    // Sidans väntande layout (till exempel efter ett nytt fönstermått) görs före varje brytning, så att den inte räknas in.
    brytTid(varv = 5) {
      if (!nivaId) return null;
      varv = Math.max(5, varv);
      const median = a => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
      const rund = x => Math.round(10 * x) / 10;
      const ut = texter().flatMap(t => info.nivaer.filter(n => harInnehall(n.id, t.id)).map(n => {
        const bok = byggBok(n.id, t.id);
        const ettVarv = () => Math.max(...MALSKARMAR.map(([, B, H]) => { void document.body.offsetHeight; return paginera(bok, geometri(B, H, false), false).ms; }));
        ettVarv();                                                     // uppvärmning, räknas inte
        const tider = Array.from({ length: varv }, ettVarv);
        return { bok: bokNyckel(t.id, n.id), median: rund(median(tider)), max: rund(Math.max(...tider)), varv: tider };
      }));
      if (oppen) { aktuell = null; layout(); rita(null); }
      return { bocker: ut, median: Math.max(...ut.map(b => b.median)), max: Math.max(...ut.map(b => b.max)) };
    },
    gaTill: n => { if (oppen) gaTill(n, { hopp: true }); else oppnaBok(n); }
  };
})();
