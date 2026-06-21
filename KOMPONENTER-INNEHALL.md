# Komponenter — HTML-strukturer för innehållsproducenter

> Kanonisk dokumentation av återanvändbara HTML-komponenter och 
> avsnittsmallar i Alphaskolans lärplattform. Bilaga till 
> `LEVERANSGUIDE-INNEHALL.md`.
>
> Innehållssessioner ser inte CSS — bara HTML. För att producera 
> fungerande markup måste de exakta klassnamnen vara dokumenterade.

**Senast uppdaterad:** 2026-06-21 (v1.3)
**Version:** 1.3
**Källa för alla mallar:** Geografibokens Geologi-kapitel + Historiabokens 
producerade scaffold (verifierad mot CSS + JS + live-rendering)

---

## Princip

Plattformskomponenter har **exakta klassnamn och struktur** som CSS:n kräver. Innehållsproducenten:

- Kopierar mallen rakt av
- Byter bara innehållet (text, länkar, ikoner)
- Ändrar INTE klassnamn, element-typer eller nesting-struktur

Vid tveksamhet — kolla Geografi-referensimplementationen.

### Dokumentationsprincip

Komponentstrukturer dokumenteras enligt **vad CSS:n faktiskt stilsätter och JS:n läser**, inte enligt vad som råkar finnas i HTML-källkod. CSS + JS är det som avgör vad eleven ser. HTML-källkod kan ha legacy-element eller interna motsägelser.

Verifieringskrav: HTML + CSS + renderad sida måste stämma innan dokumentation skrivs.

---

## DEL 1 — Avsnitts-scaffold (kanonisk)

> Detta är **facit för flik-/underdels-/nivå-strukturen** på en avsnittssida.
> Klipp och fyll i. Verifierad mot `css/geografi.css` + `js/avsnitt.js`.

### Placering

En avsnittssida ligger i:
```
kapitel/{kapitel}/delkapitel/{delkapitel}/avsnitt-{n}-{slug}.html
```

CSS/JS-länkar pekar **fyra nivåer upp** (`../../../../`). Data-filer pekar **två nivåer upp** (`../../`).

### Aktiv-markering — källan till alla tidigare buggar

- **KNAPPAR** markeras aktiva med klassen `aktiv`
- **INNEHÅLL** (paneler, underdel-text, nivå-artiklar) markeras aktivt genom **frånvaro** av `dold`
- `js/avsnitt.js` togglar `dold` på innehåll och `aktiv` på knappar

### Fem fällor — gör ALDRIG så här

1. **`data-niva` måste vara `"enkel"`/`"standard"`/`"fordjupning"`** — aldrig `"1"`/`"2"`/`"3"`. `avsnitt.js` startar på `'standard'`; fel värde → ingen text syns.

2. **EN delad `.niva-valjare`** i Läs-panelen, EFTER `.underdel-valjare` och UTANFÖR alla `.underdel-text` — aldrig en väljare per underdel.

3. **`data-niva-nyckel` sitter på `.niva-valjare`** — aldrig på `<body>`.

4. **Underdels-sektioner har klass `underdel-text`** — aldrig bara `underdel`. Bare `.underdel` blir scope-rot i `avsnitt.js` och bryter flik/nivå-logiken.

5. **Tom `.forelasningar-lista`-container är rätt.** Skriv ALDRIG statisk HTML för föreläsningskort inuti — `js/forelasningar.js` tömmer containern vid laddning och fyller på från JSON. Vill du ha föreläsningar — lägg till objekt i `data/forelasningar.json` med matchande `avsnitt_id`. Se DEL 7.

### Ankarpunkter

Underdels-sektioner behöver **ingen `id`**. `avsnitt.js` läser `location.hash` (`#a`/`#b`/`#c`) och aktiverar via `data-underdel`. Djupdykningars tillbaka-länk pekar på `avsnitt-...html#a/#b/#c` (rätt underdel).

### Komplett scaffold-mall

