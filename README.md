# HAN — 个人摄影作品集

> 用镜头记录时间与地点。视觉方向：「胶片暗房」。
> 重构进行中（方案与验收标准见 docs/PRD-v2.0-visual-redesign.md，协作规范见 AGENTS.md）。

## 技术栈

- [Astro](https://astro.build) 7 + Tailwind CSS v4 + [GSAP](https://gsap.com) 3.15（纯静态导出）
- sharp（图片管线）、Node.js ≥ 22

## 快速开始

```bash
npm run dev      # 本地开发
npm run build    # 构建 → dist/
npm run preview  # 预览构建产物
npm run sync     # 内容更新：扫描 album/ → 生成多尺寸 webp/avif + albums.generated.json
```

## 如何新增一组照片

1. 在 `album/` 下新建文件夹，命名格式：`YYYY.M.D 地点·主题` 或 `YYYY.M.D-D2 地点·主题`（D2 为结束日），例如 `2026.7.11 广州·南沙客运港`；
2. 放入照片（jpg），其中一张命名为 `封面.jpg` 作为主页代表图；
3. （可选）在 `albums.config.json` 为对应 slug 补 `description` / `theme` / `featured`；
4. 运行 `npm run sync`（增量、幂等，`album/` 源图永不修改）。

## 内容管线铁律

- `album/` 只读：任何情况下不修改、不删除源照片；
- 排序即时间线（文件夹名升序）；
- `src/data/albums.generated.json` 为生成物，勿手改。

## 目录结构

```text
album/                     源照片（只读）
public/albums/             生成的多尺寸图片
scripts/sync.mjs           内容管线（唯一更新通道）
src/pages/                 首页 + gallery/[slug] 详情
src/components/            组件（Loader/NavLayer/ProfileOverlay）
src/styles/global.css      设计 token（唯一声明处）
src/data/                  类型 + 生成数据
docs/PRD-v2.0-*.md         重构方案与验收标准
```

## 视觉方向（进行中）

- 胶片暗房：深灰黑 + 纸白 + 单一暖色强调；宋体标题 + 系统无衬线正文；胶片颗粒纹理；
- 首页四段式叙事：Hero → 精选章节（pin+scrub）→ 放映台索引 → 关于；
- 动效只动 transform/opacity/filter/clip-path；`prefers-reduced-motion` 全覆盖；
- 每个阶段用视觉模型（GLM-5V-Turbo / glm-4.6v-flash 兜底）复核实现与目标的偏差。

## 许可证

私人作品，保留所有权利。
