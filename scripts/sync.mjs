// ============================================================
// npm run sync —— 照片同步脚本 v2（内容更新的唯一通道，AGENTS.md §4）
// 流程：扫描 album/ → 解析分组元数据（日期区间/地点/主题）→ sharp 压缩
//      → 输出多尺寸 webp + avif + 16px blur 占位 → 生成 schema v2 数据
//      （src/data/albums.generated.json + public/album-data/<slug>.json 分片）
// 规则：
//   - album/ 只读（铁律 1），任何情况下不修改、不删除源照片
//   - 每组必须含「封面.jpg」（铁律 2），作为主页代表图
//   - 分组名格式：YYYY.M.D[-D2] 地点[·主题]，D2 为结束日（补全同年同月）
//   - 缺省元数据由 albums.config.json 覆盖（title/description/theme/featured/endDate；
//     site 段可配 accentColor/heroAlbum，默认可不填）
//   - 增量处理：目标产物比源照片新则跳过；新增尺寸/格式文件自然补齐，不删旧产物
// ============================================================
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

// 全局并发：sharp 内部线程 + 任务池（16 核机器取 4，兼顾内存峰值）
sharp.concurrency(4);
const CONCURRENCY = 4;

const ROOT = path.resolve(import.meta.dirname, "..");
const ALBUM_DIR = path.join(ROOT, "album");
const OUT_DIR = path.join(ROOT, "public", "albums");
const SHARD_DIR = path.join(ROOT, "public", "album-data");
const DATA_FILE = path.join(ROOT, "src", "data", "albums.generated.json");
const CONFIG_FILE = path.join(ROOT, "albums.config.json");

// ---- 输出规格（v2：多尺寸 + AVIF + blur 占位）----
const WEBP_QUALITY = 82; // 照片 webp 质量（沿用 v1）
const AVIF_QUALITY = 55; // avif 质量（同视觉下比 webp 小 30-50%）
const BLUR_EDGE = 16; // blur-up 占位图最长边（16px 极低质量）
const BLUR_QUALITY = 30;

// 封面尺寸：主页卡片墙多档响应式（沿用 v1 文件名，保证旧引用兼容）
const COVER_WEBP_SIZES = [
  { width: 1200, name: "cover-1200.webp" },
  { width: 800, name: "cover-800.webp" },
  { width: 400, name: "cover-400.webp" },
];
const COVER_AVIF_WIDTH = 1200; // 新增 cover-1200.avif

// 详情图 webp 三档（1600 档保持 <原名>.webp 文件名不变，兼容现有引用）
const PHOTO_WEBP_SIZES = [
  { width: 1600, suffix: "" },
  { width: 800, suffix: "-800" },
  { width: 2400, suffix: "-2400" },
];
// 详情图 avif 两档
const PHOTO_AVIF_SIZES = [
  { width: 1600, suffix: "" },
  { width: 2400, suffix: "-2400" },
];

// 分组名解析：YYYY.M.D[-D2] 地点[·主题]
// 例：2025.7.5-8 南京·毕业旅行 → dateStart 2025-07-05 / dateEnd 2025-07-08 / location 南京 / theme 毕业旅行
const NAME_RE = /^(\d{4})\.(\d{1,2})\.(\d{1,2})(?:-(\d{1,2}))?\s+(.+)$/;

// 目标产物比源新则跳过（增量优化）
function isFresh(dst, src) {
  if (!fs.existsSync(dst)) return false;
  return fs.statSync(dst).mtimeMs > fs.statSync(src).mtimeMs;
}

// 压缩输出（等比缩放，不放大）
async function convert(src, dst, resize, format = "webp", quality = WEBP_QUALITY) {
  let pipe = sharp(src);
  if (resize) pipe = pipe.resize(resize);
  if (format === "avif") await pipe.avif({ quality }).toFile(dst);
  else await pipe.webp({ quality }).toFile(dst);
}

// 16px 极低质量 blur-up 占位图（前端配合 CSS blur 放大显示）
async function convertBlur(src, dst) {
  await sharp(src)
    .resize({ width: BLUR_EDGE, height: BLUR_EDGE, fit: "inside" })
    .webp({ quality: BLUR_QUALITY })
    .toFile(dst);
}

// 读取产物实际尺寸（withoutEnlargement 下小图可能小于目标宽度，
// srcset 描述符必须用真实像素宽度）
async function dims(p) {
  const m = await sharp(p).metadata();
  return { width: m.width, height: m.height };
}

// 简单并发池：limit 个 worker 依次消费任务，控制内存峰值
async function runPool(tasks, limit) {
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const t = tasks[next++];
      await t();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
}

