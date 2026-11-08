# Plattforms-ändringar — Alphaskolans lärplattform

> Pedagogisk arbetsdagbok. Här samlas observationer som *kan* påverka 
> plattformen — innan de blir formella ändringar. Förhindrar drift 
> mellan böcker och kapitel.

**Starta varje arbetsdag med att kolla 🔵-listan.** 
**Veckogenomgång:** söndagar (eller när 🔵-listan har 3-5 poster).

---

## Snabbreferens — tre typer av ändringar

| Typ | Vad | Hantering |
|---|---|---|
| **A** Innehåll | Texten i ett avsnitt, en bild, en faktaformulering | Fixa direkt. Gå vidare. Hör inte hemma här. |
| **B** Mönster | Hur en komponent ser ut eller fungerar (flikar, kort, navigation) | Lägg i 🔵-listan nedan. Ändra INTE direkt i boken. |
| **C** Plattform | Pedagogisk modell (trösklar, lägen, korttyper, kunskapskrav-modell) | Lägg i 🔵-listan nedan. Ändra INTE direkt i boken. |

**Tumregel:** Om upptäckten kan tänkas påverka *ett annat avsnitt eller en annan bok* → det är B eller C. Skriv ner.

---

## Statuskoder

| Symbol | Betydelse |
|---|---|
| 🔵 | Ny observation — att bedöma på nästa veckogenomgång |
| 🟡 | Beslutat — väntar på implementation |
| 🟢 | Implementerat i plattformsspec — väntar migration av befintliga böcker |
| ✅ | Klart överallt |
| ⏸️ | Pausat / skjutet framåt |
| ❌ | Förkastat efter övervägande |

---

## 🔵 Aktiv lista — att bedöma

