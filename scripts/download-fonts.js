import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fontsDir = path.resolve(__dirname, '../client/public/fonts');

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

async function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function getGoogleFontWoff2(family, weight = '400', style = 'normal') {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  const cssBuf = await fetchBuffer(cssUrl);
  const css = cssBuf.toString('utf8');
  const match = css.match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/);
  if (!match) {
    throw new Error(`Could not find woff2 url in CSS for ${family} ${weight}`);
  }
  return fetchBuffer(match[1]);
}

async function downloadAll() {
  console.log('Downloading offline fonts...');

  const targets = [
    { family: 'Newsreader', weight: '400', file: 'Newsreader-Regular.woff2' },
    { family: 'Newsreader', weight: '600', file: 'Newsreader-SemiBold.woff2' },
    { family: 'Newsreader', weight: '700', file: 'Newsreader-Bold.woff2' },
    { family: 'Plus Jakarta Sans', weight: '400', file: 'PlusJakartaSans-Regular.woff2' },
    { family: 'Plus Jakarta Sans', weight: '500', file: 'PlusJakartaSans-Medium.woff2' },
    { family: 'Plus Jakarta Sans', weight: '600', file: 'PlusJakartaSans-SemiBold.woff2' },
    { family: 'Plus Jakarta Sans', weight: '700', file: 'PlusJakartaSans-Bold.woff2' },
    { family: 'IBM Plex Mono', weight: '400', file: 'IBMPlexMono-Regular.woff2' },
    { family: 'IBM Plex Mono', weight: '500', file: 'IBMPlexMono-Medium.woff2' },
    { family: 'IBM Plex Mono', weight: '600', file: 'IBMPlexMono-SemiBold.woff2' }
  ];

  for (const t of targets) {
    const dest = path.join(fontsDir, t.file);
    if (!fs.existsSync(dest)) {
      try {
        console.log(`Fetching ${t.family} (${t.weight}) -> ${t.file}`);
        const buf = await getGoogleFontWoff2(t.family, t.weight);
        fs.writeFileSync(dest, buf);
        console.log(`Saved ${t.file} (${buf.length} bytes)`);
      } catch (e) {
        console.error(`Error downloading ${t.file}:`, e.message);
      }
    }
  }

  // OpenDyslexic (hosted on github or cdn)
  const odDest = path.join(fontsDir, 'OpenDyslexic-Regular.woff2');
  if (!fs.existsSync(odDest)) {
    try {
      console.log('Fetching OpenDyslexic-Regular.woff2...');
      const odBuf = await fetchBuffer('https://raw.githubusercontent.com/antijingoist/opendyslexic/master/compiled/OpenDyslexic-Regular.woff2');
      fs.writeFileSync(odDest, odBuf);
      console.log(`Saved OpenDyslexic-Regular.woff2 (${odBuf.length} bytes)`);
    } catch (e) {
      console.error('Error fetching OpenDyslexic from github:', e.message);
    }
  }

  const odBoldDest = path.join(fontsDir, 'OpenDyslexic-Bold.woff2');
  if (!fs.existsSync(odBoldDest)) {
    try {
      console.log('Fetching OpenDyslexic-Bold.woff2...');
      const odBoldBuf = await fetchBuffer('https://raw.githubusercontent.com/antijingoist/opendyslexic/master/compiled/OpenDyslexic-Bold.woff2');
      fs.writeFileSync(odBoldDest, odBoldBuf);
      console.log(`Saved OpenDyslexic-Bold.woff2 (${odBoldBuf.length} bytes)`);
    } catch (e) {
      console.error('Error fetching OpenDyslexic-Bold from github:', e.message);
    }
  }

  console.log('All bundled fonts ready.');
}

downloadAll().catch(console.error);
