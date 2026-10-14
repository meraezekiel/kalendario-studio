import type { Asset } from './types';

const cache: Record<number, Asset> = {};

/** Generated sunset placeholder photo, tinted per month. Browser only. */
export function samplePhoto(m: number): Asset {
  if (cache[m]) return cache[m];
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 800;
  const g = c.getContext('2d')!;
  const h = (m * 29 + 330) % 360;
  let gr = g.createLinearGradient(0, 0, 0, 560);
  gr.addColorStop(0, `hsl(${h},48%,20%)`);
  gr.addColorStop(0.6, `hsl(${h + 25},70%,55%)`);
  gr.addColorStop(1, `hsl(${h + 45},95%,72%)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 1200, 560);
  const sx = 760, sy = 470;
  const rg = g.createRadialGradient(sx, sy, 10, sx, sy, 260);
  rg.addColorStop(0, `hsla(${h + 50},100%,88%,.95)`);
  rg.addColorStop(0.25, `hsla(${h + 45},100%,75%,.5)`);
  rg.addColorStop(1, 'hsla(0,0%,100%,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 1200, 800);
  g.fillStyle = `hsl(${h + 50},100%,90%)`;
  g.beginPath();
  g.arc(sx, sy, 62, 0, Math.PI * 2);
  g.fill();
  gr = g.createLinearGradient(0, 540, 0, 800);
  gr.addColorStop(0, `hsl(${h + 20},45%,32%)`);
  gr.addColorStop(1, `hsl(${h},50%,12%)`);
  g.fillStyle = gr;
  g.fillRect(0, 540, 1200, 260);
  g.fillStyle = `hsla(${h + 50},100%,85%,.55)`;
  for (let i = 0; i < 14; i++) {
    const w = 140 - i * 8, y = 555 + i * 15;
    g.fillRect(sx - w / 2 + Math.sin(i) * 12, y, w, 3);
  }
  g.fillStyle = `hsl(${h},40%,9%)`;
  g.beginPath();
  g.moveTo(0, 560);
  g.bezierCurveTo(140, 470, 300, 500, 420, 548);
  g.lineTo(420, 560);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(320, 548);
  g.bezierCurveTo(380, 500, 520, 505, 580, 548);
  g.closePath();
  g.fill();
  g.strokeStyle = g.fillStyle;
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(450, 530);
  g.quadraticCurveTo(440, 460, 462, 400);
  g.stroke();
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i * Math.PI) / 6;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(462, 400);
    g.quadraticCurveTo(462 + Math.cos(a) * 50, 400 + Math.sin(a) * 50 - 10, 462 + Math.cos(a) * 90, 400 + Math.sin(a) * 90 + 28);
    g.stroke();
  }
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(255,255,255,${(i % 7) / 10})`;
    g.fillRect((i * 197) % 1200, (i * 61) % 260, 2, 2);
  }
  return (cache[m] = { src: c.toDataURL('image/jpeg', 0.85), w: 1200, h: 800 });
}

/** Downscales an uploaded image to at most 2000px and returns it as a data URL asset. */
export function readImage(file: File): Promise<Asset> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, 2000 / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * k);
        c.height = Math.round(im.height * k);
        c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
        const alpha = /png|webp|gif/.test(file.type);
        res({ src: c.toDataURL(alpha ? 'image/png' : 'image/jpeg', 0.9), w: c.width, h: c.height });
      };
      im.onerror = rej;
      im.src = r.result as string;
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
