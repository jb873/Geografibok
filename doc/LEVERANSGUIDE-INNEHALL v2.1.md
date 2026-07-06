# Leveransguide för innehållsproducenter

> Kanonisk referens för **vad** och **hur** innehållsproducent-chatten 
> ska leverera till Alphaskolans lärplattform. Gäller för alla böcker — 
> Historia, Religion, Samhällskunskap, NO etc. Geografi (Geologi) är 
> referensimplementation.

**Senast uppdaterad:** 2026-07-03
**Version:** 2.1 (KOMPONENTER-referenser synkade till v1.8)

**Kompletterande dokumentation:**
- `KOMPONENTER-INNEHALL.md` — HTML-strukturer och scaffold-mall
- `PLATTFORMS-ANDRINGAR.md` — beslut och plattformslogik

---

## DEL 1 — Vad detta dokument är

### Problemet detta löser

Innehållsproducent-chatten ska INTE uppfinna JSON-strukturer eller fältnamn. Detta dokument beskriver **exakt** vad plattformen läser, vad den ignorerar, och vad den kräver.

### Hur dokumentet används

1. Innehållsproducent-chatten läser detta först i varje ny chatt
2. Vid varje leverans följer chatten exakt scheman här
3. Vid tveksamhet frågar chatten Joachim — uppfinner aldrig
4. När nytt fält behövs: logga i `PLATTFORMS-ANDRINGAR.md` som Typ C-ändring

### Vad ett "avsnitt" producerar

Ett avsnitt består av åtta leveransdelar:

| Del | Filtyp | Vart |
|---|---|---|
| 1. Avsnitts-HTML | `.html` | `kapitel/{kapitel}/delkapitel/{delkapitel}/avsnitt-N-{slug}.html` |
| 2. Frågor till elevboken | JSON-block i central `fragor.json` | `kapitel/{kapitel}/data/fragor.json` |
| 3. Flipcards-paket | egen `.json` | `kapitel/{kapitel}/data/flipcards/avsnitt-N-{slug}.json` |
| 4. Begrepp | JSON-block i central `begreppsbank.json` | `kapitel/{kapitel}/data/begreppsbank.json` |
| 5. Självskattningsmoment | JSON-block i central `matris.json` | `kapitel/{kapitel}/data/matris.json` |
| 6. Djupdykningar (1-3 per avsnitt) | egna `.html`-filer | `kapitel/{kapitel}/delkapitel/{delkapitel}/djupdykning-{slug}.html` |
| 7. Avsnittslista (per delkapitel) | JSON-fil | `kapitel/{kapitel}/delkapitel/{delkapitel}/data/avsnittslista.json` |
| 8. Bildprompter | text/markdown | levereras separat i chatten |

Föreläsnings-data (`forelasningar.json`) hanteras separat när YouTube-länkar finns.

---

## DEL 2 — Filstruktur

### Historia (djup nesting — standard för böcker med flera kapitel)

```
Historiabok/
├── index.html
├── amneelevbok.html
├── amnebegreppsbank.html
├── amnesjalvskattning.html
├── data/
│   ├── delkapitel-lista.json
│   └── forelasningar.json
├── css/
│   ├── geografi.css              ← delat designsystem
│   └── historia.css              ← bok-accenter
├── js/                            ← delade plattformsmoduler
├── doc/                           ← dokumentation (KOMPONENTER, LEVERANSGUIDE, PLATTFORMS-ANDRINGAR)
└── kapitel/
    └── {kapitel}/                 ← t.ex. medeltiden/
        ├── index.html
        ├── kapitelelevbok.html
        ├── kapitelbegreppsbank.html
        ├── kapitelsjalvskattning.html
        ├── data/
        │   ├── fragor.json        ← alla avsnitts elevbok-frågor
        │   ├── begreppsbank.json  ← alla kapitelets begrepp
        │   ├── matris.json        ← alla kapitelets självskattningsmoment
        │   ├── forelasningar.json ← alla föreläsningar (om finns)
        │   └── flipcards/
        │       ├── avsnitt-1-{slug}.json
        │       └── ...
        └── delkapitel/
            └── {delkapitel}/       ← t.ex. tidig/, hog/, sen/
                ├── index.html
                ├── avsnitt-1-{slug}.html
                ├── djupdykning-{slug1}.html
                ├── data/
                │   └── avsnittslista.json   ← NY (för sticky-header)
                └── img/
                    └── ...
```

### Geografi (platt struktur — legacy, färre kapitel)

