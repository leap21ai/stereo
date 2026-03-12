import { chromium } from "playwright";
import { execSync } from "child_process";
import { readdirSync, unlinkSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Clean up any stale recordings
  for (const f of readdirSync(__dirname)) {
    if (/^[0-9a-f]{32}\.webm$/.test(f)) unlinkSync(path.join(__dirname, f));
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1200 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: __dirname,
      size: { width: 3840, height: 2400 },
    },
  });

  const page = await context.newPage();
  await page.goto(`file://${path.join(__dirname, "howto-animation.html")}`);

  // Full animation duration + buffer
  await page.waitForTimeout(14000);

  // Must close context to finalize the video file
  const videoPath = await page.video()?.path();
  await context.close();
  await browser.close();

  if (!videoPath) {
    console.error("No recording produced");
    process.exit(1);
  }

  console.log(`Raw recording: ${videoPath}`);

  const mp4Path = path.join(__dirname, "stereo-howto.mp4");
  const webmPath = path.join(__dirname, "stereo-howto.webm");

  // Encode to MP4 (H.264, high quality)
  execSync(
    `ffmpeg -y -i "${videoPath}" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -an "${mp4Path}"`,
    { stdio: "inherit" }
  );

  // Encode to WebM (VP9, high quality)
  execSync(
    `ffmpeg -y -i "${videoPath}" -c:v libvpx-vp9 -crf 24 -b:v 0 -an "${webmPath}"`,
    { stdio: "inherit" }
  );

  // Clean up raw recording
  unlinkSync(videoPath);

  const { statSync } = await import("fs");
  const mp4Size = (statSync(mp4Path).size / 1024).toFixed(0);
  const webmSize = (statSync(webmPath).size / 1024).toFixed(0);
  console.log(`Done: ${mp4Path} (${mp4Size}KB), ${webmPath} (${webmSize}KB)`);
}

main().catch(console.error);
