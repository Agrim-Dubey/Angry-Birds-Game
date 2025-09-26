window.addEventListener('load', () => {
  try {
    const canvas = document.getElementById("canvas");
    if (!canvas) { console.error("Canvas element #canvas not found"); return; }
    const ctx = canvas.getContext("2d");

    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;

    const background = new Image();
    background.src = "../Assets/level1background.jpg";

    let alpha = 0;
    const fade_time = 2000;
    let start_time = 0;
    let gameStarted = false;

    const bird_images = [
      "../Assets/character1-removebg-preview.png",
      "../Assets/character2-removebg-preview.png",
    ];
    const block_images = [
      "../Assets/woodenblocks.png",
      "../Assets/box2.png",
      "../Assets/basicpig.png",
    ];

    const bird_size = 35;
    const birds = [];
    let bird_y = canvas.height - 135;
    const left_region_width = canvas.width * 0.2;
    const max_birds_fit = Math.floor(left_region_width / bird_size);
    const num_of_birds = Math.max(1, max_birds_fit);

    for (let i = 0; i < num_of_birds; i++) {
      const random_index = Math.floor(Math.random() * bird_images.length);
      const img = new Image();
      img.src = bird_images[random_index];
      const spacing = bird_size;
      const x = i * spacing + bird_size / 2;
      const bird = {
        img,
        x,
        y: bird_y,
        scale: 0,
        loaded: false,
        onsling: false,
        vx: 0, vy: 0, launched: false,
        picking: false,
        ability:random_index,
      };
      birds.push(bird);
      img.onload = () => { bird.loaded = true; };
      img.onerror = () => { console.warn("Bird image failed to load:", img.src); bird.loaded = true; };
    }

    const block_size = 25;
    const blocks = [];
    const pigs = [];
    let score = 0;
    let animationId = null;

function generate_structure() {
  blocks.length = 0;
  pigs.length = 0;

  const base_y = bird_y; 


 const layout = [
  { x: canvas.width * 0.55,     heights: [0,1,2,3,4,5,6], type: 0 },
  { x: canvas.width * 0.55 + 30, heights: [0,1,2,3,4,5,6,7], type: 1 },
  { x: canvas.width * 0.55 + 60, heights: [0,1,2,3], type: 0 },
  { x: canvas.width * 0.55 + 90, heights: [0,1,2,3,4,5,6,7,8], type: 1 },
  { x: canvas.width * 0.55 + 120, heights: [0,1,2,3,4], type: 0 },
  { x: canvas.width * 0.55 + 150, heights: [0,1,2,3,4,5], type: 1 },
  { x: canvas.width * 0.55 + 180, heights: [0,1,2,3,4,5,6,7], type: 0 },
  { x: canvas.width * 0.55 + 210, heights: [0,1,2,3], type: 1 },
  { x: canvas.width * 0.55 + 240, heights: [0,1,2,3,4,5,6], type: 0 },
  { x: canvas.width * 0.55 + 270, heights: [0,1,2,3,4,5,6,7], type: 1 },
  { x: canvas.width * 0.55 + 300, heights: [2,3,4,5,6], type: 0 }, // floating pig space
  { x: canvas.width * 0.55 + 330, heights: [0,1,2,3,4,5,6,7,8,9], type: 1 }, // max tower
];

  for (const col of layout) {
    for (const h of col.heights) {
      const y = base_y - h * block_size;
      const img = new Image();
      img.src = block_images[col.type];
      const block = {
        img,
        x: col.x,
        y,
        width: block_size,
        height: block_size,
        loaded: false,
        vx: 0,
        vy: 0,
        mass: 2
      };
      blocks.push(block);
      img.onload = () => { block.loaded = true; };
      img.onerror = () => { console.warn("Block image failed to load:", img.src); block.loaded = true; };
    }
  }

  const pigPositions = [
    { x: layout[1].x, yOffset: 5 },
    { x: layout[3].x, yOffset: 6 },
    { x: layout[6].x, yOffset: 4 },
    { x: layout[8].x, yOffset: 3 },
    { x: layout[9].x, yOffset: 5 }
  ];

  for (const pos of pigPositions) {
    const pigImg = new Image();
    pigImg.src = "../Assets/basicpig.png";
    const pig = {
      img: pigImg,
      x: pos.x,
      y: base_y - pos.yOffset * block_size,
      width: block_size,
      height: block_size,
      loaded: false,
      hit: false,
      vx: 0,
      vy: 0,
      mass: 1
    };
    pigs.push(pig);
    pigImg.onload = () => { pig.loaded = true; };
    pigImg.onerror = () => { console.warn("Pig image failed to load:", pigImg.src); pig.loaded = true; };
  }
}




    function all_images_loaded() {
      const blocks_loaded = blocks.length ? blocks.every(b => b.loaded) : true;
      const pigs_loaded = pigs.length ? pigs.every(p => p.loaded) : true;
      return birds.every(b => b.loaded) && background.complete && blocks_loaded && pigs_loaded;
    }

    const slinger = {
      baseX: 0,
      baseY: bird_y + 20,
      arm_length: 50,
      forkOffsetY: -60,
      held_bird: null,
      radius: 100
    };

    let dragging = false;
    let drag_x = 0, drag_y = 0;
    const gravity = 0.4;

    function getSlingGeometry() {
      const forkX = slinger.baseX;
      const forkY = slinger.baseY - slinger.arm_length + slinger.forkOffsetY;
      const leftX = forkX - slinger.arm_length / 2;
      const rightX = forkX + slinger.arm_length / 2;
      return { forkX, forkY, leftX, rightX };
    }

    function clampToFork(mx, my) {
      const { forkX, forkY } = getSlingGeometry();
      const dx = mx - forkX;
      const dy = my - forkY;
      const dist = Math.hypot(dx, dy);
      if (dist > slinger.radius) {
        const r = slinger.radius / dist;
        return { x: forkX + dx * r, y: forkY + dy * r };
      }
      return { x: mx, y: my };
    }

    function draw_slinger() {
      const { forkX, forkY, leftX, rightX } = getSlingGeometry();
      ctx.strokeStyle = "#654321";
      ctx.lineWidth = 10;

      ctx.beginPath();
      ctx.moveTo(slinger.baseX, slinger.baseY);
      ctx.lineTo(leftX, forkY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(slinger.baseX, slinger.baseY);
      ctx.lineTo(rightX, forkY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(leftX, forkY);
      ctx.lineTo(rightX, forkY);
      ctx.stroke();

      if (slinger.held_bird && !slinger.held_bird.launched) {
        const b = slinger.held_bird;
        let bxCenter = forkX;
        let byCenter = forkY;
        if (dragging) {
          bxCenter = drag_x;
          byCenter = drag_y;
        }

        const birdDrawX = bxCenter - bird_size / 2;
        const birdDrawY = byCenter - bird_size / 2;

        ctx.lineWidth = 6;
        ctx.strokeStyle = "#1b1b1b";
        ctx.beginPath();
        ctx.moveTo(leftX, forkY);
        ctx.lineTo(bxCenter, byCenter);
        ctx.stroke();

        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath();
        ctx.moveTo(rightX, forkY);
        ctx.lineTo(bxCenter, byCenter);
        ctx.stroke();

        ctx.drawImage(b.img, birdDrawX, birdDrawY, bird_size, bird_size);

        if (dragging) drawTrajectory(bxCenter, byCenter);

        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(forkX, forkY, slinger.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function endGame(message) {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }

      if (message === "You Won!") {
        const victoryScreen = document.getElementById("victoryScreen");
        if (victoryScreen) {
          setTimeout(()=> {
            victoryScreen.style.display = "flex";
          },3000)
        }
      } else {
        setTimeout(() => {
          alert(message);
        }, 100);
      }
    }

 function handleCollisions() {
      const impactThreshold = 6;
      for (const bird of birds) {
        if (!bird.launched) continue;
        for (let i = pigs.length - 1; i >= 0; i--) {
          const pig = pigs[i];
          const dx = bird.x - pig.x;
          const dy = bird.y - pig.y;
          const distance = Math.hypot(dx, dy);
          const combinedRadii = bird_size / 2 + pig.width / 2;

          if (distance < combinedRadii) {
            const impactSpeed = Math.hypot(bird.vx, bird.vy);

            if (impactSpeed > impactThreshold) {
              pigs.splice(i, 1);
              score += 1000;
            } else {
              pig.vx += bird.vx * 0.4;
              pig.vy += bird.vy * 0.4;
            }
          }
        }
        for (let i = blocks.length - 1; i >= 0; i--) {
          const block = blocks[i];
          const dx = bird.x - block.x;
          const dy = bird.y - block.y;
          const distance = Math.hypot(dx, dy);
          const combinedRadii = bird_size / 2 + block.width / 2;

          if (distance < combinedRadii) {
            const impactSpeed = Math.hypot(bird.vx, bird.vy);

            if (impactSpeed > impactThreshold * 1.5) {
              blocks.splice(i, 1);
              score += 200;
            } else {
              block.vx += bird.vx * 0.3;
              block.vy += bird.vy * 0.3;
            }
          }
        }
      }

      // Physics update for pigs & blocks
      const allObjects = [...blocks, ...pigs];
      for (const obj of allObjects) {
        obj.vy += gravity;
        obj.x += obj.vx;
        obj.y += obj.vy;

        obj.vx *= 0.95; // damping
        obj.vy *= 0.95;

        // clamp to bird-level ground (bird_y)
        const groundY = bird_y;
        if (obj.y + obj.height / 2 > groundY) {
          obj.y = groundY - obj.height / 2;
          obj.vy *= -0.4; // bounce/damping
          // small friction on ground
          obj.vx *= 0.6;
        }

        // keep inside canvas roughly
        if (obj.x < 0) {
          obj.x = 0;
          obj.vx *= -0.3;
        } else if (obj.x > canvas.width) {
          obj.x = canvas.width;
          obj.vx *= -0.3;
        }
      }

      // Chain reactions between blocks/pigs
      for (let i = 0; i < allObjects.length; i++) {
        for (let j = i + 1; j < allObjects.length; j++) {
          const a = allObjects[i];
          const b = allObjects[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          const minDist = (a.width + b.width) / 2;

          if (dist <= 0) continue; // avoid division by zero
          if (dist < minDist) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            // push them apart
            a.x += nx * overlap * 0.5;
            a.y += ny * overlap * 0.5;
            b.x -= nx * overlap * 0.5;
            b.y -= ny * overlap * 0.5;

            // exchange a fraction of velocities to produce chain push
            const push = 0.4;
            const ax = a.vx, ay = a.vy;
            a.vx = b.vx * push;
            a.vy = b.vy * push;
            b.vx = ax * push;
            b.vy = ay * push;
          }
        }
      }
      if (gameStarted && pigs.length === 0 && birds.some(bird => bird.launched)) {
        endGame("You Won!");
      }
    }
    

  function drawTrajectory(x, y) {
  const { forkX, forkY } = getSlingGeometry();
  const dx = forkX - x;
  const dy = forkY - y;
  const power = 0.2;

  const vx = dx * power;
  const vy = dy * power;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  for (let t = 0; t < 60; t += 3) {  
    const px = x + vx * t;
    const py = y + vy * t + 0.5 * gravity * t * t;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2); 
    ctx.fill();
  }
}


    canvas.addEventListener("click", (e) => {
      if (!all_images_loaded()) return;
      const mouse_x = e.clientX;
      const mouse_y = e.clientY;
      for (let b of birds) {
        const size = bird_size * alpha;
        const bx = b.x;
        const by = b.y;
        if (mouse_x >= bx - size / 2 && mouse_x <= bx + size / 2 && mouse_y >= by - size / 2 && mouse_y <= by + size / 2) {
          if (!b.launched && !slinger.held_bird && !b.picking) {
            const { forkX, forkY } = getSlingGeometry();
            b.picking = true;
            b.pickStartTime = Date.now();
            b.pickDuration = 600;
            b.pickStartX = b.x;
            b.pickStartY = b.y;
            b.pickTargetX = forkX;
            b.pickTargetY = forkY;
            const dx = b.pickTargetX - b.pickStartX;
            const dy = b.pickTargetY - b.pickStartY;
            b.pickArc = Math.max(60, Math.min(220, Math.hypot(dx, dy) * 0.5));
            b.pickRotTurns = 2;
            b.vx = 0;
            b.vy = 0;
            break;
          }
        }
      }
    });

    canvas.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (slinger.held_bird && slinger.held_bird.onsling && !slinger.held_bird.launched) {
        dragging = true;
        const p = clampToFork(e.clientX, e.clientY);
        drag_x = p.x;
        drag_y = p.y;
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      if (dragging) {
        const p = clampToFork(e.clientX, e.clientY);
        drag_x = p.x;
        drag_y = p.y;
      }
    });

    canvas.addEventListener("mouseup", (e) => {
      if (dragging && slinger.held_bird) {
        dragging = false;
        const { forkX, forkY } = getSlingGeometry();
        const dx = forkX - drag_x;
        const dy = forkY - drag_y;
        const power = 0.18;
        const b = slinger.held_bird;

        b.vx = dx * power;
        b.vy = dy * power;
        b.launched = true;
        b.onsling = false;
        slinger.held_bird = null;
      }
    });

    function updateBirds() {
      let allBirdsLaunchedAndOffScreen = true;

      for (const b of birds) {
        if (b.launched) {
          b.vy += gravity;
          b.x += b.vx;
          b.y += b.vy;
          if (b.x > 0 && b.x < canvas.width && b.y < canvas.height) {
            allBirdsLaunchedAndOffScreen = false;
          }
        } else {
          allBirdsLaunchedAndOffScreen = false;
        }
      }

      if (allBirdsLaunchedAndOffScreen && pigs.length > 0) {
        endGame("Game Over! Try again.");
      }
    }

    function draw() {
      if (!all_images_loaded()) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      const time_gone = Date.now() - start_time;
      alpha = Math.min(time_gone / fade_time, 1);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#fff";
      ctx.font = "30px Arial";
      ctx.fillText("Score: " + score, 20, 40);

      birds.forEach(bird => {
        if (bird.picking) {
          const elapsed = Date.now() - bird.pickStartTime;
          const t = Math.min(1, elapsed / bird.pickDuration);
          const sx = bird.pickStartX;
          const sy = bird.pickStartY;
          const tx = bird.pickTargetX;
          const ty = bird.pickTargetY;
          const arc = bird.pickArc || 80;
          const xPos = sx + (tx - sx) * t;
          const yPos = sy + (ty - sy) * t - arc * Math.sin(Math.PI * t);
          const size = bird_size * alpha;
          const rot = 2 * Math.PI * (bird.pickRotTurns || 1) * t;
          ctx.save();
          ctx.translate(xPos, yPos);
          ctx.rotate(rot);
          ctx.drawImage(bird.img, -size / 2, -size / 2, size, size);
          ctx.restore();
          if (t >= 1) {
            bird.picking = false;
            bird.x = tx;
            bird.y = ty;
            bird.vx = 0;
            bird.vy = 0;
            bird.onsling = true;
            slinger.held_bird = bird;
          }
        } else {
          if (bird !== slinger.held_bird || bird.launched) {
            const size = bird_size * alpha;
            ctx.drawImage(bird.img, bird.x - size / 2, bird.y - size / 2, size, size);
          }
        }
      });

      blocks.forEach(block => {
        const size = block.width * alpha;
        ctx.drawImage(block.img, block.x - size / 2, block.y - size / 2, size, size);
      });

      pigs.forEach(pig => {
        const size = pig.width * alpha;
        ctx.drawImage(pig.img, pig.x - size / 2, pig.y - size / 2, size, size);
      });

      draw_slinger();
      updateBirds();
      handleCollisions();

      animationId = requestAnimationFrame(draw);
    }

    const playBtn = document.getElementById("play");
    if (!playBtn) {
      console.error("Play button (#play) not found in DOM");
      return;
    }
    playBtn.addEventListener("click", startGame);

    function startGame() {
      const container = document.getElementById("container1");
      if (container) container.style.display = "none";

      start_time = Date.now();
      generate_structure();
      slinger.baseX = Math.max(...birds.map(b => b.x)) + 100;
      slinger.baseY = bird_y + 20;
      gameStarted = true;

      function waitForImages() {
        if (all_images_loaded()) {
          draw();
        } else {
          requestAnimationFrame(waitForImages);
        }
      }
      waitForImages();
    }

  
    const replayBtn = document.getElementById("replayBtn");
    if (replayBtn) {
      replayBtn.addEventListener("click", () => {
        if (score >= 4000) {
          window.location.href = "../level2/level2.html";
        } else {
          const tag = document.getElementById("tagline");
          if (tag) tag.textContent = "You don't have enough points to clear this level.";
        }
      });
    }

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      bird_y = canvas.height - 135;
      slinger.baseY = bird_y + 20;
    });

  } catch (err) {
    console.error("Error initializing level1.js:", err);
  }
});
function returnkaro(){
  window.location.href='../index.html';
}
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
 
    const activeBird = birds.find(b => b.launched && !b.abilityUsed);

    if (activeBird) {
      if (activeBird.ability === 0) {
        activeBird.vx *= 1.8;  
        activeBird.vy *= 0.8;  
        activeBird.abilityUsed = true;
      }
    }
  }
});

