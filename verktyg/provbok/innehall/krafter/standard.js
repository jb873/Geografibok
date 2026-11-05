/* PROVDATA för verktyg/bok-grind.js – inte elevinnehåll. */
Bok.niva('standard', {
  avsnitt: [
    {
      id: 'krafter', titel: 'Krafter',
      sidor: [
        { titel: 'Provsida med begrepp', block: [
          { typ: 'text', text: 'Provtext: en *kraft* och flera *krafter|kraft*.' }
        ] },
        { titel: 'Provsida med kraftpilar', block: [
          { typ: 'figur', namn: 'kraftpilar', foremal: { form: 'lada' }, underlag: true, resultant: true, krafter: [
            { namn: 'Tyngdkraft', riktning: 'ner', storlek: 20 },
            { namn: 'Normalkraft', riktning: 'upp', storlek: 20 },
            { namn: 'Dragkraft', riktning: 'hoger', storlek: 10 },
            { namn: 'Friktion', riktning: 'vanster', storlek: 4 }
          ] }
        ] },
        // Bildfiguren (order 11): en stor bild utan bildtext och en med en bildtext på två rader
        { titel: 'Provsida med bilder', block: [
          { typ: 'text', text: 'Provtext före den stora bilden. Bilden är större än spalten och ska bli liten i texten och klickbar till större.' },
          { typ: 'figur', id: 'bild-stor', namn: 'bild', bild: 'bilder/hundra-svenskar-da-och-nu.webp', bredd: 1528, hojd: 936,
            beskrivning: 'Provbild: hundra figurer i tre rader, färgade efter näring.' },
          { typ: 'text', text: 'Provtext före bilden med bildtext.' },
          { typ: 'figur', id: 'bild-bildtext', namn: 'bild', bild: 'bilder/robottathet.webp', bredd: 1448, hojd: 747,
            beskrivning: 'Provbild: staplar som jämför antalet industrirobotar per anställd i några länder.',
            bildtext: 'Provbildtext på två rader: bildtexten räknas in i figurens höjd, högst 35 procent av sidan.' },
          // rutans fundera (order 15): bildguiden – rubrik, punkter och en kursiv fråga sist
          { typ: 'ruta', rubrik: 'Titta på bilden – Provbilden', punkter: ['Provpunkt ett.', 'Provpunkt två.'], fundera: 'Fundera: En provfråga sist i rutan?' }
        ] },
        { titel: 'Provsida med flyter och sjunker', block: [
          { typ: 'figur', namn: 'flyter_sjunker', foremal: [
            { namn: 'Kork', densitet: 0.25 },
            { namn: 'Sten', densitet: 2.6 }
          ] },
          { typ: 'lank', till: ['ova', 'elevbok'] }
        ] }
      ]
    }
  ]
});
