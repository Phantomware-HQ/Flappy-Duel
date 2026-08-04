const socket = io();

/* ═══════════════════════════════════════════════════
   ROL BİLGİSİ
   ═══════════════════════════════════════════════════ */
let myRole = null; // 'host' odayı kuran (siyah kuş), 'guest' odaya katılan (kırmızı kuş)

/* ═══════════════════════════════════════════════════
   ÇEVİRİ SİSTEMİ
   ═══════════════════════════════════════════════════ */
const translations = {
  en: {
    createRoom: '✦ Create Room',
    joinRoom: 'Join',
    or: 'or',
    hint: 'Space or tap to flap',
    roomCodeLabel: 'ROOM CODE',
    waiting: 'Waiting for opponent…',
    opponentWantsRestart: 'Opponent wants to play again!',
    start: '▶ START',
    you: 'YOU',
    opponent: 'OPPONENT',
    victory: 'VICTORY!',
    defeat: 'DEFEATED',
    draw: 'DRAW',
    restart: 'Play Again',
    menu: 'Main Menu',
    pipes: 'Pipes',
    flaps: 'Flaps',
    time: 'Time',
    aboutTitle: 'ABOUT',
    aboutDesc: 'Two players, same pipes, same time! Pass pipes, score more than your opponent.',
    loading: '-- ms',
    restartWait: 'Waiting for opponent…',
    enterCode: 'ENTER CODE',
    joined: '✅ Connected! Host will start…',
    opponentReady: '🎮 Opponent ready!',
    opponentReadyRestart: 'Opponent ready, are you?'
  },
  tr: {
    createRoom: '✦ Oda Oluştur',
    joinRoom: 'Katıl',
    or: 'veya',
    hint: 'Boşluk tuşu veya ekrana dokun',
    roomCodeLabel: 'ODA KODU',
    waiting: 'Rakip bekleniyor…',
    start: '▶ BAŞLAT',
    you: 'SEN',
    opponent: 'RAKİP',
    victory: 'ZAFER!',
    defeat: 'YENİLDİN',
    draw: 'BERABERE',
    restart: 'Tekrar Oyna',
    opponentWantsRestart: 'Rakip seninle tekrar oynamak istiyor!',
    menu: 'Ana Menü',
    pipes: 'Boru',
    flaps: 'Zıplama',
    time: 'Süre',
    aboutTitle: 'HAKKINDA',
    aboutDesc: 'İki oyuncu, aynı borular, aynı anda mücadele! Boruları geç, rakibinden daha çok skor yap.',
    loading: '-- ms',
    restartWait: 'Rakip bekleniyor…',
    enterCode: 'KOD GİR',
    joined: '✅ Bağlandı! Host başlatacak…',
    opponentReady: '🎮 Rakip hazır!',
    opponentReadyRestart: 'Rakip hazır, sen de hazır mısın?'
  },
  de: {
    createRoom: '✦ Raum erstellen',
    joinRoom: 'Beitreten',
    or: 'oder',
    hint: 'Leertaste oder tippen',
    roomCodeLabel: 'RAUMCODE',
    waiting: 'Warte auf Gegner…',
    start: '▶ START',
    you: 'DU',
    opponent: 'GEGNER',
    victory: 'SIEG!',
    defeat: 'NIEDERLAGE',
    draw: 'UNENTSCHIEDEN',
    opponentWantsRestart: 'Gegner möchte erneut spielen!',
    restart: 'Erneut spielen',
    menu: 'Hauptmenü',
    pipes: 'Röhren',
    flaps: 'Flügelschläge',
    time: 'Zeit',
    aboutTitle: 'ÜBER',
    aboutDesc: 'Zwei Spieler, gleiche Röhren, gleiche Zeit! Passiere Röhren, erziele mehr Punkte als dein Gegner.',
    loading: '-- ms',
    restartWait: 'Warte auf Gegner…',
    enterCode: 'CODE EINGEBEN',
    joined: '✅ Verbunden! Host startet…',
    opponentReady: '🎮 Gegner bereit!',
    opponentReadyRestart: 'Gegner bereit, bist du bereit?'
  }
};

