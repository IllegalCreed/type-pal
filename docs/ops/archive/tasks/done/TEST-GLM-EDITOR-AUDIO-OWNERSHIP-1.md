# TEST-GLM-EDITOR-AUDIO-OWNERSHIP-1 — audio preview ownership contracts

Status: done
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: editor / audio preview ownership
Branch: `codex/glm-editor-audio-ownership-r1`
Visual Verification Timing: dev-functional

## 目标与范围

补齐 Editor 音频试听 ownership、停止、切换和资源清理的真实合同；不以覆盖率或例数作为本卡指标。只允许新增 `packages/editor/src/ui/` 测试、合法 fixture 和证据，重点范围为 `AudioAssetWorkbench.tsx`、`MusicTab.tsx`、`SoundTab.tsx`、`ProjectAudioPreviewButton.tsx` 的公开交互与 owner/session 生命周期。先对照既有 AudioAssetWorkbench、MusicTab、SoundTab、ProjectAudioPreviewButton 测试和已归档 Editor 卡排重。

## 硬约束与交付

真实 React caller、合法 typed asset/session 输入、业务 DOM/owner/session oracle；所有更新在 act 内，afterEach 清理 audio owner、object URL、listeners、session 并 unmount。禁止产品/旧测/配置/baseline/真实项目数据、强转、skip、ignore、扩大 timeout、私有 debug state、业务核心 mock。反控必须三态绿红绿，保存 raw/JSON/exit/执行集/三态 hash/清理证明；交付排重账、必要截图 hash、定向/相邻/typecheck/lint/docs/diff，覆盖率只记录到整体 main。

## 排重账（2026-10-05，GLM census）

既有覆盖（不再重复）：

- `core/audio-preview-session.test.ts` + `audio-preview-session.c09-g02.cursor-r1.test.ts`（10+1 例）：协调器全分支（claim 幂等/换主停旧/release/stop）。本卡不测模块本身。
- `ProjectAudioPreviewButton.test.tsx`：StrictMode 不提前 dispose、双按钮注入 transport 的接管（mock `.stop` 计数）、load 失败释放+alert、自然结束回 idle。
- `ProjectAudioPreviewButton.glm-leaf-wave.test.tsx`：idle→loading→playing→stopped 按钮 aria 三态与显式停止、自然结束后重播（第二次 load）。
- `AudioAssetWorkbench.test.tsx`：A→B→A inflight 中止恢复（仅 AbortError 轴）、亚秒端点渲染+播放 claim 停旧 owner+外部 claim 停 transport、删除期 live 引用复检。
- `AudioAssetWorkbench.kimi-workflows.test.tsx`（K07，真实 wrapper+真实 WAV transport+硬件端口）：播放抢占/被抢/暂停续播/自然结束所有权、seek 重建、播放中切选停旧源不销毁 transport、卸载 dispose（closeCalls=1）、MIDI 播放降级错误面（workbench 级）、导入/替换/删除全链。
- `AudioAssetWorkbench.glm-ui-wave.test.tsx` U3c、`c09-g05/g06/g07`：导入/替换/undo、时间格式、目录/删除 IO 轴、AudioContext resume。
- `MusicTab.c09-g03` / `SoundTab.c09-g04` 纯函数；`MusicTab.test.tsx` / `SoundTab.test.ts` 搜索与导入纯函数；`MusicPicker`/`SoundPicker` 选择器各自的 ownership（BgmPlayer/WAV 单钮路径）。

本卡缺口（新合同；输入全部来自真实公开 caller：SoundTab/MusicTab wrapper、PAPB 经 ProjectWorkbenchTab 的绑定值流、App.tsx:381 的 per-project reader 变化）：

| # | 轴 | 合同 | 不重复依据 |
|---|---|---|---|
| W1 | 停止/重复 | workbench 播放中点「停止」：真实源 stop+disconnect、时钟归零、回就绪、释放 owner（外部 claim 零源动作）、不 dispose、再播从 0 起 | 「停止」按钮在全仓测试中零点击；K07 只走外部 claim/pause/自然结束路径 |
| W2 | 失败 | 合法导入（RIFF/WAVE 魔数过 assertWave、深层非 PCM）真实解码失败 → 「读取失败」+错误 DsStatus | workbench 既有失败轴仅 AbortError 与 MIDI play 降级，非 abort 载入失败无覆盖 |
| W3 | 失败恢复 | 失败后切选健康资源恢复 loading→ready、错误清除、重新解码 | 同上（恢复路径零覆盖） |
| W4 | 切换/清理 | 播放中换工程（reader/session/projectId 变）：旧源停止、旧 context dispose、同字节跨工程重新解码（缓存隔离）、零提交 | K07 只测同工程切选；`analysisCache` 的 projectId 隔离零覆盖；App.tsx:381 memo 证明可达 |
| P1 | 接管 | 同页两个 PAPB 用默认真实工厂：A 播放→B 接管停 A 真实源、A 回 idle、A transport 不销毁 | 旧双按钮测试用注入 mock+`{} as never` reader，只证 mock `.stop`；真实 transport 被真实 session 停掉未证 |
| P2a | 切换/重复 | 同一挂载按钮 asset+cacheKey 变：stop+回 idle+不 dispose；再试听 load 新参数 | 绑定值切换（ProjectWorkbenchTab:577 真实流）零覆盖 |
| P2b | 切换/停止 | loading 中换绑定值：旧请求作废（放行后不置 playing、不调 play），再试听新资源成功 | 在途打断轴零覆盖（经 gatedFileSource 真实磁盘闸门） |
| P3 | 失败 | PAPB play 阶段失败（真实 MIDI 降级「当前浏览器不支持 MIDI 试听。」）：释放 owner、transport.stop、alert、回 idle；释放经 claim 后 stop 恰一次证实 | 旧 PAPB 失败轴仅 load 拒绝；play 拒绝零覆盖 |
| P4 | 清理 | PAPB 播放中卸载：transport.stop+释放+microtask dispose（closeCalls=1），卸载后外部 claim 零动作 | PAPB 的 dispose 链（transportLifecycleRef+token）无卸载见证；K07 只证 workbench 端 |