| Datum | Typ | Var upptäckt | Observation | Förslag |
|---|---|---|---|---|
| 2026-11-05 | B | Order 10: bokmotorn bytt till Fysikbokens (e62c0ba) | Datastyrt startsidesprov i bok-grind.js – ska föras över till Fysikbok. Kapitlen letas upp på disken (<kapitel>/kapitel.js + index.html), titel ur kapitel.js, avsnittssidor = kapitlets delkapitel (nummer, ämne ur delkapitel.js); övriga kort prövas allmänt (länk till sida som finns, eller tonat "Kommer"). Utan kapitel.js hoppas provet över. Webbjämförelsen läser samma kapitellista. Provat mot Fysikbok: 23/23 grönt; negativt prov (trasig länk) blir rött. | För över verktyg/bok-grind.js (provaSidorna, kapitlen, delkapitel(allt), jamforWebben) till Fysikbok. |
| 2026-11-05 | B | Order 11: bildfigur i bokmotorn | Bildfigur (små + klickbara) i bokskal – ska föras över till Fysikbok. Figuren `bild` (figurer.js) och bildfigurstödet i bok.js (bildMatt: storleken i texten ur data, högst 35 % av sidhöjden med bildtexten; visaBild/stangBild: lagret, högst 90 %×85 % av fönstret, aldrig mindre än i texten; bladdra/tangenter avstängda), bok.css (.b-bild, .figur-knapp, .bild-lager), Bok.matSidor() ger också sidor och bilder. Grinden: figurKoll (bb), brytningen innan/efter bildladdning (BLOCKERA, brytningMedBilder). Ingen geografispecifik kod. | För över bokskal/bok.js, bok.css, figurer.js, verktyg/bok-grind.js och README-avsnittet till Fysikbok (provboken: sidan Provsida med bilder och verktyg/provbok/bilder/). |
| 2026-11-05 | B | Målskärmen: Chromebook 13–14 tum (Joachim) | Grindens lägen 1536×864 i fönstret och i helskärm (1920×1080-Chromebooks skalade till 150 %) ska läggas till som egna lägen i verktyg/bok-grind.js (LAGEN), utöver 1366×633, 1366×768 (fönster/helskärm) och mobil 390×664. Görs i Geografibok som första punkt i nästa order (överföringen av Näringslivets texter). Fysiken ska ta in samma lägen. | Geografibok: nästa order, punkt 1. Fysikbok: samma lägen i LAGEN (och fönstrets höjd vid 1536×864 mäts/bestäms likadant i båda böckerna). |
| 2026-11-05 | C | Ekonomisk geografi, delkapitel 3 (text A och B) | Fråga till fysiken: ska ett nytt avsnitt alltid börja på ny sida, eller följa idéregeln (ny sida bara om < 1/3 kvar)? Bakgrund: motorn låter varje avsnitt (Inledning, huvudtext, Sammanfattning) börja på ny sida, så en kort Inledning (ett stycke) gav en nästan tom sida 2. I geografin är Inledningens stycke nu flyttat först i avsnitt 1 (inget eget avsnitt). | Fysiken avgör; samma regel i båda böckerna (bok.js, paginera). |
| 2026-11-05 | B | Order 13, delkapitel 3 text B (kostnadsdiagrammet) | Motorfel från order 11: bildfigurens beskrivning (sr-only-texten i bok.js, blocktyper.figur med r.bild) skrivs utan bindTal, så tusental och tal+enhet får vanliga mellanslag – grindens hårda-mellanslag-prov blev rött (”från 0 till 1 000”). Löst tills vidare i datan: hårda mellanslag (U+00A0) direkt i beskrivningen i innehall/b/standard.js. | **Rättat i Geografibok 2026-11-05 (order 16):** bindTal(besk) i bok.js (blocktyper.figur, bildfigurens sr-only-beskrivning); U+00A0 i datan borttagna. Bildtexten gick redan genom inline (bindTal). Samma rad ska föras över till Fysikbok tillsammans med bildfiguren. |
| 2026-11-05 | B | Order 15: bildguiden i Enkel (delkapitel 3) | Fältet `fundera` i blocktypen ruta – ska föras över till Fysikbok. bok.js (blocktyper.ruta: `fundera` ritas sist, efter text och punkter, som p.b-ruta-fundera), bok.css (.b-ruta .b-ruta-fundera kursiv), README (ruta-raden), grinden (figurKoll: rf – fundera kursiv och sist i rutan, efter punkterna) och provboken (en bildguide-ruta på Provsida med bilder). | För över bok.js, bok.css, README-raden, grindprovet och provbokens ruta till Fysikbok. |
| 2026-11-05 | B | Order 15: Fördjupning i delkapitel 3 har bara egna avsnitt | Grindens nivåprov (bok-grind.js, SCENARIO): har den nya nivån inget gemensamt avsnitt ska nivåbytet gå till bokens början (innehållsförteckningen, sida 1, eller omslaget) – motorns beteende, samma regel som överlämningen anger för Djupdykning. Förut krävde provet alltid ett gemensamt avsnitt. Joachims beslut 2026-11-05. Ingen motor- eller dataändring. | För över de två nivåproven i bok-grind.js till Fysikbok. |
| 2026-11-05 | B | Order 17: tabellerna i Sveriges näringsliv (delkapitel 1, D) | Fältet `kolumner` i blocktypen tabell – ska föras över till Fysikbok. En post per kolumn: `{ smal: true }` (så smal som innehållet), `{ mitt: true }` (centrerad); tabellen tar då spaltens bredd (table.med-kolumner). bok.js (blocktyper.tabell, kolKlass), bok.css (.kol-smal, .kol-mitt, .med-kolumner), README (tabell-raden). | För över bok.js, bok.css och README-raden till Fysikbok. |
| 2026-11-05 | B | Order 17: grindens lägen | Lägena 1536×864 i fönstret och 1536×864 i helskärm är nu egna lägen i verktyg/bok-grind.js (LAGEN, sist så att LAGEN[0] och LAGEN[3] står kvar) – ska in i Fysikbok. (Fönstrets riktiga höjd på en 1536×864-Chromebook är inte uppmätt; lägena följer mönstret för 1366×768 i fönstret/helskärm.) | För över LAGEN-raderna till Fysikbok. |
| 2026-11-05 | B | Order 18: djupdykningarna i delkapitel 1 | Fältet `villVetaMer` i delkapitel.js – ska föras över till Fysikbok. Kort längst ned i Läs på delkapitlets sida (plattformens section.vill-veta-mer / .fordj-kort-grid / a.fordj-kort rakt av), till fristående sidor. bok.js (byggHubb), bok.css (kortens stil i motorns variabler), README, grinden (korten går till sidor som finns). I geografin ersätter korten nivån Djupdykning i delkapitel 1. | För över bok.js, bok.css, README-stycket och grindprovet till Fysikbok. |
| 2026-11-08 | B | Order 19: delkapitel 4 Handel (en text), mobil | Motorfel från fysikens version, rättat i Geografibok – ska föras över till Fysikbok: efter webbläsarens Bakåt och sedan Framåt öppnades boken vid sidans rubrik (adressen) i stället för vid läsplatsen, när läsplatsen stod på en senare sida med samma adress (mobilen, en sida i taget). Grindprovet ”framåt: boken kommer tillbaka på samma sida” blev rött; det syntes först i en bok med bara en text. Rättning i bok.js (oppnaBok, bara när boken öppnas via historiken): den sparade läsplatsen används om dess sida har samma adress. README (Adressen). | För över raderna i oppnaBok och README-stycket till Fysikbok. |
| | | | | |

