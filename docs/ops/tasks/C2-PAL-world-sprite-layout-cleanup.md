# C2-PAL - PAL 大世界特殊精灵布局清洗

Status: draft
Phase: phase2
Capability: C2 / MG2
Coding Owner: Codex（设计三签齐后）
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Unavailable Agents: none
Branch: 当前工作分支

## 目标

修复 PAL 迁移器把 `0x65` 换装资源一律猜成“四向 × 每向 3 帧”的上游缺陷，使物理帧不足的特殊动作/静物资源按可证明的真实布局生成；首个用户可见验收点是 `sprite.pal.541` 不再冒充行走图，场景实例与 `setActorSprite` 只引用同一个静态用途定义。

## 范围

- 范围内:
  - 迁移前建立与场景/脚本遍历顺序无关的大世界精灵布局注册表。
  - 清洗 A7-3W 已冻结的 13 条“声明帧覆盖大于物理有效帧”的 C2 数据债：
    `236, 242, 273, 361, 379, 385, 394, 541, 550, 627, 630, 631, 632`。
  - `0x65` / `0x1A field=2` 只解析已审计的语义定义，不再自行创造 `directional/3`。
  - 必要的 PAL-only 明示 overlay、迁移回归、全量重迁、baseline/MG2 合并和二跑零计划。
- 范围外:
  - 不修改 `SpriteDef` schema、Reforge 取帧公式、编辑器布局 UI 或资源二进制。
  - 不把全部 580 个定义重新分类，不在证据不足时清洗其余 13 个“物理容量碰巧足够”的 `0x65-only` 定义。
  - 不借本卡把 C2 能力格改状态，也不批量创建未考证的命名姿势。
  - 不把固定循环 auto 脚本动作化；该独立高风险后续已登记为 `docs/phase2/design-backlog.md` 议题 16。
- 明确不做:
  - 不直接手改 `projects/pal` 生成产物。
  - 不以 `frameCount >= 12`、资源编号、标签或角色外观猜测四向布局。
  - 不复活数字资源旁路、AssetId 文件名推导或运行时特例。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：迁移缺陷必须先修上游并重生成；migration/asset semantics 属三方必审，三签前不得改实现。
  - `docs/phase2/READ-FIRST.md`：PAL 是迁移试炼场；编辑器/引擎不承载迁移器特例。
  - `docs/ops/tasks/A7-3W-world-sprite-asset-closure.md:101-116`：13 条布局债被明确保留并排除出 A7-3W，不得拿旧卡签字冒领本清洗。
  - `docs/phase2/capability-map.md:82`：C2 已登记“特殊动作帧混标在行走布局”的数据欠账。
- 代码锚点(`file:line`):
  - `packages/migrate/src/migrate-content.ts:1675-1715`：`spriteRef` 用场景 `nSpriteFrames` 建定义；`spriteIdForNum` 却把未登记的 0x65 目标硬写成 `directional/3`。
  - `packages/migrate/src/migrate-content.ts:1865-1873`：当前遍历次序会先翻脚本后登记场景精灵，导致结果依赖遍历顺序。
  - `packages/migrate/src/translate-events.ts:1074-1083`：0x65 只表达 `setActorSprite`，opcode 本身没有布局信息。
  - `packages/migrate/src/pal-migration-integration.test.ts:232-246`：13 条历史 layout debt 基线。
- 已知坑 / 审计文档:
  - `sprite.pal.541` 物理仅 1 帧；`data/extracted/data/scene/266.json:78-93` 明示 `nSpriteFrames=0`。
  - 当前产物同时有错误 `sprite-541 directional/3` 与正确 `sprite-541-f0 static`；脚本引用前者、场景引用后者。
  - 26 个 `(0x65 换装)` 补充定义的布局都不是由 opcode 证明；其中本卡 13 个连 12 个物理帧都不足，确定不可能是完整四向三帧。
  - 另外 13 个容量足够的目标 `193,228,232,245,521,531,532,533,534,538,563,576,607` 仍需逐项语义证据，不能因“未越界”就宣布正确。
