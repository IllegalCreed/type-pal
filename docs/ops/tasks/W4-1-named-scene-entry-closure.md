# W4-1 - 命名传送落点闭环与迁移去重

Status: draft
Phase: phase2
Capability: W4 / MG2 / ED-3
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex + Opus
Unavailable Agents: none
Branch: current

## 目标

把当前堆在场景检查器里的“命名入口”从不可见、不可选、实际无人引用的派生表格，收口成真正的场景空间锚点：它不属于实体，但必须在对象树和画布中可见、可选、可拖动；`loadScene` 可以稳定引用它，编辑一个落点即可影响所有引用；PAL 迁移不得再把 `all.json` 重复扫描成 `from-shared*` 污染数据。

## 用户裁决

- 2026-07-15：命名传送落点不是实体；它是场景内的空间锚点。
- 2026-07-15：当前把所有落点直接堆在右侧、无法在画布中识别和选中的形态不可接受。
- 2026-07-15：接受改为“左侧落点分组 + 画布标记 + 选中后右侧检查器 + `loadScene` 真引用”的闭环形态。
- 数据迁移缺陷按项目铁律优先修上游，不允许手删 `projects/pal` 中的重复行冒充修复。

## 范围

- 范围内:
  - 明确 `SceneDef.entry` 是默认落点，`SceneDef.entries` 只保存额外的命名落点；二者都不是实体。
  - 为命名落点补稳定 id 与可读 `label` 的分离；脚本引用稳定 id，作者日常改显示名不改引用键。
  - `loadScene` 增加命名落点引用能力，并与默认落点、显式临时坐标形成互斥且可校验的三种目标模式。
  - 迁移器排除 `all.json` 的重复到达扫描，对静态 `loadScene + pos` 做确定性落点归一化、去重和引用改写。
  - 编辑器对象树、画布、检查器、命令表单、引用保护、保存校验与脚本树完整接通。
  - runtime、编辑器预览、迁移写盘门禁和 MG2 baseline 同步。
- 范围外:
  - 不把落点塞进 `EntityDef`，不赋予精灵、碰撞、触发页、巡逻或实体生命周期。
  - 不在本卡完成 ED-3 的全工程通用引用图；本卡只建立可被 ED-3 接管的落点引用边。
  - 不重命名或删除 `SceneDef.entry` 字段，不做无收益的全工程场景 schema 翻新。
  - 不删除“显式坐标”这一合法能力；它只用于一次性剧情落位或高级脚本，常规跨场景传送默认使用命名落点。
- 明确不做:
  - 不只画图钉而继续让脚本写死坐标。
  - 不只修 UI 而保留 `all.json` 污染和 `from-shared*` 覆盖。
  - 不让未知命名落点静默回退到默认落点；引用错误必须 fail-loud。
  - 不直接批量编辑 `projects/pal/content/scenes/*.json`。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：migration/schema/跨包公共接口必须三签；迁移缺陷必须先修上游、重生成并双跑零计划。
  - `docs/phase2/READ-FIRST.md`：稳定 id、单一干净模型、架构优先；禁止把下标或展示名当身份。
  - `docs/phase2/editor/editor-design.md:178-203`：Outliner 表达“场景里有什么”，Inspector 只显示当前选中项；进场点可视化属于编辑器叠加层。
  - `docs/phase2/decisions.md:112`：玩家、实体和 entry 的逻辑位置统一使用 `GridPos`。
