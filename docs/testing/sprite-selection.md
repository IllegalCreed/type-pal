# 精灵上传选图归属 · 实现与验证

任务：[EDITOR-SPRITE-PICK-1](../ops/tasks/EDITOR-SPRITE-PICK-1-latest-image-selection.md)，r1，Coding Owner / 视觉验证：Codex。
实施基点be1868f3；实现候选`a88ab18d51328432f559b41ee6e8f7880379880e`。本卡已签设计，GLM原只读探针贡献已披露，正式产品与回归由Codex实现。
不改变控件布局、用途分类、切帧编码、资源ID合同或已开始提交后的取消政策。

## 实现边界

- `SpriteUploadWizard.tsx`按session/assetBase建立作用域；新选择递增代次并同步清除readyDraft，旧成功/错误不能更新新选择。
- `useLayoutEffect`在作用域退出时失效旧选择，重置当前草稿与主色就绪状态；同作用域重渲染不废弃当前选择。
- bitmap在try/finally中恰一次释放；解码失败没有虚构bitmap。主色异步成功/失败同样检查作用域。
- 入库DOM禁用与真实submit入口双重约束；入口比较精确draft对象，不能让旧回调借用新选择的“已就绪”布尔值。
- 原有submitting互斥、作者ID/标签、真实RLE/gzip/SHA、同内容资源复用及AddSpriteCommand保持原逻辑。

## 正式回归

`packages/editor/src/ui/SpriteUploadWizard.selection.test.tsx`新增20项；与旧2项合跑22/22。
新套件与生产主壳相同使用React StrictMode；真实blank项目loader、EditSession和编码/解码链，只控制bitmap/canvas/主色宿主边界。
FrameThumb在jsdom中不作像素验收，字节oracle独立gunzip→parseSpriteChunkStrict核尺寸、全部像素/透明位、bytes与SHA。

| 合同 | 当前证据 |
|---|---|
| SP-01最后选择 | A→B/B→A两完成序，预览文件名及真实入库均为B；A先结束不能清掉B的busy态，等待时仍可再次选图 |
| SP-02错误归属 | 旧A失败不覆盖B成功；B失败后A成功不能复活为可提交内容，重选C成功恢复 |
| SP-03入库准入 | 旧图已ready、新图等待/失败时DOM禁用；捕获真实DsButton回调独立调用也不得编码/入库，新图成功后旧回调仍不得提交 |
| SP-04生命周期 | cancel/unmount释放迟到bitmap且不再绘制；session/assetBase更换分别覆盖pending和ready旧草稿，旧submit不能进入新作用域；同scope重渲染正控 |
| SP-05资源收尾 | 正常/过期/取消/卸载close一次，getContext null/draw/getImageData/toDataURL失败逐项释放；两种解码拒绝组合无虚构bitmap |
| SP-06字节与历史 | bytes/SHA/完整像素/opaque检查；两个相同内容定义共用同一asset，catalog/blobs不增副本；每次submit一条真实历史，连续undo/redo整状态核对 |
| SP-07原行为 | 作者编辑的ID/标签经重选保留；旧多帧/提交互斥与禁取消两项断言原样保留；已开始提交后卸载G-I04仍范围外，不冒称已修 |

主色额外覆盖旧scope拒绝不污染新scope、旧scope成功不能解除当前主色等待/失败、换scope重试可恢复。

定向：`pnpm --filter @type-pal/editor exec vitest run src/ui/SpriteUploadWizard.selection.test.tsx src/ui/SpriteUploadWizard.test.tsx`。
相邻：`pnpm --filter @type-pal/editor exec vitest run src/ui/WorldSpriteLibrary.test.tsx src/ui/SpriteResourceViewer.test.tsx src/core/sprite-reference-commands.test.ts`，36/36。
editor typecheck及改动文件Biome通过。

## 独立单点负控

入口：[sprite-selection-mutants.mjs](sprite-selection-mutants.mjs)，运行`node docs/testing/sprite-selection-mutants.mjs`。
用Vite内存load替换，产品磁盘SHA不变；唯一替换点、执行日志、AssertionError业务红同时要求，拒绝TypeError/超时/零用例。

| 负控 | 破坏 | 结果 |
|---|---|---|
| success-ownership | 移除解码成功后的当前性判断 | exit1，旧图/过期绘制合同红 |
| error-ownership | 移除选图catch当前性判断 | exit1，旧错误覆盖合同红 |
| bitmap-release | 移除finally close | exit1，close次数红 |
| ready-draft-admission | 仅移除submit入口的精确draft判断，UI禁用仍保留 | exit1，旧回调开始编码红 |
| palette-error-ownership | 移除主色catch作用域判断 | exit1，旧主色错误污染红 |
| busy-state-ownership | 无条件清除decoding | exit1，A完成误清B等待态红 |

