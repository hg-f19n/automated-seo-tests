const path = require('path');
const { sanitizeString } = require('../utils/sanitizers');
const markdown = require('../utils/markdown');

const topDirectory = '_seo-tests-output';

const pagespeedUrl = 'https://pagespeed.web.dev/analysis?url=';


/**
 * Navigate to PageSpeed Insights for a given URL and waits for the report to generate.
 * 
 * @param {object} page - Puppeteer page instance.
 * @param {string} url - The URL to analyze.
 * @returns {Promise<string>} - The full PageSpeed Insights URL.
 */
const runPageSpeedTest = async (page, url) => {
  const psiUrl = `${pagespeedUrl}${encodeURIComponent(url)}`;
  await page.goto(psiUrl);

  await page.waitForSelector('.lh-report', { timeout: 60000 });
  return psiUrl;
};

/**
 * Clicks the 'Ok, Got it.' button, typically a cookie acceptance.
 *
 * @param {object} page - Puppeteer page instance.
 * @param {boolean} isFirstPage - Indicates if this is the first page being processed.
 */
const clickOkGotIt = async (page, isFirstPage) => {
  if (!isFirstPage) return;

  try {
    await page.waitForXPath("//button[contains(., 'Ok, Got it.')]", {
      timeout: 10000,
    });

    const [button] = await page.$x("//button[contains(., 'Ok, Got it.')]");
    if (button) {
      await button.click();
    }
  } catch (err) {
    console.warn('Cookie banner not found or could not be clicked:', err);
  }
};

/**
 * Takes a screenshot of the PageSpeed Insights report.
 * 
 * @param {object} page - Puppeteer page instance.
 * @param {string} filepath - Destination path for the screenshot.
 */
const takeScreenshot = async (page, filepath) => {
  try {
    await page.waitForSelector('div#performance', { visible: true, timeout: 10000 });
    await page.waitForXPath(
      "//span[contains(., 'Opportunities') and contains(@class, 'lh-audit-group__title')]",
      { visible: true, timeout: 10000 }
    );

    await page.waitForTimeout(1500);

    const performanceDiv = await page.$('div#performance');
    const opportunitiesTitle = await page.$x("//span[contains(., 'Opportunities') and contains(@class, 'lh-audit-group__title')]");

    if (performanceDiv && opportunitiesTitle.length) {
      const performanceBox = await performanceDiv.boundingBox();
      const opportunitiesBox = await opportunitiesTitle[0].boundingBox();

      const clip = {
        x: performanceBox.x,
        y: performanceBox.y,
        width: performanceBox.width,
        height: opportunitiesBox.y + opportunitiesBox.height - performanceBox.y,
      };

      // Adding a timeout to allow animations to finish
      await page.waitForTimeout(1500);

      await page.screenshot({ path: filepath, clip });
    } else {
      console.warn('Unable to capture screenshot due to missing elements.');
    }
  } catch (err) {
    console.error(`Error taking screenshot for ${filepath}:`, err);
  }
};

/**
 * Main function to run the PageSpeed Insights test and generate a markdown slide.
 * 
 * @param {object} browser - Puppeteer browser instance.
 * @param {string} pageType - Type of the page being tested.
 * @param {string} url - The URL to analyze.
 * @param {object} siteUrl - The site URL information.
 * @param {boolean} isFirstPage - Indicates if this is the first page being processed.
 * @param {string} markdownFilePath - Path to the markdown file.
 * @returns {Promise<object>} - Object containing test URL and screenshot path.
 */
module.exports = async (browser, pageType, url, siteUrl, isFirstPage, markdownFilePath) => {
  const page = await browser.newPage();

  // Set viewport size
  await page.setViewport({
    width: 1280,
    height: 800,
  });

  try {
    const psiUrl = await runPageSpeedTest(page, url);

    await clickOkGotIt(page, isFirstPage);

    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
    const screenshotName = `${siteUrl.domain}_psi_${sanitizeString(pageType)}_${timestamp}`;
    const filepath = path.resolve(process.cwd(), topDirectory, 'screenshots', `${screenshotName}.png`);
    

    await takeScreenshot(page, filepath);

    const updatedUrl = page.url();

    await markdown.generateMarkdownSlide('Page Speed Insights', pageType, url, filepath, updatedUrl, markdownFilePath);

    // Return the necessary data
    return {
      testUrl: updatedUrl,
      screenshotPath: filepath,
    };
  } catch (err) {
    console.error(`Error running PageSpeed test for ${url}:`, err);
  } finally {
    await page.close();
  }
};
