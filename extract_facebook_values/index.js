const fs = require('fs').promises;
const cheerio = require('cheerio');
const { stringify } = require('csv-stringify');

async function scrapeMarketplaceItem(itemHtmlContent) {
  const $ = cheerio.load(itemHtmlContent);

  const data = {
    productUrl: null, // This will be the full Facebook Marketplace link
    imageUrl: null,
    imageAltText: null,
    currentPrice: null,
    originalPrice: null,
    productDescription: null,
    location: null,
  };

  // Product URL - ENSURE THIS IS THE FULL ABSOLUTE LINK
  const productLinkElement = $('a.x1i10hfl');
  if (productLinkElement.length > 0) {
    const relativeHref = productLinkElement.attr('href');
    if (relativeHref) {
      data.productUrl = relativeHref.startsWith('http')
        ? relativeHref
        : `https://www.facebook.com${relativeHref}`;
    }
  }

  // Image URL and Alt Text (Product Title)
  const imageElement = $('img.x15mokao');
  if (imageElement.length > 0) {
    data.imageUrl = imageElement.attr('src') || null;
    data.imageAltText = imageElement.attr('alt') || null;
  }

  // --- Price Extraction ---
  const priceContainer = $(
    'div.x1gslohp.xkh6y0r > span > div.x78zum5.x1q0g3np.x1iorvi4.xyri2b.xjkvuk6.x1c1uobl'
  );

  if (priceContainer.length > 0) {
    const currentPriceElement = priceContainer.find('> span.x193iq5w').first();
    if (currentPriceElement.length > 0) {
      data.currentPrice = currentPriceElement.text().trim();
    }

    const originalPriceElement = priceContainer.find('span.xdzw4kq > span').first();
    if (originalPriceElement.length > 0) {
      data.originalPrice = originalPriceElement.text().trim();
    }
  }

  // --- Description Extraction ---
  const descriptionOuterContainer = $(
    'div.x1gslohp.xkh6y0r'
  ).eq(1); // Second instance of this general container

  if (descriptionOuterContainer.length > 0) {
    const descriptionTextDiv = descriptionOuterContainer.find(
      'div.xyqdw3p.xyri2b.xjkvuk6.x1c1uobl'
    ).first();
    if (descriptionTextDiv.length > 0) {
      data.productDescription = descriptionTextDiv
        .text()
        .replace(/\s+/g, ' ')
        .trim();
    } else if (data.imageAltText) {
      data.productDescription = data.imageAltText
        .replace(/ in .*, CO$/, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  // --- Location Extraction ---
  const locationOuterContainer = $('div.x1gslohp.xkh6y0r').last();

  if (locationOuterContainer.length > 0) {
    const locationTextDiv = locationOuterContainer.find(
      'div.x1iorvi4.xyri2b.xjkvuk6.x1c1uobl'
    ).first();
    if (locationTextDiv.length > 0) {
      data.location = locationTextDiv
        .text()
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  return data;
}

// readAndScrapeFile remains the same
async function readAndScrapeFile(filePath) {
  try {
    const fullHtml = await fs.readFile(filePath, 'utf8');
    const $ = cheerio.load(fullHtml);

    const marketplaceItemsContainer = $(
      'div.x8gbvx8.x78zum5.x1q0g3np.x1a02dak.x1nhvcw1.x1rdy4ex.x1lxpwgx.x4vbgl9.x165d6jo'
    );

    const allExtractedDataPromises = [];

    marketplaceItemsContainer
      .find(
        'div.x9f619.x78zum5.x1r8uery.xdt5ytf.x1iyjqo2.xs83m0k.x135b78x.x11lfxj5.xexx8yu.x18d9i69.xnpuxes.x1cjf5ee.x17dddeq'
      )
      .each((index, element) => {
        const itemHtml = $.html(element);
        allExtractedDataPromises.push(scrapeMarketplaceItem(itemHtml));
      });

    const resolvedData = await Promise.all(allExtractedDataPromises);

    return resolvedData;
  } catch (error) {
    console.error(`Error reading or scraping file '${filePath}':`, error);
    return null;
  }
}

// --- CSV Generation Logic ---
async function generateShopifyCsv(extractedData, outputPath) {
  // NEW SHOPIFY HEADERS
  const shopifyHeaders = [
    'Handle',
    'Title',
    'Body (HTML)',
    'Vendor',
    'Product Category',
    'Type',
    'Tags',
    'Published',
    'Option1 Name',
    'Option1 Value',
    'Option2 Name',
    'Option2 Value',
    'Option3 Name',
    'Option3 Value',
    'Variant SKU',
    'Variant Grams',
    'Variant Inventory Tracker',
    'Variant Inventory Qty',
    'Variant Inventory Policy',
    'Variant Fulfillment Service',
    'Variant Price',
    'Variant Compare At Price',
    'Variant Requires Shipping',
    'Variant Taxable',
    'Variant Barcode',
    'Image Src',
    'Image Position',
    'Image Alt Text',
    'Gift Card',
    'SEO Title',
    'SEO Description',
    'Google Shopping / Google Product Category',
    'Google Shopping / Gender',
    'Google Shopping / Age Group',
    'Google Shopping / MPN',
    'Google Shopping / Condition',
    'Google Shopping / Custom Product',
    'Variant Image', // This is usually for specific variant images, if multiple variants exist
    'Variant Weight Unit',
    'Variant Tax Code',
    'Cost per item',
    'Included / United States', // New pricing field
    'Price / United States', // New pricing field
    'Compare At Price / United States', // New pricing field
    'Included / International', // New pricing field
    'Price / International', // New pricing field
    'Compare At Price / International', // New pricing field
    'Status',
  ];

  const records = [];

  for (const item of extractedData) {
    const currentPriceNum = parseFloat(item.currentPrice?.replace(/[^0-9.-]+/g, '')) || 0;
    const originalPriceNum = parseFloat(item.originalPrice?.replace(/[^0-9.-]+/g, '')) || 0;

    // Generate a basic URL handle from the product title
    // Shopify handles require no spaces or special characters, typically hyphenated
    const titleForHandle = (item.imageAltText || item.productDescription || 'untitled-product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens

    // Description with FB link appended
    const fullDescriptionHtml = `<p>${
      item.productDescription || ''
    }</p><p>Original Facebook Marketplace Listing: <a href="${
      item.productUrl
    }">${item.productUrl}</a></p><p>Location: ${item.location || 'N/A'}</p>`;

    const row = {
      Handle: titleForHandle,
      Title: item.imageAltText || item.productDescription || '',
      'Body (HTML)': fullDescriptionHtml, // Changed from 'Description' to 'Body (HTML)'
      Vendor: 'Facebook Marketplace',
      'Product Category': '',
      Type: '',
      Tags: item.location ? `marketplace, ${item.location.replace(/\s+/g, '-').toLowerCase()}` : 'marketplace', // Cleaned location for tags
      Published: 'TRUE',
      'Option1 Name': 'Title',
      'Option1 Value': item.imageAltText || item.productDescription || '',
      'Option2 Name': '',
      'Option2 Value': '',
      'Option3 Name': '',
      'Option3 Value': '',
      'Variant SKU': '',
      'Variant Grams': '0',
      'Variant Inventory Tracker': 'shopify', // Default tracker
      'Variant Inventory Qty': '1',
      'Variant Inventory Policy': 'deny', // 'deny' means don't sell when out of stock
      'Variant Fulfillment Service': 'manual',
      'Variant Price': currentPriceNum.toFixed(2),
      'Variant Compare At Price': originalPriceNum > currentPriceNum ? originalPriceNum.toFixed(2) : '',
      'Variant Requires Shipping': 'TRUE',
      'Variant Taxable': 'FALSE',
      'Variant Barcode': '',
      'Image Src': item.imageUrl || '',
      'Image Position': '1',
      'Image Alt Text': item.imageAltText || '',
      'Gift Card': 'FALSE',
      'SEO Title': item.imageAltText || '',
      'SEO Description': item.productDescription || '',
      'Google Shopping / Google Product Category': '',
      'Google Shopping / Gender': '',
      'Google Shopping / Age Group': '',
      'Google Shopping / MPN': '',
      'Google Shopping / Condition': 'used',
      'Google Shopping / Custom Product': '',
      'Variant Image': item.imageUrl || '', // Assuming primary image is also variant image if only one variant
      'Variant Weight Unit': 'kg',
      'Variant Tax Code': '',
      'Cost per item': '',
      'Included / United States': 'TRUE',
      'Price / United States': currentPriceNum.toFixed(2),
      'Compare At Price / United States': originalPriceNum > currentPriceNum ? originalPriceNum.toFixed(2) : '',
      'Included / International': 'TRUE',
      'Price / International': currentPriceNum.toFixed(2),
      'Compare At Price / International': originalPriceNum > currentPriceNum ? originalPriceNum.toFixed(2) : '',
      Status: 'active',
    };
    records.push(row);
  }

  return new Promise((resolve, reject) => {
    stringify(records, { header: true, columns: shopifyHeaders }, (err, output) => {
      if (err) return reject(err);
      fs.writeFile(outputPath, output, 'utf8')
        .then(() => resolve(outputPath))
        .catch(reject);
    });
  });
}

// Main execution flow (remains the same)
const htmlFilePath = 'marketplace_page.html';
const csvOutputPath = 'shopify_marketplace_products.csv';

readAndScrapeFile(htmlFilePath)
  .then(async (data) => {
    if (data && data.length > 0) {
      console.log(`Found ${data.length} items. Generating CSV...`);
      const outputCsvPath = await generateShopifyCsv(data, csvOutputPath);
      console.log(`CSV generated successfully at: ${outputCsvPath}`);
    } else {
      console.log('No data extracted to write to CSV.');
    }
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
  });