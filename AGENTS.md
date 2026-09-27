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

## 本轮工具编排：移动端 Figma 布局探索（2026-09-27）

- **目标与范围**：仅交付可评审的 390px 首页、影集详情、灯箱 Figma 设计及 320px 窄屏检查；保留现有照片、文案、色彩与字体方向，不改网站代码、不部署。
- **需求/调研**：读取本文件、PRD、Astro 页面、设计 token 和现有照片数据；不调用外部调研插件，现有项目资料足够。
- **设计/规划**：使用项目级 `design-taste-frontend` 与官方 Figma `figma-create-new-file`、`figma-generate-design`、`figma-use`；输入为现有页面、照片与 token，输出为可编辑 Figma 画面及设计说明。`gsap-scrolltrigger`、`gsap-performance` 仅用于标注实现约束，不修改动效。
- **实现**：只在 Figma 草稿文件内创建设计稿；不使用 UI 组件库、代码生成或项目依赖安装。
- **测试/调试**：使用 Figma 截图与节点检查 390px/320px 的文字、图片、触控目标及浏览路径；Playwright、`impeccable` 留待网站实现后使用。
- **部署/运维**：不使用 Cloudflare、Vercel 或 CI 工具，不部署。
- **文档交付**：提供 Figma 链接与简短设计说明；README 已有用户改动，本轮不覆盖。
- **凭据与安全边界**：只使用已连接的 Figma 账号创建独立草稿；不读取、输出或上传凭据，不提交/推送，不修改 `album/` 源照片。
- **执行偏差**：本地浏览器启动被环境策略拦截，`figma-generate-design` 已生成捕获 ID 但无法提交网页捕获；改用官方 `upload_assets` 上传项目已有生成照片到 Figma，继续用 `figma-use` 排版，不保留临时网页捕获脚本。

## 本轮工具编排：移动端页面实现（2026-09-27）

- **目标与范围**：以已确认的 Figma 六画面为依据，调整首页、影集详情与灯箱的 320–639px 布局和触控路径；桌面体验、内容管线、源照片不改。
- **需求/调研**：复用现有 PRD、Figma 稿、项目代码与历史决策；不另用外部调研插件或引入开源 UI 套件，现有 Astro/Tailwind/GSAP 足以实现。
- **设计/规划**：使用项目级 `design-taste-frontend`、`impeccable adapt/audit` 和官方 `gsap-scrolltrigger`、`gsap-performance`；输入为现有设计 token、Figma 布局及页面，输出为明确的移动端布局和动效边界。
- **实现**：修改 `src/pages/index.astro`、`src/pages/gallery/[slug].astro` 及必要的全局/导航样式；按模块分工，避免多人同时编辑同一文件。Figma MCP 仅作已确认设计依据，不继续写入 Figma。
- **测试/调试**：先 `npm run build`，再用已有浏览器能力检查 320/390px 与桌面；核对溢出、照片、导航、触屏、灯箱和减少动态。没有可用浏览器时如实标出未验证项。
- **部署/运维**：不使用 Cloudflare/Vercel/CI 工具，不部署、不提交。
- **文档交付**：更新 README 中的移动端状态和实现说明；报告实际调用与计划未调用工具及原因。
- **凭据与安全边界**：不触碰密钥、`album/`、未相关的 CI 与用户已有改动；不安装全局依赖，不推送。

## 本轮工具编排：移动端页面部署（2026-09-27）

- **目标与范围**：将已验证的移动端页面发布到现有 Cloudflare Pages 生产站点；仅包含本轮移动端代码及必要说明，不包含工作区其他改动。
- **需求/调研**：核对 Git 远端、生产分支、Pages 连接方式和现有部署；使用仓库文档与 Cloudflare 官方能力，不扩展产品需求。
- **设计/规划**：沿用已确认的 Figma 方案；发布前按项目规范做 Hallmark 审核，不重新设计。
- **实现**：不改页面功能；必要时只补部署说明和本段工具编排。
- **测试/调试**：运行构建与差异检查，发布后检查部署状态、首页、详情页和静态资源的线上响应。
- **部署/运维**：优先使用已连接的 Cloudflare Pages 或现有 Git 集成；限定提交/推送范围，不安装全局依赖或泄露凭据。
- **文档交付**：报告生产 URL、部署版本、验证结果和未验证项；本轮不调用 Figma MCP、Playwright 或 Vercel，设计已确认且部署目标为 Cloudflare。
- **凭据与安全边界**：不读取或输出密钥，不修改 `album/` 原图，不覆盖 CI 工作区改动、`address.txt` 或 `方案.docx`。
