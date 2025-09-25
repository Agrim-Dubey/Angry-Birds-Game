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
      "../Assets/character3-removebg-preview.png",
      "../Assets/character4-removebg-preview.png"
    ];

    const bird_size = 35;
    const birds = [];
    const bird_y = canvas.height - 135;
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
    
      };
      birds.push(bird);
      img.onload = () => { bird.loaded = true; };
      img.onerror = () => { console.warn("Bird image failed to load:", img.src); bird.loaded = true; };
    }

    const block_size = 30;
    const blocks = [];
    const pigs = [];
    let score = 0;
    let animationId = null;

    function generate_structure() {
      blocks.length = 0;
      pigs.length = 0;

      const base_y = bird_y;
      const numcolumns = Math.floor(Math.random() * 3) + 7;
      const maxcolumnheight = 8;

      for (let col = 0; col < numcolumns; col++) {
        const colheight = Math.floor(Math.random() * maxcolumnheight) + 1;
        const colx = canvas.width * 0.6 + col * (block_size + 10);

        for (let row = 0; row < colheight; row++) {
          const y = base_y - row * block_size;
          const img = new Image();
          img.src = "../Assets/woodenblocks.png";
          const block = { img, x: colx, y, width: block_size, height: block_size, loaded: false };
          blocks.push(block);
          img.onload = () => { block.loaded = true; };
          img.onerror = () => { console.warn("Block image failed to load:", img.src); block.loaded = true; };
        }
      }

      if (!blocks.length) return;

      const tallest_y = Math.min(...blocks.map(b => b.y));
      const top_blocks = blocks.filter(b => b.y === tallest_y);
      const pig_block = top_blocks[Math.floor(Math.random() * top_blocks.length)];
      const pigimg = new Image();
      pigimg.src="../Assets/basicpig.png"
      const pig = { img: pigimg, x: pig_block.x, y: pig_block.y - block_size, width: block_size, height: block_size, loaded: false, hit: false };
      pigs.push(pig);
      pigimg.onload = () => { pig.loaded = true; };
      pigimg.onerror = () => { console.warn("Pig image failed to load:", pigimg.src); pig.loaded = true; };
    }

    function all_images_loaded() {
      const blocks_loaded = blocks.length ? blocks.every(b => b.loaded) : true;
      const pigs_loaded = pigs.length ? pigs.every(p => p.loaded) : true;
      return birds.every(b => b.loaded) && background.complete && blocks_loaded && pigs_loaded;
    }

    const slinger = {
      baseX: 0,
      baseY: bird_y+20,
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
            victoryScreen.style.display="flex";
          },3000)
        }
      } else {
   
        setTimeout(() => {
          alert(message);
        }, 100);
      }
    }

    function handleCollisions() {
      for (const bird of birds) {
        if (!bird.launched) continue;

        for (let i = pigs.length - 1; i >= 0; i--) {
          const pig = pigs[i];
          const dx = bird.x - pig.x;
          const dy = bird.y - pig.y;
          const distance = Math.hypot(dx, dy);
          const combinedRadii = bird_size / 2 + pig.width / 2;

          if (distance < combinedRadii) {
            pigs.splice(i, 1);
            score += 1000;
          }
        }

        for (let i = blocks.length - 1; i >= 0; i--) {
          const block = blocks[i];
          const dx = bird.x - block.x;
          const dy = bird.y - block.y;
          const distance = Math.hypot(dx, dy);
          const combinedRadii = bird_size / 2 + block.width / 2;
          if (distance < combinedRadii) {
            blocks.splice(i, 1);
            score += 500;
            bird.vx *= 0.7; 
            bird.vy *= 0.7;
          }
        }
      }

      for (let i = pigs.length - 1; i >= 0; i--) {
        const pig = pigs[i];

        if (pig.y > canvas.height) {
          pigs.splice(i, 1);
          score += 500;
          continue;
        }

        const blocks_below = blocks.filter(b => Math.abs(b.x - pig.x) < block_size / 2 && b.y > pig.y);

        if (blocks_below.length === 0) {
          pig.vy = (pig.vy || 0) + gravity;
          pig.y += pig.vy;
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

      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let t = 0; t < 60; t++) {
        const px = x + vx * t;
        const py = y + vy * t + 0.5 * gravity * t * t;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
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
      gameStarted = true;

      function waitForImages() {
        if (all_images_loaded()) {
          slinger.baseX = Math.max(...birds.map(b => b.x)) + 100;
          draw();
        } else {
          requestAnimationFrame(waitForImages);
        }
      }
      waitForImages();
    }
    document.getElementById("replayBtn").addEventListener("click", () => {
      window.location.reload();
    });
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });

  } catch (err) {
    console.error("Error initializing level1.js:", err);
  }
});

document.getElementById("replayBtn").addEventListener("click",() =>{
  if (score >= 4000){
    window.location.href="../level2/level2.html";
  }
  else{
    document.getElementById("tagline").textContent = "You dont have enough points to clear this level.";
  }
});
function returnkaro(){
  window.location.href='../index.html';
};
