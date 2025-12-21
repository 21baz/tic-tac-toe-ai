// Simple confetti (winner colour)
const confettiCanvas = document.getElementById('confetti');
const cctx = confettiCanvas.getContext('2d');

function confettiResize(){
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', confettiResize);
confettiResize();

let confettiParticles = [];
let confettiRAF = null;

function launchConfetti(hex='#ffd166'){
  const toRgb = h => {
    const c = h.replace('#','');
    const n = parseInt(c,16);
    return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
  };
  const rgb = toRgb(hex);
  const N = 180;

  for (let i=0;i<N;i++){
    confettiParticles.push({
      x: window.innerWidth/2 + (Math.random()*200-100),
      y: window.innerHeight/3,
      vx: (Math.random()-0.5)*6,
      vy: - (4 + Math.random()*6),
      g: 0.18 + Math.random()*0.05,
      size: 4 + Math.random()*5,
      rot: Math.random()*Math.PI,
      vr: (Math.random()-0.5)*0.3,
      alpha: 1,
      colour: `rgba(${rgb.r},${rgb.g},${rgb.b},`
    });
  }
  animateConfetti();
}

function animateConfetti(){
  cancelAnimationFrame(confettiRAF);
  const step = () => {
    cctx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
    confettiParticles.forEach(p=>{
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.alpha *= 0.992;

      cctx.save();
      cctx.translate(p.x,p.y);
      cctx.rotate(p.rot);
      cctx.fillStyle = p.colour + p.alpha + ')';
      cctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);
      cctx.restore();
    });
    confettiParticles = confettiParticles.filter(p => p.y < window.innerHeight + 20 && p.alpha > 0.05);
    if (confettiParticles.length) confettiRAF = requestAnimationFrame(step);
  };
  confettiRAF = requestAnimationFrame(step);
}