- 不得重新引入:
  - 迁移遍历顺序决定定义、0x65 默认四向、运行时按 PAL id 修正、直接编辑生成产物。
- 相关测试:
  - `packages/migrate/src/migrate-content.test.ts`
  - `packages/migrate/src/translate-events.test.ts`
  - `packages/migrate/src/pal-migration-integration.test.ts`
  - `packages/migrate/src/migration-plan.test.ts`
  - `packages/migrate/src/migration-validate.test.ts`

## 验收条件

- 功能:
  - 布局注册先于脚本翻译建立，输入场景/脚本遍历顺序变化不改变产物。
  - 0x65/0x1A 只引用注册表中已考证的定义；无证据目标 fail-loud 或进入明确 PAL overlay，不再默认 `directional/3`。
  - 13 条确定债全部满足“布局声明需要的物理帧数 ≤ 实际有效帧数”，且每条都有来源证据/overlay 注释。
  - 541 只保留一个 static 语义定义；s266 场景和 s192 的 `setActorSprite` 引用同一 id。
  - 其余容量足够但未考证的 13 个定义不被启发式改写。
- 测试:
  - 单测覆盖：0x65 先出现而静态场景后出现、0x65-only 单帧、显式四向、输入顺序打乱、共享 asset 多语义冲突。
  - PAL 集成门禁覆盖 13 条全集、定义引用闭包和所有 directional 物理帧需求；例外只能来自可审查白名单。
  - 全量 migrate 定向/全套测试、相关包 typecheck、Biome、`git diff --check` 全绿。
  - 重迁后执行 MG2 二次迁移，计划严格 `writes=0/deletes=0/conflicts=0`。
- 文档:
  - 更新本卡和必要的迁移/数据审计；不提前修改 capability-map 的 C2 状态。
- 视觉 / 手工验证:
  - 编辑器精灵工作台核对 541 不再出现四向缺帧槽；其静态原始帧、用途定义、脚本使用位置一致。
  - 抽查至少一个真实四向换装与一个多帧特殊动作，确认没有被清洗成错误静态资源。

## 推进签字

签字是阶段门禁。开卡任务必须集齐三方签字才能推进；缺签只能由用户明确豁免。`Status` 字段不能替代签字。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-20）**。只读复现 541 的遍历顺序缺陷并全量统计 26 个 0x65 补定义；同意“预扫描注册表 + 证据化 PAL overlay + 13 条确定债先收敛”，拒绝帧数启发式和手改生成产物。实现与验收可行，但 Kimi/GLM 未签前不得改 migrate 实现。
- Kimi: **agree（2026-07-20;附 R1-R3 build 必落钉,见「主审立场」）**。根因与方案逐项核对并抽查
  代码/源数据:`spriteIdForNum` 对未登记 0x65 目标无证据硬写 `directional/framesPerDir:3`
  (migrate-content.ts:1703-1717)实证;遍历顺序缺陷(spriteRef 先脚本后场景时默认布局抢占
  primaryLayout)成立;scene/266.json:78-93 的 541 声明 `nSpriteFrames=0` 静态实证。预扫描注册表、
  541 稳定 id 合并、共享 asset 多 definition 边界与 0x65-only 显式 overlay 均成立;
  13 条确定债(声明需求>物理帧,可证伪)先收敛、其余 13 个保持加门禁的保守分界正确。
  无架构 counter。