*(Tom rad ovan är till för nya poster — fyll på underifrån)*

### Exempel på hur en post fylls i:

| Datum | Typ | Var upptäckt | Observation | Förslag |
|---|---|---|---|---|
| 2026-06-15 | C | Demografi-pilot, klassrum | 15 ord + nyckelord = för högt tröskel. Eleverna skrev korrekt men "fel" ord, blev blockerade. | 8 ord, inga nyckelord, dynamisk upplåsning |

---

## 🟡 Beslutat — väntar implementation

| Datum | Beslut | Påverkar | Status |
|---|---|---|---|
| 2026-06-15 | Begreppsbank: 15→8 ord, inga nyckelord, dynamisk upplåsning | Demografi-pilot, alla framtida ämnen | Arbetsorder skickad till Code |
| 2026-06-14 | Föreläsning blir egen flik bredvid Läs | Geologi, alla framtida avsnitt | Väntar tills Geologi-innehåll klart |
| 2026-06-14 | Historia byter till plattformens fonter (Marcellus SC + EB Garamond) | Historiabok Projekt 4 (50 filer) | Väntar tills Medeltiden är klar som ny mall |
| 2026-06-14 | Historia använder kapitel→delkapitel→avsnitt-terminologi | Hela Historiaboken | Migreras med Projekt 4 |

---

## 🟢 Implementerat i spec — väntar migration

| Datum | Ändring | Spec-version | Migration kvar |
|---|---|---|---|
| 2026-10-01 | **V14 — medlemskap garanterar inte mätning.** En sida i grindens lista måste ge minst en mätpunkt; noll blad/rader/ytor är rött, utom med ett dokumenterat skäl som grinden prövar. Komplement till V9 (som garanterar att sidan är i listan). Belagt: en sida kom in i nämnar-grindens lista, gav noll blad, fick ingen utskriven rad, och grinden slutade grön. Vakten tvingar fram valet mellan en **avsiktlig** nolla (skäl med bevis) och en **oavsiktlig** nolla (fynd att utreda) — förut var båda tyst gröna. | DELAD-BAS v1.4 | Byggd i matte (`verktyg/matpunkt.js`, inbyggd i fyra grindar). Byggs i övriga fyra ämnen. Två av mattens svep står utanför räckvidden med skäl i modulen, eftersom deras mätenhet inte är blad per sida. |
| 2026-10-01 | **Verifieringsreglerna utökade till V1–V13 + A1.** V11 en grind får inte ha en väg ut som hoppar mätningen · V12 kör den negativa verifieringen i exakt det läge grinden ska köras i · V13 mät aldrig något som beror på vem eller var provet körs. Alla tre belagda i matematikbygget samma dag de skrevs: V11 och V12 ur en grind som var grön för tre injicerade fel (`if(vs.length < 2) return`), V13 ur `document.fonts.check` som mäter maskinen i stället för sidan. **Regel före vakt** — vakterna byggs i en senare omgång; V12 kan inte vaktas mekaniskt och är disciplin. | DELAD-BAS v1.3 | V11 och V13 saknar vakt i alla fem repon. V13 är en skärpning av V3 och V4 och canoniseras som egen rad eftersom fånget är distinkt (miljöberoende) — går att vika in i V3/V4 i stället om det är att föredra. |
| 2026-10-01 | Verifieringsreglerna kanoniserade: tio verifieringsregler (V1–V10) + en arkitekturregel (A1) i KOMPONENTER DEL 6, med kolumnen *vad vaktar den* per ämne. Av de elva stod **en** nedskriven förut (V1, headless — som prosa i Kemis och Svenskas DEL 6; Geografi och Historia hade den inte). **V10, äkta oberoende slump med runs-test, fanns inte nedskriven någonstans.** Inget ersatt: headless-posten står kvar ordagrant och utökas. | DELAD-BAS v1.2 | Nio av elva rader är tomma i alla ämnen utom matte. Två grindar byggs nu i matte (ny sida in i grindarnas listor; runs-test på generatorernas slump) och saknar motsvarighet i övriga ämnen. Geografi, Historia och Svenska har inget verifieringsverktyg i repot alls. |
| 2026-06-15 | Plattformsspec för elevbok/begreppsbank/självskattning/elevdata | Lager 2-3 v0.1 | Geografi: harmoniseras till `as-`-prefix vid BEM-migration |