let currentLang = localStorage.getItem('lang') || 'en';

function t(key) {
  return translations[currentLang]?.[key] || translations.en[key] || key;
}

/* ── DOM ─────────────────────────────────────────── */
const menu           = document.getElementById('menu');
const waiting        = document.getElementById('waiting');
const gameScreen     = document.getElementById('game');
const gameOverScreen = document.getElementById('gameOver');
const roomCodeDisp   = document.getElementById('roomCodeDisplay');
const statusText     = document.getElementById('statusText');
const startBtn       = document.getElementById('startBtn');
const myScoreEl      = document.getElementById('myScore');
const oppScoreEl     = document.getElementById('opponentScore');
const resultText     = document.getElementById('resultText');
const resultIcon     = document.getElementById('resultIcon');
const countdownEl    = document.getElementById('countdownDisplay');
// Ses ve Titreşim
let soundEnabled = true;
let vibrateEnabled = true;
const soundToggleBtn = document.getElementById('soundToggleBtn');
const vibrateToggleBtn = document.getElementById('vibrateToggleBtn');
const pingValueEl = document.getElementById('pingValue');
const pingIconEl = document.getElementById('pingIcon');

/* İstatistik DOM */
const statMyPipes  = document.getElementById('statMyPipes');
const statOppPipes = document.getElementById('statOppPipes');
const statMyFlaps  = document.getElementById('statMyFlaps');
const statOppFlaps = document.getElementById('statOppFlaps');
const statMyTime   = document.getElementById('statMyTime');
const statOppTime  = document.getElementById('statOppTime');

/* ── Fizik ───────────────────────────────────────── */
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const GRAVITY    = isMobile ? 0.25 : 0.04;
const FLAP_FORCE = isMobile ? -5.0 : -2.5;     // -10 yerine -8, daha az güçlü zıplama
const MAX_VEL    = 7;
const PIPE_W     = 68;
const PIPE_GAP   = 188;
const PIPE_SPEED = isMobile ? 6.0 : 1.5;       // 7.0'dan 6.5'e düştü (0.50 azalma)
const BIRD_R     = 15;
/* ── Durum ───────────────────────────────────────── */
let canvas, ctx;
let myBird, oppBird;
let pipes       = [];
let gameRunning = false;
let myScore = 0, oppScore = 0;
let roomCode = null;
let isHost   = false;
let raf      = null;
let pipeSet  = null;

/* ── İstatistik ──────────────────────────────────── */
let myFlaps    = 0, oppFlaps    = 0;
let myPipes    = 0, oppPipes    = 0;
let myAliveMs  = 0, oppAliveMs  = 0;
let gameStartTime = 0;
let myDiedTime    = 0;

/* ── Efekt state ─────────────────────────────────── */
let particles  = [];
let flashAlpha = 0;
let flashColor = '#ffffff';
let dying      = false;
let dyingTimer = 0;


/* ── Parallax Yıldızlar ──────────────────────────── */
let stars = [];


function initStars() {
    stars = [];
    /* 3 katman: yavaş / orta / hızlı */
    for (let i = 0; i < 60; i++) {
        stars.push({
            x:      Math.random() * 800,
            y:      Math.random() * 440,
            r:      0.6 + Math.random() * 1.2,
            speed:  0.1 + Math.random() * 0.15,
            alpha:  0.2 + Math.random() * 0.4
        });
    }
    for (let i = 0; i < 35; i++) {
        stars.push({
            x:      Math.random() * 800,
            y:      Math.random() * 440,
            r:      1 + Math.random() * 1.5,
            speed:  0.25 + Math.random() * 0.2,
            alpha:  0.3 + Math.random() * 0.5
        });
    }
    for (let i = 0; i < 20; i++) {
        stars.push({
            x:      Math.random() * 800,
            y:      Math.random() * 440,
            r:      1.5 + Math.random() * 2,
            speed:  0.45 + Math.random() * 0.25,
            alpha:  0.5 + Math.random() * 0.5
        });
    }
}

