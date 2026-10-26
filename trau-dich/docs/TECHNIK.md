# Trau dich! · Überraschungsfahrt 2027

Eine vollständige, statische Website für das **unverbindliche Budget-Stimmungsbild** zur Fahrt vom **27.–30. Mai 2027**. Keine Anmeldung, keine zusätzlichen Präferenzfragen, keine Pflichtangaben zur Person.

## Sofort lokal ansehen

Im Projektordner mit Node.js 20 oder neuer:

```sh
npm run dev
```

Dann `http://localhost:3000` öffnen. Für die Website selbst ist **kein `npm install` und kein Build** nötig. Alternativ funktioniert `python3 -m http.server 3000`. Nicht einfach die HTML-Datei doppelklicken: JavaScript-Module benötigen einen HTTP-Server.

## In dein GitHub-Repository übernehmen

1. ZIP entpacken. Den **Inhalt des Ordners `trau-dich`** in das Repository kopieren. `index.html` muss direkt im Repository-Hauptverzeichnis liegen, nicht in einem zusätzlichen Zwischenordner.
2. Dateien auf den Branch `main` hochladen bzw. committen und pushen. Auch die leere Datei `.nojekyll` mitnehmen.
3. Im Repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
4. **Branch: `main`, Ordner: `/ (root)`**, dann **Save**.
5. Die anschließend von GitHub angezeigte Website-URL öffnen.

Kein Build-Befehl, kein `dist`-Ordner, kein Worker und kein eigenes Backend. Alle lokalen Verweise sind relativ und funktionieren auch unter `https://DEIN-NAME.github.io/DEIN-REPOSITORY/`.

## So funktioniert die Umfrage

- Vier diskrete Budgetstufen; wählbar per Schieberegler, direkter Schaltfläche, Maus, Touch oder Tastatur.
- Jede Stufe hat eine **unabhängige** Teilnahmebewertung. Ein Wechsel erhält die anderen Antworten; es gibt keine automatische Bewertung anderer Stufen.
- Beantwortete Stufen tragen kleine Häkchen. „Nächstes Budget“ springt zur nächsten offenen Stufe, ohne etwas zu senden.
- Erst „Stimmungsbild abschicken“ sendet alle vier Bewertungen. Fehlende Angaben werden fokussiert und erklärt.
- Ein synchroner Sperrmechanismus verhindert wiederholte Übermittlungen während einer laufenden Anfrage und nach bestätigtem Erfolg in derselben Seite.
- HTTP-/Netzwerkfehler erhalten alle Antworten und erlauben einen bewussten neuen Versuch. Nach 20 Sekunden ohne Bestätigung bricht der Client ab und weist auf den unsicheren Übermittlungsstatus hin.
- Kein automatischer Retry. Bei abgebrochener Verbindung kann technisch nicht garantiert werden, dass der Server eine Anfrage noch nicht angenommen hat. Wiederholungen über neue Tabs/Neuladen oder verschiedene Geräte werden nicht dedupliziert.

### Formspree

Der öffentliche Formular-Endpunkt ist direkt in `js/survey.js` hinterlegt:

```text
https://formspree.io/f/myeeepoe
```

Übermittelt wird ausschließlich dieses Schema mit den tatsächlichen Auswahlen:

```json
{
  "veranstaltung": "Überraschungsfahrt 2027",
  "budget_bis_100": "Sehr wahrscheinlich",
  "budget_100_200": "Eher ja",
  "budget_200_300": "Eher nein",
  "budget_ueber_300": "Nein"
}
```

`js/submit.js` sendet einen JSON-POST mit `Accept: application/json`, ohne Cookies. Bestätigung und Fehler erscheinen auf derselben Seite; keine Weiterleitung. Es werden keine Namen, E-Mail-Adressen, IDs oder Zeitstempel ergänzt.

**Es wurde keine echte Testantwort an Formspree geschickt.** Nach dem Deployment kann das Organisationsteam einmal manuell die erfolgreiche Übermittlung und den Eingang im eigenen Formspree-Dashboard prüfen. Die Verfügbarkeit, Freischaltung und eventuelle Spam-/Captcha-Einstellungen dieses konkreten Formulars lassen sich mit Mock-Tests nicht bestätigen.

## Gestaltung und Anpassung

Die Originalillustration ist als transparente WebP-Datei lokal eingebunden. In einer SVG-Szene liegen darüber acht animierte Routen mit Bus, Auto, Zug und Flugzeug. Sämtliche Routen beginnen am selben München-Marker. Fahrzeuge blenden an ihrem Ende in Wolken aus; keines markiert ein tatsächliches Reiseziel.

Vier Kamerastufen erweitern fließend den Ausschnitt derselben Landschaft. Die Verkehrsmittel illustrieren Möglichkeiten, keine Leistungen der jeweiligen Budgetstufe. Die Karte enthält keine echten Ortsnamen außer München.

| Datei | Zuständigkeit |
| --- | --- |
| `index.html` | Texte, Formular, Info-Dialoge, SVG-Fahrzeuge und Wolken |
| `css/style.css` | Layout, Farben, Typografie, Animationen, Bildschirmgrößen |
| `js/survey.js` | Budgetdefinitionen, Antworten, Validierung, Payload |
| `js/submit.js` | Formspree-POST, Timeout und Fehlermeldungen |
| `js/app.js` | Formularzustand, Bedienung, Fokus und Dialoge |
| `js/world.js` | Kamerafahrt, Routen, Fahrzeuge, Pausierung |
| `assets/illustrations/world.webp` | Lokal gespeicherte Originalillustration |
| `assets/fonts/` | Lokal eingebundene Schrift mit Lizenz |
| `tests/` | Unit-, Browser- und Playwright-Tests |
| `docs/TESTBERICHT.md` | Tatsächlich ausgeführte Prüfungen und Grenzen |
| `docs/ILLUSTRATION.md` | Erzeugungshinweise und vollständiger Bildprompt |