---

## ⏸️ Pausat / skjutet framåt

| Datum | Vad | Anledning |
|---|---|---|
| 2026-06-10 | Elevbok-stödläraren | Eleverna skriver i frågerutorna, inte i sammanfattning. Återupptas om elevbehov dyker upp. |
| 2026-06-14 | Dark mode | Vintageatlas-paletten är hela designens kärna. Bryts av dark mode. |
| 2026-06-14 | AI-stöd i läromedlet | Tills kostnadseffektiv lösning finns. |

---

## ✅ Klart överallt (för historik)

| Datum | Ändring |
|---|---|
| 2026-06-14 | Geografibokens palett kodifierad som plattformens Lager 1 |
| 2026-06-14 | Marcellus SC + EB Garamond låsta på plattformsnivå |
| 2026-06-14 | Geografi-piloten klar (6 avsnitt × 3 nivåer, 145 flipcards, 11 djupdykningar) |
| 2026-11-02 | B: .karnpunkter-rutorna var bredare än brödtexten: B2-regeln i geografi.css listade .karnpunkt i stället för .karnpunkter. Rättat i Geografibok. Rättat även i Historiabokens geografi.css samma dag. |
| 2026-11-02 | B: .vintage-tabell-wrapper följer nu läsbredden (B2-regeln i geografi.css). Tabellerna var 1132 px mot brödtextens 770 px. Påverkar ekonomisk geografi avsnitt 1 (D) och demografi avsnitt 4. Mobil oförändrad (horisontell scroll). Historiabok har inga .vintage-tabell-wrapper – ej ändrad där. |

---

## ❌ Förkastat

| Datum | Förslag | Anledning |
|---|---|---|
| | | |

---

## Veckogenomgång — söndag (eller när 🔵-listan har 3-5 poster)

**Tid:** ~30 minuter

**Steg:**

1. **Gå igenom 🔵-listan post för post.**
   - För varje: är det A (fel kategori — flytta ut)? B eller C (rätt)?
   - Bedöm pedagogiskt: är det rätt riktning?
   - Bedöm omfattning: är det en isolerad ändring eller pekar det på något större?

2. **Tre möjliga utfall per post:**
   - 🟡 **Godkänd** → flytta till 🟡-listan + skapa arbetsorder till ramverks-chatten
   - ❌ **Förkastad** → flytta till ❌-listan med kort motivering
   - 🔵 **Behöver mer underlag** → behåll i 🔵, anteckna vad som behöver utforskas först

3. **Granska 🟡-listan:**
   - Vilka kan släppas till implementation den här veckan?
   - Vilka väntar på något (t.ex. annan komponent klar)?
   - Finns det blockeringar att hantera?

4. **Granska 🟢-listan:**
   - Vilka migrationer ska göras den här veckan?
   - Behövs prioritering om kö växer?

5. **Reflektera över mönster:**
   - Dyker liknande observationer upp upprepade gånger?
   - Då pekar de mot något större — kanske en arkitektur-ändring snarare än enskild komponent.

**När det är klart:** stäng filen, fortsätt arbeta tryggt vetande att inget glöms.

---

## Regler

**1. Ändra aldrig direkt i en bok när du upptäcker B eller C.**
Lägg i 🔵-listan. Geologi-kapitlet får ha sin ofullständighet en dag till.

**2. Innehållsproduktion-chatten lägger till i 🔵.**
Den ändrar aldrig plattformen själv.

**3. Ramverks-chatten är den som flyttar mellan listor.**
Veckogenomgång görs där.

**4. Code-chatten implementerar 🟡 och 🟢.**
Den uppdaterar inte den här filen — det gör ramverks-chatten efter Code rapporterat klart.

**5. När i tvivel — skriv ner.**
Hellre en post för mycket än en ändring som glöms.
