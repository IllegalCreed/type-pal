# TEST-GLM-EDITOR-ASSET-LIFECYCLE-1 — asset lifecycle and sprite action contracts

Status: done
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: editor / asset lifecycle
Branch: `codex/glm-editor-asset-lifecycle-r1`
Visual Verification Timing: dev-functional

## 目标

补齐 Editor 资源生命周期与精灵动作作者流程中尚未被旧测证明的真实合同，重点覆盖选择、替换、删除、撤销和资源回收；不以覆盖率或新增例数作为本卡指标。

## 独占范围

只允许新增 `packages/editor/src/ui/` 本卡测试、合法 fixture 和证据：

- `MediaAssetLifecycle.tsx`：object URL 创建/替换/卸载回收、stale asset、失败后恢复；
- `AssetInspectorTabs.tsx` / `ImageAssetPicker.tsx`：资源选择回落、缺失资源提示、取消与确认后的 session/oracle；
- `SpriteActionEditor.tsx` / `SpriteActionEditorDialog.tsx` / `BattleSpriteUploader.tsx`：动作列表增删改、非法帧/重复 id 拒绝、上传取消和 undo；
- 只做最小功能性 UI 证据，不走剧情 E2E。

先对照现有 AssetInspectorTabs、MediaAssetLifecycle、ImageAssetPicker、SpriteActionEditor、SpriteActionEditorDialog、BattleSpriteUploader 测试以及已归档 Editor authoring 卡排重。

## 硬约束与交付

- 每条合同必须有真实组件 caller、合法 typed project/asset 输入、session/serialization/DOM 业务 oracle 和唯一 fullName。
- 所有 React 更新在 act 内；afterEach 清理 object URL、listeners、session、临时文件并 unmount。
- 禁止修改产品、旧测、配置、baseline、真实项目数据；禁止强转、skip、ignore、扩大 timeout、私有 debug state 或业务核心 mock。
- 反控必须原始绿→指定业务红→恢复绿，保存 raw/JSON/exit/执行集/三态 hash 和清理证明。
- 交付排重账、identity、必要截图 hash、定向/相邻/typecheck/lint/docs/diff 结果；覆盖率只记录到整体 main。

## 当前模式推进记录

- Codex 范围/前提核验: verified
- Coding Owner / 隔离分支: GLM / `codex/glm-editor-asset-lifecycle-r1`
- build 准入: Codex build allowed
- Codex 独立验收: pending
- done 准入: blocked

## GLM r1 交付（2026-10-04）

Status: review（GLM 自验完成，等待 Codex 独立验收；未标 done）。
分支 `codex/glm-editor-asset-lifecycle-r1` = origin/main(a2857c123) + 单交付提交；隔离工作树
`/private/tmp/type-pal-glm-asset-lifecycle`（真 pnpm install，非符号链接——vite fs.allow 拒绝跨仓解析）。

### 排重账（先排重，后补合同）

范围澄清：`AssetInspectorTabs.tsx` 从未作为组件存在；卡内该名对应 `AssetInspectorTabs.test.tsx`
覆盖的检查器 Tab 家族（ImageTab/MusicTab/SoundTab/CutsceneTab）。卡面"object URL 生命周期"实际
载体是 `ImageAssetPicker.tsx` 的 `ImageAssetThumbnail`（MediaAssetLifecycle.tsx 只含名称字段与确认弹窗）。