- GLM: **agree（2026-07-20;附 G1-G3 build 必落,见下）**。独立复算全部 26/13/13 清单 + 物理帧解码逐项验证 + 代码逻辑审查（读 migrate-content.ts spriteIdForNum/spriteRef 逐路径推演）。

  **基线独立复算** ✅：
  - **26 个 0x65 补定义**：独立 grep sprites.json 中 label 含 `原精灵 N(0x65 换装)` 的 directional 定义 = 26 个 ✅
  - **13 条确定债**（物理帧 < `framesPerDir*4`=12）：`236,242,273,361,379,385,394,541,550,627,630,631,632` 全 13 项物理帧逐个 gzip 解码验证（236=1/242=5/273=4/361=5/379=5/385=2/394=2/541=1/550=2/627=4/630=4/631=7/632=7），与 pal-migration-integration.test.ts:223-237 `PAL_LAYOUT_DEBT` 基线逐行匹配 ✅
  - **另外 13 个容量足够候选**：`193,228,232,245,521,531,532,533,534,538,563,576,607` 全 13 项物理帧 ≥12（最小 12，最大 64）✅
  - **541 特别验证**：物理仅 **1 帧** + scene 266 `nSpriteFrames=0` + 当前产物双定义（`sprite-541 directional/3` 错误 + `sprite-541-f0 static` 正确）✅
  - 580/559/21/636/77 总数与 A7-3W 冻结基线一致 ✅

  **代码逻辑审查** ✅：
  - **migrate-content.ts:1703-1717 `spriteIdForNum`**：对 0x65 未登记目标硬编 `directional/framesPerDir=3`——**根因确认**。任何 0x65 目标只要不在场景循环已注册表中，就被猜成四向×3 帧 ✅
  - **migrate-content.ts:1677-1696 `spriteRef`（场景路径）**：按 `eo.nSpriteFrames` 建定义——`nSpriteFrames=0` 正确产 static。**遍历顺序决定结果**：场景先于脚本→正确 static；脚本先于场景→错误 directional ✅
  - **translate-events.ts:1074-1083**：0x65 只表达 `setActorSprite`，opcode 本身无布局信息 ✅
  - **pal-migration-integration.test.ts:223-237**：`PAL_LAYOUT_DEBT` 13 条 + :272 谓词 `framesPerDir*4 <= frames ? ok : debt` 与独立解码一致 ✅

  **场景声明覆盖** ✅：
  - 26 个 0x65 补定义中仅 **7 个有场景 eventObject 声明**，且**全部声明 `nSpriteFrames=0`**（场景数据本身说 static，与 directional/3 矛盾）✅
  - 3 个在确定债中（242@s193/379@s197/541@s266）；4 个在容量候选中（193@s20@s67/228@s196/232@s119@s124/245@s35@s37@s195）

  **G1-G3 build 必落（非阻塞，纳入 build 范围）**：
  - **G1（关键）**：**sprite-511 遍历顺序旁路**——511 是第 27 个 numeric 0x65 目标但不在 26 补定义清单中，因为场景路径恰好先注册了它为 static。这**本身是遍历顺序 bug 的活实例**——预扫描注册表须覆盖 511，确认其场景 static 定义不被脚本遍历覆盖。26 计数准确（只数 0x65 创建的补定义），但 511 的存在证明遍历顺序影响面比表面更广。
  - **G2**：**sprite-245 场景证据分类**——245 有 3 个场景声明 `nSpriteFrames=3`（s35/s37/s195），物理帧 13 ≥ 12。这**可能是场景支持的合法 directional**。建议 build 时把 245 显式标注"有场景 nSpriteFrames=3 证据"或从"容量足够待考证"移入"场景支持保留 directional"分类。
  - **G3**：**12 个 `-f0` static 伴生定义**——当前产物有 12 个 `*-f0` static 定义（18/95/163/193/228/232/242/365/369/379/408/541），其中 242/379/541 在确定债中。合并双定义时须保留 `-f0` static 作为正确语义，不误删。

  **总结**：26/13/13 清单全独立冻结 + 物理帧逐行解码匹配 + 根因 spriteIdForNum directional/3 硬编确认 + 遍历顺序 bug 实证（511 活例）+ 245 场景证据分类建议。**agree。**