function drawStars() {
    stars.forEach(s => {
        s.x -= s.speed;
        if (s.x + s.r < 0) {
            s.x = canvas.width + s.r;
            s.y = Math.random() * canvas.height;
        }
        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle   = '#ffffff';
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur  = s.r * 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

/* ── Kuş Animasyon State ─────────────────────────── */
function makeBirdAnim() {
    return {
        wingAngle: 0,
        wingDir:   -1,
        rotation:  0
    };
}
let myAnim, oppAnim;

function updateBirdAnim(anim, vel) {
    const targetRot = Math.max(-0.4, Math.min(0.8, vel * 0.07));
    anim.rotation += (targetRot - anim.rotation) * 0.18;

    anim.wingAngle += anim.wingDir * 0.12;
    if (anim.wingAngle <= 0)   { anim.wingAngle = 0;  anim.wingDir =  1; }
    if (anim.wingAngle >= 1)   { anim.wingAngle = 1;  anim.wingDir = -1; }
}

function flapAnim(anim) {
    anim.wingAngle = 1;
    anim.wingDir   = -1;
}

/* ══ SES ═════════════════════════════════════════════ */
let audioCtx = null;
function getAC() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}
function playFlap() {
    if (!soundEnabled) return;
    try {
        const ac = getAC();
        const o = ac.createOscillator(), g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(520, ac.currentTime);
        o.frequency.exponentialRampToValueAtTime(280, ac.currentTime + 0.12);
        g.gain.setValueAtTime(0.18, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.13);
        o.start(); o.stop(ac.currentTime + 0.13);
    } catch(e) {}
}
function playScore() {
    if (!soundEnabled) return; 
    try {
        const ac = getAC();
        const o = ac.createOscillator(), g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'triangle';
        o.frequency.setValueAtTime(880, ac.currentTime);
        o.frequency.setValueAtTime(1100, ac.currentTime + 0.06);
        g.gain.setValueAtTime(0.22, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
        o.start(); o.stop(ac.currentTime + 0.2);
    } catch(e) {}
}
function playDeath() {
    if (!soundEnabled) return; 
    try {
        const ac = getAC();
        const bufSize = ac.sampleRate * 0.5;
        const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
        const ns = ac.createBufferSource(); ns.buffer = buf;
        const ng = ac.createGain();
        ng.gain.setValueAtTime(0.4, ac.currentTime);
        ng.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
        ns.connect(ng); ng.connect(ac.destination);
        ns.start(); ns.stop(ac.currentTime + 0.5);
        const o = ac.createOscillator(), g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(200, ac.currentTime);
        o.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.5);
        g.gain.setValueAtTime(0.3, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
        o.start(); o.stop(ac.currentTime + 0.5);
    } catch(e) {}
}
function playBeep(loud) {
    if (!soundEnabled) return; 
    try {
        const ac = getAC();
        const o = ac.createOscillator(), g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(loud ? 1200 : 700, ac.currentTime);
        g.gain.setValueAtTime(0.25, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (loud ? 0.4 : 0.18));
        o.start(); o.stop(ac.currentTime + (loud ? 0.4 : 0.18));
    } catch(e) {}
}

/* ══ PARTİKÜL ════════════════════════════════════════ */
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            r:  2 + Math.random() * 4,
            color, alpha: 1,
            decay: 0.018 + Math.random() * 0.02
        });
    }
}
function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.15; p.vx *= 0.97;
        p.alpha -= p.decay;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle   = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/* ══ ÇİZİM ══════════════════════════════════════════ */
function drawBG() {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0,   '#0a0303');
    g.addColorStop(0.5, '#120505');
    g.addColorStop(1,   '#0d0202');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawStars();

    ctx.fillStyle = 'rgba(180,0,0,0.2)';
    ctx.fillRect(0, canvas.height - 3, canvas.width, 3);
}

