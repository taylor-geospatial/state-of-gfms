// Hero globe: where the authors of the audited papers work, one year at a time.
// A plain-canvas port of satml-leaderboard's InstitutionGlobe (React + d3-geo),
// with the orthographic projection written out so the page needs no library.
// Land is a precomputed dot grid; each institution is a marker sized by its
// papers that year, and other years show faintly. Data: assets/globe.json,
// built by scripts/build_globe_data.py. Colors come from --globe-* in styles.css.
(() => {
  const fig = document.getElementById("globe");
  if (!fig || !window.fetch) return;
  const stage = fig.querySelector(".globe-stage");
  const canvas = fig.querySelector("canvas");
  const tip = fig.querySelector(".globe-tip");
  const bar = fig.querySelector(".globe-years");
  const playBtn = fig.querySelector(".globe-play");
  const caption = fig.querySelector(".globe-caption");
  const ctx = canvas.getContext("2d");
  const quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPIN = 0.012; // degrees per ms
  const STEP_MS = 2800;
  const RAD = Math.PI / 180;
  const PLAY = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z"/></svg>';
  const PAUSE = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z"/></svg>';
  const ease = (t) => 1 - (1 - t) ** 3;

  const view = { lon: 20, lat: 22 }; // center of the visible hemisphere
  const colors = {};
  const byYear = new Map(); // year -> Map(institution index -> {inst, papers})
  const paperCounts = new Map();
  let dots = [];
  let institutions = [];
  let years = [];
  let year = 0;
  let points = [];
  let ghosts = [];
  let yearAt = 0;
  let size = 0;
  let hovering = false;
  let drag = null;
  let visible = true;
  let raf = 0;
  let last = 0;
  let timer = 0;
  let playing = false;

  function readColors() {
    const s = getComputedStyle(fig);
    for (const k of ["sphere", "hi", "shade", "line", "land", "now", "then"]) {
      colors[k] = s.getPropertyValue(`--globe-${k}`).trim();
    }
  }

  // Orthographic projection around `view`: [x, y, cos of angular distance to center].
  function projector() {
    const r = size / 2 - 6;
    const c = size / 2;
    const s0 = Math.sin(view.lat * RAD);
    const c0 = Math.cos(view.lat * RAD);
    return {
      r,
      c,
      at(lon, lat) {
        const l = (lon - view.lon) * RAD;
        const p = lat * RAD;
        const cp = Math.cos(p);
        const sp = Math.sin(p);
        const cl = Math.cos(l);
        return [c + r * cp * Math.sin(l), c - r * (c0 * sp - s0 * cp * cl), s0 * sp + c0 * cp * cl];
      },
    };
  }

  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
  }

  function polyline(P, at, from, to) {
    let pen = false;
    for (let t = from; t <= to; t += 2.5) {
      const [x, y, k] = P.at(...at(t));
      if (k <= 0) {
        pen = false;
        continue;
      }
      if (pen) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
      pen = true;
    }
  }

  function marker(P, inst, papers, alpha, color, grow) {
    const [x, y, k] = P.at(inst.lon, inst.lat);
    if (k < 0.04) return;
    const rad = (2.6 + Math.sqrt(papers) * 1.9) * (P.r / 200) * 1.25 * grow;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * 0.28;
    circle(x, y, rad * 2.1);
    ctx.fill();
    ctx.globalAlpha = alpha;
    circle(x, y, rad);
    ctx.fill();
  }

  function draw(now) {
    if (!size) return;
    const P = projector();
    const { r, c } = P;
    ctx.clearRect(0, 0, size, size);

    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.sphere;
    circle(c, c, r);
    ctx.fill();
    const g = ctx.createRadialGradient(size * 0.38, size * 0.3, r * 0.1, c, c, r);
    g.addColorStop(0, colors.hi);
    g.addColorStop(1, colors.shade);
    ctx.fillStyle = g;
    circle(c, c, r);
    ctx.fill();

    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let lon = -180; lon < 180; lon += 10) polyline(P, (t) => [lon, t], -80, 80);
    for (let lat = -80; lat <= 80; lat += 10) polyline(P, (t) => [t, lat], -180, 180);
    ctx.stroke();

    // Land dots, fading toward the limb.
    ctx.fillStyle = colors.land;
    const d = Math.max(1.5, r / 140);
    for (let i = 0; i < dots.length; i += 2) {
      const [x, y, k] = P.at(dots[i], dots[i + 1]);
      if (k < 0.02) continue;
      ctx.globalAlpha = 0.14 + 0.46 * k;
      ctx.fillRect(x - d / 2, y - d / 2, d, d);
    }

    const grow = quiet ? 1 : ease(Math.min(1, (now - yearAt) / 700));
    for (const inst of ghosts) marker(P, inst, 1, 0.5, colors.then, 0.55);
    for (const pt of points) marker(P, pt.inst, pt.papers, 0.95, colors.now, grow);

    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    circle(c, c, r);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function tick(now) {
    if (!visible) {
      raf = 0;
      return;
    }
    const dt = Math.min(now - last, 64);
    last = now;
    if (!drag && !hovering) view.lon -= dt * SPIN;
    draw(now);
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (quiet) draw(performance.now());
    else if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = stage.clientWidth;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(performance.now());
  }

  function setYear(y) {
    year = y;
    const here = byYear.get(y);
    points = [...here.values()].sort((a, b) => b.papers - a.papers);
    const seen = new Set();
    for (const [other, pts] of byYear) {
      if (other === y) continue;
      for (const [id, p] of pts) if (!here.has(id)) seen.add(p.inst);
    }
    ghosts = [...seen];
    yearAt = performance.now();
    for (const b of bar.querySelectorAll("[data-year]")) b.setAttribute("aria-pressed", String(Number(b.dataset.year) === y));
    const n = paperCounts.get(y);
    caption.textContent = `${points.length} institutions · ${n} paper${n === 1 ? "" : "s"} in ${y}`;
    canvas.setAttribute(
      "aria-label",
      `Globe of the ${points.length} institutions whose authors published geospatial foundation model papers in ${y}.`,
    );
    if (quiet) draw(yearAt);
  }

  function setPlaying(on) {
    playing = on;
    window.clearInterval(timer);
    playBtn.innerHTML = on ? PAUSE : PLAY;
    playBtn.setAttribute("aria-label", on ? "Pause the year cycle" : "Play through the years");
    if (!on) return;
    timer = window.setInterval(() => {
      if (hovering || drag) return;
      setYear(years[(years.indexOf(year) + 1) % years.length]);
    }, STEP_MS);
  }

  function nearest(px, py) {
    const P = projector();
    let best = null;
    for (const pt of points) {
      const [x, y, k] = P.at(pt.inst.lon, pt.inst.lat);
      if (k < 0.04) continue;
      const dist = Math.hypot(x - px, y - py);
      if (dist < 14 && (!best || dist < best.dist)) best = { dist, x, y, pt };
    }
    return best;
  }

  function showTip(hit) {
    if (!hit) {
      tip.hidden = true;
      return;
    }
    const { inst, papers } = hit.pt;
    const name = document.createElement("b");
    name.textContent = inst.name;
    const sub = document.createElement("span");
    sub.textContent = `${inst.city}, ${inst.country} · ${papers} paper${papers === 1 ? "" : "s"}`;
    tip.replaceChildren(name, sub);
    tip.style.left = `${hit.x}px`;
    tip.style.top = `${hit.y}px`;
    tip.hidden = false;
  }

  function bind() {
    stage.addEventListener("pointerenter", () => {
      hovering = true;
    });
    stage.addEventListener("pointerleave", () => {
      hovering = false;
      drag = null;
      tip.hidden = true;
    });
    stage.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, y: e.clientY };
      stage.setPointerCapture(e.pointerId);
    });
    const end = () => {
      drag = null;
    };
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);
    stage.addEventListener("pointermove", (e) => {
      if (drag) {
        view.lon -= (e.clientX - drag.x) * 0.45;
        view.lat = Math.max(-70, Math.min(70, view.lat + (e.clientY - drag.y) * 0.45));
        drag = { x: e.clientX, y: e.clientY };
        tip.hidden = true;
      } else {
        const box = stage.getBoundingClientRect();
        showTip(nearest(e.clientX - box.left, e.clientY - box.top));
      }
      if (quiet) draw(performance.now());
    });
    playBtn.addEventListener("click", () => setPlaying(!playing));
    new ResizeObserver(resize).observe(stage);
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
    }).observe(stage);
  }

  function init(data) {
    dots = data.land.map((v) => v / 10);
    institutions = data.institutions.map(([name, country, lat, lon, city]) => ({ name, country, lat, lon, city }));
    for (const [y, ids] of data.papers) {
      paperCounts.set(y, (paperCounts.get(y) ?? 0) + 1);
      const pts = byYear.get(y) ?? new Map();
      byYear.set(y, pts);
      // A paper with several authors at one institution counts once.
      for (const id of new Set(ids)) {
        const p = pts.get(id) ?? { inst: institutions[id], papers: 0 };
        p.papers += 1;
        pts.set(id, p);
      }
    }
    years = [...byYear.keys()].sort((a, b) => a - b);
    for (const y of years) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.year = String(y);
      b.textContent = String(y);
      b.addEventListener("click", () => {
        setYear(y);
        setPlaying(false);
      });
      bar.append(b);
    }
    readColors();
    bind();
    resize();
    setYear(quiet ? years[years.length - 1] : years[0]);
    setPlaying(!quiet);
    fig.classList.add("ready");
    start();
  }

  fetch("assets/globe.json")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then(init)
    .catch(() => {
      fig.hidden = true;
    });
})();
