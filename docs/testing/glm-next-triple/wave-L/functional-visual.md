# Wave-L 功能视觉证据（2026-09-30，GLM L 实操）

环境：独立工作树 dev server `VITE_PROJECT_ID=pal vite --port 6010 --strictPort`
（vite v8.0.14），浏览器 ZCode In-app Browser（Chromium），视口 1600×1000，
项目「PAL 开发基线」正常载入（223 张地图、636 项精灵库）。
全程无 `vite-error-overlay`，无报错浮层；页面内未捕获到 console error 元素。
交互说明：locator click 在画布页面因 rAF 重绘稳定性等待超时，改用页面内
`element.click()` 派发（同一浏览器内真实 DOM 事件）；画布点击用 CUA 坐标。

## 流程一：地图选区与取消（map-004 十里坡，64×128，2 层）

- 入口 URL：`http://localhost:6010/?module=map&subpage=workspace&object=map-004`
  （对象选择经 URL 直达；地图列表点击超时为虚拟列表+画布渲染问题，与被测功能无关）
- 操作序列：
  1. 工具条点击「⛶ 选择」（aria-label `选择地图内容`）→ 工具激活。
  2. CUA 左键单击画布中部（视口坐标 590,380）。
  3. 读回：右侧面板切换为「地图内容选区」，显示 **1 个视觉实例 · 1 个格点**、
     「所选瓦片 #11 / 下层 / 1 个视觉实例」预览缩略、槽位 1（空 0）、图层 下层、
     范围 r127:c31 → r127:c31、视觉实例区（瓦片 11、高度 0、图层 下层 layer-0）、
     格点/碰撞（碰撞值 0）；底部状态「已选择 1 个视觉槽、1 个格点。」、
     光标格 R126·C32。
  4. 按 Escape → 右侧面板回到「属性/选中图层」，选区 Inspector 卸载。
- 截图（SHA256）：
  - `visual/01-map-select-tool-baseline.png` `5a6947f6a4516edbc6db7f2d270d5d743cb062744c1df3879154dde21f9970fa`
  - `visual/02-map-selection-made.png` `8ff23ee71e68f8b2df7150d53622d067e74345b5f16b2814ea36ad8c496061f1`
  - `visual/03-map-selection-esc-cleared.png` `9e1a6b531fe71e1bc35a5842cc61a4e585c12226112c5e10370df6de2e26e777`
- 结论：选择工具→单击建选区→Inspector 分通道回显→Esc 清空选区全链可用，
  与 L01 新测的 patch/汇总合同一致。

### 观察项 O1（非缺陷定性，产品取舍待 Codex 裁决）

Esc 清空选区后，底部状态条仍滞留上一条通知「已选择 1 个视觉槽、1 个格点。」
（生产源 `MapMode.tsx:2185` 经 `notifyWorkspace` 写入 `workspaceNotice`，
该状态无自动过期、Esc 清选区路径不发新通知，滞留 ≥5s，DOM 复核两次均在）。
右侧面板与选区状态本身一致；仅通知行会显示与当前选区矛盾的内容。
未写测试冻结该行为，待产品定性（可能属「最近事件日志」设计）。

## 流程二：精灵源帧编辑回显（PAL 大世界精灵 002 / li-xiaoyao，12 帧）

- 入口 URL：`http://localhost:6010/?module=asset&page=sprite&object=li-xiaoyao&domain=world&view=definition`
- 操作序列：
  1. 基线：源帧检查器「当前帧 #0」、预览「帧 #0 22 × 50 px」、状态 1 / 12、
     「全部源帧」#0 高亮；右侧「李逍遥(大世界)」用途、帧布局 四向行走 4×3。
  2. 点击「下一帧」两次（DOM 事件；`aria-label="下一帧"` 唯一且可见）。
  3. 读回：DOM `帧 #2`、status「已选择源帧 2，共 12 帧」；截图确认
     工具条「当前帧 #2」、预览「帧 #2」（行走姿势，手臂摆动）、3 / 12、
     缩略图 #2 高亮；「用途与动作 · 下·行走」行首帧仍显示 #0（动作锚定首帧，符合预期）。
- 截图（SHA256）：
  - `visual/04-sprite-frame0-baseline.png` `bccdc06cbbbd75405d9d735863a2597ef58870c96de76a9ea65a571d5d9a5562`
  - `visual/05-sprite-frame2-reflected.png` `7c790263f6f3bac323b6a7f57aabfd883b8e1014ce6046ced2789e1d2d384fc9`
- 结论：源帧切换的四处回显（工具条计数、预览图、页码、缩略图选中态）全部同步，
  与 L04 面合同一致。首张「帧 #2」截图因合成器时序滞后被重拍（见 05），作废帧未纳入证据。

## 未证项

- 未验证：印章绘制/放置画布回显、地图笔刷实际写格后的 undo（避免污染共享开发基线工作副本；
  本轮视觉均为无写盘只读操作，未触发保存）。
- console 逐条文本未采集（IAB 未暴露 console 历史）；以「无 vite-error-overlay、
  无错误浮层、交互全部生效」为环境健康证据。