function drawPipes() {
    pipes.forEach(p => {
        const g1 = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        g1.addColorStop(0, '#2a0505'); g1.addColorStop(0.5, '#500a0a'); g1.addColorStop(1, '#2a0505');
        ctx.fillStyle = g1;
        ctx.fillRect(p.x, 0, PIPE_W, p.top - 12);
        ctx.fillStyle = '#6a1010';
        ctx.fillRect(p.x - 6, p.top - 26, PIPE_W + 12, 26);
        ctx.strokeStyle = 'rgba(220,40,40,0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x - 6, p.top - 26, PIPE_W + 12, 26);

        const bY = p.top + PIPE_GAP;
        const g2 = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        g2.addColorStop(0, '#2a0505'); g2.addColorStop(0.5, '#500a0a'); g2.addColorStop(1, '#2a0505');
        ctx.fillStyle = g2;
        ctx.fillRect(p.x, bY + 14, PIPE_W, canvas.height - bY - 14);
        ctx.fillStyle = '#6a1010';
        ctx.fillRect(p.x - 6, bY, PIPE_W + 12, 26);
        ctx.strokeStyle = 'rgba(220,40,40,0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x - 6, bY, PIPE_W + 12, 26);
    });
}

function drawBird(b, anim, isOpp) {
    const c1 = isOpp ? '#cc2222' : '#222222';
    const c2 = isOpp ? '#5a0000' : '#050505';

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(anim.rotation);

    ctx.shadowColor = isOpp ? '#cc2222' : '#444444';
    ctx.shadowBlur  = 20;

    const gr = ctx.createRadialGradient(-4, -4, 2, 0, 0, b.r + 4);
    gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    const wingH = 4 + anim.wingAngle * 7;
    ctx.fillStyle = isOpp ? 'rgba(200,50,50,0.55)' : 'rgba(100,100,100,0.55)';
    ctx.beginPath();
    ctx.ellipse(-6, 2 - anim.wingAngle * 5, 9, wingH, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(5, -4, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(7, -5, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(9, -7, 1.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#e07000';
    ctx.beginPath();
    ctx.moveTo(16, -3); ctx.lineTo(26, -1); ctx.lineTo(16, 3);
    ctx.closePath(); ctx.fill();

    ctx.restore();
}

function drawFlash() {
    if (flashAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle   = flashColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    flashAlpha -= 0.04;
    if (flashAlpha < 0) flashAlpha = 0;
}

/* ══ ANA DÖNGÜ ════════════════════════════════════════ */
function mainLoop() {
    if (!gameRunning && !dying) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBG();
    drawPipes();

    if (gameRunning) {
        myBird.vel  = Math.min(myBird.vel  + GRAVITY, MAX_VEL);
        myBird.y   += myBird.vel;
        oppBird.vel = Math.min(oppBird.vel + GRAVITY, MAX_VEL);
        oppBird.y  += oppBird.vel;

        updateBirdAnim(myAnim,  myBird.vel);
        updateBirdAnim(oppAnim, oppBird.vel);

        for (let i = pipes.length - 1; i >= 0; i--) {
            const p = pipes[i];
            p.x -= PIPE_SPEED;

            if (!p.passed && p.x + PIPE_W < myBird.x) {
                p.passed = true;
                myScore++; myPipes++;
                myScoreEl.textContent = myScore;
                triggerBump(myScoreEl);
                playScore();
                socket.emit('scoreUpdate', roomCode);
            }

            if (myBird.x + myBird.r > p.x &&
                myBird.x - myBird.r < p.x + PIPE_W) {
                if (myBird.y - myBird.r < p.top ||
                    myBird.y + myBird.r > p.top + PIPE_GAP) {
                    killMyBird(); return;
                }
            }
            if (p.x + PIPE_W < 0) pipes.splice(i, 1);
        }

        if (myBird.y + myBird.r > canvas.height ||
            myBird.y - myBird.r < 0) {
            killMyBird(); return;
        }
    }

    // === ROL BAZLI KUŞ RENKLERİ ===
    // host (myRole === 'host') → kendi kuşu SİYAH (isOpp = false), rakip KIRMIZI (isOpp = true)
    // guest (myRole === 'guest') → kendi kuşu KIRMIZI (isOpp = true), rakip SİYAH (isOpp = false)
    const iAmHost = (myRole === 'host');
    drawBird(myBird,  myAnim,  !iAmHost);  // host ise false (siyah), guest ise true (kırmızı)
    drawBird(oppBird, oppAnim, iAmHost);   // host ise true (kırmızı), guest ise false (siyah)

    drawParticles();
    drawFlash();

    if (dying) {
        dyingTimer++;
        if (dyingTimer > 50 || (particles.length === 0 && flashAlpha <= 0)) {
            dying = false;
            myDiedTime = Date.now();
            socket.emit('gameOver', roomCode);
            return;
        }
    }

    raf = requestAnimationFrame(mainLoop);
}

/* ── Ölüm ────────────────────────────────────────── */
function killMyBird() {
    if (dying) return;
     if (vibrateEnabled && navigator.vibrate) navigator.vibrate(100);
    gameRunning = false;
    dying       = true;
    dyingTimer  = 0;
    myDiedTime  = Date.now();
    cancelAnimationFrame(raf);

    playDeath();
    flashColor = '#ffffff'; flashAlpha = 0.65;
    spawnParticles(myBird.x, myBird.y, '#ff4444', 20);
    spawnParticles(myBird.x, myBird.y, '#ffaa00', 12);
    spawnParticles(myBird.x, myBird.y, '#ffffff',  8);

    raf = requestAnimationFrame(mainLoop);
}

/* ── Yardımcılar ─────────────────────────────────── */
function triggerBump(el) {
    el.classList.remove('score-bump');
    void el.offsetWidth;
    el.classList.add('score-bump');
}

function flap() {
    if (!gameRunning) return;
    myBird.vel = FLAP_FORCE;
    myFlaps++;
    flapAnim(myAnim);
    playFlap();
    socket.emit('flap', roomCode);
}

function showOnly(id) {
    ['menu','waiting','game','gameOver'].forEach(s =>
        document.getElementById(s).classList.toggle('hidden', s !== id)
    );
}

function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx    = canvas.getContext('2d');
    const mid = canvas.height / 2;
    
    myBird  = { x: 110, y: mid, vel: 0, r: BIRD_R };
    oppBird = { x: 110, y: mid, vel: 0, r: BIRD_R };
    
    myAnim  = makeBirdAnim();
    oppAnim = makeBirdAnim();
    
    particles  = [];
    flashAlpha = 0;
    dying      = false;
    dyingTimer = 0;
    
    initStars();
}

function buildPipes(set) {
    const list = []; let x = canvas.width + 60;
    set.forEach(s => { list.push({ x, top: s.top, passed: false }); x += 275; });
    return list;
}

function startCountdown(seconds, ps) {
    if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
    }
    gameRunning = false;
    
    pipeSet = ps;
    showOnly('game');
    initCanvas();
    pipes = buildPipes(pipeSet);
    
    myScore  = 0; oppScore  = 0;
    myFlaps  = 0; oppFlaps  = 0;
    myPipes  = 0; oppPipes  = 0;
    myAliveMs = 0; oppAliveMs = 0;
    myDiedTime = 0;
    myScoreEl.textContent  = '0';
    oppScoreEl.textContent = '0';

    countdownEl.classList.remove('hidden');
    let c = seconds;
    countdownEl.textContent = c;
    playBeep(false);

    const iv = setInterval(() => {
        c--;
        if (c > 0) { countdownEl.textContent = c; playBeep(false); }
        else        { countdownEl.textContent = 'GO!'; playBeep(true); }
    }, 1000);

    setTimeout(() => {
        clearInterval(iv);
        countdownEl.classList.add('hidden');
        gameStartTime = Date.now();
        
        if (myBird)  myBird.vel  = 0;
        if (oppBird) oppBird.vel = 0;
        
        gameRunning = true;
        raf = requestAnimationFrame(mainLoop);
    }, seconds * 1000);
}

/* ── İstatistik Göster ───────────────────────────── */
function showStats(endData) {
    const now = Date.now();
    myAliveMs  = myDiedTime   ? myDiedTime - gameStartTime   : now - gameStartTime;

    statMyPipes.textContent  = myPipes;
    statOppPipes.textContent = oppPipes;
    statMyFlaps.textContent  = myFlaps;
    statOppFlaps.textContent = endData.oppFlaps  ?? oppFlaps;
    statMyTime.textContent   = ((myAliveMs  / 1000) | 0) + 's';
    statOppTime.textContent  = ((endData.oppAliveMs / 1000) | 0) + 's';
}

/* ══ SOCKET ══════════════════════════════════════════ */

socket.on('roomCreated', d => {
    myRole = d.role || 'host'; // sunucudan gelen rolü al
    roomCode = d.roomCode; isHost = true;
    roomCodeDisp.textContent = roomCode;
    statusText.textContent   = t('waiting');
    startBtn.classList.add('hidden');
    showOnly('waiting');
});

socket.on('roomJoined', d => {
    myRole = d.role || 'guest'; // sunucudan gelen rolü al
    roomCode = d.roomCode; pipeSet = d.pipeSet;
    roomCodeDisp.textContent = roomCode;
    statusText.textContent   = t('joined');
    startBtn.classList.add('hidden');
    showOnly('waiting');
});

socket.on('opponentJoined', () => {
    statusText.textContent = t('opponentReady');
    startBtn.classList.remove('hidden');
});

socket.on('countdown', d => startCountdown(d.seconds, d.pipeSet));

socket.on('opponentFlapped', () => {
    if (oppBird) {
        oppBird.vel = FLAP_FORCE;
        oppFlaps++;
        flapAnim(oppAnim);
    }
});

socket.on('scoreUpdated', d => {
    if (d.playerId !== socket.id) {
        oppScore = d.score;
        oppPipes = d.score;
        oppScoreEl.textContent = oppScore;
        triggerBump(oppScoreEl);
    }
});

/* ── Hakkında Modal ──────────────────────────────── */
const aboutModal = document.getElementById('aboutModal');
const aboutBtn   = document.getElementById('aboutBtn');
const modalClose = document.getElementById('modalClose');

function openModal() {
    aboutModal.classList.remove('hidden', 'closing');
    aboutModal.classList.add('opening');
    setTimeout(() => {
        aboutModal.classList.remove('opening');
    }, 350);
}

function closeModal() {
    aboutModal.classList.add('closing');
    setTimeout(() => {
        aboutModal.classList.add('hidden');
        aboutModal.classList.remove('closing');
    }, 320);
}

aboutBtn.onclick = openModal;
modalClose.onclick = closeModal;

aboutModal.onclick = (e) => {
    if (e.target === aboutModal) closeModal();
};

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !aboutModal.classList.contains('hidden')) {
        closeModal();
    }
});

