// bok-grind.js – verifierar bokmotorn och varje delkapitel i Fysik.
//
//   node verktyg/bok-grind.js              alla delkapitel (och provboken) i alla lägen
//   node verktyg/bok-grind.js --negativ    negativ verifiering: tre fel läggs in med flit, ett i taget, och grinden
//                                          ska bli röd för vart och ett i varje läge
//   node verktyg/bok-grind.js --bilder     sparar skärmbilder av hubben och boken (i os.tmpdir()/bok-grind)
//
// Delkapitlen letas upp på disken: varje mapp <område>/<delkapitel>/ med en delkapitel.js. Ett nytt delkapitel
// kommer alltså med av sig självt. För varje delkapitel prövas:
//   1. att index.html är byte för byte lika med mall/delkapitel/index.html (motorn är fryst; allt annat är data)
//   2. i Chrome (headless), i varje läge nedan: navigeringen (hubb → öppna → bläddra → hoppa → stäng → minns),
//      att alla sidor får plats och att strukturen är hel (?kontroll), och att inga JS-fel uppstår – fångade med
//      window.onerror och unhandledrejection, och med Chromes egna undantag (Runtime.exceptionThrown) som extra nät.
// Provboken (verktyg/provbok/) prövar dessutom det som det riktiga innehållet inte använder än: hjälpmedel med
// adress, begrepp som länkar, en fjärde nivå (djupdykning) och kraftpilarna.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');

const ROT = path.resolve(__dirname, '..');
const MALL = path.join(ROT, 'mall', 'delkapitel', 'index.html');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const NEGATIV = process.argv.includes('--negativ'), BILDER = process.argv.includes('--bilder');
const BILDMAPP = path.join(os.tmpdir(), 'bok-grind');

// Målskärmen: Chromebook 1366 × 768. I fönstret återstår ca 1366 × 633; 1366 × 768 i fönstret och i helskärm.
// Mobilen är inte målskärm men ska fungera.
const LAGEN = [
  { namn: '1366×633 i fönstret', B: 1366, H: 633, helskarm: false },
  { namn: '1366×768 i fönstret', B: 1366, H: 768, helskarm: false },
  { namn: '1366×768 i helskärm', B: 1366, H: 768, helskarm: true },
  { namn: 'mobil 390×664', B: 390, H: 664, helskarm: true, mobil: true }
];

// De tre felen i den negativa verifieringen. Vart och ett ska ge rött i varje läge (V12: samma läge som grinden).
const FEL = {
  'js-fel': `addEventListener('load', () => setTimeout(() => { throw new Error('negativ verifiering: injicerat fel'); }, 0));`,
  'för tät sida': `addEventListener('DOMContentLoaded', () => { const s = document.createElement('style');
    s.textContent = '.sida { font-size: calc(var(--fs) * 1.45) !important; }'; document.head.append(s); });`,
  'stäng fungerar inte': `history.back = () => {};`
};

const FANGA_FEL = `window.__fel = [];
  window.onerror = function (m, s, l) { window.__fel.push(m + ' (' + String(s).split('/').pop() + ':' + l + ')'); };
  window.addEventListener('unhandledrejection', function (e) { window.__fel.push('unhandledrejection: ' + (e.reason && e.reason.message || e.reason)); });`;

/* ---------- Delkapitlen på disken ---------- */

