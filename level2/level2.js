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
    const block_images = [
      "../Assets/woodenblocks.png",
      "../Assets/box2.png",
      "../Assets/hehepig.png",
    ];

    const bird_size = 35;
    const birds = [];
    let bird_y = canvas.height - 135;
    const left_region_width = canvas.width * 0.2;
    const max_birds_fit = Math.floor(left_region_width / bird_size);
    const num_of_birds = Math.max(1, max_birds_fit) -1;

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

    const block_size = 35;
    const blocks = [];
    const pigs = [];
    let score = 0;
    let animationId = null;

    function generate_structure() {
      blocks.length = 0;
      pigs.length = 0;

      const base_y = bird_y + 5;
      const numcolumns = 18;
      const maxcolumnheight = 12;

      for (let col = 0; col < numcolumns; col++) {
        const colheight = Math.floor(Math.random() * maxcolumnheight) + 3;
        const colx = canvas.width * 0.35 + col * (block_size + 6);

        for (let row = 0; row < colheight; row++) {
          const yOffset = Math.random() < 0.2 ? -block_size/2 : 0;
          const y = base_y - row * block_size + yOffset;
          const img = new Image();
          const randomBlock = block_images[Math.floor(Math.random() * block_images.length)];
          img.src = randomBlock;
          const block = {
            img,
            x: colx,
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
        { colIndex: 2, rowOffset: 8 },
        { colIndex: 5, rowOffset: 10 },
        { colIndex: 9, rowOffset: 11 },
        { colIndex: 12, rowOffset: 9 },
        { colIndex: 16, rowOffset: 12 } // King pig
      ];

      for (let i = 0; i < pigPositions.length; i++) {
        const pos = pigPositions[i];
        const pigImg = new Image();
        const isKing = i === pigPositions.length - 1;
        pigImg.src = isKing ? "../Assets/kingpigasli.png" : "../Assets/basicpig.png";
        const blockCol = blocks.filter(b => b.x === canvas.width * 0.35 + pos.colIndex * (block_size + 6));
        const topBlock = blockCol.length ? blockCol[blockCol.length - 1] : { y: base_y };
        const pig = {
          img: pigImg,
          x: topBlock.x,
          y: topBlock.y - pos.rowOffset * block_size,
          width: block_size,
          height: block_size,
          loaded: false,
          hit: false,
          vx: 0,
          vy: 0,
          mass: 1,
          king: isKing
        };
        pigs.push(pig);
        pigImg.onload = () => { pig.loaded = true; };
        pigImg.onerror = () => { pig.loaded = true; };
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
          const combinedRadii = bird_size / 2 + pig.width / 2 + 5;
          if (distance < combinedRadii) {
            const impactSpeed = Math.hypot(bird.vx, bird.vy);
            if (impactSpeed > impactThreshold) {
              if (pig.king) {
                endGame("You Won!");
              }
              pigs.splice(i, 1);
              score += pig.king ? 5000 : 1000;
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

      const allObjects = [...blocks, ...pigs];
      for (const obj of allObjects) {
        obj.vy += gravity;
        obj.x += obj.vx;
        obj.y += obj.vy;

        obj.vx *= 0.95;
        obj.vy *= 0.95;

        const groundY = bird_y;
        if (obj.y + obj.height / 2 > groundY) {
          obj.y = groundY - obj.height / 2;
          obj.vy *= -0.4;
          obj.vx *= 0.6;
        }

        if (obj.x < 0) { obj.x = 0; obj.vx *= -0.3; }
        else if (obj.x > canvas.width) { obj.x = canvas.width; obj.vx *= -0.3; }
      }

      for (let i = 0; i < allObjects.length; i++) {
        for (let j = i + 1; j < allObjects.length; j++) {
          const a = allObjects[i];
          const b = allObjects[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          const minDist = (a.width + b.width) / 2;

          if (dist <= 0) continue;
          if (dist < minDist) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            a.x += nx * overlap * 0.5;
            a.y += ny * overlap * 0.5;
            b.x -= nx * overlap * 0.5;
            b.y -= ny * overlap * 0.5;

            const push = 0.4;
            const ax = a.vx, ay = a.vy;
            a.vx = b.vx * push;
            a.vy = b.vy * push;
            b.vx = ax * push;
            b.vy = ay * push;
          }
        }
      }
    }

    function drawTrajectory(x, y) {
      const { forkX, forkY } = getSlingGeometry();
      const dx = forkX - x;
      const dy = forkY - y;
      const power = 0.2;
      const vx = dx * power;
      const vy = dy * power;
      ctx.fillStyle = "black";
      for (let t = 0; t < 60; t += 3) {
        const px = x + vx * t;
        const py = y + vy * t + 0.5 * gravity * t * t;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
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
            slinger.held_bird = bird;
            bird.onsling = true;
          }
        } else if (!bird.launched) {
          const size = bird_size * alpha;
          ctx.drawImage(bird.img, bird.x - size / 2, bird.y - size / 2, size, size);
        } else {
          const size = bird_size;
          ctx.drawImage(bird.img, bird.x - size / 2, bird.y - size / 2, size, size);
        }
      });

      blocks.forEach(block => {
        ctx.drawImage(block.img, block.x - block.width / 2, block.y - block.height / 2, block.width, block.height);
      });

      pigs.forEach(pig => {
        ctx.drawImage(pig.img, pig.x - pig.width / 2, pig.y - pig.height / 2, pig.width, pig.height);
      });

      if (slinger.held_bird || dragging) draw_slinger();
      handleCollisions();
      updateBirds();
      animationId = requestAnimationFrame(draw);
    }

    start_time = Date.now();
    generate_structure();
    gameStarted = true;
    draw();

    slinger.baseX = birds[0].x;
    slinger.held_bird = birds[0];
    birds[0].onsling = true;

  } catch (err) {
    console.error("Error initializing game:", err);
  }
});
