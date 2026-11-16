import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const buildDir = path.join(rootDir, 'build');

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

const size = 256;
const header = `P6\n${size} ${size}\n255\n`;
const pixels = Buffer.alloc(size * size * 3);

const center = size / 2;
const radiusOuter = 110;
const radiusInner = 82;
const coreRadius = 28;

// Colors
const bgR = 0x1A, bgG = 0x6B, bgB = 0x4E;       // Emerald #1A6B4E
const ringR = 0xEA, ringG = 0xA8, ringB = 0x43;   // Warm Amber #EAA843
const innerR = 0x0E, innerG = 0x3E, innerB = 0x2D; // Deep Forest #0E3E2D
const coreR = 0xFA, coreG = 0xF9, coreB = 0xF5;   // Warm White #FAF9F5

for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const idx = (y * size + x) * 3;
    const dx = x - center;
    const dy = y - center;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Rounded app icon shape (squircle)
    const cornerDist = Math.pow(Math.abs(dx) / 115, 4) + Math.pow(Math.abs(dy) / 115, 4);

    if (cornerDist > 1.0) {
      // Background transparent / black
      pixels[idx] = 0;
      pixels[idx + 1] = 0;
      pixels[idx + 2] = 0;
    } else {
      // Inside squircle
      let r = bgR, g = bgG, b = bgB;

      if (dist <= radiusOuter && dist >= radiusInner) {
        // Outer focus ring
        r = ringR;
        g = ringG;
        b = ringB;
      } else if (dist < radiusInner && dist > coreRadius + 12) {
        // Inner well
        r = innerR;
        g = innerG;
        b = innerB;
      } else if (dist <= coreRadius) {
        // Center focal beacon
        r = coreR;
        g = coreG;
        b = coreB;
      }

      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
    }
  }
}

const ppmPath = path.join(buildDir, 'icon.ppm');
const pngPath = path.join(buildDir, 'icon.png');
const icoPath = path.join(buildDir, 'icon.ico');

fs.writeFileSync(ppmPath, Buffer.concat([Buffer.from(header, 'ascii'), pixels]));

try {
  execSync(`ffmpeg -y -i "${ppmPath}" "${pngPath}"`, { stdio: 'pipe' });
  execSync(`ffmpeg -y -i "${pngPath}" "${icoPath}"`, { stdio: 'pipe' });
  fs.unlinkSync(ppmPath);
  console.log('Icon generated successfully:', pngPath, icoPath);
} catch (err) {
  console.error('Failed to convert icon with ffmpeg:', err.message);
}