```html
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{Avsnittstitel}} – {{Delkapiteltitel}} – {{Ämne}}</title>
  <link rel="stylesheet" href="../../../../css/geografi.css">
  <link rel="stylesheet" href="../../../../css/{{bok}}.css">
  <link rel="stylesheet" href="../../../../css/flipcards.css">
</head>
<body>
  <div class="sida">

    <!-- ===== BRÖDSMULOR ===== -->
    <nav class="brodsmulor">
      <a href="../../../../index.html">{{Ämne}}</a>
      <span class="skiljare">›</span>
      <a href="../../index.html">{{Kapitel}}</a>
      <span class="skiljare">›</span>
      <a href="index.html">{{Delkapitel}}</a>
      <span class="skiljare">›</span>
      <span class="aktuell">{{Avsnittstitel}}</span>
    </nav>

    <!-- Accent-list (bok-identitet) -->
    <div aria-hidden="true" style="height:6px;max-width:120px;margin:0 auto 2rem;border-radius:3px;background:linear-gradient(90deg,var(--accent),var(--accent-2));"></div>

    <header class="avsnitt-header">
      <span class="avsnitt-label">Avsnitt {{n}}</span>
      <h1>{{Avsnittstitel}}</h1>
      <p class="subtitel">— {{kort underrubrik}} —</p>
    </header>

    <!-- ===== FLIKRAD ===== -->
    <div class="flikar-rad" role="tablist">
      <button type="button" class="flik" data-flik="forelasning" role="tab">Föreläsning</button>
      <button type="button" class="flik aktiv" data-flik="las" role="tab">Läs</button>
      <button type="button" class="flik" data-flik="ova" role="tab">Öva</button>
      <button type="button" class="flik" data-flik="elevboken" role="tab">Elevboken</button>
    </div>

    <!-- ===== FÖRELÄSNING — tom mount, JS fyller på från data/forelasningar.json.
         Flikknappen sätts disabled av JS om inga föreläsningar finns för avsnittet.
         Se DEL 7. ===== -->
    <section class="flik-innehall dold" data-flik="forelasning" role="tabpanel">
      <div class="forelasningar-lista"></div>
    </section>

    <!-- ===== LÄS (aktiv panel = utan dold) ===== -->
    <section class="flik-innehall" data-flik="las" role="tabpanel">

      <!-- Underdelsväljare (2-4 underdelar) -->
      <div class="underdel-valjare" role="tablist" aria-label="Textval">
        <button type="button" class="underdel-knapp aktiv" data-underdel="a" role="tab">
          <span class="underdel-bokstav">A</span>
          <span class="underdel-titel">{{Underdel A-titel}}</span>
        </button>
        <button type="button" class="underdel-knapp" data-underdel="b" role="tab">
          <span class="underdel-bokstav">B</span>
          <span class="underdel-titel">{{Underdel B-titel}}</span>
        </button>
      </div>

      <!-- EN delad nivåväljare — EFTER underdel-valjare, UTANFÖR underdel-text -->
      <div class="niva-valjare" role="group" aria-label="Textnivå" 
           data-niva-nyckel="{{prefix}}-niva-{{kapitel}}-{{slug}}">
        <button type="button" class="niva-knapp" data-niva="enkel">📗 Enkel</button>
        <button type="button" class="niva-knapp aktiv" data-niva="standard">📘 Standard</button>
        <button type="button" class="niva-knapp" data-niva="fordjupning">📕 Fördjupning</button>
      </div>

      <!-- UNDERDEL A (aktiv = utan dold) -->
      <div class="underdel-text" data-underdel="a">

        <!-- 📗 ENKEL — se DEL 2 för brödtext-principer -->
        <div class="niva-innehall brodtext dold" data-niva="enkel">

          <div class="karnpunkter">
            <h3>🎯 Kärnpunkter</h3>
            <ul><li>{{kärnpunkt}}</li><li>{{kärnpunkt}}</li></ul>
          </div>

          <div class="bildguide">
            <h3>👁 Titta efter</h3>
            <ul><li>{{vad eleven ska leta efter}}</li></ul>
          </div>
          <figure class="brodtext-bild enkel">
            <img src="img/{{bild}}.webp" alt="{{rik alt-text}}">
            <figcaption>{{kort, orienterande bildtext}}</figcaption>
          </figure>

          <p>{{enkel brödtext i LÖPANDE PROSA, ~50 ord}}</p>
          <p>{{ev. fler stycken — fortfarande prosa, inte punkter}}</p>
        </div>

        <!-- 📘 STANDARD (default synlig = utan dold) -->
        <div class="niva-innehall brodtext" data-niva="standard">
          <p class="inledning">{{inledning}}</p>
          <h2>{{rubrik}}</h2>
          <p>{{standard brödtext, ~75 ord}}</p>
          <figure class="brodtext-bild standard">
            <img src="img/{{bild}}.webp" alt="{{rik alt-text — IDENTISK med Enkel}}">
            <figcaption>{{längre/analytisk bildtext}}</figcaption>
          </figure>
        </div>

        <!-- 📕 FÖRDJUPNING (ingen bild på denna nivå) -->
        <div class="niva-innehall brodtext dold" data-niva="fordjupning">
          <h2>{{rubrik}}</h2>
          <p>{{fördjupningstext, ~130 ord med historiografi}}</p>
        </div>

      </div>

      <!-- UNDERDEL B (dold tills vald) -->
      <div class="underdel-text dold" data-underdel="b">
        <div class="niva-innehall brodtext dold" data-niva="enkel"><p>{{…}}</p></div>
        <div class="niva-innehall brodtext" data-niva="standard"><p>{{…}}</p></div>
        <div class="niva-innehall brodtext dold" data-niva="fordjupning"><p>{{…}}</p></div>
      </div>

      <!-- DJUPDYKNINGAR -->
      <section class="djupdykningar">
        <span class="sektion-label">Vill du veta mer?</span>
        <div class="fordj-kort-grid">
          <a class="fordj-kort" href="djupdykning-{{slug}}.html">
            <span class="fordj-kort-ikon" aria-hidden="true">{{emoji}}</span>
            <span class="fordj-kort-text">
              <span class="fordj-kort-titel">{{Djupdykningstitel}}</span>
              <span class="fordj-kort-sammanfattning">{{1-2 meningar.}}</span>
            </span>
          </a>
        </div>
      </section>

    </section>

    <!-- ===== ÖVA ===== -->
    <section class="flik-innehall dold" data-flik="ova" role="tabpanel">
      <div class="flipcards-mount"
           data-fil="../../data/flipcards/avsnitt-{{N}}-{{slug}}.json"
           data-avsnitt="a{{N}}_{{slug}}">
        <p class="flipcards-laddar">Laddar övningskort…</p>
      </div>
    </section>

    <!-- ===== ELEVBOKEN ===== -->
    <section class="flik-innehall dold" data-flik="elevboken" role="tabpanel">
      <div class="elevbok-fragor">
        <p class="laddar-fragor">Laddar frågor ...</p>
      </div>
    </section>

  </div>

  <!-- AVSNITT_ID-block FÖRE de externa skripten -->
  <script>
    const AVSNITT_ID = 'a{{N}}_{{slug}}';
    const KAPITEL_ID = '{{kapitel}}';
    const DELKAPITEL_ID = '{{delkapitel}}';
  </script>
  <script src="../../../../js/elevbok.js"></script>
  <script src="../../../../js/avsnitt.js"></script>
  <script src="../../../../js/bildmodal.js" defer></script>
  <script src="../../../../js/egna-fragor.js" defer></script>
  <script src="../../../../js/avsnitt-elevbok.js" defer></script>
  <script src="../../../../js/textbyggar-stodlarare.js" defer></script>
  <script src="../../../../js/flipcards.js" defer></script>
  <script src="../../../../js/forelasningar.js" defer></script>
</body>
</html>
```