- 代码锚点(`file:line`):
  - `packages/content/src/index.ts:134-135`：当前 `SceneDef.entries` 是 record，但 id 与显示名混在 key 中。
  - `packages/content/src/script.ts:73`：当前 `loadScene` 只有 `scene/pos/facing`，没有命名落点引用。
  - `packages/reforge/src/main.ts:629-696`：`switchScene` 已有 `spawn.entry` 解析雏形，但脚本 host 没把 entry 传进来，且未知 entry 会静默回退。
  - `packages/reforge/src/script-runner.ts:52,448-449`：host 公共接口仍只传 `pos/facing`。
  - `packages/editor/src/ui/App.tsx:866-881,1852-1932,2050-2094`：左树和画布只支持默认进场点；命名落点整表堆在场景检查器。
  - `packages/editor/src/ui/SceneCanvas.tsx:30-81,213-342,397-491`：现有默认进场点已证明“非实体 marker”选择、命中、拖动通路可复用。
  - `packages/editor/src/ui/CommandForm.tsx:498-562`：`loadScene` 表单只有默认/自定坐标两态。
  - `packages/editor/src/core/script-references.ts:51-250`：已有全脚本树 walker，可扩展落点引用边，禁止另写一套只扫场景内联 body 的残缺扫描器。
  - `packages/migrate/src/pal-migration-io.ts:32-54`：`eventsByScene[-1]` 是真实 shared，`[-2]` 是完整 `all.json` 全局地址索引。
  - `packages/migrate/src/migrate-content.ts:1358-1387`：当前到达扫描错误遍历 `eventsByScene` 全部键，把 `all.json` 也当来源。
  - `packages/migrate/src/migrate-content.ts:1735-1745`：所有负 source 都命名为 `shared`，`-1/-2` 计数又各自重置，造成覆盖。
  - `packages/migrate/src/translate-events.ts:1447-1497`：门模式把坐标折进 `loadScene.pos`，是归一化命名引用的上游入口。
- 已知坑 / 审计事实:
  - 当前 PAL：294 个有效场景共 1,247 个 `entries`，其中 726 个为 `from-shared*`。
  - 104 个场景存在同坐标重复，至少 244 个冗余落点；239 个 `from-shared*` 与正常 `from-sNNN*` 坐标重复。
  - 真实 `shared.json` 只扫描出 27 个到达站点，但会与后扫的 `all.json` 使用同名 key，被覆盖。
  - 当前生成内容有 966 条 `loadScene`：863 条写显式 `pos`、103 条走默认落点、0 条引用命名落点。因此右侧这张表目前不是运行真值。
  - `entries.start` 与 `SceneDef.entry` 重复表达默认落点；本卡迁移后不得继续双写。
  - 共享脚本和脚本分片可能承载 `loadScene`；只扫 `SceneDef.onEnter/entities` 会漏引用。
  - MG2 可能保留作者新增落点或作者脚本；只能管理迁移器保留前缀的落点，不能把“未引用作者落点”当错误删除。
- 不得重新引入:
  - `all.json` 同时充当全局地址索引和场景来源数据。
  - record key 既当稳定 id 又当作者可随意修改的显示名。
  - `entry` 与 `pos` 同时存在时靠优先级猜语义。
  - 入口引用失效后静默落到 `scene.entry`。
  - 画布 marker、树选择和右侧表单维护三套独立状态。
- 相关测试:
  - `packages/migrate/src/migrate-content.test.ts`
  - `packages/migrate/src/pal-migration-integration.test.ts`
  - `packages/migrate/src/migration-plan.test.ts`
  - `packages/content/src/validate-refs.test.ts`
  - `packages/reforge/src/script-runner.test.ts`
  - `packages/reforge/src/scene-transition.test.ts`
  - `packages/editor/src/core/script-references.test.ts`
  - `packages/editor/src/core/commands.test.ts`
  - `packages/editor/src/core/project-io.test.ts`

## 验收条件

### 数据与运行时

- `SceneDef.entry` 只表示默认落点；迁移器不再额外生成等价的 `entries.start`。
- 命名落点具有不可随显示名变化的稳定 id；`label` 只用于人读。
- `loadScene` 明确支持三态：默认落点、命名落点、显式坐标；命名落点与显式坐标不能共存。
- runtime 收到不存在的目标场景或命名落点时抛出带场景/id 的明确错误，不得静默回退。
- 命令级 `facing` 继续覆盖落点朝向；无覆盖时使用命名落点朝向，再回落默认落点朝向。

### 迁移与 MG2