| 卡面行为 | 旧测已证（锚点） | 结论 |
|---|---|---|
| MediaAssetNameField Enter/blur/Escape/等值零命令 | MediaAssetLifecycle.test.tsx 三例 | 已证，不补 |
| MediaAssetConfirmDialog 经真实 caller 的 unknown 计数/busy/disabled/取消 | ImageTab.test.tsx:182、AudioAssetWorkbench.kimi(aria-busy/处理中)、CutsceneTab.kimi(删除禁用) | 已证，不补 |
| BattleSpriteUploader 解码/缺省猜测/整除失败/色盘迟到与失败/应用锁/坏文件/重选清错/取消零提交/onApply 拒绝 | BattleSpriteUploader.glm-next-wave 2 例 + c03-g05 10 例 | 饱和，不补 |
| SpriteActionEditor 增删改/重排/循环/步骤/音效 cue/引用阻断/undo | K03 六例 + SpriteActionEditor.test 四例 + C05-G04/G05 | 饱和，不补 |
| SpriteActionEditorDialog 创建/放弃/漂移/Cmd+S/重复 id 拒绝(G06-07)/非法拖拽/草稿门 | Dialog.test 21 例 + glm-l 2 例 + C05-G06 9 例 | 饱和，不补 |
| 缩略图 object URL 替换失效（revision 轴）/在途 stale/失败恢复 | leaf-wave 只证单 URL+卸载回收与永久缺失错误 | **缺口 1–3** |
| 战场背景缩略图项目标准色重染/无色盘透传/索引与尺寸违例 | 无任何测试触达 thumbnailBlob 色盘分支 | **缺口 4** |
| 音乐/音效/过场检查器缺失或异类焦点回落 | ImageTab 缺失面板已证(kimi:402)；Audio 家族缺失面板与 Cutscene 回落无测试 | **缺口 5–6** |
| 数据级越界帧（资产替换后遗留 step.frame≥帧数） | 全部旧测用帧号合法数据；命令层越界拒绝另有 core 测试 | **缺口 7** |

### 新合同（8 例，全部真实组件 caller + 合法 typed 输入 + session/序列化/DOM 业务 oracle）

| # | fullName（文件内唯一） | oracle |
|---|---|---|
| 1 | ImageAssetPicker.glm-asset-lifecycle: 同 AssetId 替换：revision 变化令旧 URL 回收、新 URL 重建，卸载回收最终 URL | 真实 UpsertAssetCommand 替换（含 previousBytes）→ URL 端口记录：新 URL≠旧 URL、旧 URL 已 revoke、卸载 revoke 最终 URL、两 URL blob 字节=两次输入 |
| 2 | 同文件: 在途 stale：读取未完成即切走，迟到的旧读取不建 URL、不串显 | gated FileSource 双闸：B 放行显 B；A 迟到完成后 createdUrls 恒=[B]、img 不被覆盖、卸载只 revoke B |
| 3 | 同文件: 失败后恢复：读取失败只显错误芯片；同 id 真实 upsert 后错误态恢复为图片 | 拒绝读端口→错误芯片含错误身份、零 URL；UpsertAssetCommand 落 pending blob 后（revision 变化）img 重建且芯片消失 |
| 4 | 同文件: 带色盘：真实重染为项目标准色像素；无色盘：透传原始索引字节 | 真实 PNG 编码→组件重染→捕获 blob 真实解码：四角像素=色盘色、重染产物≠原字节；无色盘分支 blob=原字节逐字节 |
| 5 | 同文件: 索引违例与尺寸违例：精确拒绝文案且不产生 object URL | 精确错误文案 + createdUrls 长度 0 |
| 6 | AssetInspectorTabs.glm-asset-lifecycle: 音乐/音效检查器缺失焦点：缺失面板不跳资源，焦点恢复后选择重建，全程零命令 | 正式 loader+真实 upsert 播种：缺失面板文案、hero 为空、恢复后 hero=目标资源、history 只含播种 |
| 7 | 同文件: 过场检查器异类焦点回落首项视频；焦点切到合法视频后选择跟随，零命令 | 异类焦点 hero=首视频且不显示异类 id；焦点切换 hero 跟随；history 不变 |
| 8 | SpriteActionEditor.glm-asset-lifecycle: 越界帧步骤渲染占位不吞步骤；重命名与追加合法帧仍真实提交且可撤销 | 会话级通用命令播种帧 5（帧数 3）：步骤行显示 帧 #0/帧 #5+双占位画布；重命名/追加经真实 UpdateSpriteCommand 提交且 undo 对称、越界步骤不被静默丢弃 |

