(function () {
  "use strict";

  const canvas = document.getElementById("playfield");
  const shell = document.getElementById("game-shell");
  const finishPanel = document.getElementById("finish-panel");
  const finishMessage = document.getElementById("finish-message");
  const againButton = document.getElementById("again-button");

  if (!canvas || !shell || !finishPanel || !finishMessage || !againButton) {
    return;
  }

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    return;
  }

  const TAP_GOAL = 11;
  const MAX_PARTICLES = 280;
  const MAX_DPR = 2.5;
  const TAP_EFFECT_SCALE = 1.7;
  const FINISH_EFFECT_SCALE = 2.3;
  const COMPLETE_TAP_EFFECT_SCALE = 1.45;
  const STAGE_SPARKLE_TAP = 5;
  const STAGE_SKY_TAP = 8;
  const MAX_KEEPSAKES = 42;
  const MAX_STAGE_MARKS = 34;
  const COLORS = [
    "#fff2a8",
    "#ffd1dc",
    "#b9e8ff",
    "#c8f7d0",
    "#e3d4ff",
    "#ffc89f",
    "#f8f0ff",
    "#b7f3ef"
  ];
  const FINISH_WORDS = ["できたね", "ぱちぱち", "きらきら", "すてき", "やったね", "ぴかぴか", "ふわふわ", "みえたね"];
  const FINISH_PATTERNS = [
    [
      { delay: 0, xRatio: 0.5, yRatio: 0.22, scale: 1 },
      { delay: 260, xRatio: 0.28, yRatio: 0.32, scale: 0.9 },
      { delay: 540, xRatio: 0.72, yRatio: 0.32, scale: 0.9 },
      { delay: 820, xRatio: 0.22, yRatio: 0.46, scale: 0.78 },
      { delay: 1100, xRatio: 0.78, yRatio: 0.46, scale: 0.78 },
      { delay: 1380, xRatio: 0.5, yRatio: 0.5, scale: 0.78 },
      { delay: 1700, xRatio: 0.5, yRatio: 0.32, scale: 1.4, finale: true }
    ],
    [
      { delay: 0, xRatio: 0.22, yRatio: 0.62, scale: 0.78 },
      { delay: 240, xRatio: 0.78, yRatio: 0.62, scale: 0.78 },
      { delay: 520, xRatio: 0.36, yRatio: 0.5, scale: 0.9 },
      { delay: 820, xRatio: 0.64, yRatio: 0.5, scale: 0.9 },
      { delay: 1120, xRatio: 0.5, yRatio: 0.36, scale: 1 },
      { delay: 1420, xRatio: 0.28, yRatio: 0.28, scale: 0.78 },
      { delay: 1700, xRatio: 0.5, yRatio: 0.3, scale: 1.4, finale: true }
    ],
    [
      { delay: 0, xRatio: 0.5, yRatio: 0.36, scale: 0.9 },
      { delay: 200, xRatio: 0.32, yRatio: 0.32, scale: 0.78 },
      { delay: 200, xRatio: 0.68, yRatio: 0.32, scale: 0.78 },
      { delay: 600, xRatio: 0.18, yRatio: 0.4, scale: 0.78 },
      { delay: 600, xRatio: 0.82, yRatio: 0.4, scale: 0.78 },
      { delay: 1100, xRatio: 0.4, yRatio: 0.46, scale: 0.9 },
      { delay: 1100, xRatio: 0.6, yRatio: 0.46, scale: 0.9 },
      { delay: 1700, xRatio: 0.5, yRatio: 0.3, scale: 1.4, finale: true }
    ]
  ];

  const state = {
    width: 1,
    height: 1,
    dpr: 1,
    particles: [],
    ambient: [],
    keepsakes: [],
    stageMarks: [],
    taps: 0,
    stage: 0,
    complete: false,
    lastTime: performance.now(),
    stageEnteredAt: { 1: 0, 2: 0, 3: 0 },
    skyTheme: null
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function colorWithAlpha(color, alpha) {
    const hex = color.replace("#", "");
    if (hex.length !== 6) {
      return color;
    }

    const value = parseInt(hex, 16);
    if (Number.isNaN(value)) {
      return color;
    }

    return "rgba(" +
      ((value >> 16) & 255) + ", " +
      ((value >> 8) & 255) + ", " +
      (value & 255) + ", " +
      alpha +
      ")";
  }

  function softenedScale(scale, amount) {
    return 1 + (scale - 1) * amount;
  }

  function toRatio(value, max) {
    return clamp(value / Math.max(1, max), 0, 1);
  }

  function pointFromRatio(mark) {
    return {
      x: mark.xRatio * state.width,
      y: mark.yRatio * state.height
    };
  }

  function createSkyTheme() {
    const moonSpots = [
      { x: 0.78, y: 0.18 },
      { x: 0.18, y: 0.16 },
      { x: 0.66, y: 0.12 },
      { x: 0.32, y: 0.22 }
    ];
    const cloudLayouts = [
      [
        { x: 0.2, y: 0.78, rx: 0.16, ry: 0.035 },
        { x: 0.3, y: 0.76, rx: 0.12, ry: 0.03 },
        { x: 0.72, y: 0.72, rx: 0.15, ry: 0.032 },
        { x: 0.82, y: 0.7, rx: 0.12, ry: 0.03 }
      ],
      [
        { x: 0.15, y: 0.74, rx: 0.13, ry: 0.03 },
        { x: 0.5, y: 0.82, rx: 0.18, ry: 0.04 },
        { x: 0.85, y: 0.76, rx: 0.14, ry: 0.032 }
      ],
      [
        { x: 0.6, y: 0.76, rx: 0.16, ry: 0.034 },
        { x: 0.72, y: 0.78, rx: 0.13, ry: 0.03 },
        { x: 0.88, y: 0.74, rx: 0.12, ry: 0.028 }
      ]
    ];

    return {
      moon: pick(moonSpots),
      clouds: pick(cloudLayouts)
    };
  }

  function resizeCanvas() {
    const rect = shell.getBoundingClientRect();
    state.width = Math.max(1, Math.round(rect.width));
    state.height = Math.max(1, Math.round(rect.height));
    state.dpr = clamp(window.devicePixelRatio || 1, 1, MAX_DPR);

    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    canvas.style.width = state.width + "px";
    canvas.style.height = state.height + "px";
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    createAmbientLights();
  }

  function createAmbientLights() {
    const count = clamp(Math.floor((state.width * state.height) / 36000), 12, 36);
    const palette = ["#fff8d2", "#cfe6ff", "#ffe0c8"];
    state.ambient = Array.from({ length: count }, function (_, index) {
      return {
        x: randomBetween(12, state.width - 12),
        y: randomBetween(18, state.height * 0.76),
        size: randomBetween(1.3, 3.2),
        alpha: randomBetween(0.16, 0.36),
        drift: randomBetween(0.2, 0.65),
        phase: index * 0.7 + Math.random() * 4,
        color: palette[index % palette.length]
      };
    });
  }

  function getPointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);
    return {
      x: clamp((x / Math.max(1, rect.width)) * state.width, 0, state.width),
      y: clamp((y / Math.max(1, rect.height)) * state.height, 0, state.height)
    };
  }

  function addParticle(particle) {
    state.particles.push(particle);
  }

  function enforceParticleLimit() {
    if (state.particles.length > MAX_PARTICLES) {
      state.particles.splice(0, state.particles.length - MAX_PARTICLES);
    }
  }

  function trimDecorations() {
    if (state.keepsakes.length > MAX_KEEPSAKES) {
      state.keepsakes.splice(0, state.keepsakes.length - MAX_KEEPSAKES);
    }
    if (state.stageMarks.length > MAX_STAGE_MARKS) {
      state.stageMarks.splice(0, state.stageMarks.length - MAX_STAGE_MARKS);
    }
  }

  function createDecoration(x, y, overrides) {
    return Object.assign({
      xRatio: toRatio(x, state.width),
      yRatio: toRatio(y, state.height),
      type: pick(["star", "sparkle", "flower", "heart"]),
      size: randomBetween(5, 10),
      alpha: randomBetween(0.4, 0.66),
      color: pick(["#fff2a8", "#f8f0ff", "#b9e8ff", "#ffd1dc", "#c8f7d0"]),
      rotation: randomBetween(0, Math.PI * 2),
      phase: randomBetween(0, Math.PI * 2),
      drift: randomBetween(1.4, 3.6)
    }, overrides);
  }

  function addTapKeepsake(x, y) {
    const scale = state.stage >= 2 ? 1.12 : 1;
    state.keepsakes.push(createDecoration(x, y, {
      type: pick(["star", "sparkle", "flower", "heart"]),
      size: randomBetween(5.5, 10.5) * scale,
      alpha: randomBetween(0.34, 0.54)
    }));
    trimDecorations();
  }

  function addStageMark(xRatio, yRatio, overrides) {
    state.stageMarks.push(createDecoration(xRatio * state.width, yRatio * state.height, Object.assign({
      xRatio,
      yRatio,
      type: pick(["star", "sparkle"]),
      size: randomBetween(5, 12),
      alpha: randomBetween(0.32, 0.58)
    }, overrides)));
    trimDecorations();
  }

  function scatterStageMarks(count, yMin, yMax, sizeScale) {
    for (let i = 0; i < count; i += 1) {
      addStageMark(randomBetween(0.08, 0.92), randomBetween(yMin, yMax), {
        size: randomBetween(4.5, 11) * sizeScale,
        type: pick(["star", "sparkle"]),
        alpha: randomBetween(0.32, 0.6),
        color: pick(["#fff2a8", "#f8f0ff", "#b9e8ff", "#e3d4ff"])
      });
    }
  }

  function setProgressStage(nextStage) {
    if (nextStage <= state.stage) {
      return;
    }

    state.stage = nextStage;
    state.stageEnteredAt[nextStage] = performance.now();
    shell.classList.toggle("is-growing", state.stage >= 1);
    shell.classList.toggle("is-sky-lit", state.stage >= 2);

    if (state.stage === 1) {
      scatterStageMarks(11, 0.14, 0.7, 1.15);
      spawnTwinkles(state.width * 0.5, state.height * 0.42, 1.4);
      spawnGlowScatter(state.width * 0.5, state.height * 0.42, 1.2);
    } else if (state.stage === 2) {
      scatterStageMarks(16, 0.1, 0.62, 1.3);
      spawnGlowScatter(state.width * 0.5, state.height * 0.5, 1.4);
      spawnStars(state.width * 0.72, state.height * 0.28, 1.4);
    }
    enforceParticleLimit();
  }

  function updateProgressStage() {
    if (state.taps >= STAGE_SKY_TAP) {
      setProgressStage(2);
    } else if (state.taps >= STAGE_SPARKLE_TAP) {
      setProgressStage(1);
    }
  }

  function baseParticle(x, y, overrides) {
    return Object.assign({
      x,
      y,
      vx: 0,
      vy: 0,
      gravity: 0,
      age: 0,
      duration: randomBetween(850, 1400),
      size: randomBetween(5, 12),
      color: pick(COLORS),
      type: "dot",
      rotation: randomBetween(0, Math.PI * 2),
      spin: randomBetween(-0.03, 0.03)
    }, overrides);
  }

  function spawnFireworkRise(x, y, scale = 1) {
    const count = Math.floor(randomBetween(12, 17));
    const speedScale = Math.min(scale, 1.9);
    for (let i = 0; i < count; i += 1) {
      setTimeout(function () {
        addParticle(baseParticle(x + randomBetween(-1.8, 1.8) * scale, y, {
          vx: randomBetween(-0.05, 0.05) * scale,
          vy: -4.6 * speedScale,
          gravity: 0.022,
          type: "sparkle",
          size: randomBetween(4, 7) * scale,
          duration: randomBetween(440, 600),
          color: pick(["#fff7dc", "#fff2a8", "#fffdf3"]),
          spin: randomBetween(-0.012, 0.012)
        }));
        enforceParticleLimit();
      }, i * 45);
    }
  }

  function spawnFirework(x, y, scale = 1) {
    addParticle(baseParticle(x, y, {
      vx: 0,
      vy: 0,
      gravity: 0,
      type: "sparkle",
      size: randomBetween(14, 20) * softenedScale(scale, 0.6),
      duration: 360,
      color: "#fffdf3",
      spin: randomBetween(-0.02, 0.02)
    }));

    const count = Math.floor(randomBetween(16, 22) * softenedScale(scale, 0.45));
    const color = pick(COLORS);
    const sizeScale = softenedScale(scale, 0.7);
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + randomBetween(-0.12, 0.12);
      const speed = randomBetween(0.9, 2.1) * scale;
      addParticle(baseParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.012,
        duration: randomBetween(920, 1450) * softenedScale(scale, 0.35),
        size: randomBetween(7, 13) * sizeScale,
        color,
        type: Math.random() > 0.45 ? "sparkle" : "dot"
      }));
    }
  }

  function launchEffect(x, y, scale, burstFn, onBurst) {
    const startY = Math.min(y + 240, state.height - 20);
    spawnFireworkRise(x, startY, scale);
    setTimeout(function () {
      burstFn(x, y, scale);
      if (typeof onBurst === "function") {
        onBurst();
      }
      enforceParticleLimit();
    }, 760);
  }

  function launchFirework(x, y, scale = 1, onBurst) {
    launchEffect(x, y, scale, spawnFirework, onBurst);
  }

  function spawnStars(x, y, scale = 1) {
    addParticle(baseParticle(x, y, {
      type: "star",
      size: randomBetween(18, 26) * softenedScale(scale, 0.65),
      duration: 1180 * softenedScale(scale, 0.4),
      color: pick(["#fff2a8", "#f8f0ff", "#b9e8ff"]),
      spin: randomBetween(-0.018, 0.018)
    }));

    const count = Math.floor(12 * softenedScale(scale, 0.3));
    const surroundSizeScale = softenedScale(scale, 0.75);
    for (let i = 0; i < count; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const distance = randomBetween(20, 78) * scale;
      const drift = softenedScale(scale, 0.35);
      addParticle(baseParticle(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, {
        vx: Math.cos(angle) * randomBetween(0.12, 0.55) * drift,
        vy: Math.sin(angle) * randomBetween(0.12, 0.55) * drift - 0.18,
        type: Math.random() > 0.55 ? "star" : "dot",
        size: randomBetween(7, 13) * surroundSizeScale,
        duration: randomBetween(950, 1450) * softenedScale(scale, 0.35)
      }));
    }
  }

  function spawnBubbles(x, y, scale = 1) {
    addParticle(baseParticle(x, y, {
      vx: 0,
      vy: 0,
      gravity: 0,
      type: "sparkle",
      size: randomBetween(11, 15) * softenedScale(scale, 0.6),
      duration: 320,
      color: "#fffdf3",
      spin: randomBetween(-0.02, 0.02)
    }));

    const count = Math.ceil(8 * softenedScale(scale, 0.22));
    for (let i = 0; i < count; i += 1) {
      const bubbleX = x + randomBetween(-30, 30) * scale;
      const bubbleY = y + randomBetween(-18, 18) * scale;
      addParticle(baseParticle(bubbleX, bubbleY, {
        vx: randomBetween(-0.35, 0.35),
        vy: randomBetween(-0.95, -0.25),
        type: "bubble",
        size: randomBetween(12, 24) * scale,
        duration: randomBetween(1300, 1900) * softenedScale(scale, 0.18),
        color: pick(["#b9e8ff", "#f8f0ff", "#b7f3ef", "#ffd1dc"])
      }));
      addParticle(baseParticle(bubbleX + randomBetween(-8, 8) * scale, bubbleY + randomBetween(-8, 8) * scale, {
        vx: randomBetween(-0.28, 0.28),
        vy: randomBetween(-0.75, -0.2),
        type: "sparkle",
        size: randomBetween(5, 9) * scale,
        duration: randomBetween(900, 1350),
        color: pick(["#fff2a8", "#f8f0ff", "#b9e8ff"])
      }));
    }
  }

  function spawnFlower(x, y, scale = 1) {
    const petals = Math.floor(randomBetween(7, 10) * softenedScale(scale, 0.2));
    const color = pick(["#ffd1dc", "#ffc89f", "#e3d4ff", "#c8f7d0"]);
    const spread = softenedScale(scale, 0.45);
    for (let i = 0; i < petals; i += 1) {
      const angle = (Math.PI * 2 * i) / petals;
      addParticle(baseParticle(x, y, {
        vx: Math.cos(angle) * randomBetween(0.35, 0.9) * spread,
        vy: Math.sin(angle) * randomBetween(0.35, 0.9) * spread - 0.12,
        type: "petal",
        size: randomBetween(17, 25) * scale,
        duration: randomBetween(1100, 1600) * softenedScale(scale, 0.3),
        color,
        rotation: angle
      }));
    }

    addParticle(baseParticle(x, y, {
      type: "sparkle",
      size: randomBetween(11, 16) * scale,
      duration: 980 * softenedScale(scale, 0.3),
      color: "#fff2a8"
    }));
  }

  function spawnTwinkles(x, y, scale = 1) {
    const count = Math.floor(18 * softenedScale(scale, 0.25));
    const spread = softenedScale(scale, 0.35);
    for (let i = 0; i < count; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(0.25, 1.25) * spread;
      addParticle(baseParticle(x + randomBetween(-18, 18) * scale, y + randomBetween(-18, 18) * scale, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.12,
        type: "sparkle",
        size: randomBetween(9, 17) * scale,
        duration: randomBetween(780, 1200) * softenedScale(scale, 0.25),
        color: pick(["#fff2a8", "#f8f0ff", "#b9e8ff"])
      }));
    }
  }

  function spawnGlowScatter(x, y, scale = 1) {
    const count = Math.floor(18 * softenedScale(scale, 0.18));
    const spread = softenedScale(scale, 0.42);
    for (let i = 0; i < count; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(0.18, 0.95) * spread;
      addParticle(baseParticle(x + randomBetween(-26, 26) * scale, y + randomBetween(-22, 22) * scale, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - randomBetween(0.16, 0.38),
        type: pick(["sparkle", "star"]),
        size: randomBetween(7, 17) * scale,
        duration: randomBetween(900, 1450) * softenedScale(scale, 0.22),
        color: pick(["#ffd1dc", "#b9e8ff", "#c8f7d0", "#e3d4ff"])
      }));
    }
  }

  function spawnLightDots(x, y, scale = 1) {
    const spread = softenedScale(scale, 0.4);
    const groups = [
      { count: 16, type: "sparkle", sizeMin: 6, sizeMax: 11, colors: ["#fff2a8", "#f8f0ff", "#b9e8ff"] },
      { count: 8, type: "star", sizeMin: 6, sizeMax: 11, colors: ["#fff2a8", "#fffdf3", "#b9e8ff"] },
      { count: 3, type: "dot", sizeMin: 5, sizeMax: 8.5, colors: ["#fff2a8", "#ffd1dc"] }
    ];

    groups.forEach(function (group) {
      for (let i = 0; i < group.count; i += 1) {
        const angle = randomBetween(0, Math.PI * 2);
        const speed = randomBetween(0.25, 1.45) * spread;
        addParticle(baseParticle(x, y, {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.35,
          gravity: 0.01,
          type: group.type,
          size: randomBetween(group.sizeMin, group.sizeMax) * scale,
          duration: randomBetween(850, 1350) * softenedScale(scale, 0.3),
          color: pick(group.colors)
        }));
      }
    });
  }

  function spawnShootingStar(x, y, scale = 1) {
    const direction = Math.random() > 0.5 ? 1 : -1;
    addParticle(baseParticle(x, y, {
      vx: direction * 2 * scale,
      vy: 1.4 * scale,
      gravity: 0,
      type: "sparkle",
      size: randomBetween(13, 18) * scale,
      duration: 760,
      color: "#fffdf3",
      spin: randomBetween(-0.012, 0.012)
    }));

    for (let i = 0; i < 6; i += 1) {
      setTimeout(function () {
        addParticle(baseParticle(
          x - direction * randomBetween(8 + i * 6, 13 + i * 8) * scale,
          y - randomBetween(5 + i * 4, 9 + i * 5) * scale,
          {
            vx: direction * randomBetween(1.05, 1.65) * scale,
            vy: randomBetween(0.64, 1.08) * scale,
            gravity: 0,
            type: "sparkle",
            size: randomBetween(8, 13) * scale * (1 - i * 0.08),
            duration: randomBetween(420, 540),
            color: pick(["#fff2a8", "#fff7dc", "#fffdf3"]),
            spin: randomBetween(-0.012, 0.012)
          }
        ));
        enforceParticleLimit();
      }, i * 28);
    }
  }

  function spawnConfetti(x, y, scale = 1) {
    addParticle(baseParticle(x, y, {
      vx: 0,
      vy: 0,
      gravity: 0,
      type: "sparkle",
      size: randomBetween(15, 21) * softenedScale(scale, 0.6),
      duration: 320,
      color: "#fffdf3",
      spin: randomBetween(-0.02, 0.02)
    }));

    const colors = [];
    while (colors.length < 3) {
      const color = pick(COLORS);
      if (!colors.includes(color)) {
        colors.push(color);
      }
    }

    const stripCount = Math.floor(randomBetween(18, 24));
    for (let i = 0; i < stripCount; i += 1) {
      const angle = (Math.PI * 2 * i) / stripCount + randomBetween(-0.18, 0.18);
      const speed = randomBetween(1.1, 2.5) * scale;
      addParticle(baseParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.4,
        gravity: 0.022,
        type: "confetti",
        size: randomBetween(11, 17) * scale,
        duration: randomBetween(1400, 1900),
        rotation: randomBetween(0, Math.PI * 2),
        spin: (Math.random() > 0.5 ? 1 : -1) * randomBetween(0.07, 0.11),
        color: pick(colors)
      }));
    }

    const sparkleCount = 6;
    for (let i = 0; i < sparkleCount; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(0.6, 1.4) * scale;
      addParticle(baseParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.25,
        gravity: 0.01,
        type: "sparkle",
        size: randomBetween(7, 11) * scale,
        duration: randomBetween(800, 1100),
        color: pick(["#fff2a8", "#f8f0ff", "#fffdf3"])
      }));
    }
  }

  function spawnRipple(x, y, scale = 1) {
    addParticle(baseParticle(x, y, {
      vx: 0,
      vy: 0,
      gravity: 0,
      type: "sparkle",
      size: randomBetween(13, 17) * softenedScale(scale, 0.6),
      duration: 320,
      color: "#fffdf3",
      spin: randomBetween(-0.02, 0.02)
    }));

    const ringCount = 3;
    for (let i = 0; i < ringCount; i += 1) {
      setTimeout(function () {
        addParticle(baseParticle(x, y, {
          vx: 0,
          vy: 0,
          gravity: 0,
          type: "ring",
          size: 14 * scale,
          duration: randomBetween(800, 1000),
          color: pick(["#f8f0ff", "#fff2a8", "#b9e8ff"]),
          spin: 0
        }));
        enforceParticleLimit();
      }, i * 160);
    }

    const accentCount = 8;
    for (let i = 0; i < accentCount; i += 1) {
      const angle = (Math.PI * 2 * i) / accentCount + randomBetween(-0.18, 0.18);
      const speed = randomBetween(0.55, 1.15) * scale;
      addParticle(baseParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.18,
        gravity: 0.006,
        type: pick(["sparkle", "star"]),
        size: randomBetween(7, 11) * scale,
        duration: randomBetween(750, 1050),
        color: pick(["#fff2a8", "#f8f0ff", "#b9e8ff"])
      }));
    }
  }

  function spawnHearts(x, y, scale = 1) {
    addParticle(baseParticle(x, y, {
      vx: 0,
      vy: 0,
      gravity: 0,
      type: "sparkle",
      size: randomBetween(13, 18) * softenedScale(scale, 0.6),
      duration: 320,
      color: "#fffdf3",
      spin: randomBetween(-0.02, 0.02)
    }));

    const heartCount = Math.floor(randomBetween(5, 8));
    for (let i = 0; i < heartCount; i += 1) {
      const angle = (Math.PI * 2 * i) / heartCount + randomBetween(-0.25, 0.25);
      const speed = randomBetween(0.7, 1.5) * scale;
      addParticle(baseParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.32,
        gravity: 0.008,
        type: "heart",
        size: randomBetween(14, 22) * softenedScale(scale, 0.7),
        duration: randomBetween(1200, 1600),
        spin: (Math.random() > 0.5 ? 1 : -1) * randomBetween(0.015, 0.03),
        color: pick(["#ffd1dc", "#ffc89f", "#f8f0ff"])
      }));
    }

    const sparkleCount = 10;
    for (let i = 0; i < sparkleCount; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(0.5, 1.2) * scale;
      addParticle(baseParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.2,
        gravity: 0.006,
        type: "sparkle",
        size: randomBetween(6, 10) * scale,
        duration: randomBetween(750, 1050),
        color: pick(["#fff2a8", "#f8f0ff", "#ffd1dc"])
      }));
    }
  }

  function pickWeightedVariant(variants) {
    const totalWeight = variants.reduce(function (total, variant) {
      return total + variant.weight;
    }, 0);
    let cursor = randomBetween(0, totalWeight);

    for (let i = 0; i < variants.length; i += 1) {
      cursor -= variants[i].weight;
      if (cursor <= 0) {
        return variants[i];
      }
    }

    return variants[variants.length - 1];
  }

  function spawnTapEffect(x, y) {
    const variants = [
      { fn: spawnFirework, weight: 3 },
      { fn: spawnStars, weight: 3 },
      { fn: spawnFlower, weight: 2 },
      { fn: spawnTwinkles, weight: 2 },
      { fn: spawnLightDots, weight: 2 },
      { fn: spawnGlowScatter, weight: 1 },
      { fn: spawnBubbles, weight: 1 },
      { fn: spawnShootingStar, weight: 2 },
      { fn: spawnConfetti, weight: 2 },
      { fn: spawnRipple, weight: 1 },
      { fn: spawnHearts, weight: 1 }
    ];
    const variant = pickWeightedVariant(variants);
    launchEffect(x, y, TAP_EFFECT_SCALE, variant.fn);
  }

  function showFinish() {
    if (state.complete) {
      return;
    }

    state.stageEnteredAt[3] = performance.now();
    state.complete = true;
    state.stage = 3;
    shell.classList.add("is-growing", "is-sky-lit", "is-complete");
    scatterStageMarks(18, 0.08, 0.68, 1.28);
    enforceParticleLimit();

    const launches = pick(FINISH_PATTERNS);

    launches.forEach(function (launch) {
      setTimeout(function () {
        const x = state.width * launch.xRatio;
        const y = state.height * launch.yRatio;
        launchFirework(x, y, launch.scale * FINISH_EFFECT_SCALE, launch.finale ? function () {
          spawnStars(x, y, 1.6);
          spawnGlowScatter(x, y, 1.5);
          spawnTwinkles(x, y, 1.4);
          finishMessage.textContent = pick(FINISH_WORDS);
          finishPanel.hidden = false;
          finishPanel.setAttribute("aria-hidden", "false");
        } : null);
      }, launch.delay);
    });
  }

  function resetGame() {
    state.taps = 0;
    state.stage = 0;
    state.complete = false;
    state.stageEnteredAt = { 1: 0, 2: 0, 3: 0 };
    state.particles = [];
    state.keepsakes = [];
    state.stageMarks = [];
    state.skyTheme = createSkyTheme();
    shell.classList.remove("is-growing", "is-sky-lit", "is-complete", "is-played");
    finishPanel.hidden = true;
    finishPanel.setAttribute("aria-hidden", "true");

    spawnGlowScatter(state.width * 0.5, state.height * 0.55, 1);
    enforceParticleLimit();
  }

  function handlePointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    event.preventDefault();

    const point = getPointFromEvent(event);
    if (state.taps === 0 && !state.complete) {
      shell.classList.add("is-played");
    }

    if (state.complete) {
      launchEffect(point.x, point.y, COMPLETE_TAP_EFFECT_SCALE, spawnTwinkles);
      return;
    }

    spawnTapEffect(point.x, point.y);
    state.taps += 1;
    addTapKeepsake(point.x, point.y);
    updateProgressStage();

    if (state.taps >= TAP_GOAL) {
      showFinish();
    }
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function drawStar(ctx2d, x, y, radius, rotation) {
    const points = 5;
    const inner = radius * 0.48;
    ctx2d.beginPath();
    for (let i = 0; i < points * 2; i += 1) {
      const r = i % 2 === 0 ? radius : inner;
      const angle = rotation - Math.PI / 2 + (i * Math.PI) / points;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) {
        ctx2d.moveTo(px, py);
      } else {
        ctx2d.lineTo(px, py);
      }
    }
    ctx2d.closePath();
  }

  function drawSparkle(ctx2d, x, y, radius, rotation) {
    ctx2d.save();
    ctx2d.translate(x, y);
    ctx2d.rotate(rotation);
    ctx2d.beginPath();
    ctx2d.moveTo(0, -radius);
    ctx2d.lineTo(radius * 0.3, -radius * 0.3);
    ctx2d.lineTo(radius, 0);
    ctx2d.lineTo(radius * 0.3, radius * 0.3);
    ctx2d.lineTo(0, radius);
    ctx2d.lineTo(-radius * 0.3, radius * 0.3);
    ctx2d.lineTo(-radius, 0);
    ctx2d.lineTo(-radius * 0.3, -radius * 0.3);
    ctx2d.closePath();
    ctx2d.restore();
  }

  function drawTinyFlower(ctx2d, x, y, radius, rotation) {
    ctx2d.save();
    ctx2d.translate(x, y);
    ctx2d.rotate(rotation);
    for (let i = 0; i < 5; i += 1) {
      ctx2d.rotate((Math.PI * 2) / 5);
      ctx2d.beginPath();
      ctx2d.ellipse(0, -radius * 0.55, radius * 0.26, radius * 0.55, 0, 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.beginPath();
    ctx2d.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.restore();
  }

  function drawHeart(ctx2d, x, y, radius, rotation) {
    ctx2d.save();
    ctx2d.translate(x, y);
    ctx2d.rotate(rotation);
    ctx2d.beginPath();
    ctx2d.moveTo(0, radius * 0.4);
    ctx2d.bezierCurveTo(radius * 1, -radius * 0.6, radius * 0.6, -radius * 1.1, 0, -radius * 0.4);
    ctx2d.bezierCurveTo(-radius * 0.6, -radius * 1.1, -radius * 1, -radius * 0.6, 0, radius * 0.4);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.restore();
  }

  function drawDecorationMark(mark, time, alphaBoost) {
    const point = pointFromRatio(mark);
    const drift = Math.sin(time * 0.00032 + mark.phase) * mark.drift;
    const alpha = clamp(mark.alpha + Math.sin(time * 0.0014 + mark.phase) * 0.12, 0.18, 0.78) * alphaBoost;
    const size = mark.size * (1 + Math.sin(time * 0.0009 + mark.phase) * 0.09);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = mark.color;
    ctx.strokeStyle = mark.color;
    ctx.lineWidth = Math.max(1.2, size * 0.12);

    if (mark.type === "star") {
      drawStar(ctx, point.x + drift, point.y, size, mark.rotation);
      ctx.fill();
    } else if (mark.type === "sparkle") {
      drawSparkle(ctx, point.x + drift, point.y, size, mark.rotation);
      ctx.fill();
    } else if (mark.type === "flower") {
      drawTinyFlower(ctx, point.x + drift, point.y, size, mark.rotation);
    } else if (mark.type === "heart") {
      drawHeart(ctx, point.x + drift, point.y, size, mark.rotation);
    } else {
      ctx.beginPath();
      ctx.arc(point.x + drift, point.y, size * 0.52, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawDecorations(time) {
    ctx.save();
    state.stageMarks.forEach(function (mark) {
      drawDecorationMark(mark, time, state.complete ? 1.32 : 1);
    });
    state.keepsakes.forEach(function (mark) {
      drawDecorationMark(mark, time, state.complete ? 1.22 : 1);
    });
    ctx.restore();
  }

  function drawStageSky(time) {
    if (state.stage < 2) {
      return;
    }

    const stageFade = state.stage >= 3 ? 1 : clamp((time - state.stageEnteredAt[2]) / 800, 0, 1);
    const stageAlpha = (state.complete ? 0.95 : 0.72) * stageFade;
    if (!state.skyTheme) {
      state.skyTheme = createSkyTheme();
    }
    const moonX = state.width * state.skyTheme.moon.x;
    const moonY = state.height * state.skyTheme.moon.y;
    const moonRadius = clamp(state.width * 0.055, 22, 42);
    const bob = Math.sin(time * 0.00025) * 1.5;

    ctx.save();
    ctx.globalAlpha = stageAlpha * 0.72;
    ctx.fillStyle = "#fff7dc";
    ctx.beginPath();
    ctx.arc(moonX, moonY + bob, moonRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fffdf3";
    state.skyTheme.clouds.forEach(function (cloud, index) {
      ctx.globalAlpha = stageAlpha * (index < 2 ? 0.18 : 0.16);
      ctx.beginPath();
      ctx.ellipse(
        state.width * cloud.x,
        state.height * cloud.y,
        state.width * cloud.rx,
        state.height * cloud.ry,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
    ctx.restore();
  }

  function drawParticle(particle) {
    const t = clamp(particle.age / particle.duration, 0, 1);
    const alpha = Math.pow(1 - t, 1.2) * 0.95;
    const scale = 0.55 + easeOutCubic(Math.min(1, t * 2.4)) * 0.85;
    const size = particle.size * scale;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.strokeStyle = particle.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (particle.type === "bubble") {
      ctx.globalAlpha = alpha * 0.5;
      ctx.lineWidth = Math.max(1.5, size * 0.07);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size, Math.PI * 0.18, Math.PI * 1.46);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.36;
      ctx.beginPath();
      ctx.arc(particle.x - size * 0.28, particle.y - size * 0.28, size * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.48;
      drawSparkle(ctx, particle.x + size * 0.36, particle.y - size * 0.26, size * 0.22, particle.rotation);
      ctx.fill();
    } else if (particle.type === "star") {
      drawStar(ctx, particle.x, particle.y, size, particle.rotation);
      ctx.fill();
    } else if (particle.type === "sparkle") {
      drawSparkle(ctx, particle.x, particle.y, size, particle.rotation);
      ctx.fill();
    } else if (particle.type === "petal") {
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.55, size, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (particle.type === "confetti") {
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillRect(-size * 0.28, -size * 0.55, size * 0.56, size * 1.1);
    } else if (particle.type === "ring") {
      const expanded = size * (1 + t * 5);
      ctx.globalAlpha = alpha * 0.78;
      ctx.lineWidth = Math.max(2.2, expanded * 0.07);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, expanded, 0, Math.PI * 2);
      ctx.stroke();
    } else if (particle.type === "heart") {
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.beginPath();
      const r = size * 0.5;
      ctx.moveTo(0, r * 0.4);
      ctx.bezierCurveTo(r * 1.0, -r * 0.6, r * 0.6, -r * 1.1, 0, -r * 0.4);
      ctx.bezierCurveTo(-r * 0.6, -r * 1.1, -r * 1.0, -r * 0.6, 0, r * 0.4);
      ctx.closePath();
      ctx.fill();
    } else if (particle.type === "dot") {
      const glowRadius = size * 1.6;
      const crossHalf = (size * 1.6) / 2;
      const glow = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        glowRadius
      );

      glow.addColorStop(0, colorWithAlpha(particle.color, 1));
      glow.addColorStop(0.55 / 1.6, colorWithAlpha(particle.color, 0.6));
      glow.addColorStop(1, colorWithAlpha(particle.color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = particle.color;
      ctx.lineWidth = Math.max(1, size * 0.18);
      ctx.beginPath();
      ctx.moveTo(particle.x - crossHalf, particle.y);
      ctx.lineTo(particle.x + crossHalf, particle.y);
      ctx.moveTo(particle.x, particle.y - crossHalf);
      ctx.lineTo(particle.x, particle.y + crossHalf);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawAmbient(time) {
    ctx.save();
    state.ambient.forEach(function (light) {
      const bob = Math.sin(time * 0.00045 * light.drift + light.phase);
      ctx.globalAlpha = light.alpha + bob * 0.05;
      ctx.fillStyle = light.color || "#fff8d2";
      ctx.beginPath();
      ctx.arc(light.x + bob * 4, light.y, light.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function updateParticles(dt) {
    const step = dt / 16.67;
    state.particles = state.particles.filter(function (particle) {
      particle.age += dt;
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      particle.vy += particle.gravity * step;
      particle.rotation += particle.spin * step;
      return particle.age < particle.duration;
    });
  }

  function animate(now) {
    const dt = clamp(now - state.lastTime, 0, 48);
    state.lastTime = now;

    updateParticles(dt);
    ctx.clearRect(0, 0, state.width, state.height);
    drawStageSky(now);
    drawAmbient(now);
    drawDecorations(now);
    state.particles.forEach(drawParticle);

    window.requestAnimationFrame(animate);
  }

  canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
  againButton.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    resetGame();
  });

  window.addEventListener("resize", resizeCanvas);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resizeCanvas);
  }

  state.skyTheme = createSkyTheme();
  resizeCanvas();
  window.requestAnimationFrame(animate);
}());
