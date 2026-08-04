const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../public/icon.png');
const ANDROID_RES = path.resolve(__dirname, '../src-tauri/gen/android/app/src/main/res');
const ICONS_DIR = path.resolve(__dirname, '../icons');

const android_sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const tauri_png = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
];

async function main() {
  for (const [dir, size] of Object.entries(android_sizes)) {
    const outDir = path.join(ANDROID_RES, dir);
    const img = sharp(SRC).resize(size, size);
    await img.clone().toFile(path.join(outDir, 'ic_launcher.png'));
    await img.clone().toFile(path.join(outDir, 'ic_launcher_round.png'));
    await img.clone().toFile(path.join(outDir, 'ic_launcher_foreground.png'));
    console.log(`  ${dir} -> ${size}x${size}`);
  }

  fs.mkdirSync(ICONS_DIR, { recursive: true });
  for (const { name, size } of tauri_png) {
    await sharp(SRC).resize(size, size).toFile(path.join(ICONS_DIR, name));
    console.log(`  icons/${name} -> ${size}x${size}`);
  }

  console.log('\nDone!');
}

main().catch(console.error);