- counter / 分歧处理: 当前无。GLM G1(sprite-511 遍历旁路)/G2(245 场景证据分类)/G3(12 个 -f0 伴生) build 必落。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex agree + Kimi agree + GLM agree），build allowed。** G1-G3 纳入 build 范围。

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理:
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. 迁移初始化阶段先读取全部 source scene event-object 声明和物理有效帧数，建立 `spriteNum -> evidence[]`，不依赖后续场景循环顺序。
2. 将“资源 asset”与“语义布局 definition”分开：同 asset 只有在源数据确实表达两种合法布局时才保留多 definition；仅由错误默认值造成的冲突必须合并。
3. `spriteIdForNum` 从纯注册表解析；PAL 中无法由场景声明证明的 0x65-only 特殊资源，必须由集中、逐项注释的 overlay 给出布局/用途，不允许一般化启发式。
4. 第一批只收敛 13 条确定不可能成立的布局债；其余 13 个 0x65-only 候选由审查方给出“本卡纳入/另卡考证”的清单，默认保持但增加防止新债的门禁。

### 已知风险

- 风险: 合并错误双定义时可能改变脚本所引用的稳定 id。
- 缓解: 先冻结引用图并在迁移边界统一映射；对 541 明确保留 `sprite-541` 作为共用稳定 id，测试所有消费者。
- 风险: 特殊动作资源可能是多姿势帧带，简单 static 只能安全显示 #0，不能表达全部语义。
- 缓解: 本卡只纠正虚假 directional；命名姿势仅在源脚本/overlay 有证据时生成，否则保留源帧容器，后续由 C2 姿势标注处理。
- 风险: 全量重迁覆盖用户在 PAL 工程的作者修改。
- 缓解: 严格走 MG2 baseline 三方合并和二跑零计划，不直接覆写 ours。

### 主审立场

- Reviewer: Kimi（架构/稳定 id/多定义边界）+ GLM（13 条数据证据/测试矩阵/MG2）
- 结论: **agree（2026-07-20）**——根因与四处重点全部成立,无阻塞;附 R1-R3 build 必落钉。
  1. **预扫描注册表**:正确且必需。当前 `spriteRef`(:1677-1696)按场景 `nSpriteFrames` 建定义、
     `spriteIdForNum`(:1703-1717)对未登记 0x65 目标无证据默认 directional/3;脚本先于场景登记时
     默认布局抢占 `primaryLayout`,场景声明只能挤进 `-f0` 冲突定义——541 的"错误 directional/3(脚本引)
     + 正确 static(场景引)"双定义正是这个形态。初始化阶段先全量读取源声明与物理帧数、建立
     `spriteNum -> evidence[]`,产物与遍历顺序无关,是修根而非打补丁(铁律 10 合规)。
  2. **541 稳定 id 合并**:正确。保留 `sprite-541` 为唯一共用稳定 id(语义 id 不变,布局从虚假
     directional 修为证据 static),错误 directional 定义删除;s266 场景实例与 s192 `setActorSprite`
     归并到同一 static 定义。视觉上原引用本就只能显示帧 0(物理 1 帧),合并无可感知回归。
  3. **共享 asset 多 definition 边界**:正确。同 asset 仅在源数据确实表达两种合法布局(:1683-1685
     的真实 nSpriteFrames 分歧)才保留多定义;由错误默认值造成的"双定义"必须合并,不允许以
     "保持多定义"为名保留伪布局。
  4. **0x65-only 显式 overlay**:正确。无法由场景声明证明的 0x65-only 目标走集中、逐项编号注释的
     PAL overlay(布局/用途/证据),严禁"按帧数/编号/标签"的一般化启发式混入注册表;无证据目标
     fail-loud,不再默认 directional/3。13 条确定债(声明需求 12 > 物理帧,可证伪)先收敛,
     其余 13 个容量足够候选保持原样但加新债零增长门禁——保守边界与 A7-3W 的欠账记录一致。
