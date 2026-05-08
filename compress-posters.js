const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const directory = './posters';

// Check if directory exists
if (!fs.existsSync(directory)) {
    console.error('Error: "posters" folder not found. Run this from the project root.');
    process.exit(1);
}

const files = fs.readdirSync(directory);
const imageFiles = files.filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

console.log(`Found ${imageFiles.length} images. Starting compression...`);

async function compressImages() {
    for (const file of imageFiles) {
        const filePath = path.join(directory, file);
        const tmpPath = path.join(directory, `temp_${file}`);

        try {
            await sharp(filePath)
                .resize(800) // Max width 800px
                .jpeg({ quality: 70, mozjpeg: true }) // Compress quality
                .toFile(tmpPath);

            // Replace original with compressed version
            fs.unlinkSync(filePath);
            fs.renameSync(tmpPath, filePath);
            console.log(`✅ Compressed: ${file}`);
        } catch (err) {
            console.error(`❌ Failed to compress ${file}:`, err.message);
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        }
    }
    console.log('\n✨ All images compressed successfully!');
}

compressImages();