明确排除：workbench 播放器与 ProjectWorkbenchTab 的活体并存接管——DataMode 按 tab 互斥渲染（`if (tab === …) return`），两者不同时挂载，该输入形态不可达；跨页接管已由导航时 `stopEditorAudioPreview()`（ProjectWorkbenchTab:585）与各卸载清理合同覆盖。

## Build: 实现与自测

- Coding Owner: GLM（2026-10-05）
- 新增文件（不改产品/旧测/配置/baseline/真实项目数据）：
  - `packages/editor/src/ui/AudioAssetWorkbench.glm-audio-own.test.tsx`（W1-W4，经真实 SoundTab wrapper）
  - `packages/editor/src/ui/ProjectAudioPreviewButton.glm-audio-own.test.tsx`（P1-P4，真实默认工厂）
  - `docs/ops/tasks/evidence/TEST-GLM-EDITOR-AUDIO-OWNERSHIP-1/`（counterproof.json、run-counterproof.mjs、directed/adjacent raw、8 针红绿 raw）
- 输入真实性：正式 blank 项目（`loadLegalUiProject`，过保存门）+ 真实 `UpsertAssetCommand`/`authoredWaveRecord`/`authoredMidiRecord` 播种；transport 全部真实（默认工厂或「全委托记录包装」——只记录输入，行为 100% 委托真实 transport）；AudioContext 为 k07 硬件端口替身（decode 走 parseWavPcm16 真实解析）；W2 损坏 WAV 为过 assertWave 魔数但深层非 PCM 的合法 authored 输入；P2b 经 gatedFileSource 真实磁盘闸门。无强转、无 skip/ignore、无私有 debug state、未放宽任何 timeout。
- 清理纪律：afterEach 先在 act 内 unmount（卸载清理释放 owner、停 transport、dispose），再全局 `stopEditorAudioPreview()` 兜底（此顺序避免全局 stop 在 act 外触发 owner.stop 的 setState——本轮实际踩坑并修复）；P 组 afterEach 断言 object URL 创建/回收平衡（本域流零创建）；session 为内存对象随用随弃。
- 运行命令与结果（cwd=仓库根）：
  - 定向：`pnpm exec vitest run packages/editor/src/ui/ProjectAudioPreviewButton.glm-audio-own.test.tsx packages/editor/src/ui/AudioAssetWorkbench.glm-audio-own.test.tsx` → 2 files / 9 tests passed，0 act 警告，三连跑稳定。
  - 相邻（audio 域 20 文件：AudioAssetWorkbench 全家族、MusicTab/SoundTab 全家族、PAPB 既有两份、audio-preview(-session) 三份、MusicPicker×2、SoundPicker、ProjectWorkbenchTab、reforge midi-preview）→ 20 files / 152 tests passed。
  - `pnpm --filter @type-pal/editor typecheck` → passed。
  - `pnpm lint` → PASS，3325 files，0/0/0（零诊断硬门）。
  - `git diff --check` → passed。
- 反控三态（`run-counterproof.mjs` 完整重放，命令/cwd/node v22.23.2/pnpm 10.29.2 见 counterproof.json）：
  - 基线绿 9/9（sha256 见回执）；8 针全部 红(恰一指定 AssertionError、0 警告)→git 还原→绿(0 警告)；产品零残留（packages/ 无 M/D）。
  - 判例：workbench「停止时 release」无独立行为判别面（真实源 stop 幂等、外部可见结果相同），N1 改打 `transport.stop()` 移除（真实源不停/位置不归零）；P2b 的在途作废是 requestRef+release 双守卫，单删其一被另一守卫互补吸收不红，N5 按「防护整体失效」同时移除双守卫。
- 证据（docs/ops/tasks/evidence/TEST-GLM-EDITOR-AUDIO-OWNERSHIP-1/）：
  - `counterproof.json` — 基线/8 针三态 hash、firstFailure、执行集、产品零残留。
  - `directed.raw` sha256 `827ab58769d145eafc8b0aef465c409227946412d0439b79ee74bb876e3ac429`（9 passed）。
  - `adjacent.raw` sha256 `8322ec715f31ae5e0d34d534db1b1862f8409d29dd04203a1cb4dc0aae1e7cb6`（20 files / 152 passed）。
  - `mutation-logs/` — green-baseline + 8×(red/green) raw，均单终止换行。
