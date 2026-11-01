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
