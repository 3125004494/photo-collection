// 影集数据：由 scripts/sync.mjs 生成 albums.generated.json，本模块负责类型化加载
// schema v2（向后兼容）：date 保留为 dateStart 别名；新增 srcset/avifSrcset/blur/dateEnd/theme/featured
export interface Photo {
  src: string; // 主图（1600px webp，文件名沿用 v1 兼容旧引用）
  srcset: string; // 800/1600/2400 webp 响应式候选（真实宽度描述符）
  avifSrcset?: string; // 1600/2400 avif 候选（现代浏览器更省流量）
  width: number; // 主图文件实际宽度（aspect-ratio 用，比例与源图一致）
  height: number;
  blur: string; // 16px blur-up 占位图（加载前模糊底）
}

export interface Album {
  slug: string;
  title: string;
  date: string | null; // 兼容旧字段：= dateStart，ISO YYYY-MM-DD
  dateStart: string | null; // 开始日 ISO（区间起点）
  dateEnd: string | null; // 结束日 ISO（区间时非空，D2 补全同年同月）
  location: string | null; // 「北京·跨年」→ 北京
  theme: string | null; // 「北京·跨年」→ 跨年；无 · 则为 null
  description: string; // 默认空，可在 albums.config.json 填写
  featured: boolean; // 精选章节标记（albums.config.json 覆盖）
  cover: Photo; // 封面图（主页卡片用）
  photos: Photo[]; // 详情页图片流（首张 = 封面，兼容旧行为）
}

import generated from "./albums.generated.json";

// 时间线升序（左旧右新）；无日期排末尾
export const albums: Album[] = (generated as Album[]).sort((a, b) => {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return a.date < b.date ? -1 : 1;
});