- 到达扫描只把具体 scene slice 和真实 `shared.json` 当来源；`all.json` 只保留全局地址/控制流索引职责。
- 纯 PAL 生成中，所有静态 `loadScene.pos` 按“目标场景 + 完整 GridPos”确定性归一化：
  - 等于默认落点时改为默认模式。
  - 其余位置去重为一个命名落点，并把所有对应命令改为引用该稳定 id。
  - 同坐标多来源共用一个锚点，不再生成肉眼重复行。
- 迁移生成 id 使用保留前缀和确定性散列/稳定来源，禁止依赖数组顺序编号；散列碰撞 fail-loud。
- 纯生成产物中：`loadScene.entry` 全部可解析；迁移器生成的命名落点全部至少被引用一次；同一场景不存在重复 GridPos 的迁移落点；`from-shared*` 不再含 `all.json` 副本。
- MG2 在三方合并后的最终 target 上检查 dangling entry 引用。作者仍引用被迁移器删除的旧 `from-*` id 时必须阻断写盘并报告，不得强改或静默回退。
- 首次写盘计划可解释；命令内二跑与独立 dry-run 均为 `writes=0 deletes=0 conflicts=0`。

### 编辑器闭环

- 左侧场景树增加“传送落点”分组，包含“默认落点”和所有命名落点；它们与 sprite/zone 实体分组清晰区隔。
- 画布以轻量图钉/菱形 marker 显示所有落点；支持统一显隐、点选、树选定位和拖动。命名落点不重复绘制半透明玩家精灵。
- 右侧只显示当前选中落点：显示名、只读稳定 id、col/row/height、朝向、引用数量和可跳转的引用来源；场景检查器不再堆整张落点表。
- 新增落点从分组标题或工具按钮进入，创建后立即选中；改 label、移动、改朝向、撤销/重做、保存重开均走 Command。
- 被引用落点禁止直接删除，并列出引用；未引用落点可删。重命名 label 不改脚本；本卡不提供危险的稳定 id 随手改名入口。
- `loadScene` 表单提供“默认落点 / 命名落点 / 临时坐标”分段选择；命名模式列出目标场景落点的 label、id 和坐标。
- 脚本树把命名引用显示为人读 label；目标切换导致旧 entry 无效时明确重置到默认并进入一次 Command，不留下悬空状态。

### 校验、测试与视觉

- content/编辑器全脚本 walker 覆盖内联 stage、场景/实体绑定、共享脚本 chunk、分支臂和敌人编舞中的 `loadScene`。
- 表驱动测试覆盖三种 loadScene 目标、entry/pos 互斥、缺失场景、缺失 entry、朝向优先级、默认回退和 runtime fail-loud。
- 迁移测试固定修复前审计口径，并在修复后记录新的精确基线；至少包含 scene、shared、all 三来源反例和同坐标多来源去重。
- 编辑器测试覆盖创建、选择、移动、改 label/朝向、引用保护删除、undo/redo、保存重开和脚本表单三态。
- 运行 content/reforge/editor/migrate 四包 check、`pnpm check`、受影响文件 Biome。
- 6010 打开 PAL `s001`：树中可理解五个真实到达位置，画布 marker 与坐标一致；选择和拖动只改变所选落点，所有引用计数可解释。
- 6010 新建一个命名落点并让两条 `loadScene` 引用：移动一次，两条引用保持同 id；删除被阻止；改 label 后引用不断。
- 6051 实跑至少两条进入同一场景不同落点的门/楼梯，位置与朝向正确；开场、普通切场景和对话后切场景无回归。

## 推进签字