---

## DEL 2 — Brödtext-principer per nivå

> Pedagogiska regler för hur brödtext skrivs på de tre nivåerna. 
> Tillkom efter Joachims observation att Enkel-nivån blev för svårläst 
> när den producerades med många punktlistor.

### 📗 Enkel

**Brödtext = LÖPANDE PROSA**. Hela meningar i stycken, skriven som i de senare Medeltids-avsnitten.

**Använd INTE punktlistor för själva brödtexten.** Mycket punktform (som i de första avsnitten) blir en tröskel eleven måste ta sig över — inte en hjälp.

**Punktlistor hör bara hemma i:**
- `.karnpunkter` (kärnpunkter-blocket)
- `.bildguide` (advance organizer)

Aldrig i brödtexten själv.

**Volym:** ~250-400 ord prosa per underdel
**Ton:** Vardagsspråk, tydlig kausalitet, undviker myter och nyans

### 📘 Standard (default)

Standardförklaring med flerdimensionalitet. Också prosa, men med större vokabulär och fler analytiska kopplingar än Enkel.

**Volym:** ~500-700 ord per underdel
**Ton:** Pedagogisk men inte förenklad

### 📕 Fördjupning

Historiografi, kontroverser, "frågor som inte har enkla svar".

**Volym:** ~800-1100 ord per underdel
**Ton:** Akademisk men begriplig för åk 9

