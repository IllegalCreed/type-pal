# TB-03 r4 独立接收（2026-09-20，Codex）

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-EDITOR-IMPORT-CODEC-1 r4 独立接收（候选 9eecaaf3，main 核对点 7d6e1322，生产冻结 e58834f6）：counter 仅剩 r4 重写时丢掉的「实际返回预览图」保真断言；r5 最后 counter 已闭合，当前状态见 import-codec-acceptance.md。

## Scope

本轮已独立通过：7 文件 39/39、typecheck、11 文件 biome、原 mutants 判据自测+3 对照+8 针；旧尺寸见证 7/7 绿；新独立见证抽取候选三 helper 调真实 prepareAuthoredImage（控制链 320×200、签名/三 chunk/CRC/zlib inflate/RGBA8/filter-0/逐像素）；独立 SHA 实测 main f614fb38…/preview ee694d77…。唯一阻断：stages.test.ts:305-312 只比 preview 长度/IHDR 尺寸、:312 比的是主图 hash≠预览常量（方向反了），001dc9e1→9eecaaf3 删掉了原两个实际返回值完整 toEqual；单点替换 image-import.ts:140（保留第二次真实编码但交付主图字节）候选 5/5 仍绿、独立 oracle AssertionError 红。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| - 单点替换+独立见证 | 坏实现两次编码计数/尺寸/长度/main SHA 全成立、坏预览 SHA 变主图 SHA；控制 6/6 绿（候选 5+oracle 1）；产品/fixture/测试三文件运行前后 SHA 相同 | Codex | 回执勘误：最近色索引实为 182 非 109（indexed=(182,182,182,255)、preview=(34,5,73,255)），只修文档不改调色板算法 | 最小返工：宿主记录实际两次 toBlob 输出、比较返回 main/preview 完整字节、实际 preview SHA 等于独立常量；把替换纳入常驻负控 |

## Results

历史结果（原卡时点，本页未复跑）：

counter 仅返回值保真断言；不合并、不跑全仓 check/ratchet/strict-fast；基线仍 7220、八批 done 不变；下一位 GLM 提示词在 quote 全文。

## Evidence

- 证据路径：本接收正文（quote 保全）；两见证工具与 /tmp/codex-tb03-r4.SbM0Qm/、/var/folders 返回值见证在 quote 提及。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r4 接收 | 2026-09-20 | 尺寸/编码已接受+返回值断言阻断 | counter（r5 闭合） | r1-r3 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy editor/supply-and-import 的 r4 接收；固定来源与 source SHA 见下方保全节。

## 原始结论

counter 仅返回值保真断言；不合并、不跑全仓 check/ratchet/strict-fast；基线仍 7220、八批 done 不变；下一位 GLM 提示词在 quote 全文。

## 当时证据

通过项清单、替换代码块、勘误数字在 quote 保全。

## 当前有效性

historical。r5 已闭合并 done。

## 继任文档

当前结论归 migration/supply-and-import/import-codec-acceptance.md。

## 原文保全

