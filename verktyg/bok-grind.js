// bok-grind.js – verifierar bokmotorn och varje delkapitel (motorn från Fysikbok; startsidesprovet datastyrt, se provaSidorna).
//
//   node verktyg/bok-grind.js              alla delkapitel (och provboken) i alla lägen
//   node verktyg/bok-grind.js --negativ    negativ verifiering: fyra fel läggs in med flit, ett i taget, och grinden
//                                          ska bli röd för vart och ett i varje läge
//   node verktyg/bok-grind.js --bilder     sparar skärmbilder av hubben och boken (i verktyg/bilder/grind/)
//
// Delkapitlen letas upp på disken: varje mapp <område>/<delkapitel>/ med en delkapitel.js. Ett nytt delkapitel
// kommer alltså med av sig självt. För varje delkapitel prövas:
//   1. att index.html är byte för byte lika med mall/delkapitel/index.html (motorn är fryst; allt annat är data)
//   2. i Chrome (headless), i varje läge nedan: navigeringen (hubb → öppna → bläddra → hoppa → stäng → minns),
//      att alla sidor får plats och att strukturen är hel (?kontroll), och att inga JS-fel uppstår – fångade med
//      window.onerror och unhandledrejection, och med Chromes egna undantag (Runtime.exceptionThrown) som extra nät.
// Har delkapitlet texter (en bok per text) prövas också att en annan text är en egen bok och att varje text minns
// sin sida. Har det ett kapitel (kapitel.js) prövas omslaget: första öppningen, texterna innanför ramen och i
// ordning, motivet under undertiteln, Home till innehållet, och bladvändningen till och från omslaget. Provboken (verktyg/provbok/) har texter och prövar dessutom det som det riktiga innehållet inte använder
// än: en text som är "kommer", en nivå som bara en text har, hjälpmedel med adress, begrepp som länkar, en fjärde
// nivå (djupdykning) och kraftpilarna.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');

const ROT = path.resolve(__dirname, '..');
const MALL = path.join(ROT, 'mall', 'delkapitel', 'index.html');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const NEGATIV = process.argv.includes('--negativ'), BILDER = process.argv.includes('--bilder');
// --bara=<del av namnet>: bara de delkapitel vars namn innehåller texten (snabbt prov medan man arbetar; inte grönt för boken)
const BARA = (process.argv.find(a => a.startsWith('--bara=')) || '').slice(7);
const BILDMAPP = path.join(__dirname, 'bilder', 'grind');

// --webb prövar den publicerade boken (GitHub Pages) i stället för filerna på disken; --webb=<adress> en annan adress.
// Sidorna hämtas då därifrån, men delkapitlen listas och mallen jämförs fortfarande på disken.
const WEBB = process.argv.find(a => a === '--webb' || a.startsWith('--webb='));
const BAS = WEBB ? (WEBB.split('=')[1] || 'https://jb873.github.io/Fysikbok/').replace(/\/?$/, '/')
  : 'file:///' + ROT.replace(/\\/g, '/') + '/';
const adressTill = fil => BAS + path.relative(ROT, fil).split(path.sep).join('/');

// Målskärmen: Chromebook 1366 × 768. I fönstret återstår ca 1366 × 633; 1366 × 768 i fönstret och i helskärm.
// Mobilen är inte målskärm men ska fungera.
const LAGEN = [
  { namn: '1366×633 i fönstret', B: 1366, H: 633, helskarm: false },
  { namn: '1366×768 i fönstret', B: 1366, H: 768, helskarm: false },
  { namn: '1366×768 i helskärm', B: 1366, H: 768, helskarm: true },
  { namn: 'mobil 390×664', B: 390, H: 664, helskarm: true, mobil: true },
  // 13–14-tums Chromebooks med 1920×1080 skalat till 150 % (order 17). Sist, så att LAGEN[0] och LAGEN[3] (mobil) står kvar.
  { namn: '1536×864 i fönstret', B: 1536, H: 864, helskarm: false },
  { namn: '1536×864 i helskärm', B: 1536, H: 864, helskarm: true }
];

// De fyra felen i den negativa verifieringen. Vart och ett ska ge rött i varje läge (V12: samma läge som grinden).
const FEL = {
  'js-fel': `addEventListener('load', () => setTimeout(() => { throw new Error('negativ verifiering: injicerat fel'); }, 0));`,
  'för tät sida': `addEventListener('DOMContentLoaded', () => { const s = document.createElement('style');
    s.textContent = '.sida { font-size: calc(var(--fs) * 1.45) !important; }'; document.head.append(s); });`,
  'stäng fungerar inte': `history.back = () => {};`,
  // motorns provkrok (bara med ?kontroll): en rubrik flyttas sist på sidan före – brytningsreglerna ska ge rött
  'rubrik sist på en sida': { adress: '&prova=rubrik-sist' },
  // en konstgjord fördröjning på 250 ms i varje brytning: medianen ska bli över 200 ms i varje läge
  'långsam brytning': { adress: '&prova=langsam' }
};

const FANGA_FEL = `window.__fel = [];
  window.onerror = function (m, s, l) { window.__fel.push(m + ' (' + String(s).split('/').pop() + ':' + l + ')'); };
  window.addEventListener('unhandledrejection', function (e) { window.__fel.push('unhandledrejection: ' + (e.reason && e.reason.message || e.reason)); });`;

/* ---------- Delkapitlen på disken ---------- */

function delkapitel(allt) {
  const ut = [];
  for (const omr of fs.readdirSync(ROT, { withFileTypes: true })) {
    if (!omr.isDirectory() || ['bokskal', 'mall', 'verktyg', 'node_modules', 'Arkiv'].includes(omr.name) || omr.name.startsWith('.')) continue;
    for (const d of fs.readdirSync(path.join(ROT, omr.name), { withFileTypes: true })) {
      const mapp = path.join(ROT, omr.name, d.name);
      if (d.isDirectory() && fs.existsSync(path.join(mapp, 'delkapitel.js'))) ut.push({ namn: `${omr.name}/${d.name}`, mapp, prov: false });
    }
  }
  const prov = path.join(__dirname, 'provbok');
  if (fs.existsSync(path.join(prov, 'delkapitel.js'))) ut.push({ namn: 'verktyg/provbok (provdata)', mapp: prov, prov: true });
  // Läget utan texter (en bok per nivå, texterna är dess avsnitt): det vanliga scenariot, inget provscenario
  const utan = path.join(__dirname, 'provbok-utan-texter');
  if (fs.existsSync(path.join(utan, 'delkapitel.js'))) ut.push({ namn: 'verktyg/provbok-utan-texter (provdata)', mapp: utan, prov: false });
  return BARA && !allt ? ut.filter(d => d.namn.includes(BARA)) : ut;
}

/* ---------- Chrome via DevTools-protokollet ---------- */

const vanta = ms => new Promise(r => setTimeout(r, ms));
const hamtaJson = u => new Promise((ok, fel) => http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { ok(JSON.parse(d)); } catch (e) { fel(e); } }); }).on('error', fel));

