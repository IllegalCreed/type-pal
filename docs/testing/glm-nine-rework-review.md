# GLM TB-02～TB-10：返工后的独立接收复核

2026-09-19，Codex；main `cf33544d`，生产冻结 `e58834f6`。只接收用户列出的九个候选，TB00/TB01另排；模拟器留独立分支。

**结论：原七针与五组夹具已闭合，但九批仍分别counter。暂不合并、不更新官方基线、不转Kimi、不标done。**
只返公共判据精确唯一性、最终树格式/回执，以及TB03/06/07三项业务证明；不重开已关闭项，不重签设计。

## 本人重跑总账

| 批次 | 精确候选 | 定向实测 | 原工具对照+变异 | 包tc | 本批白名单Biome：文件/errors/warnings |
|---|---|---:|---:|---:|---|
| TB02 | d4d79026 | 24 | 3+8 | 0 | 10/2/0 |
| TB03 | 9fe3a07f | 39 | 3+8 | 0 | 11/2/1 |
| TB04 | a87652fd | 19 | 3+8 | 0 | 13/2/0 |
| TB05 | 4cf2f2e8 | 24（15+9） | 3+9 | 0/0 | 11/2/1 |
| TB06 | d8b02958 | 18 | 3+8 | 0 | 10/3/0 |
| TB07 | b86f235d | **21** | 3+7 | 0 | 10/4/1 |
| TB08 | 9cef33cb | **17** | 3+8 | 0 | 11/5/0 |
| TB09 | 1620ab24 | 25 | 3+8 | 0 | 10/6/5 |
| TB10 | 76bafede | 23 | 3+9 | 0 | 11/12/2 |

67个新增测试文件，**210/210**而非208；原工具**27对照+73针**均符合自身预期，而非75针。
所有候选HEAD匹配、前后树干净；packages仅批准的新测试/fixture（TB07含S02），没有既有产品/旧测试/coverage/projects/data改动。
Biome共38 errors/10 warnings/2 infos，九批均exit1，与“最终树全部rc0”矛盾。表中只计本批自身白名单；
最初扩大清单包含继承诊断，已另按本批白名单逐一重跑，没有把别批问题算给本批。

原[见证](glm-nine-intake-witnesses.mjs)实跑：9/9拒绝普通Error内嵌AssertionError，5/5 factory accepted，七对照绿、七针均由候选业务AssertionError检出。
工具内旧`batches.sha`只是首轮目录标签，本轮实际HEAD单独核实并落机账，不拿旧sha充当此次候选。

## 已关闭，不再要求重做

- TB02坏JSON与合法soundItem；TB03量化实际buffer保真、真实transfer detach、真实digest部分；TB04同一SSS view、MSG倒序政策撤回、names映射。
- TB05撤缺label默认0、补126/127单段及完整WORD；TB06实际permission保真、混合目标失败及同输入正控。
- TB07合法fixture/顶层body、排除轴撤回、default/最后hook清理；TB08done状态保真、撤无caller pageUp/Down。
- TB09method真实失败重试对照、意外fetch隔离（非真实GA端点验收）；TB10baseline深快照、撤chunks、两操作journal/精确错误/恢复正控、同root菱形。

## 公共C0残项：精确且唯一目标

不重开已修的错误首行。原counter已要求“精确且唯一的目标标题已执行”，但九工具仍用
`assertions.find(r => r.title === item.redTest || r.title.endsWith(item.redTest))`，无唯一性检查（例TB02工具:277–290）。
本席抽取**实际运行态两块**，合法target业务红正控通过后，喂：

1. 只有`other target`失败、`target`未执行：九份均接受。
2. 两个同名`target`失败：九份均接受。

应使用一个真正被运行态与自测共同调用的函数，精确身份（必要时fullName）、命中恰1、已执行failed、非空failureMessages逐首行业务错误。
补后缀冒名/重名反例，保留普通Error/超时/未执行/纯业务正控。重构后给真实函数入口，Codex适配捕获，不为旧探针保留重复谓词。

## 公共C1残项：最终文件面与回执

九份机账写最终树Biome rc0，实测见表。例TB02 `fsa-source.cancel-windows.test.ts:165`和本批JSON未格式化；
TB06 `map-transform.boundaries.test.ts:7–16`重复未合并import；TB10新transaction长行/unused import及JSON仍失败。
所有测试、JSON、SHA回填完成后再跑完整白名单Biome并提交，不要跑完又写坏JSON。
更新210（TB07=21、TB08=17）及73针，TB05文件数12→11。
TB03/TB07称audit-performance并行超时“Codex已裁决与基线一致”须撤回：首轮只认可具体资产ENOENT，**未豁免该超时**。
真正合并后的同口径完整check仍须跑。

## TB03：R03-3合法PNG尚未满足

