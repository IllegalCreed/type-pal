# TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1 — ControlCommandForm 残余合同审计（音频选择/店铺身份/共享脚本 self）

Status: done（build 自测完成，待 Codex 独立验收；不标 done）
Owner: GLM（唯一测试写入者）
Reviewer: Codex（独立验收）
Phase: phase2
Capability: editor / test-contract-precision
Visual Verification Timing: N/A（无 UI 变更，不宣称像素/剧情观感验收）

## 目标与路由

只审计并补充 ControlCommandForm 尚未证明的合法合同，检查面限定三区：
playSound/playMusic/setAmbience 真实资源选择与空目录边界、openShop 合法店铺模式切换与稳定数值身份、
共享脚本 self required/explicit/invalid 的真实 CanonicalScriptBodyEditor caller。

- 工作树 /tmp/type-pal-cf-residual（git worktree，软链 node_modules + 树内 wrapper
  `vitest.isolated.config.ts` 放行双树根）；分支 codex/glm-editor-control-form-residual-r1。
- 源冻结 9aa3bed892728f17c70d2f86d1fe07db10a718b8（main 基点）；交付核 Git 对象，不 rebase 到产品漂移。
- r1 候选已推：工作提交 af8116488b870de97b76661a6e0092cb104f9097（本回执提交为其后继，最终 tip 以
  `git rev-parse origin/codex/glm-editor-control-form-residual-r1` 为准）。
- 允许零新增。已有 flag/var/item/shop-empty/portrait/world 合同只登记不复制。

## 已核前提与上下文（一手证据）

- 必读 [第二阶段纪律](../../../../phase2/READ-FIRST.md)、[测试质量验收](../../../../ops/agent-workflow.md)、
  [AGENTS.md 当前临时模式](../../../../../AGENTS.md)。不变 UI/行为、无原版机制或 UX 取舍，前提真值门 N/A；
  本卡核心前提是「可达性与排重」账，逐条附 file:line。
- 唯一产品挂载点：`CommandForm` 仅被 `ScriptEditor.tsx:1921`（CanonicalCommandForm，经
  `createAuthorCommandFormBridge`）挂载；`ControlCommandForm` 仅被 `CommandForm.tsx:189` 挂载。
- 分流真值：`command-form-contract.ts:8-68` AUTHOR_CUSTOM_COMMAND_KINDS 含 `callScript`（:66）；
  bridge 对其返回 undefined（:102），CanonicalCommandForm 落入内联表单 `ScriptEditor.tsx:2094-2162`
  （共享脚本 Sel + EntityAddressEditor self + 使用当前实体/指定另一个作用实体），不经 ControlCommandForm。
- 运行时方言（`script.ts:253-255` callScript/jumpScript `ref+self:string`）作为作者输入被
  `author-script-core.ts:881-882` 拒绝（`'ref' in command` 即 throw）；jumpScript 为运行时方言专属
  （`author-script-core.ts:564`）。与 glm-large-wave 头注「运行时方言 kind 不可达」一致，本卡把该裁决
  用 bridge 证据扩展到整个 callScript 臂。
- `scriptIndex`/`onOpenScript` 在唯一挂载点从未传递（ScriptEditor.tsx:1921-1946 全列核；全仓非测试
  grep 无第二传点）→ `command-form-control.tsx:481` 的 required cf-err、:450 deriveScriptChunk 目标切换、
  「打开」按钮在产品路径不可达。`hasImplicitSelf` 有两个产品来源（`App.tsx:1350`、
  `SharedScriptTab.tsx:313`）但只喂该不可达臂（product 观察登记，不修）。
- self required 的真值层在校验：`script-references.ts:196-205`（`调用 X 需要显式 self`），
  证明见 `script-references.test.ts:159`。
- 合法输入口径：openShop 仅要求非负安全整数与 buy|sell（`author-script-core.ts:866-871`，无店铺表交叉校验）；
  setAmbience.ambience 仅 string（`script.ts:185`）；callScript.self 为 EntityAddress 形状校验
  （`author-script-core.ts:421-427,880-885`，不查场景/实体存在性）→ 悬空 self 地址是合法 typed 输入。
- 悬空值呈现的通用层已证：DsSelect 未匹配值 `（缺失）`（`select.tsx:395-396`、
  select.glm-leaf-wave:81）；NamedIdPicker `未知X`+aria-invalid（NamedIdPicker.test:98-115）；
  SoundPicker `⚠ 缺失或类型错误` 臂（SoundPicker.glm-leaf-wave:102 + large-wave:41）；
  MusicPicker 无缺失专属臂（`MusicPicker.tsx:136-143` 唯一附加项为空目录占位）。

## 排重账结论（逐条 ledger 见证据目录 contract-ledger.tsv）

三区共 17 项裁决：existing-proof 11、merge 4、unreachable 1（ControlCommandForm callScript/jumpScript
self 全臂，含 required cf-err/（不在场）/deriveScriptChunk/打开按钮）、新合同 1。