固定源 revision `85c462ffd5a6d8514604d346abd96212340c5dfa`，source SHA `f7ed9d2fd730853f1470f90e0af3eac6558101a434f2b7fe62ee015d8db71a0d`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TB-03 r4 独立接收（2026-09-20，Codex）
>
> 本页为r4历史反例；r5最后counter已闭合，当前状态见[独立接收](../../migration/supply-and-import/import-codec-acceptance.md)，不重复返工。
>
> 候选：9eecaaf3b034420b751fcf7b7bab1e08ca3b220f，本地/远端一致且工作树干净；
> main核对点7d6e1322；生产冻结e58834f6，设计不重签。
> 任务：[TEST-EDITOR-IMPORT-CODEC-1](../../../../../ops/archive/tasks/done/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md)，保持rework。
>
> **结论：counter，仅剩r4重写时丢掉的“实际返回预览图”保真断言。尺寸/编码宿主修复已接受，不再返这一部分。**
> 其他八批已done、不重开；不混入模拟器，不代签、不标done。
>
> ## 本轮已独立通过
>
> - 候选相对最新main恰7新测试+1 fixture的代码面；相对e58834f6无既有packages文件修改；诊断/回执保持原白名单。
> - 7文件39/39；editor typecheck exit0；完整11文件Biome exit0；
>   原mutants判据自测、3对照+8针全部通过（显式复跑与定向执行器附带两次，未把重复轮算新增针）。
> - 旧尺寸见证control 7/7绿；仅删canvas宽高两行，候选自身AssertionError检出。
>   旧工具的actualHost顶层被mutant末次写成0×0；这不是正控结果，不据此误判尺寸仍有问题。
> - 新独立见证直接抽取候选三个helper、调用真实prepareAuthoredImage，不修改候选/产品；
>   控制链source/main/preview均320×200；独立核签名、三chunk、CRC、zlib inflate、RGBA8/filter-0行长和逐像素字节。
>   主图/预览解码像素分别与同次putImageData实际交付快照逐字节一致，不再用固定2×1/3×1产物。
> - 独立SHA实测：main f614fb38624c5011744c4721d11304660db996311d377e3399d7cce1167527f7；
>   preview ee694d7766f4e69c15464f2c6d33c851fa638877aedf12a02fe6ec0126be8529，与常量一致。
> - 旧版本兼容审查：pass；没有产品/旧测试/格式兼容分支改动，关闭的C0/C1等不重开。
>
> ## 唯一阻断：预览返回值被替换仍全绿
>
> 位置：候选 packages/editor/src/core/image-import.stages.test.ts:305–312。
> 当前仅比较preview长度与main长度、IHDR尺寸；:312比较的是**主图hash与预览常量不同**，没有给实际preview算摘要。
> deliveredPixels断言检查的是编码前输入，不能证明函数最终返回的effectPreviewBytes就是那份编码结果。
> 对比001dc9e1→9eecaaf3可见原先两个实际返回值与宿主产物的完整toEqual被删除；不是新增范围要求。
>
> 隔离单点替换实际生产赋值（image-import.ts:140）：
>
> ~~~ts
> // 正常：
> effectPreviewBytes = await canvasPng(canvas)
> // 坏实现：保留第二次真实编码及其全部副作用，但交付错误的主图字节。
> effectPreviewBytes = (await canvasPng(canvas), bytes.slice(0))
> ~~~
>
> 结果：候选5/5仍绿；独立返回值oracle以AssertionError红（previewMatches=false），不是超时/TypeError/环境失败。
> 两次编码计数、尺寸、长度、main SHA全部仍成立；坏预览的SHA变为主图SHA。控制6/6绿（候选5+独立oracle1）。
> 产品/fixture/测试三文件运行前后SHA完全相同。
>
> 最小返工：在宿主记录**实际两次toBlob输出**（防后续别名污染），比较真实返回main/preview与对应输出完整字节；
> 再核实际preview SHA等于独立preview常量（而不是主hash“不等于该常量”）。把上述替换纳入常驻负控并钉候选自己的业务断言。
> 不必改PNG模型/尺寸实现，不新增生产守卫，不用重新跑或更改其它批。
>
> ## 回执勘误（非新的产品问题）
>
> r4回执/机账写最近色索引109，实际该palette与全零输入选中**182**：
> indexed=(182,182,182,255)，preview=(34,5,73,255)；独立解码、SHA与实际交付像素均印证。
> 修文档数字即可，不把产品调到109，不借此变更调色板算法。
> “保留完整字节与真实摘要断言”也须按最终树更正，不能用离线oracle代替常驻测试中已经被删掉的断言。
>
> ## 重建与证据
>
> ~~~sh
> node docs/testing/domains/editor/supply-and-import/tools/import-codec-png-host-review.mjs /Users/zhangxu/illegal/type-pal-glm-import-codec
> node docs/testing/domains/editor/supply-and-import/tools/import-codec-preview-review.mjs /Users/zhangxu/illegal/type-pal-glm-import-codec
> ~~~
>
> [新返回值见证](../../../../domains/editor/supply-and-import/tools/import-codec-preview-review.mjs)、[机器账](import-codec-r4-evidence.json)。
> 定向/tc/Biome/原负控：/tmp/codex-tb03-r4.SbM0Qm/；
> 返回值独立见证：/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-preview-return-oL6vw6/。
> 新见证工具格式机械调整后复跑，结论一致；没有改GLM测试语义或原见证工具。
> 本轮counter未闭合，所以不合并、不跑全仓check/官方ratchet/strict-fast；基线仍7220，八批done不变。
>
> ## 下一位Agent提示词：GLM
>
> ~~~text
> 在 /Users/zhangxu/illegal/type-pal 只返工TB03，卡 docs/ops/archive/tasks/done/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md 为rework，源9eecaaf3，生产e58834f6，设计不重签。
> 先同步最新main到原独立分支并保留八批归档/模拟器状态，读AGENTS/CLAUDE/READ-FIRST、本卡及 docs/testing/archive/legacy/editor/supply-and-import/import-codec-r4-review.md、交付清单。本轮已接受尺寸、CRC/zlib、交付像素编码与主图摘要；不再重开这些项。
> 唯一阻断：r4删掉了返回预览完整字节断言。让宿主记录实际两次toBlob产物，核返回main/preview对应完整字节，并对实际preview做SHA断言；仅删除对主hash的“不等于preview常量”不能代替验证。
> 把报告的“仍调用第二次canvasPng但effectPreviewBytes改交主图”单点坏实现纳入负控，node docs/testing/domains/editor/supply-and-import/tools/import-codec-preview-review.mjs <worktree>须由候选自己的AssertionError检出，控制绿。旧尺寸见证和原3+8保持通过。helper改签时告知真实入口，Codex适配，不复制假helper。
> 回执像素数字勘误为index182 / [182,182,182,255] / [34,5,73,255]，不修改生产算法。最终定向39、tc、完整白名单Biome、原负控+新增针从提交树复跑并如实回填。
> 只改TB03白名单与本人回执，不改产品/旧测试/官方基线/原探针；编码失败close仍归Codex。不要回退另外八批done或模拟器build，不代签、不标done。本人落卡提交推送后交Codex；全仓门由Codex接收后运行，Mimosa不参与。
> ~~~
>
<!-- original-source-quote:end -->