// 封面 Photo（schema v2）
async function buildCoverPhoto(out, prefix) {
  const main = await dims(path.join(out, "cover-1200.webp"));
  const w400 = (await dims(path.join(out, "cover-400.webp"))).width;
  const w800 = (await dims(path.join(out, "cover-800.webp"))).width;
  const wAvif = (await dims(path.join(out, "cover-1200.avif"))).width;
  return {
    src: prefix + "cover-1200.webp",
    srcset:
      prefix + "cover-400.webp " + w400 + "w, " +
      prefix + "cover-800.webp " + w800 + "w, " +
      prefix + "cover-1200.webp " + main.width + "w",
    avifSrcset: prefix + "cover-1200.avif " + wAvif + "w",
    width: main.width,
    height: main.height,
    blur: prefix + "cover-blur.webp",
  };
}

// 详情图 Photo（schema v2）
async function buildPhoto(out, base, prefix) {
  const main = await dims(path.join(out, base + ".webp"));
  const w800 = (await dims(path.join(out, base + "-800.webp"))).width;
  const w2400 = (await dims(path.join(out, base + "-2400.webp"))).width;
  const wAvif = (await dims(path.join(out, base + ".avif"))).width;
  const wAvif2400 = (await dims(path.join(out, base + "-2400.avif"))).width;
  return {
    src: prefix + base + ".webp",
    srcset:
      prefix + base + "-800.webp " + w800 + "w, " +
      prefix + base + ".webp " + main.width + "w, " +
      prefix + base + "-2400.webp " + w2400 + "w",
    avifSrcset:
      prefix + base + ".avif " + wAvif + "w, " +
      prefix + base + "-2400.avif " + wAvif2400 + "w",
    width: main.width,
    height: main.height,
    blur: prefix + base + "-blur.webp",
  };
}

// 目录统计（文件数 / 总大小 / 最大单文件）
function dirStats(dir) {
  let files = 0;
  let bytes = 0;
  let max = 0;
  let maxFile = "";
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        const st = fs.statSync(p);
        files += 1;
        bytes += st.size;
        if (st.size > max) {
          max = st.size;
          maxFile = p;
        }
      }
    }
  };
  walk(dir);
  return { files, bytes, max, maxFile };
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

  // ---- 元数据：文件夹名解析（日期区间 + 地点 + 主题）----
  const m = dirName.match(NAME_RE);
  let dateStart = null;
  let dateEnd = null;
  let location = null;
  let theme = null;
  if (m) {
    const y = m[1];
    const mo = m[2].padStart(2, "0");
    const d1 = m[3].padStart(2, "0");
    dateStart = y + "-" + mo + "-" + d1;
    if (m[4]) {
      const d2 = m[4].padStart(2, "0");
      if (Number(d2) < Number(d1)) {
        console.warn("⚠ 结束日早于开始日：" + dirName + "，可用 albums.config.json 的 endDate 修正");
      }
      dateEnd = y + "-" + mo + "-" + d2; // 补全同年同月
    }
    const rest = m[5].trim();
    const sep = rest.indexOf("·"); // U+00B7 间隔号：前半 = 地点，后半 = 主题
    location = (sep >= 0 ? rest.slice(0, sep) : rest).trim() || null;
    theme = sep >= 0 ? rest.slice(sep + 1).trim() || null : null;
  }

  // slug 沿用开始日（保证 albums.config.json 旧键位不变）
  let slug = dateStart || "undated";
  let i = 1;
  while (usedSlugs.has(slug)) slug = (dateStart || "undated") + "-" + ++i;
  usedSlugs.add(slug);

  // ---- config 覆盖：theme/endDate 允许显式置 null（用 "in" 判定）----
  const cfg = config.albums?.[slug] || {};
  const title = cfg.title || dirName;
  const description = cfg.description || "";
  const finalTheme = "theme" in cfg ? cfg.theme : theme;
  const finalDateEnd = "endDate" in cfg
    ? (cfg.endDate && typeof cfg.endDate === "string" ? cfg.endDate : null)
    : dateEnd;
  const featured = cfg.featured === true;

  const out = path.join(OUT_DIR, slug);
  fs.mkdirSync(out, { recursive: true });
  const prefix = "/albums/" + slug + "/";

  // ---- 封面：多尺寸 webp + avif + blur ----
  const coverSrc = path.join(dir, coverFile);
  const coverTasks = [];
  for (const s of COVER_WEBP_SIZES) {
    coverTasks.push(async () => {
      const dst = path.join(out, s.name);
      if (isFresh(dst, coverSrc)) return;
      await convert(coverSrc, dst, { width: s.width, withoutEnlargement: true });
      console.log("  封面 " + s.name);
    });
  }
  coverTasks.push(async () => {
    const dst = path.join(out, "cover-1200.avif");
    if (isFresh(dst, coverSrc)) return;
    await convert(coverSrc, dst, { width: COVER_AVIF_WIDTH, withoutEnlargement: true }, "avif", AVIF_QUALITY);
    console.log("  封面 cover-1200.avif");
  });
  coverTasks.push(async () => {
    const dst = path.join(out, "cover-blur.webp");
    if (isFresh(dst, coverSrc)) return;
    await convertBlur(coverSrc, dst);
    console.log("  封面 cover-blur.webp");
  });
  await runPool(coverTasks, CONCURRENCY);

  const coverPhoto = await buildCoverPhoto(out, prefix);

  // ---- 详情图：三档 webp + 两档 avif + blur（全组任务池化并行）----
  const photoTasks = [];
  for (const f of photoFiles) {
    const srcF = path.join(dir, f);
    const base = f.replace(/\.jpe?g$/i, "");
    for (const s of PHOTO_WEBP_SIZES) {
      photoTasks.push(async () => {
        const dst = path.join(out, base + s.suffix + ".webp");
        if (isFresh(dst, srcF)) return;
        await convert(srcF, dst, {
          width: s.width,
          height: s.width,
          fit: "inside",
          withoutEnlargement: true,
        });
        console.log("  照片 " + base + s.suffix + ".webp");
      });
    }
    for (const s of PHOTO_AVIF_SIZES) {
      photoTasks.push(async () => {
        const dst = path.join(out, base + s.suffix + ".avif");
        if (isFresh(dst, srcF)) return;
        await convert(srcF, dst, {
          width: s.width,
          height: s.width,
          fit: "inside",
          withoutEnlargement: true,
        }, "avif", AVIF_QUALITY);
        console.log("  照片 " + base + s.suffix + ".avif");
      });
    }
    photoTasks.push(async () => {
      const dst = path.join(out, base + "-blur.webp");
      if (isFresh(dst, srcF)) return;
      await convertBlur(srcF, dst);
    });
  }
  await runPool(photoTasks, CONCURRENCY);

  // 详情流首张 = 封面（兼容 v1 行为）
  const photos = [coverPhoto];
  for (const f of photoFiles) {
    const base = f.replace(/\.jpe?g$/i, "");
    photos.push(await buildPhoto(out, base, prefix));
  }

  albums.push({
    slug,
    title,
    description,
    cover: coverPhoto,
    photos,
    date: dateStart, // 兼容旧字段（= dateStart）
    dateStart,
    dateEnd: finalDateEnd,
    location,
    theme: finalTheme,
    featured,
  });
  console.log("✓ " + dirName + " → " + slug + "（" + photos.length + " 张）");
}