socket.on('opponentDied', () => {
    if (!oppBird || !ctx) return;
    spawnParticles(oppBird.x, oppBird.y, '#cc2222', 18);
    spawnParticles(oppBird.x, oppBird.y, '#ff8800',  8);
    flashColor = '#cc0000'; flashAlpha = 0.35;
});

socket.on('gameEnded', d => {
    gameRunning = false;
    dying       = false;
    cancelAnimationFrame(raf);
    particles  = [];
    flashAlpha = 0;

    showStats(d);
    showOnly('gameOver');

    if (d.winner === socket.id) {
        resultIcon.textContent = '🏆';
        resultText.textContent = t('victory');
        resultText.style.color = '#ff4444';
    } else if (d.winner === 'draw') {
        resultIcon.textContent = '🤝';
        resultText.textContent = t('draw');
        resultText.style.color = '#ff8844';
    } else {
        resultIcon.textContent = '💀';
        resultText.textContent = t('defeat');
        resultText.style.color = '#882222';
    }
});

socket.on('opponentReadyForRestart', () => {
    // Eğer oyun sonu ekranındaysak resultText'i değiştir
    if (!gameOverScreen.classList.contains('hidden')) {
        resultText.textContent = t('opponentWantsRestart');
        resultText.style.color = '#ff8844';
        resultIcon.textContent = '🔄';
    }
    statusText.textContent = t('opponentReadyRestart');
});

