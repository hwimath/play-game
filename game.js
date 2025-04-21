// --- 1) 이미지 프리로드 ---
const ASSETS = {
  bg:  "background.png",
  p:   "player.png",
  e1:  "enemy1.png",
  e2:  "enemy2.png",
  h1:  "health_item1.png",
  h2:  "health_item2.png"
};
const IMG = {};
let loadedCount = 0;
const TOTAL_ASSETS = Object.keys(ASSETS).length;
for (const key in ASSETS) {
  IMG[key] = new Image();
  IMG[key].src = ASSETS[key];
  IMG[key].onload = () => {
    if (++loadedCount === TOTAL_ASSETS) initGame();
  };
}

// --- 2) 캔버스 설정 ---
const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");
canvas.width  = 800;
canvas.height = 600;

// --- 3) 상수 정의 ---
const PLAYER_SIZE   = 80;
const ENEMY_SIZE    = 60;    // 적 크기
const ITEM_SIZE     = 50;
const ITEM_INTERVAL = 10000; // 10초마다 아이템
const BASE_SHOT_INT = 500;   // 자동 발사 기본 간격(ms)
const SPEED_FACTOR  = 0.02;  // 적 속도 증가 비율 (초당)

// --- 4) 상태 변수 ---
let player, enemies, missiles, items;
let playerEnergy, score, gameOver;
let missileCount, missilePickups, shotInterval;
let lastItemTime, lastShotTime, startTime;

// 터치/클릭 플래그
let touchLeft = false, touchRight = false;

// --- 5) 키 입력 & 버튼 이벤트 ---
const keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup",   e => keys[e.key] = false);

// 화면 아래 좌우 버튼
const lBtn = document.getElementById("leftBtn");
const rBtn = document.getElementById("rightBtn");
["touchstart","mousedown"].forEach(ev => {
  lBtn.addEventListener(ev, () => touchLeft  = true);
  rBtn.addEventListener(ev, () => touchRight = true);
});
["touchend","mouseup","touchcancel"].forEach(ev => {
  lBtn.addEventListener(ev, () => touchLeft  = false);
  rBtn.addEventListener(ev, () => touchRight = false);
});
window.addEventListener("keydown", e => {
  if (e.key === " ") shootMissile();
});

// --- 6) 클래스 정의 ---
class Player {
  constructor() {
    this.w  = PLAYER_SIZE;
    this.h  = PLAYER_SIZE;
    this.x  = canvas.width/2 - this.w/2;
    this.y  = canvas.height - this.h - 10;
    this.sp = 5;
  }
  move() {
    if ((keys["ArrowLeft"]  || touchLeft)  && this.x > 0)
      this.x -= this.sp;
    if ((keys["ArrowRight"] || touchRight) && this.x < canvas.width - this.w)
      this.x += this.sp;
    if (keys["ArrowUp"]    && this.y > 0)
      this.y -= this.sp;
    if (keys["ArrowDown"]  && this.y < canvas.height - this.h)
      this.y += this.sp;
  }
  draw() {
    ctx.drawImage(IMG.p, this.x, this.y, this.w, this.h);
  }
}

class Missile {
  constructor(x, y, ang = 0) {
    this.x = x;
    this.y = y;
    this.w = 8;
    this.h = 16;
    this.sp  = 8;
    this.ang = ang * Math.PI/180;
  }
  move() {
    this.y -= this.sp;
    this.x += Math.sin(this.ang) * 5;
  }
  draw() {
    ctx.fillStyle = "red";
    ctx.fillRect(this.x, this.y, this.w, this.h);
  }
}

class Enemy {
  constructor(type) {
    this.w      = ENEMY_SIZE;
    this.h      = ENEMY_SIZE;
    this.x      = Math.random() * (canvas.width - this.w);
    this.y      = -this.h;
    this.type   = type;       // 1 또는 2
    this.health = type;       // 체력: 1 or 2
    this.baseSp = 2;          // 기본 속도
  }
  move(now) {
    const elapsed = (now - startTime) / 1000;
    const speed   = this.baseSp + elapsed * SPEED_FACTOR;
    this.y += speed;
  }
  draw() {
    const img = this.type === 1 ? IMG.e1 : IMG.e2;
    ctx.drawImage(img, this.x, this.y, this.w, this.h);
  }
}