// 时间线升序（左旧右新）；无日期排末尾
albums.sort((a, b) => {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return a.date < b.date ? -1 : 1;
});

// ---- site 配置校验（accentColor / heroAlbum 供 Phase 1/3 使用，默认可不填）----
if (config.site) {
  const { accentColor, heroAlbum } = config.site;
  if (accentColor != null) {
    const ok = typeof accentColor === "string" && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(accentColor);
    if (ok) console.log("site.accentColor = " + accentColor);
    else console.warn("⚠ site.accentColor 需为 #RRGGBB/#RGB 十六进制色值，已忽略：" + accentColor);
  }
  if (heroAlbum != null) {
    const hit = albums.some((a) => a.slug === heroAlbum);
    if (hit) console.log("site.heroAlbum = " + heroAlbum);
    else console.warn("⚠ site.heroAlbum 未匹配任何影集 slug：" + heroAlbum);
  }
}

// ---- 落盘：全量索引 + 每组分片（供 Phase 3 懒加载，本阶段只产出）----
fs.writeFileSync(DATA_FILE, JSON.stringify(albums, null, 2), "utf8");
fs.mkdirSync(SHARD_DIR, { recursive: true });
for (const a of albums) {
  fs.writeFileSync(path.join(SHARD_DIR, a.slug + ".json"), JSON.stringify(a), "utf8");
}

const totalPhotos = albums.reduce((s, a) => s + a.photos.length, 0);
const st = dirStats(OUT_DIR);
console.log("✅ 完成：" + albums.length + " 组影集、" + totalPhotos + " 张图片 → " + DATA_FILE);
console.log("   分片数据：public/album-data/" + albums.length + " 个 <slug>.json");
console.log("   public/albums：" + st.files + " 个文件、" + (st.bytes / 1024 / 1024).toFixed(1) + " MB");
console.log("   最大单文件：" + (st.max / 1024).toFixed(1) + " KB（" + path.relative(ROOT, st.maxFile) + "）");
