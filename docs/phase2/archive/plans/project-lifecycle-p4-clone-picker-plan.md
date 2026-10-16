# P4 · 新建 / 打开本地 / 启动屏 / 种子克隆 实现计划

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: plan-status-v1 / 1.0.0

本页把历史实施计划接入 `plan-status-v1`，并追加 `archive-record-v1` 历史 overlay。原计划的日期、checkbox、执行分工、数字、结果词、未知和链接均在 quote 中保全；本页不授予当前待办、runtime、E2E、视觉或 coverage 信用。

## 目标与时间范围

- 历史目标：P4 seed 枚举/manifest 相对化、PAL 克隆/空白骨架、本地打开、无地图容忍、ProjectPicker 启动屏和全链验收。
- 原始时间范围：2026-09-06；固定 source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，source SHA `0ca080e549d63812ed78932e86f0e5df553d5ac4cd1a720c465234e6acbf7983`。
- 当前时间状态：历史归档；本页只说明当时计划的目的和边界，不续写执行期限。

## 里程碑

- 原始章节/里程碑：Global Constraints；Task 1: seed 枚举 + manifest 相对化(纯核)；Task 2: 克隆编排 + 空白骨架；Task 3: 打开本地(fsaSource → EditorState)；Task 4: 编辑器容忍无地图场景(空白项目渲染)；Task 5: ProjectPicker 启动屏 + main.tsx 接线（Claude 视觉）；Task 6: 全链验收；Self-Review(已过)。
- 计划步骤、Task 编号、分工和 checkbox 的原始含义均保留在下方 quote；它们不构成今天的 build 准入。
- 本次治理里程碑：完成具体语义分栏、历史 overlay、源/after SHA 和继任入口登记。

## 当前状态

- 当前文档状态：`historical` / `archive`；正文状态信号：1:> **历史文档（2026-09-06 标注）**：本文是已完成的 TDD 计划/设计存档，正文中的执行；2:> 指令、Agent 分工与“当前状态”是当时快照，不是现行待办。实现结果以 capability-map 与；19:- **克隆是重操作**:207MB/2905 文件,**进度条必须**(按累计 size/totalBytes);默认分文件下载(内存安全);归档加速留后(design §5)。；84:## Self-Review(已过)
- 历史结论：P4 · 新建 / 打开本地 / 启动屏 / 种子克隆 实现计划：这是 plan-status，当前文档状态为 historical。全文 90 行、9 个标题；摘要/首段为「> **历史文档（2026-09-06 标注）**：本文是已完成的 TDD 计划/设计存档，正文中的执行」。属于历史/归档材料，不能单独证明当前实现。
- 当前能力、实现结果和任务排序必须从继任规范、代码、看板/任务卡和新的独立证据读取。

## 阻塞与决策

- 历史冲突/未决：
- 207MB/2905 文件进度、空白 manifest 和 FSA picker 是历史实现计划；真实用户手势/浏览器授权不能由正文证明。
- current project lifecycle spec 负责 clone/open/save contract。
- 停止线：不得把历史计划、checkbox、Self-Review、done/待审标签或浏览器验收步骤提升为 current contract、runtime/E2E/visual/coverage 证据；207MB/2905 文件进度、空白 manifest 和 FSA picker 是历史实现计划；真实用户手势/浏览器授权不能由正文证明。
- 旧计划中的 done/open/待审/浏览器验收词只保留为日期化证据，不能改写为 current。

## 下一步

- 继任入口：docs/phase2/specs/project-lifecycle.md；current editor ProjectPicker/clone code。
- 若需重新执行：先建立新的 task card，核对当前 primary source、合法输入、版本范围、business oracle、可证伪观察和独立验收；不得直接沿用本页步骤。
- 本次迁移完成后仍需候选独立接收；全量 1838 目标保持 active/build。

## 历史范围

- 原始范围：phase2 archive plan；日期/版本：2026-09-06；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，原文 89 行 / 7240 bytes。
- 归档原因：计划包含当时的执行分工、接口、checkbox 和验收步骤，当前合同已经由后继规范/代码承接。

## 原始结论

- P4 · 新建 / 打开本地 / 启动屏 / 种子克隆 实现计划：这是 plan-status，当前文档状态为 historical。全文 90 行、9 个标题；摘要/首段为「> **历史文档（2026-09-06 标注）**：本文是已完成的 TDD 计划/设计存档，正文中的执行」。属于历史/归档材料，不能单独证明当前实现。
- 保留原始结论的历史适用范围；新增章节不把计划结果提升为当前实现。

## 当时证据

- source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `0ca080e549d63812ed78932e86f0e5df553d5ac4cd1a720c465234e6acbf7983`；标题锚点：5:P4 · 新建 / 打开本地 / 启动屏 / 种子克隆 实现计划, 15:Global Constraints, 25:Task 1: seed 枚举 + manifest 相对化(纯核), 45:Task 2: 克隆编排 + 空白骨架, 58:Task 3: 打开本地(fsaSource → EditorState), 65:Task 4: 编辑器容忍无地图场景(空白项目渲染), 70:Task 5: ProjectPicker 启动屏 + main.tsx 接线（Claude 视觉）, 78:Task 6: 全链验收, 84:Self-Review(已过)。
- 原始链接、代码、表格、checkbox 与状态词在下方逐行 quote 保留；本轮未运行计划中的 runtime/E2E/视觉/coverage。

