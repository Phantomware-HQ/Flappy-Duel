const socket = io();

let selectedMap = 'classic';
let myRole = null;

// Kullanıcı adı kontrolü - önce localStorage, yoksa cookie
let username = localStorage.getItem('fd_username');
if (!username) {
    const cookieMatch = document.cookie.match(/fd_username=([^;]+)/);
    if (cookieMatch) {
        username = decodeURIComponent(cookieMatch[1]);
        localStorage.setItem('fd_username', username);
    }
}

const userBadge = document.getElementById('userBadge');
const userBadgeName = document.getElementById('userBadgeName');
const nameModal = document.getElementById('nameModal');
const usernameInput = document.getElementById('usernameInput');
const saveNameBtn = document.getElementById('saveNameBtn');

if (!username) {
    nameModal.style.display = 'flex';
    usernameInput.focus();
} else {
    nameModal.style.display = 'none';
    userBadge.style.display = 'flex';
    userBadgeName.textContent = username;
}

saveNameBtn.onclick = () => {
    const name = usernameInput.value.trim();
    if (name.length < 2) return alert(t('nameTooShort'));
    if (name.length > 16) return alert(t('nameTooLong'));
    
    // İsim kontrolü için server'a sor
    socket.emit('checkUsername', name, (response) => {
        if (!response.available) {
            alert(`❌ "${name}" kullanılıyor! Başka bir isim seç.`);
            usernameInput.value = '';
            usernameInput.focus();
            return;
        }
        
        // İsim müsait, kaydet
        localStorage.setItem('fd_username', name);
        document.cookie = `fd_username=${encodeURIComponent(name)};max-age=2592000;path=/`;
        nameModal.style.display = 'none';
        userBadge.style.display = 'flex';
        userBadgeName.textContent = name;
        
        // İsmini sunucuya bildir
        socket.emit('registerUsername', name);
    });
};

usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveNameBtn.click();
});

// localStorage Skor Yönetimi
function getStats() {
    try { return JSON.parse(localStorage.getItem('fd_stats')) || { wins: 0, losses: 0 }; }
    catch(e) { return { wins: 0, losses: 0 }; }
}

function updateMyStats(result) {
    const stats = getStats();
    if (result === 'win') stats.wins++;
    if (result === 'loss') stats.losses++;
    localStorage.setItem('fd_stats', JSON.stringify(stats));
    const name = localStorage.getItem('fd_username') || 'Unknown';
    socket.emit('shareStats', { name, wins: stats.wins, losses: stats.losses });
}

// Market ve Envanter
const SKINS = {
  default: { id: 'default', name: 'Classic Black', nameTr: 'Klasik Siyah', nameDe: 'Klassik Schwarz', price: 0, color1: '#222222', color2: '#050505', desc: 'Default skin', descTr: 'Varsayılan kostüm', descDe: 'Standard-Skin' },
  golden:  { id: 'golden',  name: 'Golden Eagle', nameTr: 'Altın Kartal', nameDe: 'Goldadler', price: 5, color1: '#ffcc00', color2: '#996600', desc: 'Shine bright', descTr: 'Parlak uç', descDe: 'Glänzender Flug' },
  ice:     { id: 'ice',     name: 'Ice Phoenix', nameTr: 'Buz Zümrüdü', nameDe: 'Eisphönix', price: 5, color1: '#66ccff', color2: '#004488', desc: 'Frozen wings', descTr: 'Donmuş kanatlar', descDe: 'Gefrorene Flügel' },
  toxic:   { id: 'toxic',   name: 'Toxic Slime', nameTr: 'Zehirli Balçık', nameDe: 'Giftschleim', price: 10, color1: '#44ff44', color2: '#004400', desc: 'Radioactive', descTr: 'Radyoaktif', descDe: 'Radioaktiv' },
  lava:    { id: 'lava',    name: 'Lava Hawk', nameTr: 'Lav Şahini', nameDe: 'Lavafalke', price: 10, color1: '#ff4400', color2: '#661100', desc: 'Born from fire', descTr: 'Ateşten doğdu', descDe: 'Aus Feuer geboren' },
  ghost:   { id: 'ghost',   name: 'Ghost Bird', nameTr: 'Hayalet Kuş', nameDe: 'Geistervogel', price: 15, color1: '#ccbbff', color2: '#332255', desc: 'Spooky flight', descTr: 'Ürkütücü uçuş', descDe: 'Gruseliger Flug' },
  neon:    { id: 'neon',    name: 'Neon Flash', nameTr: 'Neon Işıltı', nameDe: 'Neonblitz', price: 20, color1: '#ff00ff', color2: '#550055', desc: '80s vibes', descTr: '80ler havası', descDe: '80er Vibes' },
  rainbow: { id: 'rainbow', name: 'Rainbow God', nameTr: 'Gökkuşağı Tanrısı', nameDe: 'Regenbogengott', price: 50, color1: '#ff0000', color2: '#0000ff', desc: 'Legendary', descTr: 'Efsanevi', descDe: 'Legendär', rainbow: true }
};

function getCoins() { return parseInt(localStorage.getItem('fd_coins') || '0'); }
function addCoins(amount) { localStorage.setItem('fd_coins', getCoins() + amount); }
function spendCoins(amount) { localStorage.setItem('fd_coins', getCoins() - amount); }
function getOwnedSkins() { try { return JSON.parse(localStorage.getItem('fd_owned') || '["default"]'); } catch(e) { return ['default']; } }
function ownSkin(skinId) { const skins = getOwnedSkins(); if (!skins.includes(skinId)) { skins.push(skinId); localStorage.setItem('fd_owned', JSON.stringify(skins)); } }
function getActiveSkin() { return localStorage.getItem('fd_activeSkin') || 'default'; }
function setActiveSkin(skinId) { localStorage.setItem('fd_activeSkin', skinId); }
function getSkinName(skinId) { const skin = SKINS[skinId] || SKINS['default']; if (currentLang === 'tr') return skin.nameTr || skin.name; if (currentLang === 'de') return skin.nameDe || skin.name; return skin.name; }
function getSkinDesc(skinId) { const skin = SKINS[skinId] || SKINS['default']; if (currentLang === 'tr') return skin.descTr || skin.desc; if (currentLang === 'de') return skin.descDe || skin.desc; return skin.desc; }