- 音频/氛围：playSound 选择提交+onOpenSound（large-wave:22）、缺失臂（:41）、空目录选项（:52）、
  空目录占位零提交（author-control-contracts E6:30）；playMusic 选择提交（large-wave:64）、空目录占位
  零提交（E6:37）；setAmbience picker 臂（large-wave:79）、无表降级 Txt 臂（:94，`ambiences?.length`
  falsy 同臂覆盖空数组）。悬空 music 资产/悬空 ambience id 呈现走已证通用层，选择提交与既有同 caller
  同 oracle → merge。
- openShop：Sel 臂数值身份+模式（current-data:45-50）；空表 Num 降级+模式不污染店铺号（E4:21-28）；
  未命中 shop id 呈现走 DsSelect 通用 `（缺失）` → merge。
- 共享脚本 self：ControlCommandForm 各臂 unreachable（见上）；真实 caller explicit/inherit 已证
  （coverage-workflows-2:109-123/125-136）；required 已证于校验层（script-references.test:159）；
  **invalid（悬空 self 地址经真实聚合弹窗）无任何证明**——ScriptEditor.test:743 只证有效地址 combobox
  存在性，引用失效既有证明均在其它组件（ScriptBehaviorInspector/EntityPageAnimationEditor）。

## 唯一新合同 R-SELF-INVALID-1（packages/editor/src/ui/command-form-control.residual.glm.test.tsx）

- source：`ScriptEditor.tsx:1362-1383`（场景悬空 `（引用失效）` 禁用项）、:1385-1391/:1423-1429
  （场景悬空时实体降级 DsTextInput）、:1377-1382（重选场景自动改绑首个可接受实体）。
- 公开 caller：CanonicalScriptBodyEditor 行双击 → 聚合弹窗（command-form-current-fixture 真实链，
  includeEntity/includeSecondEntity/includeSharedScript 合法变体，全部 validate* 过）。
- 合法 typed 输入：`{kind:'callScript', script:'shared/user/heal', self:{scene:'gone', entity:'npc-2'}}`
  （checkAuthorCommands 形状校验通过）。
- 精确 oracle：场景触发器显示 `gone（引用失效）`（非通用缺失回退）；实体无 combobox、原始文本保留
  `npc-2`（不伪装可选）；重选 `start` 后完成一次性提交
  `{scene:'start', entity:'npc'}`——npc 为 start 首个实体，与「保留旧值 npc-2」可判别。
- 反控两针：N1 场景悬空选项注入条件置 false（呈现针）；N2 自动改绑改回保留旧实体（身份针）。

## 独占白名单与特殊限制

- 仅写 packages/editor/src/ui/command-form-control.residual.glm.test.tsx、本卡、
  docs/ops/tasks/evidence/TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1/。产品/旧测/共享 fixture/配置/
  baseline 只读；不改 board.md、tasks/index.md（main 树并行 Owner 在写）。
- 真 React 控件与真实 caller 链；无业务核心 mock、无私有 state、无强转、无 skip/ignore、无 timeout 扩大。

## 冻结源（SHA256，9aa3bed89）

| 产品源 | SHA256 |
|---|---|
| packages/editor/src/ui/command-form-control.tsx | e38402d7fc20ccb842c69aa95fef4237ec508a227e7d1f5f36e18e95156c88df |
| packages/editor/src/ui/command-form-contract.ts | 2ed252625cd4909141f6c72feb0d68b947a71e8686611eaae3b2692a3fc8d403 |
| packages/editor/src/ui/CommandForm.tsx | be02bf5a67b18e9f92901ec25013f4c7e16b36a24aeadc608d0b057bb042c3bb |
| packages/editor/src/ui/ScriptEditor.tsx | 3c9055b5feffb0a85f6955b2d257177d7f0ee9a301283433dc7a7b35fef481e3 |
| packages/editor/src/ui/SoundPicker.tsx | 6e4308f760f870e5347e52963bcdd39efd39e552d4dd0e9cead9000eccb649f1 |
| packages/editor/src/ui/MusicPicker.tsx | 0e08c7cb02dcd827c71d073bcb671f43ba1fe8d9d998aae7dc38361348a4c55b |
| packages/editor/src/ui/NamedIdPicker.tsx | 85bf7961ec4fd2af7e21865ddfe0902b60944b11afb41c45e234db11017a43ce |
| packages/editor/src/ui/design-system/select.tsx | 47d56c4e197776f37057dc1b3542c70821c12a62eaedd6800a9bf5ffcdebbdf5 |
| packages/editor/src/core/script-references.ts | 6e8b39443694ee28a92e54c6bd6b79fd94b19afbc7a65a8af128b06189d8beae |
| packages/editor/src/ui/__tests__/command-form-current-fixture.ts（只读复用） | a068284c7ca0e8419293d51a5b8329aa90405223915ff9e32c1e4c92bc892011 |

## 验证记录（worktree /tmp/type-pal-cf-residual，wrapper config）

- 定向：新文件 1/1 绿、0 act 警告、0 suite.message/污染（evidence/mutation-logs/green-baseline.raw +
  baseline.json，双 reporter 同进程）。