React 更新全部在 act 内；afterEach unmount + 还原 URL 端口 + unstubAllGlobals/restoreAllMocks +
host.remove（gated/拒绝端口为测试内 FileSource 夹具，非产品 mock）。无强转（唯一历史遗留形态
`reader as never` 已通过真实 createEditorAssetReader/正式 assetBase 消除）、无 skip/ignore、
未扩大任何 timeout（stale 冲刷为 20ms 宏任务 tick，属用例内时序非门槛放宽）。

### 反控三态（7 针：基线绿 → 指定业务红 → 还原绿）

证据：`evidence/TEST-GLM-EDITOR-ASSET-LIFECYCLE-1/counterproof.json`（含逐针 mutation 描述、
raw 文件、三态 sha256、失败首行）与 `mutation-logs/*.raw`（exit 码在文件尾）。

| 针 | 产品变异 | 业务红首证 |
|---|---|---|
| N1 | ImageAssetPicker effect 依赖移除 props.revision | 替换后 img src 不变（urlA===urlA） |
| N2 | then 回调两处 alive 守卫全删 | 陈旧读取建出第二个 URL |
| N3 | catch 不再 setError | 错误芯片缺失（读取失败被吞） |
| N4 | 重染循环不写色盘色 | 像素=[0,0,0,255]≠[255,0,0,255] |
| N5 | Audio 家族 selected 回落+hero 两处缺失焦点守卫删 | 缺失焦点下渲染出 hero（跳资源） |
| N6 | Cutscene 初始 kind 检查+无效选择兜底重置删 | hero undefined（异类焦点未回落） |
| N7 | SpriteActionEditor 帧查表去可选链 | 越界帧渲染即 TypeError 崩溃 |

N2/N5/N6 首针未红的原因已核：alive 守卫与 hero JSX 守卫各自独立拦截、Cutscene 另有兜底重置效应；
终版针为"防护整体失效"形态，均在恢复绿后 `git diff` 归零。7 针全过且产品树最终零改动。

### 门禁与证据

- 定向+相邻 18 文件 122/122 绿（8 新 + 114 相邻）：`directed-adjacent.raw`；editor 全包串行：`editor-full-serial.raw`
  = 613 文件 4878/4879，唯一失败 `src/core/project-reference.pal.test.ts`（PAL 引用普查 22666≠22663）。
  已在主仓 main（与本卡零关的干净树）复现同一失败，属 main 既有问题，本卡不越界处理，仅在此申报。
- typecheck（editor 双 tsconfig）0 诊断；Biome 对本卡 3 测试文件 + counterproof.json 0/0/0；
  全仓 lint/docs 门以 Codex 验收时点为准（本卡未越界改共享文件）。
- 视觉走证：战场背景重染为像素级真实解码断言（N4 同轴反控），未起 dev server 截图；如需 6010
  实机截图由 Codex 验收时定。
- `git diff --check` 干净；未改产品/旧测/配置/baseline/真实项目数据。

## GLM r2 返工（2026-10-04，响应 Codex 验收拒收：act 警告）

r1（c60efe6bb）被拒收的唯一问题：`ImageAssetPicker.glm-asset-lifecycle.test.tsx` 产生 React
`not wrapped in act(...)` 警告。根因与修复（未改产品、未关警告、未扩大 timeout）：

- **根因**：ImageAssetThumbnail 的异步链经 node-canvas `createImageBitmap`/`canvas.toBlob` 等
  宏任务推进，`setUrl/setError` 可落在 render act 关闭之后；r1 用 act 外 `vi.waitFor` 轮询，
  更新在轮询间隙发生即触发警告。