// Çeviri Sistemi
const translations = {
  en: {
    createRoom: '✦ Create Room', joinRoom: 'Join', or: 'or',
    roomCodeLabel: 'ROOM CODE', waiting: 'Waiting for opponent…', opponentWantsRestart: 'Opponent wants to play again!',
    start: '▶ START', you: 'YOU', opponent: 'OPPONENT', victory: 'VICTORY!', defeat: 'DEFEATED', draw: 'DRAW',
    restart: 'Play Again', menu: 'Main Menu', pipes: 'Pipes', flaps: 'Flaps', time: 'Time',
    aboutTitle: 'ABOUT', aboutDesc: 'Two players, same pipes, same time! Pass pipes, score more than your opponent.',
    loading: '-- ms', restartWait: 'Waiting for opponent…', enterCode: 'ENTER CODE',
    joined: '✅ Connected! Host will start…', opponentReady: '🎮 Opponent ready!', opponentReadyRestart: 'Opponent ready, are you?',
    market: '🛒 Market', coins: 'Coins', buy: 'Buy', use: 'Equip', owned: '✅ Owned', equipped: 'Equipped',
    price: 'Price', free: 'Free', notEnoughCoins: 'Not enough coins!', purchased: 'Purchased!', marketTitle: 'MARKET',
    developer: 'DEVELOPER', vfxArtist: 'VFX ARTIST', version: 'VERSION', engine: 'ENGINE',
    madeWith: 'MADE WITH', by: 'BY',
    copied: '✅ Copied!',
    coinEarned: 'You earned', coinLost: 'You lost', coins: 'coins',
    opponentLeft: 'Opponent left!',
    mapSelect: 'SELECT MAP', mapClassic: '🔥 Classic', mapForest: '🌲 Forest', mapIce: '❄️ Ice',
    enterName: 'ENTER NAME', save: 'Save', leaderboardTitle: 'LEADERBOARD',
    nameTooShort: 'At least 2 characters!', nameTooLong: 'Max 16 characters!',
    lbName: 'Name', resetConfirm: 'Reset all your data?', noPlayers: 'No players yet',
  },
  tr: {
    createRoom: '✦ Oda Oluştur', joinRoom: 'Katıl', or: 'veya',
    roomCodeLabel: 'ODA KODU', waiting: 'Rakip bekleniyor…', opponentWantsRestart: 'Rakip seninle tekrar oynamak istiyor!',
    start: '▶ BAŞLAT', you: 'SEN', opponent: 'RAKİP', victory: 'ZAFER!', defeat: 'YENİLDİN', draw: 'BERABERE',
    restart: 'Tekrar Oyna', menu: 'Ana Menü', pipes: 'Boru', flaps: 'Zıplama', time: 'Süre',
    aboutTitle: 'HAKKINDA', aboutDesc: 'İki oyuncu, aynı borular, aynı anda mücadele! Boruları geç, rakibinden daha çok skor yap.',
    loading: '-- ms', restartWait: 'Rakip bekleniyor…', enterCode: 'KOD GİR',
    joined: '✅ Bağlandı! Host başlatacak…', opponentReady: '🎮 Rakip hazır!', opponentReadyRestart: 'Rakip hazır, sen de hazır mısın?',
    market: '🛒 Market', coins: 'Para', buy: 'Satın Al', use: 'Kuşan', owned: '✅ Sahip', equipped: 'Kuşanıldı',
    price: 'Fiyat', free: 'Ücretsiz', notEnoughCoins: 'Yetersiz para!', purchased: 'Satın alındı!', marketTitle: 'MARKET',
    developer: 'GELİŞTİRİCİ', vfxArtist: 'VFX SANATÇISI', version: 'SÜRÜM', engine: 'MOTOR',
    madeWith: 'YAPIM', by: 'TARAFINDAN',
    copied: '✅ Kopyalandı!', opponentLeft: 'Rakip ayrıldı!',
    coinEarned: 'Kazandın', coinLost: 'Kaybettin', coins: 'coin',
    mapSelect: 'HARİTA SEÇ', mapClassic: '🔥 Klasik', mapForest: '🌲 Orman', mapIce: '❄️ Buz',
    enterName: 'İSİM GİR', save: 'Kaydet', leaderboardTitle: 'SKOR TABLOSU',
    nameTooShort: 'En az 2 karakter!', nameTooLong: 'En fazla 16 karakter!',
    lbName: 'İsim', resetConfirm: 'Tüm verilerini sıfırlamak istiyor musun?', noPlayers: 'Henüz oyuncu yok',
  },
  de: {
    createRoom: '✦ Raum erstellen', joinRoom: 'Beitreten', or: 'oder',
    roomCodeLabel: 'RAUMCODE', waiting: 'Warte auf Gegner…', opponentWantsRestart: 'Gegner möchte erneut spielen!',
    start: '▶ START', you: 'DU', opponent: 'GEGNER', victory: 'SIEG!', defeat: 'NIEDERLAGE', draw: 'UNENTSCHIEDEN',
    restart: 'Erneut spielen', menu: 'Hauptmenü', pipes: 'Röhren', flaps: 'Flügelschläge', time: 'Zeit',
    aboutTitle: 'ÜBER', aboutDesc: 'Zwei Spieler, gleiche Röhren, gleiche Zeit! Passiere Röhren, erziele mehr Punkte als dein Gegner.',
    loading: '-- ms', restartWait: 'Warte auf Gegner…', enterCode: 'CODE EINGEBEN',
    joined: '✅ Verbunden! Host startet…', opponentReady: '🎮 Gegner bereit!', opponentReadyRestart: 'Gegner bereit, bist du bereit?',
    market: '🛒 Markt', coins: 'Münzen', buy: 'Kaufen', use: 'Ausrüsten', owned: '✅ Besitzt', equipped: 'Ausgerüstet',
    price: 'Preis', free: 'Kostenlos', notEnoughCoins: 'Nicht genug Münzen!', purchased: 'Gekauft!', marketTitle: 'MARKT',
    developer: 'ENTWICKLER', vfxArtist: 'VFX-KÜNSTLER', version: 'VERSION', engine: 'ENGINE',
    madeWith: 'GEMACHT MIT', by: 'VON',
    copied: '✅ Kopiert!', opponentLeft: 'Gegner hat das Spiel verlassen!',
    coinEarned: 'Du hast', coinLost: 'Du hast', coins: 'Münzen',
    mapSelect: 'KARTE WÄHLEN', mapClassic: '🔥 Klassik', mapForest: '🌲 Wald', mapIce: '❄️ Eis',
    enterName: 'NAME EINGEBEN', save: 'Speichern', leaderboardTitle: 'BESTENLISTE',
    nameTooShort: 'Mindestens 2 Zeichen!', nameTooLong: 'Maximal 16 Zeichen!',
    lbName: 'Name', resetConfirm: 'Alle Daten zurücksetzen?', noPlayers: 'Noch keine Spieler',
  }
};

let currentLang = localStorage.getItem('lang') || 'en';
function t(key) { return translations[currentLang]?.[key] || translations.en[key] || key; }

