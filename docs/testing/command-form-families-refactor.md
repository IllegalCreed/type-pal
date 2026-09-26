# B3 命令表单族所有权候选

Owner：Codex；基点 `b3eada17`；实现 `ec813052`、`83a8f7be`、`951131d8`、`a5744ee1`、
`e538d924`；设计审计性能与证据迁移 `703e14cb`、`be2796e6`、`badd411c`、`f4beb777`；所属
[连续治理卡](../ops/tasks/ARCH-CONTINUATION-1-remaining-queue.md)。本候选不合 main、不运行共享全仓
coverage 门；待原接收对话统一集成和执行 check/ratchet/strict。完整计数、命令和未证项见
[机账](command-form-families-refactor-evidence.json)。

## 所有权边界

- `CommandForm` 从 2098 行降到 203 行，只保留按 `kind` 分派和兼容公共出口；不再持有对话、世界、角色/队伍、
  控制/资源的表单实现，也不把整个 `CommandFormProps` 或 `CanonicalScriptEditorContext` 交给子族。
- `DialogueCommandForm` 独占作者/运行时对话身份、locale 字面量解析、行 reorder、速度/自动推进/光标、立绘和
  raw JSON 逃生口；`ActorCommandForm` 独占角色条件、队伍 reorder/删除/fallback、mount/ride；
  `WorldCommandForm` 独占实体/外观/移动与 `loadScene` 三态；`ControlCommandForm` 独占变量、分支、资源、背包、
  脚本引用、相机及剩余 fallback。共享 `Row/Num/Txt/Sel/EntitySel/WorldVariablePicker/JsonForm` 只有一份实现。
- `command-form-contract.ts` 显式列出由作者专用表单保留的 command kind，并只把共享作者子集送入公共表单。
  `createAuthorCommandFormBridge` 在提交边界拒绝 kind 漂移和作者对话 identity 降级；`ScriptEditor` 不再用
  `as Command` / `as AuthorCommand` 跨越方言边界。既有作者专用表单、引用保护和 runtime 命令能力没有被复制。
- `ScriptEditor.tsx` 4361→4308；content20/SAVE8、命令 schema、locale 写回、reorder key、aggregate draft
  提交时点、公式、玩法、UI 与资产约定均未改变。本批是所有权重构，没有夹带行为修复。

## 设计系统证据与性能门

拆分后，action group、add picker、reorder、number field、field commit、text overflow、route adoption 和
field-layout census 的生产 owner 路径全部迁到真实族文件，旧 `CommandForm.tsx` 不再被伪登记为实现 owner。
设计门仍覆盖 100 个文件和 2 个 evidence-bound exception。

路由 owner 变多后，整包首次运行使既有 CSS-only 失效测试在并发环境达到 15.35 秒并触发 15 秒超时。
没有放宽阈值：AST/source facts 按内容缓存；CSS 变化先按真实 scroll-rule 差异及访问过的源码 class 做不可能性
预筛，只有可能命中的路由才重算 vertical-scroll signature。`shop-stock-list` CSS 注入仍被检出，定向性能测试
2/2 用时 11.43 秒，整包随后 2879/2879 通过。

## 回归、反控与隔离功能核验

- 表单族定向 5 文件 51/51；设计所有权轻量相邻 7 文件 53/53；Editor 整包 334 文件/2879 项；TypeScript、
  production build 与设计门通过。build 仅保留既有大 chunk 提示。候选 24 个 Biome 文件零 error；
  `boundary.test.ts` 的 5 条 warning 在基点已存在，本批未扩大。
- [十二针](command-form-families-mutants.mjs)覆盖对话身份/单行删除/删除选择、队伍删除、角色条件默认值、
  wait/fade/entity state/world variable 提交、loadScene 目标、bridge kind 与作者 identity。control 20/20；
  12 个坏实现全部由指定候选测试的单一 `AssertionError` 检出。最终临时机账：
  `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-command-form-families-mutants-sDJzxA/summary.json`。
  工具同时要求精确 absolute test/fullName、唯一 loader marker、产品 hash 不变，并用 1 正/9 反自测判据。
- Codex 在 6056、`VITE_PROJECT_ID=pal` 的隔离编辑器打开 s000 进场脚本；对话表单完整显示身份、单行保护、
  速度、位置、自动推进和光标，队伍表单显示队长/reorder/移出，切换场景表单显示场景、落点三态、朝向与过渡。
  仅打开后关闭，没有修改字段或保存；保存始终禁用，console warning/error 为零。未占 6010，页面和服务已关闭。

## 未证项

未运行全仓 check、官方 coverage ratchet、受保护 strict、full/Q1/Q2 或远端 CI，未更新官方 coverage 基线，
未执行正常工程持久化。本轮隔离 UI 取证覆盖现有内容中的 dialogue/actor-party/world 三族；控制/资源族由现行
组件回归、整包和反控覆盖，未为视觉取证改写内容或新建共享脚本。B3 只在候选树实现与证据齐备，须由原接收
对话完成统一门并合 main 后才能正式标完成。
