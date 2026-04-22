# i-Marina.eu — Volledige Inventarisatie

Geanalyseerd op 2026-04-22 via https://www.i-marina.eu/login/_ketel1/index.php
Haven: Rebbel B.V. - Jachthaven Lands End (Ketelhaven)
Versie: i-Marina v1.3 | Maker: Sudum B.V.

---

## Hoofdnavigatie (5 secties + loguit)

### 1. Start (Dashboard)

Dagelijks overzicht met meerdere panelen:

- **Meldingen Ligplaats (50)** — Notities/meldingen per ligplaats, met filter per steiger (A, B, C, D, E). Per melding: ligplaatsnummer, meldingstekst, datum+auteur, link naar boeking
- **Vrije Ligplaatsen (4)** — Overzicht beschikbare plekken met afmetingen (LxB), beschikbaar-vanaf datum, aantal nachten. Filterbaar per steiger
- **Passanten (0)** — Huidige passanten/gasten met ligplaats, boot, van/tot datum, nachten. Filter per steiger
- **Boekingen (0)** — Actieve boekingen en reserveringen, filterbaar (Reserveringen / Boekingen toggle)
- **Aankopen** — Kassamodule
- **Agenda (0)** — Agenda items met Vandaag/Week/Lijst weergave
- **Open Passant Facturen (0)** — Onbetaalde passantfacturen
- **Open Offertes (1)** — Lopende offertes met klant, datum, bedrag

**Acties sidebar (knoppen rechts):**
- Start Boeking
- Vrije Ligplaatsen
- Agenda
- Voetnoot
- Snel Kassa
- Kassa
- Vrije Ligplaatsen (dubbel)
- Passanten
- Aankomsten
- Vertreklijst
- Afsluiting

**Zoekbalk** met datumfilter en lengtefilter voor ligplaatsen

---

### 2. Plattegrond (Kaartweergave)

Interactieve kaart van de jachthaven:

- **OpenLayers/OpenStreetMap** kaart met GPS-coordinaten (52.58, 5.76 = Ketelhaven)
- **Satelliet-/Kaartweergave** toggle (Map/Sat knop)
- **Legenda** met statussen en tellingen:
  - Melding: 47
  - Vrij: 4
  - Passant: 0
  - Tijdelijk: 6
  - Verplaatst: 1
  - Stalling: 35
  - Klant: 61
  - Zomer: 19
  - Leeg: 4
- **Datumfilter** — bekijk bezetting per datum
- **TV-modus** — fullscreen weergave (link naar fullscreen.php)
- **GPS-tracking** toggle
- **Zoom/Rotatie** controls
- **Start** en **Overzicht** knoppen

---

### 3. Klanten

Klant- en bootbeheer met meerdere panelen:

**Linkerpanelen (recent toegevoegd):**
- **Klant Nieuw** — Recent aangemaakte klanten (naam, datum)
- **Passant Nieuw** — Recent aangemaakte passanten
- **Boten zonder Ligplaats** — Boten die geen vaste plek hebben (incl. passantboten)

**Rechterpanelen (recent bewerkt):**
- **Klant Bewerkt** — Laatst bewerkte klantrecords (naam, datum)
- **Passant Bewerkt** — Laatst bewerkte passantrecords
- **Boot Bewerkt** — Laatst bewerkte bootrecords

**Zoekfunctie** met filter op: Klanten, Passanten, Boten, Ligplaatsen (dropdown)

**Extra tools sidebar (knoppen rechts):**
- Controle Lijst
- Wacht Lijst
- Ligplaatsen Lijst
- Boten Fotobord
- Standen Log
- Mail Probleem
- Mutatie Log

---

### 4. Financieel

Volledig financieel overzicht:

- **Periodefilter** (van-tot datum, standaard huidige maand)
- **Betaalmethode filter:** Alles, Contant, PIN, Overschrijving, Creditcard, Deelbetaling(en), Online
- **Financieel overzicht tabel:**
  - Debet / Credit / Totaal kolommen
  - Totaal (incl BTW)
  - Totaal (excl BTW)
  - Totaal (BTW)
  - Klanten (incl) — indicatief
  - Passanten (incl) — indicatief
  - Open Periode
- **Open Facturen (10/36)** — met per factuur:
  - Factuurnummer
  - Datum + tijd
  - Klant/Passant (klikbaar naar klantpagina)
  - Totaalbedrag
  - Status
  - Herinnering-teller [Nx] — aantal keren herinnering gestuurd
  - Deelbetaling knop
  - Betaallink (kopieerbaar naar klembord)
  - Opmerkingen veld
- **Export** naar XLS
- **Print** functionaliteit
- **Print open facturen** knop

**Extra tools sidebar:**
- Facturen (zoek op factuurnummer + bedrag)
- Offertes
- Werkbonnen
- Toeristenbelasting
- Plaatstarieven

---

### 5. Instellingen

Gebruikersbeheer:

- **Gebruikersprofiel:**
  - Gebruikersnaam
  - Wachtwoord (min 12 tekens) + bevestiging
  - Voornaam
  - Achternaam
  - E-mail
  - Footer
- **Taal:** Nederlands, English, Français, Deutsch, Svenska
- **Opslaan** knop

**Extra knoppen:**
- i-Marina Plus (uitbreiding/premium features)
- Bewerk Plattegrond (layout editor)
- Bewerk Landen (landenconfiguratie)