// DOM
const menu = document.getElementById('menu');
const mapSelectEl = document.getElementById('mapSelect');
const waiting = document.getElementById('waiting');
const gameScreen = document.getElementById('game');
const gameOverScreen = document.getElementById('gameOver');
const roomCodeDisp = document.getElementById('roomCodeDisplay');
const statusText = document.getElementById('statusText');
const startBtn = document.getElementById('startBtn');
const myScoreEl = document.getElementById('myScore');
const oppScoreEl = document.getElementById('opponentScore');
const resultText = document.getElementById('resultText');
const resultIcon = document.getElementById('resultIcon');
const countdownEl = document.getElementById('countdownDisplay');
let soundEnabled = true;
let vibrateEnabled = true;
const soundToggleBtn = document.getElementById('soundToggleBtn');
const vibrateToggleBtn = document.getElementById('vibrateToggleBtn');
const pingValueEl = document.getElementById('pingValue');
const pingIconEl = document.getElementById('pingIcon');
const statMyPipes = document.getElementById('statMyPipes');
const statOppPipes = document.getElementById('statOppPipes');
const statMyFlaps = document.getElementById('statMyFlaps');
const statOppFlaps = document.getElementById('statOppFlaps');
const statMyTime = document.getElementById('statMyTime');
const statOppTime = document.getElementById('statOppTime');

// Fizik
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const GRAVITY = isMobile ? 0.25 : 0.04;
const FLAP_FORCE = isMobile ? -4.0 : -2.5;
const MAX_VEL = 7;
const PIPE_W = 68;
const PIPE_GAP = 188;
const PIPE_SPEED = isMobile ? 6.5 : 1.5;
const BIRD_R = 15;

let canvas, ctx;
let myBird, oppBird;
let pipes = [];
let gameRunning = false;
let myScore = 0, oppScore = 0;
let roomCode = null;
let isHost = false;
let raf = null;
let pipeSet = null;
let myFlaps = 0, oppFlaps = 0;
let myPipes = 0, oppPipes = 0;
let myAliveMs = 0, oppAliveMs = 0;
let gameStartTime = 0;
let myDiedTime = 0;
let particles = [];
let flashAlpha = 0;
let flashColor = '#ffffff';
let dying = false;
let dyingTimer = 0;
let stars = [];

function initStars() {
    stars = [];
    for (let i = 0; i < 60; i++) stars.push({ x: Math.random() * 800, y: Math.random() * 440, r: 0.6 + Math.random() * 1.2, speed: 0.1 + Math.random() * 0.15, alpha: 0.2 + Math.random() * 0.4 });
    for (let i = 0; i < 35; i++) stars.push({ x: Math.random() * 800, y: Math.random() * 440, r: 1 + Math.random() * 1.5, speed: 0.25 + Math.random() * 0.2, alpha: 0.3 + Math.random() * 0.5 });
    for (let i = 0; i < 20; i++) stars.push({ x: Math.random() * 800, y: Math.random() * 440, r: 1.5 + Math.random() * 2, speed: 0.45 + Math.random() * 0.25, alpha: 0.5 + Math.random() * 0.5 });
}
function drawStars() {
    stars.forEach(s => {
        s.x -= s.speed;
        if (s.x + s.r < 0) { s.x = canvas.width + s.r; s.y = Math.random() * canvas.height; }
        ctx.save(); ctx.globalAlpha = s.alpha; ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ff4444'; ctx.shadowBlur = s.r * 2;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });
}
function makeBirdAnim() { return { wingAngle: 0, wingDir: -1, rotation: 0 }; }
let myAnim, oppAnim;
function updateBirdAnim(anim, vel) {
    const targetRot = Math.max(-0.4, Math.min(0.8, vel * 0.07));
    anim.rotation += (targetRot - anim.rotation) * 0.18;
    anim.wingAngle += anim.wingDir * 0.12;
    if (anim.wingAngle <= 0) { anim.wingAngle = 0; anim.wingDir = 1; }
    if (anim.wingAngle >= 1) { anim.wingAngle = 1; anim.wingDir = -1; }
}
function flapAnim(anim) { anim.wingAngle = 1; anim.wingDir = -1; }

let audioCtx = null;
function getAC() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
function playFlap() { if (!soundEnabled) return; try { const ac = getAC(); const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.type = 'sine'; o.frequency.setValueAtTime(520, ac.currentTime); o.frequency.exponentialRampToValueAtTime(280, ac.currentTime + 0.12); g.gain.setValueAtTime(0.18, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.13); o.start(); o.stop(ac.currentTime + 0.13); } catch(e) {} }
function playScore() { if (!soundEnabled) return; try { const ac = getAC(); const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.type = 'triangle'; o.frequency.setValueAtTime(880, ac.currentTime); o.frequency.setValueAtTime(1100, ac.currentTime + 0.06); g.gain.setValueAtTime(0.22, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2); o.start(); o.stop(ac.currentTime + 0.2); } catch(e) {} }
function playDeath() { if (!soundEnabled) return; try { const ac = getAC(); const bufSize = ac.sampleRate * 0.5; const buf = ac.createBuffer(1, bufSize, ac.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1; const ns = ac.createBufferSource(); ns.buffer = buf; const ng = ac.createGain(); ng.gain.setValueAtTime(0.4, ac.currentTime); ng.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5); ns.connect(ng); ng.connect(ac.destination); ns.start(); ns.stop(ac.currentTime + 0.5); const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.type = 'sawtooth'; o.frequency.setValueAtTime(200, ac.currentTime); o.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.5); g.gain.setValueAtTime(0.3, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5); o.start(); o.stop(ac.currentTime + 0.5); } catch(e) {} }
function playBeep(loud) { if (!soundEnabled) return; try { const ac = getAC(); const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.type = 'sine'; o.frequency.setValueAtTime(loud ? 1200 : 700, ac.currentTime); g.gain.setValueAtTime(0.25, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (loud ? 0.4 : 0.18)); o.start(); o.stop(ac.currentTime + (loud ? 0.4 : 0.18)); } catch(e) {} }

function spawnParticles(x, y, color, count) { for (let i = 0; i < count; i++) { const angle = Math.random() * Math.PI * 2; const speed = 2 + Math.random() * 5; particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1.5, r: 2 + Math.random() * 4, color, alpha: 1, decay: 0.018 + Math.random() * 0.02 }); } }
function drawParticles() { for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.vx *= 0.97; p.alpha -= p.decay; if (p.alpha <= 0) { particles.splice(i, 1); continue; } ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }

function drawBG() {
    if (selectedMap === 'forest') { const g = ctx.createLinearGradient(0, 0, 0, canvas.height); g.addColorStop(0, '#0a1a0a'); g.addColorStop(0.5, '#0d2a0d'); g.addColorStop(1, '#061206'); ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = 'rgba(0,180,0,0.2)'; ctx.fillRect(0, canvas.height - 3, canvas.width, 3); }
    else if (selectedMap === 'ice') { const g = ctx.createLinearGradient(0, 0, 0, canvas.height); g.addColorStop(0, '#0a1628'); g.addColorStop(0.5, '#0d2040'); g.addColorStop(1, '#060e1a'); ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = 'rgba(100,180,255,0.2)'; ctx.fillRect(0, canvas.height - 3, canvas.width, 3); }
    else { const g = ctx.createLinearGradient(0, 0, 0, canvas.height); g.addColorStop(0, '#0a0303'); g.addColorStop(0.5, '#120505'); g.addColorStop(1, '#0d0202'); ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = 'rgba(180,0,0,0.2)'; ctx.fillRect(0, canvas.height - 3, canvas.width, 3); }
    drawStars();
}
function drawPipes() {
    pipes.forEach(p => {
        let pipeColor1, pipeColor2, pipeRim, strokeColor;
        if (selectedMap === 'forest') { pipeColor1 = '#1a3a1a'; pipeColor2 = '#2a5a2a'; pipeRim = '#3a6a3a'; strokeColor = 'rgba(0,180,0,0.4)'; }
        else if (selectedMap === 'ice') { pipeColor1 = '#1a2a4a'; pipeColor2 = '#2a4a6a'; pipeRim = '#3a5a8a'; strokeColor = 'rgba(100,180,255,0.4)'; }
        else { pipeColor1 = '#2a0505'; pipeColor2 = '#500a0a'; pipeRim = '#6a1010'; strokeColor = 'rgba(220,40,40,0.4)'; }
        const g1 = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0); g1.addColorStop(0, pipeColor1); g1.addColorStop(0.5, pipeColor2); g1.addColorStop(1, pipeColor1); ctx.fillStyle = g1; ctx.fillRect(p.x, 0, PIPE_W, p.top - 12);
        ctx.fillStyle = pipeRim; ctx.fillRect(p.x - 6, p.top - 26, PIPE_W + 12, 26); ctx.strokeStyle = strokeColor; ctx.lineWidth = 1.5; ctx.strokeRect(p.x - 6, p.top - 26, PIPE_W + 12, 26);
        const bY = p.top + PIPE_GAP;
        const g2 = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0); g2.addColorStop(0, pipeColor1); g2.addColorStop(0.5, pipeColor2); g2.addColorStop(1, pipeColor1); ctx.fillStyle = g2; ctx.fillRect(p.x, bY + 14, PIPE_W, canvas.height - bY - 14);
        ctx.fillStyle = pipeRim; ctx.fillRect(p.x - 6, bY, PIPE_W + 12, 26); ctx.strokeStyle = strokeColor; ctx.lineWidth = 1.5; ctx.strokeRect(p.x - 6, bY, PIPE_W + 12, 26);
    });
}