socket.on('menuRedirect', () => {
    roomCode = null; isHost = false;
    document.getElementById('joinInput').value = '';
    showOnly('menu');
});

socket.on('opponentLeft', () => { alert('Rakip ayrıldı!'); location.reload(); });
socket.on('error', msg => alert(msg));

/* ══ BUTONLAR ════════════════════════════════════════ */
document.getElementById('createBtn').onclick = () => socket.emit('createRoom');
document.getElementById('joinBtn').onclick   = () => {
    const c = document.getElementById('joinInput').value.trim().toUpperCase();
    if (c) socket.emit('joinRoom', c);
};
startBtn.onclick = () => { if (roomCode) socket.emit('startGame', roomCode); };

document.getElementById('restartBtn').onclick = () => {
    if (!roomCode) return;
    socket.emit('readyToRestart', roomCode);
    resultText.textContent = t('restartWait');
    resultText.style.color = '#ff8844';
    resultIcon.textContent = '⏳';
};
document.getElementById('menuBtn').onclick = () => {
    if (roomCode) socket.emit('backToMenu', roomCode);
    else showOnly('menu');
};

// Ping ölçümü
let pingStart = 0;
let currentPing = 0;

const pingInterval = setInterval(() => {
    if (socket.connected) {
        pingStart = Date.now();
        socket.emit('ping');
    }
}, 2000);

