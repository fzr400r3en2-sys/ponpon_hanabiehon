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
  const TAP_EFFECT_SCALE = 1.35;
  const FINISH_EFFECT_SCALE = 1.8;
  const COMPLETE_TAP_EFFECT_SCALE = 1.18;
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
  const FINISH_WORDS = ["できたね", "ぱちぱち", "きらきら"];

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
    stageEnteredAt: { 1: 0, 2: 0, 3: 0 }
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
    state.ambient = Array.from({ length: count }, function (_, index) {
      return {
        x: randomBetween(12, state.width - 12),
        y: randomBetween(18, state.height * 0.76),
        size: randomBetween(1.3, 3.2),
        alpha: randomBetween(0.16, 0.36),
        drift: randomBetween(0.2, 0.65),
        phase: index * 0.7 + Math.random() * 4
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
      type: pick(["star", "sparkle", "flower"]),
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
      type: pick(["star", "sparkle", "flower"]),
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
      scatterStageMarks(9, 0.14, 0.7, 1);
      spawnTwinkles(state.width * 0.5, state.height * 0.42, 1.05);
    } else if (state.stage === 2) {
      scatterStageMarks(14, 0.1, 0.62, 1.15);
      spawnGlowScatter(state.width * 0.5, state.height * 0.5, 1.08);
      spawnStars(state.width * 0.72, state.height * 0.28, 1.05);
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
    const count = Math.floor(randomBetween(4, 7));
    for (let i = 0; i < count; i += 1) {
      setTimeout(function () {
        addParticle(baseParticle(x + randomBetween(-1.2, 1.2) * scale, y, {
          vx: randomBetween(-0.035, 0.035) * scale,
          vy: -2.6 * scale,
          gravity: 0,
          type: "sparkle",
          size: randomBetween(3, 5) * scale,
          duration: randomBetween(240, 280),
          color: "#fff7dc",
          spin: randomBetween(-0.01, 0.01)
        }));
        enforceParticleLimit();
      }, i * 25);
    }
  }

  function spawnFirework(x, y, scale = 1) {
    const count = Math.floor(randomBetween(13, 19) * softenedScale(scale, 0.45));
    const color = pick(COLORS);
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + randomBetween(-0.12, 0.12);
      const speed = randomBetween(0.9, 2.1) * scale;
      addParticle(baseParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.012,
        duration: randomBetween(920, 1450) * softenedScale(scale, 0.35),
        size: randomBetween(4.5, 8.5) * scale,
        color,
        type: Math.random() > 0.45 ? "sparkle" : "dot"
      }));
    }
  }

  function launchFirework(x, y, scale = 1, onBurst) {
    spawnFireworkRise(x, y + 70, scale);
    setTimeout(function () {
      spawnFirework(x, y, scale);
      if (typeof onBurst === "function") {
        onBurst();
      }
      enforceParticleLimit();
    }, 240);
  }

  function spawnStars(x, y, scale = 1) {
    addParticle(baseParticle(x, y, {
      type: "star",
      size: randomBetween(18, 27) * scale,
      duration: 1180 * softenedScale(scale, 0.4),
      color: pick(["#fff2a8", "#f8f0ff", "#b9e8ff"]),
      spin: randomBetween(-0.018, 0.018)
    }));

    const count = Math.floor(10 * softenedScale(scale, 0.3));
    for (let i = 0; i < count; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const distance = randomBetween(18, 66) * scale;
      const drift = softenedScale(scale, 0.35);
      addParticle(baseParticle(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, {
        vx: Math.cos(angle) * randomBetween(0.12, 0.55) * drift,
        vy: Math.sin(angle) * randomBetween(0.12, 0.55) * drift - 0.18,
        type: Math.random() > 0.55 ? "star" : "dot",
        size: randomBetween(5, 11) * scale,
        duration: randomBetween(950, 1450) * softenedScale(scale, 0.35)
      }));
    }
  }

  function spawnBubbles(x, y, scale = 1) {
    const count = Math.ceil(8 * softenedScale(scale, 0.22));
    for (let i = 0; i < count; i += 1) {
      const bubbleX = x + randomBetween(-30, 30) * scale;
      const bubbleY = y + randomBetween(-18, 18) * scale;
      addParticle(baseParticle(bubbleX, bubbleY, {
        vx: randomBetween(-0.35, 0.35),
        vy: randomBetween(-0.95, -0.25),
        type: "bubble",
        size: randomBetween(8, 18) * scale,
        duration: randomBetween(1300, 1900) * softenedScale(scale, 0.18),
        color: pick(["#b9e8ff", "#f8f0ff", "#b7f3ef", "#ffd1dc"])
      }));
      addParticle(baseParticle(bubbleX + randomBetween(-8, 8) * scale, bubbleY + randomBetween(-8, 8) * scale, {
        vx: randomBetween(-0.28, 0.28),
        vy: randomBetween(-0.75, -0.2),
        type: pick(["sparkle", "dot"]),
        size: randomBetween(3.5, 7) * scale,
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
        size: randomBetween(13, 19) * scale,
        duration: randomBetween(1100, 1600) * softenedScale(scale, 0.3),
        color,
        rotation: angle
      }));
    }

    addParticle(baseParticle(x, y, {
      type: "sparkle",
      size: randomBetween(7, 11) * scale,
      duration: 980 * softenedScale(scale, 0.3),
      color: "#fff2a8"
    }));
  }

  function spawnTwinkles(x, y, scale = 1) {
    const count = Math.floor(16 * softenedScale(scale, 0.25));
    const spread = softenedScale(scale, 0.35);
    for (let i = 0; i < count; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(0.25, 1.25) * spread;
      addParticle(baseParticle(x + randomBetween(-18, 18) * scale, y + randomBetween(-18, 18) * scale, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.12,
        type: "sparkle",
        size: randomBetween(6, 12) * scale,
        duration: randomBetween(780, 1200) * softenedScale(scale, 0.25),
        color: pick(["#fff2a8", "#f8f0ff", "#b9e8ff"])
      }));
    }
  }

  function spawnGlowScatter(x, y, scale = 1) {
    const count = Math.floor(16 * softenedScale(scale, 0.18));
    const spread = softenedScale(scale, 0.42);
    for (let i = 0; i < count; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(0.18, 0.95) * spread;
      addParticle(baseParticle(x + randomBetween(-26, 26) * scale, y + randomBetween(-22, 22) * scale, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - randomBetween(0.16, 0.38),
        type: pick(["sparkle", "star", "dot", "petal"]),
        size: randomBetween(4.5, 13) * scale,
        duration: randomBetween(900, 1450) * softenedScale(scale, 0.22),
        color: pick(["#ffd1dc", "#b9e8ff", "#c8f7d0", "#e3d4ff"])
      }));
    }
  }

  function spawnLightDots(x, y, scale = 1) {
    const spread = softenedScale(scale, 0.4);
    const groups = [
      { count: 14, type: "sparkle", sizeMin: 4, sizeMax: 8, colors: ["#fff2a8", "#f8f0ff", "#b9e8ff"] },
      { count: 6, type: "star", sizeMin: 4, sizeMax: 8, colors: ["#fff2a8", "#fffdf3", "#b9e8ff"] },
      { count: 2, type: "dot", sizeMin: 3.5, sizeMax: 6.5, colors: ["#fff2a8", "#ffd1dc"] }
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
      { fn: launchFirework, weight: 3 },
      { fn: spawnStars, weight: 3 },
      { fn: spawnLightDots, weight: 3 },
      { fn: spawnTwinkles, weight: 3 },
      { fn: spawnGlowScatter, weight: 2 },
      { fn: spawnFlower, weight: 2 },
      { fn: spawnBubbles, weight: 1 }
    ];
    pickWeightedVariant(variants).fn(x, y, TAP_EFFECT_SCALE);
    enforceParticleLimit();
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

    const launches = [
      { delay: 0, xRatio: 0.5, yRatio: 0.22, scale: FINISH_EFFECT_SCALE * 1 },
      { delay: 260, xRatio: 0.28, yRatio: 0.32, scale: FINISH_EFFECT_SCALE * 0.9 },
      { delay: 540, xRatio: 0.72, yRatio: 0.32, scale: FINISH_EFFECT_SCALE * 0.9 },
      { delay: 820, xRatio: 0.22, yRatio: 0.46, scale: FINISH_EFFECT_SCALE * 0.78 },
      { delay: 1100, xRatio: 0.78, yRatio: 0.46, scale: FINISH_EFFECT_SCALE * 0.78 },
      { delay: 1380, xRatio: 0.5, yRatio: 0.5, scale: FINISH_EFFECT_SCALE * 0.78 },
      { delay: 1700, xRatio: 0.5, yRatio: 0.32, scale: FINISH_EFFECT_SCALE * 1.4, finale: true }
    ];

    launches.forEach(function (launch) {
      setTimeout(function () {
        const x = state.width * launch.xRatio;
        const y = state.height * launch.yRatio;
        launchFirework(x, y, launch.scale, launch.finale ? function () {
          spawnStars(x, y, 1.3);
          spawnGlowScatter(x, y, 1.25);
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
      spawnTwinkles(point.x, point.y, COMPLETE_TAP_EFFECT_SCALE);
      enforceParticleLimit();
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

  function drawDecorationMark(mark, time, alphaBoost) {
    const point = pointFromRatio(mark);
    const drift = Math.sin(time * 0.00032 + mark.phase) * mark.drift;
    const alpha = clamp(mark.alpha + Math.sin(time * 0.0011 + mark.phase) * 0.06, 0.16, 0.7) * alphaBoost;
    const size = mark.size * (1 + Math.sin(time * 0.0007 + mark.phase) * 0.04);

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
    const moonX = state.width * 0.78;
    const moonY = state.height * 0.18;
    const moonRadius = clamp(state.width * 0.055, 22, 42);
    const bob = Math.sin(time * 0.00025) * 1.5;

    ctx.save();
    ctx.globalAlpha = stageAlpha * 0.72;
    ctx.fillStyle = "#fff7dc";
    ctx.beginPath();
    ctx.arc(moonX, moonY + bob, moonRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = stageAlpha * 0.18;
    ctx.fillStyle = "#fffdf3";
    ctx.beginPath();
    ctx.ellipse(state.width * 0.2, state.height * 0.78, state.width * 0.16, state.height * 0.035, 0, 0, Math.PI * 2);
    ctx.ellipse(state.width * 0.3, state.height * 0.76, state.width * 0.12, state.height * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = stageAlpha * 0.16;
    ctx.beginPath();
    ctx.ellipse(state.width * 0.72, state.height * 0.72, state.width * 0.15, state.height * 0.032, 0, 0, Math.PI * 2);
    ctx.ellipse(state.width * 0.82, state.height * 0.7, state.width * 0.12, state.height * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawParticle(particle) {
    const t = clamp(particle.age / particle.duration, 0, 1);
    const alpha = Math.pow(1 - t, 1.45) * 0.86;
    const scale = 0.42 + easeOutCubic(Math.min(1, t * 2.4)) * 0.72;
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
      ctx.fillStyle = "#fff8d2";
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

  resizeCanvas();
  window.requestAnimationFrame(animate);
}());
