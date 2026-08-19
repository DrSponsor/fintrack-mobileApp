/**
 * Font asset downloader.
 *
 * IMPORTANT — why these URLs point where they do:
 *
 * The previous version of this script pointed every Plus Jakarta Sans weight
 * at google/fonts' `PlusJakartaSans[wght].ttf`, and both JetBrains Mono weights
 * at `JetBrainsMono[wght].ttf`. Those are VARIABLE fonts, so all five "weights"
 * were downloaded as byte-identical files under different names. React Native
 * on Android cannot select a variable-font instance by axis, so every weight
 * rendered at the font's default instance — the app's entire typographic
 * hierarchy was silently flat. Bold headings were not bold.
 *
 * Static instances are therefore mandatory here. google/fonts only ships the
 * variable builds for these two families, so Plus Jakarta Sans comes from its
 * upstream repo (tokotype) and JetBrains Mono from JetBrains' own repo, both of
 * which publish real per-weight static TTFs.
 *
 * Two families only, by decision: Plus Jakarta Sans sets everything that is
 * language, JetBrains Mono sets everything that is a number. A third display
 * face was tried and cut — the contrast that carries this design comes from
 * proportional-vs-monospaced, not from adding typefaces.
 *
 * The verification pass at the end fails the script if any two files come out
 * identical, so this class of bug cannot silently return.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
// Named to avoid shadowing Node's `crypto` global, which is WebCrypto and has
// no createHash.
const nodeCrypto = require('node:crypto');

const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const PJS = 'https://raw.githubusercontent.com/tokotype/PlusJakartaSans/master/fonts/ttf';
const JBM = 'https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/fonts/ttf';
// (Instrument Serif removed — the display face is now Plus Jakarta Sans ExtraBold.)

const fonts = [
  // UI workhorse — static instances, one file per weight.
  { target: 'PlusJakartaSans-Regular.ttf', url: `${PJS}/PlusJakartaSans-Regular.ttf` },
  { target: 'PlusJakartaSans-Medium.ttf', url: `${PJS}/PlusJakartaSans-Medium.ttf` },
  { target: 'PlusJakartaSans-SemiBold.ttf', url: `${PJS}/PlusJakartaSans-SemiBold.ttf` },
  { target: 'PlusJakartaSans-Bold.ttf', url: `${PJS}/PlusJakartaSans-Bold.ttf` },
  { target: 'PlusJakartaSans-ExtraBold.ttf', url: `${PJS}/PlusJakartaSans-ExtraBold.ttf` },

  // Every number in the app — amounts, balances, percentages, account numbers,
  // reference IDs, timestamps. The full weight range is needed because monospace
  // now has to carry a 56px hero balance as well as 11px metadata, and Regular
  // at hero size looks anaemic.
  { target: 'JetBrainsMono-Regular.ttf', url: `${JBM}/JetBrainsMono-Regular.ttf` },
  { target: 'JetBrainsMono-Medium.ttf', url: `${JBM}/JetBrainsMono-Medium.ttf` },
  { target: 'JetBrainsMono-SemiBold.ttf', url: `${JBM}/JetBrainsMono-SemiBold.ttf` },
  { target: 'JetBrainsMono-Bold.ttf', url: `${JBM}/JetBrainsMono-Bold.ttf` },
];

function downloadFile(url, dest, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const { statusCode, headers } = response;

        if (statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308) {
          response.resume();
          if (redirectsLeft === 0) {
            return reject(new Error('Too many redirects'));
          }
          return downloadFile(headers.location, dest, redirectsLeft - 1).then(resolve).catch(reject);
        }

        if (statusCode !== 200) {
          response.resume();
          return reject(new Error(`Status code ${statusCode}`));
        }

        const file = fs.createWriteStream(dest);
        response.pipe(file);
        // Only resolve once the bytes are actually flushed to disk — `finish`
        // alone can fire before close on some platforms.
        file.on('finish', () => file.close(() => resolve()));
        file.on('error', (err) => {
          fs.unlink(dest, () => reject(err));
        });
      })
      .on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
  });
}

function hashFile(filePath) {
  return nodeCrypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * Guards against the variable-font regression described in the header: if two
 * targets resolve to identical bytes, the weight hierarchy is broken even
 * though every download "succeeded".
 */
function verifyDistinct() {
  const byHash = new Map();

  for (const font of fonts) {
    const filePath = path.join(fontsDir, font.target);
    if (!fs.existsSync(filePath)) continue;
    const hash = hashFile(filePath);
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push(font.target);
  }

  const collisions = [...byHash.values()].filter((group) => group.length > 1);
  if (collisions.length === 0) {
    console.log('\n✅ Verified: every font file is distinct.');
    return true;
  }

  console.error('\n❌ Identical font files detected — the weight hierarchy would be broken:');
  for (const group of collisions) {
    console.error(`   ${group.join('  ==  ')}`);
  }
  console.error('\n   These are almost certainly variable-font builds. Point the URLs at');
  console.error('   static per-weight instances instead. See this file\'s header comment.');
  return false;
}

async function downloadAll() {
  console.log('Downloading font assets...\n');
  let successCount = 0;

  for (const font of fonts) {
    const filePath = path.join(fontsDir, font.target);
    try {
      await downloadFile(font.url, filePath);
      const { size } = fs.statSync(filePath);
      console.log(`  ${font.target.padEnd(34)} ${(size / 1024).toFixed(1)} KB`);
      successCount++;
    } catch (error) {
      console.error(`  ${font.target.padEnd(34)} FAILED — ${error.message}`);
    }
  }

  console.log(`\nDownloaded ${successCount}/${fonts.length} fonts.`);

  const distinct = verifyDistinct();
  if (successCount !== fonts.length || !distinct) {
    process.exitCode = 1;
  }
}

downloadAll();