签字是阶段门禁。本卡触碰 migration、content 公共 schema、runtime host、编辑器和 capability W4，三方设计签不齐不得修改实现文件。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-15）**。根因和闭环面已定位：落点应是非实体空间锚点；默认落点与额外命名落点分责；稳定 id 与 label 分离；`loadScene` 真引用并 fail-loud；迁移必须排除 `all.json`、去重、改写脚本并在 MG2 合并后做引用门禁。实现可行，但必须按本卡全链落地，不能只做画布 marker。
- Opus: **agree（2026-07-15,附 R1-R3 必改 + S1-S3 建议,见主审立场）**。六问压力测试全过,独立地面重验:
  基线普查逐项吻合——**1,247** entries / **726** from-shared* / **104** 场景同坐标重复 / **244** 冗余 /
  **966** loadScene(863 pos + 0 命名 + 103 默认);shared 重普通我测得 **240**(卡 239,计数口径微差留 GLM
  对账);**新事实:37 个场景存在 entries.start 与 SceneDef.entry 双写**(migrate-content.ts:1736 实证)。
  代码锚点全坐实:switchScene:691-692 未知 entry **静默回退**默认落点(`def.entries?.[spawn.entry]` →
  undefined → `?? def.entry.pos`);迁移 :1364 遍历 eventsByScene 全键(**含 -2 = all.json 全量副本,每个
  到达点被双扫**),:1742 把所有负 src 统一命名 'shared' 且 :1739 计数器按 src 独立自增 → **-1 与 -2 产出
  同名 from-shared-N 键互相覆盖**——726 条污染的机理完整确认;host(script-runner:52/448)只传 pos/facing,
  switchScene 的 entry 参数"有雏形没接线"属实。裁定:非实体空间锚点(与 ED-4A 两轴同法理,锚点是第三类
  非实体对象、正确不入 EntityRef)、record key=稳定 id + label 人读(与 A7-0 catalog Record 键三合一同构)、
  loadScene 三态 XOR(与 sceneScriptOverrides 三态先例同构)、post-pass 归一化(在门模式 fold 后的最终
  绑定+chunks 上递归,复用全脚本 walker 不另写残缺扫描器)、plan.target 合并后 dangling 门禁(ED-4A
  漂移门禁精确同构)——全部成立。
- GLM: pending
- counter / 分歧处理: Opus 无架构 counter;R1-R3 为设计必补(loadScene 字段名 entryId 防三重 entry 同名/
  facing 链补 inheritFacing/迁移 id 函数域钉死为 target+pos),纳入 build 范围。
- 缺签豁免: N/A
- build 准入结论: **blocked（待 GLM 覆盖复核）**

### 进入 done 前:审查签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理: 无
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### A. 领域边界

```text
Scene（容器）
├── 默认落点 scene.entry
├── 命名落点 scene.entries[id]
└── EntityDef[]
    ├── 可见精灵实体
    └── zone 实体
```

- 落点是坐标锚点，不是 `EntityDef`。它没有精灵、碰撞、触发页、状态页或运行时实体 id。
- 默认落点是没有指定目标时的唯一兜底；命名落点只为显式引用存在。
- `entries` 的 record key 是稳定引用 id；对象内可选 `label` 才是作者看到和修改的名称。

### B. 单一 loadScene 模型

公共命令保持一个 `loadScene`，目标位置为互斥联合：

```ts
loadScene(scene)                       // 默认落点
loadScene(scene, { entry: entryId })   // 命名落点
loadScene(scene, { pos })              // 一次性显式坐标
```

- 实际 TypeScript 形状可保留当前扁平字段以缩小改动，但类型和 validator 必须保证 `entry XOR pos`。
- runtime host 不再用多个位置参数继续扩张，优先收口为共享 `SceneSpawn` 值对象；最终选择由 `switchScene` 单点完成。
- `ScriptStage.entry` 是“入场呈现契约”，与本卡的空间落点不同；代码命名和文档必须明确区分，避免再次把两个 entry 概念混在一起。

### C. 迁移归一化

1. 原始 source slice 只负责找可能的来源说明；`all.json` 继续服务地址和控制流，不参与到达计数。
2. 脚本翻译和门模式 fold 完成后，对最终场景绑定与 script chunks 做同一递归 post-pass。
3. post-pass 收集每条静态 `loadScene.pos`，以目标场景和完整 GridPos 分组；默认位置收敛为默认模式，其余组生成一个稳定命名落点。
4. 同组所有命令改为 `loadScene.entry`，删除内联 pos；生成 label 可用“从 s003 进入”等来源摘要，但引用只认稳定 id。
5. 迁移器保留前缀与作者 id 分域；MG2 只管理迁移前缀条目，作者新增落点不因暂时未引用被删除。

