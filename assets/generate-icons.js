const fs = require('fs');
const { execSync } = require('child_process');

try {
  require.resolve('sharp');
} catch (e) {
  console.log('Installing sharp...');
  execSync('npm init -y && npm install sharp', { stdio: 'inherit' });
}

const sharp = require('sharp');

async function generate() {
  console.log('Generating icon.png...');
  await sharp('icon.svg')
    .resize(1024, 1024)
    .removeAlpha()
    .png()
    .toFile('icon.png');

  console.log('Generating adaptive-icon.png...');
  await sharp('logo.svg')
    .resize(1024, 1024)
    .png()
    .toFile('adaptive-icon.png');

  console.log('Generating splash-icon.png...');
  await sharp('logo.svg')
    .resize(1024, 1024)
    .png()
    .toFile('splash-icon.png');

  console.log('Generating favicon.png...');
  // For favicon, we might want the red background but rounded. 
  // Wait, the prompt said "favicon.png (simplified version if necessary)".
  // I will just use the red background icon scaled down.
  await sharp('icon.svg')
    .resize(64, 64)
    .png()
    .toFile('favicon.png');

  console.log('Done!');
}

generate().catch(console.error);