---

## DEL 3 — Bildstöd-mönstret per nivå

> Hur bilder hanteras över de tre textnivåerna. Tillkom efter Joachims 
> påminnelse att Enkel-nivån behöver bildstöd och bildguide.

### 📗 Enkel

- **Bild:** SAMMA bild som Standard-nivån (identisk `src` + identisk `alt`-text)
- **Föregås av:** `<div class="bildguide">` med "👁 Titta efter"-rubrik och 2-5 specifika observationspunkter
- **Bildtext:** Kort och orienterande
- **Layout:** `<figure class="brodtext-bild enkel">`

### 📘 Standard

- **Bild:** SAMMA bild som Enkel (identisk `src` + identisk `alt`-text)
- **Föregås av:** ingen bildguide (eleven förväntas tolka själv)
- **Bildtext:** Längre och analytisk
- **Layout:** `<figure class="brodtext-bild standard">`

### 📕 Fördjupning

- **Bild:** Ingen bild på denna nivå
- **Anledning:** Fördjupning är text-driven analys; bild skulle förenkla något som ska vara komplex

### Princip — Varför samma bild

Eleven känner igen bilden från Enkel när hen byter till Standard. Det skapar **kontinuitet** mellan nivåerna och visar att djupare läsning är samma värld, bara mer detaljerad. `alt`-texten måste vara identisk för att skärmläsare ska behandla dem som samma resurs.

---

## DEL 4 — HTML-komponenter

### 4.1 fordj-kort (djupdykningskort)

#### Pedagogisk funktion

Klickbara kort längst ner på en avsnittssida (i Läs-fliken). Pekar mot djupdyknings-HTML-filer. Synliga oavsett vilken underdel eller textnivå eleven har valt. Frivillig fördjupning.

#### HTML-mall (kanonisk)

```html
<section class="djupdykningar">
  <span class="sektion-label">Vill du veta mer?</span>
  <div class="fordj-kort-grid">

    <a class="fordj-kort" href="djupdykning-{slug}.html">
      <span class="fordj-kort-ikon" aria-hidden="true">🌾</span>
      <span class="fordj-kort-text">
        <span class="fordj-kort-titel">{Titel på djupdykningen}</span>
        <span class="fordj-kort-sammanfattning">{1-3 meningar som lockar.}</span>
      </span>
    </a>

  </div>
</section>
```

#### Regler

- Rubriken är **`<span class="sektion-label">`** — inte `<h2>` eller annan rubrik
- `<div>`-griden heter **`fordj-kort-grid`** — inte `kort-grid`
- Allt textinnehåll inuti `<a>` är **inline `<span>`-element** — inga `<h3>`, `<p>` eller andra block-element
- `aria-hidden="true"` på ikon-spannet
- Sektionen har **ingen `id`**

#### Antal per avsnitt

Riktmärke: 1-3 djupdykningskort per avsnitt.

---

### 4.2 brodtext-bild

```html
<figure class="brodtext-bild {nivå}">
  <img src="img/{tema}/{bild}.webp" alt="{Lång beskrivning}">
  <figcaption>{Förklarande bildtext}</figcaption>
</figure>
```

`{nivå}` = `standard` | `enkel` | `fordjupning`

Se DEL 3 för bildstöd-mönstret per nivå.

---

### 4.3 karnpunkter (Det viktigaste-block)

```html
<div class="karnpunkter">
  <h3>🎯 Kärnpunkter</h3>
  <ul>
    <li>{Punkt 1 — kort, viktiga ord <strong>fetstilta</strong>}</li>
    <li>{Punkt 2}</li>
    <li>{Punkt 3}</li>
  </ul>
</div>
```

**Regler:**
- Rubriken kan vara `<h3>` (som i scaffold-mallen) eller `<div class="karnpunkter-rubrik">` — båda fungerar i CSS:n
- 🎯-emojin signalerar visuellt vad blocket är
- 3-5 punkter — max 6
- Fetstil för viktiga begrepp

