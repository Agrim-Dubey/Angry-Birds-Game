document.addEventListener("DOMContentLoaded", () => {
  function runTransitionAnimation(callback) {
    const canvas = document.getElementById("canvas1");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    Object.assign(canvas.style, {
      zIndex: 1000,
      pointerEvents: "none",
    });
    const sources = [
      "../Assets/character1-removebg-preview.png",
      "../Assets/character2-removebg-preview.png",
      "../Assets/character3-removebg-preview.png",
      "../Assets/character4-removebg-preview.png",
    ];
    const images = [];
    let loaded = 0;
    sources.forEach(src => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        images.push(img);
        if (++loaded === sources.length) startAnimation();
      };
    });
    function startAnimation() {
      const particles = Array.from({ length: 500 }, () => {
        const angle = Math.random() * 2 * Math.PI;
        return {
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: Math.cos(angle) * (5 + Math.random() * 10),
          vy: Math.sin(angle) * (5 + Math.random() * 10),
          size: 20 + Math.random() * 40,
          img: images[Math.floor(Math.random() * images.length)],
          alpha: 1,
        };
      });
      const duration = 2000;
      let start = null;
      function animate(time) {
        if (!start) start = time;
        const progress = Math.min((time - start) / duration, 1);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha = 1 - progress;
          ctx.globalAlpha = p.alpha;
          ctx.drawImage(p.img, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        });
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(0,0,0,${progress})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          callback && callback();
        }
      }
      requestAnimationFrame(animate);
    }
  }
  document.getElementById("play").addEventListener("click", () => {
    runTransitionAnimation(() => {
      window.location.href = "../level1/level1.html";
    });
  });
});