class Item {
  constructor() {
    this.w    = ITEM_SIZE;
    this.h    = ITEM_SIZE;
    this.x    = Math.random() * (canvas.width - this.w);
    this.y    = -this.h;
    this.sp   = 3;
    this.type = Math.random() < 0.5 ? "health" : "missile";
  }
  move() {
    this.y += this.sp;
  }
  draw() {
    const img = this.type === "health" ? IMG.h1 : IMG.h2;
    ctx.drawImage(img, this.x, this.y, this.w, this.h);
  }
}

// --- 7) 충돌 검사 & 발사 함수 ---
function isCollision(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}
function shootMissile() {
  const sx = player.x + player.w/2 - 4;
  const sy = player.y;
  if (missileCount === 1) {
    missiles.push(new Missile(sx, sy));
  } else {
    for (let i = 0; i < missileCount; i++) {
      const ang = (i - (missileCount-1)/2) * 15;
      missiles.push(new Missile(sx, sy, ang));
    }
  }
}

// --- 8) 게임 초기화 ---
function initGame() {
  player         = new Player();
  enemies        = [];
  missiles       = [];
  items          = [];
  playerEnergy   = 100;
  score          = 0;
  gameOver       = false;
  missileCount   = 1;
  missilePickups = 0;
  shotInterval   = BASE_SHOT_INT;
  startTime      = performance.now();
  lastItemTime   = startTime;
  lastShotTime   = startTime;
  requestAnimationFrame(gameLoop);
}

// --- 9) 화면 그리기 헬퍼 ---
function drawBackground() {
  ctx.drawImage(IMG.bg, 0, 0, canvas.width, canvas.height);
}
function drawUI() {
  ctx.fillStyle = "gray";
  ctx.fillRect(20, 20, 200, 20);
  ctx.fillStyle = "limegreen";
  ctx.fillRect(20, 20, (playerEnergy/100)*200, 20);
  ctx.strokeStyle = "black";
  ctx.strokeRect(20, 20, 200, 20);
  ctx.font = "20px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "right";
  ctx.fillText("점수: " + score, canvas.width - 20, 40);
}

// --- 10) 메인 루프 ---
function gameLoop(now) {
  // 1) 배경 & UI
  drawBackground();
  drawUI();

  // 2) 자동 미사일 발사
  if (now - lastShotTime >= shotInterval) {
    shootMissile();
    lastShotTime = now;
  }

  // 3) 플레이어
  player.move();
  player.draw();

  // 4) 적 스폰
  if (Math.random() < 0.02) {
    enemies.push(new Enemy(Math.random() < 0.5 ? 1 : 2));
  }

  // 5) 아이템 10초마다 스폰
  if (now - lastItemTime >= ITEM_INTERVAL) {
    items.push(new Item());
    lastItemTime = now;
  }

  // 6) 적 처리
  for (let i = enemies.length-1; i >= 0; i--) {
    const e = enemies[i];
    e.move(now);
    e.draw();
    if (e.y > canvas.height) { enemies.splice(i, 1); continue; }

    if (isCollision(player, e)) {
      playerEnergy -= 20;
      enemies.splice(i, 1);
      if (playerEnergy <= 0) gameOver = true;
      continue;
    }
    for (let j = missiles.length-1; j >= 0; j--) {
      if (isCollision(missiles[j], e)) {
        missiles.splice(j, 1);
        e.health--;
        if (e.health <= 0) {
          score++;
          enemies.splice(i, 1);
        }
        break;
      }
    }
  }

  // 7) 아이템 처리
  for (let i = items.length-1; i >= 0; i--) {
    const it = items[i];
    it.move();
    it.draw();
    if (it.y > canvas.height) { items.splice(i, 1); continue; }

    if (isCollision(player, it)) {
      if (it.type === "health") {
        playerEnergy = Math.min(100, playerEnergy + 30);
      } else {
        missilePickups = Math.min(3, missilePickups + 1);
        if (missilePickups === 1) {
          shotInterval = BASE_SHOT_INT / 2;
        } else if (missilePickups === 2) {
          missileCount = 2;
        } else if (missilePickups === 3) {
          missileCount = 3;
        }
      }
      items.splice(i, 1);
    }
  }

  // 8) 미사일 처리
  for (let i = missiles.length-1; i >= 0; i--) {
    missiles[i].move();
    missiles[i].draw();
    if (missiles[i].y < -missiles[i].h) missiles.splice(i, 1);
  }

  // 9) 게임 오버
  if (gameOver) {
    ctx.fillStyle = "white";
    ctx.font      = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("게임 오버! 최종 점수: " + score, canvas.width/2, canvas.height/2);
    return; // 루프 완전 종료
  }

  // 10) 다음 프레임
  requestAnimationFrame(gameLoop);
}
