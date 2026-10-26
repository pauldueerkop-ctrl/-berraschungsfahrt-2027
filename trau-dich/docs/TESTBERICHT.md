# Testbericht · Trau dich! 2027

**Prüfdatum: 26. Oktober 2026 · Comic-Revision.** Die folgenden Prüfungen wurden tatsächlich ausgeführt. Alle Übermittlungen waren simuliert; der echte Formspree-Endpunkt wurde nicht mit Testantworten beschickt.

| Bereich | Ergebnis | Umgebung |
| --- | --- | --- |
| Logik- und Übermittlungstests | **292 bestanden, 0 fehlgeschlagen** | Node.js 24.22.1, integrierter Test-Runner |
| Browser-Integration | **62 bestanden, 0 fehlgeschlagen** | verfügbarer Chrome-Browser 155, isolierte Testfenster |
| Playwright-End-to-End | **49 bestanden, 0 fehlgeschlagen** | Playwright 1.62.1, Chromium 153.0.8010.0 |
| Asset-/Deployment-Prüfung | **bestanden** | Relative Pfade, vorhandene Dateien, Sprach-/Viewport-Metadaten |
| Visuelle Kontrolle | **Desktop, Laptop, Tablet und Smartphone geprüft** | Screenshots im Ordner `screenshots/` |

**Insgesamt 403 erfolgreiche Testfälle.** Nach einer abschließenden Tablet-Abstandskorrektur wurden die zwölf Layoutprüfungen und der neue Animationstest zusätzlich wiederholt: **13/13 bestanden**. Mehrfachdurchläufe sind in der Gesamtzahl nicht mehrfach gezählt. Die Tests ergänzen sich, enthalten aber auch bewusste Überschneidungen zwischen Logik- und Browserprüfung.

## Was geprüft wurde

### Antwortlogik

- Alle **256 vollständigen Kombinationen** aus vier Antwortmöglichkeiten für vier Budgets.
- Jede Kombination in allen **24 Bearbeitungsreihenfolgen**: 6.144 Konstellationen innerhalb der 256 parametrisierten Tests.
- Beliebiges Zurück- und Vorwärtsspringen, nachträgliche Änderungen und unveränderte Antworten der übrigen Stufen.
- Alle 15 Muster unvollständiger Antworten, erste fehlende Stufe, Fortschrittsanzeige und fehlende Default-Antwort.
- Exakte Feldnamen und tatsächliche Auswahlwerte im POST-Payload. Auch nicht monotone Antwortfolgen sind zulässig.
- Zusätzlich 160 deterministische Wechsel-/Änderungsschritte in der tatsächlichen Browser-Oberfläche.

### Übermittlung

- Kein Senden beim Schieben oder Bewerten; nur der finale Submit löst eine Anfrage aus.
- Bestätigter Erfolg, Zusammenfassung, Fokus und Verbleib auf derselben Seite.
- Netzwerkfehler, HTTP 400/401/403/404/422/429/500/503, ungültige bzw. nicht bestätigte Antworten.
- Langsame Verbindung mit Hinweis, gesperrten Eingaben und ausbleibender voreiliger Erfolgsmeldung.
- Tatsächliches Warten auf den **20-Sekunden-Timeout** in der Browser-Integration.
- Mehrfache Submit-Ereignisse während einer laufenden Anfrage erzeugen eine einzige Anfrage. Nach Erfolg bleibt erneutes Absenden in derselben Seite gesperrt.
- Expliziter erneuter Versuch nach Fehler; kein automatischer Retry und kein Verlust der Antworten.

### Browser, Bedienung und Layout

- Native Pfeiltasten, Home/End und Radioauswahl per Leertaste/Pfeiltaste.
- Echter Mouse-Drag auf dem Range-Input und emulierte Touch-Eingaben bei 390 × 844 Pixeln.
- Dialog öffnen, Escape schließen, Fokus zurück zum Auslöser.
- Weiche Kamerafahrt, schnelles Wechseln während der Animation, Pause/Fortsetzen.
- Mehr als Faktor 3,5 zwischen erster und letzter Zoomstufe; gemessen sind 3,84.
- Dynamische Kondensstreifen, regelmäßig sichtbare Hupzeichen und gemeinsam mit den Fahrzeugen eingefrorene Effekte beim Pausieren.
- Auch in der weitesten Ansicht ausreichend große Fahrzeuggrafiken auf Desktop und Smartphone.
- `prefers-reduced-motion` einschließlich CSS-Animationen und direkter Kameraposition im emulierten Browser.
- Kein horizontaler Überlauf und erreichbare Bedienelemente bei diesen Größen:

| Format | Viewports |
| --- | --- |
| Smartphone | 320 × 568, 360 × 800, 390 × 844, 430 × 932 |
| Zwischenformat / Tablet | 680 × 900, 768 × 1024, 820 × 1180 |
| Desktop / Laptop | 1024 × 768, 1280 × 720, 1440 × 900, 1920 × 1080, 2560 × 1080 |

- Auf den geprüften Desktopgrößen passt die normale Startansicht in die Viewporthöhe; Fehlerhinweise können bei wenig Höhe zusätzlichen Platz erfordern.
- Repository-Unterpfad `/repo-test/`: Module, Illustration und Bedienelemente laden korrekt.
- Keine von der Website geschriebenen Cookies oder Einträge in `localStorage`/`sessionStorage`.

## Visuelle Korrekturen aus der Prüfung

Die Landschaft wurde durch die kräftig konturierte Comicgrafik ersetzt. Der München-Marker sitzt am zentralen Brunnen. Zwei kurze Routen halten Bus und Auto auch in der ersten Ansicht sichtbar; weiter entfernte Routen kommen mit den Budgetstufen hinzu. Auf Tablets wurde der Abstand zur Formularspalte nach der visuellen Kontrolle vergrößert.

Der zusätzliche Browser-Runner meldete anfangs 60/62 erfolgreiche Prüfungen: Zwei Animationstests verwendeten starre Wartezeiten und konnten die verzögerte Aktivierung eines eingebetteten Testfensters als Fehler werten. Der Runner stellt das Fenster jetzt wieder sichtbar und wartet auf einen tatsächlichen Bewegungsbeginn. Die vollständige Wiederholung ergab **62/62 bestanden**. Die Sichtbarkeitspause der eigentlichen Website bleibt aktiv.

Ein Vergleich mit der ursprünglichen ZIP bestätigte identische sichtbare Website-Texte sowie byteidentische Dateien `js/app.js`, `js/survey.js` und `js/submit.js`.

Die sieben aktuellen Screenshots zeigen alle vier Budgetansichten am Desktop sowie Smartphone, Tablet und Laptop. Erzeugen mit `npm run screenshots` nach `npm ci` und Installation des Playwright-Chromium-Browsers. Die Screenshot-Automatisierung blockiert ebenfalls alle externen Netzwerkziele.

## Umgebung und Grenzen

Der reguläre Download des Playwright-Browsers lieferte in dieser Umgebung kein gültiges Archiv. Für die tatsächliche Ausführung wurde stattdessen Chromium aus **`@sparticuz/chromium` 153.0.0** verwendet. Diese reine Prüfabhängigkeit ist **kein Bestandteil der Website**. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` erlaubt in der Testkonfiguration einen vorhandenen Browser; ohne diese Variable nutzt die Suite die normale Playwright-Installation.

**Nicht ausgeführt:** Firefox, WebKit/Safari, echte Android-/iOS-Hardware, ein manueller Screenreader-Test und der reale Formspree-Versand. Touch wurde mit Playwright emuliert. Die visuelle Prüfung ist keine vollständige formale Barrierefreiheitszertifizierung und kein Performance-Benchmark auf echter Smartphone-Hardware.

Die tatsächliche Aktivierung und Spam-Konfiguration des konkreten Formspree-Formulars sowie der Eingang im Dashboard müssen einmal manuell nach der Veröffentlichung geprüft werden. Bei einem Netzwerkabbruch nach serverseitiger Annahme kann der Browser nicht garantieren, dass eine bewusste Wiederholung keine zweite Einsendung erzeugt; der Timeout-Hinweis erklärt diesen unbestätigten Zustand.

## Nachweise und Reproduktion

- `test-results/unit-tests.txt`: tatsächliche Ausgabe der 292 Node-Tests.
- `test-results/browser-results.json`: direkt aus dem ausgeführten Browser-Testlauf exportierter Bericht.
- `test-results/playwright-results.json`: Testnamen, Status, Laufzeiten und Statistik des abschließenden gezielten Playwright-Laufs mit 13 Layout-/Animationsprüfungen, ohne umgebungsspezifische absolute Pfade. Der davor ausgeführte vollständige Lauf bestand mit 49/49.
- `../tests/`: sämtliche Tests und der unabhängige Browser-Runner.
- `../README.md`: kurze Ausführungs- und Deployment-Anleitung.
