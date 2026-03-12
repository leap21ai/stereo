import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await page.goto("https://stereo.leap21llc.com", { waitUntil: "networkidle" });

  // Full page screenshot
  await page.screenshot({
    path: path.join(__dirname, "site-full.png"),
    fullPage: true,
  });
  console.log("Full page screenshot saved");

  // Hero section
  await page.screenshot({
    path: path.join(__dirname, "site-hero.png"),
  });
  console.log("Hero screenshot saved");

  // Scroll to Getting Started
  await page.locator("#how").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(__dirname, "site-getting-started.png"),
  });
  console.log("Getting Started screenshot saved");

  // Scroll to Pricing
  await page.locator("#pricing").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(__dirname, "site-pricing.png"),
  });
  console.log("Pricing screenshot saved");

  await browser.close();
  console.log("Done");
}

main().catch(console.error);