- 覆盖率：本卡不以覆盖率/例数为指标，未跑 coverage，整体数字留待 main 级统一实测。

## 交接日志

- 2026-10-05 GLM（Coding Owner，build 交付）: 接手后先清理主仓残留的陈旧 cherry-pick
  序列（三提交内容已由同 patch-id 复制提交进入 main，`git cherry-pick --quit` 不动 HEAD），
  同步 main 到 f83ed41e9 取得本卡。完成排重账（9 组既有覆盖 vs 8+1 新合同缺口，含
  DataMode 页互斥导致「workbench×项目页活体并存」按不可达输入排除的判定），交付 W1-W4/P1-P4
  共 9 例定向测试（真实 wrapper/真实默认工厂/合法 typed 项目输入）、8 针反控三态全过、
  相邻 20 文件 152 例全绿、editor typecheck 0 错、全仓 lint 0/0/0、diff --check 通过。
  踩坑记录：afterEach 先全局 stop 再 unmount 会在 act 外触发 owner.stop 的 setState
  （警告栈可定位到 ProjectAudioPreviewButton.tsx:58）；P3 的 MIDI play 链在打开的 act
  作用域内冻结，需按房屋 settle-信号模式在 act 内 await 链自身信号；tee 落盘 raw 有
  EOF 双换行，须剥成单终止换行再 hash。未修改产品、旧测、配置、baseline 或真实项目数据；
  未标 done，等待 Codex 独立验收。
  Next: Codex 独立复核排重账、9 例合同、反控证据与质量门后决定收口或返工。

## Review: 返工记录

- 2026-10-05 Codex 返工指令（两门禁）：
  1. MusicTab.test.tsx 出现 AudioAssetPlayer state update 未包裹 act(...)。
  2. content-review strict 报 board.md / tasks/index.md after SHA drift。
- GLM 返工（r1 增量提交，基于 f83ed41e9 的最新 origin/main，无 rebase 需要——origin/main 未前进）：
  - **MusicTab act 警告**：根因是旧测试用裸 `vi.waitFor` 等待 MIDI 载入链，StrictMode 下两次
    setState 落在 act 外。修复 = beforeAll 经公开 `analyzeMidiBytes` 预热动态 import
    （spessasynth_core），渲染 act 内 25 拍微任务冲刷后同步断言；实测「waitFor 包进 act」
    会死等（与 P3 判例一致），不可用。MusicTab 单文件三连跑 1/1 零警告；定向三文件 10/10
    零警告。产品代码与既有断言（readBytes 恰一次、过滤计数、导入入口）零改动。
  - **SHA drift**：根因是 f83ed41e9 开卡提交改写了 board.md / tasks/index.md，而
    20261004-semantic-current-batch.json 钉的是旧 afterSha256。按 8494b465c 外科判例仅刷
    两个条目：afterSha256 / revision.implementationSha / evidence.afterSha256 三处同 pin
    同步 + revision.history 各追加一条 content-review-sha-refresh（2026-10-05），最终 diff
    18+/6-，未触碰任何其它任务文档（json.dumps 全量重排方案已否决——会重排数百行）。
  - 全门禁重跑（最终树）：定向 10/10 零警告（directed.raw d689ee9a…）；反控 8 针三态重放
    全过（counterproof.json 随最终树再生成）；相邻 19 文件 151/151（adjacent.raw 984f98c4…；
    旧文件自身的 act 警告为 main 既有存量，不在本卡返工范围）；editor typecheck 0 错；
    `pnpm lint` 0/0/0；`pnpm check:docs` PASS；`check-content-review.mjs --strict` PASS；
    `git diff --check` PASS。未标 done。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-EDITOR-AUDIO-OWNERSHIP-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡和已归档 Editor 卡；只在 codex/glm-editor-audio-ownership-r1 工作。先对 AudioAssetWorkbench、MusicTab、SoundTab、ProjectAudioPreviewButton 的旧 fullName/caller/input/oracle 排重，再补 owner 接管、重复试听、停止、切换、失败和清理合同。所有 React 更新在 act 内，严格清理 audio owner/object URL/listener/session；禁止产品/旧测/配置/baseline/真实数据、强转、skip、ignore、扩大 timeout、私有 debug state、业务核心 mock。反控须三态绿红绿并保存完整证据。交付定向/相邻测试、typecheck、lint 0/0/0、docs、diff 和完整 SHA；不得把覆盖率或例数当完成条件，不得标 done。
```

---

## Codex quality closure (2026-10-05)

候选 `1ff99d10ad059c2ad4db33c521e1e8f98b919c6b` 已独立验收：13/13 测试、8/8 反控、act 警告已清零、typecheck、lint 0/0/0、docs、phase/lore、content review、diff 全通过。本卡已集成 main，原候选分支进入退休清理。
