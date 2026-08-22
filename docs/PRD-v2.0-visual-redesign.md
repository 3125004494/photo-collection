# PRD — HAN 摄影集 2.0 视觉重构

> 版本：v2.0 · 日期：2026-08-21 · 状态：已批准（待拍板 7 项决策点后进入 Phase 0 执行）
> 关联文档：本文件是《HAN 摄影集 2.0 视觉重构方案 v2》的执行前文档；配套 AGENTS.md（项目协作规范）。

---

## 1. 问题是什么

HAN 摄影集（Astro 7 + Tailwind v4 + GSAP 3.15 + sharp，纯静态导出）目前可以正常使用，但未达到「有设计感、艺术美感」的目标：

- **首页形态单一**：只有横向「放映台」一种浏览方式，无叙事入口、无精选章节、无全量总览（impeccable 评审 21/36 的 P2 问题）；
- **详情页视觉平淡**：图片仅 opacity 淡入；无页内进度、无末尾「下一组」CTA；`location` 字段因 `theme === location` 永不显示（死 UI）；日期区间（如 `2025.7.5-8`）终点丢失；
- **可访问性与元数据缺陷**：`text-black/35` 对比度 ≈2.6:1 不达标；无 OG/theme-color 标签；触屏提示未随设备切换；sizes 欠供图；
- **性能问题**：全站图片 64.3MB；详情图仅单尺寸 1600px webp，无 AVIF、无 srcset、无模糊占位；
- **工程质量**：详情面板大量 `innerHTML` 字符串模板；全量 15 组数据 JSON 内联到首页；`gsap.ticker` 未清理；**git 零提交（无回滚点）**。

**调研依据**：GSAP Showcase 6 个摄影/影像类站点分析表明，「高级感」来自：留白大空间 + 滚动叙事剪辑 + 编辑式排版 + 克制色彩 + 性能丝滑 + 作者在场（详见方案 §3）。

## 2. 成功标准（可验证）

1. 首页由单一横向放映台改为「叙事 + 索引」两级信息架构，首屏一屏一图；
2. 全站统一编辑式设计系统（字体/色彩/纹理/间距 token），无模板感；
3. Lighthouse（移动）：Performance ≥ 90、Accessibility ≥ 95、Best Practices ≥ 95；详情页图片传输量较当前 -50%；
4. impeccable 评审 ≥ 30/36；hallmark audit 无「AI 味」类命中；
5. 键盘可完整浏览；`prefers-reduced-motion` 用户看到完整非动画内容；对比度通过 WCAG AA（正文 ≥4.5:1、大字号 ≥3:1）；
6. 内容管线保持「拖照片文件夹 → `npm run sync` → 构建」一键流程不变。

## 3. 范围

**包含**
- 设计系统：字体（自托管中文宋体标题子集 ≤300KB + 系统无衬线正文）、色彩（深灰黑 + 纸白 + 单一暖色强调）、胶片颗粒纹理、display/label/body 类型层级；
- 首页四段式叙事重构：Hero → 精选叙事章节 ×2 → 放映台索引 → 关于/页脚；
- 详情页视觉升级：clip-path 遮罩 reveal、单层视差、进度 N/M、末尾 CTA；
- 图片管线 v2：800/1600/2400 三档 + AVIF + 16px 模糊占位；`albums.generated.json` schema v2；首页索引数据与详情分片 JSON 拆分；
- 元数据与可访问性修复：OG/theme-color、日期区间、location 拆分、对比度、焦点环、键盘路径；
- 工程质量：git 基线提交、面板模板化、动画资源清理、README 恢复；
- 新 skills 安装（§方案 2 清单）。

**不包含**
- 后端/CMS、账号体系、照片调色或重拍、部署上线、i18n、图床迁移。

## 4. 约束条件

1. 技术栈不变（Astro/Tailwind/GSAP/sharp），尽量零新增 npm 依赖；
2. `album/` 源照片只读铁律；`npm run sync` 一键流程不变；
3. 字体自托管 + 子集化，不使用外部 CDN；
4. ScrollTrigger pin 全站 ≤2 处且章节级；`prefers-reduced-motion` 全覆盖；
5. 保留「放映台」索引层与现有拖拽/滚轮交互习惯；
6. 新 skills 安装至 `C:\Users\14586\.agents\skills`（全局规则），不复制进 repo；
7. 未经用户明确批准：不提交、不推送、不覆盖用户已有改动。

## 5. 初步方案（Phase 0-5 摘要）

- **Phase 0（文档前置 + 基线）**：落盘本 PRD + AGENTS.md + README.md；deepseek 识图建立视觉基线（视觉额度恢复后执行）；Playwright 存档截图；基线 git 提交（需批准）；安装 5 个新 skills、移除 design-taste-frontend-v1；
- **Phase 1（设计系统）**：字体/色彩/纹理/类型层级 token + HTML 元数据；
- **Phase 2（图片管线）**：多尺寸 + AVIF + 占位图 + schema v2 + 数据分片懒加载 + 全量重跑 sync；
- **Phase 3（首页叙事重构）**：Hero → 精选章节（pin+scrub）→ 放映台索引 → 关于/页脚；
- **Phase 4（详情页升级）**：遮罩 reveal、单层视差、进度、末尾 CTA、元数据修复、模板化；
- **Phase 5（打磨收尾）**：暗房式 Loader、hover 跟手预览、红旗修复、全量验收。

每阶段独立验收后再进入下一阶段。

## 6. 待解决的问题（执行前需拍板）

1. **设计方向**：A) 胶片暗房（深黑 + 暖橙强调 + 宋体标题，默认推荐）；B) 黑白 + 无衬线大字号；C) 其他方向（用户指定品牌词）；
2. **Hero 代表作**：`2026.3.5 潮汕·过年` / `2025.7.5-8 南京·毕业旅行` / 用户指定；
3. **精选叙事章节**：选哪 2 组，或接受按「故事性 + 构图」推荐；
4. **声音/氛围开关**：做 / 不做（默认关闭 + 显式按钮）；
5. **新 skills 安装位置**：`C:\Users\14586\.agents\skills`（确认）；
6. **初始 git 提交**：需用户明文批准（当前仓库零提交）；
7. **分阶段实施**：每 Phase 独立验收再继续（确认）。

---

## 附：数据模型 v2（预告）

```ts
interface Photo {
  src: string; srcset: string; avifSrcset?: string;
  width: number; height: number; blur: string;   // 16px 占位图
}
interface Album {
  slug: string; title: string; description: string;
  cover: Photo; photos: Photo[];
  dateStart: string | null; dateEnd: string | null;   // 区间拆分
  location: string | null;   // 「北京·跨年」→ 北京
  theme: string;             // 「北京·跨年」→ 跨年
  featured?: boolean;        // 精选章节标记
}
```