### D. 编辑器选择与引用

- 选择状态从“场景哨兵 / 默认 entry 哨兵 / entity id”扩为显式判别值，不能继续拼易碰撞字符串。
- SceneCanvas 接受统一 marker 列表和 `selectedAnchorId`；默认落点与命名落点复用命中/拖动逻辑，视觉样式可区分但行为一致。
- 现有全脚本 walker 扩展 `loadScene` 引用边，向 UI 提供引用数量、来源和删除保护；后续 ED-3 接管时删除窄适配，不保留第二张图。
- SceneInspector 只保留场景自身字段；AnchorInspector 成为落点唯一编辑入口。

### 已知风险

- 风险: `ScriptStage.entry` 与空间 entry 同名，API 很容易再次混淆。
  - 缓解: 公共类型使用 `SceneSpawn` / `entryId` 等明确名称；任务测试分别覆盖呈现契约和空间落点。
- 风险: 只遍历场景 JSON 会漏掉外置 chunk、共享脚本和分支臂。
  - 缓解: 复用全脚本 walker；纯产物扫描对全部命令递归计数并与迁移报告对账。
- 风险: 按顺序生成 `entry-1` 会让上游插入一个站点后全库 id 抖动。
  - 缓解: 迁移 id 基于稳定 tuple/source hash，碰撞即失败；label 与 id 分离。
- 风险: 删除旧 `from-*` 后作者脚本仍引用它，MG2 结构合并可能成功但语义悬空。
  - 缓解: 在 `plan.target` 上做 entry 引用闭包硬门禁，并加入作者漂移模拟测试。
- 风险: 多 marker 叠在同格时无法点选。
  - 缓解: 迁移生成点按 GridPos 去重；作者有意同格不同语义时由树选择，画布选中态仍定位同一位置。
- 风险: `label` 被错误当引用键，重命名后脚本断裂。
  - 缓解: UI 不开放稳定 id 随手改名；测试钉住改 label 后引用不变。

### 主审立场

- Reviewer: Opus（schema/runtime/UI 架构主审）+ GLM（迁移覆盖、基线和测试矩阵主审）
- 结论(Opus,2026-07-15): **agree — 六问逐项裁定**:
  1. **entry/entries 边界**:成立。`SceneDef.entry` 不动(默认落点)、`entries` 只存命名锚点,二者非实体
     ——与 ED-4A 两轴同法理(锚点是第三类非实体对象,不入 EntityRef);37 个场景的 entries.start 双写
     (实测)随迁移收敛,零 schema 翻新。
  2. **id/label 分离**:成立且必要。record key = 稳定引用键 = MG2 合并键(与 A7-0 catalog 同构);当前
     key 即显示名(from-s003-2)正是要修的病;UI 不开放 id 随手改名正确。
  3. **loadScene 三态 + SceneSpawn**:成立,附 R1/R2。XOR validator(entry⊕pos,双缺=默认)与
     sceneScriptOverrides 三态先例同构;SceneSpawn 值对象收口 host 参数(现状 host 只传 pos/facing,
     switchScene 的 entry 参数"有雏形没接线"——实证);未知 entry fail-loud 替换 :691-692 静默回退,正确。
  4. **迁移 post-pass**:成立,附 R3。扫描源修复直击实证机理(-2 全量副本被当来源双扫 + 负 src 统一命名
     'shared' 且计数器按 src 自增 → 同名键互相覆盖);post-pass 位于门模式 fold 后的最终绑定+chunks,
     按(目标场景,GridPos)分组、等默认收默认、其余去重成锚并改写引用——顺序正确(fold 是 pos 的上游
     入口,post-pass 必须在其后);复用全脚本 walker 不另写扫描器,正确。
  5. **编辑器闭环**:成立。选择态改显式判别值(结束字符串哨兵拼接)、统一 marker 列表复用已证明的默认
     进场点命中/拖动通路(SceneCanvas:30-81)、AnchorInspector 单一编辑面、walker 扩展引用边供删除保护
     ——与 ED-4A/编辑器设计 §5/§8 一致;marker 不画半透明玩家精灵符合"落点非实体"的认知一致性。
  6. **ScriptStage.entry 冲突 + 测试矩阵**:风险真实,R1 机械化解;测试矩阵行覆盖完整(三态×互斥×缺失×
     朝向×fail-loud + 迁移三来源反例 + 编辑器 CRUD),另补 R2 的门穿行朝向回归行。
