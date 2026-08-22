// 影集数据：由 scripts/sync.mjs 生成 albums.generated.json，本模块负责类型化加载
export interface Photo {
  src: string;
  width: number;
  height: number;
}

export interface Album {
  slug: string;
  title: string;
  date: string | null;      // ISO 格式 YYYY-MM-DD，null = 未标注
  location: string | null;
  description: string;      // 默认空，可在 albums.config.json 填写
  cover: Photo;             // 封面图（主页卡片用）
  photos: Photo[];          // 详情页图片流（编辑式交错单列）
}

import generated from "./albums.generated.json";

// 时间线升序（左旧右新）；无日期排末尾
export const albums: Album[] = (generated as Album[]).sort((a, b) => {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return a.date < b.date ? -1 : 1;
});
