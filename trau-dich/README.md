# Trau dich! · Überraschungsfahrt 2027

Eine vollständige, illustrierte Website für das **unverbindliche Budget-Stimmungsbild** zur Fahrt vom **27.–30. Mai 2027**. Vier Budgetstufen, vier unabhängige Bewertungen, keine Anmeldung und keine Fragen nach Namen oder Reisevorlieben.

## Lokal öffnen

Im entpackten Projektordner, mit Node.js 20 oder neuer:

```sh
npm run dev
```

Dann **http://localhost:3000** öffnen. Für die Website sind **kein Installieren von Paketen und kein Build** nötig. Alternativ: `python3 -m http.server 3000`. Die HTML-Datei nicht direkt doppelklicken; JavaScript-Module benötigen einen HTTP-Server.

## GitHub Pages

### Die bereits veröffentlichte Seite aktualisieren

Die ZIP behält den Ordnernamen **`trau-dich`** bei. Den entpackten Ordner auf derselben Ebene wie den bisherigen Ordner im Repository hochladen; dadurch werden gleichnamige Dateien aktualisiert. Die vorhandene Weiterleitung `index.html` ganz oben im Repository bleibt bestehen. Die Pages-Einstellungen und der Branch müssen für diese Grafikrevision nicht geändert werden.

### Eine neue Veröffentlichung

Der Inhalt von `trau-dich` kann direkt im Repository-Hauptverzeichnis liegen. Alternativ bleibt der ganze Ordner im Repository; dann liegt die Website unter dem Unterpfad `/trau-dich/`. Eine vorhandene Weiterleitung im Hauptverzeichnis kann auf diesen Unterpfad zeigen. Pages verwendet weiterhin den Branch `main` mit `/ (root)`; `main/trau-dich` ist kein Branch.

Keine Build-Pipeline, kein Worker und kein eigenes Backend. Relative Asset-Pfade unterstützen Repository-Unterpfade.

## Formspree

Der angegebene Endpunkt ist fertig integriert: `https://formspree.io/f/myeeepoe`.

Erst der finale Button sendet alle vier Bewertungen als JSON. Fehlende Antworten werden angezeigt und fokussiert. Ladezustand, Fehlermeldung, bewusster erneuter Versuch und Erfolgsbestätigung bleiben auf derselben Seite. Mehrfachklicks während der Anfrage sind gesperrt.

**Es wurden keine echten Testantworten verschickt.** Nach Veröffentlichung einmal manuell den Versand und den Eingang im eigenen Formspree-Dashboard prüfen. Die konkrete Freischaltung und Spam-Einstellungen des Formulars können simulierte Tests nicht bestätigen.

Die Auswahl bleibt beim Budgetwechsel erhalten, wird aber beim Neuladen zurückgesetzt. Es gibt keine Cookies, Trackingdienste oder Speicherung in `localStorage`/`sessionStorage`. Wiederholte Einsendungen aus neuen Tabs oder nach Neuladen werden bewusst nicht anhand persönlicher Kennungen verhindert.

## Dateien anpassen

| Datei | Inhalt |
| --- | --- |
| `index.html` | Texte, Formular, Info-Dialoge und SVG-Symbole |
| `css/style.css` | Layout, Farben, Typografie und Animationen |
| `js/survey.js` | Budgetstufen, Antworten und Formspree-Endpunkt |
| `js/submit.js` | Übermittlung und Fehlerbehandlung |
| `js/app.js` | Bedienung und Formularzustand |
| `js/world.js` | Kamerafahrten, Routen und Verkehrsmittel |
| `assets/` | Originalillustration, Schrift und Favicon |

Die neue Comicwelt besteht aus einer transparenten Illustration mit separaten animierten SVG-Ebenen. Der Zoom zeigt zwischen erster und letzter Stufe rund 15-mal so viel Fläche. Größere Fahrzeuge federn, ihre Räder drehen sich; Busse zeigen Hupzeichen, Züge Dampfwölkchen und Flugzeuge Kondensstreifen. Ein Pausenknopf und `prefers-reduced-motion` berücksichtigen reduzierte Bewegung. Verkehrsmittel und Orte sind rein illustrativ. Texte, Budgetwerte, Formularlogik und Formspree-Endpunkt bleiben unverändert.

## Tests

Ohne zusätzliche Pakete:

```sh
npm test
npm run check
```

Die Unit-Tests prüfen unter anderem **alle 256 Antwortkombinationen in jeweils 24 Bearbeitungsreihenfolgen**.

Browser-Integrationstests ohne Installation: Server starten und **http://localhost:3000/tests/browser/index.html?run** öffnen. Alle Formularanfragen werden abgefangen; der Testbericht erscheint direkt auf der Seite.

Playwright für native Maus-, Tastatur- und Touch-Tests:

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

Für Firefox und WebKit: `npx playwright install firefox webkit`, danach `ALL_BROWSERS=1 npm run test:e2e`. Unter PowerShell zuerst `$env:ALL_BROWSERS="1"` setzen.

Die sieben mitgelieferten Bildschirmansichten lassen sich mit `npm run screenshots` neu erzeugen.

**Alle automatisierten Tests simulieren Formspree. Niemals Testantworten automatisiert an den echten Endpunkt senden.**

Der vollständige Prüfstand steht in **[docs/TESTBERICHT.md](docs/TESTBERICHT.md)**. Weitere technische Details und Quellen: [docs/TECHNIK.md](docs/TECHNIK.md). Bildprompt und Herkunft: [docs/ILLUSTRATION.md](docs/ILLUSTRATION.md). Schriftlizenz: [assets/fonts/LICENSE.txt](assets/fonts/LICENSE.txt).
