# Illustration und Assets

Die Landschaft wurde eigens für diese Website mit dem integrierten Imagegen-Werkzeug (Built-in-Modus, kein separater API-Aufruf) erzeugt. Es wurden keine fremden Foto- oder Illustrationssammlungen übernommen.

Ausgabe: 1536 × 1024 Pixel, RGBA mit echtem Alphakanal. Für die Website wurde die Ausgabe ohne inhaltliche Änderung als WebP (Qualität 91, Alpha-Qualität 100) komprimiert. Lokale Projektdatei: `assets/illustrations/world.webp`. Transparenz und Bildausschnitt bleiben erhalten.

Alle animierten Ebenen, die Kamerafahrt, acht Reiserouten, Fahrzeuge, Wolken, Markierung und Interface-Elemente sind separat im Quellcode definiert. Dadurch werden keine vier statischen Budgetbilder ausgetauscht.

## Vollständiger Erzeugungsprompt

```text
Use case: illustration-story.
Asset type: original high-resolution landscape asset for an interactive illustrated travel map, NOT a webpage screenshot.
Create one beautiful, very detailed hand-painted comic adventure world on a TRANSPARENT background. Wide landscape composition 3:2, target 2048 pixels or greater. An entire softly curved, slightly globe-like oval fantasy landmass seen from a high bird's-eye/isometric angle. It fills 90% of canvas, all land edges visible and softly surrounded by small ivory clouds; no rectangular edges. Mature charming European travel editorial illustration, fine confident ink outlines, gouache shading, beautifully crafted detail, playful but sophisticated, not children's clipart, not plastic 3D.
Composition has a small warm southern-German town at the exact center of the landmass, around 50% horizontal and 55% vertical, with small red roofs, two subtle green copper onion-domed towers evoking Munich (the ONLY recognizable architecture). A little clear grassy round departure plaza at that central point, unobstructed foreground. Winding pale ochre roads branch outward from this central town into all regions. No people, cars, trains, planes or text; these will be animated separately.
From center outwards: a welcoming close landscape of meadows, pine groves, little cottages, gentle emerald hills and a small hilltop medieval castle. To the left a deep teal lake, a winding river and a magnificent multi-arch stone rail viaduct spanning a wooded canyon. Upper center: layered mountains and snow-capped peaks, atmospheric teal distant hills. Upper right: tall whimsical invented clifftop castles, narrow stone bridges, a tunnel mouth and terracotta-roof hill villages. Right and lower-right: sunlit terraced amber hills, a little seaside harbor, turquoise water and tiny sailboats, a far-off invented rocky island. Lower left: waterfalls, forest and curling streams. Invented geography only, no real place labels or recognizable monuments except the Munich-inspired little town at center.
Color palette: luminous sage and warm emerald green, pale butter grass, terracotta coral roofs, sandstone cliffs, teal and sky blue water, creamy ivory clouds. Cheerful daylight with soft shadows, atmospheric perspective, white paper touches, subtle grain. Dense with tiny discoveries but calm and harmonious, varied terrain, layered depth.
Critical: entire landmass isolated with real alpha transparency around it, no background rectangle, no border or frame, no typography, no UI, no arrows, no pin, no route dots, no labels, no letters, no words, no watermark. No real city or landmark except the subtle two Munich domes. This is the premium hero artwork itself.
```
