# Comic-Illustration und Animationen

Die neue Karte wurde mit dem integrierten Imagegen-Werkzeug (Built-in-Modus) erzeugt und anschließend im selben Werkzeug gezielt in einen kräftigen Cartoonstil überarbeitet. Der erste Entwurf diente nur als Zwischenstufe.

Ausgabe: **1536 × 1024 Pixel, RGBA mit Alphakanal**. Die technische Konvertierung zu WebP verwendet Qualität 94 und Alpha-Qualität 100. Projektdatei: `assets/illustrations/world-comic.webp` (rund 625 KiB). Die Umgebung bleibt transparent. Es wurden keine fremden Bildsammlungen verwendet.

Die Fahrzeuge sind eigenständige SVG-Zeichnungen in `index.html`: Reisebus mit Koffern, kleines Auto mit Dachgepäck, Cartoonzug und Flugzeug. `js/world.js` animiert Räder, Karosserie, Hupzeichen, Dampf und zwei der Flugbahn folgende Kondensstreifen. Alle Effekte gehorchen Pause und reduzierter Bewegung. Es gibt keine Tonwiedergabe.

Die vier Kamerastufen sind **3,30 / 2,15 / 1,38 / 0,86**. Vom ersten bis zum letzten Ausschnitt wächst die sichtbare Breite um Faktor 3,84 und die Fläche rechnerisch um Faktor 14,7. Fahrzeuge werden beim Herauszoomen teilweise gegenskaliert, damit sie sichtbar bleiben. Das dargestellte Gebiet und die Verkehrsmittel sind fiktiv.

## Erzeugungsprompt

```text
Use case: illustration-story.
Asset type: transparent illustrated fantasy map for a youth surprise-trip website, to be explored by zooming from a town into a whole world.
Primary request: a playful, unmistakably cartoon/comic adventure world, bold clean dark-forest ink outlines, confident flat cel shading, rounded exaggerated forms, bright but tasteful warm colours. Not painterly, no watercolor or gouache texture, no photorealism or 3D.
Composition: very wide landscape, 3:2, as high resolution as possible ideally 3072x2048. Oblique bird's-eye view, entire organically shaped world floating on true transparent background, no rectangle. The world nearly fills the canvas with generous uneven transparent edges. Dense enough to look beautiful when zoomed in 3.3 times.
At the EXACT CENTER of the image a cheerful little Munich-like town, recognizable twin green onion-domed church towers, coral roofs, cream walls, tiny rounded trees, an open pale circular plaza immediately BELOW the twin towers at x=50%,y=54%. The town occupies about the middle 24% of the width. Surrounding it are bright meadows, winding pale roads, rounded forest groves, and a curving turquoise river with bridges. Further out distinct adventurous regions: snow-peaked cartoon mountains and a tiny castle upper left; terraced hills and a large arched railway viaduct left; golden dunes and canyon mesas upper right; turquoise coastal bay with lighthouse and small warm islands lower right; emerald forests and a small lake lower left. Interconnected continuous land mass, not separate framed panels. Roads radiate naturally from central town through the landscape.
Style: high-quality European comic travel poster / playful game map for teens and young adults. Broad black-green contour lines, charming stylized houses, bulbous tree canopies, outlined water ripples, simple flat shadow shapes, lively coherent miniature scenery. Use forest green, mint, turquoise, butter yellow, cream, coral and terracotta. Crisp readable shapes even at smaller size.
Constraints: no text, no lettering, no labels, no UI, no compass, no border, NO vehicles, NO planes, NO buses, NO trains (they will be animated separately in code), no large clouds obscuring the landscape. Avoid overly tiny repetitive details, avoid faded/painterly edges. True alpha transparency outside the map.
```

## Überarbeitungsprompt

Eingabebild: der erste, eigens erzeugte Kartenentwurf. Modus: Built-in-Bildbearbeitung, transparenter Hintergrund.

```text
Use case: style-transfer. Image 1 is the edit target. Keep the overall fantasy map layout, the central Munich twin-towered church and plaza, river, mountains, forest, bridge, canyon and coast in their current places. Radically redraw the WHOLE image as a playful 2D cartoon comic map. MUCH SIMPLER, MUCH BOLDER AND MORE GRAPHIC. Thick smooth dark green ink contours, solid flat colours with at most one hard shadow per object, chubby rounded tree shapes, chunky toy-like buildings, exaggerated gently wobbly proportions. Think polished hand-drawn cartoon board-game adventure map. Enlarge shapes and simplify detail. No painterly marks, NO watercolor, NO realistic foliage, no textured shading or gradients. Every tree should have a simple bold outlined rounded canopy. Mountains should be simple large triangles with bold white snowcaps, not detailed realistic crags. Cheerful mint, teal, butter-yellow and coral-red. Clean cream negative space between outlined elements. Retain an attractive rich explorable landscape, but clearly a cartoon rather than a painting. IMPORTANT: REMOVE the ENTIRE dark gradient background outside the irregular land/water silhouette. Replace it with REAL ALPHA TRANSPARENCY, no black, no gray, no checkerboard painted in. Map cutout only, with clean outline. No text, labels, vehicles, borders, UI.
```