- 必改项(R,设计层面补明,build 必落):
  - **R1 loadScene 引用字段名用 `entryId`,不用裸 `entry`**:仓库现已有三个 entry 语义——`SceneDef.entry`
    (默认落点对象)、`ScriptStage.entry`(X3-1 入场呈现契约)、本卡新增的命令引用。第三个再叫 `entry`
    是把冲突焊进公共 schema;`entryId`(或等价明确名)让类型、grep 与文档三层都可区分。验收/迁移小节中
    的 `loadScene.entry` 字样同步改写。
  - **R2 facing 链补 inheritFacing 并钉死次序**:验收现文"命令 facing > 命名落点朝向 > 默认落点朝向"
    **漏了 inheritFacing(门穿行方向延续)**——现行 resolveSceneFacing(:693-697)链中它真实存在,漏写会在
    build 期被当成可删。钉死为:**显式 facing > 锚点 facing(若有)> inheritFacing > 默认落点 facing**;
    迁移生成的锚点不带 facing(现状 entries 全 pos-only,实证),故门穿行行为与现状逐帧一致、零回归;
    作者显式给锚点设朝向时按作者意图覆盖走向。此链须有专测(带 facing 锚点 × 无 facing 锚点 × 门穿行)。
  - **R3 迁移 id 生成函数域钉死 = (目标场景, GridPos),与来源站点无关**:卡文"稳定 tuple/source hash"有
    歧义——若掺入来源站点,同锚多来源合并与来源增删都会 churn id。钉死:id = 迁移保留前缀 +
    确定性散列(targetScene, col, row, height);同坐标永同 id,上游坐标变更 = 新 id(旧引用由 plan.target
    dangling 门禁接住);碰撞 fail-loud。label 才允许携带来源摘要。
- 建议项(S,不阻塞):
  - S1 label 多来源摘要须确定性排序(label 非引用键但进 MG2 diff,不定序 = 重迁假 diff)。
  - S2 dev 面(dev-panel 跳场景/`?scene=`)裁量支持 entryId 落点,便于验证与复现(非验收项)。
  - S3 shared 重普通计数卡 239 vs Opus 实测 240,口径微差由 GLM 复核定权威数,连同修复后新基线一并落卡。
- 是否建议进入 build: **待 GLM 覆盖复核(迁移矩阵/基线/测试面);R1-R3 纳入 build 范围后 build**。

### 三方争议记录(按需)

- Codex: `agree`，采用非实体空间锚点、稳定 id + label、loadScene 真引用、迁移 post-pass 去重和合并后引用门禁。
- Opus: **agree**。六问全立(锚点非实体/id-label 分离/三态 XOR/post-pass 位序与扫描源修复/编辑器判别值
  选择态/walker 复用);基线普查独立坐实(1247/726/104/244/966=863+0+103,另发现 37 场景 entries.start
  双写);附 R1(entryId 防三重 entry 同名)/R2(facing 链补 inheritFacing——验收现文漏了门穿行延续)/
  R3(迁移 id 域=target+pos 与来源无关)+S1-S3。
