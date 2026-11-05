/* PROVDATA för verktyg/bok-grind.js – inte elevinnehåll. En bok med Inledning, två numrerade avsnitt (texterna A och
 * B på delkapitlets sida) och Sammanfattning, som Materia var byggd före "en bok per text". */
Bok.niva('standard', {
  avsnitt: [
    {
      id: 'inledning', titel: 'Inledning', numrerad: false,
      sidor: [
        { titel: 'Provsida: inledning', block: [
          { typ: 'text', text: 'Provtext. Texterna A och B är avsnitt i den här boken.' }
        ] }
      ]
    },
    {
      id: 'forsta', titel: 'Första texten',
      sidor: [
        { titel: 'Provsida A1', block: [{ typ: 'text', text: 'Provtext.' }] },
        { titel: 'Provsida A2', block: [{ typ: 'text', text: 'Provtext.' }, { typ: 'lank', till: ['ova', 'sjalvskattning'] }] }
      ]
    },
    {
      id: 'andra', titel: 'Andra texten',
      sidor: [
        { titel: 'Provsida B1', block: [{ typ: 'text', text: 'Provtext.' }] },
        { titel: 'Provsida B2', block: [{ typ: 'text', text: 'Provtext.' }, { typ: 'lank', till: ['ova', 'sjalvskattning'] }] }
      ]
    },
    {
      id: 'sammanfattning', titel: 'Sammanfattning', numrerad: false,
      sidor: [
        { titel: 'Provsida: sammanfattning', block: [
          { typ: 'punkter', punkter: ['Provpunkt.', 'Provpunkt.'] },
          { typ: 'lank', till: ['ova', 'sjalvskattning'] }
        ] }
      ]
    }
  ]
});