socket.on('pong', () => {
    currentPing = Date.now() - pingStart;
    pingValueEl.textContent = `${currentPing} ms`;
    
    if (currentPing < 80) {
        pingIconEl.textContent = '📶';
        pingValueEl.style.color = '#0f0';
    } else if (currentPing < 150) {
        pingIconEl.textContent = '📶';
        pingValueEl.style.color = '#ff0';
    } else {
        pingIconEl.textContent = '📡';
        pingValueEl.style.color = '#f00';
    }
});
window.addEventListener('beforeunload', () => clearInterval(pingInterval));

// Ses Aç/Kapat
soundToggleBtn.onclick = () => {
    soundEnabled = !soundEnabled;
    soundToggleBtn.textContent = soundEnabled ? '🔊' : '🔇';
};

// Titreşim Aç/Kapat
vibrateToggleBtn.onclick = () => {
    vibrateEnabled = !vibrateEnabled;
    vibrateToggleBtn.textContent = vibrateEnabled ? '📳' : '📴';
    if (!vibrateEnabled && navigator.vibrate) navigator.vibrate(0);
};

// Bilgisayarda titreşim butonunu gizle
if (!('vibrate' in navigator) || !/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    const vibBtn = document.getElementById('vibrateToggleBtn');
    if (vibBtn) vibBtn.style.display = 'none';
}

/* ══ KONTROLLER ══════════════════════════════════════ */
window.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); flap(); }
});
document.addEventListener('click', () => { if (gameRunning) flap(); });
document.addEventListener('touchstart', e => {
    if (gameRunning) { e.preventDefault(); flap(); }
}, { passive: false });

/* ══ DİL DEĞİŞTİRME ═════════════════════════════════ */
const langBtn = document.getElementById('langBtn');
const langMenu = document.getElementById('langMenu');
const langOptions = document.querySelectorAll('.lang-option');

langBtn.onclick = () => {
    langMenu.classList.toggle('hidden');
};

