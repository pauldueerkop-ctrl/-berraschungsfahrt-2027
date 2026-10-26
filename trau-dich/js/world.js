const NS = "http://www.w3.org/2000/svg";
// Every route starts in the same Munich plaza. The landscape is entirely fictional.
export const ORIGIN = Object.freeze({ x: 811, y: 524 });
export const ROUTES = Object.freeze([
  {
    id: "woodland",
    level: 0,
    vehicle: "bus",
    duration: 21000,
    delay: 0,
    size: 43,
    d: "M811 524 C775 552 746 610 695 635 S613 656 655 691 S787 711 801 769 C842 810 677 830 623 879",
  },
  {
    id: "meadow",
    level: 0,
    vehicle: "car",
    duration: 26000,
    delay: 8000,
    size: 34,
    d: "M811 524 C784 556 717 568 649 557 S562 580 500 583 C420 591 332 582 235 565 S116 548 50 587",
  },
  {
    id: "viaduct",
    level: 1,
    vehicle: "train",
    duration: 29000,
    delay: 2500,
    size: 70,
    d: "M811 524 C745 502 680 534 621 509 S531 415 468 401 C404 391 226 440 142 446 S61 450 2 467",
  },
  {
    id: "hills",
    level: 1,
    vehicle: "bus",
    duration: 24000,
    delay: 12000,
    size: 39,
    d: "M811 524 C875 525 854 567 915 599 S1001 619 1022 664 C1058 700 1114 698 1151 747 S1271 858 1427 890",
  },
  {
    id: "air-west",
    level: 2,
    vehicle: "plane",
    duration: 25000,
    delay: 1000,
    size: 51,
    d: "M811 524 C685 357 454 243 200 204 S-41 163 -150 98",
  },
  {
    id: "highlands",
    level: 2,
    vehicle: "train",
    duration: 33000,
    delay: 6000,
    size: 65,
    d: "M811 524 C884 536 981 489 1050 462 S1119 393 1204 350 C1278 309 1316 251 1378 197 S1460 177 1561 103",
  },
  {
    id: "air-east",
    level: 3,
    vehicle: "plane",
    duration: 30000,
    delay: 7000,
    size: 50,
    d: "M811 524 C1067 481 1252 436 1413 314 S1648 143 1775 80",
  },
  {
    id: "valley",
    level: 3,
    vehicle: "car",
    duration: 35000,
    delay: 15000,
    size: 33,
    d: "M811 524 C856 463 847 408 836 367 S868 294 867 268 C835 238 811 217 829 190 S911 153 981 98",
  },
]);
const SCALES = [1.62, 1.36, 1.14, 0.96];
const ease = (t) => 1 - Math.pow(1 - t, 3);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs))
    node.setAttribute(key, String(value));
  return node;
}