- **修复（两段式 act + 端口观察点）**：在既有端口桩上加事件信号——`URL.createObjectURL`
  桩按调用序号 resolve 信号（非 mock，URL 逻辑照常）、`createImageBitmap` 包装 kit 真实解码
  端口并在解码完成时落信号（oracle 解码直接用真实端口引用，不消耗组件链信号）。每个用例改为
  渲染 act（启动 effect 链）→ 信号 act（保持打开直到链到达 settle 点，setUrl/setError 落在
  act 内）。信号带 1s 有界竞速：链未按预期到达时以明确错误失败而非悬挂（不是 testTimeout
  放宽）。纯微任务失败链用 act 内宏任务节拍排空。React 19 异步 act 的 passive effect 在回调
  结束后才冲——信号不能在渲染 act 回调内 await（会死锁），必须分两段。
- **附带修复**：AssetInspectorTabs.glm-asset-lifecycle 音乐恢复阶段原断言"任意 `[role=alert]`
  为 null"与播放器异步解码错误面板竞态（伪 MIDI 字节解码失败是无关 DOM）；改为断言缺失焦点
  文案消失 + hero 重建，不再约束无关播放器提示。

### r2 门禁与证据（全部重跑）

- 三文件定向 8/8 绿，`not wrapped in act` 警告 **0**（连跑三遍稳定）；7 针 raw 与基线 raw 内
  警告亦为 0（counterproof.json 逐文件记录 actWarnings 计数）。
- 定向+相邻 18 文件 122/122 绿：`directed-adjacent.raw`。其中 271 个 act 警告**全部**来自旧
  kimi/cursor 测（ImageTab.kimi 140 / CutsceneTab.kimi 66 / AudioAssetWorkbench.kimi 58 /
  BattleSpriteUploader c03+glm-next 7），与 r1 全包基线一致，属 main 既有，本卡不越界改旧测。
- 7 针反控按最终测试文件重放全过（run-counterproof.mjs）：N1 红现为有界信号错误
  “缩略图链未创建第 2 个 object URL”（revision 依赖被删→替换不重建的直接业务证据），N2–N7
  红仍为原业务断言；每针红后产品树 porcelain 零残留（排除本卡三测试文件）。
- typecheck（editor 双 tsconfig）0；本卡 3 测试文件 + counterproof.json + run-counterproof.mjs
  Biome 0/0/0；check:docs 0；`git diff` 范围检查 0。
- editor 全包串行证据沿用 r1 的 `editor-full-serial.raw`（4878/4879，唯一失败为 main 既有 PAL
  普查，已申报）；r2 改动仅限本卡测试文件与证据，不触产品面。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-EDITOR-ASSET-LIFECYCLE-1 的 Coding Owner（GLM）。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡和已归档 Editor authoring 卡。
在 codex/glm-editor-asset-lifecycle-r1 隔离工作树中，对 MediaAssetLifecycle、AssetInspectorTabs、ImageAssetPicker、SpriteActionEditor、SpriteActionEditorDialog、BattleSpriteUploader 的旧 fullName、caller、合法输入和业务 oracle 排重，再实现未证明的资源生命周期合同。
只写本卡白名单的新测试、合法 fixture 和证据；不得改产品、旧测、配置、baseline、真实项目数据或其它卡目录。
所有 React 更新在 act 内，严格清理 object URL/listener/session；禁止强转、skip、ignore、扩大 timeout、私有 debug state 或业务核心 mock。
反控必须原始绿→指定业务红→恢复绿并保存 raw/JSON/exit/执行集/三态 hash/清理证明。
交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。
覆盖率与测试数量不是本卡完成条件；不得标 done，等待 Codex 独立验收。
```

---

## Codex quality closure (2026-10-04)

候选 `b6306b0af54719bb0aac658b3cab3f3d91d6fc6d` 已独立验收：8/8 合同、7/7 反控、typecheck、lint 0/0/0、docs、diff 全通过；act 警告已清零。本卡测试包已集成 main，原候选分支进入退休清理。