```
Geografibok/
├── delkapitel/            ← geologi, demografi ligger DIREKT här
│   └── {delkapitel}/
│       ├── avsnitt-N-{slug}.html
│       ├── djupdykning-{slug}.html
│       ├── data/
│       └── img/
├── data/
├── css/
└── js/
```

### Filnamnskonventioner

- Små bokstäver, bindestreck mellan ord
- Inga åäö i filnamn (använd aa/oe/ae eller stoppa helt)
- Avsnitt: `avsnitt-{nummer}-{kortslug}.html`
- Djupdykningar: `djupdykning-{slug}.html`
- Bilder: `{tema}-{kortbeskrivning}.webp`
- Flipcards: `avsnitt-{nummer}-{kortslug}.json` (samma slug som HTML)

---

## DEL 3 — Schema: Frågor till elevboken

### Fil: `kapitel/{kapitel}/data/fragor.json`

EN central fil per kapitel med alla avsnitts frågor. Innehållsproducenten levererar **ett avsnitt-block** som klistras in.

### Schema

```json
{
  "delkapitel": "geologi",
  "_kommentar": "Frivillig dokumentation.",
  "avsnitt": [
    {
      "id": "a3_jordbavningar",
      "nummer": 3,
      "titel": "Jordbävningar",
      "fragor": [
        {
          "id": "q_a3a_uppstar",
          "typ": "grund",
          "fraga": "Förklara hur en jordbävning uppstår..."
        },
        {
          "id": "q_a3b_mata",
          "typ": "fordjupning",
          "fraga": "Förklara hur man mäter jordbävningar..."
        }
      ]
    }
  ]
}
```

### Fält-för-fält

| Fält | Krävs | Beskrivning |
|---|---|---|
| `delkapitel` (rot) | ✅ | Kapitel-id — t.ex. `"medeltiden"` |
| `_kommentar` (rot) | ❌ | Dokumentation, ignoreras |
| `avsnitt[]` | ✅ | Lista över alla avsnitt |
| `avsnitt.id` | ✅ | Stabilt id, `a{nummer}_{slug}` |
| `avsnitt.nummer` | ✅ | Avsnittsnummer inom kapitlet |
| `avsnitt.titel` | ✅ | Visad titel |
| `avsnitt.fragor[]` | ✅ | Lista över frågor |
| `fragor.id` | ✅ | Stabilt id |
| `fragor.typ` | ✅ | **`"grund"`** eller **`"fordjupning"`** — inga andra värden |
| `fragor.fraga` | ✅ | Frågetexten |

### ID-konventioner för frågor

Två stilar accepteras (välj en per avsnitt):

**Stil 1 — beskrivande:** `q_a3a_uppstar`, `q_a3b_mata`
**Stil 2 — huvudfråga/uppföljning:** `7-huvud-allmant`, `7a-huvud`, `7b-uppfoljning-1`

### Fält som IGNORERAS (uppfinn inte)

- ❌ `stodlarare`, `kravord`, `begrepp_att_leta_efter` — kvalitetskriterier-fil, ej här
- ❌ `etymologi` — hör i begreppsbank om alls
- ❌ `niva` — frågor har inte nivåer

---

## DEL 4 — Schema: Begreppsbank

### Fil: `kapitel/{kapitel}/data/begreppsbank.json`

EN fil per kapitel.

### Schema

```json
{
  "kapitel_id": "geologi",
  "kapitel_titel": "Geologi",
  "version": 1,
  "skapad": "2026-06-15",
  "kommentar": "Frivillig dokumentation.",
  "upplasning": {
    "min_ord": 8,
    "anvand_nyckelord": false,
    "beskrivning": "Frivillig text om 8-ords-tröskeln."
  },
  "begrepp": [
    {
      "id": "k1-b1",
      "avsnitt": "1",
      "avsnitt_titel": "Jordens uppbyggnad",
      "term": "densitet",
      "expertdefinition": "Hur tätt packad materia är...",
      "kallfil": "data/flipcards/geologi/avsnitt-1-jordens-uppbyggnad.json"
    }
  ]
}
```

### Fält-för-fält

