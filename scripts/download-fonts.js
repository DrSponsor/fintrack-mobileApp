const fs = require('fs');
const path = require('path');
const https = require('https');

const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Direct raw GitHub URLs from official font repositories (tokotype/PlusJakartaSans & JetBrains/JetBrainsMono)
const fonts = [
  {
    target: 'PlusJakartaSans-Regular.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf',
  },
  {
    target: 'PlusJakartaSans-Medium.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf',
  },
  {
    target: 'PlusJakartaSans-SemiBold.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf',
  },
  {
    target: 'PlusJakartaSans-Bold.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf',
  },
  {
    target: 'PlusJakartaSans-ExtraBold.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf',
  },
  {
    target: 'JetBrainsMono-Regular.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf',
  },
  {
    target: 'JetBrainsMono-Medium.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf',
  },
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Status code ${response.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadAll() {
  console.log('📦 Downloading FinTrack font assets from Google Fonts GitHub repository...\n');
  let successCount = 0;
  for (const font of fonts) {
    const filePath = path.join(fontsDir, font.target);
    try {
      console.log(`⬇️ Downloading ${font.target}...`);
      await downloadFile(font.url, filePath);
      const stats = fs.statSync(filePath);
      console.log(`✅ Saved to assets/fonts/${font.target} (${(stats.size / 1024).toFixed(1)} KB)`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error downloading ${font.target}:`, error.message);
    }
  }
  if (successCount === fonts.length) {
    console.log('\n✨ All font assets downloaded successfully!');
  } else {
    console.log(`\n⚠️ Downloaded ${successCount}/${fonts.length} fonts.`);
  }
}

downloadAll();
