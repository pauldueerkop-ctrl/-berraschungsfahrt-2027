const NS = "http://www.w3.org/2000/svg";
// One fictional world, one departure plaza; no destinations are promised.
export const ORIGIN = Object.freeze({ x: 858, y: 544 });
// 3.84× more width / about 15× more area from the first to the last view.
export const SCALES = Object.freeze([3.3, 2.15, 1.38, 0.86]);
export const ROUTES = Object.freeze([
  { id: "woodland", level: 0, vehicle: "bus", duration: 24000, delay: 0, size: 110,
    d: "M858 544 C825 558 814 588 763 597 S673 607 635 584 S598 553 579 563 C568 605 613 645 663 671" },
  { id: "meadow", level: 0, vehicle: "car", duration: 27000, delay: 10000, size: 88,
    d: "M858 544 C879 577 869 618 873 645 S959 663 998 637 S1050 594 1104 584" },
  { id: "viaduct", level: 1, vehicle: "train", duration: 30000, delay: 2500, size: 160,
    d: "M858 544 C798 557 723 527 673 496 S576 459 520 455 C435 434 347 407 270 391 S186 370 126 362" },
  { id: "hills", level: 1, vehicle: "bus", duration: 27000, delay: 13000, size: 110,
    d: "M858 544 C901 520 940 495 993 500 S1090 493 1144 465 S1270 409 1360 438" },
  { id: "air-west", level: 2, vehicle: "plane", duration: 30000, delay: 7500, size: 124,
    d: "M858 544 C732 440 565 323 380 255 S203 169 100 100" },
  { id: "highlands", level: 2, vehicle: "train", duration: 33000, delay: 8000, size: 160,
    d: "M858 544 C855 478 855 438 907 401 S1025 373 1078 322 S1165 271 1250 235" },
  { id: "air-east", level: 3, vehicle: "plane", duration: 32000, delay: 17000, size: 124,
    d: "M858 544 C1016 532 1166 586 1290 546 S1473 450 1555 350" },
  { id: "valley", level: 3, vehicle: "car", duration: 34000, delay: 18000, size: 88,
    d: "M858 544 C806 580 730 590 657 577 S558 601 495 577 S350 562 232 617" },
]);
const SHAPES = {
  bus: { width: 120, height: 90, wheels: [[-32, 23], [34, 23]] },
  car: { width: 100, height: 80, wheels: [[-28, 19], [28, 19]] },
  train: { width: 170, height: 90, wheels: [[-65, 20], [-29, 20], [24, 20], [55, 20]] },
  plane: { width: 130, height: 100, wheels: [] },
};
const ease = (t) => 1 - (1 - t) ** 3;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}
function sample(points, phase) {
  const index = clamp(phase, 0, 1) * (points.length - 1);
  const low = Math.min(points.length - 2, Math.floor(index));
  const p = points[low], q = points[low + 1];
  return { x: p.x + (q.x - p.x) * (index - low), y: p.y + (q.y - p.y) * (index - low), angle: Math.atan2(q.y - p.y, q.x - p.x) };
}