| Fält | Krävs | Beskrivning |
|---|---|---|
| `kapitel_id` | ✅ | Lika som mappnamn |
| `kapitel_titel` | ✅ | Visad titel |
| `version` | ✅ | Versionsnummer |
| `skapad` | ❌ | ISO-datum |
| `kommentar` | ❌ | Dokumentation |
| `upplasning.min_ord` | ✅ | **ALLTID 8** |
| `upplasning.anvand_nyckelord` | ✅ | **ALLTID `false`** |
| `upplasning.beskrivning` | ❌ | Dokumentation |
| `begrepp[]` | ✅ | Lista över alla begrepp |
| `begrepp.id` | ✅ | `k{avsnittnr}-b{n}` eller `{nr}{underdel}-b{n}` |
| `begrepp.avsnitt` | ✅ | Avsnittsnummer som STRÄNG |
| `begrepp.avsnitt_titel` | ✅ | Avsnittets titel |
| `begrepp.term` | ✅ | **GEMENT begrepp**, bara begreppet (`"densitet"`, INTE `"Vad betyder DENSITET?"`) |
| `begrepp.expertdefinition` | ✅ | Låses upp efter 8 skrivna ord |
| `begrepp.kallfil` | ❌ | Spårbarhetslänk (rekommenderas) |

### Pedagogisk grund

Begreppsbanken är aktivt arbetsverktyg. Eleven skriver egen definition → 8 ord låser upp expertdefinitionen.

- Bara **centrala** begrepp — inte allt vokabulär
- **Term gement** (`densitet`) eftersom det visas som rubrik

### Fält som IGNORERAS

- ❌ `rubrik` med versaler ("Vad är DENSITET?") — gammal form
- ❌ `etymologi` — inte eget fält
- ❌ `nyckelord` — modellen använder inte nyckelord
- ❌ `policy`, `stodlarare`

---

## DEL 5 — Schema: Matris (självskattning)

### Fil: `kapitel/{kapitel}/data/matris.json`

### Schema

```json
{
  "kapitel_id": "geologi",
  "kapitel_titel": "Geologi",
  "version": 2,
  "skapad": "2026-06-15",
  "kommentar": "Frivillig dokumentation.",
  "skattningsalternativ": [
    {"id": "kan",       "label": "Kan",                "farg": "gron"},
    {"id": "osaker",    "label": "Osäker",             "farg": "gul"},
    {"id": "kan_ej",    "label": "Kan ej",             "farg": "rod"},
    {"id": "ej_bedomt", "label": "Ej gjort bedömning", "farg": "ljus", "default": true}
  ],
  "moment": [
    {
      "id": "geologi-3-m1",
      "avsnitt": "3",
      "avsnitt_titel": "Jordbävningar",
      "kategori": "begrepp",
      "moment": "Kan redogöra för begreppen förkastning, epicentrum och magnitud",
      "fortydligande": "Du ska kunna förklara var en jordbävning sker..."
    }
  ]
}
```

### Fält-för-fält

| Fält | Krävs | Beskrivning |
|---|---|---|
| `kapitel_id`, `kapitel_titel`, `version` | ✅ | Som ovan |
| `skattningsalternativ` | ✅ | **ALLTID de fyra ovan exakt** |
| `moment[]` | ✅ | Lista över moment |
| `moment.id` | ✅ | `{kapitel}-{avsnitt}-m{n}` |
| `moment.avsnitt` | ✅ | Avsnittsnummer som STRÄNG |
| `moment.avsnitt_titel` | ✅ | Avsnittets titel |
| `moment.kategori` | ✅ | **Exakt** `"begrepp"` eller `"fardighet"` |
| `moment.moment` | ✅ | Text eleven bedömer ("Kan redogöra för...") |
| `moment.fortydligande` | ✅ | Text som klickas fram ("Du ska kunna...") |

### Verbval (kanoniska)

| Verb | Användning | Exempel |
|---|---|---|
| **Kan beskriva** | Faktakunskap | "Kan beskriva jordens fyra lager" |
| **Kan redogöra för** | Standard, innefattar beskriva + förklara | "Kan redogöra för plattektonik" |
| **Kan förklara** | Processer eller mekanismer | "Kan förklara hur jordbävningar uppstår" |

### Gruppera begrepp

✅ **Bra:** `"Kan redogöra för begreppen förkastning, epicentrum och magnitud"`
❌ **Dåligt:** Tre separata moment

### Fält som IGNORERAS

- ❌ `stodlarare`, `kravord`, `niva`, `policy`, `etymologi`

---

## DEL 6 — Schema: Flipcards

### Fil: `kapitel/{kapitel}/data/flipcards/avsnitt-N-{slug}.json`

EN fil per avsnitt med tre korttyper.

### Schema

