// ============================================================
// npm run sync —— 照片同步脚本（内容更新的唯一通道，AGENTS.md §4）
// 流程：扫描 album/ → 解析分组元数据 → sharp 压缩图片到 public/albums/
//      → 生成 src/data/albums.generated.json（供 Astro 构建）
// 规则：
//   - album/ 只读（铁律 1），任何情况下不修改、不删除源照片
//   - 每组必须含「封面.jpg」（铁律 2），作为主页代表图
//   - 分组名格式：YYYY.M.D 地点（可带 ·子题 / 日期区间），缺省元数据由 albums.config.json 覆盖
//   - 增量处理：目标产物比源照片新则跳过
// ============================================================
import sharp from "sharp";

// 全局并发池：多张照片并行压缩，显著提速（大图 30MB+ 时单线程过慢）
sharp.concurrency(4);
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ALBUM_DIR = path.join(ROOT, "album");
const OUT_DIR = path.join(ROOT, "public", "albums");
const DATA_FILE = path.join(ROOT, "src", "data", "albums.generated.json");
const CONFIG_FILE = path.join(ROOT, "albums.config.json");

// 封面输出尺寸（主页卡片墙多档响应式）
const COVER_SIZES = [
  { width: 1200, name: "cover-1200.webp" },
  { width: 800, name: "cover-800.webp" },
  { width: 400, name: "cover-400.webp" },
];
// 详情图最长边（Retina 下全宽展示足够清晰，控制体积）
const PHOTO_MAX_EDGE = 1600;
const PHOTO_QUALITY = 82;

// 分组名解析：2026.5.18 广州·大学城 / 2025.7.5-8 南京·毕业旅行
const NAME_RE = /^(\d{4})\.(\d{1,2})\.(\d{1,2})(?:-(\d{1,2}))?\s+(.+)$/;

// 目标产物比源新则跳过（增量优化）
function isFresh(dst, src) {
  if (!fs.existsSync(dst)) return false;
  return fs.statSync(dst).mtimeMs > fs.statSync(src).mtimeMs;
}

// 压缩输出（等比缩放，不放大）
async function convert(src, dst, resize) {
  let pipe = sharp(src);
  if (resize) pipe = pipe.resize(resize);
  await pipe.webp({ quality: PHOTO_QUALITY }).toFile(dst);
}

// 读取用户覆盖配置（可选）
let config = { site: {}, albums: {} };
if (fs.existsSync(CONFIG_FILE)) {
  config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  console.log("已读取 albums.config.json 覆盖配置");
}

// 扫描分组（仅目录）
const groupDirs = fs
  .readdirSync(ALBUM_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const albums = [];
const usedSlugs = new Set();

for (const dirName of groupDirs) {
  const dir = path.join(ALBUM_DIR, dirName);
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort(); // 微信导出命名带序号，字典序即拍摄顺序
  if (files.length === 0) continue; // 空分组跳过（待用户补充）

  // 封面固定取「封面.jpg」，缺失时回退第一张并警告
  const coverFile = files.find((f) => f === "封面.jpg") || files[0];
  if (coverFile !== "封面.jpg") {
    console.warn("⚠ 缺少封面.jpg：" + dirName + "，回退使用 " + coverFile);
  }
  const photoFiles = files.filter((f) => f !== coverFile);

  // 元数据：文件夹名解析 + config 覆盖
  const m = dirName.match(NAME_RE);
  const date = m ? m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0") : null;
  const location = m ? m[5] : null;
  let slug = date || "undated";
  let i = 1;
  while (usedSlugs.has(slug)) slug = (date || "undated") + "-" + ++i;
  usedSlugs.add(slug);

  const cfg = config.albums?.[slug] || {};
  const title = cfg.title || dirName;
  const description = cfg.description || "";
  const out = path.join(OUT_DIR, slug);
  fs.mkdirSync(out, { recursive: true });

  // ---- 封面：多尺寸 ----
  const coverSrc = path.join(dir, coverFile);
  const coverMeta = await sharp(coverSrc).metadata();
  for (const s of COVER_SIZES) {
    const dst = path.join(out, s.name);
    if (isFresh(dst, coverSrc)) continue;
    await convert(coverSrc, dst, { width: s.width, withoutEnlargement: true });
    console.log("  封面 " + s.name);
  }

  // ---- 详情图：最长边压缩 ----
  // 详情页第一张 = 封面（复用已生成的 cover-1200.webp），其后为其余照片
  const photos = [
    {
      src: "/albums/" + slug + "/cover-1200.webp",
      width: coverMeta.width,
      height: coverMeta.height,
    },
  ];
  for (const f of photoFiles) {
    const srcF = path.join(dir, f);
    const meta = await sharp(srcF).metadata();
    const dstName = f.replace(/\.jpe?g$/i, "") + ".webp";
    const dst = path.join(out, dstName);
    if (isFresh(dst, srcF)) {
      photos.push({ src: "/albums/" + slug + "/" + dstName, width: meta.width, height: meta.height });
      continue;
    }
    await convert(srcF, dst, {
      width: PHOTO_MAX_EDGE,
      height: PHOTO_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });
    photos.push({ src: "/albums/" + slug + "/" + dstName, width: meta.width, height: meta.height });
    console.log("  照片 " + dstName);
  }

  albums.push({
    slug,
    title,
    date,           // ISO YYYY-MM-DD，null = 未标注
    location,
    description,
    cover: {
      src: "/albums/" + slug + "/cover-1200.webp",
      width: coverMeta.width,
      height: coverMeta.height,
    },
    photos,
  });
  console.log("✓ " + dirName + " → " + slug + "（" + (photos.length + 1) + " 张）");
}

// 时间线升序（左旧右新）；无日期排末尾
albums.sort((a, b) => {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return a.date < b.date ? -1 : 1;
});

fs.writeFileSync(DATA_FILE, JSON.stringify(albums, null, 2), "utf8");
const total = albums.reduce((s, a) => s + a.photos.length + 1, 0);
console.log("✅ 完成：" + albums.length + " 组影集、" + total + " 张图片 → " + DATA_FILE);