async function chrome() {
  const port = 9400 + Math.floor(Math.random() * 500);
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'bok-grind-profil-'));
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, 'about:blank'], { stdio: 'ignore' });
  let mal;
  for (let i = 0; i < 60 && !mal; i++) { await vanta(200); try { mal = (await hamtaJson(`http://127.0.0.1:${port}/json`)).find(t => t.type === 'page'); } catch (e) { /* startar */ } }
  if (!mal) throw new Error('Chrome startade inte (' + CHROME + ')');
  const ws = new WebSocket(mal.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const vant = {}, undantag = [];
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.id && vant[d.id]) { vant[d.id](d); delete vant[d.id]; }
    if (d.method === 'Runtime.exceptionThrown') undantag.push(d.params.exceptionDetails.exception ? d.params.exceptionDetails.exception.description.split('\n')[0] : d.params.exceptionDetails.text);
    // __gest({x, y}) i sidan: ett riktigt musklick där, som en elevs – det ger webbläsaren en äkta användargest
    // (helskärm kräver en sådan, och en programmerad gest gäller bara några sekunder).
    if (d.method === 'Runtime.bindingCalled' && d.params.name === '__gest') {
      const { x, y } = JSON.parse(d.params.payload);
      // stängs Chrome mitt i klicket blir det ett undantag i körningen (rött), inte en krasch i grinden
      ['mousePressed', 'mouseReleased'].reduce((p, type) => p.then(() => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 })), Promise.resolve())
        .catch(e => undantag.push('grinden: ' + e.message));
    }
  };
  // Ett anrop som inte får svar (Chrome har stängts eller hängt sig) ger fel efter två minuter – grinden blir röd
  // i stället för att vänta för evigt.
  ws.onclose = () => Object.keys(vant).forEach(i => vant[i]({ error: 'Chrome stängdes' }));
  const send = (method, params = {}) => new Promise((ok, fel) => {
    const i = ++id, t = setTimeout(() => { delete vant[i]; fel(new Error(method + ': inget svar från Chrome')); }, 120000);
    vant[i] = d => { clearTimeout(t); d.error && d.error === 'Chrome stängdes' ? fel(new Error(method + ': Chrome stängdes')) : ok(d); };
    if (ws.readyState !== 1) return vant[i]({ error: 'Chrome stängdes' });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const ev = async uttryck => {
    const svar = (await send('Runtime.evaluate', { expression: uttryck, awaitPromise: true, returnByValue: true, userGesture: true })).result;
    if (svar.exceptionDetails) throw new Error('i sidan: ' + (svar.exceptionDetails.exception ? svar.exceptionDetails.exception.description : svar.exceptionDetails.text));
    return svar.result.value;
  };
  const stang = async () => {
    try { ws.close(); } catch (e) { /* redan stängd */ }
    // Har Chrome redan avslutats kommer inget nytt 'exit' – vänta då inte (annars hänger grinden)
    if (proc.exitCode === null && proc.signalCode === null) {
      proc.kill();
      await Promise.race([new Promise(r => proc.once('exit', r).once('error', r)), vanta(10000)]);
    }
    try { fs.rmSync(profil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) { /* Windows släpper filen senare; tmp städas av systemet */ }
  };
  return { send, ev, undantag, stang };
}

/* ---------- Figurerna i den öppna boken: rörelsespår och kraftpar mäts ----------
 * Bläddrar igenom boken och mäter
 *  - rörelsespåren: likformig lika avstånd, accelererande avstånd som växer jämnt, retarderad avstånd som krymper
 *    jämnt, olikformig avstånd som både växer och krymper; strålens pilspets till höger om prickarna;
 *  - kraftparen: två föremål och två pilar, var och en från sitt föremåls mitt, lika långa och motriktade – mot det
 *    andra föremålet (drag) eller ifrån det (knuff);
 *  - friktionen: ytorna hakar i varandra utan att gå in i varandra, strecklinjerna korsar inga rubriker, draget åt
 *    höger och friktionen åt vänster, lika långa och från samma punkt på blocket; samma ytor ger samma mönster;
 *  - bildpilarna: fotot laddas, pilarna i lika är lika långa (±1 px på skärmen), ingen pil eller etikett utanför
 *    utsnittet, etiketterna överlappar inte varandra;
 *  - bildfiguren (order 11): högst 35 % av sidhöjden med bildtexten, högst spaltens bredd, bildens proportioner, bilden
 *    laddas; den första öppnas större (minst som i texten, högst 90 % × 85 % av fönstret, mörk botten), tangenterna
 *    bläddrar inte, Esc/klick utanför/Stäng stänger, fokus tillbaka, läsplatsen densamma. (Brytningen innan och efter
 *    att bilderna laddats: i kor, BLOCKERA.)
 * Klistras in i scenarierna (behöver v, $, $$, tangent och oppen). */
const FIGURKOLL = String.raw`const figurKoll = async () => {
    const sett = new Map(), par = new Map(), fr = new Map(), bp = new Map(), tal = new Set(), st = new Map(), fp = new Map(), hs = new Map(), bb = new Map(), rf = new Map();
    // g och N/kg i rubriker, innehållet, sidhuvudet och tabellhuvuden: i vanlig stil med rätt skiftläge (span.sym i
    // EB Garamond, inte kapitäler – där blir g ett G och kg KG)
    const SYMKOLL = /(?<![\p{L}\p{N}\/])(?:N\/kg|g)(?![\p{L}\p{N}\/²³])/gu, symSett = new Set(), symFel = [];
    // ett vanligt (brytbart) mellanslag mellan ett tal och en enhet, eller i ett tusental, i texten (inte i figurerna)
    const BRYTS = /\d (?:\d{3}(?!\d)|(?:km\/h|m\/s|g\/cm³|kg\/m³|cm³|m³|°C|kN|N|kJ|J|kW|W|kg|g|km|cm|mm|m|min|h|s|%)(?![\p{L}\p{N}]))/u;
    for (let n = 1; n <= $$('.lr-sida').length; n++) {
      Bok.gaTill(n); await v(30);
      $$('.scen .sida[data-nr="' + n + '"] .sidinnehall').forEach(s => {
        const w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT); let t;
        while ((t = w.nextNode())) if (!t.parentElement.closest('svg')) { const m = t.textContent.match(BRYTS); if (m) tal.add('s. ' + n + ': ”' + t.textContent.slice(Math.max(0, m.index - 12), m.index + 10) + '”'); }
      });
      $$('.scen .sida[data-nr="' + n + '"]').forEach(s => s.querySelectorAll('h1, h2, h3, h4, thead th, .toc-titel, .sh-namn, .boktitel').forEach(e => {
        const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let t;
        while ((t = w.nextNode())) for (const m of t.textContent.matchAll(SYMKOLL)) {
          const p = t.parentElement, cs = getComputedStyle(p), id = e.tagName + ' ' + m[0] + ' i ”' + e.textContent.trim().slice(0, 50) + '”';
          if (symSett.has(id)) continue;
          symSett.add(id);
          if (!(p.classList.contains('sym') && p.textContent === m[0] && cs.fontVariantCaps === 'normal' && cs.textTransform === 'none' && cs.fontFamily.includes('EB Garamond')))
            symFel.push('s. ' + n + ': ' + id + ' (' + cs.fontFamily.split(',')[0] + ', ' + cs.fontVariantCaps + ')');
        }
      }));
      $$('.scen svg[data-rorelse]').forEach(s => {
        const id = s.closest('[data-post]').dataset.post;
        if (!sett.has(id)) sett.set(id, { typ: s.dataset.rorelse, xs: [...s.querySelectorAll('circle.fig-prick')].map(c => c.cx.baseVal.value),
          spets: Math.max(...[...s.querySelectorAll('.fig-pilspets')].flatMap(p => [...p.points].map(q => q.x))) });
      });
      $$('.scen svg[data-kraftpar]').forEach(s => {
        const id = s.closest('[data-post]').dataset.post;
        if (!par.has(id)) par.set(id, { satt: s.dataset.kraftpar,
          mitt: [...s.querySelectorAll('rect.fig-foremal')].map(r => [r.x.baseVal.value + r.width.baseVal.value / 2, r.y.baseVal.value + r.height.baseVal.value / 2]),
          pilar: [...s.querySelectorAll('g.fig-kraftpar-pil')].map(g => { const l = g.querySelector('line'), t = g.querySelector('polygon').points[0];
            return { x1: l.x1.baseVal.value, y1: l.y1.baseVal.value, x2: t.x, y2: t.y }; }) });
      });
      $$('.scen svg[data-friktion]').forEach(s => {
        const id = s.closest('[data-post]').dataset.post;
        if (fr.has(id)) return;
        const punkter = k => { const p = s.querySelector('polyline.' + k); return p ? [...p.points].map(q => [q.x, q.y]) : []; };
        const ytlinjer = [...s.querySelectorAll('polyline.fig-ytlinje')];
        fr.set(id, { ytor: s.dataset.friktion, ritad: !!s.querySelector('polygon.fig-yta-foremal') && !!s.querySelector('polygon.fig-yta-underlag'),
          rubriker: [...s.querySelectorAll('text.fig-rubrik')].map(t => { const b = t.getBBox(); return [b.x, b.y, b.x + b.width, b.y + b.height, t.textContent]; }),
          linjer: [...s.querySelectorAll('line.fig-lupplinje')].map(l => [l.x1.baseVal.value, l.y1.baseVal.value, l.x2.baseVal.value, l.y2.baseVal.value]),
          undersida: ytlinjer[0] ? [...ytlinjer[0].points].map(q => [q.x, q.y]) : [], yta: punkter('fig-ytlinje-underlag'),
          pilar: [...s.querySelectorAll('g.fig-friktion-pil')].map(g => { const l = g.querySelector('line'), t = g.querySelector('polygon').points[0];
            return { kraft: g.dataset.kraft, x1: l.x1.baseVal.value, y1: l.y1.baseVal.value, x2: t.x, y2: t.y }; }) });
      });
      // stoppsträckan: staplarnas delar mot värdena, totalen och markeringen (mäts direkt, i skärmens pixlar)
      $$('.scen svg[data-stoppstracka]').forEach(s => {
        const id = s.closest('[data-post]').dataset.post;
        if (st.has(id)) return;
        const r = s.getBoundingClientRect(), vb = s.viewBox.baseVal, sk = Math.min(r.width / vb.width, r.height / vb.height);
        const x0 = +s.dataset.x0, k = +s.dataset.k, f_ = [];
        s.querySelectorAll('g.fig-stopp-rad').forEach((g, i) => {
          const re = +g.dataset.reaktion, br = +g.dataset.broms, a = g.querySelector('rect.fig-stopp-reaktion'), b = g.querySelector('rect.fig-stopp-broms');
          const tot = g.querySelector('text.fig-stopp-total').textContent, totV = parseFloat(tot.replace(',', '.'));
          if (Math.abs(a.x.baseVal.value - x0) * sk > 1 || Math.abs(a.width.baseVal.value - re * k) * sk > 1) f_.push('rad ' + (i + 1) + ': reaktionssträckan');
          if (Math.abs(b.x.baseVal.value - (x0 + re * k)) * sk > 1 || Math.abs(b.width.baseVal.value - br * k) * sk > 1) f_.push('rad ' + (i + 1) + ': bromssträckan');
          if (Math.abs(totV - (re + br)) > 0.001 || !/ /.test(tot)) f_.push('rad ' + (i + 1) + ': totalen ”' + tot + '”');
        });
        const m = s.querySelector('line.fig-stopp-markering');
        if (m && Math.abs(m.x1.baseVal.value - (x0 + +m.dataset.varde * k)) * sk > 1) f_.push('markeringen på fel ställe');
        st.set(id, { rader: s.querySelectorAll('g.fig-stopp-rad').length, markering: !!m, fel: f_ });
      });
      // den fallande hissen: tyngdkraften lika lång i båda panelerna, och i den stilla hissen lika lång som normalkraften
      // (åt motsatt håll); i den fallande ingen normalkraft
      $$('.scen svg[data-fallande-hiss]').forEach(s => {
        const id = s.closest('[data-post]').dataset.post;
        if (hs.has(id)) return;
        const pil = g => { const l = g.querySelector('line'), t = g.querySelector('polygon').points[0]; return t.y - l.y1.baseVal.value; };
        const paneler = [...s.querySelectorAll('g.fig-hiss')].map(g => ({ faller: g.dataset.faller === 'true',
          tyngd: [...g.querySelectorAll('g.fig-hiss-pil[data-kraft="tyngd"]')].map(pil), normal: [...g.querySelectorAll('g.fig-hiss-pil[data-kraft="normal"]')].map(pil) }));
        const f_ = [], still = paneler.find(p => !p.faller), faller = paneler.find(p => p.faller);
        if (!still || !faller || still.tyngd.length !== 1 || faller.tyngd.length !== 1) f_.push('panelerna saknar tyngdkraften');
        else {
          if (Math.abs(still.tyngd[0] - faller.tyngd[0]) > 0.5) f_.push('tyngdkraften olika lång i panelerna: ' + still.tyngd[0] + '/' + faller.tyngd[0]);
          if (still.normal.length !== 1 || Math.abs(still.normal[0] + still.tyngd[0]) > 0.5 || !(still.tyngd[0] > 0)) f_.push('normalkraften i den stilla hissen: ' + still.normal.join(','));
          if (faller.normal.length) f_.push('normalkraft i den fallande hissen');
        }
        hs.set(id, { fel: f_ });
      });
      // friktion i paneler: i varje panel ligger ytorna an utan att gå in i varandra, och panelen har en rubrik
      $$('.scen svg[data-friktion-paneler]').forEach(s => {
        const id = s.closest('[data-post]').dataset.post;
        if (fp.has(id)) return;
        const f_ = [];
        s.querySelectorAll('g.fig-friktion-panel').forEach((g, i) => {
          const u = [...g.querySelector('polyline.fig-ytlinje:not(.fig-ytlinje-underlag)').points], y = [...g.querySelector('polyline.fig-ytlinje-underlag').points];
          const glapp = y.map((p, j) => p.y - u[j].y);
          if (u.length !== y.length || glapp.some(v => v < 0)) f_.push('panel ' + (i + 1) + ': föremålet går ner i underlaget');
          else if (!glapp.some(v => v < 1.5)) f_.push('panel ' + (i + 1) + ': ytorna ligger inte an');
          if (!g.querySelector('text.fig-rubrik') || !g.querySelector('text.fig-rubrik').textContent.trim()) f_.push('panel ' + (i + 1) + ': ingen rubrik');
        });
        fp.set(id, { paneler: s.querySelectorAll('g.fig-friktion-panel').length, fel: f_ });
      });
      $$('.scen svg[data-bildpilar]').forEach(s => {
        const id = s.closest('[data-post]').dataset.post;
        if (bp.has(id)) return;
        // bildens yta i rutan: ett stående foto begränsas av höjden och står i mitten av en bredare ruta
        const r = s.getBoundingClientRect(), vb = s.viewBox.baseVal, img = s.querySelector('image');
        const sk = Math.min(r.width / vb.width, r.height / vb.height), ox = (r.width - vb.width * sk) / 2, oy = (r.height - vb.height * sk) / 2;
        const ruta = e => { const q = e.getBoundingClientRect(); return [q.left - r.left - ox, q.top - r.top - oy, q.right - r.left - ox, q.bottom - r.top - oy]; };
        bp.set(id, { vb: [vb.width, vb.height], px: sk, lika: JSON.parse(s.dataset.lika || '[]'), antal: +s.dataset.bildpilar,
          bild: img ? { href: new URL(img.getAttribute('href'), location.href).href, b: img.width.baseVal.value, h: img.height.baseVal.value } : null,
          pilar: [...s.querySelectorAll('g.fig-bildpil')].map(g => { const l = g.querySelector('line.fig-bildpil-rod'), t = g.querySelector('polygon.fig-bildpil-rod').points[0];
            return { x1: l.x1.baseVal.value, y1: l.y1.baseVal.value, x2: t.x, y2: t.y }; }),
          etiketter: [...s.querySelectorAll('text.fig-bildpil-text')].map(t => ({ namn: t.textContent, ruta: ruta(t) })), bredd: vb.width * sk, hojd: vb.height * sk,
          prickar: [...s.querySelectorAll('circle.fig-bildpil-lage')].map(c => [c.cx.baseVal.value, c.cy.baseVal.value]),
          strale: [...s.querySelectorAll('g.fig-bildpil-strale line.fig-bildpil-rod')].map(l => [l.x1.baseVal.value, l.y1.baseVal.value, l.x2.baseVal.value, l.y2.baseVal.value]),
          // etikettens storlek på skärmen: textens storlek i figurens enheter gånger figurens skala
          minPx: Math.min(...[...s.querySelectorAll('text.fig-bildpil-text')].map(t => parseFloat(getComputedStyle(t).fontSize) * sk)) });
      });
      // rutans fundera (order 15): kursiv och sist i rutan, efter punktlistan
      $$('.scen aside.b-ruta .b-ruta-fundera').forEach(p => {
        const id = p.closest('[data-post]').dataset.post;
        if (rf.has(id)) return;
        const ruta = p.parentElement, lista = ruta.querySelector(':scope > .b-punkter'), f_ = [];
        if (ruta.lastElementChild !== p) f_.push('fundera står inte sist i rutan');
        if (lista && !(lista.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING)) f_.push('fundera står före punkterna');
        if (getComputedStyle(p).fontStyle !== 'italic') f_.push('fundera är inte kursiv');
        rf.set(id, f_);
      });
      // bildfiguren (order 11): figurens höjd med bildtexten mot sidhöjden, bildens storlek mot spalten och data
      $$('.scen figure.b-bild').forEach(f => {
        const id = f.dataset.post;
        if (bb.has(id)) return;
        const sh = parseFloat($('.scen').style.getPropertyValue('--sh')), r = f.getBoundingClientRect(), i = f.querySelector('.figur-bild img').getBoundingClientRect();
        bb.set(id, { sida: n, andel: r.height / sh, b: i.width, h: i.height, spalt: f.clientWidth, kvot: f.dataset.bredd / f.dataset.hojd,
          href: new URL(f.dataset.bild, location.href).href, text: !!f.querySelector('figcaption') });
      });
    }
    // bildfiguren: högst 35 % av sidhöjden med bildtexten, högst spaltens bredd, bildens proportioner (data), bilden laddas
    const bbFel = [], bbLaddad = {};
    for (const [id, x] of bb) {
      const f_ = [];
      if (!(x.andel <= 0.35 + 0.001)) f_.push('figuren är ' + (100 * x.andel).toFixed(1) + ' % av sidhöjden (högst 35)');
      if (x.b > x.spalt + 0.5) f_.push('bilden är bredare än spalten: ' + x.b.toFixed(1) + ' > ' + x.spalt);
      if (Math.abs(x.b / x.h - x.kvot) > 0.01) f_.push('proportionerna ' + (x.b / x.h).toFixed(3) + ' mot ' + x.kvot.toFixed(3) + ' i data');
      if (!(x.href in bbLaddad)) bbLaddad[x.href] = await new Promise(ok => { const i = new Image(); i.onload = () => ok([i.naturalWidth, i.naturalHeight]); i.onerror = () => ok(null); i.src = x.href; });
      const nat = bbLaddad[x.href];
      if (!nat) f_.push('bilden laddas inte (' + x.href.split('/').pop() + ')');
      else if (Math.abs(nat[0] / nat[1] - x.kvot) > 0.005) f_.push('bildens proportioner ' + nat.join('×') + ' stämmer inte med data');
      if (f_.length) bbFel.push(id + ': ' + f_.join(', '));
    }
    // …och större: den första bildfiguren öppnas med ett klick, mäts och stängs på alla sätt
    let bbProv = null;
    const forstaBild = [...bb.entries()][0];
    if (forstaBild) {
      const [id, x] = forstaBild;
      Bok.gaTill(x.sida); await v(60);
      const f = $('.scen [data-post="' + id + '"]'), knapp = f && f.querySelector('button.figur-knapp'), L = $('.bild-lager');
      const pf = [];
      if (!knapp || knapp.getAttribute('aria-label') !== 'Visa större bild') pf.push('figuren är ingen knapp "Visa större bild"');
      else {
        const plats = Bok.plats, sida = Bok.sida, iT = f.querySelector('.figur-bild img').getBoundingClientRect();
        knapp.focus(); knapp.click(); await v(150);
        const st = $('.bild-stor').getBoundingClientRect(), bg = getComputedStyle(L).backgroundColor.match(/[\d.]+/g).map(Number);
        const lika = Math.abs(st.width - iT.width) < 1 && Math.abs(st.height - iT.height) < 1;
        if (L.hidden) pf.push('klicket öppnar inte lagret');
        if (st.width < iT.width - 0.5 || st.height < iT.height - 0.5) pf.push('större bild ' + Math.round(st.width) + '×' + Math.round(st.height) + ' är mindre än i texten ' + Math.round(iT.width) + '×' + Math.round(iT.height));
        if (!lika && (st.width > 0.9 * innerWidth + 0.5 || st.height > 0.85 * innerHeight + 0.5)) pf.push('större bild ' + Math.round(st.width) + '×' + Math.round(st.height) + ' över 90 %/85 % av fönstret ' + innerWidth + '×' + innerHeight);
        if (Math.abs(st.width / st.height - x.kvot) > 0.01) pf.push('den större bildens proportioner');
        if (!(bg.length === 4 && bg[3] >= 0.6 && bg[3] < 1 && Math.max(bg[0], bg[1], bg[2]) < 60)) pf.push('bakgrunden är inte mörk och genomskinlig: ' + bg.join(','));
        tangent('ArrowRight'); await v(200); tangent('PageDown'); await v(200);
        if (Bok.sida !== sida || L.hidden) pf.push('tangenterna bläddrade medan bilden visades (sida ' + sida + ' → ' + Bok.sida + ')');
        tangent('Escape'); await v(150);
        if (!L.hidden || !oppen()) pf.push('Esc stänger inte bilden (eller stänger boken)');
        if (document.activeElement !== knapp) pf.push('fokus går inte tillbaka till figuren');
        if (Bok.plats !== plats || Bok.sida !== sida) pf.push('läsplatsen ändrades: ' + plats + ' → ' + Bok.plats);
        knapp.click(); await v(120); L.click(); await v(120);
        if (!L.hidden) pf.push('klick utanför bilden stänger inte');
        knapp.click(); await v(120); $('.bild-stang').click(); await v(120);
        if (!L.hidden || document.activeElement !== knapp) pf.push('Stäng stänger inte (eller fokus går inte tillbaka)');
        bbProv = { ok: !pf.length, detalj: id + ': ' + (pf.join(', ') || 'i texten ' + Math.round(iT.width) + '×' + Math.round(iT.height) + ', större ' + Math.round(st.width) + '×' + Math.round(st.height) + ' (fönster ' + innerWidth + '×' + innerHeight + ')') };
      }
      if (pf.length && !bbProv) bbProv = { ok: false, detalj: id + ': ' + pf.join(', ') };
    }
    const fel = [], lika = (p, q) => Math.abs(p - q) < 0.6;
    for (const [id, x] of sett) {
      const a = x.xs.slice(1).map((s, i) => s - x.xs[i]), d = a.slice(1).map((s, i) => s - a[i]);
      const ok = x.typ === 'likformig' ? a.every(s => lika(s, a[0]))
        : x.typ === 'accelererande' ? d.every(s => s > 1 && lika(s, d[0]))
        : x.typ === 'retarderad' ? d.every(s => s < -1 && lika(s, d[0]))
        : x.typ === 'olikformig' && d.some(s => s > 1) && d.some(s => s < -1);
      if (!ok || x.xs.length < 4 || !(x.spets > Math.max(...x.xs))) fel.push(id + ' (' + x.typ + '): ' + a.map(s => Math.round(s)).join(', '));
    }
    const parFel = [];
    for (const [id, x] of par) {
      const [p, q] = x.pilar, [m, n] = x.mitt;
      if (x.pilar.length !== 2 || x.mitt.length !== 2) { parFel.push(id + ': ' + x.mitt.length + ' föremål, ' + x.pilar.length + ' pilar'); continue; }
      const dx = [p.x2 - p.x1, q.x2 - q.x1], dy = [p.y2 - p.y1, q.y2 - q.y1], len = dx.map((s, i) => Math.hypot(s, dy[i]));
      const fran = lika(p.x1, m[0]) && lika(p.y1, m[1]) && lika(q.x1, n[0]) && lika(q.y1, n[1]);
      const mot = lika(dx[0], -dx[1]) && lika(dy[0], -dy[1]);
      const motAndra = Math.sign(dx[0]) === Math.sign(n[0] - m[0]);       // pilen på föremål 1 pekar mot föremål 2
      const ok = fran && lika(len[0], len[1]) && len[0] > 20 && mot && (x.satt === 'drag' ? motAndra : x.satt === 'knuff' && !motAndra);
      if (!ok) parFel.push(id + ' (' + x.satt + '): längd ' + len.map(Math.round).join('/') + ', riktning ' + dx.map(Math.round).join('/') + (fran ? '' : ', börjar inte i föremålens mitt'));
    }
    // friktionen: båda ytorna ritade, blockets undersida aldrig under bordets yta men an mot den någonstans, ytorna
    // ojämna; strecklinjerna korsar ingen rubrik; pilarna (om några) lika långa från samma punkt, draget åt höger och
    // friktionen åt vänster, ovanför bordets yta (på blocket)
    const frFel = [], monster = {};
    for (const [id, x] of fr) {
      const f_ = [];
      if (!x.ritad || x.yta.length < 8 || x.undersida.length !== x.yta.length) f_.push('ytorna saknas');
      else {
        const glapp = x.yta.map((p, i) => p[1] - x.undersida[i][1]);
        if (glapp.some(g => g < 0)) f_.push('blocket går ner i bordet');
        if (!glapp.some(g => g < 1.5)) f_.push('ytorna ligger inte an');
        const ys = x.yta.map(p => p[1]);
        if (Math.max(...ys) - Math.min(...ys) < 2) f_.push('ytan är slät');
      }
      const korsar = x.linjer.filter(([x1, y1, x2, y2]) => x.rubriker.some(([a, b, c, e]) =>
        Array.from({ length: 101 }, (_, i) => [x1 + (x2 - x1) * i / 100, y1 + (y2 - y1) * i / 100]).some(([px, py]) => px > a - 2 && px < c + 2 && py > b - 2 && py < e + 2)));
      if (x.linjer.length !== 2 || x.rubriker.length !== 2 || x.rubriker.some(r => !(r[2] - r[0] > 20)) || korsar.length) f_.push(x.linjer.length + ' strecklinjer, ' + x.rubriker.length + ' rubriker' + (korsar.length ? ', en linje korsar en rubrik' : ''));
      if (x.pilar.length) {
        const [dr, fk] = ['drag', 'friktion'].map(k => x.pilar.find(p => p.kraft === k));
        const yMin = x.yta.length ? Math.min(...x.yta.map(p => p[1])) : 0;
        if (!dr || !fk || x.pilar.length !== 2 || !(dr.x2 > dr.x1) || !(fk.x2 < fk.x1) || !lika(dr.x1, fk.x1) || !lika(dr.y1, fk.y1) ||
          !lika(dr.x2 - dr.x1, fk.x1 - fk.x2) || !lika(dr.y1, dr.y2) || !(dr.y1 < yMin)) f_.push('pilarna: ' + JSON.stringify(x.pilar.map(p => [p.kraft, Math.round(p.x1), Math.round(p.x2)])));
      }
      if (f_.length) frFel.push(id + ' (' + x.ytor + '): ' + f_.join(', '));
      // samma mönster varje gång: samma ytor ger samma punkter
      const nyckel = JSON.stringify(x.yta);
      if (monster[x.ytor] && monster[x.ytor] !== nyckel) frFel.push(id + ': mönstret skiljer sig från en annan figur med samma ytor');
      monster[x.ytor] = nyckel;
    }
    // bildpilarna: fotot laddas (med fotots proportioner), pilarna i lika är lika långa (±1 px på skärmen), ingen pil
    // eller etikett utanför utsnittet, och etiketterna överlappar inte varandra
    const bpFel = [], laddad = {};
    for (const [id, x] of bp) {
      const f_ = [];
      if (!x.bild) f_.push('ingen bild');
      else {
        if (!(x.bild.href in laddad)) laddad[x.bild.href] = await new Promise(ok => { const i = new Image(); i.onload = () => ok([i.naturalWidth, i.naturalHeight]); i.onerror = () => ok(null); i.src = x.bild.href; });
        const n = laddad[x.bild.href];
        if (!n) f_.push('bilden laddas inte (' + x.bild.href.split('/').pop() + ')');
        else if (Math.abs(n[0] / n[1] - x.bild.b / x.bild.h) > 0.005) f_.push('bildens proportioner ' + n.join('×') + ' stämmer inte med data');
      }
      if (x.pilar.length !== x.antal || x.etiketter.length !== x.antal) f_.push(x.pilar.length + ' pilar, ' + x.etiketter.length + ' etiketter, ' + x.antal + ' i data');
      const len = x.pilar.map(p => Math.hypot(p.x2 - p.x1, p.y2 - p.y1) * x.px);
      x.lika.forEach(([a, b]) => { if (!(Math.abs(len[a] - len[b]) <= 1)) f_.push('pil ' + a + ' och ' + b + ' är ' + Math.round(len[a]) + ' och ' + Math.round(len[b]) + ' px'); });
      const ute = (px, py) => px < -0.5 || py < -0.5 || px > x.vb[0] + 0.5 || py > x.vb[1] + 0.5;
      x.pilar.forEach((p, i) => { if (ute(p.x1, p.y1) || ute(p.x2, p.y2)) f_.push('pil ' + i + ' utanför utsnittet'); });
      x.etiketter.forEach(e => { if (e.ruta[0] < -0.5 || e.ruta[1] < -0.5 || e.ruta[2] > x.bredd + 0.5 || e.ruta[3] > x.hojd + 0.5) f_.push('etiketten ”' + e.namn + '” utanför utsnittet'); });
      x.etiketter.forEach((e, i) => x.etiketter.slice(i + 1).forEach(g => { const [a, b] = [e.ruta, g.ruta];
        if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) f_.push('etiketterna ”' + e.namn + '” och ”' + g.namn + '” överlappar'); }));
      if (!(x.minPx >= 13.95)) f_.push('en etikett är bara ' + x.minPx.toFixed(1) + ' px på skärmen (minst 14)');
      // lägesmarkeringarna: lika stora avstånd (±1 px på skärmen) och allt – prickar och stråle – innanför bilden
      const avst = x.prickar.slice(1).map((p, i) => Math.hypot(p[0] - x.prickar[i][0], p[1] - x.prickar[i][1]) * x.px);
      if (avst.length && Math.max(...avst) - Math.min(...avst) > 1) f_.push('prickarnas avstånd är olika: ' + avst.map(a => a.toFixed(1)).join('/') + ' px');
      if (x.prickar.some(p => ute(p[0], p[1]))) f_.push('en prick utanför bilden');
      x.strale.forEach(l => { if (ute(l[0], l[1]) || ute(l[2], l[3])) f_.push('strålen utanför bilden'); });
      if (f_.length) bpFel.push(id + ': ' + f_.join(', '));
    }
    return { antal: sett.size, typer: [...new Set([...sett.values()].map(x => x.typ))], fel,
      par: { antal: par.size, satt: [...new Set([...par.values()].map(x => x.satt))], fel: parFel },
      bp: { antal: bp.size, pilar: [...bp.values()].reduce((a, x) => a + x.pilar.length, 0), fel: bpFel,
        minPx: bp.size ? Math.min(...[...bp.values()].map(x => x.minPx)) : null },
      sym: { antal: symSett.size, fel: symFel },
      st: { antal: st.size, fel: [...st].flatMap(([id, x]) => x.fel.map(e => id + ': ' + e)) },
      fp: { antal: fp.size, fel: [...fp].flatMap(([id, x]) => x.fel.map(e => id + ': ' + e)) },
      hs: { antal: hs.size, fel: [...hs].flatMap(([id, x]) => x.fel.map(e => id + ': ' + e)) },
      bb: { antal: bb.size, fel: bbFel, prov: bbProv, andel: bb.size ? Math.max(...[...bb.values()].map(x => x.andel)) : null },
      rf: { antal: rf.size, fel: [...rf].flatMap(([id, f_]) => f_.map(e => id + ': ' + e)) },
      fr: { antal: fr.size, ytor: [...new Set([...fr.values()].map(x => x.ytor))], pilar: [...fr.values()].map(x => x.pilar.length), monster, fel: frFel }, tal: [...tal] };
  };`;

/* ---------- Scenariot i sidan: bara motorns egna element, så att det gäller varje delkapitel ---------- */

const SCENARIO = String.raw`async (helskarmLage) => {
  const v = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const synlig = s => $$(s).find(e => e.offsetParent !== null);
  const k = [];
  const prova = (namn, ok, detalj) => k.push({ namn, ok: !!ok, detalj: detalj == null ? '' : String(detalj) });
  const syns = () => $$('.scen .uppslag > .sida[data-nr]').map(e => +e.dataset.nr);
  const tangent = t => document.dispatchEvent(new KeyboardEvent('keydown', { key: t, bubbles: true }));
  const oppen = () => !$('.bokapp').hidden;
  const helsk = () => !!document.fullscreenElement;
  const klicka = async (e, ms = 120) => { e.click(); await v(ms); };
  // Det som öppnar boken klickas med musen (__gest i grinden), som en elev gör – helskärm kräver en äkta gest.
  const gest = async (e, ms = 650) => {
    e.scrollIntoView({ block: 'center' }); await v(60);
    const r = e.getBoundingClientRect();
    __gest(JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 })); await v(ms);
  };
  const stangd = () => !oppen() && location.hash === '' && !helsk();
  // Sidorna bryts efter sidmåttet, så platser är block (data-post), inte sidnummer: sidan som visar ett block
  const sidaMed = id => $$('.scen .uppslag > .sida[data-nr]').find(s => s.querySelector('[data-post="' + id + '"]'));
  const visar = id => !!sidaMed(id);
  // Omslaget (kapitel.js): undertiteln, och att texterna står innanför ramen i ordning och motivet under dem
  const harOmslag = JSON.parse(document.body.dataset.kontroll).omslag;
  const omslagUnder = () => $$('.scen .sida.omslag text.omslag-under').map(t => t.textContent).join(' ');
  const omslagKoll = () => {
    const svg = $('.scen .sida.omslag svg');
    if (!svg) return { fel: ['inget omslag i scenen'], text: [] };
    const folie = svg.querySelector('.omslag-folie'), [x0, y0, x1, y1] = folie.dataset.ram.split(' ').map(Number);
    const texter = [...svg.querySelectorAll('.omslag-folie text, text.omslag-under, text.omslag-upphov')];
    const fel = [];
    texter.forEach(t => { const b = t.getBBox();
      if (b.x < x0 + 4 || b.x + b.width > x1 - 4 || b.y < y0 || b.y + b.height > y1) fel.push('”' + t.textContent + '” går utanför ramen'); });
    const y = texter.map(t => +t.getAttribute('y'));
    if (y.some((v, i) => i && v <= y[i - 1])) fel.push('texterna står inte i ordning uppifrån: ' + y.join(', '));
    const ram = folie.querySelectorAll('rect')[1].getBoundingClientRect();
    const delar = [...svg.querySelectorAll('.omslag-motiv > :not(defs):not(.omslag-sken)')].map(e => e.getBoundingClientRect());
    if (!delar.length) fel.push('inget motiv');
    else {
      const m = { top: Math.min(...delar.map(r => r.top)), bottom: Math.max(...delar.map(r => r.bottom)), left: Math.min(...delar.map(r => r.left)), right: Math.max(...delar.map(r => r.right)) };
      const under = [...svg.querySelectorAll('text.omslag-under')].pop(), upphov = svg.querySelector('text.omslag-upphov');
      if (under && m.top < under.getBoundingClientRect().bottom) fel.push('motivet går upp i undertiteln');
      if (upphov && m.bottom > upphov.getBoundingClientRect().top) fel.push('motivet går ned i upphovet');
      if (m.left < ram.left || m.right > ram.right || m.top < ram.top || m.bottom > ram.bottom) fel.push('motivet går utanför ramen');
    }
    return { fel, text: texter.map(t => t.textContent) };
  };
  ${FIGURKOLL}
  // Kontrollpanelen (?kontroll) är redan avläst; på mobilen täcker den annars texterna som musen ska trycka på
  if ($('.kontrollpanel')) $('.kontrollpanel').style.display = 'none';

  // Hubben: plattformens avsnittssida (geografiboken) – hero-banner, flikar, texter och nivåer
  const hero = $('body > header.hero-banner > .hero-inner');
  prova('hubben: hero-banner med brödsmulor, avsnittsetikett, titel och undertitel',
    hero && hero.querySelector('nav.brodsmulor > span.aktuell[aria-current="page"]') && hero.querySelector('span.avsnitt-label') && hero.querySelector('h1') && hero.querySelector('p.subtitel'),
    hero && [...hero.children].map(e => e.textContent.trim()).join(' | '));
  prova('hubben: main.sida direkt efter bannern', hero && hero.parentElement.nextElementSibling === $('main.sida'));
  prova('hubben: sidan är inte bredare än skärmen (annars zoomar mobilen ut)', document.documentElement.scrollWidth <= innerWidth,
    document.documentElement.scrollWidth + ' > ' + innerWidth);
  const flikar = $$('main.sida > .flikar-rad > button.flik');
  prova('hubben: flikarna Föreläsning · Läs · Öva · Elevboken, Läs vald',
    flikar.map(f => f.textContent).join(' · ') === 'Föreläsning · Läs · Öva · Elevboken' && $('.flik.aktiv') && $('.flik.aktiv').dataset.flik === 'laes',
    flikar.map(f => f.textContent + (f.classList.contains('aktiv') ? '*' : '')).join(' · '));
  prova('hubben: en flik vars hjälpmedel saknar adress är tonad ("kommer") och går inte att välja',
    flikar.filter(f => f.getAttribute('aria-disabled') === 'true').every(f => { f.click(); return f.title.includes('kommer') && $('.flik.aktiv').dataset.flik === 'laes' && !$('section.flik-innehall[data-flik="laes"]').classList.contains('dold'); }));
  prova('hubben: inga egna hjälpmedelskort (Självskattning och Begreppsbank hör till kapitelindex)', !$('main.sida .resurs-kort, main.sida [class*="hjalp"]'));
  const nivaer = $$('section[data-flik="laes"] > .niva-valjare > button.niva-knapp');
  prova('hubben: nivåerna 📗 Enkel · 📘 Standard · 📕 Fördjupning',
    ['📗 Enkel', '📘 Standard', '📕 Fördjupning'].every((t, i) => nivaer[i] && nivaer[i].textContent === t), nivaer.map(b => b.textContent).join(' · '));
  const vald = $('.niva-valjare .niva-knapp.aktiv');
  prova('hubben: en nivå med innehåll är vald', vald && !vald.hasAttribute('aria-disabled'), vald && vald.textContent);
  prova('hubben: nivåer utan innehåll är tonade ("kommer") och går inte att välja',
    $$('.niva-valjare .niva-knapp[aria-disabled]').every(b => b.title.includes('kommer')) && (() => { const t = $('.niva-valjare .niva-knapp[aria-disabled]'); if (!t) return true; t.click(); return $('.niva-valjare .niva-knapp.aktiv') === vald; })());
  const texter = $$('section[data-flik="laes"] > .underdel-valjare > button.underdel-knapp');
  prova('hubben: texterna som A, B … med titel, en markerad',
    texter.length > 0 && texter.every((t, i) => t.querySelector('span.underdel-bokstav').textContent === 'ABCDEFGHIJ'[i] && t.querySelector('span.underdel-titel').textContent.trim()) && $$('.underdel-knapp.aktiv').length === 1,
    texter.map(t => t.textContent).join(' | '));
  // Hubben ritar om texterna när boken stängs (den markerade följer eleven): hämta knappen på nytt varje gång
  const text = i => $$('.underdel-knapp')[i];

  // Inställningen "Boken öppnas": i fönstret-lägena väljs I fönstret i menyn, som en elev gör
  if (!helskarmLage) {
    await gest(text(0));
    await klicka(synlig('.bok-innehall'));
    await klicka([...$$('.meny .val button')].find(b => b.dataset.v === 'nej'));
    tangent('Escape'); await v(80);
    await klicka(synlig('.bok-stang'), 400);
    prova('inställning: "Boken öppnas: I fönstret" valdes i menyn', stangd());
  }

  // Öppna: text A på vald nivå
  const textA = text(0), startA = textA.dataset.oppna, titelA = textA.querySelector('.underdel-titel').textContent;
  await gest(textA);
  const antal = $$('.lr-sida').length;
  prova('öppna: ett tryck på en text öppnar boken', oppen());
  prova(helskarmLage ? 'öppna: boken öppnas i helskärm' : 'öppna: boken öppnas i fönstret', helsk() === helskarmLage, 'helskärm=' + helsk());
  if (harOmslag) {
    // Omslaget: första gången öppnas boken där, före innehållet (sida 0); undertiteln är textens namn
    const om = omslagKoll();
    prova('omslag: första gången öppnas boken på omslaget, med textens namn i undertiteln, och adressen pekar på det',
      startA === 'omslag' && JSON.stringify(syns()) === '[0]' && omslagUnder().includes(titelA) && location.hash.endsWith('omslag') && Bok.sida === 0,
      syns() + ' ' + location.hash + ' | ' + omslagUnder() + ' (' + titelA + ', ' + startA + ')');
    prova('omslag: överrad, titel, undertitel och upphov står innanför ramen, i ordning uppifrån, och motivet under undertiteln',
      !om.fel.length, om.fel.join(' | ') || om.text.join(' / '));
    const upp = !!$('.scen .uppslag.ar-uppslag');
    prova(upp ? 'omslag: på uppslaget står omslaget ensamt till höger (boken stängd)' : 'omslag: omslaget fyller sidan',
      upp ? !!$('.scen .uppslag.med-omslag > .fore-omslag + .sida.omslag.hogersida') : (() => { const o = $('.scen .sida.omslag'); if (!o) return false;
        const r = o.getBoundingClientRect(), st = $('.scen').style;
        return Math.abs(r.width - parseFloat(st.getPropertyValue('--sb'))) < 1 && Math.abs(r.height - parseFloat(st.getPropertyValue('--sh'))) < 1; })(),
      $$('.scen .uppslag > *').map(e => e.className).join(' + '));
    const posO = (synlig('.las-sidtext') || synlig('.position') || {}).textContent || '';
    prova('omslag: sidpositionen säger "Omslag", och bakåt går inte längre', posO.includes('Omslag') && (synlig('.sidpil-bak') || synlig('.bottenlist .knapp')).disabled, posO);
    tangent('ArrowRight'); await v(450);
    prova('omslag: → öppnar boken på innehållet (sida 1)', syns()[0] === 1 && !!$('.scen .sida[data-nr="1"] .boktitel'), syns());
    tangent('Home'); await v(80);
    prova('omslag: Home går till innehållet, inte till omslaget', syns()[0] === 1, syns());
  } else prova('öppna: text A öppnar boken där texten börjar, och adressen pekar på en rubrik', visar(startA) && location.hash.length > 1 &&
    sidaMed(startA).querySelector('.sh-namn').textContent.includes(titelA), syns() + ' ' + location.hash + ' (' + titelA + ', ' + startA + ')');
  prova('öppna: delkapitlets sida är inert bakom boken', $('.hero-banner').inert === true && $('main.sida').inert === true);
  const steg = syns().length, s0 = syns()[0];

  // Bläddra
  tangent('ArrowRight'); await v(80);
  prova('bläddra: → visar nästa ' + (steg > 1 ? 'uppslag' : 'sida'), syns()[0] === s0 + steg, syns());
  tangent('ArrowLeft'); await v(80);
  prova('bläddra: ← tillbaka', syns()[0] === s0, syns());
  await klicka(synlig('.sidpil-fram') || synlig('.bottenlist .knapp:last-child'));
  prova('bläddra: pilen bredvid boken', syns()[0] === s0 + steg, syns());

  // Var är jag
  const vis = syns();
  prova('var är jag: lägesremsan markerar just de sidor som syns', JSON.stringify($$('.lr-sida.synlig').map(e => +e.dataset.nr)) === JSON.stringify(vis), $$('.lr-sida.synlig').map(e => e.dataset.nr));
  prova('var är jag: varje synlig sida har sidhuvud och sidnummer', vis.every(n => { const s = $('.scen .sida[data-nr="' + n + '"]'); return s && +s.querySelector('.sh-folio').textContent === n && s.querySelector('.sh-namn').textContent.trim(); }));
  const pos = (synlig('.las-sidtext') || synlig('.position') || {}).textContent || '';
  prova('var är jag: sidpositionen "Sida ' + vis.join('–') + ' av ' + antal + '"', pos.includes('Sida ' + vis.join('–')) && pos.includes('av ' + antal), pos);
  await klicka(synlig('.bok-innehall'));
  // du är här: avsnittet som de synliga sidorna hör till (raden börjar på eller före sidan, nästa rad efter den)
  const tocRader = $$('.meny .toc-a'), markerade = tocRader.filter(b => b.getAttribute('aria-current') === 'page');
  prova('meny: Innehåll öppnar förteckningen med "du är här" vid avsnittet', !$('.meny').hidden && markerade.length >= 1 && markerade.every(b => { const n = tocRader[tocRader.indexOf(b) + 1];
    return +b.dataset.till <= Math.max(...vis) && (!n || +n.dataset.till > Math.min(...vis)); }), markerade.map(b => b.textContent).join(' | ') + ' (sidor ' + vis + ')');
  tangent('Escape'); await v(80);
  prova('meny: Esc stänger menyn, boken är kvar', $('.meny').hidden && oppen());
  tangent('ArrowLeft'); await v(80);

  // Hopp via innehållet i menyn och tillbaka: till ett avsnitt som inte syns (förteckningen har bara avsnitten – i en
  // kort bok syns alla från början, och då hoppar eleven från sista sidan)
  await klicka(synlig('.bok-innehall'));
  const tocTill = () => $$('.meny .toc-knapp').map(b => +b.dataset.till);
  let malsida = tocTill().find(n => n > s0 + 2 * steg) || tocTill().find(n => !syns().includes(n));
  if (!malsida) { tangent('Escape'); await v(80); tangent('End'); await v(80); await klicka(synlig('.bok-innehall')); malsida = tocTill().find(n => !syns().includes(n)); }
  const fore = syns();
  await klicka($('.meny .toc-knapp[data-till="' + malsida + '"]'));
  prova('hoppa: en rad i innehållet går till sidan', $('.meny').hidden && syns().includes(malsida), syns() + ' (mål ' + malsida + ')');
  const chip = synlig('.tillbaka-chip:not([hidden])'), dit = chip && +(chip.textContent.match(/sida (\d+)/) || [])[1];
  prova('hoppa: "Tillbaka till sida x" visas, x där eleven var', fore.includes(dit), chip && chip.textContent);
  if (chip) await klicka(chip);
  prova('hoppa: tillbaka-knappen går tillbaka', syns()[0] === fore[0], syns());
  if (syns()[0] !== s0) { Bok.gaTill(s0); await v(80); }

  // Innehållsförteckningen räknas ur brytningen: varje rad leder till en sida där rubriken (eller avsnittet) syns
  await klicka(synlig('.bok-innehall'));
  const rader = $$('.meny .toc-knapp').map(b => [+b.dataset.till, b.querySelector('.toc-titel').textContent.trim(), b.classList.contains('toc-a'), !!b.querySelector('.toc-nr').textContent.trim(), b.dataset.avsnitt]);
  tangent('Escape'); await v(80);
  const fel = [];
  for (const [till, titel, avsnitt] of rader) {
    Bok.gaTill(till); await v(30);
    const sidan = $('.scen .sida[data-nr="' + till + '"]');
    if (!sidan || !(avsnitt ? sidan.querySelector('.sh-namn').textContent.includes(titel) : $$('.scen .sida[data-nr="' + till + '"] .sidtitel').some(e => e.textContent.trim() === titel))) fel.push(till + ' ' + titel);
  }
  prova('innehåll: varje rad leder till en sida där rubriken syns (' + rader.length + ' rader)', rader.length > 0 && !fel.length, fel.join(' | '));
  // Bara huvudrubrikerna, som i en tryckt bok: en rad per avsnitt (lägesremsans grupper utom innehållssidan), inga ###-rubriker
  const grupper = $$('.lr-grupp').length - 1;
  prova('innehåll: bara huvudrubrikerna (avsnitten) står i förteckningen, inga ###-rubriker (' + rader.length + ' avsnitt)',
    rader.every(r => r[2]) && rader.length === grupper && !$('.meny .toc ol, .meny .toc-s'), rader.length + ' rader, ' + grupper + ' avsnitt');
  tangent('End'); await v(80);
  prova('bläddra: End går till sista sidan', syns().includes(antal), syns());
  tangent('Home'); await v(80);

  // Nivåknappen och menyn – Esc stänger det översta lagret, inte boken
  await klicka(synlig('.bokapp .niva-knapp'));
  const lista = $('.niva-lista');
  prova('nivå: nivåknappen öppnar listan över nivåerna', !lista.hidden && lista.querySelectorAll('button').length === nivaer.length);
  prova('nivå: nivåer utan innehåll går inte att välja i boken', [...lista.querySelectorAll('button[aria-disabled]')].length === $$('.niva-valjare .niva-knapp[aria-disabled]').length);
  tangent('Escape'); await v(80);
  prova('nivå: Esc stänger listan, boken är kvar', lista.hidden && oppen());

  // Nivåbyte i boken: från en rubrik mitt i boken genom alla nivåer med innehåll och tillbaka – varje gång samma
  // avsnitt (sidhuvudets namn). Rörelsespåren och kraftparen kontrolleras på varje nivå.
  const nivaVal = () => [...$('.niva-lista').querySelectorAll('button')];
  const franNiva = nivaVal().findIndex(b => b.getAttribute('aria-checked') === 'true');
  const ovriga = nivaVal().map((b, i) => i).filter(i => i !== franNiva && !nivaVal()[i].hasAttribute('aria-disabled'));
  const valjNiva = async i => { await klicka(synlig('.bokapp .niva-knapp')); await klicka(nivaVal()[i], 250); };
  const spar = [];
  if (ovriga.length) {
    // Avsnitten på varje nivå (förteckningen). Djupdykningen har andra avsnitt än de andra nivåerna.
    const avsnittPa = async i => { await valjNiva(i); await klicka(synlig('.bok-innehall'));
      const r = $$('.meny .toc-a').map(b => ({ till: +b.dataset.till, id: b.dataset.avsnitt, titel: b.querySelector('.toc-titel').textContent.trim() }));
      tangent('Escape'); await v(80); return r; };
    const listor = {};
    for (const i of [franNiva, ...ovriga]) listor[i] = await avsnittPa(i);
    await valjNiva(franNiva);
    // Från ett avsnitt mitt i boken genom alla nivåer och tillbaka: varje gång samma avsnitt, eller – finns det inte på
    // nivån – det närmaste föregående som finns där (sidhuvudets namn)
    const numrerade = rader.filter(r => r[3]), mitt = (numrerade.length ? numrerade : rader)[Math.floor((numrerade.length || rader.length) / 2)];
    Bok.gaTill(mitt[0]); await v(80);
    let nu = mitt[4], fran = franNiva;
    const fel = [], vag = [];
    for (const i of [...ovriga, franNiva]) {
      const ids = listor[fran].map(a => a.id), bakat = ids.slice(0, ids.indexOf(nu) + 1).reverse();
      const mal = bakat.map(id => listor[i].find(a => a.id === id)).find(Boolean);
      await valjNiva(i);
      const s = sidaMed(Bok.plats), dar = s && s.querySelector('.sh-namn').textContent.trim();
      // Har den nya nivån inget av avsnitten (Geografibok order 15: Fördjupning med bara egna avsnitt) går nivåbytet
      // till bokens början – innehållsförteckningen (sida 1) eller omslaget (0) – som från en djupdykning
      if (mal ? !dar || !dar.includes(mal.titel) : !(Bok.sida <= 1)) fel.push(nivaVal()[i].textContent + ': ' + dar + ' (väntat ' + (mal ? mal.titel : 'bokens början') + ', sida ' + Bok.sida + ')');
      vag.push(nivaVal()[i].textContent + ' ' + (mal ? mal.titel : 'bokens början'));
      nu = mal ? mal.id : null;
      fran = i;
    }
    prova('nivå: nivåbyte i boken (' + [franNiva, ...ovriga, franNiva].map(i => nivaVal()[i].textContent).join(' → ') + ') hamnar i samma avsnitt, eller i det närmaste föregående som finns på nivån, och utan något sådant i bokens början',
      !fel.length, 'från ”' + mitt[1] + '”: ' + (fel.length ? fel.join(' | ') : vag.join(' → ')));
    for (const i of ovriga) { await valjNiva(i); spar.push(await figurKoll()); }
    // Ett avsnitt som bara finns på en nivå (III A Fördjupning: Att räkna på rörelse): nivåbytet därifrån går till det
    // närmaste föregående avsnitt som finns på den nya nivån
    let fall = null;
    for (const x of Object.keys(listor)) for (const y of Object.keys(listor)) if (!fall && x !== y) {
      const ids = new Set(listor[y].map(a => a.id)), a = listor[x].find(q => !ids.has(q.id));
      if (a) { const fore = listor[x].slice(0, listor[x].indexOf(a)).reverse().find(q => ids.has(q.id));
        fall = { x: +x, y: +y, a, mal: fore && listor[y].find(q => q.id === fore.id) }; }
    }
    if (fall) {
      await valjNiva(fall.x); Bok.gaTill(fall.a.till); await v(80);
      await valjNiva(fall.y);
      const s = sidaMed(Bok.plats), dar = s && s.querySelector('.sh-namn').textContent.trim();
      prova('nivå: från ett avsnitt som bara finns på en nivå går nivåbytet till närmaste föregående avsnitt på den nya nivån, och utan något sådant till bokens början',
        fall.mal ? !!dar && dar.includes(fall.mal.titel) : Bok.sida <= 1,
        '”' + fall.a.titel + '” (' + nivaVal()[fall.x].textContent + ') → ' + nivaVal()[fall.y].textContent + ': ' + dar + ' (väntat ' + (fall.mal ? fall.mal.titel : 'bokens början') + ', sida ' + Bok.sida + ')');
    }
    await valjNiva(franNiva);
  }
  spar.push(await figurKoll());
  tangent('Home'); await v(80);

  // Läs en bit, stäng med ✕, öppna igen: boken minns läsplatsen (ett block)
  tangent('ArrowRight'); await v(60); tangent('ArrowRight'); await v(60);
  const minne = Bok.plats;
  await klicka(synlig('.bok-stang'), 450);
  prova('stäng: ✕ Stäng går tillbaka till delkapitlet (och lämnar helskärmen)', stangd(), 'hash=' + location.hash + ' helskärm=' + helsk());
  const dar = $('.underdel-knapp.aktiv'), lage = $('section[data-flik="laes"] .intro').textContent;
  prova('stäng: hubben säger var eleven var (texten markerad, läsplatsen nämnd)', dar && dar.dataset.oppna === minne && lage.includes('läste senast'),
    (dar && dar.textContent + ' → ' + dar.dataset.oppna) + ' | ' + lage + ' (mindes ' + minne + ')');
  prova('stäng: fokus tillbaka på texten som öppnade boken', document.activeElement === $('.underdel-knapp[data-fokus="text-a"]'), document.activeElement && document.activeElement.textContent);
  await gest(dar);
  prova('minns: boken öppnas där eleven var (samma block)', visar(minne), syns() + ' (mindes ' + minne + ')');
  prova(helskarmLage ? 'minns: i helskärm igen' : 'minns: i fönstret igen', helsk() === helskarmLage, 'helskärm=' + helsk());

  // Esc: i helskärm tar webbläsaren Esc och lämnar helskärmen – det görs här som webbläsaren gör det
  if (helsk()) await document.exitFullscreen(); else tangent('Escape');
  await v(450);
  prova('stäng: Esc går tillbaka till delkapitlet', stangd(), 'hash=' + location.hash);

  // En annan text öppnar boken där den texten börjar. Har bara en text innehåll (de andra "kommer") öppnas den igen.
  const annan = $('.underdel-knapp[data-oppna]:not(.aktiv)');
  const avsn = annan || $('.underdel-knapp[data-oppna]');
  const start = avsn.dataset.oppna, titel = avsn.querySelector('.underdel-titel').textContent;
  const textB = annan && avsn.dataset.text;          // satt när varje text är en egen bok (texter i delkapitel.js)
  await gest(avsn);
  // en text som inte lästs än öppnas på sitt omslag (undertiteln är textens namn), annars där den börjar
  const paOmslaget = start === 'omslag';
  if (annan) prova('öppna: en annan text öppnar boken där den texten börjar' + (paOmslaget ? ' (på sitt omslag)' : ''),
    visar(start) && (paOmslaget ? omslagUnder().includes(titel) : sidaMed(start).querySelector('.sh-namn').textContent.includes(titel)), syns() + ' (' + titel + ', ' + start + ')');
  else prova('öppna: den enda texten med innehåll öppnas igen där eleven var (de andra är "kommer")', visar(start) &&
    $$('.underdel-knapp:not([data-oppna])').every(b => b.getAttribute('aria-disabled') === 'true'), syns() + ' (' + start + ')');
  if (textB) {
    if (paOmslaget) { const u = omslagUnder(), om = omslagKoll();
      prova('en bok per text: texten är en egen bok med eget omslag', u.includes(titel) && !u.includes(titelA) && !om.fel.length, u + ' (A: ' + titelA + ') ' + om.fel.join(' | ')); }
    tangent('Home'); await v(80);
    const bt = $('.scen .sida[data-nr="1"] .boktitel'), btTitel = bt && bt.firstChild.textContent.trim();
    prova('en bok per text: texten är en egen bok med egen innehållsförteckning', btTitel === titel && btTitel !== titelA, btTitel + ' (A: ' + titelA + ')');
    if (paOmslaget) { tangent('ArrowLeft'); await v(450); }    // tillbaka till omslaget, där boken öppnades
  }
  history.back(); await v(450);
  prova('stäng: webbläsarens bakåt går tillbaka till delkapitlet', stangd(), 'hash=' + location.hash);
  history.forward(); await v(450);
  prova('framåt: boken kommer tillbaka på samma sida', oppen() && visar(start), syns());
  await klicka(synlig('.bok-stang'), 450);
  prova('stäng: igen', stangd());
  if (textB) {
    const aktiv = $('.underdel-knapp.aktiv');
    prova('en bok per text: varje text minns sin egen sida, och den senast lästa är markerad',
      text(0).dataset.oppna === minne && aktiv && aktiv.dataset.text === textB, 'A → ' + text(0).dataset.oppna + ' (mindes ' + minne + '), markerad: ' + (aktiv && aktiv.dataset.text));
  }

  // Figurerna i de andra texterna: varje text med innehåll öppnas och mäts på varje nivå med innehåll
  const andraTexter = $$('.underdel-knapp[data-oppna]').map(b => b.dataset.text).filter(t => t && t !== text(0).dataset.text);
  for (const t of andraTexter) {
    await gest($$('.underdel-knapp').find(b => b.dataset.text === t));
    for (const i of nivaVal().map((b, i) => i).filter(i => !nivaVal()[i].hasAttribute('aria-disabled'))) { await valjNiva(i); spar.push(await figurKoll()); }
    await klicka(synlig('.bok-stang'), 450);
  }
  if (spar.some(x => x.antal)) prova('figur: rörelsespårens avstånd följer rörelsetypen (' + spar.map(x => x.antal).join(' + ') + ' spår)',
    spar.every(x => !x.fel.length), spar.flatMap(x => x.fel).join(' | ') || spar.flatMap(x => x.typer).filter((t, i, l) => l.indexOf(t) === i).join(', '));
  if (spar.some(x => x.par.antal)) prova('figur: kraftparens pilar är lika långa, motriktade och börjar i var sitt föremåls mitt (' + spar.map(x => x.par.antal).join(' + ') + ' par)',
    spar.every(x => !x.par.fel.length), spar.flatMap(x => x.par.fel).join(' | ') || spar.flatMap(x => x.par.satt).filter((t, i, l) => l.indexOf(t) === i).join(', '));
  if (spar.some(x => x.fr.antal)) {
    // samma ytor ska ge samma mönster i alla böcker
    const monster = {}, olika = [];
    spar.forEach(x => Object.entries(x.fr.monster).forEach(([y, m]) => { if (monster[y] && monster[y] !== m) olika.push(y); monster[y] = m; }));
    prova('figur: friktionen – ytorna hakar i varandra, strecklinjerna korsar inga rubriker, draget framåt och friktionen bakåt på blocket, samma mönster varje gång (' + spar.map(x => x.fr.antal).join(' + ') + ' figurer)',
      spar.every(x => !x.fr.fel.length) && !olika.length, spar.flatMap(x => x.fr.fel).concat(olika.map(y => 'mönstret för ' + y + ' skiljer sig mellan böckerna')).join(' | ') || spar.flatMap(x => x.fr.ytor).filter((t, i, l) => l.indexOf(t) === i).join(', '));
  }
  if (spar.some(x => x.bp.antal)) prova('figur: bildpilarna – fotot laddas, pilarna i lika är lika långa (±1 px), ingen pil eller etikett utanför utsnittet, etiketterna överlappar inte och är minst 14 px på skärmen, lägesmarkeringarna har lika stora avstånd (±1 px) inom bilden (' + spar.map(x => x.bp.antal).join(' + ') + ' bilder)',
    spar.every(x => !x.bp.fel.length), spar.flatMap(x => x.bp.fel).join(' | ') ||
      spar.reduce((a, x) => a + x.bp.pilar, 0) + ' pilar, minsta etiketten ' + Math.min(...spar.filter(x => x.bp.antal).map(x => x.bp.minPx)).toFixed(1) + ' px');
  if (spar.some(x => x.st.antal)) prova('figur: stoppsträckan – delarna proportionella mot värdena (±1 px), totalen = summan med hårt mellanslag, markeringen på rätt ställe på skalan (' + spar.map(x => x.st.antal).join(' + ') + ' figurer)',
    spar.every(x => !x.st.fel.length), spar.flatMap(x => x.st.fel).join(' | '));
  if (spar.some(x => x.fp.antal)) prova('figur: friktion i paneler – i varje panel ligger ytorna an utan att gå in i varandra, och panelen har en rubrik (' + spar.map(x => x.fp.antal).join(' + ') + ' figurer)',
    spar.every(x => !x.fp.fel.length), spar.flatMap(x => x.fp.fel).join(' | '));
  if (spar.some(x => x.hs.antal)) prova('figur: den fallande hissen – tyngdkraften lika lång i båda panelerna, i den stilla hissen lika lång som normalkraften, i den fallande ingen normalkraft (' + spar.map(x => x.hs.antal).join(' + ') + ' figurer)',
    spar.every(x => !x.hs.fel.length), spar.flatMap(x => x.hs.fel).join(' | '));
  if (spar.some(x => x.rf.antal)) prova('ruta: fundera står kursiv och sist i rutan, efter punkterna (' + spar.map(x => x.rf.antal).join(' + ') + ' rutor)',
    spar.every(x => !x.rf.fel.length), spar.flatMap(x => x.rf.fel).join(' | '));
  if (spar.some(x => x.bb.antal)) {
    prova('figur: bildfiguren – högst 35 % av sidhöjden med bildtexten, högst spaltens bredd, i bildens proportioner, bilden laddas (' + spar.map(x => x.bb.antal).join(' + ') + ' bilder)',
      spar.every(x => !x.bb.fel.length), spar.flatMap(x => x.bb.fel).join(' | ') || 'högst ' + (100 * Math.max(...spar.filter(x => x.bb.antal).map(x => x.bb.andel))).toFixed(1) + ' % av sidhöjden');
    const pr = spar.map(x => x.bb.prov).filter(Boolean);
    prova('figur: bildfiguren större – ett klick öppnar lagret på mörk botten, bilden minst lika stor som i texten och högst 90 % × 85 % av fönstret, tangenterna bläddrar inte, Esc stänger och fokus går tillbaka till figuren, läsplatsen är densamma, klick utanför och Stäng stänger',
      pr.length > 0 && pr.every(p => p.ok), pr.map(p => p.detalj).join(' | '));
  }
  prova('text: tal och enhet (och tusental) står med hårt mellanslag på varje sida, i varje text och nivå (' + spar.length + ' böcker)',
    spar.every(x => !x.tal.length), spar.flatMap(x => x.tal).slice(0, 6).join(' | '));
  prova('text: g och N/kg i rubriker, innehållet, sidhuvudet och tabellhuvuden står i vanlig stil med rätt skiftläge, inte i kapitäler (' + spar.reduce((a, x) => a + x.sym.antal, 0) + ' ställen)',
    spar.every(x => !x.sym.fel.length), spar.flatMap(x => x.sym.fel).slice(0, 6).join(' | '));
  if (andraTexter.length) prova('figur: figurerna i de andra texterna (' + andraTexter.join(', ') + ') är mätta på varje nivå', stangd(), 'hash=' + location.hash);
  return k;
}`;

// Provboken: det som Materia inte använder än (texter som egna böcker, hjälpmedel med adress, begreppslänkar,
// djupdykning, kraftpilar).
const PROVSCENARIO = String.raw`async () => {
  const v = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const synlig = s => $$(s).find(e => e.offsetParent !== null);
  const k = [];
  const prova = (namn, ok, detalj) => k.push({ namn, ok: !!ok, detalj: detalj == null ? '' : String(detalj) });
  const tangent = t => document.dispatchEvent(new KeyboardEvent('keydown', { key: t, bubbles: true }));
  const oppen = () => !$('.bokapp').hidden;
  prova('prov: en fjärde nivå (Djupdykning) ur data, utan ändring i motorn', $$('.niva-valjare .niva-knapp').map(b => b.textContent).some(t => t.startsWith('Djupdykning')));
  $('.flik[data-flik="ova"]').click(); await v(300);
  const ovaRam = $('section.flik-innehall[data-flik="ova"]:not(.dold) iframe.flik-ram');
  prova('prov: en flik med adress (Öva) visar hjälpmedlet inbäddat (embed=1)', ovaRam && ovaRam.getAttribute('src') === 'hjalpmedel.html?vad=ova&avsnitt=&embed=1' &&
    $('section.flik-innehall[data-flik="laes"]').classList.contains('dold') && $('.flik.aktiv').dataset.flik === 'ova', ovaRam && ovaRam.getAttribute('src'));
  prova('prov: en flik utan adress (Elevboken) är fortfarande "kommer"', $('.flik[data-flik="elevboken"]').getAttribute('aria-disabled') === 'true');
  $('.flik[data-flik="laes"]').click(); await v(100);
  prova('prov: Läs tillbaka – texterna och nivåerna syns igen', !$('section.flik-innehall[data-flik="laes"]').classList.contains('dold') && $('.underdel-knapp').offsetParent !== null);
  $('.underdel-knapp').click(); await v(600);
  tangent('Home'); await v(150);
  const b = $('.scen a.begrepp');
  prova('prov: ett begrepp i texten länkar till begreppslistan', b && b.getAttribute('href') === 'hjalpmedel.html?vad=begrepp#kraft', b && b.getAttribute('href'));
  const b2 = $$('.scen a.begrepp').find(a => a.textContent === 'krafter');
  prova('prov: ett böjt begrepp länkar till grundformen (*krafter|kraft*)', b2 && b2.getAttribute('href').endsWith('#kraft'), b2 && b2.getAttribute('href'));
  b.click(); await v(500);
  const ram = $('.hm-ram');
  prova('prov: begreppet öppnas ovanpå boken, inbäddat (embed=1)', !$('.hm-panel').hidden && ram.getAttribute('src') === 'hjalpmedel.html?vad=begrepp&embed=1#kraft', ram.getAttribute('src'));
  let iframeText = ''; try { iframeText = ram.contentDocument && ram.contentDocument.body ? ram.contentDocument.body.textContent : '(ej läsbar från file://)'; } catch (e) { iframeText = '(ej läsbar)'; }
  tangent('Escape'); await v(100);
  prova('prov: Esc stänger hjälpmedlet, boken är kvar', $('.hm-panel').hidden && oppen());
  // Sidorna bryts efter sidmåttet: leta upp sidan med ett block i stället för att anta vilken det är
  const hitta = async sel => { for (let n = 1; n <= $$('.lr-sida').length; n++) { Bok.gaTill(n); await v(40); if ($('.scen ' + sel)) return $('.scen ' + sel); } return null; };
  const fig = await hitta('.figur-bild[aria-label^="Kraftpilar"]');
  const spetsar = fig ? fig.querySelectorAll('.fig-pilspets').length : 0;
  prova('prov: kraftpilarna ritas ur data – en pil per kraft och resultanten', spetsar === 5, spetsar + ' pilar; ' + (fig && fig.getAttribute('aria-label')));
  prova('prov: resultanten räknas ur krafterna (10 N höger − 4 N vänster = 6 N höger)', fig && /Resultanten 6 N åt höger/.test(fig.getAttribute('aria-label')));
  const linjer = fig ? [...fig.querySelectorAll('line.fig-pil')].map(l => Math.hypot(l.x2.baseVal.value - l.x1.baseVal.value, l.y2.baseVal.value - l.y1.baseVal.value)) : [];
  prova('prov: kraftpilens längd följer storleken (20 N dubbelt så lång som 10 N)', linjer.length >= 3 && Math.abs((linjer[0] + 12.6) / (linjer[2] + 12.6) - 2) < 0.02, linjer.map(Math.round));
  // Sista sidan i avsnittet: länken ut till öva/självskattning
  tangent('End'); await v(100);
  const lank = $$('.scen .b-lank a.lank-post');
  prova('prov: länkblocket i avsnittets slut länkar till Öva med avsnittet ifyllt', lank.some(a => a.getAttribute('href') === 'hjalpmedel.html?vad=ova&avsnitt=krafter'), lank.map(a => a.getAttribute('href')));
  prova('prov: länkblocket visar ett hjälpmedel utan adress som "kommer"', $$('.scen .b-lank .lank-post.kommer').length > 0);
  const fs_ = await hitta('.figur-bild[aria-label^="Ett kar"]');
  const rects = fs_ ? [...fs_.querySelectorAll('rect[class^="fig-"]')].filter(r => /fig-(tra|is|jarn|foremal)/.test(r.getAttribute('class'))) : [];
  const under = rects.map(r => (118 - +r.getAttribute('y')) / +r.getAttribute('height'));
  prova('prov: flyter/sjunker räknar läget ur densiteten (0,25 → 75 % ovanför ytan)', rects.length === 2 && Math.abs(under[0] - 0.75) < 0.01 && +rects[1].getAttribute('y') + +rects[1].getAttribute('height') === 239, under.map(x => x.toFixed(2)));
  // Byt nivå i boken: samma avsnitt på den andra nivån
  synlig('.bokapp .niva-knapp').click(); await v(100);
  [...$('.niva-lista').querySelectorAll('button')].find(x => x.textContent.startsWith('Djupdykning')).click(); await v(200);
  const huvuden = $$('.scen .sida[data-nr] .sh-namn').map(e => e.textContent);
  prova('prov: nivåbyte i boken hamnar i samma avsnitt', huvuden.some(t => /Krafter/.test(t)) && synlig('.bokapp .niva-knapp').textContent.startsWith('Djupdykning'), huvuden.join(' | '));
  synlig('.bok-stang').click(); await v(450);
  const vald = $('.niva-valjare .niva-knapp.aktiv');
  prova('prov: hubben följer nivåbytet', !oppen() && vald && vald.textContent.startsWith('Djupdykning'), 'öppen=' + oppen() + ' hash=' + location.hash + ' vald=' + (vald && vald.textContent));
  // En bok per text: en text utan innehåll är "kommer"; en text utan den valda nivån öppnas på en nivå den har
  const text = id => $$('.underdel-knapp').find(b => b.dataset.text === id);
  const tom = text('energi');
  if (tom) { tom.click(); await v(300); }
  prova('prov: en text utan innehåll (Energi) är tonad ("kommer") och öppnar ingen bok',
    tom && tom.getAttribute('aria-disabled') === 'true' && tom.title.includes('kommer') && !tom.hasAttribute('data-oppna') && !oppen(), tom && tom.title);
  text('tryck').click(); await v(600);
  const nk = synlig('.bokapp .niva-knapp');
  prova('prov: en text utan den valda nivån (Djupdykning) öppnas på Standard', oppen() && nk && nk.textContent.startsWith('Standard'), nk && nk.textContent);
  // Strömformatet (Tryck): en sidbrytning ger ny sida; ett långt stycke + figur som inte ryms tillsammans – stycket
  // stannar och figuren står först på nästa sida
  const sf = id => Bok.sidaFor(id);
  const forstPaSidan = async id => { Bok.gaTill(sf(id)); await v(60); const s = $('.scen .sida[data-nr="' + sf(id) + '"] .sidinnehall'); return !!s && s.firstElementChild.dataset.post === id; };
  prova('prov: en sidbrytning ger ny sida (strömformatet)', sf('efter-brytning') === sf('fore-brytning') + 1 && await forstPaSidan('efter-brytning'),
    'före s. ' + sf('fore-brytning') + ', efter s. ' + sf('efter-brytning'));
  prova('prov: långt stycke + figur som inte ryms tillsammans: stycket stannar, figuren står först på nästa sida',
    sf('figur-efter') === sf('langt-stycke') + 1 && await forstPaSidan('figur-efter'), 'stycket s. ' + sf('langt-stycke') + ', figuren s. ' + sf('figur-efter'));
  // Rörelsespåren i Tryck: alla fyra typerna, 4–8 prickar, med och utan tider
  ${FIGURKOLL}
  const sp = await figurKoll();
  prova('prov: rörelsespåren – avstånden lika / växande / krympande / ojämna efter rörelsetypen',
    sp.antal === 4 && sp.typer.length === 4 && !sp.fel.length, sp.antal + ' spår: ' + (sp.fel.join(' | ') || sp.typer.join(', ')));
  // Tal och enhet: hårda mellanslag, och i en spalt som är 1 px bred (där raden bryts vid varje vanligt mellanslag)
  // står "10 N", "1 538 °C", "5 m/s" och "18 km/h" ändå på en rad
  Bok.gaTill(sf('tal-och-enhet')); await v(60);
  const te = $('.scen [data-post="tal-och-enhet"]');
  const smal = te.cloneNode(true); smal.style.cssText = 'position:absolute;left:0;top:0;width:1px;visibility:hidden';
  document.body.appendChild(smal);
  const enRad = t => {
    const w = document.createTreeWalker(smal, NodeFilter.SHOW_TEXT); let nod;
    while ((nod = w.nextNode()) && !nod.textContent.includes(t));
    if (!nod) return null;
    const r = document.createRange(), i = nod.textContent.indexOf(t); r.setStart(nod, i); r.setEnd(nod, i + t.length);
    return new Set([...r.getClientRects()].map(q => Math.round(q.top))).size === 1;
  };
  const par = ['10 N', '1 538 °C', '5 m/s', '18 km/h'];
  const tePar = par.map(t => t.replace(/ /g, '·') + ': ' + (enRad(t) ? 'en rad' : 'BRUTEN'));
  const kontroll = enRad('16 − 6');                 // vanliga mellanslag: ska brytas i den smala spalten
  smal.remove();
  prova('prov: tal och enhet bryts aldrig isär – "16 − 6 = 10 N" och "1 538 °C" (hårda mellanslag, också i tusentalet)',
    tePar.every(t => t.endsWith('en rad')) && kontroll === false, tePar.join(' | ') + ' | 16 − 6 (vanliga mellanslag): ' + (kontroll ? 'en rad – spalten bryter inte' : 'bruten, som den ska'));
  // Kraftparen i Tryck: drag och knuff, lika långa motriktade pilar från var sitt föremåls mitt
  prova('prov: kraftparen – pilarna lika långa och motriktade, mot det andra föremålet (drag) och ifrån det (knuff)',
    sp.par.antal === 2 && sp.par.satt.length === 2 && !sp.par.fel.length, sp.par.antal + ' par: ' + (sp.par.fel.join(' | ') || sp.par.satt.join(', ')));
  const etikett = async id => { Bok.gaTill(sf(id)); await v(60); const e = $('.scen [data-post="' + id + '"] .figur-bild'); return e ? e.getAttribute('aria-label') : ''; };
  const texterI = id => [...$$('.scen [data-post="' + id + '"] svg text')].map(t => t.textContent);
  const drag = await etikett('par-drag'), dragText = texterI('par-drag');
  prova('prov: kraftpar med värde – värdet över båda pilarna och beskrivningen ur data',
    dragText.filter(t => t === '12,5 N').length === 2 && drag === 'Kraftpar: Provföremål A och B är förbundna med ett snöre. A dras mot B åt höger och B dras mot A åt vänster, lika stora krafter, 12,5 N, på två olika föremål.',
    dragText.join(' · ') + ' | ' + drag);
  const knuff = await etikett('par-knuff'), knuffText = texterI('par-knuff');
  prova('prov: kraftpar utan värde – inga värden, pilarna ifrån varandra i beskrivningen',
    !knuffText.some(t => / N$/.test(t)) && /^Kraftpar: Provföremål nr 1 och Provföremål nr 2 ligger an mot varandra\. Kraften på föremål 1 åt vänster och kraften på föremål 2 åt höger, lika stora krafter på två olika föremål\.$/.test(knuff),
    knuffText.join(' · ') + ' | ' + knuff);
  // Kraftpilar utan värden, skala 20: pilen för 10 är halva den längsta (104), för 5 en fjärdedel
  const uv = await etikett('pilar-utan-varden'), uvText = texterI('pilar-utan-varden');
  const uvLinjer = [...$$('.scen [data-post="pilar-utan-varden"] line.fig-pil')].map(l => Math.hypot(l.x2.baseVal.value - l.x1.baseVal.value, l.y2.baseVal.value - l.y1.baseVal.value) + 12.6);
  prova('prov: kraftpilar utan värden – längderna ur storleken och skalan, inga "N" i figuren eller beskrivningen',
    !uvText.join(' ').includes(' N') && uv === 'Kraftpilar på Provlåda: Framåt åt höger, Bakåt åt vänster, Resultanten åt höger.' &&
    uvLinjer.length === 3 && Math.abs(uvLinjer[0] - 52) < 0.5 && Math.abs(uvLinjer[1] - 26) < 0.5 && Math.abs(uvLinjer[2] - 26) < 0.5,
    uvLinjer.map(Math.round).join('/') + ' | ' + uvText.join(' · ') + ' | ' + uv);
  // Friktion: ritas utan fel ur data, med och utan pilar; mätningen (figurKoll) gäller båda
  const frP = await etikett('friktion-pilar'), frG = await etikett('friktion-grov');
  const frPilar = id => $$('.scen [data-post="' + id + '"] g.fig-friktion-pil').length;
  Bok.gaTill(sf('friktion-pilar')); await v(60); const nP = frPilar('friktion-pilar'), bt = $('.scen [data-post="friktion-pilar"] figcaption');
  Bok.gaTill(sf('friktion-grov')); await v(60); const nG = frPilar('friktion-grov'), gText = texterI('friktion-grov');
  prova('prov: friktion – ritas ur data med pilar (draget och friktionen) och utan pilar (grova ytor, egna namn), och mätningen håller',
    sp.fr.antal === 2 && !sp.fr.fel.length && sp.fr.ytor.join(',') === 'normal,grov' && nP === 2 && nG === 0 && bt && bt.textContent === 'Provbildtext under friktionen.' &&
    frP === 'Ett block på ett bord. I förstoring syns att båda ytorna har små toppar och gropar som hakar i varandra. Draget pekar framåt och friktionen bakåt på blocket.' &&
    frG === 'Låda på hylla. I förstoring syns att båda ytorna har tydliga toppar och gropar som hakar i varandra.' && gText.includes('Låda') && gText.includes('Hylla'),
    (sp.fr.fel.join(' | ') || sp.fr.ytor.join(',')) + ' | pilar ' + nP + '/' + nG + ' | ' + frP + ' | ' + frG);
  // Bildpilar: utsnittet (900 × 360 av fotot → 440 × 176), två pilar, en etikett utan läge (över pilens mitt),
  // beskrivningen ur data; mätningen (figurKoll) gäller den
  const bpE = await etikett('bildpilar-utsnitt');
  Bok.gaTill(sf('bildpilar-utsnitt')); await v(60);
  const bpS = $('.scen [data-post="bildpilar-utsnitt"] svg[data-bildpilar]'), bpVb = bpS ? bpS.viewBox.baseVal : null;
  const bpT = $('.scen [data-post="bildpilar-utsnitt"] figcaption');
  prova('prov: bildpilar – utsnittet, två lika långa pilar med etiketter, beskrivningen och bildtexten ur data, och mätningen håller',
    sp.bp.antal === 1 && !sp.bp.fel.length && sp.bp.pilar === 2 && bpVb && bpVb.width === 440 && Math.abs(bpVb.height - 176) < 0.1 &&
    bpE === 'Provbeskrivning av fotot.' && bpT && bpT.textContent === 'Provbildtext under fotot.' &&
    texterI('bildpilar-utsnitt').join(',') === 'provpil 1,provpil 2',
    (sp.bp.fel.join(' | ') || sp.bp.pilar + ' pilar') + ' | ' + (bpVb && bpVb.width + '×' + bpVb.height) + ' | ' + bpE + ' | ' + texterI('bildpilar-utsnitt').join(','));
  Bok.gaTill(sf('spar-retarderad')); await v(60);
  const ret = $('.scen [data-post="spar-retarderad"] svg'), tider = ret ? [...ret.querySelectorAll('text')].map(t => t.textContent) : [];
  prova('prov: rörelsespår med tider – en tid per prick (0 s, 1 s …) och beskrivningen ur data',
    tider.join(',') === '0 s,1 s,2 s,3 s,4 s,5 s' && /^Rörelsespår: sex prickar med lika lång tid emellan, avstånden krymper – retarderad rörelse\./.test(ret.closest('.figur-bild').getAttribute('aria-label')),
    tider.join(',') + ' | ' + (ret && ret.closest('.figur-bild').getAttribute('aria-label')));
  // Newtons kanon: tre banor (två som landar, en runt jorden), namnen och beskrivningen ur motorn
  const kanonE = await etikett('newtons-kanon-prov'), kanon = $('.scen [data-post="newtons-kanon-prov"] svg[data-newtons-kanon]');
  const kanonBanor = kanon ? [...kanon.querySelectorAll('g.fig-kanon-bana')].map(g => g.dataset.bana).join(',') : '', kanonText = kanon ? [...kanon.querySelectorAll('text')].map(t => t.textContent) : [];
  prova('prov: Newtons kanon – tre banor (låg fart, högre fart, runt jorden) med namn, och beskrivningen ur motorn',
    kanonBanor === '1,2,3' && ['låg fart', 'högre fart', 'tillräckligt hög fart'].every(t => kanonText.includes(t)) && !!kanon.querySelector('circle.fig-kanon-runt') &&
    /^Jorden med ett mycket högt berg och en kanon på toppen\./.test(kanonE), kanonBanor + ' | ' + kanonText.join(', ') + ' | ' + kanonE);
  // Lutande plan med två steg: två rader (Lika branta, Flackare), den streckade starthöjden i varje, kulan som stannar
  // på starthöjden i det flackare steget, och beskrivningen ur motorn
  const lpE = await etikett('lutande-plan-2'), lp = $('.scen [data-post="lutande-plan-2"] svg[data-lutande-plan]');
  const lpSteg = lp ? [...lp.querySelectorAll('g.fig-lp-steg')] : [];
  const lpNamn = lpSteg.map(g => g.querySelector('text').textContent), lpHojd = lpSteg.map(g => g.querySelectorAll('line.fig-hojd').length);
  const lpFlack = lpSteg[1] && (() => { const h = lpSteg[1].querySelector('line.fig-hojd').y1.baseVal.value, k = lpSteg[1].querySelector('circle.fig-tonad');
    return k && Math.abs(k.cy.baseVal.value - h) < 6.5; })();
  prova('prov: lutande plan i två steg – Lika branta och Flackare, starthöjden streckad i varje steg, kulan når starthöjden på det flackare planet, beskrivningen ur motorn',
    lp && lp.dataset.lutandePlan === '2' && lpNamn.join(',') === 'Lika branta,Flackare' && lpHojd.every(n => n === 1) && lpFlack &&
    lpE === 'Två steg: kulan rullar ner för ett plan och upp för ett annat. Ju flackare det andra planet är, desto längre rullar kulan för att nå starthöjden.',
    lpNamn.join(',') + ' | ' + lpHojd.join('/') + ' | ' + lpE);
  synlig('.bok-stang').click(); await v(450);
  const dd = $$('.niva-valjare .niva-knapp').find(b => b.textContent.startsWith('Djupdykning'));
  prova('prov: i hubben är Djupdykning "kommer" när texten Tryck är vald', !oppen() && $('.underdel-knapp.aktiv').dataset.text === 'tryck' && dd && dd.getAttribute('aria-disabled') === 'true',
    'markerad: ' + $('.underdel-knapp.aktiv').dataset.text + ', Djupdykning ' + (dd && dd.getAttribute('aria-disabled')));
  return k;
}`;

/* ---------- Bladvändningen: bläddring vänder ett blad, hopp gör det inte, aldrig en kö ----------
 * Körs i varje läge efter scenariot. BLAD: vändning framåt och bakåt (det nya uppslaget syns direkt, lagret ovanpå
 * försvinner), hopp via innehållet utan vändning, en snabb serie om 10 sidbyten (rätt sida, högst ett blad åt gången,
 * inget kvar efteråt) och inställningen Av. BLADTID: en vändning med CPU:n strypt 6 gånger – från tangenten tills
 * lagret är borta, och det längsta glappet mellan två bildrutor. BLADRM: med prefers-reduced-motion inga animationer. */
const BLADHJALP = String.raw`const v = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const synlig = s => $$(s).find(e => e.offsetParent !== null);
  const tangent = t => document.dispatchEvent(new KeyboardEvent('keydown', { key: t, bubbles: true }));
  const syns = () => $$('.scen .uppslag > .sida[data-nr]').map(s => +s.dataset.nr);
  const lager = () => $$('.blad-lager').length;
  // animationer i boken (bladlagret och scenen) – inte reglagens toningar
  const iBoken = a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.blad-lager, .scen');
  const igang = () => document.getAnimations().filter(a => a.playState === 'running' && iBoken(a)).length;
  const oppna = async () => { if (Bok.oppen) return; ($('.underdel-knapp.aktiv[data-oppna]') || $('[data-oppna]')).click(); await v(800); };`;
const BLAD = String.raw`async () => {
  ${BLADHJALP}
  const k = [], prova = (namn, ok, detalj) => k.push({ namn, ok: !!ok, detalj: detalj == null ? '' : String(detalj) });
  await oppna();
  const antal = $$('.lr-sida').length, upp = !!$('.scen .uppslag.ar-uppslag'), steg = upp ? 2 : 1;
  Bok.gaTill(1); await v(300);
  prova('blad: ett hopp (Bok.gaTill) vänder inget blad', !lager(), lager() + ' lager');
  // framåt: det nya uppslaget står i scenen direkt, bladet i ett lager ovanpå, som försvinner
  tangent('ArrowRight');
  const direkt = syns(), under = lager(), mot = !!$('.blad-lager .blad.fran-hoger'), tid = document.getAnimations().filter(iBoken).map(a => a.effect.getComputedTiming().duration);
  await v(520);
  prova('blad: → vänder ett blad (' + (upp ? 'från höger till vänster' : 'sidan lyfts åt vänster') + '), det nya uppslaget syns direkt och lagret är borta efteråt',
    direkt[0] === 1 + steg && under === 1 && mot && !lager() && !igang() && tid.length > 0 && tid.every(t => t <= 450),
    'syns ' + direkt + ', lager ' + under + ', längd ' + [...new Set(tid)].join('/') + ' ms, efteråt ' + lager() + ' lager');
  tangent('ArrowLeft');
  const bak = syns(), underB = lager(), motB = upp ? !!$('.blad-lager .blad.fran-vanster') : !!$('.blad-lager .blad-fast');
  await v(520);
  prova('blad: ← vänder bladet tillbaka och visar förra uppslaget direkt', bak[0] === 1 && underB === 1 && motB && !lager(), 'syns ' + bak + ', lager ' + underB);
  // hopp via innehållet: ingen vändning
  synlig('.bok-innehall').click(); await v(150);
  const mal = $$('.meny .toc-knapp').map(b => +b.dataset.till).find(n => n > 1 + steg);
  if (mal) { $('.meny .toc-knapp[data-till="' + mal + '"]').click(); await v(20); }
  else { tangent('Escape'); await v(80); }                  // en kort bok: inget avsnitt bortom uppslaget – stäng menyn
  prova('blad: ett hopp i innehållet vänder inget blad, bara direkt till sidan', !mal || (syns().includes(mal) && !lager()), 'mål ' + mal + ', syns ' + syns() + ', lager ' + lager());
  await v(300); Bok.gaTill(1); await v(300);
  // snabb serie: 7 framåt och 3 bakåt med 15 ms emellan – rätt sida på slutet, högst ett blad åt gången, ingen kö
  let i = 0, mest = 0;
  const maxI = upp ? Math.floor((antal - 1) / 2) : antal - 1;
  for (const t of [...Array(7).fill('ArrowRight'), ...Array(3).fill('ArrowLeft')]) {
    i = Math.max(0, Math.min(maxI, i + (t === 'ArrowRight' ? 1 : -1)));
    tangent(t); mest = Math.max(mest, lager()); await v(15);
  }
  const vantat = 1 + i * steg, slut = syns()[0];
  await v(470);
  prova('blad: en snabb serie om 10 sidbyten hamnar rätt, med högst ett blad åt gången och inget kvar efteråt (ingen kö)',
    slut === vantat && mest <= 1 && !lager() && !igang(), 'sida ' + slut + ' (väntat ' + vantat + '), högst ' + mest + ' lager, efteråt ' + lager() + ' lager, ' + igang() + ' animationer');
  // inställningen Av: direkt sidbyte
  synlig('.bok-innehall').click(); await v(150);
  $('.meny .val button[data-v="direkt"]').click(); tangent('Escape'); await v(100);
  tangent('ArrowRight');
  const av = lager() + igang();
  await v(100);
  synlig('.bok-innehall').click(); await v(150);
  $('.meny .val button[data-v="blad"]').click(); tangent('Escape'); await v(100);
  prova('blad: inställningen "Bladvändning: Av" ger direkt sidbyte, utan animation', av === 0, av + ' lager/animationer');
  // Omslaget: ← från innehållet vänder bladet tillbaka till omslaget, → vänder omslaget och boken öppnas
  if (JSON.parse(document.body.dataset.kontroll).omslag) {
    Bok.gaTill(1); await v(300);
    tangent('ArrowLeft');
    const o = syns(), oLager = lager(), oBlad = upp ? !!$('.blad-lager .blad.fran-vanster .blad-sida.bak .omslag') : !!$('.blad-lager .blad .omslag');
    await v(520);
    const oKvar = lager();
    tangent('ArrowRight');
    const i = syns(), iLager = lager(), iBlad = !!$('.blad-lager .blad.fran-hoger .blad-sida.fram .sida.omslag');
    await v(520);
    prova('blad: ← från innehållet vänder bladet till omslaget, → vänder omslaget och öppnar boken på innehållet',
      JSON.stringify(o) === '[0]' && oLager === 1 && oBlad && !oKvar && i[0] === 1 && iLager === 1 && iBlad && !lager() && !igang(),
      'bakåt ' + o + ' (lager ' + oLager + ', omslaget på bladet ' + oBlad + '), framåt ' + i + ' (lager ' + iLager + ', omslaget på bladet ' + iBlad + '), efteråt ' + lager() + ' lager');
  }
  return k;
}`;
// En vändning: från tangenten (sidbytet ingår) tills lagret är borta, och glappen mellan bildrutorna
const BLADEN = String.raw`async () => {
  const lager = () => document.querySelectorAll('.blad-lager').length;
  const tangent = t => document.dispatchEvent(new KeyboardEvent('keydown', { key: t, bubbles: true }));
  const ramar = [];
  let t0 = performance.now(), slut = null;
  // när lagret tas bort (exakt, inte vid nästa bildruta)
  const obs = new MutationObserver(() => { if (!lager() && slut === null) slut = performance.now(); });
  obs.observe(document.querySelector('.scen-ram'), { childList: true });
  tangent('ArrowRight');
  const upplagt = performance.now() - t0;                     // själva sidbytet (synkront, innan vändningen spelas)
  await new Promise(ok => { const ram = t => { ramar.push(t); if (lager()) requestAnimationFrame(ram); else ok(); };
    requestAnimationFrame(ram); setTimeout(ok, 3000); });
  obs.disconnect();
  const glapp = ramar.slice(1).map((t, j) => t - ramar[j]);
  // hela vändningen: från tangenten (sidbytet ingår) tills lagret är borta
  return { total: Math.round((slut || performance.now()) - t0), upplagt: Math.round(upplagt), ramar: ramar.length, maxGlapp: Math.round(Math.max(0, ...glapp)) };
}`;
// Som brytningstiden: en uppvärmningsvändning som inte räknas (sidorna byggs första gången), sedan tre vändningar;
// medianen jämförs med 450 ms
const BLADTID = String.raw`async () => {
  ${BLADHJALP}
  await oppna();
  const en = async () => { Bok.gaTill(1); await v(400); return await (${BLADEN})(); };
  await en();
  const m = [await en(), await en(), await en()], tot = m.map(x => x.total).sort((a, b) => a - b);
  return { total: tot[1], max: tot[2], upplagt: Math.max(...m.map(x => x.upplagt)), ramar: m[1].ramar, maxGlapp: Math.max(...m.map(x => x.maxGlapp)) };
}`;
const BLADRM = String.raw`async () => {
  ${BLADHJALP}
  await oppna(); Bok.gaTill(1); await v(300);
  tangent('ArrowRight'); const a = lager() + igang() + $$('.in-framat, .in-bakat').length; await v(60);
  Bok.gaTill(5); const b = lager() + igang(); await v(60);
  tangent('ArrowLeft'); const c = lager() + igang() + $$('.in-framat, .in-bakat').length;
  return { a, b, c };
}`;

// På batteri mäts ingen tid (Windows: Win32_Battery, BatteryStatus 1 = på batteri)
let paBatteri = null;
function batteri() {
  if (paBatteri !== null) return paBatteri;
  try {
    const ut = require('child_process').execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_Battery | Select-Object -First 1).BatteryStatus"', { encoding: 'utf8', timeout: 15000 }).trim();
    paBatteri = ut === '1';
  } catch (e) { paBatteri = false; }
  return paBatteri;
}

async function provaBlad(c, lage) {
  const k = await c.ev(`(${BLAD})()`);
  if (batteri()) k.push({ namn: 'blad: tidtagning med CPU:n strypt 6 gånger – ej mätt (datorn går på batteri)', ok: true, detalj: '' });
  else {
    await c.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    const t = await c.ev(`(${BLADTID})()`);
    await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    k.push({ namn: 'blad: en vändning tar högst 450 ms med CPU:n strypt 6 gånger (medianen av 3 efter en uppvärmning), utan hack (inget glapp över 50 ms mellan bildrutorna)',
      ok: t.total <= 450 && t.maxGlapp <= 50, detalj: `median ${t.total} ms från tangenten, max ${t.max} ms (sidbytet högst ${t.upplagt} ms), ${t.ramar} bildrutor, längsta glapp ${t.maxGlapp} ms` });
    k.tid = t;
  }
  await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const rm = await c.ev(`(${BLADRM})()`);
  await c.send('Emulation.setEmulatedMedia', { features: [] });
  k.push({ namn: 'blad: med prefers-reduced-motion inga animationer – direkt sidbyte, också vid hopp', ok: !rm.a && !rm.b && !rm.c, detalj: JSON.stringify(rm) });
  await c.ev(`(async () => { if (Bok.oppen) { [...document.querySelectorAll('.bok-stang')].find(e => e.offsetParent).click(); await new Promise(r => setTimeout(r, 450)); } })()`);
  return k;
}

/* ---------- En körning: ett delkapitel i ett läge ---------- */

// Bilderna laddas inte: inga <img> som byggs med innerHTML får en src (bildfiguren i bok.js/figurer.js byggs så).
const BLOCKERA = String.raw`(() => {
  const d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(Element.prototype, 'innerHTML', { configurable: true, get() { return d.get.call(this); },
    set(v) { d.set.call(this, typeof v === 'string' ? v.replace(/<img\b([^>]*?)\ssrc=/g, '<img$1 data-blockerad=') : v); } });
})();`;

// Den första textens bok bryts i det aktuella sidmåttet (Bok.matSidor): blocken på varje sida och bildfigurerna.
// Laddade bilder väntas in (högst 4 s); blockerade väntas inte in.
async function brytningMedBilder(c, ladda, url, blockerad) {
  await ladda(url);
  return c.ev(`(async () => {
    const v = ms => new Promise(r => setTimeout(r, ms));
    const t = document.querySelector('.underdel-knapp[data-oppna]');
    if (!t) return { sidor: [], bilder: [] };
    t.click(); await v(700);
    const st = document.querySelector('.scen').style;
    const g = { sb: parseFloat(st.getPropertyValue('--sb')), sh: parseFloat(st.getPropertyValue('--sh')), fs: parseFloat(st.getPropertyValue('--fs')) };
    let m = Bok.matSidor(g);
    for (let i = 0; i < 40 && !${blockerad} && m.bilder.some(b => !b.laddad); i++) { await v(100); m = Bok.matSidor(g); }
    [...document.querySelectorAll('.bok-stang')].find(e => e.offsetParent).click(); await v(450);
    return { sidor: m.sidor, bilder: m.bilder };
  })()`);
}

async function kor(dk, lage, felkod) {
  const c = await chrome();
  const res = { kontroller: [], fel: [], kontroll: null };
  try {
    await c.send('Page.enable'); await c.send('Runtime.enable');
    await c.send('Runtime.addBinding', { name: '__gest' });
    await c.send('Emulation.setDeviceMetricsOverride', { width: lage.B, height: lage.H, deviceScaleFactor: 1, mobile: !!lage.mobil });
    if (lage.mobil) await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await c.send('Page.addScriptToEvaluateOnNewDocument', { source: FANGA_FEL + (typeof felkod === 'string' ? felkod : '') });
    const url = adressTill(path.join(dk.mapp, 'index.html')) + '?kontroll' + ((felkod && felkod.adress) || '');
    const ladda = async adress => {
      await c.send('Page.navigate', { url: 'about:blank' }); await vanta(100);
      await c.send('Page.navigate', { url: adress });
      for (let i = 0; i < 60; i++) { await vanta(150); if (await c.ev('!!(document.body && document.body.dataset.kontroll)').catch(() => false)) break; }
      await vanta(200);
    };
    await ladda(url);
    res.kontroll = JSON.parse(await c.ev('document.body.dataset.kontroll || "null"'));
    if (BILDER) await bild(c, dk, lage, 'hubb');
    res.kontroller = await c.ev(`(${SCENARIO})(${lage.helskarm})`);
    if (dk.prov && !lage.mobil) res.kontroller.push(...await c.ev(`(${PROVSCENARIO})()`));
    // villVetaMer (order 18): korten längst ned i Läs går till sidor som finns (på disken, eller under BAS med --webb)
    const vvm = await c.ev(`[...document.querySelectorAll('.vill-veta-mer a.fordj-kort')].map(a => a.href)`);
    if (vvm.length) {
      const finns = async u => WEBB ? (await fetch(u).catch(() => ({ ok: false }))).ok
        : u.startsWith('file:') && fs.existsSync(require('url').fileURLToPath(u.split('#')[0].split('?')[0]));
      const saknas = []; for (const u of vvm) if (!(await finns(u))) saknas.push(decodeURI(u).split('/').slice(-2).join('/'));
      res.kontroller.push({ namn: `hubben: Vill du veta mer? – de ${vvm.length} korten går till sidor som finns`, ok: !saknas.length,
        detalj: saknas.length ? 'saknas: ' + saknas.join(', ') : vvm.map(u => decodeURI(u).split('/').pop()).join(', ') });
    }
    const blad = await provaBlad(c, lage);
    res.kontroller.push(...blad); res.bladTid = blad.tid || null;
    // Bildfiguren: brytningen är densamma innan och efter att bilderna laddats. Boken bryts (i det här sidmåttet) en
    // gång med bilderna laddade och en gång i en sidladdning där inga <img> får en src (BLOCKERA): samma block på varje
    // sida och samma bildbredder. Bara för en bok med bildfigurer.
    const laddad = await brytningMedBilder(c, ladda, url, false);
    if (laddad.bilder.length) {
      const { identifier } = await c.send('Page.addScriptToEvaluateOnNewDocument', { source: BLOCKERA });
      const blockerad = await brytningMedBilder(c, ladda, url, true);
      await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
      const matt = x => JSON.stringify(x.bilder.map(b => [b.post, b.bredd, b.hojd]));
      const lika = JSON.stringify(laddad.sidor) === JSON.stringify(blockerad.sidor) && matt(laddad) === matt(blockerad);
      res.kontroller.push({ namn: `figur: bildfiguren – brytningen är densamma innan och efter att bilderna laddats (${laddad.bilder.length} bilder)`,
        ok: lika && laddad.bilder.every(b => b.laddad) && blockerad.bilder.every(b => !b.laddad),
        detalj: `${laddad.sidor.length} sidor laddade / ${blockerad.sidor.length} blockerade; bredd×höjd ${laddad.bilder.map(b => b.bredd + '×' + b.hojd).join(',')} / ${blockerad.bilder.map(b => b.bredd + '×' + b.hojd).join(',')}; laddade ${laddad.bilder.filter(b => b.laddad).length}/${laddad.bilder.length}, blockerade laddade ${blockerad.bilder.filter(b => b.laddad).length}` });
    }
    // En adress som pekar på en rubrik (#atomer-2) öppnar boken där rubriken står; Stäng leder till hubben i samma
    // delkapitel. Rubrikernas adresser kommer ur kontrolläget (adress → block).
    const ankare = ((res.kontroll && res.kontroll.ankare) || []).filter(([a, p]) => p !== a && /-\d+$/.test(a));
    const [adr, post] = ankare[Math.floor(ankare.length / 2)] || ['innehall', 'innehall'];
    // på den nivå som adresserna räknades för (en rubriks adress är den n:te rubriken i avsnittet på en viss nivå)
    await ladda(url + (res.kontroll && res.kontroll.niva ? '&niva=' + res.kontroll.niva : '') + '#' + encodeURIComponent(adr));
    const direkt = await c.ev(`(async () => {
      const v = ms => new Promise(r => setTimeout(r, ms)), $ = s => document.querySelector(s);
      const sidor = [...document.querySelectorAll('.scen .uppslag > .sida[data-nr]')];
      const forst = !$('.bokapp').hidden && sidor.some(s => s.querySelector('[data-post="${post}"]'));
      [...document.querySelectorAll('.bok-stang')].find(e => e.offsetParent).click(); await v(450);
      return { forst, sedan: $('.bokapp').hidden && location.hash === '' && !!document.body.dataset.klar, syns: sidor.map(s => s.dataset.nr) };
    })()`);
    res.kontroller.push({ namn: `adress: index.html#${adr} öppnar boken där rubriken står`, ok: direkt.forst, detalj: direkt.syns.join('-') + ' (' + post + ')' });
    res.kontroller.push({ namn: 'adress: Stäng leder därifrån till hubben i samma delkapitel', ok: direkt.sedan, detalj: '' });

    // Läsplatsen är ett block: läs till ett ställe, stäng, byt sidmått (fönster ↔ helskärm ↔ mobil) – samma block syns
    const alt = lage.mobil ? { B: 1366, H: 633, namn: '1366×633' } : lage.H === 633 ? { B: 1366, H: 768, namn: '1366×768' } : { B: 390, H: 664, mobil: true, namn: 'mobil 390×664' };
    const minne = await c.ev(`(async () => {
      const v = ms => new Promise(r => setTimeout(r, ms));
      document.querySelector('.underdel-knapp.aktiv').click(); await v(600);
      Bok.gaTill(Math.max(2, Math.round(document.querySelectorAll('.lr-sida').length * 0.6))); await v(200);
      const p = Bok.plats;
      [...document.querySelectorAll('.bok-stang')].find(e => e.offsetParent).click(); await v(450);
      return p;
    })()`);
    await c.send('Emulation.setDeviceMetricsOverride', { width: alt.B, height: alt.H, deviceScaleFactor: 1, mobile: !!alt.mobil });
    await vanta(400);
    const igen = await c.ev(`(async () => {
      const v = ms => new Promise(r => setTimeout(r, ms));
      document.querySelector('.underdel-knapp.aktiv').click(); await v(700);
      const sidor = [...document.querySelectorAll('.scen .uppslag > .sida[data-nr]')];
      const id = ${JSON.stringify(minne)};
      const ok = !!id && sidor.some(s => s.querySelector('[data-post="' + id + '"]'));
      [...document.querySelectorAll('.bok-stang')].find(e => e.offsetParent).click(); await v(450);
      return { ok, syns: sidor.map(s => s.dataset.nr).join('-') };
    })()`);
    await c.send('Emulation.setDeviceMetricsOverride', { width: lage.B, height: lage.H, deviceScaleFactor: 1, mobile: !!lage.mobil });
    await vanta(300);
    res.kontroller.push({ namn: `minne: läsplatsen (ett block) syns igen efter byte till ${alt.namn}`, ok: igen.ok, detalj: minne + ' → sidor ' + igen.syns });

    // Prestanda: brytningen med CPU:n strypt 6 gånger, som på en Chromebook. Varje bok (text × nivå): ett
    // uppvärmningsvarv som inte räknas, sedan 5 mätvarv – medianen ska vara under 200 ms (maxet redovisas)
    await c.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    res.brytTid = await c.ev('Bok.brytTid(5)');
    await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const over = res.brytTid ? res.brytTid.bocker.filter(b => !(b.median < 200)) : [{ bok: '(ingen bok)', median: NaN, max: NaN }];
    res.kontroller.push({ namn: 'prestanda: brytningen under 200 ms med CPU:n strypt 6 gånger (medianen av 5 varv efter uppvärmning, varje bok)',
      ok: !over.length, detalj: over.map(b => `${b.bok} median ${b.median} ms (max ${b.max})`).join(', ') });
    if (BILDER) { await c.ev(`document.querySelector('.underdel-knapp').click()`); await vanta(500); await bild(c, dk, lage, 'bok'); }
    res.fel = (await c.ev('window.__fel')).concat(c.undantag.map(u => 'undantag: ' + u));
    res.fel = [...new Set(res.fel)];
  } catch (e) {
    res.fel.push('grinden: ' + e.message);
  } finally { await c.stang(); }
  const nav = res.kontroller.filter(x => x.ok).length;
  res.navigering = `${nav}/${res.kontroller.length}`;
  res.plats = res.kontroll && res.kontroll.gron === true;
  res.gron = res.kontroller.length > 0 && nav === res.kontroller.length && res.plats && res.fel.length === 0;
  return res;
}

async function bild(c, dk, lage, vad) {
  fs.mkdirSync(BILDMAPP, { recursive: true });
  const sh = await c.send('Page.captureScreenshot', { format: 'png' });
  const fil = path.join(BILDMAPP, `${path.basename(dk.mapp)}_${lage.namn.replace(/[^0-9a-zåäö]+/gi, '-')}_${vad}.png`);
  fs.writeFileSync(fil, Buffer.from(sh.result.data, 'base64'));
  console.log('   bild:', fil);
}

/* ---------- Startsidan och kapitelindexet: vägen mellan sidorna ----------
 * Startsidan (index.html) → kapitelindexet (<kapitel>/index.html) → avsnittssidorna → brödsmulorna tillbaka.
 * Ett tonat kort (kapitel, avsnitt eller resurs som inte finns än) är inte en länk och leder ingenstans.
 * Datastyrt (Geografibok, order 10): kapitlen letas upp på disken – varje mapp <kapitel>/ med en kapitel.js – och
 * titeln läses ur kapitel.js. Avsnittssidorna är kapitlets delkapitel (nummer och ämne ur delkapitel.js). Ett kort som
 * inte är ett av dem prövas bara allmänt: en länk till en sida som finns, eller tonat, "Kommer" och ingen länk.
 * Utan kapitel.js hoppas provet över. */

const ROMERSK = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n] || String(n);
const falt = (text, namn) => { const m = new RegExp(`^\\s*${namn}:\\s*(?:'([^']*)'|(\\d+))`, 'm').exec(text); return m && (m[1] != null ? m[1] : +m[2]); };