```json
{
  "avsnitt": 2,
  "titel": "Plattektonik",
  "delkapitel": "geologi",
  "version": "1.1",
  "kort_totalt": 35,
  "begreppskort": [
    {
      "id": "k3-b1",
      "type": "begrepp",
      "niva": "grundlaggande",
      "fraga": "Vad är KONTINENTALDRIFT?",
      "svar": "Idén att jordens kontinenter långsamt har rört sig..."
    }
  ],
  "modellkort": [
    {
      "id": "k3-m1",
      "type": "modell",
      "niva": "grundlaggande",
      "fraga": "Varför mötte Wegener MOTSTÅND?",
      "svar": "Det handlade om både förklaring och vem han var.\n\n**Det vetenskapliga problemet:**..."
    }
  ],
  "redogorelsekort": [
    {
      "id": "k3-r1",
      "type": "redogorelse",
      "niva": "grundlaggande",
      "instruktion": "Skriv ditt svar på papper, sedan vänd kortet.",
      "fraga": "Redogör för kontinentaldriftsteorin...",
      "ungefarlig_tid_min": 10,
      "modellsvar": "...",
      "stodlarare": {
        "stodord": ["Wegener", "Pangaea", "fossil", "motstånd"],
        "startfraser": [
          "Wegener föreslog att...",
          "Hans teori fick motstånd eftersom..."
        ],
        "tip_for_struktur": "Ta minst fyra av de sex bevistyperna..."
      }
    }
  ],
  "policy": "Frivillig pedagogisk kommentar."
}
```

### Tre korttyper — pedagogisk funktion

| Korttyp | Vad | Eleven gör |
|---|---|---|
| **begreppskort** | Korta begrepp + definition | Vänder och läser |
| **modellkort** | "Vad/Varför/Hur"-frågor med Markdown-svar | Vänder och läser modellsvar |
| **redogorelsekort** | Längre uppgifter med stödord | Skriver på papper FÖRST, sedan vänder |

### Fält per korttyp

**Begreppskort + Modellkort:**

| Fält | Krävs |
|---|---|
| `id`, `type`, `niva`, `fraga`, `svar` | ✅ |

**Redogörelsekort (extra fält):**

| Fält | Krävs |
|---|---|
| `id`, `type`, `niva`, `instruktion`, `fraga`, `modellsvar` | ✅ |
| `ungefarlig_tid_min` | ❌ |
| `stodlarare.stodord[]`, `startfraser[]`, `tip_for_struktur` | ❌ |

### ID-konventioner

- **Begreppskort:** `k{nr}-b{n}`
- **Modellkort:** `k{nr}-m{n}`
- **Redogörelsekort:** `k{nr}-r{n}`

### Fördelning per avsnitt (riktmärke)

Geologi-2 har ~35 kort:
- ~50% begreppskort
- ~30% modellkort
- ~20% redogörelsekort

### Nivåfördelning

- ~75% `grundlaggande`
- ~25% `fordjupning`

### `niva`-värden

**Endast:** `"grundlaggande"` eller `"fordjupning"`. Inga andra strängar.

---

## DEL 7 — Schema: Avsnittslista (för sticky-header)

### Fil: `kapitel/{kapitel}/delkapitel/{delkapitel}/data/avsnittslista.json`

EN fil per delkapitel. Driver tidslinjen i sticky-headern.

### Schema

```json
{
  "delkapitel": "tidig",
  "delkapitel_titel": "Tidig medeltid",
  "kapitel": "medeltiden",
  "avsnitt": [
    {
      "id": "a1_folkvandring",
      "nummer": 1,
      "titel": "Folkvandring",
      "ar": "~300-500",
      "fil": "avsnitt-1-folkvandring.html"
    }
  ]
}
```

### Fält-för-fält

| Fält | Krävs | Beskrivning |
|---|---|---|
| `delkapitel` | ✅ | Kort-id |
| `delkapitel_titel` | ✅ | Visad titel |
| `kapitel` | ✅ | Föräldrakapitel |
| `avsnitt[]` | ✅ | Alla avsnitt i kronologisk ordning |
| `avsnitt.id` | ✅ | Matchar `AVSNITT_ID` i sidan |
| `avsnitt.nummer` | ✅ | 1, 2, 3, 4 (sekventiellt) |
| `avsnitt.titel` | ✅ | Visad titel (kapas om för lång) |
| `avsnitt.ar` | ✅ | Årtals-intervall |
| `avsnitt.fil` | ✅ | HTML-filnamn |

### Format på `ar`-fältet