**Riktmärke:** 1-3 `karnpunkter`-block per textnivå per avsnitt.

---

### 4.4 bildguide (advance organizer)

```html
<div class="bildguide">
  <h3>👁 Titta efter</h3>
  <ul>
    <li>{Vad eleven specifikt ska titta efter i bilden}</li>
    <li>{...}</li>
    <li>{... max 5 punkter}</li>
  </ul>
</div>
```

**Regler:**
- Rubriken kan vara `<h3>` eller `<div class="bildguide-rubrik">` — båda fungerar
- 👁-emojin signalerar advance organizer
- 2-5 specifika observationspunkter
- Bildguide placeras **FÖRE** `<figure class="brodtext-bild">`

**Bildguide visas endast på Enkel-nivå** (se DEL 3).

---

## DEL 5 — Komponenter som inte är dokumenterade ännu

Dokumenteras när konkret behov uppstår eller felmönster observeras:

- `flikar-rad` + `flik` (dokumenterad i DEL 1 som del av scaffold)
- `niva-valjare` + `niva-knapp` (dokumenterad i DEL 1)
- `underdel-valjare` + `underdel-knapp` (dokumenterad i DEL 1)
- `kapitel-kort` (kapitelöversikt på startsidor) — ej dokumenterad
- `resurs-kort` (kapitelverktygs-rad) — ej dokumenterad
- `brodsmulor` + `skiljare` + `aktuell` (dokumenterad i DEL 1)
- Kapitelverktygs-sidor (`kapitelelevbok.html`, `kapitelbegreppsbank.html`, `kapitelsjalvskattning.html`) — separat dokumentation kommer efter pågående layoutfix

Vid första felmönster i någon av dessa: logga som Typ C-ändring i `PLATTFORMS-ANDRINGAR.md`.

---

## DEL 6 — Process när nya komponenter behöver dokumenteras

### Verifieringskrav

Innan en komponent dokumenteras i denna fil **måste minst fyra källor stämma**:

1. **HTML från Geografi-referensimplementationen** eller verifierad Historia-scaffold
2. **CSS-regler i `css/geografi.css`** (vad som faktiskt stilsätts)
3. **JS-tillstånd** (vad `avsnitt.js` och andra moduler förväntar sig)
4. **Renderad visuell verifiering** (att rendering matchar avsikten)

Om HTML och CSS är internt motstridiga: **CSS vinner**. HTML-kvarlevor som inte stilsätts loggas som plattformsobservation för senare rättning.

### Steg

1. Innehållssession eller Code stöter på en komponent som inte är dokumenterad här
2. Frågar Joachim istället för att gissa
3. Joachim ger HTML-fragment från referensimplementation
4. Ramverks-chatten verifierar mot CSS + JS + rendering innan dokumentation skrivs
5. Komponenten läggs till i denna fil
6. Loggas i `PLATTFORMS-ANDRINGAR.md` som Typ C-ändring

---

## DEL 7 — Föreläsnings-komponenten

### Pedagogisk funktion

Föreläsningar är **inbäddade YouTube-videor** som relaterar till avsnittet. Eleven kan klicka på ett föreläsningskort för att expandera in-page-spelaren utan att lämna sidan.

Föreläsningar är **medvetet dolda** by default (inom egen flik) så de inte tar upp plats för texten. Eleven öppnar Föreläsning-fliken när hen vill se video — annars är fokus på läsning, övning och elevbok.

**När inga föreläsningar finns för avsnittet:** flikknappen ska vara **disabled** (visuellt inaktiv, ej klickbar). Detta är plattformsbeteende implementerat i `forelasningar.js`.

### HTML-mall i avsnittssidan (kanonisk)

```html
<!-- I flikraden — knappen är ALLTID med, JS sätter disabled vid tom data -->
<div class="flikar-rad" role="tablist">
  <button type="button" class="flik" data-flik="forelasning" role="tab">Föreläsning</button>
  <button type="button" class="flik aktiv" data-flik="laes" role="tab">Läs</button>
  <button type="button" class="flik" data-flik="ova" role="tab">Öva</button>
  <button type="button" class="flik" data-flik="elevboken" role="tab">Elevboken</button>
</div>

<!-- Föreläsnings-panelen — innehåll injiceras av JS från data/forelasningar.json -->
<section class="flik-innehall dold" data-flik="forelasning" role="tabpanel">
  <div class="forelasningar-lista"></div>
</section>
```

