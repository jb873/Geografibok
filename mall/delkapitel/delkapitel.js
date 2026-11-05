/* MALL – ett delkapitel. Kopiera hela mappen mall/delkapitel/ till <arbetsområde>/<delkapitel>/ och fyll i data här.
 * index.html kopieras ordagrant och ändras aldrig. Fälten beskrivs i Fysik/README.md.
 *
 * ELEVTEXT: titel och undertitel sätter Joachim – skriv aldrig en beskrivning själv. */
Bok.delkapitel({
  id: 'fysik-ARBETSOMRADE-DELKAPITEL',        // unikt; nyckeln för det eleven sparat (sida, nivå) – byt det aldrig sedan
  amne: 'Fysik',
  smulor: ['Fysik', 'Arbetsområdets namn'],   // brödsmulor; {text, href} när sidan finns att länka till
  nummer: 1,                                  // delkapitlets nummer: brödsmulan "1. Namn" och etiketten "Avsnitt I"
  titel: 'Delkapitlets namn',
  undertitel: null,                           // bannerns rad under titeln, utan tankstreck: 'materia, densitet och värme'
  overrad: 'Fysik · Arbetsområdets namn',     // över titeln på bokens första sida
  upphov: { namn: 'Joachim Björkman', ar: 2026 },
  // Kapitlets gemensamma data, <arbetsområde>/kapitel.js: omslaget (överrad, titel, illustration, upphov) först i
  // varje bok. Undertiteln på omslaget är textens namn; med omslag.undertitel en egen rad, där {text} blir textens namn.
  // Utan kapitel-raden har boken inget omslag.
  kapitel: '../kapitel.js',
  // omslag: { undertitel: 'Repetition: {text}' },

  // Texterna A, B … på delkapitlets sida. Med texter är varje text en egen bok per nivå, i innehall/<text-id>/<nivå>.js
  // (samma Bok.niva(...) som annars), med egen innehållsförteckning. id blir mappens namn och nyckeln för det eleven
  // sparat – byt det aldrig sedan. En text utan innehåll på någon nivå visas som "kommer".
  // Utan texter (raden bortkommenterad) är det en bok per nivå i innehall/<nivå>.js, och texterna är bokens avsnitt.
  // texter: [
  //   { id: 'atomen', titel: 'Atomen' },
  //   { id: 'joner-isotoper-bindningar', titel: 'Joner, isotoper och bindningar' }
  // ],

  // Nivåerna är plattformens (📗 Enkel · 📘 Standard · 📕 Fördjupning), en självbärande bok per nivå i
  // innehall/<id>.js. En nivå utan avsnitt visas som "kommer". Djupdykning läggs bara till där ämnet bär det – då
  // skrivs hela listan ut:
  // nivaer: [
  //   { id: 'enkel', namn: 'Enkel', ikon: '📗' }, { id: 'standard', namn: 'Standard', ikon: '📘' },
  //   { id: 'fordjupning', namn: 'Fördjupning', ikon: '📕' }, { id: 'djupdykning', namn: 'Djupdykning' }
  // ],

  // Plattformens hjälpmedel – länkas, byggs aldrig här. Föreläsning, Öva och Elevboken är flikarna på delkapitlets
  // sida; Öva, Självskattning och Begreppslista länkas också inifrån boken. Utan adress: synligt, märkt "kommer", inte
  // klickbart. {begrepp}, {avsnitt} och {niva} i adressen fylls i där länken står (t.ex. '../begrepp/index.html#{begrepp}').
  hjalpmedel: {
    forelasning:    { href: null },
    ova:            { href: null },
    sjalvskattning: { href: null },
    begreppslista:  { href: null },
    elevbok:        { href: null }
  }
});