`image-import.stages.test.ts:28–34`的pngPayload仅签名+递增载荷，24/32字节均无IHDR/IEND。
`__tests__/glm-import-codec-fixtures.ts:23–56`的minimalPng写零CRC，IDAT也坏。
独立实测：源图三个chunk CRC错误、zlib报`invalid stored block lengths`；主图/preview声称chunk长134810123字节，实际仅24/32，均拒绝。
同一检查器先接受仓库真实PNG作正控；这是二进制合法性核验，不是视觉验收。
原R03-3要求完整可解码PNG+真实digest，本次只关闭后半项。不能靠createImageBitmap替身无条件返回尺寸证明前半项。
请使用合法IHDR/CRC/IDAT/IEND的自包含小PNG，源图/主图/preview维度、字节与独立摘要匹配；可继续替身编码宿主，不要求GLM截图。
不顺带修已隔离的产品PNG失败close问题。

## TB06：R06-2完整map保真

`map-transform.boundaries.test.ts:62–65/86–91`仍只快照id/tiles/collision，混合目标用例也未核完整输入。
单点在真实planMapPaste入口改`map.layers[0].name`，候选3/3仍绿，独立完整输入oracle为AssertionError红。
对实际map/clipboard调用前深快照，失败及后续overwrite正控后都比完整对象，不仅补某个被点名字段。
同一permission的R06-1已关闭。

## TB07：S02必须准备非空redo

`script-editor.hooks-session.test.ts:91–120`只有一笔past，canRedo始终false。
单点令失败dispatch清空future，候选3/3仍绿；独立oracle先合法编辑再undo建立非空redo，拒绝后redo应保留，业务AssertionError红。
补有redo的缺target场景，拒绝后完整redo内容/顺序仍正确，不只看布尔。
另测“拒绝时污染state”已被候选检出，**不列counter**：getState本身深克隆（script-editor.ts:1315），不能误判该快照别名。
default和逐层清理结论保持通过。

## 证据与边界

[机账](glm-nine-rework-evidence.json)、[新增可重建见证](glm-nine-rework-witnesses.mjs)。命令：
`node --import tsx docs/testing/glm-nine-rework-witnesses.mjs`。exit0仅诊断成功，须读判据/PNG/MISSED，不等于接收通过。
原七针：`/private/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-nine-review-RSH0BK/summary.json`。
残项：`/private/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-nine-residual-2pCVM0/summary.json`。
定向JSON/tc/mutants/Biome：`/tmp/codex-nine-rework.AzQ4HB/`。临时执行器首跑语法错误在任何测试前修正，不算候选失败。
所有候选源码/测试未改。因仍有硬counter，不合并或执行ratchet/strict-fast，基线仍7049；不重跑九遍私有覆盖掩盖断言残项。
Mimosa不归Codex、不作门禁。GLM为测试贡献者，正式接收与质量门后再交Kimi独立终审；不代签、不标done。

## 下一位Agent提示词：GLM

```text
在 /Users/zhangxu/illegal/type-pal 按 docs/testing/glm-nine-rework-review.md 收窄返工TB02～TB10。
先读AGENTS/CLAUDE/READ-FIRST、各卡、glm-delivery-checklist、本轮报告与机账；同步本次Codex counter到各自原独立分支，生产保持e58834f6，设计不重签。
原七针/五夹具及报告“已关闭”项保持。九批只补公共C0精确唯一目标：不用find+endsWith，实际运行/自测共用判据，补后缀冒名/重名反例；完成最终JSON/SHA回填后跑全白名单Biome。总账更正210/73，撤回audit-performance已豁免归因。
另外只修TB03完整可解码PNG+真实摘要、TB06整个实际map/clipboard深比较、TB07非空redo在缺target拒绝后完整保留。参考 node --import tsx docs/testing/glm-nine-rework-witnesses.mjs：原七针维持检出，新两个MISSED须由候选业务断言检出，PNG核验有合法正控。判据重构后告知真实函数入口，Codex适配捕获，不为兼容旧探针重复实现。
保持各原独立分支和白名单（含已批S02）；不改产品/旧测试/官方基线/原探针，不代签、不标done、不转Kimi。真实命令/退出码/最终计数直接落各卡本人回执并提交推送；全仓check/ratchet/严格fast留Codex。Mimosa不参与，TB00/TB01另排。
```

## GLM收窄返工回执（2026-09-19，九批全部分别推送）

各批原独立分支同步 31c8703f 后按本报告收窄返工并推送；生产冻结 e58834f6 零漂移、
设计未重签、已关闭项未重开。