function kapitlen() {
  const ut = [];
  for (const omr of fs.readdirSync(ROT, { withFileTypes: true })) {
    if (!omr.isDirectory() || omr.name.startsWith('.') || omr.name === 'verktyg') continue;
    const fil = path.join(ROT, omr.name, 'kapitel.js');
    if (!fs.existsSync(fil) || !fs.existsSync(path.join(ROT, omr.name, 'index.html'))) continue;
    const avsnitt = delkapitel(true).filter(d => !d.prov && path.dirname(d.mapp) === path.join(ROT, omr.name)).map(d => {
      const t = fs.readFileSync(path.join(d.mapp, 'delkapitel.js'), 'utf8');
      return { mapp: path.basename(d.mapp), nummer: falt(t, 'nummer'), amne: falt(t, 'amne') };
    }).sort((a, b) => a.nummer - b.nummer);
    ut.push({ mapp: omr.name, titel: falt(fs.readFileSync(fil, 'utf8'), 'titel'), avsnitt });
  }
  return ut;
}

async function provaSidorna(lage, kap) {
  const c = await chrome();
  const k = [], fel = [];
  const prova = (namn, ok, detalj) => k.push({ namn, ok: !!ok, detalj: detalj == null ? '' : String(detalj) });
  const start = adressTill(path.join(ROT, 'index.html'));
  const kapitel = new URL(`${kap.mapp}/index.html`, start).href;
  const amne = (kap.avsnitt[0] && kap.avsnitt[0].amne) || '';
  const MAPPAR = kap.avsnitt.map(a => a.mapp), ROMERSKA = kap.avsnitt.map(a => ROMERSK(a.nummer));
  const avsnitt = MAPPAR.map(d => new URL(`${kap.mapp}/${d}/index.html`, start).href);
  // en länk från ett kort ska leda till en sida som finns (på disken, eller under BAS med --webb)
  const finns = href => { try { const rel = decodeURI(href).split(/[?#]/)[0].slice(decodeURI(BAS).length);
    return !!href && decodeURI(href).startsWith(decodeURI(BAS)) && fs.existsSync(path.join(ROT, rel)); } catch (e) { return false; } };
  const tonadEllerLank = x => x.tag === 'A' ? finns(x.href) : x.tag === 'SPAN' && x.dimmad && x.av === 'true' && x.kommer && !x.href;
  try {
    await c.send('Page.enable'); await c.send('Runtime.enable');
    await c.send('Emulation.setDeviceMetricsOverride', { width: lage.B, height: lage.H, deviceScaleFactor: 1, mobile: !!lage.mobil });
    await c.send('Page.addScriptToEvaluateOnNewDocument', { source: FANGA_FEL });
    const har = async () => decodeURI(await c.ev('location.href.split("#")[0]'));
    const samlaFel = async () => fel.push(...await c.ev('window.__fel || []'));
    const ga = async url => { await c.send('Page.navigate', { url }); await vanta(700); };
    const klicka = async (sel, vant = 900) => { await samlaFel(); await c.ev(`document.querySelector(${JSON.stringify(sel)}).click()`); await vanta(vant); };
    const kort = sel => c.ev(`[...document.querySelectorAll(${JSON.stringify(sel)})].map(e => ({ tag: e.tagName, dimmad: e.classList.contains('dimmad'),
      av: e.getAttribute('aria-disabled'), href: e.href || null, kommer: !!e.querySelector('.kommer-snart') || /Kommer/.test(e.textContent),
      titel: (e.querySelector('.kap-titel, h3, h4') || {}).textContent, nr: (e.querySelector('.romersk') || {}).textContent }))`);
    const bred = async namn => prova(`${namn}: inte bredare än skärmen`, await c.ev('document.documentElement.scrollWidth <= innerWidth'));
    const tonadeLederIngenstans = async (namn, sel) => {
      const fore = await har();
      const n = await c.ev(`[...document.querySelectorAll(${JSON.stringify(sel)})].map(e => { e.click(); return 1; }).length`);
      await vanta(400);
      prova(`${namn}: de ${n} tonade korten går inte att klicka sig vidare från`, await har() === fore);
    };
    const lista = x => x.map(y => (y.nr ? y.nr + ' ' : '') + y.titel + (y.tag === 'A' ? '' : ' (tonad)')).join(' · ');

    // Startsidan
    await ga(start);
    const kapK = await kort('ul.innehallsforteckning > li > .kapitel-kort');
    const egen = kapK.find(x => x.tag === 'A' && x.href === kapitel);
    prova(`startsida: kortet ${kap.titel} länkar till kapitelindexet`, egen && egen.titel === kap.titel, lista(kapK));
    prova('startsida: varje kapitel är en länk till en sida som finns, eller tonat, aria-disabled, "Kommer" och ingen länk',
      kapK.length > 0 && kapK.every(tonadEllerLank), lista(kapK));
    const ov = await kort('.sektion-avgransare .kapitel-kort');
    prova('startsida: Översikt – varje kort är en länk till en sida som finns, eller tonat "Kommer"', ov.every(tonadEllerLank), lista(ov));
    await bred('startsida');
    await tonadeLederIngenstans('startsida', '.kapitel-kort.dimmad');

    // Kapitelindexet
    await klicka(`a.kapitel-kort[href$="${kap.mapp}/index.html"]`);
    prova('startsida → kapitelindexet', await har() === kapitel, await har());
    const smula = await c.ev(`[...document.querySelectorAll('.brodsmulor > *')].map(e => e.tagName + ':' + e.textContent.trim() + (e.href ? '→' + e.href : '')).join(' | ')`);
    const etikett = 'Kapitel ' + ((egen && egen.nr) || '?').trim();
    prova(`kapitelindex: brödsmulan ${amne} (länk) › ${kap.titel}, etiketten ${etikett}`,
      smula === `A:${amne}→${start} | SPAN:› | SPAN:${kap.titel}` && await c.ev(`document.querySelector('.hero-banner .avsnitt-label').textContent === ${JSON.stringify(etikett)}`), smula);
    const av = await kort('ul.innehallsforteckning > li > .kapitel-kort');
    prova(`kapitelindex: avsnittssidorna ${ROMERSKA.join(', ')} är länkar med rätt nummer`,
      avsnitt.every((u, i) => av.some(x => x.tag === 'A' && x.href === u && x.nr === ROMERSKA[i] && !x.kommer)), lista(av));
    prova('kapitelindex: övriga avsnitt är länkar till sidor som finns, eller tonade, aria-disabled, "Kommer" och inga länkar',
      av.every(tonadEllerLank), lista(av));
    const res = await kort('.resurser-rad .resurs-kort');
    prova('kapitelindex: resurserna är länkar till sidor som finns, eller tonade "Kommer"', res.every(tonadEllerLank), lista(res));
    await bred('kapitelindex');
    await tonadeLederIngenstans('kapitelindex', '.kapitel-kort.dimmad, .resurs-kort.dimmad');

    // Avsnittssidorna och brödsmulorna tillbaka
    for (const [i, mal] of avsnitt.entries()) {
      await klicka(`a.kapitel-kort[href$="${MAPPAR[i]}/index.html"]`, 1200);
      prova(`kapitelindex → avsnittssida ${ROMERSKA[i]}`, await har() === mal, await har());
      const s = await c.ev(`[...document.querySelectorAll('.hero-banner .brodsmulor a')].map(a => a.textContent + '→' + a.href).join(' | ')`);
      prova(`avsnittssida ${ROMERSKA[i]}: brödsmulorna ${amne} och ${kap.titel} är länkar dit`, s === `${amne}→${start} | ${kap.titel}→${kapitel}`, s);
      await klicka('.hero-banner .brodsmulor a:last-of-type');
      prova(`avsnittssida ${ROMERSKA[i]} → brödsmulan ${kap.titel} → kapitelindexet`, await har() === kapitel, await har());
    }
    await klicka('.hero-banner .brodsmulor a');
    prova(`kapitelindex → brödsmulan ${amne} → startsidan`, await har() === start, await har());
    if (avsnitt.length) {
      await ga(avsnitt[0]); await vanta(500);
      await klicka('.hero-banner .brodsmulor a');
      prova(`avsnittssida ${ROMERSKA[0]} → brödsmulan ${amne} → startsidan`, await har() === start, await har());
    }
    await samlaFel();
  } catch (e) {
    fel.push('grinden: ' + e.message);
  } finally { await c.stang(); }
  const ok = k.filter(x => x.ok).length;
  return { kontroller: k, fel: [...new Set(fel.concat(c.undantag.map(u => 'undantag: ' + u)))], navigering: `${ok}/${k.length}`, gron: k.length > 0 && ok === k.length && !fel.length && !c.undantag.length };
}

/* ---------- Webben: visar den samma filer som disken? ----------
 * Annars prövar --webb en annan version än den på disken (Pages har inte byggt klart, eller något är inte pushat). */

async function jamforWebben(lista) {
  const filer = [path.join(ROT, 'index.html'), ...kapitlen().map(k => path.join(ROT, k.mapp, 'index.html'))];
  const samla = mapp => fs.readdirSync(mapp, { withFileTypes: true }).forEach(f =>
    f.isDirectory() ? samla(path.join(mapp, f.name)) : filer.push(path.join(mapp, f.name)));
  [path.join(ROT, 'bokskal'), ...lista.map(d => d.mapp)].forEach(samla);
  // och kapitlens kapitel.js (kapitel: '…' i delkapitel.js), som ligger utanför delkapitlens mappar
  lista.forEach(d => { const m = /^\s*kapitel:\s*'([^']+)'/m.exec(fs.readFileSync(path.join(d.mapp, 'delkapitel.js'), 'utf8'));
    const fil = m && path.resolve(d.mapp, m[1]); if (fil && !filer.includes(fil)) filer.push(fil); });
  const lf = b => Buffer.from(b.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
  const avvikande = [];
  for (const fil of filer) {
    const svar = await fetch(adressTill(fil)).catch(e => ({ ok: false, status: e.message }));
    const lika = svar.ok && Buffer.compare(lf(Buffer.from(await svar.arrayBuffer())), lf(fs.readFileSync(fil))) === 0;
    if (!lika) avvikande.push(path.relative(ROT, fil) + (svar.ok ? ' (annat innehåll)' : ` (${svar.status})`));
  }
  return { antal: filer.length, avvikande };
}

/* ---------- Huvudprogrammet ---------- */

(async () => {
  const lista = delkapitel();
  const mall = fs.readFileSync(MALL);
  let gront = true;
  console.log(`Bokmotorn: ${lista.length} delkapitel (${lista.map(d => d.namn).join(', ')})`);
  console.log(`Prövar: ${WEBB ? 'den publicerade boken, ' + BAS : 'filerna på disken'}\n`);

  if (WEBB) {
    const j = await jamforWebben(lista);
    gront = gront && !j.avvikande.length;
    console.log(`${j.avvikande.length ? 'RÖTT ' : 'GRÖNT'}  webben visar samma filer som disken: ${j.antal - j.avvikande.length}/${j.antal}`);
    j.avvikande.forEach(f => console.log(`       ✗ ${f}`));
    console.log('');
  }

  // 1. index.html är mallen, ordagrant
  for (const dk of lista) {
    const lika = fs.existsSync(path.join(dk.mapp, 'index.html')) && Buffer.compare(fs.readFileSync(path.join(dk.mapp, 'index.html')), mall) === 0;
    console.log(`${lika ? 'GRÖNT' : 'RÖTT '}  ${dk.namn}: index.html ${lika ? 'är mallen ordagrant' : 'skiljer sig från mall/delkapitel/index.html'}`);
    gront = gront && lika;
  }
  console.log('');

  if (!NEGATIV) {
    // 2. Startsidan och kapitelindexet: vägen mellan sidorna, på dator och mobil – för varje kapitel med kapitel.js
    const kap = kapitlen();
    if (!kap.length) console.log('HOPPAS ÖVER  startsida och kapitelindex: inget kapitel med kapitel.js (<kapitel>/kapitel.js och <kapitel>/index.html)');
    for (const k of kap) for (const lage of [LAGEN[0], LAGEN[3]]) {
      const r = await provaSidorna(lage, k);
      gront = gront && r.gron;
      console.log(`${r.gron ? 'GRÖNT' : 'RÖTT '}  startsida och kapitelindex ${k.mapp}, ${lage.namn}: ${r.navigering}, JS-fel ${r.fel.length}`);
      r.kontroller.filter(x => !x.ok).forEach(x => console.log(`       ✗ ${x.namn}${x.detalj ? ' – ' + x.detalj : ''}`));
      r.fel.forEach(f => console.log(`       JS-fel: ${f}`));
    }
    console.log('');
    // 3. Varje delkapitel i varje läge
    for (const dk of lista) for (const lage of LAGEN) {
      const r = await kor(dk, lage);
      gront = gront && r.gron;
      const matt = r.kontroll && Object.values(r.kontroll.nivaer).filter(x => typeof x === 'object')
        .map(x => Object.entries(x.matt).map(([n, m]) => `${n} ${m.text}${m.for_stora.length ? ' FÅR INTE PLATS: ' + m.for_stora.map(f => 's.' + f.sida).join(',') : ''}`).join('; ')).join(' | ');
      console.log(`${r.gron ? 'GRÖNT' : 'RÖTT '}  ${dk.namn}, ${lage.namn}: navigering ${r.navigering}, ` +
        `${r.plats ? 'alla sidor får plats' : 'PLATS/STRUKTUR RÖTT'}, JS-fel ${r.fel.length}`);
      if (matt && lage === LAGEN[0]) console.log(`       text: ${matt}`);
      if (r.brytTid) console.log(`       brytningen (CPU×6, median/max av 5 varv): ` + r.brytTid.bocker.map(b => `${b.bok || 'boken'} ${b.median}/${b.max}`).join(' · ') + ' ms');
      if (r.bladTid) console.log(`       bladvändningen (CPU×6, median/max av 3 efter uppvärmning): ${r.bladTid.total}/${r.bladTid.max} ms från tangenten (sidbytet högst ${r.bladTid.upplagt} ms), längsta glapp ${r.bladTid.maxGlapp} ms`);
      r.kontroller.filter(x => !x.ok).forEach(x => console.log(`       ✗ ${x.namn}${x.detalj ? ' – ' + x.detalj : ''}`));
      r.fel.forEach(f => console.log(`       JS-fel: ${f}`));
      if (r.kontroll) r.kontroll.problem.forEach(p => console.log(`       problem: ${p}`));
      if (r.kontroll && lage === LAGEN[0]) r.kontroll.varningar.forEach(p => console.log(`       varning: ${p}`));
    }
  } else {
    // Negativ verifiering: varje fel, i varje läge, på första riktiga delkapitlet – grinden ska bli röd
    const dk = lista.find(d => !d.prov) || lista[0];
    for (const [namn, kod] of Object.entries(FEL)) for (const lage of LAGEN) {
      const r = await kor(dk, lage, kod);
      // den långsamma brytningen ska fångas av just tidsprovet
      const rott = namn === 'långsam brytning' ? r.kontroller.some(x => x.namn.startsWith('prestanda') && !x.ok) : !r.gron;
      gront = gront && rott;
      console.log(`${rott ? 'GRÖNT' : 'RÖTT '}  negativ "${namn}", ${lage.namn}: grinden blev ${rott ? 'röd, som den ska' : 'GRÖN – fångar inte felet'}` +
        ` (navigering ${r.navigering}, plats ${r.plats ? 'grön' : 'röd'}, JS-fel ${r.fel.length}` +
        (r.brytTid ? `, brytningen median högst ${r.brytTid.median} ms` : '') + ')');
      // fångas felet inte: vad som hände i stället (JS-fel och prov som inte gick igenom)
      if (!rott) { r.fel.forEach(f => console.log(`       JS-fel: ${f.split('\n').slice(0, 3).join(' ')}`));
        r.kontroller.filter(x => !x.ok).forEach(x => console.log(`       ✗ ${x.namn}${x.detalj ? ' – ' + x.detalj : ''}`)); }
    }
  }
  console.log(`\n${gront ? 'GRÖNT' : 'RÖTT'}: ${NEGATIV ? 'den negativa verifieringen' : 'bokmotorn och delkapitlen'}` +
    (BARA ? ` – bara ”${BARA}” (--bara); hela grinden är inte körd` : ''));
  process.exit(gront ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