| Format | Användning | Exempel |
|---|---|---|
| `~300-500` | Intervall för process | Folkvandring, Feodalism |
| `~622` | Specifik händelse | Islams uppkomst |
| `1347-1352` | Definierad period | Digerdöden |
| `1300-tal` | Vagt århundrade | När årtal är okänt |

### För Geografi (icke-kronologiska)

Beslut väntar från Joachim (se PLATTFORMS-ANDRINGAR.md). Sannolikt lösning: nytt fält `underrubrik` som alternativ till `ar`.

### ID-konsistens (kritisk)

`avsnitt.id` MÅSTE matcha `AVSNITT_ID` i avsnittssidans script-block. Felmatchning = ingen "Du är här"-markering.

### Fält som IGNORERAS

- ❌ `beskrivning`, `ikon`, `emoji`, `farg`, `status`

---

## DEL 8 — HTML-mallar

Se **`KOMPONENTER-INNEHALL.md` (v1.8)** för alla HTML-strukturer:

- **DEL 1:** Avsnitts-scaffold — sticky tidslinje-header + mörk hero-banner + flikar/underdelar/nivåer
- **DEL 2:** Brödtext-principer per nivå (📗 Enkel = löpande prosa)
- **DEL 3:** Bildstöd-mönstret per nivå
- **DEL 4.1:** fordj-kort (djupdykningskort)
- **DEL 4.2:** brodtext-bild
- **DEL 4.3:** karnpunkter
- **DEL 4.4:** bildguide
- **DEL 4.5:** hero-banner (mörk avsnittsbanner) — *ny i v1.4*
- **DEL 7:** Föreläsnings-komponenten (YouTube-embed)
- **DEL 8:** Djupdyknings-sidans scaffold (tillbaka-banner + mörk hero) — *ny i v1.8*

**Regel:** kopiera mallar rakt av, byt bara innehåll. Ändra ALDRIG klassnamn, element-typer eller nesting.

---

## DEL 9 — Fält som plattformen IGNORERAR (varning)

Innehållsproducenten ska INTE leverera följande fält:

| Fält som uppfunnits | Anledning |
|---|---|
| `etymologi` | Kan ligga i `expertdefinition` om relevant, ej eget fält |
| `stodlarare` (utanför redogörelsekort) | Endast på redogörelsekort |
| `policy` (per moment) | Ignoreras — dokumentation i `_kommentar` |
| `niva` (på frågor eller matris) | Bara flipcards har nivå |
| `kravord`, `begrepp_att_leta_efter` | Kvalitetskriterier-fil (pausad) |
| `sambandsled_att_leta_efter` | Samma |
| `vanliga_sarkrivningar_for_hela_avsnittet` | Samma |
| `stodtext` | Existerar inte |
| `tags`, `taggar` | Ignoreras |
| `kategori` på frågor | Frågor har bara `typ` (matris har kategori) |

**Regel:** Om du tror ett fält behövs som inte finns här — **fråga Joachim**. Uppfinn aldrig.

---

## DEL 10 — Pedagogisk grund

### Avsnittssidan
- **Föreläsning-fliken:** Passiv input (video)
- **Läs-fliken:** Aktiv läsning på vald nivå
- **Öva-fliken:** Retrieval practice via flipcards
- **Elevboken-fliken:** Formativ skrivning

### Frågor till elevboken
Tvingar eleven skriva med **egna ord**. Bygger djup förståelse.

### Flipcards
Tre nivåer av kognitiv ansträngning:
- Begreppskort: igenkänning
- Modellkort: förståelse
- Redogörelsekort: produktion (högsta tröskel)

### Begreppsbank
Aktivt verktyg, inte uppslagsverk. 8-ords-tröskel tvingar egen tolkning.

### Matris
Formativ självbedömning — **inte** betyg.

### Djupdykningar
Frivillig fördjupning. Inte testas i flipcards eller matris.

---

## DEL 11 — Leveransordning per avsnitt

### Fas 1 — Diskussion (chatten)
1. Strukturskiss — underdelar A/B/C/D? Huvudfråga?
2. 5-10 centralaste begrepp
3. 3-5 viktigaste självskattningsmoment
4. **avsnittslista.json om nytt delkapitel** (Joachim ger årtal)

### Fas 2 — Brödtext (kalibrering)
5. **Standard-nivå (📘) först** — Joachim kalibrerar ton
6. När Standard godkänts: Enkel (📗) och Fördjupning (📕)