export function initWorld(root) {
  const svg = root.querySelector("#world-svg");
  const camera = root.querySelector("#world-camera");
  const origin = root.querySelector("#origin-marker");
  const pathsContainer = root.querySelector("#routes");
  const effectsContainer = root.querySelector("#travel-effects");
  const vehiclesContainer = root.querySelector("#vehicles");
  const cloudsContainer = root.querySelector("#route-clouds");
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  let level = 0, scale = SCALES[0], startScale = scale, targetScale = scale;
  let transitionStart = 0, paused = media.matches, frame = 0, previousFrame = 0;
  let journeyClock = 5500, inView = true;

  const entries = ROUTES.map((route, number) => {
    const group = el("g", { class: `route-group route-${route.vehicle}`, "data-route-level": route.level });
    group.append(el("path", { d: route.d, class: "route-shadow" }));
    const path = el("path", { d: route.d, class: "route-line", id: `route-${route.id}` });
    group.append(path);
    pathsContainer.append(group);
    const length = path.getTotalLength();
    // Geometry is sampled once, never during an animation frame.
    const points = Array.from({ length: 321 }, (_, i) => path.getPointAtLength(length * i / 320));
    const vehicle = el("g", { class: "vehicle", "data-vehicle": route.vehicle, "data-route": route.id });
    const sprite = el("g", { class: "vehicle-sprite" });
    const shape = SHAPES[route.vehicle];
    sprite.append(el("use", { href: `#vehicle-${route.vehicle}`, x: -shape.width / 2, y: -shape.height / 2, width: shape.width, height: shape.height }));
    const wheels = shape.wheels.map(([x, y]) => {
      const wheel = el("g");
      wheel.append(el("path", { d: "M-4 0h8M0-4v8", stroke: "#fff7d9", "stroke-width": 2.3, "stroke-linecap": "round" }));
      sprite.append(wheel);
      return { node: wheel, x, y };
    });
    vehicle.append(sprite);
    let horn = null;
    if (route.vehicle === "bus") {
      horn = el("g", { class: "comic-honk", fill: "none", stroke: "#e89c27", "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" });
      horn.append(el("path", { d: "M65-9l14-7M68 3h19M63 15l14 8" }));
      horn.append(el("path", { d: "M78-26l6-10M90-15l11-5", stroke: "#24483f", "stroke-width": 2.5 }));
      vehicle.append(horn);
    }
    const puffCount = route.vehicle === "train" ? 4 : route.vehicle === "plane" ? 0 : 3;
    const puffs = Array.from({ length: puffCount }, () => {
      const puff = el("circle", { class: "travel-puff", r: 6 });
      vehicle.insertBefore(puff, sprite);
      return puff;
    });
    vehiclesContainer.append(vehicle);
    const trail = el("g", { class: "contrail", "data-trail-route": route.id });
    const trails = route.vehicle === "plane" ? [-1, 1].map((side) => {
      const pieces = Array.from({ length: 5 }, (_, i) => {
        const line = el("path", { class: "contrail-line", opacity: .84 - i * .14 });
        trail.append(line);
        return line;
      });
      return { side, pieces };
    }) : [];
    effectsContainer.append(trail);
    const end = points[309];
    const cloud = el("g", { class: "route-group route-cloud" });
    cloud.append(el("use", { href: "#cloud", x: end.x - 47, y: end.y - 27, width: 106, height: 46, opacity: .86 }));
    cloudsContainer.append(cloud);
    return { ...route, kind: route.vehicle, number, length, group, path, points, vehicle, sprite, wheels, horn, puffs, trail, trails, cloud };
  });

  function drawCamera() {
    camera.setAttribute("transform", `translate(${(800 - ORIGIN.x * scale).toFixed(2)} ${(565 - ORIGIN.y * scale).toFixed(2)}) scale(${scale.toFixed(5)})`);
    origin.setAttribute("transform", `translate(${ORIGIN.x} ${ORIGIN.y}) scale(${(1 / scale ** .84).toFixed(4)})`);
    svg.dataset.scale = scale.toFixed(4);
  }
  function drawVehicles() {
    for (const route of entries) {
      const visible = route.level <= level;
      route.vehicle.style.display = route.trail.style.display = visible ? "" : "none";
      if (!visible) continue;
      const phase = ((journeyClock + route.delay) % route.duration) / route.duration;
      const point = sample(route.points, phase);
      const degrees = point.angle * 180 / Math.PI;
      const flying = route.kind === "plane";
      const reversed = Math.abs(degrees) > 90;
      const heading = flying ? degrees : clamp(degrees + (reversed ? (degrees > 0 ? -180 : 180) : 0), -14, 14);
      const flip = !flying && reversed ? -1 : 1;
      // Counterzoom keeps the moving characters legible in the wide view.
      const characterScale = route.size / SHAPES[route.kind].width / scale ** .84;
      const rhythm = journeyClock / 1000 + route.number * 1.7;
      const opacity = Math.min(1, phase / .035, (1 - phase) / .09);
      route.vehicle.setAttribute("transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${heading.toFixed(2)}) scale(${(flip * characterScale).toFixed(4)} ${characterScale.toFixed(4)})`);
      route.vehicle.style.opacity = String(opacity);
      const bounce = flying ? Math.sin(rhythm * 2) * 2 : -Math.abs(Math.sin(rhythm * 5)) * 3.4;
      const lean = Math.sin(rhythm * (flying ? 1.4 : 4)) * (flying ? 4 : 1.8);
      route.sprite.setAttribute("transform", `translate(0 ${bounce.toFixed(2)}) rotate(${lean.toFixed(2)})`);
      for (const wheel of route.wheels) wheel.node.setAttribute("transform", `translate(${wheel.x} ${wheel.y}) rotate(${(rhythm * 360 % 360).toFixed(1)})`);
      if (route.horn) {
        const honk = (rhythm + 1.6) % 5.4;
        route.horn.setAttribute("opacity", honk < 1.05 ? String(.72 + .28 * Math.sin(honk * 22) ** 2) : "0");
        route.horn.setAttribute("transform", `scale(${(1 + .12 * Math.sin(honk * 18)).toFixed(3)})`);
      }
      for (let i = 0; i < route.puffs.length; i++) {
        const progress = (rhythm * (route.kind === "train" ? .58 : .8) + i / route.puffs.length) % 1;
        const steam = route.kind === "train";
        route.puffs[i].setAttribute("cx", (steam ? 51 - progress * 58 : -52 - progress * 24).toFixed(2));
        route.puffs[i].setAttribute("cy", (steam ? -28 - progress * 45 : 18 - progress * 8).toFixed(2));
        route.puffs[i].setAttribute("r", (3 + progress * (steam ? 10 : 5)).toFixed(2));
        route.puffs[i].setAttribute("opacity", ((1 - progress) * (steam ? .85 : .6)).toFixed(2));
      }
      for (const { side, pieces } of route.trails) {
        const behind = 43 * characterScale / route.length;
        for (let segment = 0; segment < pieces.length; segment++) {
          const coords = [];
          for (let j = 0; j <= 5; j++) {
            const age = (segment + j / 5) / pieces.length;
            const previous = phase - behind - age * .19;
            if (previous < 0) break;
            const p = sample(route.points, previous);
            const offset = (13 + age * 5) * characterScale * side;
            coords.push(`${coords.length ? "L" : "M"}${(p.x - Math.sin(p.angle) * offset).toFixed(1)} ${(p.y + Math.cos(p.angle) * offset).toFixed(1)}`);
          }
          pieces[segment].setAttribute("d", coords.join(" "));
          pieces[segment].setAttribute("stroke-width", ((4 + segment * .9) * characterScale).toFixed(2));
        }
        route.trail.style.opacity = String(opacity);
      }
    }
  }
  function step(now) {
    frame = 0;
    if (document.hidden || !inView || paused) { previousFrame = 0; return; }
    if (previousFrame && now - previousFrame < 32) { frame = requestAnimationFrame(step); return; }
    if (previousFrame) journeyClock += Math.min(now - previousFrame, 100);
    previousFrame = now;
    if (scale !== targetScale) {
      const progress = Math.min(1, (now - transitionStart) / 1450);
      scale = startScale + (targetScale - startScale) * ease(progress);
      if (progress === 1) scale = targetScale;
      drawCamera();
    }
    drawVehicles();
    frame = requestAnimationFrame(step);
  }
  function start() { if (!frame && !paused && !document.hidden && inView) frame = requestAnimationFrame(step); }
  function stop() { cancelAnimationFrame(frame); frame = 0; previousFrame = 0; }
  function setLevel(next) {
    level = next;
    root.dataset.level = String(next);
    startScale = scale;
    targetScale = SCALES[next];
    transitionStart = performance.now();
    for (const route of entries) {
      route.group.classList.toggle("is-hidden", route.level > next);
      route.cloud.classList.toggle("is-hidden", route.level > next);
    }
    if (paused || !inView || document.hidden) { scale = targetScale; drawCamera(); }
    drawVehicles();
    start();
  }
  const motionButton = root.querySelector("#motion-toggle");
  function setPaused(value) {
    paused = value;
    root.classList.toggle("motion-paused", value);
    motionButton.setAttribute("aria-pressed", String(value));
    motionButton.setAttribute("aria-label", value ? "Animationen fortsetzen" : "Animationen pausieren");
    motionButton.querySelector("use").setAttribute("href", value ? "#i-play" : "#i-pause");
    if (value) { stop(); scale = targetScale; drawCamera(); drawVehicles(); }
    else start();
  }
  motionButton.addEventListener("click", () => setPaused(!paused));
  media.addEventListener("change", (event) => setPaused(event.matches));
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  if ("IntersectionObserver" in window) new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) start(); else stop();
  }, { rootMargin: "60px" }).observe(svg);
  function celebrate() {
    if (media.matches || paused) return;
    const celebration = document.createElement("div");
    celebration.className = "world-celebration";
    celebration.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 27; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti";
      const theta = i / 27 * Math.PI * 2;
      piece.style.setProperty("--piece-x", `${Math.cos(theta) * (80 + i % 7 * 30)}px`);
      piece.style.setProperty("--piece-y", `${Math.sin(theta) * 170 - 70}px`);
      piece.style.setProperty("--piece-spin", `${i * 57}deg`);
      piece.style.setProperty("--piece-color", ["#e98763", "#4d915c", "#f1c15e", "#78c9ca"][i % 4]);
      celebration.append(piece);
    }
    root.querySelector(".world").append(celebration);
    setTimeout(() => celebration.remove(), 1900);
  }
  drawCamera();
  setPaused(paused);
  setLevel(0);
  return { setLevel, celebrate };
}
