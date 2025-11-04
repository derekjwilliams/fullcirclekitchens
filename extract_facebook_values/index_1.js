const fs = require('fs').promises;
const cheerio = require('cheerio');

async function scrapeMarketplaceItem(itemHtmlContent) {
  const $ = cheerio.load(itemHtmlContent);

  const data = {
    productUrl: null,
    imageUrl: null,
    imageAltText: null, // Also often acts as a robust product title
    currentPrice: null,
    originalPrice: null, // This might not always exist
    productDescription: null,
    location: null,
  };

  // Product URL
  const productLinkElement = $('a.x1i10hfl');
  if (productLinkElement.length > 0) {
    data.productUrl = productLinkElement.attr('href')
      ? `https://www.facebook.com${productLinkElement.attr('href')}`
      : null;
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

// readAndScrapeFile with the corrected selector
async function readAndScrapeFile(filePath) {
  try {
    const fullHtml = await fs.readFile(filePath, 'utf8');
    const $ = cheerio.load(fullHtml);

    const marketplaceItemsContainer = $(
      'div.x8gbvx8.x78zum5.x1q0g3np.x1a02dak.x1nhvcw1.x1rdy4ex.x1lxpwgx.x4vbgl9.x165d6jo'
    );

    const allExtractedData = [];

    // CORRECTED SELECTOR: All classes must be dot-separated
    marketplaceItemsContainer
      .find(
        'div.x9f619.x78zum5.x1r8uery.xdt5ytf.x1iyjqo2.xs83m0k.x135b78x.x11lfxj5.xexx8yu.x18d9i69.xnpuxes.x1cjf5ee.x17dddeq'
      )
      .each((index, element) => {
        const itemHtml = $.html(element);
        allExtractedData.push(scrapeMarketplaceItem(itemHtml));
      });

    const resolvedData = await Promise.all(allExtractedData);

    return resolvedData;
  } catch (error) {
    console.error(`Error reading or scraping file '${filePath}':`, error);
    return null;
  }
}

const htmlFilePath = 'marketplace_page.html';

readAndScrapeFile(htmlFilePath)
  .then((data) => {
    if (data) {
      console.log('Extracted Data:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('No data extracted.');
    }
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
  });