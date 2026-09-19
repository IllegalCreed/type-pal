# GLM编辑器导入、编码工作线程与视频元数据工作包（TB-03）

## 当前Codex接收结论

二轮候选9fe3a07f仍为**counter**，仅返[本轮报告](glm-nine-rework-review.md)的C0精确唯一目标、C1最终树格式/回执及所列本批残项。
原七针与五夹具已关闭；定向39项通过，本批Biome exit1。不重开已关闭项、不重签、不合并、不更新基线。

### 首轮接收结论（历史）

**counter**。定向39项/原3+8跑/tc通过，但仍有公共C0和本批业务返工；Biome完整面11文件/1 errors。详见[统一复核TB-03](glm-nine-intake-review.md#tb-03)。
本轮认可用户先行实施授权；不合并测试、不更官方基线、不转Kimi。下面GLM回执为候选自验原文，不能覆盖当前counter；生产零改只指已列新增测试/fixture之外，不能写整个packages diff为空。


任务：[TEST-EDITOR-IMPORT-CODEC-1](../ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md)，r2/rework；本轮实施候选f4c229ed未接收，设计不重签。
生产核对点 `e58834f6389a40ffe9f187e6a8051f552e964d79`。GLM只写新测试；Codex独立接收、Kimi终审。
合法二进制与真实编码链，非上传界面；上传选图竞态已修不重开；不做视觉/截图/听感。

## r2前提收口

见[前三批设计收口](glm-coverage-queue-design-review.md)及可重建只读探针。**只有TPFS是工程自定格式，ISO BMFF不是**；
格式背景见[W3C ISO BMFF说明](https://www.w3.org/TR/mse-byte-stream-format-isobmff/)。本包仅验证当前窄音轨探测器，不声称其能验证完整可播放MP4。
Worker宿主已由Codex零产品改动复验，固定使用现有handler+窄宿主协议方案，禁止为了测试新增handler导出。

## 冻结快照与去重（r2：四个既有直接文件6项复跑绿）

| 模块 | L | B | 既有测试（直读标题/计数） | 剩余族锚点 |
|---|---:|---:|---|---|
| core/image-import.ts | 33/88 | 9/42 | image-import.test.ts×2（最近色/同距色号/不透明 PNG 契约；拒非256色与坏 RGBA 长度） | **C1** PNG签名→宿主解码→尺寸/调色板→真实返回字节/摘要的已定合同；编码失败位图未释放已确认，隔离给Codex，不能固化错误绿测。**C2** palette分域与无资源泄漏的已实现拒绝轴 |
| core/battle-sprite-import.ts | 5/27 | 5/33 | 无测试文件 | **C3** battle profile 最少帧数、ID 冲突/同摘要、kind 与 metadata 单轴（BattleSpriteLibrary.tsx:1269 调用域） |
| core/frame-animation-images.ts | 2/28 | 0/19 | frame-animation-images.test.ts×1（自然文件名排序） | **C4** 保序/排序、空列表、MIME或扩展名允许、后续帧尺寸错误、已获取bitmap的finally收尾；FrameAnimationEditor:506才是decode入口，:593是encode |
| core/frame-animation-codec.ts | 33/35 | 19/27 | codec.test.ts×2（批量量化完整 RGBA8；旧帧引用重排+单帧替换重开逐像素一致） | **C5** sourceFrame 缺失/小数/越界、块复用、跨三块（TPFS 合法输入+真实重开；与既有两例去重后仅补缺） |
| core/frame-animation-worker-client.ts | 1/38 | 0/26 | 无同名直接测试，仍需查间接加载 | **C6** 请求ID/错误消息/缺结果、独立请求、正确terminate、transfer副本；FrameAnimationEditor:550量化/:593编码。不得制造terminate后宿主不可能正常投递，再要求产品处理 |
| core/frame-animation-codec.worker.ts | 0/13 | 0/6 | 无同名直接测试；官方include含worker，0/13不是被排除 | **C7** 隔离self后动态import真实worker，调用其注册的onmessage并走真实codec；只测试Node宿主协议，不声称浏览器线程调度已验收 |
| core/video-metadata.ts | 20/28 | 28/46 | video-metadata.test.ts×1（hdlr 区分音轨/纯视频） | **C8** 标准box的扩展长度/零长/截断/嵌套/meta，钉undefined/false/true三态，非法结构多为false而非throw；实际caller是CutsceneTab:232，:472/479/491属图片/量化/编码 |

调用锚点本人直读：ImageTab.tsx:525、BattleSpriteLibrary.tsx:1269、FrameAnimationEditor.tsx:506/550/593、
CutsceneTab.tsx:232/472（mp4HasAudioTrack/decodeFrameImages preserveOrder）。

## 唯一新增白名单（均当前不存在）

```text
packages/editor/src/core/image-import.stages.test.ts
packages/editor/src/core/battle-sprite-import.boundaries.test.ts
packages/editor/src/core/frame-animation-images.boundaries.test.ts
packages/editor/src/core/frame-animation-codec.tpfs.test.ts
packages/editor/src/core/frame-animation-worker-client.boundaries.test.ts
packages/editor/src/core/frame-animation-codec.worker.test.ts
packages/editor/src/core/video-metadata.boxes.test.ts
packages/editor/src/core/__tests__/glm-import-codec-fixtures.ts
docs/testing/glm-editor-import-codec-mutants.mjs
docs/testing/glm-editor-import-codec.config.mts
docs/testing/glm-editor-import-codec-evidence.json
```

## 负控与验收方案（草案，针数卡面定案）

- 整包≥6 针，每独立保护族≥1：候选针点——import 阶段门（签名/尺寸/调色板）、battle-sprite
  最少帧数/冲突门、images 保序/尺寸校验门、codec sourceFrame 门、worker 请求分派/terminate 门、
  video box 长度门。判据同队列标准。
- PNG用完整独立校验的图片、TPFS用真实容器与不同帧数据；BMFF只称“符合所测box结构的输入”，不称完整可播放视频。Canvas/ImageBitmap替身只验证数据交接/错误/生命周期，不是视觉验收。
- C6假Worker仅替宿主，postMessage真实执行structuredClone(message,{transfer})，证明传输副本已detach而实际调用者原source/frames字节完好；错ID携带不同内容，在正确ID到达前必须未完成。输出也走transfer，不能用不转移的浅拷贝替身自证。
- C7先stub独立self，再动态import实际worker捕获现有onmessage；分别走真实quantize/encode及错误，恢复全局描述符和模块缓存。禁止改产品导出、禁止mock整个worker/codec；真实浏览器Worker另归Codex。
- C3复用分支用真实RLE+真实SHA+单轴catalog变化；新输入已由正式Uploader编码/给frameCount，不能因helper未再次decode就发明它应自校完整新字节的合同。
- C5跨三块必须有真实解码轨迹/逐帧独立像素，而非只看成功；provider同源保证的frames[index]缺席不通过稀疏数组强刷。
- C1已确认缺陷：image-import.ts:130–142编码失败没有finally，合法320×200 PNG正控close=1、只让toBlob返回null后close=0。记录为Codex修复项；本包不得要求其默认测试绿、不得把不释放当正确，更不得顺手修生产。其余独立族可继续。
- 覆盖对照：editor fast 官方口径 before 只排本批 7 文件/after 加入；七模块局部+全包分栏、/tmp、
  与既有多包重叠单列。
- 定向+相邻（image-import/frame-animation-images/codec/video-metadata 既有测试+FrameAnimationEditor
  相关组件纯逻辑测试）+editor tc+全包+新增文件 Biome。完成条件：C1-C8 逐族落账。

## GLM实施回执（候选历史自验；以当前Codex复核勘误为准）

r1 完成（2026-09-19，GLM，Coding Owner；基点 41cc7cd9，用户拍板在 Codex 额度空窗期先行实施，
接收与全仓门禁留 Codex）。分支 `codex/glm-editor-import-codec-r1`（worktree
`/Users/zhangxu/illegal/type-pal-glm-import-codec`）；产品对冻结 e58834f6 零漂移
（`git diff e58834f6..HEAD -- packages/` 为空）。
最终树 **7 个新测试文件 + 1 fixture 共 39 项**（5+7+6+6+6+3+6）；定向 39/39 绿；
相邻既有 4 文件 6/6 绿；editor 全包 248 文件/2557 项中 3 项预存环境失败
（world-sprite-behavior.pal×2：worktree 缺未跟踪 PAL 迁移资产，基线同样失败；
audit-performance-adoption×1：全包并行负载下 15s 超时，隔离运行绿）——与本批无关；
官方 fast 口径 before 2359 / after 2398 双 exit0；tc rc=0；10 新文件 Biome rc=0。

- 负控 `node docs/testing/glm-import-codec-mutants.mjs` rc=0：判据自测（good/毒日志/逐目标四向）
  + 3 对照 + **8 变异针**全部钉名新增测试 failed 且目标自身 failureMessages 首行 AssertionError；
  产品 hash 不变。针点：PNG 签名门、battle-background 尺寸门、player 10 帧门、unique id 递增、
  块缓存逐出（DecompressionStream 计数见证：无缓存=5/容量1=5/容量2=4）、sourceFrame 越界门、
  worker-client 传输副本、meta content+4 偏移。
- 覆盖对照（官方 testSelection fast，/tmp，最终提交树重跑）：battle-sprite-import L5/27→27/27
  B5/33→33/33；codec L33/35→35/35 B19/27→23/27；codec.worker L0/13→13/13 B0/6→4/6；
  images L2/28→28/28 B0/19→18/19；worker-client L1/38→36/38 B0/26→20/26；
  image-import L33/88→84/88 B9/42→35/42；video-metadata L20/28→28/28 B28/46→37/46；
  全包 L22346→22503/27865、B19264→19376/27593、F6174→6206/8110。
- 合法 fixture 自足构造：PNG 真签名+IHDR/IDAT/IEND 结构、RLE 按 shared 容器规范、
  gzip 用 RFC1952+RFC1951 stored 块（不引 node:zlib，保持文件可 typecheck）、TPFS source 由产品
  encodeFrameAnimationRequest 自产（真实 deflate）、BMFF 按 ISO box 结构；假 Worker/双替身只替宿主。
- 保持原归属：PNG 编码失败位图泄漏（image-import.ts:130-142）仍归 Codex 修复，未写默认红、未固化。
- 机器账 `docs/testing/glm-import-codec-evidence.json`。

## 已知边界

上传选图竞态（EDITOR-SPRITE-PICK-1）已 done 不重开；界面布局/动画观感归 Codex；真实视频文件、
浏览器 worker 环境差异、CutsceneTab 视觉行为不在本批；不复活已退役 number-path 导入分支。

## GLM返工回执（r2，2026-09-19，针对 Codex 统一接收 counter）

基点合并 216cf3bb；生产零漂移不变。修：

- **C0**：mutants 判据改为每条 failureMessages **首行**匹配 `/^AssertionError(\b|:)|^expect\(/`；
  四向自测新增「普通 Error 内嵌 AssertionError 子串」「纯超时」拒绝反例。3 对照 + 8 针复跑全绿。
- **C1**：11 个新文件（含 JSON/config）Biome rc=0；机账/回执同步最终树数字。
- **R03-1**：quantize 实参保真——传实际 `input.buffer`、调用前快照、改输出后断言实际传入
  buffer 与调用前逐字节一致（`quantize-mutates-actual-input` 类单点即红）。
- **R03-2**：输出 transfer 双向真实——FakeWorker.reply 以 `structuredClone(data,{transfer})`
  回帖并断言 worker 侧原 bytes/frames 缓冲 detach（byteLength 0）、宿主克隆内容完好不别名；
  codec.worker 测试钉产品回帖原缓冲 byteLength 变 0（quantize/encode 两处）。
- **R03-3**：真实 digest——toBlob 返回确定性 PNG 签名+递增载荷、不再 stub digest；
  hash/record.sha256/record.bytes 与离线预计算 SHA-256 常量相等（独立 oracle），主图与
  preview 摘要可区分；portrait 直传域用 minimalPng(4,4) 预计算摘要。host 协议测试不称
  真实 PNG 解码/浏览器线程验收。
- 复跑：定向 20/20、全包 248 文件/2536 项（3 项预存裁决一致）、tc rc=0、私有覆盖
  before 2359 / after 2398 双 exit0。机器账 rework 节。