### Regler

- **Föreläsning är ALLTID första fliken** i flikraden (vänster om Läs)
- `<section data-flik="forelasning">` har klassen `dold` initialt (Läs är default-flik)
- `<div class="forelasningar-lista">` är **tom** — JS fyller på från JSON
- **Ingen** statisk HTML inuti — allt renderas av `forelasningar.js`
- Innehållssessionen ska INTE skriva HTML för föreläsningskort — bara säkerställa att tom container finns

### JSON-schema (`data/forelasningar.json`)

EN central fil per **delkapitel** med alla föreläsningar för det delkapitlet.

**Filens placering:**
- Historia: `kapitel/{kapitel}/data/forelasningar.json`
- Geografi: `delkapitel/{delkapitel}/data/forelasningar.json` (legacy-placering — fungerar via JS:ns relativa fetch)

**Kanoniskt schema:**

```json
{
  "delkapitel": "{kapitel-id}",
  "_kommentar": "Frivillig dokumentation av val.",
  "forelasningar": [
    {
      "id": "f_{kortord}",
      "avsnitt_id": "a{N}_{slug}",
      "titel": "{Titel som visas i kortet}",
      "youtube_id": "{id-delen ur youtu.be/<id>}",
      "langd": "14:02"
    }
  ]
}
```

### Fält-för-fält

| Fält | Krävs | Beskrivning |
|---|---|---|
| `delkapitel` (rot) | ✅ | Kapitel-id, samma som mappnamn — t.ex. `"geologi"` eller `"medeltiden"` |
| `_kommentar` (rot) | ❌ | Dokumentation, plattformen ignorerar |
| `forelasningar[]` | ✅ | Lista över alla föreläsningar för delkapitlet |
| `id` | ✅ | Stabilt id — `f_{kortord}`, t.ex. `f_forkastningar` |
| `avsnitt_id` | ✅ | Matchar `AVSNITT_ID` i avsnitts-HTML — `a{N}_{slug}` |
| `titel` | ✅ | Titel som visas på kortet |
| `youtube_id` | ✅ | Bara id-delen ur YouTube-URL:en, t.ex. `xVyL8fbGPAM` (från `youtu.be/xVyL8fbGPAM`) |
| `langd` | ❌ | Frivillig text, t.ex. `"14:02"` eller `""` (tom döljer längden) |

### En föreläsning kan tillhöra ett avsnitt

`avsnitt_id` är **exakt en sträng** — inte en array. En föreläsning hör till **ett avsnitt**. Vill du ha samma video på flera avsnitt — kopiera objektet med olika `id` och olika `avsnitt_id`.

### Flera föreläsningar per avsnitt

JS:n filtrerar alla föreläsningar där `avsnitt_id === AVSNITT_ID` och visar dem i ordningen de står i JSON-filen. Lägger du två föreläsningar med samma `avsnitt_id` får eleven två kort.

### Fält som plattformen IGNORERAR

- ❌ `beskrivning` — finns inte i kortet
- ❌ `thumbnail` — JS:n hämtar automatiskt från YouTube (`mqdefault.jpg`)
- ❌ `varaktighet` (numerisk) — använd bara `langd` (text)
- ❌ `kategori`, `taggar` — finns inte i schemat

### Hur kortet renderas (för referens, ej något du producerar)

JS:n bygger följande HTML per föreläsning, automatiskt:

```html
<div class="forelasning" data-yt="{youtube_id}">
  <button type="button" class="forelasning-huvud">
    <span class="forelasning-thumb">
      <img src="https://img.youtube.com/vi/{youtube_id}/mqdefault.jpg" alt="" loading="lazy">
      <span class="forelasning-play" aria-hidden="true">▶</span>
    </span>
    <span class="forelasning-info">
      <span class="forelasning-titel">{titel}</span>
      <span class="forelasning-langd">{langd}</span>
    </span>
  </button>
</div>
```

Plus en rubrik `<div class="forelasningar-rubrik">Föreläsningar</div>` ovanför listan.

**Innehållssessionen ska aldrig producera den här markupen** — bara JSON-data. Plattformen renderar resten.

### YouTube-funktionalitet