function drawBird(b, anim, isOpp) {
    let skinId = isOpp ? 'default' : getActiveSkin();
    const skin = SKINS[skinId] || SKINS['default'];
    let c1 = skin.color1, c2 = skin.color2;
    if (skin.rainbow && !isOpp) { const hue = (Date.now() / 10) % 360; c1 = `hsl(${hue}, 100%, 50%)`; c2 = `hsl(${(hue + 30) % 360}, 100%, 30%)`; }
    if (isOpp) { c1 = '#cc2222'; c2 = '#5a0000'; }
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(anim.rotation);
    ctx.shadowColor = isOpp ? '#cc2222' : c1; ctx.shadowBlur = 20;
    const gr = ctx.createRadialGradient(-4, -4, 2, 0, 0, b.r + 4); gr.addColorStop(0, c1); gr.addColorStop(1, c2); ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    const wingH = 4 + anim.wingAngle * 7;
    ctx.fillStyle = isOpp ? 'rgba(200,50,50,0.55)' : 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.ellipse(-6, 2 - anim.wingAngle * 5, 9, wingH, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(5, -4, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(7, -5, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(9, -7, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e07000'; ctx.beginPath(); ctx.moveTo(16, -3); ctx.lineTo(26, -1); ctx.lineTo(16, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
}
function drawFlash() { if (flashAlpha <= 0) return; ctx.save(); ctx.globalAlpha = flashAlpha; ctx.fillStyle = flashColor; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore(); flashAlpha -= 0.04; if (flashAlpha < 0) flashAlpha = 0; }

function showCoinChange(amount) {
    const rt = document.getElementById('resultText');
    const coinMsg = document.createElement('div');
    coinMsg.id = 'coinChangeMsg';
    coinMsg.style.cssText = `font-size: 1.2rem; font-weight: 700; margin-top: -5px; animation: fadeInUp 0.5s ease-out; color: ${amount >= 0 ? '#ffcc00' : '#ff4444'};`;
    coinMsg.textContent = amount >= 0 ? `🪙 ${t('coinEarned')} +${amount} ${t('coins')}!` : `🪙 ${t('coinLost')} ${amount} ${t('coins')}!`;
    const oldMsg = document.getElementById('coinChangeMsg'); if (oldMsg) oldMsg.remove();
    rt.parentElement.insertBefore(coinMsg, rt.nextSibling);
}

function mainLoop() {
    if (!gameRunning && !dying) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height); drawBG(); drawPipes();
    if (gameRunning) {
        myBird.vel = Math.min(myBird.vel + GRAVITY, MAX_VEL); myBird.y += myBird.vel;
        oppBird.vel = Math.min(oppBird.vel + GRAVITY, MAX_VEL); oppBird.y += oppBird.vel;
        updateBirdAnim(myAnim, myBird.vel); updateBirdAnim(oppAnim, oppBird.vel);
        for (let i = pipes.length - 1; i >= 0; i--) {
            const p = pipes[i]; p.x -= PIPE_SPEED;
            if (!p.passed && p.x + PIPE_W < myBird.x) { p.passed = true; myScore++; myPipes++; myScoreEl.textContent = myScore; triggerBump(myScoreEl); playScore(); socket.emit('scoreUpdate', roomCode); }
            if (myBird.x + myBird.r > p.x && myBird.x - myBird.r < p.x + PIPE_W) { if (myBird.y - myBird.r < p.top || myBird.y + myBird.r > p.top + PIPE_GAP) { killMyBird(); return; } }
            if (p.x + PIPE_W < 0) pipes.splice(i, 1);
        }
        if (myBird.y + myBird.r > canvas.height || myBird.y - myBird.r < 0) { killMyBird(); return; }
    }
    const iAmHost = (myRole === 'host');
    drawBird(myBird, myAnim, !iAmHost); drawBird(oppBird, oppAnim, iAmHost);
    drawParticles(); drawFlash();
    if (dying) { dyingTimer++; if (dyingTimer > 50 || (particles.length === 0 && flashAlpha <= 0)) { dying = false; myDiedTime = Date.now(); socket.emit('gameOver', roomCode); return; } }
    raf = requestAnimationFrame(mainLoop);
}
function killMyBird() { if (dying) return; if (vibrateEnabled && navigator.vibrate) navigator.vibrate(100); gameRunning = false; dying = true; dyingTimer = 0; myDiedTime = Date.now(); cancelAnimationFrame(raf); playDeath(); flashColor = '#ffffff'; flashAlpha = 0.65; spawnParticles(myBird.x, myBird.y, '#ff4444', 20); spawnParticles(myBird.x, myBird.y, '#ffaa00', 12); spawnParticles(myBird.x, myBird.y, '#ffffff', 8); raf = requestAnimationFrame(mainLoop); }
function triggerBump(el) { el.classList.remove('score-bump'); void el.offsetWidth; el.classList.add('score-bump'); }
function flap() { if (!gameRunning) return; myBird.vel = FLAP_FORCE; myFlaps++; flapAnim(myAnim); playFlap(); socket.emit('flap', roomCode); }
function showOnly(id) { const screens = ['menu', 'mapSelect', 'waiting', 'game', 'gameOver']; const currentVisible = screens.find(s => !document.getElementById(s).classList.contains('hidden')); if (currentVisible === id) return; const nextEl = document.getElementById(id); if (currentVisible) { const currentEl = document.getElementById(currentVisible); currentEl.classList.add('fade-out'); currentEl.addEventListener('animationend', function handler() { currentEl.removeEventListener('animationend', handler); currentEl.classList.add('hidden'); currentEl.classList.remove('fade-out'); if (nextEl) { nextEl.classList.remove('hidden'); nextEl.classList.add('fade-in'); nextEl.addEventListener('animationend', function handler2() { nextEl.removeEventListener('animationend', handler2); nextEl.classList.remove('fade-in'); }); } }); } else if (nextEl) { nextEl.classList.remove('hidden'); nextEl.classList.add('fade-in'); nextEl.addEventListener('animationend', function handler() { nextEl.removeEventListener('animationend', handler); nextEl.classList.remove('fade-in'); }); } }
function initCanvas() { canvas = document.getElementById('gameCanvas'); ctx = canvas.getContext('2d'); const mid = canvas.height / 2; myBird = { x: 110, y: mid, vel: 0, r: BIRD_R }; oppBird = { x: 110, y: mid, vel: 0, r: BIRD_R }; myAnim = makeBirdAnim(); oppAnim = makeBirdAnim(); particles = []; flashAlpha = 0; dying = false; dyingTimer = 0; initStars(); }
function buildPipes(set) { const list = []; let x = canvas.width + 60; set.forEach(s => { list.push({ x, top: s.top, passed: false }); x += 275; }); return list; }
function startCountdown(seconds, ps) { if (raf) { cancelAnimationFrame(raf); raf = null; } gameRunning = false; pipeSet = ps; showOnly('game'); initCanvas(); pipes = buildPipes(pipeSet); myScore = 0; oppScore = 0; myFlaps = 0; oppFlaps = 0; myPipes = 0; oppPipes = 0; myAliveMs = 0; oppAliveMs = 0; myDiedTime = 0; myScoreEl.textContent = '0'; oppScoreEl.textContent = '0'; countdownEl.classList.remove('hidden'); let c = seconds; countdownEl.textContent = c; playBeep(false); const iv = setInterval(() => { c--; if (c > 0) { countdownEl.textContent = c; playBeep(false); } else { countdownEl.textContent = 'GO!'; playBeep(true); } }, 1000); setTimeout(() => { clearInterval(iv); countdownEl.classList.add('hidden'); gameStartTime = Date.now(); if (myBird) myBird.vel = 0; if (oppBird) oppBird.vel = 0; gameRunning = true; raf = requestAnimationFrame(mainLoop); }, seconds * 1000); }
function showStats(endData) { const now = Date.now(); myAliveMs = myDiedTime ? myDiedTime - gameStartTime : now - gameStartTime; statMyPipes.textContent = myPipes; statOppPipes.textContent = oppPipes; statMyFlaps.textContent = myFlaps; statOppFlaps.textContent = endData.oppFlaps ?? oppFlaps; statMyTime.textContent = ((myAliveMs / 1000) | 0) + 's'; statOppTime.textContent = ((endData.oppAliveMs / 1000) | 0) + 's'; }

// Socket Olayları
socket.on('roomCreated', d => { myRole = d.role || 'host'; roomCode = d.roomCode; isHost = true; roomCodeDisp.textContent = roomCode; statusText.textContent = t('waiting'); startBtn.classList.add('hidden'); showOnly('waiting'); });
socket.on('roomJoined', d => { myRole = d.role || 'guest'; roomCode = d.roomCode; pipeSet = d.pipeSet; selectedMap = d.map || 'classic'; roomCodeDisp.textContent = roomCode; statusText.textContent = t('joined'); startBtn.classList.add('hidden'); showOnly('waiting'); });
socket.on('opponentJoined', () => { statusText.textContent = t('opponentReady'); startBtn.classList.remove('hidden'); if (isHost) { waiting.classList.add('host-glow'); } });
socket.on('countdown', d => { if (isHost && waiting.classList.contains('host-glow')) { waiting.classList.remove('host-glow'); } selectedMap = d.map || 'classic'; startCountdown(d.seconds, d.pipeSet); });
socket.on('opponentFlapped', () => { if (oppBird) { oppBird.vel = FLAP_FORCE; oppFlaps++; flapAnim(oppAnim); } });
socket.on('scoreUpdated', d => { if (d.playerId !== socket.id) { oppScore = d.score; oppPipes = d.score; oppScoreEl.textContent = oppScore; triggerBump(oppScoreEl); } });

// Hakkında Modal
const aboutModal = document.getElementById('aboutModal'); const aboutBtn = document.getElementById('aboutBtn'); const modalClose = document.getElementById('modalClose');
function openModal() { aboutModal.classList.remove('hidden', 'closing'); aboutModal.classList.add('opening'); setTimeout(() => aboutModal.classList.remove('opening'), 350); }
function closeModal() { aboutModal.classList.add('closing'); setTimeout(() => { aboutModal.classList.add('hidden'); aboutModal.classList.remove('closing'); }, 320); }
aboutBtn.onclick = openModal; modalClose.onclick = closeModal; aboutModal.onclick = (e) => { if (e.target === aboutModal) closeModal(); };
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !aboutModal.classList.contains('hidden')) closeModal(); });

