# GLM资源读取、缓存与音效准备工作包（TB-02）

任务：[TEST-REFORGE-ASSET-IO-1](../ops/tasks/TEST-REFORGE-ASSET-IO-1-read-cache-sfx.md)，r1/draft（规划中，未获实施授权）。
生产核对点 `e58834f6389a40ffe9f187e6a8051f552e964d79`。GLM只写新测试；Codex独立接收、Kimi终审。
不听音、不做视觉、不改保存稳定读门/锁/恢复（SAVE 面归既有专项）、不碰技能试放接线。

## 冻结快照与既有去重（本人 2026-09-19 复核）

| 模块 | L | B | 既有测试（本人直读标题，先逐项去重） | 剩余族锚点 |
|---|---:|---:|---|---|
| audio/sfx.ts | 115/133 | 62/82 | sfx.test.ts×8：冷缓存/并发单读、失败重试+invalidate 旧结果不回填、不相交工作集串行、LRU+预算 fail-loud、无 adapter 前置 typed error、聚合 resource error、同号拒绝异号覆盖旧 ended、start 失败复位 | **B1** 读取/RIFF 头/解码/播放**分阶段**失败与同 reader 修复重试（现有"失败可重试"是整体失败轴，阶段未拆）；**B2** source 生命周期与字节复制（宿主拿到的是拷贝非 catalog buffer 别名）；**B3** RIFF 头解析分支（真 12 字节头结构轴，非 13 字节假流） |
| audio/sfx-readiness.ts | 161/162 | 106/132 | sfx-readiness.test.ts 已厚（集合递归/遗漏/取消/预算） | **B4** 上包指名的非战斗入口集合：当前合法树+共享脚本递归+additionalRoots/库存/当前页的**精确资源集合**断言（与 :783 collectSceneSoundAssets 调用域对齐；战斗闭包政策不在本批） |
| project-image-cache.ts | 23/26 | 4/8 | image-cache.test.ts:34 pending/decoded 命中期 kind 复验 | **B5** 工程身份隔离（不同 project 同 path 不串）；**B6** pending 复用与错误重试；**B7** dispose 后关闭与重读；在途 dispose 回填政策**未定——不固化现状为合同** |
| file-source.ts | 14/14 | 9/10 | file-source.test.ts:7/17/25 base 拼接/绝对路径拒绝/ArrayBuffer | **B8** 每个 await 前后取消窗口（进入见证非固定 sleep）、fetch/JSON 错误包装、urlFor 错误轴（行覆盖满但分支 9/10，只补真实缺口） |
| fsa-source.ts | 34/34 | 5/6 | fsa-source.test.ts×6 目录遍历/ArrayBuffer/urlFor 缓存+revoke/越界绝对路径拒绝/NotFound/已取消 AbortError | **B9** 取消窗口进入时序细化与 JSON 错误路径（B5/6 分母小，先核可达再定增删）；dispose 后二次 urlFor 行为依现行合同 |
| engine-chrome/registry.ts | 27/28 | 9/14 | registry.test.ts×3 | **B10** 槽位 promise 缓存与失败重试（loader :455/:461、menu-box:363 调用域）；仅资源身份与 IO，不验图标外观 |

调用锚点（本人直读）：main.ts:783 collectSceneSoundAssets、project-loader.ts:455/461 registry、
menu/menu-box.ts:363、editor open-local.ts:38 / load-play-project.ts:15（fsaSource 消费）。

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
- 异步全部 entered/deferred 或真实取消信号见证；宿主替身遵循 WebAudio 事务回调合同，只做窄替身
  （decode 仍走真 RIFF/PCM 结构轴），不拿 spy 次数替代最终业务状态。
- 覆盖对照：reforge fast 官方口径 before 只排本批 6 文件/after 加入；六模块局部+全包分栏、/tmp 输出、
  与上批十模块包重叠单列。
- 定向+相邻（既有 sfx/sfx-readiness/image-cache/file-source/fsa-source/registry 六测试文件）+
  reforge tc+全包+新增文件 Biome。完成条件：B1-B10 逐族落账，无固定条数。

## 已知边界

在途 dispose 回填、sfx AbortError 通用重试政策未定不固化；不改稳定读/锁/save 门；浏览器 FSA
真实目录句柄交互留 Codex（fsa 测试只用内存目录替身）；本批与技能试放/Codex main 接线零交叠。