function delkapitel() {
  const ut = [];
  for (const omr of fs.readdirSync(ROT, { withFileTypes: true })) {
    if (!omr.isDirectory() || ['bokskal', 'mall', 'verktyg', 'node_modules'].includes(omr.name) || omr.name.startsWith('.')) continue;
    for (const d of fs.readdirSync(path.join(ROT, omr.name), { withFileTypes: true })) {
      const mapp = path.join(ROT, omr.name, d.name);
      if (d.isDirectory() && fs.existsSync(path.join(mapp, 'delkapitel.js'))) ut.push({ namn: `${omr.name}/${d.name}`, mapp, prov: false });
    }
  }
  const prov = path.join(__dirname, 'provbok');
  if (fs.existsSync(path.join(prov, 'delkapitel.js'))) ut.push({ namn: 'verktyg/provbok (provdata)', mapp: prov, prov: true });
  return ut;
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
      ['mousePressed', 'mouseReleased'].reduce((p, type) => p.then(() => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 })), Promise.resolve());
    }
  };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; vant[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async uttryck => {
    const svar = (await send('Runtime.evaluate', { expression: uttryck, awaitPromise: true, returnByValue: true, userGesture: true })).result;
    if (svar.exceptionDetails) throw new Error('i sidan: ' + (svar.exceptionDetails.exception ? svar.exceptionDetails.exception.description : svar.exceptionDetails.text));
    return svar.result.value;
  };
  const stang = async () => {
    try { ws.close(); } catch (e) { /* redan stängd */ }
    proc.kill();
    await new Promise(r => proc.once('exit', r).once('error', r));
    try { fs.rmSync(profil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) { /* Windows släpper filen senare; tmp städas av systemet */ }
  };
  return { send, ev, undantag, stang };
}

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
  const textA = text(0), startA = +textA.dataset.oppna, titelA = textA.querySelector('.underdel-titel').textContent;
  await gest(textA);
  const antal = $$('.lr-sida').length;
  prova('öppna: ett tryck på en text öppnar boken', oppen());
  prova(helskarmLage ? 'öppna: boken öppnas i helskärm' : 'öppna: boken öppnas i fönstret', helsk() === helskarmLage, 'helskärm=' + helsk());
  prova('öppna: text A öppnar boken där texten börjar', syns().includes(startA) && location.hash === '#sida-' + startA &&
    $('.scen .sida[data-nr="' + startA + '"] .sh-namn').textContent.includes(titelA), syns() + ' ' + location.hash + ' (' + titelA + ')');
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
  prova('meny: Innehåll öppnar förteckningen med "du är här"', !$('.meny').hidden && $$('.meny [aria-current="page"]').some(b => vis.includes(+b.dataset.till)));
  tangent('Escape'); await v(80);
  prova('meny: Esc stänger menyn, boken är kvar', $('.meny').hidden && oppen());
  tangent('ArrowLeft'); await v(80);

  // Hopp via innehållet i menyn och tillbaka
  await klicka(synlig('.bok-innehall'));
  const malsida = $$('.meny .toc-knapp').map(b => +b.dataset.till).find(n => n > s0 + 2 * steg) ||
    $$('.meny .toc-knapp').map(b => +b.dataset.till).find(n => !syns().includes(n));
  const fore = syns();
  await klicka($('.meny .toc-knapp[data-till="' + malsida + '"]'));
  prova('hoppa: en rad i innehållet går till sidan', $('.meny').hidden && syns().includes(malsida), syns() + ' (mål ' + malsida + ')');
  const chip = synlig('.tillbaka-chip:not([hidden])'), dit = chip && +(chip.textContent.match(/sida (\d+)/) || [])[1];
  prova('hoppa: "Tillbaka till sida x" visas, x där eleven var', fore.includes(dit), chip && chip.textContent);
  if (chip) await klicka(chip);
  prova('hoppa: tillbaka-knappen går tillbaka', syns()[0] === s0, syns());
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

  // Läs en bit, stäng med ✕, öppna igen: boken minns sidan
  tangent('ArrowRight'); await v(60); tangent('ArrowRight'); await v(60);
  const minne = Bok.sida;
  await klicka(synlig('.bok-stang'), 450);
  prova('stäng: ✕ Stäng går tillbaka till delkapitlet (och lämnar helskärmen)', stangd(), 'hash=' + location.hash + ' helskärm=' + helsk());
  const dar = $('.underdel-knapp.aktiv'), lage = $('section[data-flik="laes"] .intro').textContent;
  prova('stäng: hubben säger var eleven var (texten markerad, sidan nämnd)', dar && +dar.dataset.oppna === minne && lage.includes('sida ' + minne),
    (dar && dar.textContent + ' → ' + dar.dataset.oppna) + ' | ' + lage + ' (mindes ' + minne + ')');
  prova('stäng: fokus tillbaka på texten som öppnade boken', document.activeElement === $('.underdel-knapp[data-fokus="text-a"]'), document.activeElement && document.activeElement.textContent);
  await gest(dar);
  prova('minns: boken öppnas på samma sida', syns().includes(minne), syns() + ' (mindes ' + minne + ')');
  prova(helskarmLage ? 'minns: i helskärm igen' : 'minns: i fönstret igen', helsk() === helskarmLage, 'helskärm=' + helsk());

  // Esc: i helskärm tar webbläsaren Esc och lämnar helskärmen – det görs här som webbläsaren gör det
  if (helsk()) await document.exitFullscreen(); else tangent('Escape');
  await v(450);
  prova('stäng: Esc går tillbaka till delkapitlet', stangd(), 'hash=' + location.hash);

  // En annan text öppnar boken där den texten börjar
  const avsn = $('.underdel-knapp:not(.aktiv)') || $('.underdel-knapp');
  const start = +avsn.dataset.oppna, titel = avsn.querySelector('.underdel-titel').textContent;
  await gest(avsn);
  prova('öppna: en annan text öppnar boken där den texten börjar', syns().includes(start) && $('.scen .sida[data-nr="' + start + '"] .sh-namn').textContent.includes(titel), syns() + ' (' + titel + ', s. ' + start + ')');
  history.back(); await v(450);
  prova('stäng: webbläsarens bakåt går tillbaka till delkapitlet', stangd(), 'hash=' + location.hash);
  history.forward(); await v(450);
  prova('framåt: boken kommer tillbaka på samma sida', oppen() && syns().includes(start), syns());
  await klicka(synlig('.bok-stang'), 450);
  prova('stäng: igen', stangd());
  return k;
}`;

// Provboken: det som Materia inte använder än (hjälpmedel med adress, begreppslänkar, djupdykning, kraftpilar).
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
  tangent('End'); await v(100);
  const fig = $('.scen .figur-bild[aria-label^="Kraftpilar"]');
  const spetsar = fig ? fig.querySelectorAll('.fig-pilspets').length : 0;
  prova('prov: kraftpilarna ritas ur data – en pil per kraft och resultanten', spetsar === 5, spetsar + ' pilar; ' + (fig && fig.getAttribute('aria-label')));
  prova('prov: resultanten räknas ur krafterna (10 N höger − 4 N vänster = 6 N höger)', fig && /Resultanten 6 N åt höger/.test(fig.getAttribute('aria-label')));
  const linjer = fig ? [...fig.querySelectorAll('line.fig-pil')].map(l => Math.hypot(l.x2.baseVal.value - l.x1.baseVal.value, l.y2.baseVal.value - l.y1.baseVal.value)) : [];
  prova('prov: kraftpilens längd följer storleken (20 N dubbelt så lång som 10 N)', linjer.length >= 3 && Math.abs((linjer[0] + 12.6) / (linjer[2] + 12.6) - 2) < 0.02, linjer.map(Math.round));
  // Sista sidan i avsnittet: länken ut till öva/självskattning
  const lank = $$('.scen .b-lank a.lank-post');
  prova('prov: länkblocket i avsnittets slut länkar till Öva med avsnittet ifyllt', lank.some(a => a.getAttribute('href') === 'hjalpmedel.html?vad=ova&avsnitt=krafter'), lank.map(a => a.getAttribute('href')));
  prova('prov: länkblocket visar ett hjälpmedel utan adress som "kommer"', $$('.scen .b-lank .lank-post.kommer').length > 0);
  const fs_ = $('.scen .figur-bild[aria-label^="Ett kar"]');
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
  return k;
}`;

