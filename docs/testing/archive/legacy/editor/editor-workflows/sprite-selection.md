# 精灵上传选图归属 · 实现与验证

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 EDITOR-SPRITE-PICK-1（r1/done；实施基点 `be1868f3`，实现候选 `a88ab18d…88e`；Coding Owner/视觉验证 Codex，GLM 只读探针贡献已披露）的实现与验证回执：SpriteUploadWizard 按 session/assetBase 作用域的「最后选择归属」——旧成功/错误不能更新新选择、bitmap try/finally 恰一次释放、入库 DOM 禁用+真实 submit 入口双重约束。三席 accept+2026-09-18 用户验收，done 归档（同步 `94ef2671`）。

## Scope

- 对象=上传选图归属与资源收尾；不改变控件布局/用途分类/切帧编码/资源 ID 合同/已开始提交后的取消政策（G-I04 仍范围外）。

## Execution and assertions

- **正式回归**：SpriteUploadWizard.selection.test.tsx 新增 20 项+旧 2 项 22/22；SP-01 最后选择（A→B/B→A 两完成序预览与入库均 B）、SP-02 错误归属（旧失败不覆盖新成功/失败后成功不复活）、SP-03 入库准入（DOM 禁用+真实 DsButton 回调独立调用也不得编码）、SP-04 生命周期（cancel/unmount/换 scope 覆盖 pending 与 ready）、SP-05 资源收尾（四种路径 close 一次+getContext null/draw/getImageData/toDataURL 失败逐项释放）、SP-06 字节与历史（gunzip→parseSpriteChunkStrict 全像素/SHA；同内容共用 asset；连续 undo/redo 整状态）、SP-07 原行为保留；与生产主壳同用 React StrictMode；真实 blank loader/EditSession/编解码链，只控制 bitmap/canvas/主色宿主边界
- **独立负控**：sprite-selection-mutants.mjs：1 正控 exit0+6 针业务红（success/error/bitmap-release/ready-draft-admission/palette-error/busy-state ownership）；唯一替换点+执行日志+AssertionError 同时要求，拒 TypeError/超时/零用例；产品磁盘 SHA 不变；负控首版 ready-draft 未锚行首，唯一性自检发现双命中即停止未执行，补行首约束后完整重跑通过；不拿负控重跑冒充首次先红
- **浏览器验证**：正式 6010 Chrome+原生文件选择器 1920×960；本地临时红 64×64/蓝 128×64 棋盘及损坏 PNG；默认定格选 A→B 换图；invalid.png 显示真实解码错误且入库 disabled；取消重开重选 B 入库 codex-sp-pick-proof（目录 636→637、源帧 128×64 蓝图）、一次撤销回 636；未点击保存、PAL 作者文件未写入；不冒称精确控制两个解码 Promise 完成序（由组件宿主测试+六针证明）；完整保存→重开→试玩 E2E 登记为 R4 未跑
- **统一门**：22 定向+36 相邻+typecheck+改动 Biome+6 负控；完整 check exit0 七包 7,302 项；ratchet 与单次严格 fast（BASE_REF=be1868f3）均 exit0，fast 6,814 项/617 生产文件、strict 全指标精确等于 ratchet；218 旧 editor 测试 identity/计数及其它六包基线不变，只新增 20 项；分母净增 31 行/31 语句/3 函数/29 分支不冒称纯补测

## Results

- 旧版本兼容检查 pass：无 schema/save 版本变化、无新 upgrader/旧输入兼容/公共接口。

## Evidence

- 证据路径：本回执正文（quote 保全）；负控/相邻工具与十余份 /tmp 日志清单在 quote（按原文时点）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 实施+验收 | 2026-09-18 | 20 项+6 负控+浏览器+三门 | done（三席+用户） | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy editor/editor-workflows 的 sprite-selection 实现回执；固定来源与 source SHA 见下方保全节。

## 原始结论

done：最后选择归属+双入口准入+资源恰一次释放；SP-01–SP-07 合同；六针负控；浏览器红蓝/损坏/撤销全流程；三门 exit0。

## 当时证据

SP 表、六针表、浏览器四步与基线核验 JSON 在 quote 保全。

## 当前有效性

historical。done 按当时任务范围；G-I04/R4 边界保持。

## 继任文档

当前结论归 EDITOR-SPRITE-PICK-1 完成卡与 canonical 测试。

## 原文保全