- 必落钉(R,不阻塞签字,build 验收核对):
  - **R1**:541 合并必须保留稳定 id `sprite-541` 并删除错误 directional 定义;引用图在迁移边界统一
    映射,测试覆盖 s266 场景实例与 s192 `setActorSprite` 两个消费者及 `-f0` 旧 id 不再产生。
  - **R2**:overlay 必须是逐项编号 + 注释的集中清单(每项含布局/用途/证据出处),任何形式的
    "帧数/编号/标签启发式推断器"不得进入注册表或 fallback 链。
  - **R3**:13 条确定债修复后的布局每条都须有来源证据(场景声明/脚本用途/overlay 注释)写进迁移
    报告;PAL 集成门禁覆盖全集,例外只能来自可审查白名单;其余 13 个候选保持原样且有"新债零增长"
    集成断言。
- 是否建议进入 build: **是,待 GLM 数据证据复核签字后三签齐 build allowed;两签未齐不得实现。**

### 三方争议记录(按需)

- Codex: 支持预扫描证据注册表与显式 overlay；反对把 0x65 或物理帧数当布局推断器。
- Kimi: **agree**。预扫描注册表修根(s spriteIdForNum 无证据默认 directional/3 + 遍历顺序抢占
  primaryLayout 实证);541 保留稳定 id 合并且两消费者归一;共享 asset 多定义仅保留真实布局分歧;
  0x65-only 走逐项注释 overlay 禁启发式;13 条确定债先收敛、其余 13 个保持加门禁。
  R1(541 id 稳定+消费者测试)/R2(overlay 逐项编号注释)/R3(13 条逐条证据+新债零增长)必落。
- GLM: **agree**。26/13/13 清单全独立冻结（物理帧逐行 gzip 解码匹配 PAL_LAYOUT_DEBT 基线）；根因 spriteIdForNum directional/3 硬编确认；遍历顺序 bug 实证（sprite-511 活例——第 27 个 numeric 0x65 目标因场景先注册而漏入 26 计数但本身是遍历顺序 bug 的活例）。G1(511 遍历旁路)/G2(245 场景 nSpriteFrames=3 证据分类)/G3(12 个 -f0 static 伴生保留) build 必落。
- 用户拍板: pending

## 额度 / 代班记录(如适用)

- 缺席 Agent: none

## Build: 实现与自测

- Coding Owner: Codex（三签后）
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- 验证方式: pending
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-07-20 Codex: 只读审计确认 541 与同类 13 条布局债根因在 `spriteIdForNum` 的 0x65 默认四向和遍历顺序；建立本卡、冻结范围/验收并签 agree。Evidence: 本卡锚点及 PAL 26/13 统计。Next: Kimi + GLM 分别完成设计签字；两签未齐不得修改 migrate 实现。
- 2026-07-20 Kimi: 架构/稳定 id/多定义边界主审完成,签 **agree**(R1-R3 build 必落钉)。根因实证:
  `spriteIdForNum`(migrate-content.ts:1703-1717)对未登记 0x65 目标无证据硬写 directional/3,
  遍历顺序使默认布局抢占 primaryLayout 产生"错误 directional(脚本引)+正确 static(场景引)"双定义;
  scene/266.json:78-93 的 541 声明 nSpriteFrames=0 静态实证。预扫描注册表、541 稳定 id 合并
  (语义 id 不变/布局修证据 static/两消费者归一)、共享 asset 多定义仅保留真实布局分歧、
  0x65-only 逐项注释 overlay 均成立;13 条确定债(声明需求>物理帧,可证伪)先收敛、其余 13 个
  保持加新债零增长门禁的保守分界正确。R1(541 id 稳定+消费者测试)/R2(overlay 逐项编号注释)/
  R3(逐条证据+新债零增长)必落。Evidence:本卡主审立场、签字区、争议记录。Next:GLM 数据证据复核;
  两签未齐不得修改 migrate 实现或 projects/pal。未改实现文件。
