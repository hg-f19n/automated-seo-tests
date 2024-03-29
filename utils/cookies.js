const fs = require('fs').promises;
const path = require('path');

// This module contains utility functions related to managing cookies.

// Path where cookies will be saved.
const cookiesPath = path.join(process.cwd(), '_seo-tests-output', 'cookies.json');

/**
 * Saves cookies from a Puppeteer page to a file.
 * 
 * @param {Object} page - The Puppeteer page from which to save cookies.
 * @param {string} [path=cookiesPath] - The path where to save the cookies.
 */
async function saveCookies(page, path = cookiesPath) {
  console.log('Saving cookies to:', path);
  const cookies = await page.cookies();
  await fs.writeFile(path, JSON.stringify(cookies, null, 2));
  console.log('Saved cookies.');
}

/**
 * Loads cookies from a file to a Puppeteer page.
 * 
 * @param {Object} page - The Puppeteer page where to load the cookies.
 * @param {string} [path=cookiesPath] - The path from where to load the cookies.
 * @throws Will throw an error if the cookie file is not found.
 */
async function loadCookies(page, path = cookiesPath) {
  console.log('Loading cookies from:', path);
  try {
    const cookiesString = await fs.readFile(path);
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
    console.log('Loaded cookies.');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('No cookies file found.');
      throw new Error('No cookies file found.');
    } else {
      throw error;
    }
  }
}

/**
 * This function checks whether we're logged in by looking for a unique element on an authenticated page.
 * 
 * @param {Object} page - The Puppeteer page from which to save cookies.
 */
async function isLoggedIn(page) {
  try {
    await page.goto('https://search.google.com/search-console/welcome', { waitUntil: 'domcontentloaded' });
    const elements = await page.$x("//div[contains(text(), 'Welcome to Google Search Console')]");
    return elements.length > 0;
  } catch (error) {
    return false;
  }
}

module.exports = { saveCookies, loadCookies, isLoggedIn };
