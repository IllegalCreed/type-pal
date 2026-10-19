# 批54:editor ui 微/小件 58 文件（零整改批,ui 包开工）

范围:`packages/editor/src/ui/` 全部 ≤150 行生产文件 58 件(design-system 控件族 + 页面小组件 + 纯工具 hook/overlay,不含 __tests__ 辅助)。全文读毕 4433 行。八维审查（A–H）全部通过,零源码改动、零 diff。

## 结论(要点)

- **design-system 控件族**:button/card/feedback/tag/checkbox-radio-switch/tabs/native-inputs/text-inputs/draft-text-inputs/field-layout/media(zoom toolbar+viewport)/overflow-text 全部无本地皮肤分叉;DsTabs 键盘漫游(方向键/Home/End 只在 enabled 项间循环+roving tabIndex);DsOverflowText 三重测量(ResizeObserver+resize 兜底+fonts.ready)+Escape 关闭;DsDraftText 双件统一 draft 事务(IME composition 本地、blur/Enter 单次提交、Escape 取消、syncToken 身份失效丢陈稿)。
- **纯工具层质量**:app-command-registry(注册表重复 id fail-loud;executeEditorSaveShortcut 消费浏览器 Cmd/Ctrl+S——disabled/busy 时仍 preventDefault 防浏览器存页成为意外持久化路径);panel-layout 双栏挤压拟合按比例分配;map-selection-overlay 共享边抵消只描并集外轮廓(单 Path2D 填充防逐格边框噪音);isometric-map-render 视口裁剪按最大瓦片尺寸外扩+全因子缓存键(15 键)+缓存位图直拷;command-form-contract 桥(60+ 自定义 kind 白名单,commit 拒 kind 漂移与丢失 canonical 对话身份)。
- **会话 hook**:useProjectLeaveGuard(beforeunload 只在脏时拦截)/useMapWorkspaceViewSession(视图偏好不入项目内容)/useSceneWorkspaceSession(URL 同步活动场景 replace)/useBattleTrialSession(试打弹窗登记+卸载全关+assertCanLaunch 五重复核:mounted/guard/dirty双会话/state引用/版本+目录 isSameEntry+baseline)。
- **无障碍纪律**:aria-checked=mixed、role=switch、fieldset/legend radio 组、progressbar aria-valuenow 只在确定态、alertdialog、aria-busy、visually-hidden summary 一致使用;缩略图缺图/无图区分 aria-label。

## 测试备注（1 项并行假失败,非本批回归）
全量 src/ui 并行跑 2504/2505,BattleSpriteLibrary.glm-m M05(待机毫秒/帧换算)唯一红;清洁树(本批零 diff)定向重跑同套件 2/2 全绿——与既有判例「并行 vitest 互扰假失败」一致,按并行负载互扰登记,不作为回归;若 Codex 复核无法复现单跑绿请回执。

## 验证
- 定向测试:src/ui 全量 2504/2505(唯一红=M05 并行互扰)+ 单套件重跑 2/2 绿（directed.json + retry.json）。
- 零 diff 批:无源码改动,不适用 body-invariance。