### Fas 3 — Bilder
7. Bildprompter (1-2 bilder per underdel)
8. Joachim genererar
9. Bildtexter och alt-text

### Fas 4 — JSON-data
10. Flipcards-paket
11. Begrepp-block (för `begreppsbank.json`)
12. Frågor-block (för `fragor.json`)
13. Matris-block (för `matris.json`)

### Fas 5 — Djupdykningar
14. 1-3 djupdyknings-HTML

### Fas 6 — Validering
15. Innehållsproducent levererar checklista (DEL 12)
16. Joachim klistrar in i Code
17. Code validerar

---

## DEL 12 — Checklista före leverans

### Filformat
- [ ] Filnamn enligt konvention (små, bindestreck, inga åäö)
- [ ] JSON är giltig
- [ ] HTML har rätt sökväg till CSS/JS
- [ ] `data-*`-attribut satta

### Innehåll
- [ ] Begreppsbank: `term` gement, inte versala frågor
- [ ] Matris: `kategori: "begrepp"` eller `"fardighet"` exakt
- [ ] Flipcards: rätt korttyp i rätt sektion
- [ ] Frågor: `typ: "grund"` eller `"fordjupning"` exakt
- [ ] Inga uppfunna fält (etymologi, policy, stodlarare utanför redogörelsekort)

### Pedagogik
- [ ] Tre nivåer (📗📘📕), Standard default
- [ ] Bilder INOM texten med bildguide-stil på Enkel
- [ ] Enkel-brödtext = **LÖPANDE PROSA**, inte bullet-listor
- [ ] Centrala begrepp bara i begreppsbank
- [ ] Matris: 3-4 begrepp grupperade per moment
- [ ] Flipcards: ~75% grundläggande, ~25% fördjupning
- [ ] Djupdykningar: 1-3 per avsnitt

### ID-konsistens
- [ ] `AVSNITT_ID` i HTML = `avsnitt.id` i fragor.json = `avsnitt.id` i avsnittslista.json
- [ ] `kapitel_id` samma i alla JSON-filer
- [ ] Inga dubbla id:n

---

## DEL 13 — Absoluta regler

1. **Uppfinn aldrig fält.** Fråga Joachim, hänvisa till PLATTFORMS-ANDRINGAR.md.
2. **Standard-brödtext först** — Joachim kalibrerar ton.
3. **JSON-data levereras enligt exakta scheman ovan.**

### Vid tveksamhet
- Läs detta dokument igen
- Om svaret inte finns: fråga Joachim
- Om Joachim säger något som motsäger dokumentet: säg till ramverks-chatten

### När dokumentet behöver uppdateras
Nytt fält eller ändrad struktur = **plattformsbeslut**. Logga i `PLATTFORMS-ANDRINGAR.md` som 🔵-post, bearbeta vid veckogenomgång.

---

## Bilagor — referensimplementationer

För konkreta exempel, se Geologi-kapitlets filer i Geografibok-repot:
- Flipcards: `data/flipcards/geologi/avsnitt-2-plattektonik.json`
- Begreppsbank: `data/begreppsbank/geologi.json`
- Matris: `data/matris/geologi/matris.json`
- Avsnitts-HTML: `delkapitel/geologi/avsnitt-3-jordbavningar.html`
- Djupdykning: `delkapitel/geologi/djupdykning-jordbavning-jamforelse.html`
- Föreläsning-schema: `delkapitel/geologi/data/forelasningar.json`
- Föreläsning-JS: `js/forelasningar.js`

**Geologi är referensimplementation.** När osäker — gör som Geologi gör.

---

## Revisionshistorik

- **v2.1 (2026-07-03):** KOMPONENTER-referenserna synkade från v1.3 till **v1.8**. DEL 8-listan uppdaterad med `DEL 4.5 hero-banner` (v1.4) och `DEL 8 Djupdyknings-sidans scaffold` (v1.8), samt att DEL 1-scaffolden nu har sticky tidslinje-header + mörk hero-banner.
- **v2.0 (2026-06-22):** Återskapad efter att filen inte hittades i projektet. Utökad med DEL 7 (avsnittslista för sticky-header). Kompletta scheman för alla fem datatyper. Hänvisade ursprungligen till KOMPONENTER-INNEHALL.md v1.3 (uppdaterat till v1.8 i v2.1).
- **v1.0 (tidigare):** Ursprunglig version med scheman för frågor, begreppsbank, matris, flipcards + HTML-mallar. Skapades vid överlämning från Geografi till Historia.