固定源 revision `85c462ffd5a6d8514604d346abd96212340c5dfa`，source SHA `47fc9e89223556bb997e2d543aa4035658f028e0682068cf3207c2094d23c68a`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 精灵上传选图归属 · 实现与验证
>
> 任务：[EDITOR-SPRITE-PICK-1](../../../../../ops/archive/tasks/done/EDITOR-SPRITE-PICK-1-latest-image-selection.md)，r1/done，Coding Owner / 视觉验证：Codex。
> 实施基点be1868f3；实现候选`a88ab18d51328432f559b41ee6e8f7880379880e`。本卡已签设计，GLM原只读探针贡献已披露，正式产品与回归由Codex实现。
> 不改变控件布局、用途分类、切帧编码、资源ID合同或已开始提交后的取消政策。
>
> ## 实现边界
>
> - `SpriteUploadWizard.tsx`按session/assetBase建立作用域；新选择递增代次并同步清除readyDraft，旧成功/错误不能更新新选择。
> - `useLayoutEffect`在作用域退出时失效旧选择，重置当前草稿与主色就绪状态；同作用域重渲染不废弃当前选择。
> - bitmap在try/finally中恰一次释放；解码失败没有虚构bitmap。主色异步成功/失败同样检查作用域。
> - 入库DOM禁用与真实submit入口双重约束；入口比较精确draft对象，不能让旧回调借用新选择的“已就绪”布尔值。
> - 原有submitting互斥、作者ID/标签、真实RLE/gzip/SHA、同内容资源复用及AddSpriteCommand保持原逻辑。
>
> ## 正式回归
>
> `packages/editor/src/ui/SpriteUploadWizard.selection.test.tsx`新增20项；与旧2项合跑22/22。
> 新套件与生产主壳相同使用React StrictMode；真实blank项目loader、EditSession和编码/解码链，只控制bitmap/canvas/主色宿主边界。
> FrameThumb在jsdom中不作像素验收，字节oracle独立gunzip→parseSpriteChunkStrict核尺寸、全部像素/透明位、bytes与SHA。
>
> | 合同 | 当前证据 |
> |---|---|
> | SP-01最后选择 | A→B/B→A两完成序，预览文件名及真实入库均为B；A先结束不能清掉B的busy态，等待时仍可再次选图 |
> | SP-02错误归属 | 旧A失败不覆盖B成功；B失败后A成功不能复活为可提交内容，重选C成功恢复 |
> | SP-03入库准入 | 旧图已ready、新图等待/失败时DOM禁用；捕获真实DsButton回调独立调用也不得编码/入库，新图成功后旧回调仍不得提交 |
> | SP-04生命周期 | cancel/unmount释放迟到bitmap且不再绘制；session/assetBase更换分别覆盖pending和ready旧草稿，旧submit不能进入新作用域；同scope重渲染正控 |
> | SP-05资源收尾 | 正常/过期/取消/卸载close一次，getContext null/draw/getImageData/toDataURL失败逐项释放；两种解码拒绝组合无虚构bitmap |
> | SP-06字节与历史 | bytes/SHA/完整像素/opaque检查；两个相同内容定义共用同一asset，catalog/blobs不增副本；每次submit一条真实历史，连续undo/redo整状态核对 |
> | SP-07原行为 | 作者编辑的ID/标签经重选保留；旧多帧/提交互斥与禁取消两项断言原样保留；已开始提交后卸载G-I04仍范围外，不冒称已修 |
>
> 主色额外覆盖旧scope拒绝不污染新scope、旧scope成功不能解除当前主色等待/失败、换scope重试可恢复。
>
> 定向：`pnpm --filter @type-pal/editor exec vitest run src/ui/SpriteUploadWizard.selection.test.tsx src/ui/SpriteUploadWizard.test.tsx`。
> 相邻：`pnpm --filter @type-pal/editor exec vitest run src/ui/WorldSpriteLibrary.test.tsx src/ui/SpriteResourceViewer.test.tsx src/core/sprite-reference-commands.test.ts`，36/36。
> editor typecheck及改动文件Biome通过。
>
> ## 独立单点负控
>
> 入口：[sprite-selection-mutants.mjs](../../../../domains/editor/editor-workflows/tools/sprite-selection-mutants.mjs)，运行`node docs/testing/domains/editor/editor-workflows/tools/sprite-selection-mutants.mjs`。
> 用Vite内存load替换，产品磁盘SHA不变；唯一替换点、执行日志、AssertionError业务红同时要求，拒绝TypeError/超时/零用例。
>
> | 负控 | 破坏 | 结果 |
> |---|---|---|
> | success-ownership | 移除解码成功后的当前性判断 | exit1，旧图/过期绘制合同红 |
> | error-ownership | 移除选图catch当前性判断 | exit1，旧错误覆盖合同红 |
> | bitmap-release | 移除finally close | exit1，close次数红 |
> | ready-draft-admission | 仅移除submit入口的精确draft判断，UI禁用仍保留 | exit1，旧回调开始编码红 |
> | palette-error-ownership | 移除主色catch作用域判断 | exit1，旧主色错误污染红 |
> | busy-state-ownership | 无条件清除decoding | exit1，A完成误清B等待态红 |
>
> 1正常对照exit0＋6针业务红；原8项先红后绿记录仍见任务卡，不拿此轮负控重跑冒充首次先红。
> 负控首版ready-draft定位未锚行首，唯一性自检发现同时命中UI和入口而停止（未执行该针），补行首约束后完整重跑通过。
> 旧审计probe不改写、不把其“修复后observe不再复现”当作新失败。
>
> ## Codex最小功能界面验证（2026-09-18）
>
> 正式Chrome编辑器`http://localhost:6010/`，资源→精灵库→导入源帧资源，原生文件选择器，1920×960截图。
> 测试文件为本地临时生成的红色64×64、蓝色128×64棋盘PNG及明确损坏的invalid.png，不使用个人素材、不替换PAL资源。
>
> 1. 默认定格，选择红图A→蓝图B：原图名/尺寸、原图和入库预览均换成B；现有布局、字段、按钮对齐且可操作。
> 2. 再选invalid.png：显示真实浏览器解码错误，旧B预览可保留但入库disabled，取消可用；不把旧B误当作当前成功选择。
> 3. 取消后重开、重选B：无旧错误/草稿，入库恢复可用；命名临时定义codex-sp-pick-proof并实际入库，目录636→637、源帧128×64，实际显示蓝图。
> 4. 一次“撤销：上传精灵”移除该临时定义/资源，目录回636。本流程未点击保存；PAL作者文件未写入。
>
> 截图：`/tmp/sprite-selection-blue.png`、`/tmp/sprite-selection-failure.png`、`/tmp/sprite-selection-imported.png`；
> 临时图片位于`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/sprite-selection-images-hQ05k6/`。
> 浏览器上述正常重选不冒称精确控制了两个解码Promise的完成序；确定性乱序/等待/旧submit/bitmap释放由真实组件宿主测试与六针反控证明。
> 未进行完整保存→重开→试玩，此流程保留为下节E2E，不让用户复跑技术测试，也不让GLM做视觉判断。
>
> ## 集中E2E登记
>
> R4/编辑器创作链，Owner Codex：空白测试项目→导入A后重选B（不同尺寸/颜色）→B入库→保存→关闭→重开→
> 把新用途引用到场景实体并试玩。业务断言为保存记录hash/bytes一致、重开源帧为B、实体显示B、无A资源误入库；
> 失败选择不能新增记录。证据包含项目身份/保存回执/重开定义与帧数据/实际画面。代码冻结后的完整E2E批次执行，当前未跑。
>
> ## 质量门与交接
>
> 22定向、36相邻、editor typecheck、改动文件Biome与6负控均通过；完整`pnpm check`exit0，七包7302项
> （shared106/content557/pal-extract265/migrate456/reforge1130/game2307/editor2481）。全仓Biome仍有既有48 warning/11 info，未降低规则；本卡三文件零诊断。
> 串行`pnpm coverage:ratchet`与**单次**`TYPE_PAL_COVERAGE_BASE_REF=be1868f3 pnpm coverage:fast`均exit0，
> fast **6814项/617生产文件**，editor **2322项/219测试文件/219生产文件**；strict所有指标精确等于ratchet。
> 218个旧editor测试文件identity/计数及其它六包完整基线对象不变，全部生产文件清单/include/exclude不变，只新增20项。
> 全仓行49023/69082（70.96%）、语句54339/78932（68.84%）、函数10260/14512（70.70%）、分支38843/62028（62.62%）。
> editor行22211/27828（79.82%）、语句24678/31839（77.51%）、函数6144/8102（75.83%）、分支19174/27576（69.53%）。
> 本卡同时增加产品保护代码，分母净增31行/31语句/3函数/29分支，不把覆盖增量全部归为纯补测；未缩范围、未降门槛，未重跑full/E2E。
> Codex/Kimi/GLM三席均accept；2026-09-18用户明确验收通过，Codex同步94ef2671并核候选后代码/测试/基线零漂移，统一done归档。
> GLM只做代码/矩阵且已披露原只读材料贡献；视觉由Codex完成。三席与用户验收均已闭环，无需再签或重复验证；G-I04/R4边界保持。
> 旧版本兼容检查pass：无schema/save版本变化，无新upgrader、旧输入兼容或公共接口；G-I04提交后卸载政策仍范围外。
> 日志：`/tmp/sprite-selection-final-directed.log`、`/tmp/sprite-selection-final-tsc.log`、`/tmp/sprite-selection-adjacent.log`、
> `/tmp/sprite-selection-mutants.log`（首次唯一性拒绝）、`/tmp/sprite-selection-mutants-final.log`（完整通过）、
> `/tmp/sprite-selection-mutants-verified.log`（收紧为实际stdout执行见证后完整重跑）；
> `/tmp/sprite-selection-check.log`、`/tmp/sprite-selection-ratchet.log`、`/tmp/sprite-selection-strict-fast.log`及
> `/tmp/sprite-selection-baseline-verified.json`（独立清单/增量核验）。
>
<!-- original-source-quote:end -->
