const fs = require("fs");
const puppeteer = require("puppeteer");
const config = require("./config");

const pagespeedTest = require("./tests/pagespeed");
const jsOnOffTest = require("./tests/js_on_off");
const mobileFriendlyTest = require("./tests/mobile_friendly");
const urlInspectionTest = require("./tests/url_inspection");

const screenshotDir = "screenshots";

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir);
}

(async () => {
  /* const browser = await puppeteer.launch({
    headless: false,
    executablePath: config.chromePath,
    args: [
      '--incognito',
      '--user-data-dir=/Users/hg/Library/Application Support/Google/Chrome', // Replace with the correct path to your user data directory
      '--profile-directory=Profile 2' // Replace 'Profile 1' with the correct profile directory name
    ],
  }); */

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: config.chromePath,
      args: ["--incognito"],
    });
  } catch (error) {
    console.error("Error launching the browser:", error);
    return;
  }

  let isFirstPage = true;
  for (const [pageType, url] of Object.entries(config.pages)) {
    await pagespeedTest(browser, pageType, url, isFirstPage);
    await jsOnOffTest(browser, pageType, url);
    await mobileFriendlyTest(browser, pageType, url);
    //await urlInspectionTest(browser, pageType, url);
    isFirstPage = false;
  }

  await browser.close();
})();
