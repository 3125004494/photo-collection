---
timestamp: 2026-08-20T17-58-52Z
slug: src-pages-index-astro
---
# Critique Snapshot — src/pages/index.astro（首页放映台 + 详情页）

- 日期：2026-08-20
- Method: dual-agent（A 设计评审 / B 检测器+浏览器证据）
- 目标：src/pages/index.astro, src/pages/gallery/[slug].astro, Base, components, global.css

## 设计健康评分：21/36（58%，Acceptable）
#1 系统状态 2 · #2 匹配现实 3 · #3 用户控制 3 · #4 一致性 2 · #5 错误预防 3
#6 识别而非回忆 2 · #7 灵活高效 1 · #8 美学极简 3 · #9 错误恢复 2 · #10 帮助文档 n/a

## 优先问题
- P1 返回首页丢失位置记忆（index.astro centerFirst + MPA 跳转）→ sessionStorage 记录 scrollLeft / history.back 语义
- P1 键盘用户无法滚动详情页图片流（data-scroller 无 tabindex/焦点）→ tabindex=0 + 方向键 + :focus-visible
- P1 首访详情页入场动画被 Loader 盖住（[slug].astro:98 未监听 app:loaded）→ 与主页一致监听后再播
- P2 15 组线性条带无总览/索引（点阵 4px 无标签、无年份刻度）→ 总览按钮/点阵 hover 组名/方向键翻卡
- P2 影集内无进度、照片不可放大（58vh/46% 限死）→ 进度计数 + 全屏灯箱 + 末尾下一组 CTA

## 检测器
- detect.mjs CLI：exit 0 / 0 发现（静态扫描保守，渲染后 DOM 级规则无法完整触发）
- 浏览器：环境无渲染 DOM（dump-dom 空、截图黑帧）→ 视觉证据受限，SSR 产物核验通过（15 卡/31 figure/data 属性齐全）

## 红旗
- 移动端双层嵌套滚动、33 张组无进度
- 无 :focus-visible、图片列键盘不可滚
- 对比度不足（text-black/35 ≈2.6:1、opacity-50 ≈3.9:1）
- 链接可访问名重复（img alt + span 文本双读，aria-hidden="false" 冗余）
- 唯一交互提示 2.2:1 对比度

## 次要观察（要点）
- aria-hidden="false" 冗余；地点字段恒不显示（死 UI）；日期区间丢终点；404 渲染完整首页导航；无 theme-color/OG 标签；ticker 永不移除；触屏提示未随 isTouch 切换；卡片标题无渐变遮罩；sizes 略欠供图