document.addEventListener('click', (e) => {
    if (!langBtn.contains(e.target) && !langMenu.contains(e.target)) {
        langMenu.classList.add('hidden');
    }
});

langOptions.forEach(opt => {
    opt.onclick = () => {
        const newLang = opt.dataset.lang;
        if (newLang === currentLang) {
            langMenu.classList.add('hidden');
            return;
        }
        
        currentLang = newLang;
        localStorage.setItem('lang', currentLang);
        
        langOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        
        updateUILanguage();
        
        langMenu.classList.add('hidden');
    };
});

(function initLangSelection() {
    const selected = document.querySelector(`.lang-option[data-lang="${currentLang}"]`);
    if (selected) {
        langOptions.forEach(o => o.classList.remove('selected'));
        selected.classList.add('selected');
    }
})();

function updateUILanguage() {
    function updatePlaceholder() {
        const joinInput = document.getElementById('joinInput');
        if (joinInput) joinInput.placeholder = t('enterCode');
    }
    updatePlaceholder();

    const st = statusText.textContent;
    if (st.includes('Rakip bekleniyor') || st.includes('Waiting') || st.includes('Warte')) statusText.textContent = t('waiting');
    else if (st.includes('Bağlandı') || st.includes('Connected') || st.includes('Verbunden')) statusText.textContent = t('joined');
    else if (st.includes('Rakip hazır') || st.includes('Opponent ready') || st.includes('Gegner bereit')) statusText.textContent = t('opponentReady');
    else if (st.includes('Rakip hazır, sen') || st.includes('Opponent ready, are') || st.includes('Gegner bereit, bist')) statusText.textContent = t('opponentReadyRestart');

    document.getElementById('createBtn').innerHTML = t('createRoom');
    document.getElementById('joinBtn').textContent = t('joinRoom');
    document.querySelector('.divider span').textContent = t('or');
    document.querySelector('.hint').textContent = t('hint');
    
    document.querySelector('.label').textContent = t('roomCodeLabel');
    document.getElementById('startBtn').innerHTML = t('start');
    
    document.querySelector('.hud-box.you .hud-label').textContent = t('you');
    document.querySelector('.hud-box.opp .hud-label').textContent = t('opponent');
    
    document.getElementById('restartBtn').textContent = t('restart');
    document.getElementById('menuBtn').textContent = t('menu');
    
    const statBoxes = document.querySelectorAll('.stat-box');
    if (statBoxes.length >= 3) {
        statBoxes[0].querySelector('.stat-label').textContent = '🏁 ' + t('pipes');
        statBoxes[1].querySelector('.stat-label').textContent = '🪶 ' + t('flaps');
        statBoxes[2].querySelector('.stat-label').textContent = '⏱️ ' + t('time');
    }
    
    const modalTitle = document.querySelector('.modal-title');
    if (modalTitle) modalTitle.textContent = t('aboutTitle');
    const modalDesc = document.querySelector('.modal-desc');
    if (modalDesc) modalDesc.innerHTML = t('aboutDesc').replace(/\n/g, '<br>');
    
        const rt = resultText.textContent;
    if (rt.includes('ZAFER') || rt.includes('VICTORY') || rt.includes('SIEG')) {
        resultText.textContent = t('victory');
    } else if (rt.includes('YENİLDİN') || rt.includes('DEFEATED') || rt.includes('NIEDERLAGE')) {
        resultText.textContent = t('defeat');
    } else if (rt.includes('BERABERE') || rt.includes('DRAW') || rt.includes('UNENTSCHIEDEN')) {
        resultText.textContent = t('draw');
    } else if (rt.includes('Rakip bekleniyor') || rt.includes('Waiting for opponent') || rt.includes('Warte auf Gegner')) {
        resultText.textContent = t('restartWait');
    } else if (rt.includes('Rakip seninle') || rt.includes('Opponent wants') || rt.includes('Gegner möchte')) {
        resultText.textContent = t('opponentWantsRestart');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateUILanguage();
});
