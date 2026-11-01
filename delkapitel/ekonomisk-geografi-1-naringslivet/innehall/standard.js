/* Ekonomisk geografi, avsnitt 1 Näringslivet – Standard-nivåns bok.
 * v2: Joachims text, strukturerad till bokformatet – en idé per sida, underrubriker som påståenden, uppräkningar som
 * punktlistor, kortare meningar. Inget nytt sakinnehåll. Begreppen (*så här*) är de som är fetade i originaltexten.
 * v1 (texten ordagrant) finns i commit b50aecb.
 * Ram: 600–800 ord per avsnitt (Standard); ca 780 ord inklusive rubriker.
 * En bok per avsnitt: avsnittsnumret står i hubbens banner, därför numrerad: false här. */
Bok.niva('standard', {
  avsnitt: [
    {
      id: 'naringslivet', titel: 'Näringslivet', numrerad: false,
      sidor: [
        { titel: 'Ekonomisk geografi handlar om var varor och tjänster produceras', block: [
          { typ: 'text', text: 'Varför finns det stora industrier på vissa platser och jordbruk på andra? Varför tillverkas många av de varor vi köper långt bort från Sverige? Och varför är vissa länder rika medan andra är fattiga?' },
          { typ: 'text', text: 'Sådana frågor studerar vi inom *ekonomisk geografi*. Det handlar om hur människor använder jordens resurser för att producera varor och tjänster, och hur den ekonomiska verksamheten är fördelad mellan olika platser i världen.' }
        ] },
        { titel: 'Förutsättningarna avgör vilket näringsliv en plats får', block: [
          { typ: 'text', text: 'Vilka verksamheter som kan utvecklas på en plats beror på tillgången till' },
          { typ: 'punkter', punkter: ['naturresurser', 'arbetskraft', 'kapital', 'teknik', 'transporter.'] },
          { typ: 'text', text: 'Näringslivet förändras också när ny teknik utvecklas, människor flyttar och handeln mellan länder ökar. Ekonomisk geografi hjälper oss att förstå varför näringslivet ser olika ut i världen och hur människor, företag och länder är beroende av varandra.' }
        ] },
        { titel: 'Näringslivet är där varor och tjänster produceras och säljs', block: [
          { typ: 'text', text: 'Människor behöver mat, kläder och bostäder. Vi behöver också tjänster som sjukvård, utbildning och transporter. För det måste varor tillverkas och tjänster utföras.' },
          { typ: 'text', text: '*Näringslivet|näringsliv* är den samlade ekonomiska verksamhet där varor och tjänster produceras och säljs. Hit hör till exempel jordbruk, industrier, byggföretag, butiker, banker och transportföretag. Det mesta sker i företag, men varor och tjänster produceras också i den offentliga sektorn.' }
        ] },
        { titel: 'Näringslivet ger arbete, lön och skatteinkomster', block: [
          { typ: 'text', text: 'Näringslivet skapar arbetstillfällen och inkomster:' },
          { typ: 'punkter', punkter: [
            'människor arbetar och får lön',
            'företag säljer sina produkter',
            'staten får skatteinkomster, som bland annat betalar skolor, sjukvård och vägar.'
          ] }
        ] },
        { titel: 'Konsumtion är att använda varor och tjänster', block: [
          { typ: 'text', text: 'När vi äter frukost, använder mobilen, åker buss eller besöker en läkare handlar det om *konsumtion*. Konsumtion innebär att människor använder varor och tjänster för att tillgodose sina behov och önskemål.' },
          { typ: 'text', text: 'En del av vår konsumtion betalar vi direkt för, som mat och kläder. Annat, som undervisning i skolan och sjukvård, betalas till stor del med skatter.' }
        ] },
        { titel: 'Konsumtionen påverkar vad som produceras', block: [
          { typ: 'text', text: 'Företag och andra verksamheter behöver producera det som människor efterfrågar.' },
          { typ: 'punkter', punkter: [
            'När efterfrågan på en vara ökar kan produktionen behöva öka.',
            'När människor slutar köpa en produkt kan tillverkningen behöva minska.'
          ] }
        ] },
        { titel: 'Varor är fysiska produkter som görs av råvaror', block: [
          { typ: 'text', text: '*Varor|vara* är fysiska produkter som tillverkas eller tas fram för att användas eller säljas, till exempel livsmedel, kläder, möbler, bilar och mobiltelefoner.' },
          { typ: 'text', text: 'För att tillverka varor behövs råvaror. Råvaror är material som kommer från naturen, till exempel trä från skogen, järnmalm från berggrunden och bomull från bomullsplantor.' }
        ] },
        { titel: 'Förädling gör råvaror användbara', block: [
          { typ: 'text', text: 'Många råvaror måste bearbetas innan de kan användas. Det kallas *förädling*.' },
          { typ: 'punkter', punkter: [
            'Träd förädlas till virke, som används till hus och möbler.',
            'Järnmalm förädlas till järn och stål, som används i bilar och maskiner.'
          ] }
        ] },
        { titel: 'En vara kan tillverkas i flera länder', block: [
          { typ: 'text', text: 'Vissa varor tillverkas i flera steg och i olika länder. En mobiltelefon kan innehålla råvaror från Afrika, komponenter från Asien och teknik som utvecklats i Europa eller USA.' },
          { typ: 'text', text: 'Produktionen av varor knyter alltså samman olika delar av världen.' }
        ] },
        { titel: 'Tjänster är arbete som utförs åt andra', block: [
          { typ: 'text', text: 'Alla verksamheter producerar inte fysiska varor. Många erbjuder i stället *tjänster|tjänst*: någon utför ett arbete eller erbjuder en service åt andra.' },
          { typ: 'text', text: 'När en frisör klipper hår, en läkare undersöker en patient eller en lärare undervisar elever produceras tjänster. Även transporter, banker, hotell och restauranger erbjuder tjänster.' }
        ] },
        { titel: 'Tjänster kan vara privata eller offentliga', block: [
          { typ: 'jamforelse', kolumner: [
            { rubrik: '*Privata tjänster*', punkter: [
              'erbjuds av företag',
              'betalas oftast av kunderna',
              'till exempel frisörer, banker, hotell och butiker'
            ] },
            { rubrik: '*Offentliga tjänster*', punkter: [
              'erbjuds av stat, regioner och kommuner',
              'betalas främst med skatter',
              'till exempel polis, kommunala skolor och offentlig sjukvård'
            ] }
          ] },
          { typ: 'text', text: 'Gränsen är inte alltid tydlig. En skola kan drivas av ett privat företag men betalas med offentliga medel.' }
        ] },
        { titel: 'Produktion är att tillverka varor eller utföra tjänster', block: [
          { typ: 'text', text: '*Produktion* innebär att varor tillverkas eller att tjänster utförs. All ekonomisk verksamhet bygger på någon form av produktion.' },
          { typ: 'text', text: 'En bonde som odlar vete och en fabrik som tillverkar bilar producerar varor. En frisör som klipper hår producerar en tjänst.' }
        ] },
        { titel: 'Produktionen behöver resurser', block: [
          { typ: 'punkter', punkter: [
            'Naturresurser används som råvaror.',
            'Människor bidrar med arbetskraft och kunskap.',
            'Maskiner, byggnader och pengar gör det möjligt att organisera och utveckla verksamheten.'
          ] }
        ] },
        { titel: 'Produktion och konsumtion hänger ihop', block: [
          { typ: 'text', text: 'Varor och tjänster produceras för att någon ska använda dem. Samtidigt skapar produktionen arbetstillfällen och inkomster, och det gör det möjligt för människor att konsumera.' }
        ] },
        { titel: 'Handeln binder samman ländernas näringsliv', block: [
          { typ: 'text', text: 'En vara behöver inte produceras i samma land som den konsumeras.' },
          { typ: 'jamforelse', kolumner: [
            { rubrik: 'Sverige importerar', punkter: ['kläder', 'elektronik', 'livsmedel'] },
            { rubrik: 'Sverige exporterar', punkter: ['fordon', 'maskiner', 'läkemedel'] }
          ] },
          { typ: 'text', text: 'Genom internationell handel binds ländernas näringsliv samman.' }
        ] },
        { titel: 'Näringslivet ser olika ut i världen', block: [
          { typ: 'punkter', punkter: [
            'I vissa länder arbetar en stor del av befolkningen inom jordbruket.',
            'Andra länder har omfattande industriproduktion.',
            'I ekonomiskt utvecklade länder arbetar en stor andel med olika tjänster.'
          ] },
          { typ: 'text', text: 'Skillnaderna beror bland annat på ländernas naturresurser, utbildningsnivå, tekniska utveckling och ekonomiska förutsättningar. Det ser vi närmare på i nästa avsnitt.' },
          { typ: 'lank', till: ['ova', 'sjalvskattning'] }
        ] }
      ]
    }
  ]
});
