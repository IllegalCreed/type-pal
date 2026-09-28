# TEST-KIMI-EDITOR-WORKFLOWS-1 — 编辑器十二组真实工作流补测

Status: done
Owner: Kimi（受委派测试贡献者）
Reviewer: Codex（独立验收、统一质量门与集成）
Phase: phase2
Capability: editor / coverage
Visual Verification Timing: dev-functional（隔离浏览器；非剧情 E2E）

## 目标与准入

2026-09-28 用户要求给 Kimi 一批较大的覆盖率任务，并确认其视觉多模态能力。本卡立即允许
Kimi 在隔离分支实施新增测试，不先交一轮纯盘点等待批准。按 A/B/C 三批、每批四组连续交付，
Codex 可逐批验收；不必等前批审完才开始下一批。固定三签暂休，作者自验不冒充独立证明。

生产冻结 `29e76fe62070fb03bf2459cf95dc2a70ba0f2a0b`；起点可以包含本次派发文档的 main 后继，
但开工时须核 20 个目标源文件 SHA 与[冻结表](../../../../testing/kimi-editor-workflows/targets.json)一致。
分支 `codex/kimi-editor-workflows-r1`，Codex 已备好隔离工作树
`/Users/zhangxu/.codex/worktrees/kimi-editor-workflows/type-pal`；不得借用 main 或 Codex 的 E2E 树。

## 前提真值门

- 工程前提：当前 editor fast LCOV 的 20 个目标合计仍有 2,401 个未命中分支臂、1,699 个未命中行，
  可在现有行为合同和公开入口上补测试；这不是可达性证明或本批承诺增量。
- 真值来源：冻结表记录正式 fast LCOV 的 SHA256、源文件 SHA256、逐文件 LH/LF/BRH/BRF 和旧测试入口。
  当前直接调用域包括 `DataMode.tsx:243/273/333/370/463/515/552/689/721`、
  `ConnectedEditorPages.tsx:121`、`SoundTab.tsx:80`、`MusicTab.tsx:83`、
  `ActorMode.tsx:527`、`App.tsx:2182/2676`。逐组代码锚在[工作包](../../../../testing/kimi-editor-workflows/README.md)。
- 第一阶段/原版机制：N/A，本卡不改引擎机制、资源格式或用户行为，也不把旧引擎结构当二阶段合同。
  当前守卫、真实 EditorAssetReader/EditSession/命令与现有产品 UI 是本卡被测对象。
- before → after：产品行为完全不变；新增可证伪的业务回归、局部覆盖证据及最小界面取证。
- 最强替代解释：未命中臂可能被跨文件旧测试证明、属于不可达防御或未定政策；旧测试标题不能证明
  其断言确实覆盖该合同。Kimi 必须先逐族核旧断言，已有则登记 existing-proof，不复制；不明确则登记风险。
- 推翻条件：不存在当前调用方、只能伪造非法输入触达、与既有用户决定冲突。停止该族，继续不受影响的组；
  不通过新增 fallback、改产品或放宽测试预期解决。

## 范围与单写入 Owner

精确新增测试白名单为 `targets.json` 的 20 个 `newTest`；辅助仅限：

- `packages/editor/src/ui/__tests__/kimi-editor-workflows/**`：本卡 typed fixture、浏览器硬件端口替身。
- `docs/testing/kimi-editor-workflows/**`：工作包回执、判据/反控、局部覆盖配置、诊断和最小浏览器宿主。
  `targets.json` 为 Codex 冻结证据，只读；Kimi 新增 delivery/receipt 文件，不改派发事实。

产品、旧测试、官方测试配置、依赖/锁文件、基线、AGENTS、正式工程/资产、任务卡/看板/公共索引均不在
Kimi 写入范围；状态由 Codex 统一维护。新增子目录有 Markdown 时自带 README，入口已由本次派发登记。
已知 `EDITOR-SCENE-FACING-1` 的“保持仍提交旧方向”不固化为正常行为；E2E001/002、PreviewCanvas /
ScriptEditor 连续播放、FrameAnimationEditor 已收口合同、角色换装功能均不重开。

`audio-preview-session.ts` 已是 4/4 分支、10/10 行，只作 K07 的真实依赖，不另凑用例或计本批贡献。
若真正缺陷落在产品，交红诊断与根因，Codex 单独修；不得把整个批次卡死在一个未知政策上。

## 验证与交付

完整要求在[工作包](../../../../testing/kimi-editor-workflows/README.md)，关键门：

1. 同一真实输入/当前合法 fixture、公开调用域与业务结果；异步进入/释放/迟到结果均有见证。
2. 每组至少一个代表性业务单点反控；资源替换/异步归属/地图原子提交高风险组优先两个。
   不能因为达到数量而补无关针；确无单点须说明替代鉴别力，交 Codex 裁决。
