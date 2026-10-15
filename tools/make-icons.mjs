// 앱 아이콘 생성: node tools/make-icons.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_PATH || 'sharp');
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#16222c"/>
<g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
<rect x="96" y="96" width="320" height="320" rx="28" fill="none" stroke="#e2b45c" stroke-width="22"/>
<line x1="200" y1="150" x2="200" y2="370" stroke="#e2b45c" stroke-width="14"/>
<rect x="168" y="200" width="64" height="120" fill="#16222c" stroke="#e2b45c" stroke-width="14"/>
<line x1="312" y1="170" x2="312" y2="340" stroke="#e2b45c" stroke-width="14"/>
<rect x="280" y="215" width="64" height="85" fill="#e2b45c"/>
</g></svg>`;
for (const [name, size, pad] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-maskable-512.png', 512, 56]]) {
  await sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile('icons/' + name);
}
console.log('icons ok');