- GLM: pending
- 用户拍板: 接受闭环形态；未授权缺签进入 build。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex + Opus
- 验证方式: pending
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-07-15 Codex: 完成现状审计并建立 W4-1。确认命名落点当前不是实体、没有画布闭环，且 PAL 迁移被 `all.json` 污染；全产物基线为 1,247 entries / 726 from-shared / 966 loadScene 中 0 条命名引用。Codex 设计签 `agree`。Evidence: 本卡上下文锚点与验收条件。Next: Opus 做 schema/runtime/UI 架构压力测试并签字。
- 2026-07-15 Opus: 设计主审签 **agree + R1-R3 必改 + S1-S3 建议**。独立地面重验:基线普查全吻合
  (1,247/726/104/244/966=863+0+103;shared 重普通 240 vs 卡 239 留 GLM 定口径)+新事实 37 场景
  entries.start 双写;switchScene:691-692 静默回退、迁移 :1364 全键遍历(-2 双扫)+:1742 负 src 同名
  'shared' 覆盖机理、host 未接线 entry——锚点全坐实。六问裁定全立(锚点非实体同 ED-4A 两轴法理/
  record key 同 A7-0 catalog 构/三态同 sceneScriptOverrides 构/post-pass 在 fold 后+复用 walker/
  判别值选择态/plan.target 门禁同 ED-4A 构)。R1=loadScene 字段名 entryId(仓库已有三个 entry 语义,
  第三个不得再叫裸 entry);R2=facing 链补 inheritFacing 并钉死"显式>锚点>inherit>默认"(验收现文漏门
  穿行延续,迁移锚点 pos-only 故零回归);R3=迁移 id 域钉死(targetScene,GridPos) 与来源无关(防同锚
  多来源/来源增删 churn)。Evidence: 主审立场+普查脚本输出。Next: GLM 迁移覆盖/基线/测试矩阵复核;
  三签齐后 Codex build;不得抢跑实现。未改实现文件。

## 下一位 Agent 提示词

```text
接手任务:W4-1 命名传送落点闭环与迁移去重,迁移覆盖/基线/测试矩阵复核(GLM)
任务卡:docs/ops/tasks/W4-1-named-scene-entry-closure.md
当前状态:draft;Codex agree + Opus agree(附 R1-R3 必改 + S1-S3),GLM pending(设计最后一签);build 准入 blocked
你的角色:GLM,迁移覆盖面/基线/测试矩阵复核;只改任务卡,不得改实现文件或生成产物
先读:AGENTS.md、docs/phase2/READ-FIRST.md、本卡全部(重点 Opus 主审立场 R1-R3)、packages/migrate/src/migrate-content.ts:1358-1387,1735-1745、packages/migrate/src/pal-migration-io.ts:32-54、packages/editor/src/core/script-references.ts
请重点复核(数据/测试面,与 Opus 的 schema/runtime/UI 面互补):
1. 基线对账:用独立脚本重扫 projects/pal——1,247 entries/726 from-shared*/104 同坐标重复场景/244 冗余/966 loadScene(863 pos+0 命名+103 默认)/37 场景 entries.start 双写;裁定 shared 重普通 239(卡) vs 240(Opus)的权威口径;
2. 污染机理复现:eventsByScene 键集实测(-1 shared 27 站点/-2 all.json),确认 -2 参与到达扫描的双算量与 from-shared 同名覆盖的丢失量——修复后预期 entries 总数/形态给出预测区间,作为 build 后对账基线;
3. 去重预测:按(目标场景,GridPos)分组 863 条 loadScene.pos,给出预期命名锚点数与"等于默认落点收敛为默认模式"的数量——build 产物直接对着这两个数验收;
4. R1-R3 测试形态:entryId 命名的静态扫描断言(全仓零 loadScene.entry 裸字段)、facing 四级链专测(带/不带锚点 facing×门穿行)、id 域纯函数测试(同 target+pos 跨来源同 id/坐标变更换 id/碰撞 fail-loud)各是什么;
5. 引用面完备:script-references walker 扩展后覆盖内联 stage/实体页/场景绑定/共享 chunk/分支臂/敌人编舞六类站点的 loadScene——反例集各至少一例;
6. MG2 面:entries record 按 key 合并、plan.target dangling 门禁与作者漂移模拟(作者引用被删 from-* id → 阻断)的测试落点;首写盘 plan 可解释+双跑零计划口径。
不要做:不得修改实现文件;不得进入 build;不得顺手改 projects/pal;不得改 A7-0 任务卡
输出要求:在本卡 GLM 设计签字行写 agree 或 counter+理由,补交接日志并提交;三签齐后 build 准入结论改 allowed(R1-R3+S1-S3 纳入 build 范围),交 Codex build
```