3. 定向/相邻测试，批末 editor 全包与 typecheck；新增文件 Biome error/warning/info 全零；docs 与 diff 检查。
4. 每批至少两条真实浏览器交互闭环，含宽/窄工作区检查；禁止占用用户 6010 或 Codex E2E 服务/配置。
5. A/B/C 各有独立候选 SHA、精简逐族账/新鲜 Vitest JSON、反控和源 hash；三批全部完成后
   统一做一次本包同口径 before/after 覆盖对照，不逐例反复跑覆盖率。不跑官方全仓门、不写基线。
6. Codex 独立验收后选择性集成，串行 check → 官方 ratchet → 受保护 strict-fast；与当时 main 去重。
   通过即提交推送并按卡收口，不再等固定席位；随后清理已退役分支/工作树。

## 当前模式推进记录

- Codex 范围/前提：verified；20 个实际存在源码与既有 fast 缺口/当前消费者已核，2401 仅选题上界。
- build 准入：**build allowed（仅新增测试/隔离证据）**，2026-09-28。
- Coding Owner：Kimi，单一写入本卡新增文件；Codex 负责 E2E002，不与之并发改测试文件。
- 贡献者交付/自验：A `04ed4823`、B `524d1930`、C `e838ca30`、回执 `186f046b`、返工 `d056af0e` 已推送。
- Codex 独立验收：2026-09-29 `accept`，四项历史返工已闭合，正式集成门通过；见最终验收。
- 用户产品验收：N/A，本卡不改用户行为；若发现需要新产品取舍，另行裁决。
- done 准入：**done allowed**；纯测试包无用户可见行为取舍，产品验收 N/A。

## 交接日志

- 2026-09-28 Codex：按用户授权派发十二组，20 源码冻结；复用 Vitest/pnpm 现行配置，不重跑覆盖盘点。
  允许 Kimi 隔离最小功能视觉，不触碰用户配置、E2E 或换装范围。下一位 Kimi 直接实施。
- 2026-09-28 Codex：独立审核实际候选 HEAD `186f046bfa983143494bae74e10158540b8e0411`；
  21/21 产品源 SHA256 与冻结表一致，7 张截图存在且完整 hash 匹配，抽看七图。
  117 条机读新例均为 passed；editor `typecheck` 通过；editor 全包 3414 通过、2 条旧
  `world-sprite-behavior.pal.test.ts` 因隔离树缺 `035.rle`/`044.rle` 资产失败（主树文件存在）。
  docs 和 diff 检查通过。局部覆盖 `compare.mjs --reuse` 与回执一致：20 目标 +829 行/+751 臂，
  editor 全包 +1000 行/+862 臂；此为同源码局部对照，不是集成后正式全仓数字。
  保留的反控原始 Vitest JSON 独立严核：27 红针+20 绿色控制共 47 条有效（另有 2 条废弃惰性针）；
  用完整模块路径单针复跑 `k01-alive-guard` valid-red。`pnpm lint` 因新增 evidence.json 格式错误失败，
  反控交接命令及判据也不满足卡面要求，故转 `rework`；未合 main，未跑官方 ratchet/strict-fast。

## Codex 独立审核返工项（候选 `186f046b`）

1. **零诊断门未过**：在候选树运行 `pnpm lint`，Biome 对
   `docs/testing/kimi-editor-workflows/evidence.json` 报 1 条 format error（约第 1178 行数组排版）。
   在白名单内格式化并复跑 `pnpm lint`，须 error/warning/info 全零。
2. **反控命令与严判据不符**：按回执/工作包从仓库根运行
   `node docs/testing/kimi-editor-workflows/counter-control/run.mjs injections.mjs --only k01-alive-guard`
   立即 `ERR_MODULE_NOT_FOUND`，因为 `run.mjs:15` 从 `process.cwd()` 解析模块；给完整相对路径才通过。
   修为文档命令可复跑。`run.mjs:95–128` 目前只比较 fullName/执行数与消息前缀，未绑定失败记录的
   绝对测试文件，也未拒绝 pending/skip、无 failureMessages、AssertionError 前缀下的 timeout/混错；
   缺少调用同一个正式判据的自测。不能以现有 runner 的 `valid-red` 直接宣布卡面 46/47 针全 valid。
   补严判据和自测后按 A/B/C 三份模块全量复跑；记录实际有效数（当前证据为 47，不是交接消息的 46）。
3. **视觉警告归因错误**：回执把 B2 的 React `Invalid DOM property 'class'` 记作“产品侧”；
   一手来源是本卡宿主 `docs/testing/kimi-editor-workflows/browser-host/main.tsx:321` 的
   `<div id="kimi-workbench" class="body">`。改为合法 JSX 后复核该告警消失，修正回执来源与截图元数据。
