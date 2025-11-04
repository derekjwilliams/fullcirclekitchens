const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const axios = require('axios');

class ImageDownloader {
  constructor(downloadDir = 'downloaded_images') {
    this.downloadDir = downloadDir;
    this.ensureDirectoryExists();
  }

  ensureDirectoryExists() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  async downloadImage(url, filename) {
    try {
      console.log(`Downloading: ${url}`);
      
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 30000
      });

      const filePath = path.join(this.downloadDir, filename);
      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      });
    } catch (error) {
      console.error(`Failed to download ${url}:`, error.message);
      throw error;
    }
  }

  generateFilename(url, index) {
    try {
      const urlObj = new URL(url);
      const extension = path.extname(urlObj.pathname) || '.jpg';
      return `image_${index}${extension}`;
    } catch {
      return `image_${index}.jpg`;
    }
  }

  async downloadFromCsv(csvFilePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          console.log(`Found ${results.length} rows in CSV`);
          
          let downloadCount = 0;
          let errorCount = 0;

          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const imageUrls = row.Images.split(',').map(url => url.trim()).filter(url => url.length > 0);
            
            console.log(`\nProcessing row ${i + 1} with ${imageUrls.length} images:`);
            
            for (let j = 0; j < imageUrls.length; j++) {
              const imageUrl = imageUrls[j];
              
              try {
                const filename = this.generateFilename(imageUrl, downloadCount + 1);
                await this.downloadImage(imageUrl, filename);
                downloadCount++;
                console.log(`✓ Successfully downloaded: ${filename}`);
              } catch (error) {
                errorCount++;
                console.log(`✗ Failed to download image ${j + 1} from row ${i + 1}`);
              }
              
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          console.log(`\n=== Download Summary ===`);
          console.log(`Successfully downloaded: ${downloadCount} images`);
          console.log(`Failed downloads: ${errorCount}`);
          console.log(`Images saved in: ${path.resolve(this.downloadDir)}`);
          resolve();
        })
        .on('error', reject);
    });
  }
}

// Run the script
const csvFile = process.argv[2] || 'input.csv';
const downloader = new ImageDownloader();

downloader.downloadFromCsv(csvFile)
  .then(() => console.log('Download completed!'))
  .catch(error => console.error('Error:', error));