- 相邻 18 文件（current-* 全家族、author-control-contracts、glm-large-wave control、contract/family
  ownership、ScriptEditor 三件、picker/select 组件层）：全绿 0 警告（evidence/adjacent.raw + adjacent.json，
  逐文件×用例计数入 counterproof.json）。
- 全包：628 文件 4930/4931 绿，唯一红为已知基线 number-field-adoption（见基线单列；
  fullsuite.raw/fullsuite.json）。首轮全包中 scripts/pal-simulator-presets 曾因隔离树缺
  packages/reforge/node_modules 软链 collect 失败，补链后 12/12 通过（隔离树装置，非产品差异）。
- typecheck 0 错；根 lint PASS（3966 文件 0 error/0 warning/0 info）；git diff --check clean；
  check:docs 见基线单列。
- 反控：两针三态全 VALID（evidence/counterproof.json：双 reporter native JSON+raw、exit/signal/spawn
  身份、file×fullName 执行集合、mutant/restored SHA、biome 尾步后按落盘字节计 hash、产品零残留）。

### 基线单列（非本卡引入，同命令对照）

- `src/ui/design-system/number-field-adoption.test.ts > locks wrapper consumers and representative
  static expansions` 在冻结点 9aa3bed89 即红（`command-form-controls.tsx@Num: expected 37 to be 39`）：主树同命令复跑同样失败（2026-10-11 对照），非本卡文件与依赖；按白名单不越界修。
- `pnpm check:docs` 于 worktree 报 2 项，均为本卡登记项（board.md 活动卡未链接 + index.md 待再生成）；
  冻结点无本卡时同命令 PASS 0 issues（已对照）。board/index 均在本卡白名单外且 main 树有并行 Owner
  在写，按 wave M 先例留 Codex 集成时随登记闭合。

## 推进记录

- 2026-10-11 Codex 派发：三区检查面、白名单与零新增许可（本卡 dispatch 记录）。
- 2026-10-11 GLM r1：排重账 17 项落盘（existing-proof 11 / merge 4 / unreachable 1 / 新合同 1）；
  唯一新合同 R-SELF-INVALID-1 交付（`command-form-control.residual.glm.test.tsx` 1 用例）。
  定向 1/1、相邻 18 文件 171/171（均 0 act 警告/0 suite.message/0 污染）、全包 628 文件 4930/4931
  （唯一红为冻结点基线 number-field-adoption，主树同命令对照同红）、typecheck 0、根 lint 0/0/0、
  diff --check clean、check:docs 仅 2 项本卡登记项（基线单列）。反控 ALL-VALID：两针三态恰一指定业务
  AssertionError（N1 呈现针/N2 自动改绑针）、还原 SHA=冻结、产品零残留、biome 尾步后落盘字节计 hash。
  证据原件见 [evidence/](../../../tasks/evidence/TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1/)（contract-ledger.tsv、
  counterproof.json、fullsuite.json、mutation-logs/）。不合 main、不标 done，待 Codex 独立验收。
- 待 Codex 独立验收。

## 下一位 Agent 提示词

```text
接手任务：TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1（Codex 独立验收）
任务卡：docs/ops/tasks/TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1.md
当前状态：review（build 自测完成，未合 main、未标 done）
你的职责：独立核交付并裁决 accept/counter。
先读：AGENTS.md 当前临时模式、本卡、docs/ops/tasks/evidence/TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1/
（contract-ledger.tsv、counterproof.json、directed/adjacent/fullsuite.raw、run-counterproof.mjs）。
工作树 /tmp/type-pal-cf-residual，分支 codex/glm-editor-control-form-residual-r1（tip 见卡面），
源冻结 9aa3bed89。请独立核：1) ledger 17 项锚点抽查（尤其 unreachable 的 bridge/挂载点/scriptIndex
三证据与 existing-proof 的 large-wave/current-data/E4-E6/coverage-workflows-2/script-references.test 行号）；
2) 唯一新合同 R-SELF-INVALID-1 的真实 caller、合法输入与 oracle 判别力（可复跑 run-counterproof.mjs
或抽针重建）；3) 白名单边界（仅测试文件+本卡+证据；board/index 未动）；4) 定向/相邻/全包/typecheck/
lint/check:docs 复核。merge 裁决接受即合并推送并收口；counter 请列精确返工项写回本卡。
```


## Codex 独立验收与收口（2026-10-11）

- 候选提交：`af8116488` + `5c5085678`，源冻结 `9aa3bed892728f17c70d2f86d1fe07db10a718b8`。
- 定向复核：使用卡面专用 `vitest.isolated.config.ts`，1 file / 1 test passed；真实 CanonicalScriptBodyEditor caller、合法 typed 悬空 self 输入与两针三态反控证据均核对通过。
- 质量证据：相邻 18 文件全绿；全包唯一失败为冻结点既有 `number-field-adoption`（`command-form-controls.tsx@Num expected 37 to be 39`），已由基线复现；typecheck、lint 0/0/0、diff-check 与白名单核对通过。
- 收口：`accept`，状态更新为 `done`。未修改产品、旧测试、配置或 baseline。
