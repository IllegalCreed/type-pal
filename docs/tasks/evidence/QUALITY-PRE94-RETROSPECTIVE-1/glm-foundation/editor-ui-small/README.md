# 批54:editor ui 微/小件 58 文件（零整改批,ui 包开工）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页审计主题:packages/editor/src/ui/ 全部 ≤150 行生产文件 58 件(design-system 控件族+页面小组件+纯工具 hook/overlay,不含 __tests__ 辅助)的八维审查(A–H),ui 包开工批。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收;可复用范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 范围与证据

范围 58 件全文读毕 4433 行;零整改批(零源码改动、零 diff)。验证证据:定向测试 src/ui 全量 2504/2505(唯一红=M05)+单套件重跑 2/2 绿(同目录 retry.json 原件在库);原全量回执超 1MiB,现以 [directed.json.gz](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/editor-ui-small/directed.json.gz) 无损 gzip 保留(解压字节/SHA 与冻结 5af1b6372 一致)。零 diff 批不适用 body-invariance。

## 发现

design-system 控件族:button/card/feedback/tag/checkbox-radio-switch/tabs/native-inputs/text-inputs/draft-text-inputs/field-layout/media/overflow-text 无本地皮肤分叉;DsTabs 键盘漫游(方向键/Home/End 只在 enabled 项间循环+roving tabIndex);DsOverflowText 三重测量(ResizeObserver+resize 兜底+fonts.ready)+Escape 关闭;DsDraftText 双件统一 draft 事务(IME composition 本地、blur/Enter 单次提交、Escape 取消、syncToken 身份失效丢陈稿)。纯工具层:app-command-registry 注册表重复 id fail-loud,executeEditorSaveShortcut 消费浏览器 Cmd/Ctrl+S——disabled/busy 时仍 preventDefault 防浏览器存页成为意外持久化路径;panel-layout 双栏挤压拟合;map-selection-overlay 共享边抵消只描并集外轮廓(单 Path2D);isometric-map-render 视口裁剪+15 键全因子缓存键;command-form-contract 桥 60+ 自定义 kind 白名单,commit 拒 kind 漂移与丢失 canonical 对话身份。会话 hook:useProjectLeaveGuard 脏时才拦 beforeunload;useMapWorkspaceViewSession 视图偏好不入项目内容;useBattleTrialSession assertCanLaunch 五重复核(mounted/guard/dirty 双会话/state 引用/版本+目录 isSameEntry+baseline)。无障碍纪律:aria-checked=mixed、role=switch、fieldset/legend radio 组、progressbar 确定态、alertdialog、aria-busy 一致使用。

## 结论

八维审查(A–H)作者主张全部通过,零源码改动、零 diff;登记移交无新清理候选。测试事实:全量 src/ui 并行跑 2504/2505,BattleSpriteLibrary.glm-m M05(待机毫秒/帧换算)唯一红;清洁树定向重跑同套件 2/2 绿(retry.json 实测 2 断言:待机 40ms 换算单命令提交/行动 0ms 落 0 ticks 两字段独立草稿)。治理不改写红绿事实。

## 整改与复核

本批零整改。Codex 2026-10-19 勘误与接管:M05 初跑业务断言失败、单文件重跑绿、后续 editor-ui-large 全量 2505 绿分别成立;原因保持未知,撤回『并行假失败/非回归已证』归因,不得只凭无源码 diff 或重跑通过认定根因;原件保持,不要求再盲跑 2505 例。未重跑任何测试;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3525B / SHA-256 2be3e4662ba20aee63f4e626acf7901077bbe3acbeb2474979780446545dc898；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 批54:editor ui 微/小件 58 文件（零整改批,ui 包开工）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

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


## Codex当前勘误与接管（2026-10-19）

当前裁定：M05初跑业务断言失败、单文件重跑绿、后续editor-ui-large全量2505绿分别成立；原因保持未知，撤回“并行假失败/非回归已证”的归因。不得只凭无源码diff或重跑通过认定根因。原件保持，不要求再盲跑2505例。 [当前返工与限制](../codex-stage2-rework.json)。


## 原生附件无损迁移（Codex，2026-10-19）

原directed.json超过现行1MiB检查边界；现以[原始JSON的无损gzip](directed.json.gz)保留，解压字节/SHA与冻结5af1b6372一致。 未放宽files.maxSize或新增ignore；迁移与失败/恢复身份见[当前回执](../codex-stage2-rework.json)。
```
<!-- incremental-original-source:end -->