export function initWorld(root) {
  const svg = root.querySelector("#world-svg");
  const camera = root.querySelector("#world-camera");
  const origin = root.querySelector("#origin-marker");
  origin.setAttribute("transform", `translate(${ORIGIN.x} ${ORIGIN.y})`);
  const pathsContainer = root.querySelector("#routes");
  const vehiclesContainer = root.querySelector("#vehicles");
  const cloudsContainer = root.querySelector("#route-clouds");
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  let level = 0;
  let scale = SCALES[0];
  let startScale = scale;
  let targetScale = scale;
  let transitionStart = 0;
  let paused = media.matches;
  let frame = 0;
  let previousFrame = 0;
  let journeyClock = 5500;
  let inView = true;

  const entries = ROUTES.map((route) => {
    const group = el("g", {
      class: "route-group",
      "data-route-level": route.level,
    });
    group.append(el("path", { d: route.d, class: "route-shadow" }));
    const path = el("path", {
      d: route.d,
      class: "route-line",
      id: `route-${route.id}`,
    });
    group.append(path);
    pathsContainer.append(group);
    const length = path.getTotalLength();
    // Cache points once; animation never calls path geometry or forces a layout.
    const points = Array.from({ length: 241 }, (_, index) =>
      path.getPointAtLength((length * index) / 240),
    );
    const vehicle = el("g", {
      class: "vehicle",
      "data-vehicle": route.vehicle,
      "data-route": route.id,
    });
    const height =
      route.vehicle === "train" ? route.size * 0.4 : route.size * 0.8;
    vehicle.append(
      el("use", {
        href: `#vehicle-${route.vehicle}`,
        x: -route.size / 2,
        y: -height / 2,
        width: route.size,
        height,
      }),
    );
    vehiclesContainer.append(vehicle);
    const end = points[227];
    const cloud = el("g", { class: "route-group route-cloud" });
    cloud.append(
      el("use", {
        href: "#cloud",
        x: end.x - 66,
        y: end.y - 35,
        width: 144,
        height: 63,
        opacity: 0.94,
      }),
    );
    cloudsContainer.append(cloud);
    return { ...route, group, path, vehicle, cloud, points };
  });

  function drawCamera() {
    // Keep the departure point steady while revealing more of the same world.
    const x = 800 - ORIGIN.x * scale;
    const y = 565 - ORIGIN.y * scale;
    camera.setAttribute(
      "transform",
      `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(5)})`,
    );
    // The label stays readable at every zoom level.
    origin.setAttribute(
      "transform",
      `translate(${ORIGIN.x} ${ORIGIN.y}) scale(${(1 / Math.sqrt(scale)).toFixed(4)})`,
    );
    svg.dataset.scale = scale.toFixed(4);
  }
  function drawVehicles() {
    for (const route of entries) {
      const visible = route.level <= level;
      route.vehicle.style.display = visible ? "" : "none";
      if (!visible) continue;
      const phase =
        ((journeyClock + route.delay) % route.duration) / route.duration;
      const index = phase * 240;
      const low = Math.floor(index);
      const p0 = route.points[low];
      const p1 = route.points[Math.min(240, low + 1)];
      const x = p0.x + (p1.x - p0.x) * (index - low);
      const y = p0.y + (p1.y - p0.y) * (index - low);
      const angle = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;
      const heading =
        route.vehicle === "plane"
          ? angle
          : clamp(
              angle > 90 || angle < -90
                ? angle + (angle > 0 ? -180 : 180)
                : angle,
              -18,
              18,
            );
      const flip = route.vehicle !== "plane" && p1.x < p0.x ? -1 : 1;
      route.vehicle.setAttribute(
        "transform",
        `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${heading.toFixed(2)}) scale(${flip} 1)`,
      );
      route.vehicle.style.opacity = String(
        Math.min(1, phase / 0.07, Math.max(0, (1 - phase) / 0.14)),
      );
    }
  }
  function step(now) {
    frame = 0;
    if (document.hidden || !inView || paused) {
      previousFrame = 0;
      return;
    }
    if (previousFrame && now - previousFrame < 32) {
      frame = requestAnimationFrame(step);
      return;
    }
    if (previousFrame) journeyClock += Math.min(now - previousFrame, 100);
    previousFrame = now;
    if (scale !== targetScale) {
      const progress = Math.min(1, (now - transitionStart) / 1250);
      scale = startScale + (targetScale - startScale) * ease(progress);
      if (progress === 1) scale = targetScale;
      drawCamera();
    }
    drawVehicles();
    frame = requestAnimationFrame(step);
  }
  function start() {
    if (!frame && !paused && !document.hidden && inView)
      frame = requestAnimationFrame(step);
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousFrame = 0;
  }
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
    if (paused || !inView || document.hidden) {
      scale = targetScale;
      drawCamera();
    }
    drawVehicles();
    start();
  }
  const motionButton = root.querySelector("#motion-toggle");
  function setPaused(value) {
    paused = value;
    root.classList.toggle("motion-paused", value);
    motionButton.setAttribute("aria-pressed", String(value));
    motionButton.setAttribute(
      "aria-label",
      value ? "Animationen fortsetzen" : "Animationen pausieren",
    );
    motionButton
      .querySelector("use")
      .setAttribute("href", value ? "#i-play" : "#i-pause");
    if (value) {
      stop();
      scale = targetScale;
      drawCamera();
    } else start();
  }
  motionButton.addEventListener("click", () => setPaused(!paused));
  media.addEventListener("change", (event) => setPaused(event.matches));
  document.addEventListener("visibilitychange", () =>
    document.hidden ? stop() : start(),
  );
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
        else stop();
      },
      { rootMargin: "60px" },
    ).observe(svg);
  }
  function celebrate() {
    if (media.matches || paused) return;
    const celebration = document.createElement("div");
    celebration.className = "world-celebration";
    celebration.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 27; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti";
      const theta = (i / 27) * Math.PI * 2;
      piece.style.setProperty(
        "--piece-x",
        `${Math.cos(theta) * (80 + (i % 7) * 30)}px`,
      );
      piece.style.setProperty("--piece-y", `${Math.sin(theta) * 170 - 70}px`);
      piece.style.setProperty("--piece-spin", `${i * 57}deg`);
      piece.style.setProperty(
        "--piece-color",
        ["#db865f", "#4d7953", "#e8be61", "#88bcb3"][i % 4],
      );
      celebration.append(piece);
    }
    root.querySelector(".world").append(celebration);
    setTimeout(() => celebration.remove(), 1900);
  }
  drawCamera();
  setLevel(0);
  setPaused(paused);
  return { setLevel, celebrate };
}
