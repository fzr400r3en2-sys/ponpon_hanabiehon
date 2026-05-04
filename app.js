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
    taps: 0,
    complete: false,
    lastTime: performance.now()
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

  function spawnFirework(x, y, scale) {
    const count = Math.floor(randomBetween(13, 19) * scale);
    const color = pick(COLORS);
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + randomBetween(-0.12, 0.12);
      const speed = randomBetween(0.9, 2.1) * scale;
      addParticle(baseParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.012,
        duration: randomBetween(820, 1280),
        size: randomBetween(4.5, 8.5) * scale,
        color,
        type: Math.random() > 0.45 ? "sparkle" : "dot"
      }));
    }
  }

  function spawnStars(x, y) {
    addParticle(baseParticle(x, y, {
      type: "star",
      size: randomBetween(18, 27),
      duration: 1100,
      color: pick(["#fff2a8", "#f8f0ff", "#b9e8ff"]),
      spin: randomBetween(-0.018, 0.018)
    }));

    for (let i = 0; i < 10; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const distance = randomBetween(18, 66);
      addParticle(baseParticle(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, {
        vx: Math.cos(angle) * randomBetween(0.12, 0.55),
        vy: Math.sin(angle) * randomBetween(0.12, 0.55) - 0.18,
        type: Math.random() > 0.55 ? "star" : "dot",
        size: randomBetween(5, 11),
        duration: randomBetween(850, 1300)
      }));
    }
  }

  function spawnBubbles(x, y) {
    for (let i = 0; i < 10; i += 1) {
      addParticle(baseParticle(x + randomBetween(-28, 28), y + randomBetween(-16, 18), {
        vx: randomBetween(-0.35, 0.35),
        vy: randomBetween(-0.95, -0.25),
        type: "bubble",
        size: randomBetween(12, 30),
        duration: randomBetween(1300, 1900),
        color: pick(["#b9e8ff", "#f8f0ff", "#b7f3ef", "#ffd1dc"])
      }));
    }
  }

  function spawnFlower(x, y) {
    const petals = Math.floor(randomBetween(7, 10));
    const color = pick(["#ffd1dc", "#ffc89f", "#e3d4ff", "#c8f7d0"]);
    for (let i = 0; i < petals; i += 1) {
      const angle = (Math.PI * 2 * i) / petals;
      addParticle(baseParticle(x, y, {
        vx: Math.cos(angle) * randomBetween(0.35, 0.9),
        vy: Math.sin(angle) * randomBetween(0.35, 0.9) - 0.12,
        type: "petal",
        size: randomBetween(13, 19),
        duration: randomBetween(950, 1450),
        color,
        rotation: angle
      }));
    }

    addParticle(baseParticle(x, y, {
      type: "circle",
      size: randomBetween(10, 15),
      duration: 900,
      color: "#fff2a8"
    }));
  }

  function spawnTwinkles(x, y) {
    for (let i = 0; i < 16; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(0.25, 1.25);
      addParticle(baseParticle(x + randomBetween(-18, 18), y + randomBetween(-18, 18), {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.12,
        type: "sparkle",
        size: randomBetween(6, 12),
        duration: randomBetween(650, 1050),
        color: pick(["#fff2a8", "#f8f0ff", "#b9e8ff"])
      }));
    }
  }

  function spawnSoftCircles(x, y) {
    for (let i = 0; i < 12; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(0.15, 0.8);
      addParticle(baseParticle(x + randomBetween(-20, 20), y + randomBetween(-20, 20), {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.2,
        type: "circle",
        size: randomBetween(13, 34),
        duration: randomBetween(900, 1500),
        color: pick(["#ffd1dc", "#b9e8ff", "#c8f7d0", "#e3d4ff"])
      }));
    }
  }

  function spawnLightDots(x, y) {
    for (let i = 0; i < 22; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(0.25, 1.45);
      addParticle(baseParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.35,
        gravity: 0.01,
        type: "dot",
        size: randomBetween(3, 7),
        duration: randomBetween(750, 1200),
        color: pick(COLORS)
      }));
    }
  }

  function spawnTapEffect(x, y) {
    const variants = [
      spawnFirework,
      spawnStars,
      spawnBubbles,
      spawnFlower,
      spawnTwinkles,
      spawnSoftCircles,
      spawnLightDots
    ];
    const variant = pick(variants);
    if (variant === spawnFirework) {
      variant(x, y, 1);
    } else {
      variant(x, y);
    }
    enforceParticleLimit();
  }

  function showFinish() {
    if (state.complete) {
      return;
    }

    state.complete = true;
    shell.classList.add("is-complete");
    finishMessage.textContent = pick(FINISH_WORDS);
    finishPanel.hidden = false;
    finishPanel.setAttribute("aria-hidden", "false");

    const points = [
      { x: state.width * 0.28, y: state.height * 0.36 },
      { x: state.width * 0.5, y: state.height * 0.26 },
      { x: state.width * 0.72, y: state.height * 0.38 }
    ];
    points.forEach(function (point) {
      spawnFirework(point.x, point.y, 1.35);
      spawnTwinkles(point.x, point.y);
    });
    enforceParticleLimit();
  }

  function resetGame() {
    state.taps = 0;
    state.complete = false;
    state.particles = [];
    shell.classList.remove("is-complete");
    finishPanel.hidden = true;
    finishPanel.setAttribute("aria-hidden", "true");

    spawnSoftCircles(state.width * 0.5, state.height * 0.55);
    enforceParticleLimit();
  }

  function handlePointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    event.preventDefault();

    if (state.complete) {
      return;
    }

    const point = getPointFromEvent(event);
    spawnTapEffect(point.x, point.y);
    state.taps += 1;

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
      ctx.globalAlpha = alpha * 0.72;
      ctx.lineWidth = Math.max(2, size * 0.08);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.28;
      ctx.beginPath();
      ctx.arc(particle.x - size * 0.25, particle.y - size * 0.25, size * 0.18, 0, Math.PI * 2);
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
    drawAmbient(now);
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
