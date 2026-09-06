const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const logo = path.join(__dirname, 'new_app_logo.png');
const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
};

const fgSizes = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432,
};

async function generate() {
    for (const [folder, size] of Object.entries(sizes)) {
        const outDir = path.join(resDir, folder);
        // ic_launcher.png
        await sharp(logo)
            .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toFile(path.join(outDir, 'ic_launcher.png'));
        // ic_launcher_round.png
        await sharp(logo)
            .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toFile(path.join(outDir, 'ic_launcher_round.png'));
        console.log(`Generated ${folder} (${size}x${size})`);
    }

    for (const [folder, size] of Object.entries(fgSizes)) {
        const outDir = path.join(resDir, folder);
        await sharp(logo)
            .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toFile(path.join(outDir, 'ic_launcher_foreground.png'));
        console.log(`Generated ${folder} foreground (${size}x${size})`);
    }

    console.log('All icons generated!');
}

generate().catch(console.error);