---

## Steigers & Ligplaatsen (uit de kaart)

Gebaseerd op de plattegrond van Jachthaven Lands End:

### Steiger A (meest oostelijk/rechts)
- A-KOPZIJDE: kopsteiger
- Kopsteiger A2
- A01-13m t/m A09-12m
- A05-12m, A06-12m
- Ligplaatsen aan beide zijden van de steiger

### Steiger B
- B-KOPZIJDE 1 en B-KOPZIJDE 2 (T-steiger met 2 kopzijden)
- B01-11m t/m B21-10m
- Mix van 10m en 11m ligplaatsen

### Steiger C
- C-KOPZIJDE
- C01-9m t/m C28-9m
- Voornamelijk 9m ligplaatsen

### Steiger D
- D-KOPZIJDE 1
- D01-8m t/m D37-8m (langste steiger)
- Voornamelijk 8m ligplaatsen
- D12-8m, D17-8m, D18-8m etc.

### Steiger E (meest westelijk/links)
- E-KOPZIJDE
- E-KOP 1 t/m E-KOP 6 (6 kopsteigers!)
- E-KOP 1A
- E01-7m t/m E22-7m
- Kleinste ligplaatsen (7m)

**Totaal: ~128 ligplaatsen** (geschat op basis van de kaart)

### Haven layout kenmerken
- Steigers lopen noord-zuid (perpendiculair op de Vossemeerdijk)
- Van oost naar west: A, B, C, D, E
- Steigers worden langer naar het westen (A=kort, E=lang)
- Ligplaatsen worden kleiner naar het westen (A=13m, E=7m)
- Meerdere T-steigers (kopzijden), vooral bij B en E
- E heeft de meeste kopsteigers (6 stuks)
- GPS centrum: 52.58038836, 5.75972931

---

## Statustypen in i-Marina

| Status | Kleur (i-Marina) | Beschrijving |
|---|---|---|
| Melding | (eigen kleur) | Ligplaats heeft een actieve melding/notitie |
| Vrij | groen | Ligplaats is beschikbaar |
| Passant | (eigen kleur) | Bezet door een passant/gast |
| Tijdelijk | (eigen kleur) | Tijdelijke bezetting |
| Verplaatst | (eigen kleur) | Boot is verplaatst naar andere plek |
| Stalling | (eigen kleur) | Boot in winterstalling |
| Klant | blauw | Vaste klant met jaarcontract |
| Zomer | (eigen kleur) | Seizoencontract (april-oktober) |
| Leeg | wit/grijs | Geen boot, geen contract |

---

## Contracttypes

- **Jaarcontract** — het hele jaar, vaste ligplaats
- **Zomercontract** — seizoen (typisch april-oktober)
- **Winterstalling** — alleen wintermaanden
- **Passant** — korte verblijven (per nacht)

---

## Financieel systeem

- Factuurnummers: formaat `582600XXX` (prefix per haven + jaar)
- BTW-tarieven in gebruik
- Deelbetalingen mogelijk (meerdere betalingen per factuur)
- Betaalmethoden: Contant, PIN, Overschrijving, Creditcard, Online
- Betaallinks: kopieerbaar naar klembord, per factuur
- Herinnering systeem: teller [1x], [2x], [3x] per factuur
- Toeristenbelasting apart berekend
- Plaatstarieven configureerbaar

---

## Meldingen/notities systeem

Elke melding bevat:
- Ligplaatscode (bijv. A06-12m)
- Vrije tekst
- Datum + tijd
- Auteur (bijv. "Jacqueline", "Kitty de Boer-Kuin")
- Link naar boeking

Voorbeelden van meldingen uit het systeem:
- "Deze plek voor Marieke Holwerda reserveren"
- "Boot is naar Harderwijk om opgeknapt te worden"
- "Boot ziet er echt heel slecht uit !!"
- "Vandaag gebeld, ze betalen eind april"
- "Boot gaat per half mei op de veiling verkocht worden"
- "Sleutel retour en borg sleutel eindafrekening"
- "In systeem stond nog zomercontract, heb er jaarcontract van gemaakt"

---

## Technische kenmerken i-Marina

- **Stack:** PHP (server-rendered), table-based HTML layout
- **Kaart:** OpenLayers met OpenStreetMap tiles
- **Responsief:** hamburger menu voor mobile, dual layout
- **Multi-tenant:** URL-structuur per haven (`/login/_ketel1/`)
- **Gebruikersrollen:** Havenmeester (huidige login), mogelijk admin
- **Versie:** v1.3
- **Ondersteuning:** Video instructies (YouTube @sudumnl), PDF handleiding
- **Maker:** Sudum B.V. (sudum.nl)

---

## Wat i-Marina NIET heeft (en Nautar wel)

1. **Huurder portaal** — geen self-service voor booteigenaren
2. **Moderne UX** — table-based layout, geen visuele hierarchie
3. **Mobile-first** — responsive maar niet mobile-first
4. **API** — geen REST API voor app-integratie
5. **Satellietkaart** — alleen OpenStreetMap (geen luchtfoto)
6. **AI-functies** — geen automatische detectie of positionering
7. **Drag & drop** — geen interactieve marker plaatsing
8. **Real-time updates** — geen WebSocket/live updates
