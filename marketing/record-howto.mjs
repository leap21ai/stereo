import { chromium } from "playwright";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 960, height: 600 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: path.join(__dirname),
      size: { width: 1920, height: 1200 },
    },
  });

  const page = await context.newPage();
  await page.goto(`file://${path.join(__dirname, "howto-animation.html")}`);

  // Wait for the full animation (13s) plus a small buffer
  await page.waitForTimeout(13500);

  await context.close();
  await browser.close();

  // Find the recorded webm
  const { readdirSync } = await import("fs");
  const files = readdirSync(__dirname).filter(
    (f) => f.endsWith(".webm") && f !== "stereo-howto.webm"
  );
  const recorded = files.sort().pop();

  if (!recorded) {
    console.error("No recording found");
    process.exit(1);
  }

  const recordedPath = path.join(__dirname, recorded);
  const mp4Path = path.join(__dirname, "stereo-howto.mp4");
  const webmPath = path.join(__dirname, "stereo-howto.webm");

  // Convert to MP4
  execSync(
    `ffmpeg -y -i "${recordedPath}" -vf "scale=1920:1200" -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -an "${mp4Path}"`,
    { stdio: "inherit" }
  );

  // Convert to WebM (smaller)
  execSync(
    `ffmpeg -y -i "${recordedPath}" -vf "scale=1920:1200" -c:v libvpx-vp9 -crf 30 -b:v 0 -an "${webmPath}"`,
    { stdio: "inherit" }
  );

  // Clean up raw recording
  execSync(`rm "${recordedPath}"`);

  console.log(`Done: ${mp4Path} and ${webmPath}`);
}

main().catch(console.error);
