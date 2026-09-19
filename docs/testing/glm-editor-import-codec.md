# GLM编辑器导入、编码工作线程与视频元数据工作包（TB-03）

任务：[TEST-EDITOR-IMPORT-CODEC-1](../ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md)，r1/draft（规划中，未获实施授权）。
生产核对点 `e58834f6389a40ffe9f187e6a8051f552e964d79`。GLM只写新测试；Codex独立接收、Kimi终审。
合法二进制与真实编码链，非上传界面；上传选图竞态已修不重开；不做视觉/截图/听感。

## 冻结快照与既有去重（本人 2026-09-19 复核）

| 模块 | L | B | 既有测试（直读标题/计数） | 剩余族锚点 |
|---|---:|---:|---|---|
| core/image-import.ts | 33/88 | 9/42 | image-import.test.ts×2（最近色/同距色号/不透明 PNG 契约；拒非256色与坏 RGBA 长度） | **C1** PNG 签名→解码→尺寸/调色板→catalog 字段/字节摘要各阶段失败与释放（ImageTab.tsx:525 prepareAuthoredImage 调用域）；**C2** 调色板缺省/提供的分域 |
| core/battle-sprite-import.ts | 5/27 | 5/33 | 无测试文件 | **C3** battle profile 最少帧数、ID 冲突/同摘要、kind 与 metadata 单轴（BattleSpriteLibrary.tsx:1269 调用域） |
| core/frame-animation-images.ts | 2/28 | 0/19 | frame-animation-images.test.ts×1（自然文件名排序） | **C4** 多图片保序/排序翻转、空列表拒绝、MIME/扩展名轴、第二帧尺寸错误、读取或 bitmap 失败收尾（FrameAnimationEditor.tsx:506/:593 decodeFrameImages） |
| core/frame-animation-codec.ts | 33/35 | 19/27 | codec.test.ts×2（批量量化完整 RGBA8；旧帧引用重排+单帧替换重开逐像素一致） | **C5** sourceFrame 缺失/小数/越界、块复用、跨三块（TPFS 合法输入+真实重开；与既有两例去重后仅补缺） |
| core/frame-animation-worker-client.ts | 1/38 | 0/26 | 无 | **C6** 请求 ID 分派、失败消息/缺结果拒绝、terminate 后行为、并发独立请求、transfer 拷贝非共享 buffer（FrameAnimationEditor.tsx:550 quantize/:593 encode 调用域） |
| core/frame-animation-codec.worker.ts | 0/13 | 0/6 | 无（fast 排除 worker？台账 L0/13） | **C7** worker 入口真实 handler 调纯 codec（Node 环境 worker_threads 或直调 handler 模块，定案时核测试宿主可行性）；不 mock 掉整个被测模块 |
| core/video-metadata.ts | 20/28 | 28/46 | video-metadata.test.ts×1（hdlr 区分音轨/纯视频） | **C8** BMFF 64 位扩展长度、零长度 box、截断/边界、嵌套 hdlr 与 meta 偏移（CutsceneTab.tsx:232/:472/:479/:491 调用域）；独立构造合法最小输入不依赖真实视频 |

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
- fixture 合法性：PNG/TPFS/BMFF 全部独立构造合法最小输入（真实结构，非 13 字节假流），过对应
  解析器后再进反例；worker 测试若宿主不支持真 worker，定案时改直调 handler 导出并登记取舍。
- 覆盖对照：editor fast 官方口径 before 只排本批 7 文件/after 加入；七模块局部+全包分栏、/tmp、
  与既有多包重叠单列。
- 定向+相邻（image-import/frame-animation-images/codec/video-metadata 既有测试+FrameAnimationEditor
  相关组件纯逻辑测试）+editor tc+全包+新增文件 Biome。完成条件：C1-C8 逐族落账。

## 已知边界

上传选图竞态（EDITOR-SPRITE-PICK-1）已 done 不重开；界面布局/动画观感归 Codex；真实视频文件、
浏览器 worker 环境差异、CutsceneTab 视觉行为不在本批；不复活已退役 number-path 导入分支。
