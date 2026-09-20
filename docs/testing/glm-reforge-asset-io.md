# GLM资源读取、缓存与音效准备工作包（TB-02）

## 当前Codex接收结论

2026-09-20候选ea276956：本批收窄counter全部闭合，已按白名单集成；当前review，待统一check/ratchet/严格fast后本席签accept。
定向24项/原负控/tc/Biome全绿。详见[当前独立接收](glm-nine-final-review.md)，旧counter仅留历史。

### 首轮接收结论（历史）

**counter**。定向24项/原3+8跑/tc通过，但仍有公共C0和本批业务返工；Biome完整面10文件/0 errors。详见[统一复核TB-02](glm-nine-intake-review.md#tb-02)。
本轮认可用户先行实施授权；不合并测试、不更官方基线、不转Kimi。下面GLM回执为候选自验原文，不能覆盖当前counter；生产零改只指已列新增测试/fixture之外，不能写整个packages diff为空。


任务：[TEST-REFORGE-ASSET-IO-1](../ops/tasks/TEST-REFORGE-ASSET-IO-1-read-cache-sfx.md)，r2/rework；本轮实施候选a7c48d9c未接收，设计不重签。
生产核对点 `e58834f6389a40ffe9f187e6a8051f552e964d79`。GLM只写新测试；Codex独立接收、Kimi终审。
不听音、不做视觉、不改保存稳定读门/锁/恢复（SAVE 面归既有专项）、不碰技能试放接线。

## 冻结快照与去重（r2：Codex直读当前合同并复跑六文件39项）

细节与可重建前提见[前三批设计收口](glm-coverage-queue-design-review.md)。r1把HTTP/FSA、音频标记门/宿主解码、首页/活动页混在一起，以下已纠正；不改变产品能力或测试六模块白名单。

| 模块 | L | B | 既有测试（本人直读标题，先逐项去重） | 剩余族锚点 |
|---|---:|---:|---|---|
| audio/sfx.ts | 115/133 | 62/82 | sfx.test.ts **12项**；:110已有decode失败重试，:198 read失败聚合及成功项可播，:245 play失败恢复，:259/284/299/311已有resume/dispose/旧prepare/错误上下文 | **B1** 先逐项去重，不宣称阶段从未拆；仅补独立未测错误/返回路径。**B2** 实际browserAdapter生命周期与bytes.slice复制（:63–85），注入自写adapter不享有该复制合同。**B3** assertWave只有≥12字节/RIFF/WAVE三轴（:90–94），不是PCM解析器 |
| audio/sfx-readiness.ts | 161/162 | 106/132 | :125递归去环/缺脚本，:146 additionalRoots+inventory完整集合，:187动作cue完整集合，:281缺复合引用；预算属于SfxPlayer，不能冒称此文件已测 | **B4** 当前合法命令/共享脚本/精灵的未测精确集合轴；不能把pages[0]等同当前活动页。main:774–789传canonicalScene且未传additionalRoots；公开helper可选additionalRoots另记接口覆盖，不计main新增路径。页选择政策单列待证 |
| project-image-cache.ts | 23/26 | 4/8 | project-image-cache.test.ts:34 pending/decoded命中期kind复验 | **B5** 工程身份隔离（不同project同path不串）；**B6** pending复用与错误重试；**B7** 已完成load后的dispose关闭与重读；在途回填政策待证、不固化 |
| file-source.ts | 14/14 | 9/10 | 既有**8项**；:44已有signal透传，:69/83有保存状态no-store及404/HTTP区别 | **B8** signal原样透传、网络/Response消费错误原身份、urlFor零IO；只补未测轴。HTTP不含逐await主动取消门，不能用忽略signal的fetch替身要求它自检abort，也不发明JSON错误包装 |
| fsa-source.ts | 34/34 | 5/6 | fsa-source.test.ts×6 目录遍历/ArrayBuffer/urlFor 缓存+revoke/越界绝对路径拒绝/NotFound/已取消 AbortError | **B9** 取消窗口进入时序细化与 JSON 错误路径（B5/6 分母小，先核可达再定增删）；dispose 后二次 urlFor 行为依现行合同 |
| engine-chrome/registry.ts | 27/28 | 9/14 | 3项；:24–40已测503后同slot成功 | **B10** pending共享/槽位隔离/blob失败/decode失败/非Error错误等独立余轴，不重复503例；模块缓存隔离，失败后同实例真实重试 |

调用锚点：main.ts:783 collectSceneSoundAssets；project-loader.ts:455为ProjectImageCache、:461为httpSource，
并非registry；registry真实caller为menu/menu-box.ts:363/main.ts:628。editor open-local.ts:38/load-play-project.ts:15消费fsaSource。

## 唯一新增白名单（均当前不存在）

```text
packages/reforge/src/audio/sfx.staged-failures.test.ts
packages/reforge/src/audio/sfx-readiness.collections.test.ts
packages/reforge/src/project-image-cache.lifecycle.test.ts
packages/reforge/src/file-source.cancel-windows.test.ts
packages/reforge/src/fsa-source.cancel-windows.test.ts
packages/reforge/src/engine-chrome/registry.lifecycle.test.ts
packages/reforge/src/__tests__/glm-asset-io-fixtures.ts
docs/testing/glm-reforge-asset-io-mutants.mjs
docs/testing/glm-reforge-asset-io.config.mts
docs/testing/glm-reforge-asset-io-evidence.json
```

## 负控与验收方案（草案，针数卡面定案）

- 整包≥6 针，每独立保护族≥1：候选针点——sfx 阶段化失败门/缓存回填门、image-cache kind 门/
  dispose 门、file/fsa 取消窗口门、registry 失败重试门。判据同队列标准（毒日志自测+钉名 JSON 见证）。
- 异步用entered/deferred或实际事件见证。B2用window.AudioContext/webkitAudioContext窄替身，让产品browserAdapter真实构造；观察connect/start/onended/stop与resume/decode/close，不是IDB式“事务”。用完整小WAV正控；decodeAudioData替身仅证明传参/错误/生命周期，不声称PCM解码或听感验证，不自制decoder代替产品。
- B3逐轴破坏长度/RIFF/WAVE标记，坏输入须在decode前拒绝；生产不检查的fmt/PCM细节不能凭标准发明一个新throw合同。
- B8只测HTTP真实透传/错误身份；B9才按FSA每个await门控，并证取消后后续IO没有开始。不能把两个宿主混用一个抽象取消oracle。
- B5/B6用真实AssetResolver及互不相同的工程字节；记录按实际bytes生成metadata，不能声称AssetResolver校验了SHA（当前只校kind/路径+读取）。缓存命中/失败重试必须有字节或结果身份和读取见证，不只看size或spy次数。
- B7只测全部load落定后的dispose；B10先隔离模块级cache再装宿主，所有pending落定后恢复globals，不让别例预热成功。
- 覆盖对照：reforge fast 官方口径 before 只排本批 6 文件/after 加入；六模块局部+全包分栏、/tmp 输出、
  与上批十模块包重叠单列。
- 定向+相邻（既有 sfx/sfx-readiness/image-cache/file-source/fsa-source/registry 六测试文件）+
  reforge tc+全包+新增文件 Biome。完成条件：B1-B10 逐族落账，无固定条数。

## GLM实施回执（候选历史自验；以当前Codex复核勘误为准）

r1 完成（2026-09-19，GLM，Coding Owner；基点 41cc7cd9，用户拍板在 Codex 额度空窗期先行实施，
接收与全仓门禁留 Codex）。分支 `codex/glm-reforge-asset-io-r1`（worktree
`/Users/zhangxu/illegal/type-pal-glm-asset-io`）；产品对冻结 e58834f6 零漂移。
最终树 **6 个新测试文件共 24 项**（Vitest 现场：5+5+6+3+3+2）；定向 24/24 绿；
reforge 全包 122 文件/1214 项 exit0；tc rc=0；9 新文件 Biome rc=0。

- 负控 `node docs/testing/glm-reforge-asset-io-mutants.mjs` rc=0：判据自测（good/毒日志/逐目标
  四向）+ 3 对照 + **8 变异针**（每组 ≥1）全部钉名新增测试 failed 且目标自身 failureMessages
  首行为 AssertionError；产品 hash 不变。
- 覆盖对照（官方 testSelection，/tmp）：sfx L+13/B+7、readiness L+1/B+1、
  project-image-cache L+2/B+2、registry B+1；全包 L7927→7943/14118、B5329→5340/11041。
- 待证保持：在途 dispose 回填、collector pages[0] vs world 活动页（r2 隔离，无绿测）。
- 未发现新产品缺陷。机器账 `docs/testing/glm-reforge-asset-io-evidence.json`。

## 已知边界

在途ProjectImageCache.dispose回填待证，不默认固化；SfxPlayer没有AbortSignal或“通用自动重试”，原稿此归属删除。
页选择疑点：collector:168固定pages[0].animation，main传canonicalScene而无world页选择信息；旧:309玩具SceneDef不能证明initialPage在非首项时的正确预载。
该轴由Codex另核/必要时修复，GLM可记只读证据但不把忽略非首项固化为正确，不动产品。
不改稳定读/锁/save门；真实FSA授权/听感/视觉归Codex，本包只用内存宿主；与模拟器main接线零交叠。

## GLM返工回执（r2，2026-09-19，针对 Codex 统一接收 counter）

基点合并 216cf3bb（九批接收复核文档）；生产对 e58834f6 零漂移不变。按
[glm-nine-intake-review.md](glm-nine-intake-review.md) 修：

- **C0**：mutants 判据改为每条 failureMessages **首行**匹配 `/^AssertionError(\b|:)|^expect\(/`
  （运行态 pin 块内联同形谓词；四向自测同函数新增「普通 Error 内嵌 AssertionError 子串」与
  「纯超时」两个拒绝反例）。复跑 3 对照 + 8 针全绿。
- **C1**：按 git 新增清单对全部 10 个新文件（含 JSON/config）跑 Biome rc=0 无错误无警告；
  回执与机账同步最终树数字。
- **R02-1**：`fsa-source.cancel-windows.test.ts` 坏 JSON 用例重写——text 真实返回 `'{bad'`，
  readText 原样成功、readJson 拒绝且错误名 `SyntaxError`（值形式）+ 完整 op 访问序。吞掉
  JSON 解析错误的单点现在被该用例检出。
- **R02-2**：`soundItem` 过正式 `validateItems`（use.effects=[healHp]、throw.effects=
  [applyPoison] 非空）；非战斗声音集合/页政策隔离语义不变。
- 复跑：定向 8/8、全包 122 文件/1214 项 exit0、tc rc=0、私有覆盖 before 1190 / after 1214
  双 exit0（数字从最终返工树生成）。机器账 `glm-reforge-asset-io-evidence.json` rework 节。

## GLM收窄返工回执（r3，2026-09-19，针对 Codex 返工复核 counter 31c8703f）

- **C0**：pinned 判据收紧为**精确且唯一目标**——`title` 全等 filter、命中恰 1（后缀冒名
  「other target」与重名双 target 均拒绝）、failed、非空、首行业务错误。运行态块与自测
  **共用**：AST 抽取 `item.expected===1` + `item.redTest!==undefined` 两块拼接执行，
  自测补后缀冒名/重名/未失败/空消息/普通Error内嵌/纯超时反例；不再有独立 pinnedVerdict。
- **C1**：全部内容回填后按 git 新增清单 10 文件完整白名单 Biome rc=0（含 JSON）。
- 复跑：3 对照 + 8 针全绿；glm-nine-rework-witnesses 9/9 判据双反例拒绝、3 针 detected。
- 计数更正按 Codex 实测：定向 24、原工具 3 对照 + 8 针（九批合计 210/27+73）。