## 当前有效性

historical。当前不把计划步骤、Self-Review、done/open 标签、浏览器 gate 或历史数字视为现行契约或执行证据。
- 当前不得外推：不得把历史计划、checkbox、Self-Review、done/待审标签或浏览器验收步骤提升为 current contract、runtime/E2E/visual/coverage 证据；207MB/2905 文件进度、空白 manifest 和 FSA picker 是历史实现计划；真实用户手势/浏览器授权不能由正文证明。

## 继任文档

- current canonical / 复核入口：docs/phase2/specs/project-lifecycle.md；current editor ProjectPicker/clone code。
- supersedes / superseded-by：本页替换旧的 governed-legacy 结构展示，但不替换原始历史语义；当前事实由继任规范/代码和独立 review 决定。
- 重新启用条件：新的源版本、适用范围、合法输入、oracle、可证伪观察和独立接收。

## 原文保全

固定源 SHA `0ca080e549d63812ed78932e86f0e5df553d5ac4cd1a720c465234e6acbf7983`；以下只增加 quote 前缀，逆回读必须得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> > **历史文档（2026-09-06 标注）**：本文是已完成的 TDD 计划/设计存档，正文中的执行
> > 指令、Agent 分工与“当前状态”是当时快照，不是现行待办。实现结果以 capability-map 与
> > 对应任务卡为准。
>
> # P4 · 新建 / 打开本地 / 启动屏 / 种子克隆 实现计划
>
> > **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development / executing-plans。Steps 用 `- [ ]`。
>
> **Goal:** 补齐真实用户的项目生命周期 UI:启动屏(新建/打开/最近)、新建(从 pal 克隆整套自包含 / 空白骨架)、打开本地(fsaSource 渲染)。落地后用户能「选本地夹打开工程、改、存回」「从 pal 克隆到本地起步」。
>
> **Architecture:** 克隆 = 迭代 `asset-manifest.json`(2905 文件/207MB 现成清单)+ content 文件,经 httpSource 逐个下载 → writeProject(二进制)写本地,并把 manifest.assets 路径**相对化**(`/extracted`→`assets/extracted`)使 fsaSource 本地可读。打开本地 = fsaSource + loadProjectFrom。启动屏替换 main.tsx 的自动 loadProject。
>
> **Tech Stack:** TS,vitest,`@type-pal/editor`(clone/picker)+ `@type-pal/reforge`(seed 枚举/fsaSource 已就位)。
>
> ## Global Constraints
>
> - **纯逻辑单测**:seed 枚举、manifest 相对化、克隆的「下载→写」编排(mock source/handle)单测;**真实 FSA 选夹 + 207MB 下载走浏览器实测(须用户手点选夹)**——明确标注,不诈称已验。
> - **自包含铁律**:克隆出的本地夹 = 内容 + 全部素材,manifest.assets 全相对;fsaSource 打开零服务器依赖(design §1)。
> - **克隆是重操作**:207MB/2905 文件,**进度条必须**(按累计 size/totalBytes);默认分文件下载(内存安全);归档加速留后(design §5)。
> - **空白项目**:骨架无素材 → 占位场景须容忍「无地图」渲染空网格(编辑器改;design §4.2b)。启动屏入口标「高级」。
> - 检查点 `pnpm check` 全绿。提交中文 + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`。
>
> ---
>
> ## Task 1: seed 枚举 + manifest 相对化(纯核)
>
> **Files:**
> - Create: `packages/editor/src/core/seed.ts`
> - Test: `packages/editor/src/core/seed.test.ts`
>
> **Interfaces:**
> - Produces:
>   - `interface SeedFile { rel: string; kind: 'json' | 'binary'; size?: number }`
>   - `function relativizeManifest(m: LoadedManifest): LoadedManifest` —— assets.root `/extracted/data`→`assets/extracted/data`;music/sounds/portraits/faces/itemIcons 等 `/extracted|/baked` 前缀 → `assets/…` 相对
>   - `function enumerateSeedFiles(manifest, sceneIds, assetManifest: { files: {path,size}[] }): SeedFile[]` —— 汇总:manifest.json + content 各表 + scenes/index + 每场景 + 全部素材(asset-manifest 的 path 前缀 `assets/extracted/`)
>
> - [ ] **Step 1: 写失败测试**(relativizeManifest:`/extracted/data`→`assets/extracted/data`;`/baked/portraits`→`assets/baked/portraits`;enumerateSeedFiles:文件数 = 内容表 + 场景数+1 + 素材数,素材 rel 带 `assets/extracted/` 前缀)。
> - [ ] **Step 2: 跑失败**。
> - [ ] **Step 3: 实现** `seed.ts`:
>   - `relativizeManifest`:深拷 manifest,`assets` 各字段 `s.replace(/^\/extracted/, 'assets/extracted').replace(/^\/baked/, 'assets/baked')`;`root` 同规则。
>   - `enumerateSeedFiles`:`[{rel:'manifest.json',kind:'json'}, …content 表 rel, {scenes index}, …每场景, …assetManifest.files.map(f=>({rel:`assets/extracted/${f.path}`, kind:'binary', size:f.size}))]`。(baked 另有清单则并入 `assets/baked/…`;无清单则按 manifest 引用的固定 baked 子目录已知集补——实现时核 data/baked 结构。)
> - [ ] **Step 4: 跑通过**。
> - [ ] **Step 5: 提交** `feat(editor): seed 枚举 + manifest 相对化(自包含克隆核 P4)`。
>
> ## Task 2: 克隆编排 + 空白骨架
>
> **Files:**
> - Create: `packages/editor/src/core/clone.ts`
> - Test: `packages/editor/src/core/clone.test.ts`
>
> **Interfaces:**
> - Produces:
>   - `cloneFromPal(seed: FileSource, dir: FileSystemDirectoryHandle, onProgress: (done: number, total: number) => void): Promise<void>` —— 读 asset-manifest + content → enumerateSeedFiles → 逐个 `seed.readBytes/readJson` → writeProject(二进制),累计 size 报进度;写相对化后的 manifest
>   - `buildBlankProject(name: string): Record<string, unknown>` —— 最小 manifest(assets 空/相对)+ 空内容表 + scenes/index + 占位空场景
> - [ ] **Step 1-4: TDD** —— clone 编排喂 mock source+handle 测「按清单读写、进度回调累计、manifest 相对化落盘」;buildBlankProject 测骨架完整(entryScene 存在、内容表空)。
> - [ ] **Step 5: 提交** `feat(editor): cloneFromPal 编排 + 空白骨架(P4)`。
>
> ## Task 3: 打开本地(fsaSource → EditorState)
>
> **Files:**
> - Create: `packages/editor/src/core/open-local.ts`(`openLocalProject(dir): Promise<{project, scenes, music}>` = ensurePermission → fsaSource → loadProjectFrom → loadAllScenes)
> - Test: mock handle 测「无 manifest → 友好报错;有 → 装配」。
> - [ ] **Step 1-5: TDD + 提交** `feat(editor): openLocalProject 经 fsaSource 装配(P4)`。
>
> ## Task 4: 编辑器容忍无地图场景(空白项目渲染)
>
> **Files:** Modify `packages/editor/src/ui/scene-stage.ts` + `SceneCanvas.tsx`(mapNum 对应素材缺失 → 画空网格 + 提示,不抛)。
> - [ ] TDD/实测:空白项目占位场景显示空网格,不崩。提交 `feat(editor): 容忍无地图场景 = 空网格(空白项目 P4)`。
>
> ## Task 5: ProjectPicker 启动屏 + main.tsx 接线（Claude 视觉）
>
> **Files:** Create `packages/editor/src/ui/ProjectPicker.tsx`;Modify `main.tsx`。
> - 启动屏:**新建**(从 pal 克隆 / 空白骨架〔高级〕)、**打开工程**、**最近工程**(listRecent)。克隆走进度条。
> - main.tsx:自动 loadProject → 渲染 ProjectPicker;选定(克隆/打开/最近)→ 建 EditSession → App。dev env(`VITE_PROJECT_ID`)可直进(开发便利)。
> - 非 Chromium(无 showDirectoryPicker)→ 提示「请用 Chrome/Edge」。
> - [ ] 实测(Claude 视觉 + **用户手点选夹**):新建空白→选夹→空网格编辑→存;打开刚存的夹→载入;从 pal 克隆→进度条→完成→迷宫场景本地渲染(证自包含)。
>
> ## Task 6: 全链验收
>
> - [ ] `pnpm check` 全绿。
> - [ ] **用户手点** 走通:克隆 pal→本地→断网仍渲染(证零服务器依赖);打开本地→改→增量存→刷新→最近工程重连(手势)。
> - [ ] 记录验收;整个「项目生命周期」切片(P1-P4)收官 → 进**地图编辑模块**。
>
> ## Self-Review(已过)
>
> - **Spec 覆盖**:P4 = design §4.1(启动屏)/§4.2(新建克隆+空白)/§4.3(打开本地)/§5(克隆进度/非Chromium)/§7(必做全覆盖)/§8(自包含衔接地图模块)。✓
> - **占位符**:seed/clone/open 关键接口签名给全;UI 细节留 Task 5 视觉实现(Claude,form 级)。素材 baked 清单一处标「实现时核结构」——非占位,是实现期确认点。
> - **可测边界**:纯核(seed 枚举/相对化/clone 编排/open 装配)mock 全测;真实 FSA + 207MB + 断网 = 用户手点浏览器实测,明确标注。
> - **依赖就位**:fsaSource(P3)/httpSource(P1)/writeProject 二进制+增量(P3)/handle-store(P3)全在 → P4 只组装 + UI。
<!-- original-source-quote:end -->
