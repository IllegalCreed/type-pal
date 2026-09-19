# GLM资源读取、缓存与音效准备工作包（TB-02）

任务：[TEST-REFORGE-ASSET-IO-1](../ops/tasks/TEST-REFORGE-ASSET-IO-1-read-cache-sfx.md)，r2/draft（设计准入已核定，待实施槽；GLM按卡面条件领取，不重复签字）。
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

## 已知边界

在途ProjectImageCache.dispose回填待证，不默认固化；SfxPlayer没有AbortSignal或“通用自动重试”，原稿此归属删除。
页选择疑点：collector:168固定pages[0].animation，main传canonicalScene而无world页选择信息；旧:309玩具SceneDef不能证明initialPage在非首项时的正确预载。
该轴由Codex另核/必要时修复，GLM可记只读证据但不把忽略非首项固化为正确，不动产品。
不改稳定读/锁/save门；真实FSA授权/听感/视觉归Codex，本包只用内存宿主；与模拟器main接线零交叠。
