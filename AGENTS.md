# AGENTS.md — HAN 摄影集 项目协作规范

> 本文档与 `docs/PRD-v2.0-visual-redesign.md` 配套，约束本项目内所有 AI 协作行为。
> 冲突裁决：本文档（项目级）优先于全局规则；用户当前明确指令永远优先。

---

## 项目概览

- **定位**：HAN 个人摄影作品集（视觉方向：「胶片暗房」）——用镜头记录时间与地点；
- **技术栈**：Astro 7 + Tailwind CSS v4 + GSAP 3.15 + sharp；纯静态导出（`dist/`）；
- **目录**：
  - `src/pages/` 路由页面（首页 + `gallery/[slug]` 详情）
  - `src/layouts/Base.astro` 全局布局（Loader / NavLayer / ProfileOverlay）
  - `src/components/` 组件；`src/styles/global.css` 设计 token 唯一声明处
  - `src/data/` 类型定义 + `albums.generated.json`（生成物，勿手改）
  - `scripts/sync.mjs` 内容管线（唯一内容更新通道）
  - `album/` 源照片（**只读**）；`public/albums/` 生成图片产物

## 常用命令

```bash
npm run dev      # 本地开发
npm run build    # 静态构建 → dist/
npm run preview  # 预览构建产物
npm run sync     # 扫描 album/ → 生成多尺寸 webp/avif + albums.generated.json
```

## 内容管线（铁律）

1. **`album/` 只读**：任何情况下不修改、不删除源照片；
2. **分组命名**：`YYYY.M.D 地点·主题` 或 `YYYY.M.D-D2 地点·主题`（D2 为结束日），排序即时间线；
3. **每组必须含 `封面.jpg`**（缺失回退第一张并在 sync 输出告警）；
4. **元数据覆盖**走 `albums.config.json`（theme / description / featured / endDate），禁止硬编码进组件；
5. 加照片后必须运行 `npm run sync`（增量、幂等）。

## 设计规范

- 设计 token 一律声明在 `src/styles/global.css` 的 `@theme`（color / font / tracking / radius / spacing），页面与组件内禁止魔法值；
- 字体：`--font-display`（自托管中文宋体子集，≤300KB）+ `--font-body`（系统无衬线栈）；
- 色彩：`--color-ink`（#0a0a09）/ `--color-paper` / `--color-accent`（单一暖色强调）；黑白 + 单强调色体系，不新增第四色；
- 类型层级：display / label / body 三级；对比度 ≥4.5:1（正文）、≥3:1（大字号）。

## 动效规范

- 只动画 transform / opacity / filter / clip-path（禁止 layout 属性动画）；
- ScrollTrigger pin 全站 ≤2 处且章节级；scrub 取值 0.8–1.2；
- 一切动效包在 `gsap.matchMedia("(prefers-reduced-motion: no-preference)")` 内；减少动态用户必须看到完整静态内容；
- 图片揭示用 clip-path 遮罩；视差仅一层（yPercent ≤ ±10）；
- **动画资源必须清理**：`gsap.ticker.remove`、`ScrollTrigger.kill`、页面卸载时解绑监听；
- 入场动画统一监听 `app:loaded`（Loader 派发）后再播放，避免首访被黑幕盖住。

## 代码规范

- Astro 组件化；详情面板**禁止 innerHTML 字符串模板**（用 createElement / 模板函数）；
- 首页只打包索引数据；详情数据按 slug 懒加载分片 JSON（`/album-data/<slug>.json`）；
- 图片一律 `width/height + srcset + sizes + loading=lazy（首图 eager）+ decoding=async`；
- 注释用中文，解释「为什么」而非复述代码；铁律与易错点必须注释；
- 可访问性：`:focus-visible` 焦点环、aria-hidden 状态正确、键盘路径完整。

## Git 规范

- Phase 0 基线提交是重构回滚点；此后**每个 Phase 一个 commit**，提交前核对 diff 与验收结果；
- 未经用户明确批准：不提交、不推送、不合并、不改写历史。

## Skills 使用规范

- 设计改动前加载：`design-taste-frontend`、官方 `gsap-scrolltrigger` / `gsap-performance`；
- 每次 UI 改动后跑 impeccable 评审（hooks 已配置）；发布前跑 `hallmark audit`；
- 图片管线改动参考 sharp 官方文档，不凭记忆改参数。

## 验收标准

- 见 `docs/PRD-v2.0-visual-redesign.md` 成功标准（§2）；
- 每个 Phase 结束执行对应验收清单，通过后再进入下一 Phase。
