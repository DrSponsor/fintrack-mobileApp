const fs = require('fs');
const path = require('path');

const brainImgPath = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\b7392a14-93e5-4ff7-af91-079a0a37048b\\fintrack_logo_1783681602100.png';
const assetsDir = path.join(__dirname, 'assets');

const targetFiles = [
  'icon.png',
  'adaptive-icon.png',
  'splash-icon.png',
  'notification-icon.png'
];

try {
  // Create assets folder if it doesn't exist
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
    console.log('Created assets directory.');
  }

  // Copy the generated logo to each asset path
  if (fs.existsSync(brainImgPath)) {
    targetFiles.forEach(file => {
      const dest = path.join(assetsDir, file);
      fs.copyFileSync(brainImgPath, dest);
      console.log(`Copied logo to assets/${file}`);
    });
    console.log('\nAll asset placeholders created successfully!');
  } else {
    console.error(`Error: Could not find the generated logo at: ${brainImgPath}`);
  }
} catch (error) {
  console.error('Failed to setup assets:', error);
}