### Barrierearme Bedienung und Performance

Native Range- und Radio-Inputs, sichtbare Fokusmarkierung, Live-Status, verständliche Beschriftungen und native modale Dialoge. Pfeiltasten steuern den Regler; Home/End springen an die Enden. Radioantworten lassen sich mit Pfeiltasten und Leertaste wählen. Dialoge schließen mit Escape.

`prefers-reduced-motion` pausiert die Welt und schaltet die Kamerafahrt sofort um. Zusätzlich kann jede Person die Animationen über den Pausenknopf unter der Karte anhalten. Im Hintergrund und außerhalb des sichtbaren Bereichs stoppt die JavaScript-Animationsschleife. Wegpunkte werden einmalig vorberechnet; Bewegungen werden auf ungefähr 30 Bilder pro Sekunde begrenzt. Keine WebGL-Abhängigkeit, keine externen Bilder oder Schrift-CDNs.

## Tests erneut ausführen

### 1. Logik und Dateipfade — ohne zusätzliche Pakete

```sh
npm test
npm run check
```

Die Logiktests prüfen alle **256 möglichen Antwortkombinationen in jeweils 24 Bearbeitungsreihenfolgen**, Änderungen einzelner Antworten, alle 15 unvollständigen Antwortmuster, Payloads und Übermittlungsfehler. Jeder Netzwerktest verwendet eine simulierte Fetch-Funktion.

### 2. Browser-Integration — ohne Browserinstallation

```sh
npm run dev
```

Dann `http://localhost:3000/tests/browser/index.html?run` öffnen. Die Testseite führt selbstständig Tests im Browser aus und zeigt das Ergebnis mit exportierbarem JSON-Text an. Sie verwendet die echten HTML-, CSS- und JS-Dateien in einem isolierten Testfenster.

**Vor dem Laden der Anwendung wird jede Fetch-Anfrage durch eine Simulation ersetzt. Es kann keine Formspree-Testantwort versendet werden.** Das gilt auch für die interaktive Vorschau innerhalb dieser Testseite. Die normale `index.html` bleibt davon unberührt.

Die Tests prüfen DOM-Verhalten und echte Browserlayouts. Programmgesteuerte Klicks ersetzen dabei keine nativen Tastatur-/Touch-Eingaben. Diese sind zusätzlich in der Playwright-Suite enthalten.

### 3. Playwright — native Maus, Tastatur und simuliertes Touchgerät

```sh
npm install
npx playwright install chromium
npm run test:e2e
```

Für zusätzliche Browser:

```sh
npx playwright install firefox webkit
ALL_BROWSERS=1 npm run test:e2e
```

Die Playwright-Suite startet den lokalen Server automatisch. Alternativ kann `PREVIEW_URL` auf einen bereits laufenden Entwicklungsserver zeigen. Die Suite blockiert fremde Netzwerkziele und ersetzt Formspree-Anfragen durch explizite Mocks. Niemals die Netzwerk-Guards entfernen, um einen automatischen „echten“ Funktionstest zu erzwingen.

Unter Windows PowerShell Umgebungsvariablen beispielsweise mit `$env:ALL_BROWSERS="1"` setzen. Ergebnisse stehen in `test-results/results.json`; bei Fehlern erzeugt Playwright Screenshots und Traces.

## Daten und Hinweise vor der Veröffentlichung

Die Seite fragt keine direkten personenbezogenen Angaben ab, speichert Antworten nur im Arbeitsspeicher des geöffneten Tabs und schreibt selbst weder Cookies noch `localStorage`/`sessionStorage`. Neuladen setzt die Auswahl zurück. Hosting und Formularanbieter können technisch notwendige Verbindungsdaten verarbeiten; der kompakte Info-Dialog verschweigt das nicht.

Der Auftrag enthält keinen vollständigen Namen bzw. Kontakt des verantwortlichen Organisationsteams. Die Seite erfindet diese Daten nicht. Falls ihr eigene organisatorische oder rechtliche Pflichtangaben benötigt, ergänzt sie vor der öffentlichen Nutzung im Info-Dialog. Der mitgelieferte Text beschreibt die implementierte Datenverarbeitung und ist keine individuelle rechtliche Prüfung.

## Quellen und Rechte

- Die Welt wurde eigens für dieses Projekt mit dem integrierten Imagegen-Werkzeug erzeugt. Prompt und technische Informationen: `docs/ILLUSTRATION.md`.
- Fahrzeugsymbole, Wolken, Icons und Website-Code sind projektspezifisch erstellt, keine fremden Bildsammlungen.
- URW Bookman Demi: unveränderte OTF-Schrift aus URW Base35, Copyright URW; vollständige Lizenz in `assets/fonts/LICENSE.txt`. Quelle: <https://github.com/ArtifexSoftware/urw-base35-fonts>.
- Formspree AJAX-Dokumentation: <https://help.formspree.io/articles/building-your-form/submit-forms-with-javascript-ajax>.
- GitHub Pages veröffentlichen: <https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site>.
- GitHub Pages statische Dateien und `.nojekyll`: <https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site>.