socket.on('opponentDied', () => { if (!oppBird || !ctx) return; spawnParticles(oppBird.x, oppBird.y, '#cc2222', 18); spawnParticles(oppBird.x, oppBird.y, '#ff8800', 8); flashColor = '#cc0000'; flashAlpha = 0.35; });
socket.on('gameEnded', d => {
    gameRunning = false; dying = false; cancelAnimationFrame(raf); particles = []; flashAlpha = 0;
    showStats(d); showOnly('gameOver');
    let coinChange = 0;
    if (d.winner === socket.id) { resultIcon.textContent = '🏆'; resultText.textContent = t('victory'); resultText.style.color = '#3ddc84'; gameOverScreen.style.background = '#0a1a0a'; gameOverScreen.style.borderColor = 'rgba(0,180,0,0.5)'; gameOverScreen.style.boxShadow = '0 0 40px rgba(0,180,0,0.3), 0 8px 40px rgba(0,0,0,0.7)'; addCoins(2); coinChange = 2; updateMyStats('win'); }
    else if (d.winner === 'draw') { resultIcon.textContent = '🤝'; resultText.textContent = t('draw'); resultText.style.color = '#ffaa00'; gameOverScreen.style.background = '#1a0f00'; gameOverScreen.style.borderColor = 'rgba(255,136,0,0.5)'; gameOverScreen.style.boxShadow = '0 0 40px rgba(255,136,0,0.3), 0 8px 40px rgba(0,0,0,0.7)'; addCoins(1); coinChange = 1; updateMyStats('draw'); }
    else { resultIcon.textContent = '💀'; resultText.textContent = t('defeat'); resultText.style.color = '#ff4444'; gameOverScreen.style.background = '#1a0a0a'; gameOverScreen.style.borderColor = 'rgba(200,20,20,0.5)'; gameOverScreen.style.boxShadow = '0 0 40px rgba(200,20,20,0.3), 0 8px 40px rgba(0,0,0,0.7)'; spendCoins(1); coinChange = -1; updateMyStats('loss'); }
    showCoinChange(coinChange);
});
socket.on('opponentReadyForRestart', () => { if (!gameOverScreen.classList.contains('hidden')) { resultText.textContent = t('opponentWantsRestart'); resultText.style.color = '#ff8844'; resultIcon.textContent = '🔄'; } statusText.textContent = t('opponentReadyRestart'); });
socket.on('menuRedirect', () => { roomCode = null; isHost = false; document.getElementById('joinInput').value = ''; showOnly('menu'); });
socket.on('opponentLeft', () => { alert(t('opponentLeft')); if (!menu.classList.contains('hidden')) return; showOnly('menu'); });
socket.on('error', msg => alert(msg));

// Oda kodu kopyalama
roomCodeDisp.style.cursor = 'pointer'; roomCodeDisp.title = 'Kopyalamak için tıkla';
roomCodeDisp.onclick = () => { const code = roomCodeDisp.textContent; if (!code || code === '------') return; navigator.clipboard.writeText(code).then(() => { showCopyToast(); }).catch(() => { const input = document.createElement('input'); input.value = code; document.body.appendChild(input); input.select(); document.execCommand('copy'); document.body.removeChild(input); showCopyToast(); }); };
function showCopyToast() { const oldToast = document.querySelector('.copy-toast'); if (oldToast) oldToast.remove(); const rect = roomCodeDisp.getBoundingClientRect(); const toast = document.createElement('div'); toast.className = 'copy-toast'; toast.textContent = t('copied'); toast.style.position = 'fixed'; toast.style.left = rect.left + rect.width / 2 + 'px'; toast.style.top = rect.top - 10 + 'px'; toast.style.transform = 'translateX(-50%)'; toast.style.zIndex = '9999'; document.body.appendChild(toast); toast.addEventListener('animationend', () => { toast.remove(); }); }

// Butonlar
document.getElementById('createBtn').onclick = () => { document.querySelectorAll('.map-option').forEach(o => o.classList.remove('selected')); showOnly('mapSelect'); document.querySelectorAll('.map-option').forEach(opt => { opt.onclick = () => { document.querySelectorAll('.map-option').forEach(o => o.classList.remove('selected')); opt.classList.add('selected'); selectedMap = opt.dataset.map; socket.emit('createRoom', { map: selectedMap }); }; }); };
document.getElementById('joinBtn').onclick = () => { const c = document.getElementById('joinInput').value.trim().toUpperCase(); if (c) socket.emit('joinRoom', c); };
startBtn.onclick = () => { if (roomCode) socket.emit('startGame', roomCode); };
document.getElementById('restartBtn').onclick = () => { if (!roomCode) return; socket.emit('readyToRestart', roomCode); resultText.textContent = t('restartWait'); resultText.style.color = '#ff8844'; resultIcon.textContent = '⏳'; };
document.getElementById('menuBtn').onclick = () => { if (roomCode) socket.emit('backToMenu', roomCode); else showOnly('menu'); };



// Scoreboard (localStorage tabanlı)
const leaderboardModal = document.getElementById('leaderboardModal');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardClose = document.getElementById('leaderboardClose');
const leaderboardList = document.getElementById('leaderboardList');
// remoteStats'u localStorage'dan yükle
let remoteStats = {};
try {
    const saved = localStorage.getItem('fd_remoteStats');
    if (saved) remoteStats = JSON.parse(saved);
} catch(e) {
    remoteStats = {};
}

function saveRemoteStats() {
    localStorage.setItem('fd_remoteStats', JSON.stringify(remoteStats));
}

function openLeaderboard() {
    leaderboardModal.classList.remove('hidden', 'closing');
    leaderboardModal.classList.add('opening');
    setTimeout(() => { leaderboardModal.classList.remove('opening'); }, 350);
    socket.emit('requestAllStats');
    renderLocalLeaderboard();
}
function closeLeaderboard() {
    leaderboardModal.classList.add('closing');
    setTimeout(() => { leaderboardModal.classList.add('hidden'); leaderboardModal.classList.remove('closing'); }, 320);
}
leaderboardBtn.onclick = openLeaderboard;
leaderboardClose.onclick = closeLeaderboard;
leaderboardModal.onclick = (e) => { if (e.target === leaderboardModal) closeLeaderboard(); };
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !leaderboardModal.classList.contains('hidden')) closeLeaderboard(); });

socket.on('playerStats', (data) => {
    remoteStats[data.name] = { wins: data.wins, losses: data.losses };
    saveRemoteStats(); // localStorage'a kaydet
    renderLocalLeaderboard();
});

socket.on('requestStatsReply', () => {
    const myStats = getStats();
    const myName = localStorage.getItem('fd_username') || 'Unknown';
    socket.emit('shareStats', { name: myName, wins: myStats.wins, losses: myStats.losses });
});

