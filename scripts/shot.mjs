// 阶段视觉校验截图工具：node scripts/shot.mjs <url> <out.png> [width] [height] [waitMs]
// 使用 dsh-web profile 自带的 puppeteer-core + puppeteer 缓存的 Chrome，真实等待页面动画完成。
import puppeteer from "file:///C:/Users/14586/.dsh/profiles/web/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs";
import path from "node:path";

const [url, out, w = "1280", h = "800", waitMs = "6500"] = process.argv.slice(2);
if (!url || !out) {
  console.error("用法: node scripts/shot.mjs <url> <out.png> [width] [height] [waitMs]");
  process.exit(2);
}
const executablePath = "C:\\Users\\14586\\.cache\\puppeteer\\chrome\\win64-152.0.7977.42\\chrome-win64\\chrome.exe";

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "--disable-extensions"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: Number(w), height: Number(h) });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  // 等 Loader（约1.5s）与入场动画（约1.1s）播完再截
  await new Promise((r) => setTimeout(r, Number(waitMs)));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out });
  console.log("OK " + out + " " + fs.statSync(out).size + "B");
} finally {
  await browser.close();
}