4. **合法路径类型掩盖**：本卡要求合法 fixture 无强转，根协议禁止新增 ignore/强转掩盖问题。
   `EnemyTeamTab.kimi-workflows.test.tsx:579/625` 两处把事件树双重强转为 `EnemyDef['onDefeated']`；
   `k10-fixtures.ts:77/80` 双重强转 canonical items/scripts；`kit.ts:15–23` 及 k05/k06 fixture
   用 `@ts-expect-error` 压制 Node 桥接导入。请改为类型安全的当前生产构造/适配与显式测试端口；
   若存在真实公共类型债，交最小证据给 Codex，贡献者不要越界改产品或共享配置。

本轮代码抽查 K01/K10/K12 的真实 EditSession、reader、保存与 UI 入口有实质业务断言；上述四项是
接收门，不能用已有测试通过或局部覆盖增量替代。新候选须由 Codex 再次独立核验，之后才可选择性集成、
串行执行全仓 check → 官方 ratchet → 受保护 strict-fast、更新卡面 done 并清理退休树。

## 下一位 Agent 提示词（返工阶段历史）

```text
返工 TEST-KIMI-EDITOR-WORKFLOWS-1，以隔离分支当前实际候选 `186f046b` 为起点。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡
docs/ops/tasks/TEST-KIMI-EDITOR-WORKFLOWS-1-twelve-groups.md，以及
docs/testing/kimi-editor-workflows/README.md、receipt.md、evidence.json、targets.json，重点看卡内
“Codex 独立审核返工项”。你仍是测试 Coding Owner，写入仅限本卡白名单。
在 /Users/zhangxu/.codex/worktrees/kimi-editor-workflows/type-pal、
codex/kimi-editor-workflows-r1 分支修四项返工：evidence.json 零格式诊断；反控模块解析、
文件/skip/timeout/混错等严判据及同 judge 自测，按文档命令全量复跑三模块；
修宿主 class JSX 并重核 B2 控制台；去除合法 fixture 的强转与类型压制，无法在白名单内解决的
公共类型债交最小证据。同步 main 审核记录但不改任务卡/看板。给新候选完整 SHA、复跑命令/JSON、
47 条有效反控和 2 条历史废弃针的清楚口径、静态零诊断及截图回执。
不要自动合 main 或改旧测试/产品/官方配置/依赖/基线；不跑官方全仓 check/ratchet/strict-fast。
Kimi 是测试贡献者，不是独立第三方。Codex 独立验收、集成、推送、收口与清理；不代签、不标 done。
```

## 2026-09-29 Codex 最终独立验收

- 候选实际 HEAD `d056af0e65f8e02324709fe79eac6e3643b8bdb7`；与集成前 main
  `95a326fcb617c0ede1d9bbcc24488dbd147aadbe` 对照，只接入本卡新增测试、专属 fixture/证据，
  21/21 产品源 SHA256 与冻结表一致，未改产品/旧测试/共享配置。七张浏览器截图 hash 匹配并已看图。
- 四项返工闭合：`pnpm lint` 完整报告 2443 文件 **0 error/0 warning/0 info**；裸文件名反控命令
  `k01-alive-guard` valid-red，`judge.mjs` 同判据自测 17/17，通过后 A/B/C 串行全量为
  **27 红针＋20 绿色控制＝47/47 valid**（两枚初版惰性针只保留历史）。第一次 A 针与另队重覆盖
  并发时曾出现一次零红，停并发后四次单针与 A/B/C 整批复跑均通过；留此时序观察，不改历史计数。
  `EnemyTeamTab`/k10/Node 测试端口现用生产守卫和显式类型，无原先强转或压制。
- sound 直挂宿主的 React `class` 告警已消失。Codex 在主树修正宿主启动命令与 favicon 404 后，
  1000×720 Chrome 隔离复验 `?component=sound`：console error/warning
  与 page error 均 0；宿主仍仅证明组件→临时 FSA 保存/重读段，不冒充完整 App/E2E。
- 正式串行门：`pnpm check` exit 0，七包 **10,324/10,324** 测试通过，editor 3416/3416（隔离
  worktree 缺 `035.rle`/`044.rle` 的两条旧 PAL 例在主树全绿），最终 lint 仍 0/0/0。
  `TYPE_PAL_COVERAGE_BASE_REF=95a326fc pnpm coverage:ratchet` exit 0，只升不降（8 项指标提升，
  2 项测试范围变化）；随后同一保护基点的**单次** `pnpm coverage:fast` exit 0，9863/9863 项、
  730 生产文件，分支 **48,540/63,398（76.56%）**，相对新基线零回退、零新增提升。
  正式 editor 分支 22,483/28,484（78.93%），本卡对 editor 净增 862 命中臂；其余六包
  生产范围与指标保持前值。剧情 E2E 由独立任务执行，不计入本卡。
- Codex 判定 `review -> done`。历史 `counter` 仅对旧候选有效，已逐项复核闭合。
  **无下一位 Agent 提示词；本卡技术收口完成。**
