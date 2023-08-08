const path = require('path');
const { getSiteUrl, sanitizeString } = require('../utils/sanitizers');

const siteUrl = getSiteUrl(clean = true);

const pagespeedUrl = 'https://pagespeed.web.dev/analysis?url=';

const runPageSpeedTest = async (page, url) => {
  const psiUrl = `${pagespeedUrl}${encodeURIComponent(url)}`;
  await page.goto(psiUrl);

  await page.waitForSelector('.lh-report', { timeout: 60000 });
  return psiUrl;
};

const clickOkGotIt = async (page, isFirstPage) => {
  if (!isFirstPage) return;

  try {
    await page.waitForXPath("//button[contains(., 'Ok, Got it.')]", {
      timeout: 10000,
    });

    const [button] = await page.$x("//button[contains(., 'Ok, Got it.')]");
    if (button) {
      await button.click();
      console.log('Clicked "Ok, Got it." button');
    }
  } catch (err) {
    console.warn('Cookie banner not found or could not be clicked:', err);
  }
};

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
      console.log(`Screenshot saved at: ${filepath}`);
    } else {
      console.warn('Unable to capture screenshot due to missing elements.');
    }
  } catch (err) {
    console.error(`Error taking screenshot for ${filepath}:`, err);
  }
};

module.exports = async (browser, pageType, url, isFirstPage) => {
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
    const screenshotName = `${siteUrl}_psi_${sanitizeString(pageType)}_${timestamp}`;
    const filepath = path.resolve(__dirname, '../screenshots', `${screenshotName}.png`);

    await takeScreenshot(page, filepath);

    const updatedUrl = page.url();

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
