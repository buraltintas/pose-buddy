import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();

const ICON_SOURCE = path.join(root, 'public', 'icon.svg');
const SPLASH_SOURCE = path.join(root, 'public', 'splash.svg');
const OUTPUT_DIR = path.join(root, 'assets');

const ICON_OUTPUT = path.join(OUTPUT_DIR, 'icon-only.png');
const SPLASH_OUTPUT = path.join(OUTPUT_DIR, 'splash.png');
const SPLASH_DARK_OUTPUT = path.join(OUTPUT_DIR, 'splash-dark.png');

async function ensureSources() {
  await fs.access(ICON_SOURCE);
  await fs.access(SPLASH_SOURCE);
}

async function generateIcon() {
  await sharp(ICON_SOURCE, { density: 300, limitInputPixels: false })
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({ compressionLevel: 9 })
    .toFile(ICON_OUTPUT);
}

async function generateSplash() {
  const render = sharp(SPLASH_SOURCE, {
    density: 300,
    limitInputPixels: false,
  }).resize(2732, 2732, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  });

  await render.png({ compressionLevel: 9 }).toFile(SPLASH_OUTPUT);
  await render.png({ compressionLevel: 9 }).toFile(SPLASH_DARK_OUTPUT);
}

async function main() {
  await ensureSources();
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  await Promise.all([generateIcon(), generateSplash()]);

  console.log('Generated native asset sources:');
  console.log('- assets/icon-only.png');
  console.log('- assets/splash.png');
  console.log('- assets/splash-dark.png');
}

main().catch((error) => {
  console.error('Failed to generate native asset sources', error);
  process.exitCode = 1;
});