1正常对照exit0＋6针业务红；原8项先红后绿记录仍见任务卡，不拿此轮负控重跑冒充首次先红。
负控首版ready-draft定位未锚行首，唯一性自检发现同时命中UI和入口而停止（未执行该针），补行首约束后完整重跑通过。
旧审计probe不改写、不把其“修复后observe不再复现”当作新失败。

## Codex最小功能界面验证（2026-09-18）

正式Chrome编辑器`http://localhost:6010/`，资源→精灵库→导入源帧资源，原生文件选择器，1920×960截图。
测试文件为本地临时生成的红色64×64、蓝色128×64棋盘PNG及明确损坏的invalid.png，不使用个人素材、不替换PAL资源。

1. 默认定格，选择红图A→蓝图B：原图名/尺寸、原图和入库预览均换成B；现有布局、字段、按钮对齐且可操作。
2. 再选invalid.png：显示真实浏览器解码错误，旧B预览可保留但入库disabled，取消可用；不把旧B误当作当前成功选择。
3. 取消后重开、重选B：无旧错误/草稿，入库恢复可用；命名临时定义codex-sp-pick-proof并实际入库，目录636→637、源帧128×64，实际显示蓝图。
4. 一次“撤销：上传精灵”移除该临时定义/资源，目录回636。本流程未点击保存；PAL作者文件未写入。

截图：`/tmp/sprite-selection-blue.png`、`/tmp/sprite-selection-failure.png`、`/tmp/sprite-selection-imported.png`；
临时图片位于`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/sprite-selection-images-hQ05k6/`。
浏览器上述正常重选不冒称精确控制了两个解码Promise的完成序；确定性乱序/等待/旧submit/bitmap释放由真实组件宿主测试与六针反控证明。
未进行完整保存→重开→试玩，此流程保留为下节E2E，不让用户复跑技术测试，也不让GLM做视觉判断。

## 集中E2E登记

R4/编辑器创作链，Owner Codex：空白测试项目→导入A后重选B（不同尺寸/颜色）→B入库→保存→关闭→重开→
把新用途引用到场景实体并试玩。业务断言为保存记录hash/bytes一致、重开源帧为B、实体显示B、无A资源误入库；
失败选择不能新增记录。证据包含项目身份/保存回执/重开定义与帧数据/实际画面。代码冻结后的完整E2E批次执行，当前未跑。

## 质量门与交接

22定向、36相邻、editor typecheck、改动文件Biome与6负控均通过；完整`pnpm check`exit0，七包7302项
（shared106/content557/pal-extract265/migrate456/reforge1130/game2307/editor2481）。全仓Biome仍有既有48 warning/11 info，未降低规则；本卡三文件零诊断。
串行`pnpm coverage:ratchet`与**单次**`TYPE_PAL_COVERAGE_BASE_REF=be1868f3 pnpm coverage:fast`均exit0，
fast **6814项/617生产文件**，editor **2322项/219测试文件/219生产文件**；strict所有指标精确等于ratchet。
218个旧editor测试文件identity/计数及其它六包完整基线对象不变，全部生产文件清单/include/exclude不变，只新增20项。
全仓行49023/69082（70.96%）、语句54339/78932（68.84%）、函数10260/14512（70.70%）、分支38843/62028（62.62%）。
editor行22211/27828（79.82%）、语句24678/31839（77.51%）、函数6144/8102（75.83%）、分支19174/27576（69.53%）。
本卡同时增加产品保护代码，分母净增31行/31语句/3函数/29分支，不把覆盖增量全部归为纯补测；未缩范围、未降门槛，未重跑full/E2E。
Codex/Kimi/GLM三席均accept；2026-09-18 Codex核57b4ac5d与origin一致、候选后代码/测试/基线零漂移，当前仅待用户验收/明确收口，不再请求AI签字。
GLM只做代码/矩阵且已披露原只读材料贡献；视觉由Codex完成。最小两步用户清单见任务卡，可明确免复验通过；未提前标done。
旧版本兼容检查pass：无schema/save版本变化，无新upgrader、旧输入兼容或公共接口；G-I04提交后卸载政策仍范围外。
日志：`/tmp/sprite-selection-final-directed.log`、`/tmp/sprite-selection-final-tsc.log`、`/tmp/sprite-selection-adjacent.log`、
`/tmp/sprite-selection-mutants.log`（首次唯一性拒绝）、`/tmp/sprite-selection-mutants-final.log`（完整通过）、
`/tmp/sprite-selection-mutants-verified.log`（收紧为实际stdout执行见证后完整重跑）；
`/tmp/sprite-selection-check.log`、`/tmp/sprite-selection-ratchet.log`、`/tmp/sprite-selection-strict-fast.log`及
`/tmp/sprite-selection-baseline-verified.json`（独立清单/增量核验）。