function renderLocalLeaderboard() {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '';
    
    const myName = localStorage.getItem('fd_username') || 'Unknown';
    const myStats = getStats();
    const allPlayers = [];
    
    // Önce remoteStats'taki her oyuncuyu ekle
    for (const [name, stats] of Object.entries(remoteStats)) {
        allPlayers.push({ name, wins: stats.wins, losses: stats.losses });
    }
    
    // Kendi istatistiklerini ekle (eğer remoteStats'ta yoksa)
    const existing = allPlayers.find(p => p.name === myName);
    if (!existing && myName !== 'Unknown') {
        allPlayers.push({ name: myName, wins: myStats.wins, losses: myStats.losses });
    }
    
    // Aynı isimleri birleştir (güvenlik için)
    const uniquePlayers = new Map();
    allPlayers.forEach(p => {
        if (uniquePlayers.has(p.name)) {
            const existing = uniquePlayers.get(p.name);
            existing.wins += p.wins;
            existing.losses += p.losses;
        } else {
            uniquePlayers.set(p.name, { wins: p.wins, losses: p.losses });
        }
    });
    
    // Map'ten array'e çevir
    const finalPlayers = Array.from(uniquePlayers.entries()).map(([name, stats]) => ({
        name,
        wins: stats.wins,
        losses: stats.losses
    }));
    
    finalPlayers.sort((a, b) => b.wins - a.wins);
    
    if (finalPlayers.length === 0) {
        leaderboardList.innerHTML = `<div style="text-align:center; color:var(--muted); padding:20px;">${t('noPlayers')}</div>`;
        return;
    }
    
    const header = document.createElement('div');
    header.style.cssText = 'display:flex; padding:10px 16px; font-weight:700; font-size:0.75rem; letter-spacing:1px; color:var(--muted); border-bottom:1px solid var(--border);';
    header.innerHTML = `<span style="width:40px;">#</span><span style="flex:1;">${t('lbName')}</span><span style="width:60px;text-align:center;">🏆</span><span style="width:60px;text-align:center;">💀</span>`;
    leaderboardList.appendChild(header);
    
    finalPlayers.forEach((player, index) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; padding:10px 16px; align-items:center; border-bottom:1px solid rgba(255,255,255,0.03); font-size:0.9rem;';
        if (player.name === myName) row.style.background = 'rgba(255,100,0,0.1)';
        const rank = index + 1;
        const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        row.innerHTML = `<span style="width:40px; font-weight:700;">${rankIcon}</span><span style="flex:1; font-weight:600;">${escapeHTML(player.name)}</span><span style="width:60px; text-align:center; color:#3ddc84;">${player.wins}</span><span style="width:60px; text-align:center; color:#ff4444;">${player.losses}</span>`;
        leaderboardList.appendChild(row);
    });
}

function escapeHTML(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

// Ping
let pingStart = 0; const pingInterval = setInterval(() => { if (socket.connected) { pingStart = Date.now(); socket.emit('ping'); } }, 2000);
socket.on('pong', () => { const ping = Date.now() - pingStart; pingValueEl.textContent = `${ping} ms`; if (ping < 80) { pingIconEl.textContent = '📶'; pingValueEl.style.color = '#0f0'; } else if (ping < 150) { pingIconEl.textContent = '📶'; pingValueEl.style.color = '#ff0'; } else { pingIconEl.textContent = '📡'; pingValueEl.style.color = '#f00'; } });
window.addEventListener('beforeunload', () => clearInterval(pingInterval));
soundToggleBtn.onclick = () => { soundEnabled = !soundEnabled; soundToggleBtn.textContent = soundEnabled ? '🔊' : '🔇'; };
vibrateToggleBtn.onclick = () => { vibrateEnabled = !vibrateEnabled; vibrateToggleBtn.textContent = vibrateEnabled ? '📳' : '📴'; if (!vibrateEnabled && navigator.vibrate) navigator.vibrate(0); };
if (!('vibrate' in navigator) || !/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { const vibBtn = document.getElementById('vibrateToggleBtn'); if (vibBtn) vibBtn.style.display = 'none'; }

// Kontroller
window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); flap(); } });
document.addEventListener('click', () => { if (gameRunning) flap(); });
document.addEventListener('touchstart', e => { if (gameRunning) { e.preventDefault(); flap(); } }, { passive: false });

// Dil Değiştirme
const langBtn = document.getElementById('langBtn'); const langMenu = document.getElementById('langMenu'); const langOptions = document.querySelectorAll('.lang-option');
langBtn.onclick = () => langMenu.classList.toggle('hidden');
document.addEventListener('click', (e) => { if (!langBtn.contains(e.target) && !langMenu.contains(e.target)) langMenu.classList.add('hidden'); });
langOptions.forEach(opt => { opt.onclick = () => { const newLang = opt.dataset.lang; if (newLang === currentLang) { langMenu.classList.add('hidden'); return; } currentLang = newLang; localStorage.setItem('lang', currentLang); langOptions.forEach(o => o.classList.remove('selected')); opt.classList.add('selected'); updateUILanguage(); langMenu.classList.add('hidden'); }; });
(function initLangSelection() { const selected = document.querySelector(`.lang-option[data-lang="${currentLang}"]`); if (selected) { langOptions.forEach(o => o.classList.remove('selected')); selected.classList.add('selected'); } })();

