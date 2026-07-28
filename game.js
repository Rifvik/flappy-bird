/**
 * Flappy Bird - High Refresh Rate Native Arcade Engine
 * Colors: #192145 (Navy), #3F5FAE (Slate), #64A1D4 (Blue), #92C9DF (Ice), #D8DDDD (Silver)
 */

(function () {
  'use strict';

  // --- Canvas & DOM Elements ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const fpsDisplay = document.getElementById('fpsDisplay');
  const inGameScore = document.getElementById('inGameScore');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');

  const startScreen = document.getElementById('startScreen');
  const pauseScreen = document.getElementById('pauseScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');

  const startBtn = document.getElementById('startBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const restartPauseBtn = document.getElementById('restartPauseBtn');
  const restartBtn = document.getElementById('restartBtn');
  const menuBtn = document.getElementById('menuBtn');

  const finalScoreEl = document.getElementById('finalScore');
  const bestScoreEl = document.getElementById('bestScore');
  const medalIconEl = document.getElementById('medalIcon');
  const medalLabelEl = document.getElementById('medalLabel');

  const difficultySelector = document.getElementById('difficultySelector');
  const skinSelector = document.getElementById('skinSelector');

  // --- Game Settings & Configuration ---
  const CANVAS_WIDTH = 480;
  const CANVAS_HEIGHT = 640;

  const DIFFICULTIES = {
    easy: { gap: 170, speed: 140, pipeInterval: 2.0 },
    classic: { gap: 145, speed: 175, pipeInterval: 1.65 },
    hard: { gap: 125, speed: 215, pipeInterval: 1.35 }
  };

  // 5 Color Palette Mapping:
  // #192145 (Navy), #3F5FAE (Deep Blue), #64A1D4 (Sky Blue), #92C9DF (Light Ice), #D8DDDD (Silver)
  const SKINS = {
    azure: {
      bodyGradient: ['#64A1D4', '#3F5FAE'],
      wingColor: '#92C9DF',
      eyeColor: '#D8DDDD',
      glow: '#64A1D4',
      trail: '#92C9DF'
    },
    gold: {
      bodyGradient: ['#ffd700', '#ff8800'],
      wingColor: '#D8DDDD',
      eyeColor: '#192145',
      glow: '#ffd700',
      trail: '#ffd700'
    },
    silver: {
      bodyGradient: ['#D8DDDD', '#92C9DF'],
      wingColor: '#3F5FAE',
      eyeColor: '#192145',
      glow: '#D8DDDD',
      trail: '#D8DDDD'
    }
  };

  // --- State Variables ---
  let gameState = 'START'; // 'START', 'PLAYING', 'PAUSED', 'GAMEOVER'
  let currentDifficulty = localStorage.getItem('flappy_diff') || 'classic';
  let currentSkinKey = localStorage.getItem('flappy_skin') || 'azure';
  if (!SKINS[currentSkinKey]) currentSkinKey = 'azure';
  let soundMuted = localStorage.getItem('flappy_muted') === 'true';

  let score = 0;
  let bestScore = parseInt(localStorage.getItem('flappy_bestScore') || '0', 10);

  // Delta Time & FPS tracking
  let lastTimestamp = 0;
  let fpsFrameCount = 0;
  let fpsLastCalc = 0;
  let currentFPS = 60;

  // Background Parallax Offsets
  let starBgOffset = 0;
  let cityBgOffset = 0;
  let groundBgOffset = 0;

  // --- Entities ---
  let bird = {
    x: 100,
    y: 300,
    radius: 16,
    velocity: 0,
    gravity: 980,        // px/s^2
    jumpStrength: -330,  // px/s
    rotation: 0,
    wingAngle: 0,
    wingSpeed: 15
  };

  let pipes = [];
  let stars = []; // Bonus collectibles
  let particles = [];
  let pipeSpawnTimer = 0;

  // --- Web Audio API Synth Engine ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSynthSound(type) {
    if (soundMuted || !audioCtx) return;

    const now = audioCtx.currentTime;

    if (type === 'flap') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'score') {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5

      osc2.frequency.setValueAtTime(1046.5, now); // C6

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } else if (type === 'star') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'hit') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    }
  }

  // --- Background Starfield Data ---
  const backgroundStars = [];
  for (let i = 0; i < 45; i++) {
    backgroundStars.push({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * (CANVAS_HEIGHT - 100),
      size: Math.random() * 2 + 1,
      speed: Math.random() * 15 + 5,
      alpha: Math.random() * 0.8 + 0.2
    });
  }

  // --- Game Loop (High-FPS Delta-Time Engine) ---
  function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;

    let dt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    if (dt > 0.1) dt = 0.1;

    // Calculate FPS
    fpsFrameCount++;
    if (timestamp - fpsLastCalc >= 500) {
      currentFPS = Math.round((fpsFrameCount * 1000) / (timestamp - fpsLastCalc));
      fpsDisplay.textContent = `FPS: ${currentFPS}`;
      fpsFrameCount = 0;
      fpsLastCalc = timestamp;
    }

    if (gameState === 'PLAYING') {
      updateGame(dt);
    }
    renderGame(dt);

    requestAnimationFrame(gameLoop);
  }

  // --- Update Game Logic ---
  function updateGame(dt) {
    const config = DIFFICULTIES[currentDifficulty];

    // 1. Update Bird Physics
    bird.velocity += bird.gravity * dt;
    bird.y += bird.velocity * dt;

    const targetRotation = Math.min(Math.PI / 3, Math.max(-Math.PI / 6, (bird.velocity / 400) * (Math.PI / 4)));
    bird.rotation += (targetRotation - bird.rotation) * (dt * 12);

    bird.wingAngle += bird.wingSpeed * dt;

    if (Math.random() < 0.6) {
      createThrustParticle(bird.x - 12, bird.y);
    }

    if (bird.y - bird.radius <= 0) {
      bird.y = bird.radius;
      bird.velocity = 0;
    }

    const groundY = CANVAS_HEIGHT - 60;
    if (bird.y + bird.radius >= groundY) {
      triggerGameOver();
      return;
    }

    // 2. Parallax Scrolling
    starBgOffset += 10 * dt;
    cityBgOffset += 30 * dt;
    groundBgOffset += config.speed * dt;

    // 3. Pipe Spawning & Updating
    pipeSpawnTimer += dt;
    if (pipeSpawnTimer >= config.pipeInterval) {
      pipeSpawnTimer = 0;
      spawnPipePair(config);
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= config.speed * dt;

      if (!p.passed && p.x + p.width < bird.x) {
        p.passed = true;
        if (p.isTop) {
          score++;
          inGameScore.textContent = score;
          playSynthSound('score');
          createScoreBurstParticles(bird.x, bird.y);
        }
      }

      if (checkBirdPipeCollision(bird, p)) {
        triggerGameOver();
        return;
      }

      if (p.x + p.width < -50) {
        pipes.splice(i, 1);
      }
    }

    // 4. Star Collectibles Updating
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.x -= config.speed * dt;
      s.pulse += dt * 4;

      const dist = Math.hypot(bird.x - s.x, bird.y - s.y);
      if (dist < bird.radius + s.radius) {
        score += 2;
        inGameScore.textContent = score;
        playSynthSound('star');
        createStarPickupParticles(s.x, s.y);
        stars.splice(i, 1);
        continue;
      }

      if (s.x < -30) {
        stars.splice(i, 1);
      }
    }

    // 5. Update Particles
    updateParticles(dt);
  }

  function spawnPipePair(config) {
    const minHeight = 60;
    const groundHeight = 60;
    const maxTopHeight = CANVAS_HEIGHT - groundHeight - config.gap - minHeight;
    const topHeight = Math.floor(Math.random() * (maxTopHeight - minHeight + 1)) + minHeight;

    const pipeWidth = 64;

    pipes.push({
      x: CANVAS_WIDTH + 10,
      y: 0,
      width: pipeWidth,
      height: topHeight,
      isTop: true,
      passed: false
    });

    pipes.push({
      x: CANVAS_WIDTH + 10,
      y: topHeight + config.gap,
      width: pipeWidth,
      height: CANVAS_HEIGHT - groundHeight - (topHeight + config.gap),
      isTop: false,
      passed: false
    });

    if (Math.random() < 0.45) {
      stars.push({
        x: CANVAS_WIDTH + 10 + pipeWidth / 2,
        y: topHeight + config.gap / 2,
        radius: 12,
        pulse: 0
      });
    }
  }

  function checkBirdPipeCollision(b, p) {
    const closestX = Math.max(p.x, Math.min(b.x, p.x + p.width));
    const closestY = Math.max(p.y, Math.min(b.y, p.y + p.height));

    const distanceX = b.x - closestX;
    const distanceY = b.y - closestY;

    return (distanceX * distanceX + distanceY * distanceY) < ((b.radius - 2) * (b.radius - 2));
  }

  // --- Rendering ---
  function renderGame(dt) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Sky Gradient Background using #192145 -> #3F5FAE -> #64A1D4
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyGrad.addColorStop(0, '#192145');
    skyGrad.addColorStop(0.65, '#28386b');
    skyGrad.addColorStop(1, '#3F5FAE');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Starfield
    ctx.fillStyle = '#D8DDDD';
    for (let s of backgroundStars) {
      ctx.globalAlpha = s.alpha * (0.8 + Math.sin(Date.now() * 0.003 + s.x) * 0.2);
      const drawX = (s.x - starBgOffset * (s.speed / 20)) % CANVAS_WIDTH;
      ctx.fillRect(drawX < 0 ? drawX + CANVAS_WIDTH : drawX, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1.0;

    // 3. Skyline
    renderSkyline();

    // 4. Pipes
    for (let p of pipes) {
      renderPipe(p);
    }

    // 5. Stars
    for (let s of stars) {
      renderStar(s);
    }

    // 6. Particles
    renderParticles();

    // 7. Ground
    renderGround();

    // 8. Bird Character
    renderBird();
  }

  function renderSkyline() {
    ctx.fillStyle = 'rgba(100, 161, 212, 0.08)';
    ctx.strokeStyle = 'rgba(146, 201, 223, 0.2)';
    ctx.lineWidth = 1;

    const buildingWidth = 40;
    const numBuildings = Math.ceil(CANVAS_WIDTH / buildingWidth) + 2;

    for (let i = 0; i < numBuildings; i++) {
      const bX = (i * buildingWidth - (cityBgOffset % buildingWidth));
      const bHeight = 85 + Math.sin(i * 99) * 40;
      const bY = CANVAS_HEIGHT - 60 - bHeight;

      ctx.fillRect(bX, bY, buildingWidth - 2, bHeight);
      ctx.strokeRect(bX, bY, buildingWidth - 2, bHeight);
    }
  }

  function renderPipe(p) {
    // Pipe Body Gradient (#3F5FAE -> #64A1D4 -> #3F5FAE)
    const pipeGrad = ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
    pipeGrad.addColorStop(0, '#2b4482');
    pipeGrad.addColorStop(0.35, '#64A1D4');
    pipeGrad.addColorStop(0.7, '#3F5FAE');
    pipeGrad.addColorStop(1, '#192145');

    ctx.fillStyle = pipeGrad;
    ctx.fillRect(p.x, p.y, p.width, p.height);

    // Glowing Cap using #92C9DF & #D8DDDD
    const capHeight = 24;
    const capY = p.isTop ? p.height - capHeight : p.y;

    ctx.fillStyle = '#92C9DF';
    ctx.shadowColor = '#64A1D4';
    ctx.shadowBlur = 10;
    ctx.fillRect(p.x - 4, capY, p.width + 8, capHeight);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#D8DDDD';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - 4, capY, p.width + 8, capHeight);
  }

  function renderStar(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(1 + Math.sin(s.pulse) * 0.15, 1 + Math.sin(s.pulse) * 0.15);

    ctx.shadowColor = '#92C9DF';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#D8DDDD';

    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * s.radius, -Math.sin((18 + i * 72) * Math.PI / 180) * s.radius);
      ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (s.radius / 2), -Math.sin((54 + i * 72) * Math.PI / 180) * (s.radius / 2));
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function renderGround() {
    const groundY = CANVAS_HEIGHT - 60;

    const groundGrad = ctx.createLinearGradient(0, groundY, 0, CANVAS_HEIGHT);
    groundGrad.addColorStop(0, '#192145');
    groundGrad.addColorStop(1, '#111730');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, CANVAS_WIDTH, 60);

    // Top Border Line (#64A1D4)
    ctx.strokeStyle = '#64A1D4';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#64A1D4';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(CANVAS_WIDTH, groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Scrolling Ground Stripes
    ctx.strokeStyle = 'rgba(146, 201, 223, 0.25)';
    ctx.lineWidth = 1;
    const stripeWidth = 24;
    for (let x = -stripeWidth; x < CANVAS_WIDTH + stripeWidth; x += stripeWidth) {
      const stripeX = x - (groundBgOffset % stripeWidth);
      ctx.beginPath();
      ctx.moveTo(stripeX, groundY);
      ctx.lineTo(stripeX - 15, CANVAS_HEIGHT);
      ctx.stroke();
    }
  }

  function renderBird() {
    const skin = SKINS[currentSkinKey] || SKINS.azure;

    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    ctx.shadowColor = skin.glow;
    ctx.shadowBlur = 12;

    const bGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, bird.radius);
    bGrad.addColorStop(0, skin.bodyGradient[0]);
    bGrad.addColorStop(1, skin.bodyGradient[1]);

    ctx.fillStyle = bGrad;
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Wing
    const wingY = Math.sin(bird.wingAngle) * 6;
    ctx.fillStyle = skin.wingColor;
    ctx.beginPath();
    ctx.ellipse(-4, wingY, 8, 5, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = skin.eyeColor;
    ctx.beginPath();
    ctx.arc(6, -5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#192145';
    ctx.beginPath();
    ctx.arc(7, -5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#64A1D4';
    ctx.beginPath();
    ctx.moveTo(12, -2);
    ctx.lineTo(20, 2);
    ctx.lineTo(12, 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // --- Particles Engine ---
  function createThrustParticle(x, y) {
    const skin = SKINS[currentSkinKey] || SKINS.azure;
    particles.push({
      x: x,
      y: y + (Math.random() * 6 - 3),
      vx: -(Math.random() * 60 + 40),
      vy: Math.random() * 40 - 20,
      size: Math.random() * 4 + 2,
      color: skin.trail,
      life: 1.0,
      decay: Math.random() * 2.5 + 1.5
    });
  }

  function createScoreBurstParticles(x, y) {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 50;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 3,
        color: '#92C9DF',
        life: 1.0,
        decay: Math.random() * 2.0 + 1.0
      });
    }
  }

  function createStarPickupParticles(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 200 + 80;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 6 + 3,
        color: '#D8DDDD',
        life: 1.0,
        decay: Math.random() * 3.0 + 1.5
      });
    }
  }

  function createExplosionParticles(x, y) {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 250 + 60;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 6 + 3,
        color: i % 2 === 0 ? '#64A1D4' : '#92C9DF',
        life: 1.0,
        decay: Math.random() * 2.0 + 1.0
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function renderParticles() {
    for (let p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // --- Game Controls & State Triggers ---
  function flap() {
    initAudio();

    if (gameState === 'START') {
      startGame();
      bird.velocity = bird.jumpStrength;
      playSynthSound('flap');
    } else if (gameState === 'PLAYING') {
      bird.velocity = bird.jumpStrength;
      playSynthSound('flap');
    } else if (gameState === 'GAMEOVER') {
      resetToStart();
    }
  }

  function startGame() {
    gameState = 'PLAYING';
    score = 0;
    inGameScore.textContent = score;
    inGameScore.classList.add('active');

    pipes = [];
    stars = [];
    particles = [];
    pipeSpawnTimer = 0;

    bird.y = 280;
    bird.velocity = 0;

    startScreen.classList.remove('active');
    startScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
  }

  function triggerGameOver() {
    gameState = 'GAMEOVER';
    playSynthSound('hit');
    createExplosionParticles(bird.x, bird.y);

    inGameScore.classList.remove('active');

    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('flappy_bestScore', bestScore);
    }

    finalScoreEl.textContent = score;
    bestScoreEl.textContent = bestScore;

    // Medals Logic
    medalIconEl.className = 'medal-icon';
    if (score >= 100) {
      medalIconEl.classList.add('medal-platinum');
      medalIconEl.textContent = '💎';
      medalLabelEl.textContent = 'PLATINUM';
    } else if (score >= 50) {
      medalIconEl.classList.add('medal-gold');
      medalIconEl.textContent = '🥇';
      medalLabelEl.textContent = 'GOLD';
    } else if (score >= 25) {
      medalIconEl.classList.add('medal-silver');
      medalIconEl.textContent = '🥈';
      medalLabelEl.textContent = 'SILVER';
    } else if (score >= 10) {
      medalIconEl.classList.add('medal-bronze');
      medalIconEl.textContent = '🥉';
      medalLabelEl.textContent = 'BRONZE';
    } else {
      medalIconEl.classList.add('medal-none');
      medalIconEl.textContent = '❌';
      medalLabelEl.textContent = 'NO MEDAL';
    }

    setTimeout(() => {
      gameOverScreen.classList.remove('hidden');
      gameOverScreen.classList.add('active');
    }, 400);
  }

  function togglePause() {
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseScreen.classList.remove('hidden');
      pauseScreen.classList.add('active');
    } else if (gameState === 'PAUSED') {
      gameState = 'PLAYING';
      lastTimestamp = performance.now();
      pauseScreen.classList.remove('active');
      pauseScreen.classList.add('hidden');
    }
  }

  function resetToStart() {
    gameState = 'START';
    bird.y = 300;
    bird.velocity = 0;
    pipes = [];
    stars = [];
    particles = [];

    inGameScore.classList.remove('active');
    gameOverScreen.classList.remove('active');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');

    startScreen.classList.remove('hidden');
    startScreen.classList.active;
    startScreen.classList.add('active');
  }

  // --- Input Listeners ---
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      flap();
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      togglePause();
    }
  });

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    flap();
  });

  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    flap();
  });

  resumeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePause();
  });

  restartPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
  });

  restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
  });

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetToStart();
  });

  // --- Sound Toggle ---
  soundToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    soundMuted = !soundMuted;
    localStorage.setItem('flappy_muted', soundMuted);
    soundIcon.textContent = soundMuted ? '🔇' : '🔊';
  });

  // --- Difficulty Selector ---
  difficultySelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill-btn');
    if (!btn) return;

    document.querySelectorAll('#difficultySelector .pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    currentDifficulty = btn.dataset.diff;
    localStorage.setItem('flappy_diff', currentDifficulty);
  });

  document.querySelectorAll('#difficultySelector .pill-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.diff === currentDifficulty);
  });

  // --- Skin Selector ---
  skinSelector.addEventListener('click', (e) => {
    const card = e.target.closest('.skin-card');
    if (!card) return;

    document.querySelectorAll('#skinSelector .skin-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    currentSkinKey = card.dataset.skin;
    localStorage.setItem('flappy_skin', currentSkinKey);
  });

  document.querySelectorAll('#skinSelector .skin-card').forEach(c => {
    c.classList.toggle('active', c.dataset.skin === currentSkinKey);
  });

  if (soundMuted) soundIcon.textContent = '🔇';

  requestAnimationFrame(gameLoop);

})();