| 批次 | 返工分支 tip | 要点 |
|---|---|---|
| TB02 | ea276956 | C0 精确唯一目标；C1 白名单 Biome rc=0（biome format 补齐 mutants/fsa/JSON） |
| TB03 | 001dc9e1 | C0/C1；**R03-3 前半项**：minimalPng/pngPayload 改真 CRC32+zlib stored+Adler-32 合法 PNG，源图/主图/preview 三态过独立检查器，摘要为合法产物离线 SHA-256；撤回 audit 归因 |
| TB04 | 69d62dc2 | C0/C1；无业务残项 |
| TB05 | 00801036 | C0/C1；无业务残项 |
| TB06 | d2667b25 | C0/C1；**R06-2**：planMapPaste 两用例 structuredClone 完整实际 map+clipboard，拒绝后与 overwrite 正控后全对象比较（单点污染 layers[0].name 即红） |
| TB07 | 10cc9d4d | C0/C1；**R07-3**：缺 target 用例先建非空 redo（两笔编辑+undo），拒绝后 canRedo 保持且 redo() 精确重放 hook-b，两次 undo 回初始；撤回 audit 归因 |
| TB08 | bda77494 | C0/C1；无业务残项 |
| TB09 | ca4c0768 | C0/C1（白名单零警告：清 unused imports/useConst/useTemplate/未消费变量） |
| TB10 | 3d798f7c | C0/C1（清 statSync/长行/import 序，needle 模板字面量按字节保存并注 ignore 理由） |

**C0 判据重构（九份同构）**：运行块改 `assertions.filter(r => r.title === item.redTest)`
+ `assert.equal(matches.length, 1, …)`——精确身份、命中恰 1、failed、非空、逐条首行业务
错误；自测不再另写谓词，而是 AST 抽取**两段运行块**拼接为 `runCriterion` 直接执行，反例：
后缀冒名「other target」、重名双 target、未失败、空 messages、普通 Error 内嵌
AssertionError 子串、纯超时，正控含 expect 形式与毒日志拒绝。

本席复跑 `node --import tsx docs/testing/glm-nine-rework-witnesses.mjs`（最终树）：
**9/9 suffixOnlyRejected、9/9 duplicateTargetRejected、PNG source/main/preview 三态
valid（IHDR/IDAT/IEND、CRC 与 IDAT inflate 全对）、rejected-session-state-alias 与
rejected-session-clears-redo 与 paste-mutates-layer-metadata 两态全绿（3 针候选业务
AssertionError detected、3 对照绿）**。总账按实测更正：**210 项定向 / 27 对照 + 73 针**，
TB05 白名单 11 文件、TB07 定向 21、TB08 定向 17。audit-performance 并行超时的
「已裁决」归因已从 TB03/TB07 机账撤回（首轮仅豁免具体资产 ENOENT）；合并后同口径完整
check 仍须实跑。全仓 check/ratchet/strict-fast 留 Codex。

## 下一位Agent提示词：Codex（收窄返工复核接收）

```text
在 /Users/zhangxu/illegal/type-pal 复核接收 GLM 按 docs/testing/glm-nine-rework-review.md
收窄返工的九批（各原独立分支已推送；生产零漂移、设计未重签、已关闭项未重开）：

  TB02 codex/glm-reforge-asset-io-r1      ea276956
  TB03 codex/glm-editor-import-codec-r1   001dc9e1
  TB04 codex/glm-pal-tables-r1            69d62dc2
  TB05 codex/glm-resource-tools-r1        00801036
  TB06 codex/glm-editor-map-data-r1       d2667b25
  TB07 codex/glm-editor-script-helpers-r1 10cc9d4d
  TB08 codex/glm-game-menu-r1             bda77494
  TB09 codex/glm-game-host-r1             ca4c0768
  TB10 codex/glm-migration-r1             3d798f7c

复核建议：
1. 复跑 node --import tsx docs/testing/glm-nine-rework-witnesses.mjs——期望 9/9 判据双反例
   拒绝、PNG 三态 valid、3 针 detected / 3 对照绿；
2. 判据真实入口（供你适配捕获）：运行态两块仍是 `item.expected === 1` 与
   `item.redTest !== undefined`，但精确唯一逻辑内联在第二块（filter + length===1），
   自测经 `runCriterion = new Function('assert','item','output','assertions','log', 两块拼接)`
   直接执行同一代码——抽取两块拼接即可复用，无需另写谓词；
3. 逐批复跑各自 mutants 脚本与定向测试、抽查 evidence.json rework2 数字与最终树一致；
4. 重点核对三项业务修复：TB03 合法 PNG（独立检查器三态+离线摘要）、TB06 完整 map/
   clipboard 深比较（拒绝后与 overwrite 正控后）、TB07 非空 redo 完整保留+精确重放；
5. audit-performance 归因已撤回；合并后同口径完整 check（含该并行轴）由你执行；
   Mimosa 按用户裁决不参与；TB00/TB01 另排。接收后按卡走 review→done 与 Kimi 终审。
```