- Thumbnail hämtas från `https://img.youtube.com/vi/{id}/mqdefault.jpg`
- Vid klick: huvudet döljs, en `<iframe>` med YouTube-spelaren laddas
- En stäng-knapp (×) returnerar till kollapsat tillstånd
- Spelaren använder standard YouTube-embed med fullskärmsstöd

### Leveransflöde för innehållsproducenten

**När en innehållsproducent ska lägga till föreläsningar för Senmedeltiden (exempel):**

1. Joachim har YouTube-länkar och titlar för varje avsnitt
2. Innehållsproducenten lägger till objekt i `data/forelasningar.json`:

```json
{
  "id": "f_digerdoden",
  "avsnitt_id": "a9_digerdoden",
  "titel": "Digerdöden",
  "youtube_id": "{youtube-id}",
  "langd": "12:30"
}
```

3. Inget annat behövs — flikknappen aktiveras automatiskt när JSON innehåller en post med matchande `avsnitt_id`
4. För avsnitt utan föreläsning — bara lämna bort posten ur JSON. Flikknappen blir då disabled (efter plattformsändring i `forelasningar.js`)

### Vanliga fallgropar

❌ **Fel:** Hårdkoda föreläsningskort i HTML
```html
<section data-flik="forelasning">
  <div class="forelasningar-lista">
    <div class="forelasning">...statisk HTML...</div>
  </div>
</section>
```
Detta krockar med JS:n som tömmer containern och fyller på själv.

✅ **Rätt:** Tom container, JSON-data
```html
<section class="flik-innehall dold" data-flik="forelasning">
  <div class="forelasningar-lista"></div>
</section>
```

❌ **Fel:** Hela YouTube-URL:en i `youtube_id`
```json
"youtube_id": "https://www.youtube.com/watch?v=xVyL8fbGPAM"
```

✅ **Rätt:** Bara id-delen
```json
"youtube_id": "xVyL8fbGPAM"
```

---

## Bilagor — referensimplementationer

- **Avsnitts-scaffold:** Historiabokens producerade mall (2026-06-19, verifierad mot `css/geografi.css` + `js/avsnitt.js`)
- **fordj-kort:** `delkapitel/geologi/avsnitt-3-jordbavningar.html` (notera: HTML har `<h2>` istället för `<span class="sektion-label">` — CSS:n stödjer båda)
- **brodtext-bild:** `delkapitel/geologi/avsnitt-3-jordbavningar.html`
- **karnpunkter:** `delkapitel/geologi/avsnitt-3-jordbavningar.html`
- **bildguide:** `delkapitel/geologi/avsnitt-3-jordbavningar.html`
- **forelasning:** `delkapitel/geologi/avsnitt-2-plattektonik.html` + `js/forelasningar.js` + `data/forelasningar.json`

**CSS-referens:** `css/geografi.css` — det är denna fil som avgör vad som faktiskt renderas.
**JS-referens:** `js/avsnitt.js` + `js/forelasningar.js` — det är dessa filer som avgör vad som faktiskt interagerar.

När osäker — kolla referensimplementationen **plus** CSS:n **plus** JS:n.

---

## Revisionshistorik

- **v1.3 (2026-06-21):** Tillagt DEL 7 (Föreläsnings-komponenten) — HTML-mall + JSON-schema för YouTube-föreläsningar via flik-mönster. Verifierad mot Geologi-avsnitt 2 (Plattektonik). Inkluderar plattformsbeteende: flikknappen blir disabled när inga föreläsningar finns för avsnittet (kräver plattformsändring i `forelasningar.js` — se separat arbetsorder). Femte fallgropen tillagd i DEL 1.

- **v1.2 (2026-06-21):** Tillagt DEL 1 (Avsnitts-scaffold med fyra fällor), DEL 2 (Brödtext-principer per nivå) och DEL 3 (Bildstöd-mönstret). Källa: Joachims scaffold-mall efter Historiabokens implementation + veckogenomgång om Enkel-nivåns prosa-krav.

- **v1.1 (2026-06-17):** Rättad fordj-kort-mall — `<span class="sektion-label">` istället för `<h2>` (verifierat mot CSS efter Code-rapport). Tillagt dokumentationsprincip om HTML-vs-CSS-konflikter.

- **v1.0 (2026-06-17):** Första versionen med fyra komponenter (fordj-kort, brodtext-bild, karnpunkter, bildguide).