function updateUILanguage() {
    function updatePlaceholder() { const joinInput = document.getElementById('joinInput'); if (joinInput) joinInput.placeholder = t('enterCode'); }
    updatePlaceholder();
    const st = statusText.textContent;
    if (st.includes('Rakip bekleniyor') || st.includes('Waiting') || st.includes('Warte')) statusText.textContent = t('waiting');
    else if (st.includes('Bağlandı') || st.includes('Connected') || st.includes('Verbunden')) statusText.textContent = t('joined');
    else if (st.includes('Rakip hazır') || st.includes('Opponent ready') || st.includes('Gegner bereit')) statusText.textContent = t('opponentReady');
    else if (st.includes('Rakip hazır, sen') || st.includes('Opponent ready, are') || st.includes('Gegner bereit, bist')) statusText.textContent = t('opponentReadyRestart');
    document.getElementById('createBtn').innerHTML = t('createRoom'); document.getElementById('joinBtn').textContent = t('joinRoom');
    document.querySelector('.divider span').textContent = t('or'); document.querySelector('.label').textContent = t('roomCodeLabel');
    document.getElementById('startBtn').innerHTML = t('start');
    const coinMsg = document.getElementById('coinChangeMsg'); if (coinMsg) { const amount = parseInt(coinMsg.textContent.match(/[-+]\d+/)?.[0] || '0'); coinMsg.textContent = amount >= 0 ? `🪙 ${t('coinEarned')} +${amount} ${t('coins')}!` : `🪙 ${t('coinLost')} ${amount} ${t('coins')}!`; coinMsg.style.color = amount >= 0 ? '#ffcc00' : '#ff4444'; }
    const aboutDev = document.getElementById('aboutDeveloper'); if (aboutDev) aboutDev.textContent = t('developer');
    const aboutVfx = document.getElementById('aboutVfx'); if (aboutVfx) aboutVfx.textContent = t('vfxArtist');
    const aboutVer = document.getElementById('aboutVersion'); if (aboutVer) aboutVer.textContent = t('version');
    const aboutEng = document.getElementById('aboutEngine'); if (aboutEng) aboutEng.textContent = t('engine');
    const madeWith = document.getElementById('aboutMadeWith'); if (madeWith) madeWith.textContent = t('madeWith');
    const by = document.getElementById('aboutBy'); if (by) by.textContent = t('by');
    const usernameInput = document.getElementById('usernameInput'); if (usernameInput) usernameInput.placeholder = t('enterName');
    const mapTitle = document.getElementById('mapSelectTitle'); if (mapTitle) mapTitle.textContent = t('mapSelect');
    const mapSpans = document.querySelectorAll('.map-option span'); if (mapSpans.length >= 3) { mapSpans[0].textContent = t('mapClassic'); mapSpans[1].textContent = t('mapForest'); mapSpans[2].textContent = t('mapIce'); }
    const nameModalTitle = document.getElementById('nameModalTitle'); if (nameModalTitle) nameModalTitle.textContent = t('enterName');
    const saveBtn = document.getElementById('saveNameBtn'); if (saveBtn) saveBtn.textContent = t('save');
    const lbTitle = document.getElementById('leaderboardTitle'); if (lbTitle) lbTitle.textContent = t('leaderboardTitle');
    document.querySelector('.hud-box.you .hud-label').textContent = t('you'); document.querySelector('.hud-box.opp .hud-label').textContent = t('opponent');
    document.getElementById('restartBtn').textContent = t('restart'); document.getElementById('menuBtn').textContent = t('menu');
    const statBoxes = document.querySelectorAll('.stat-box'); if (statBoxes.length >= 3) { statBoxes[0].querySelector('.stat-label').textContent = '🏁 ' + t('pipes'); statBoxes[1].querySelector('.stat-label').textContent = '🪶 ' + t('flaps'); statBoxes[2].querySelector('.stat-label').textContent = '⏱️ ' + t('time'); }
    const aboutModalTitle = document.querySelector('#aboutModal .modal-title'); if (aboutModalTitle) aboutModalTitle.textContent = t('aboutTitle');
    const modalDesc = document.querySelector('.modal-desc'); if (modalDesc) modalDesc.innerHTML = t('aboutDesc').replace(/\n/g, '<br>');
    const rt = resultText.textContent;
    if (rt.includes('ZAFER') || rt.includes('VICTORY') || rt.includes('SIEG')) resultText.textContent = t('victory');
    else if (rt.includes('YENİLDİN') || rt.includes('DEFEATED') || rt.includes('NIEDERLAGE')) resultText.textContent = t('defeat');
    else if (rt.includes('BERABERE') || rt.includes('DRAW') || rt.includes('UNENTSCHIEDEN')) resultText.textContent = t('draw');
    else if (rt.includes('Rakip bekleniyor') || rt.includes('Waiting for opponent') || rt.includes('Warte auf Gegner')) resultText.textContent = t('restartWait');
    else if (rt.includes('Rakip seninle') || rt.includes('Opponent wants') || rt.includes('Gegner möchte')) resultText.textContent = t('opponentWantsRestart');
    const marketBtnEl = document.getElementById('marketBtn'); if (marketBtnEl) marketBtnEl.innerHTML = t('market');
    const marketTitle = document.getElementById('marketTitle'); if (marketTitle) marketTitle.textContent = t('marketTitle');
    renderMarket();
}

// Market Modal
const marketModal = document.getElementById('marketModal'); const marketBtn = document.getElementById('marketBtn'); const marketClose = document.getElementById('marketClose');
function openMarket() { marketModal.classList.remove('hidden', 'closing'); marketModal.classList.add('opening'); setTimeout(() => { marketModal.classList.remove('opening'); }, 350); renderMarket(); }
function closeMarket() { marketModal.classList.add('closing'); setTimeout(() => { marketModal.classList.add('hidden'); marketModal.classList.remove('closing'); }, 320); }
marketBtn.onclick = openMarket; marketClose.onclick = closeMarket; marketModal.onclick = (e) => { if (e.target === marketModal) closeMarket(); };
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !marketModal.classList.contains('hidden')) { closeMarket(); } });
function renderMarket() { const coinAmount = document.getElementById('coinAmount'); const skinList = document.getElementById('skinList'); if (!coinAmount || !skinList) return; coinAmount.textContent = getCoins(); const owned = getOwnedSkins(); const active = getActiveSkin(); skinList.innerHTML = ''; Object.values(SKINS).forEach(skin => { const isOwned = owned.includes(skin.id); const isActive = active === skin.id; const div = document.createElement('div'); div.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);border-radius:10px;background:rgba(255,255,255,0.02);'; const preview = document.createElement('div'); preview.style.cssText = `width:40px;height:40px;border-radius:50%;background:${skin.color1};border:2px solid ${skin.color2};flex-shrink:0;`; if (skin.rainbow) preview.style.background = 'linear-gradient(90deg,red,orange,yellow,green,blue,indigo,violet)'; div.appendChild(preview); const info = document.createElement('div'); info.style.flex = '1'; const name = document.createElement('div'); name.textContent = getSkinName(skin.id); name.style.fontWeight = '700'; name.style.fontSize = '0.95rem'; info.appendChild(name); const desc = document.createElement('div'); desc.textContent = getSkinDesc(skin.id); desc.style.fontSize = '0.75rem'; desc.style.color = 'var(--muted)'; info.appendChild(desc); div.appendChild(info); const btn = document.createElement('button'); btn.className = 'btn'; btn.style.cssText = 'padding:6px 14px;font-size:0.8rem;flex-shrink:0;'; if (isActive) { btn.textContent = t('equipped'); btn.style.background = '#ffcc00'; btn.style.color = '#000'; } else if (isOwned) { btn.textContent = t('use'); btn.className = 'btn btn-outline'; btn.onclick = () => { setActiveSkin(skin.id); renderMarket(); }; } else { btn.textContent = `${t('buy')} - ${skin.price === 0 ? t('free') : '🪙' + skin.price}`; btn.className = 'btn btn-primary'; btn.onclick = () => { if (getCoins() < skin.price) { alert(t('notEnoughCoins')); return; } spendCoins(skin.price); ownSkin(skin.id); setActiveSkin(skin.id); alert(t('purchased')); renderMarket(); }; } div.appendChild(btn); skinList.appendChild(div); }); }

document.addEventListener('DOMContentLoaded', () => { updateUILanguage(); });