- 2026-07-20 GLM: 数据/测试矩阵设计审查签 **agree**。独立复算：26 个 0x65 补定义（label `原精灵 N(0x65 换装)` directional 全量 grep = 26）；13 条确定债物理帧逐行 gzip 解码（236=1/242=5/273=4/361=5/379=5/385=2/394=2/541=1/550=2/627=4/630=4/631=7/632=7）与 PAL_LAYOUT_DEBT 基线逐行匹配；13 个容量候选全 ≥12（193=14/228=20/232=64/245=13/521=24/531=12/532=12/533=12/534=16/538=12/563=12/576=13/607=12）；541 物理 1 帧 + scene 266 nSpriteFrames=0 + 双定义确认。代码逻辑审查（读 migrate-content.ts:1703-1717 spriteIdForNum 硬编 directional/3 根因 + :1677-1696 spriteRef 遍历顺序决定 + translate-events.ts:1074 0x65 无布局信息）。**G1 关键**：sprite-511 是第 27 个 numeric 0x65 目标但因场景先注册为 static 而漏入 26 计数——遍历顺序 bug 活例，预扫描须覆盖；**G2**：245 有 3 场景 nSpriteFrames=3 可能合法 directional，建议标注；**G3**：12 个 -f0 static 伴生合并时保留。Evidence: 设计签字 GLM 行。Next: 三签齐 build allowed，交 Codex build。未改实现文件。

## 下一位 Agent 提示词

### 给 Kimi

```text
接手任务: C2-PAL PAL 大世界特殊精灵布局清洗
任务卡: docs/ops/tasks/C2-PAL-world-sprite-layout-cleanup.md
当前状态: draft；Codex=agree，Kimi/GLM=pending，build blocked
你的角色: Kimi，负责架构、稳定 id、多 definition/共享 asset 边界与迁移顺序压力测试
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本任务卡、docs/ops/tasks/A7-3W-world-sprite-asset-closure.md:101-116、docs/phase2/capability-map.md:82
已完成: Codex 只读复现 541（物理1帧、源场景 nSpriteFrames=0）与 0x65 默认 directional/3 根因，冻结 13 条确定 layout 债和“预扫描 registry + 证据化 overlay”方案；未改 migrate 实现。
请你做: 审查 registry 构建时点、541 稳定 id 合并、0x65-only overlay 边界、其余13个容量足够候选是否应纳入；把 agree 或 counter（含必改项和证据）直接写回任务卡的 Kimi 设计签、主审立场、争议记录和交接日志。
不要做: 不得开始实现、不得手改 projects/pal、不得拿 A7-3W 历史签字代替本卡签字。
输出要求: agree 或 counter + 理由；明确是否建议 build。Kimi/GLM 两签未齐不得推进。
```

### 给 GLM

```text
接手任务: C2-PAL PAL 大世界特殊精灵布局清洗
任务卡: docs/ops/tasks/C2-PAL-world-sprite-layout-cleanup.md
当前状态: draft；Codex=agree，Kimi/GLM=pending，build blocked
你的角色: GLM，负责 13 条数据证据、26 个 0x65 补定义覆盖、测试矩阵和 MG2 重迁门禁
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本任务卡、docs/ops/tasks/A7-3W-world-sprite-asset-closure.md:101-116、packages/migrate/src/pal-migration-integration.test.ts:232-246
已完成: Codex 只读复现 541 与遍历顺序根因，冻结 13 条确定 layout 债、另外13个容量足够待考证候选和上游重迁验收；未改 migrate 实现。
请你做: 独立复算 26/13 清单，逐项给出 13 条的场景声明/物理帧/脚本用途证据，压力测试“预扫描 registry + 显式 overlay”，补足回归与产物白名单；把 agree 或 counter（含必改项和证据）直接写回任务卡的 GLM 设计签、争议记录和交接日志。
不要做: 不得开始实现、不得直接修改生成产物、不得以物理帧数启发式猜布局。
输出要求: agree 或 counter + 理由；明确测试矩阵与 build 建议。Kimi/GLM 两签未齐不得推进。
```