/* ---------- En körning: ett delkapitel i ett läge ---------- */

async function kor(dk, lage, felkod) {
  const c = await chrome();
  const res = { kontroller: [], fel: [], kontroll: null };
  try {
    await c.send('Page.enable'); await c.send('Runtime.enable');
    await c.send('Runtime.addBinding', { name: '__gest' });
    await c.send('Emulation.setDeviceMetricsOverride', { width: lage.B, height: lage.H, deviceScaleFactor: 1, mobile: !!lage.mobil });
    if (lage.mobil) await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await c.send('Page.addScriptToEvaluateOnNewDocument', { source: FANGA_FEL + (felkod || '') });
    const url = 'file:///' + path.join(dk.mapp, 'index.html').replace(/\\/g, '/') + '?kontroll';
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
    // En adress som pekar på en sida öppnar boken där; Stäng leder till hubben i samma delkapitel.
    // (En kortare bok än 5 sidor öppnas på sista sidan.)
    await ladda(url + '#sida-5');
    const direkt = await c.ev(`(async () => {
      const v = ms => new Promise(r => setTimeout(r, ms)), $ = s => document.querySelector(s);
      const syns = [...document.querySelectorAll('.scen .uppslag > .sida[data-nr]')].map(e => +e.dataset.nr);
      const mal = Math.min(5, document.querySelectorAll('.lr-sida').length);
      const forst = !$('.bokapp').hidden && syns.includes(mal);
      [...document.querySelectorAll('.bok-stang')].find(e => e.offsetParent).click(); await v(450);
      return { forst, sedan: $('.bokapp').hidden && location.hash === '' && !!document.body.dataset.klar, syns, mal };
    })()`);
    res.kontroller.push({ namn: 'adress: index.html#sida-5 öppnar boken på sidan', ok: direkt.forst, detalj: direkt.syns.join('-') + ' (mål ' + direkt.mal + ')' });
    res.kontroller.push({ namn: 'adress: Stäng leder därifrån till hubben i samma delkapitel', ok: direkt.sedan, detalj: '' });
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

/* ---------- Huvudprogrammet ---------- */

(async () => {
  const lista = delkapitel();
  const mall = fs.readFileSync(MALL);
  let gront = true;
  console.log(`Bokmotorn: ${lista.length} delkapitel (${lista.map(d => d.namn).join(', ')})\n`);

  // 1. index.html är mallen, ordagrant
  for (const dk of lista) {
    const lika = fs.existsSync(path.join(dk.mapp, 'index.html')) && Buffer.compare(fs.readFileSync(path.join(dk.mapp, 'index.html')), mall) === 0;
    console.log(`${lika ? 'GRÖNT' : 'RÖTT '}  ${dk.namn}: index.html ${lika ? 'är mallen ordagrant' : 'skiljer sig från mall/delkapitel/index.html'}`);
    gront = gront && lika;
  }
  console.log('');

  if (!NEGATIV) {
    // 2. Varje delkapitel i varje läge
    for (const dk of lista) for (const lage of LAGEN) {
      const r = await kor(dk, lage);
      gront = gront && r.gron;
      const matt = r.kontroll && Object.values(r.kontroll.nivaer).filter(x => typeof x === 'object')
        .map(x => Object.entries(x.matt).map(([n, m]) => `${n} ${m.text}${m.for_stora.length ? ' FÅR INTE PLATS: ' + m.for_stora.map(f => 's.' + f.sida).join(',') : ''}`).join('; ')).join(' | ');
      console.log(`${r.gron ? 'GRÖNT' : 'RÖTT '}  ${dk.namn}, ${lage.namn}: navigering ${r.navigering}, ` +
        `${r.plats ? 'alla sidor får plats' : 'PLATS/STRUKTUR RÖTT'}, JS-fel ${r.fel.length}`);
      if (matt && lage === LAGEN[0]) console.log(`       text: ${matt}`);
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
      const rott = !r.gron;
      gront = gront && rott;
      console.log(`${rott ? 'GRÖNT' : 'RÖTT '}  negativ "${namn}", ${lage.namn}: grinden blev ${rott ? 'röd, som den ska' : 'GRÖN – fångar inte felet'}` +
        ` (navigering ${r.navigering}, plats ${r.plats ? 'grön' : 'röd'}, JS-fel ${r.fel.length})`);
    }
  }
  console.log(`\n${gront ? 'GRÖNT' : 'RÖTT'}: ${NEGATIV ? 'den negativa verifieringen' : 'bokmotorn och delkapitlen'}`);
  process.exit(gront ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
