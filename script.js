function runTransitionAnimation(callback) {
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d');

    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '1000';
    canvas.style.pointerEvents = 'none';

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pigImage = new Image();
    pigImage.src = 'Assets/pigs-removebg-preview.png';

    pigImage.onload = () => {
        const particles = [];
        const particlesCount = 500;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const duration = 2000;
        let startTime = null;

        for (let i = 0; i < particlesCount; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const speed = 5 + Math.random() * 10;
            const size = 20 + Math.random() * 40;
            particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                alpha: 1,
            });
        }

        function animate(time) {
            if (!startTime) startTime = time;
            let elapsed = time - startTime;
            let progress = Math.min(elapsed / duration, 1);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha = 1 - progress;
                ctx.globalAlpha = p.alpha;
                ctx.drawImage(pigImage, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
                ctx.globalAlpha = 1;
            });

            ctx.fillStyle = `rgba(0,0,0,${progress})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                if (callback) callback();
            }
        }

        requestAnimationFrame(animate);
    };
}

const buttons = document.querySelectorAll('.options');

buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        runTransitionAnimation(() => {
            if (target && target !== '#') window.location.href = target;
        });
    });
});