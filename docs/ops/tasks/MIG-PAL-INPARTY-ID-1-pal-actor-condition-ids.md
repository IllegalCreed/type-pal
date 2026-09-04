# MIG-PAL-INPARTY-ID-1 - PAL 四条队伍角色条件稳定 ID 修复

Status: draft
Phase: phase2
Capability: N5 / C1 / MG2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: e2e-deferred
Unavailable Agents: none
Branch: main

## 目标

从 PAL current-publication 上游一次性修复 `s023/s202/s213` 中四条仍保存为 `"37"/"39"` 的
`inParty.actorId`，分别改为 `zhao-linger` / `anu`；同步重生成 current project 与 baseline，删除四条
发布豁免，并留下永久门禁，确保运行时能按稳定 ActorId 正确进入赵灵儿/阿奴在队分支。

## 范围

- 范围内:
  - 精确修复 current 与 baseline 两个表面的 3 个 scene / 4 个 `actorId` 值。
  - 用 migration transaction / current publication 同时发布两个表面，不直接手改 JSON。
  - 一次性 canonical rewrite 必须严格校验 scene/entity/flow path、旧值和新值；只为本次 current-only
    切换存在，发布成功后在最终实现提交前删除。
  - 删除 `PAL_CURRENT_KNOWN_REFERENCE_ERRORS` 的四条豁免，让正常跨引用校验直接 fail-loud。
  - 留下 PAL 专属永久 invariant：作者脚本条件中不存在数字 `inParty.actorId`，且所有 actor 引用命中
    当前 actors；覆盖 stages、stateMachine transition、嵌套 branch/loop/not/all/any。
  - 记录结构化 exact diff、current↔baseline 镜像、完整发布回执和删除转换器后的独立零计划。
  - 登记 s023/s202/s213 的后续 Q1 语义 E2E。
- 范围外:
  - 不修改原始 0x79 翻译语义；当前 stable-id translator 已正确。
  - 不修改 Reforge `inParty` 查询、Actor schema、队伍模型或脚本条件 schema。
  - 不新增 runtime 数字兼容、fallback、旧项目 upgrader 或 UI 遮罩。
  - 不顺手重写其他角色、场景、对话、脚本 label 或演出。
  - 不升级 contentVersion / SAVE_VERSION。
- 明确不做:
  - 不直接编辑 `projects/pal` 或 baseline 当作正式修复。
  - 不把 `"37"/"39"` 注册成伪 ActorId 来让校验通过。
  - 不永久保留仅服务旧四值的转换器或专属旧输入 fixture。
  - 不放宽引用校验或把四条 error 降为 warning。

## 前提真值门

### 一句话行为 / 工程前提

PAL 0x79 的操作数是角色名字 WORD；当前作者模型和运行时要求稳定 ActorId，因此四个数字字符串是
current-publication 未完成的一次性 canonicalization，而不是合法运行时身份或翻译器目标格式。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 0x79 遍历当前队伍，以 `PlayerRoles.rgwName[role]` 与 operand 比较；37 是赵灵儿名字 WORD，39 是阿奴名字 WORD，不是角色数组下标或 canonical ID。 | `reference/sdlpal/script.c:2230-2243`；`packages/migrate/src/source-facts.ts:38-52` |
| 第一阶段 | 第一阶段按 `rgwName[partyRole] === operand` 执行，同原版；已有 0x79 队伍条件测试。 | `packages/game/src/core/event-system.ts:4815-4816`；`packages/game/src/core/event-system.test.ts:4438-4444` |
| 当前二阶段 | translator 在 stable-id 模式已调用 `roleSlugForNameWord`，37→`zhao-linger`、39→`anu`；但 current/baseline 各仍有四个数字 actorId，publication 用四条精确豁免跳过错误。Reforge 只按 CharacterInstance id/template 精确匹配，数字恒不命中。 | `packages/migrate/src/translate-events.ts:1929-1948`；`packages/migrate/src/pal-migration.ts:394-422,494-505`；`projects/pal/content/scenes/s023.json:2107`、`s202.json:615,824`、`s213.json:3658`；baseline 同路径；`packages/migrate/src/pal-current-publication.ts:73-78,348-354`；`packages/reforge/src/main.ts:3944-3947` |
| 本任务目标 | current/baseline 只把四值替换为稳定 ID；四条豁免归零，正常引用校验通过，运行时无需兼容代码即可进入正确分支。 | 用户 2026-09-03 明确列为第二阶段必修；2026-09-04 要求按唯一队列继续；本卡 exact-diff 与验收条件 |

### 反证与替代解释

- 最强替代解释:
  - `"37"/"39"` 是允许的自定义 ActorId，运行时会自行映射。
  - 根因仍在 0x79 raw translator，应直接改 `translate-events.ts`。
  - 四条只是引用审计模型误报，保留豁免不影响实际剧情。
- 反证:
  - actors 中真实稳定 ID 是 `zhao-linger` / `anu`，没有数字 Actor；Reforge 查询只精确比较 id/template。
  - stable-id translator 与测试已经输出正确 slug；current publication 从 baseline 保留作者 scenes，只回灌
    raw-owned 分区和精灵 alias 更新，导致历史数字仍留在作者树。
  - 四条条件在运行时恒假，分别跳过赵灵儿购买剧情、阿奴守卫剧情以及赵灵儿学习技能 389。
- 什么观察会推翻当前前提:
  - primary source 证明 0x79 operand 是 role index 而非 name WORD；
  - current runtime 存在数字→ActorId 的另一条实际映射；
  - current publication 证明这四处来自本轮 generated scene 而非保留 baseline；
  - exact diff 出现四个 actorId 之外的内容变化。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: `inParty` 稳定 ActorId 语义正确，问题是非法输入。
  - 原版 / 第一阶段理解: 原版和第一阶段均直接按 name WORD 比较，37/39 映射已有一手证据。
  - extractor / 地图 / 数据解码: raw operand 无误；stable-id translator 已正确转换。
  - audit / test model: 引用错误由 actors 集合与 runtime exact match 双重证实，不是审计假阳性。

### 用户可见偏离

- 是否主动偏离已核真值: no（恢复原始队伍条件语义）
- `before -> after` 一句话: `赵灵儿/阿奴实际在队时四条剧情条件仍恒假 -> 对应分支按稳定角色身份正确命中`
- 代表场景:
  - s023/e433：赵灵儿在队时进入其专属购买/对白分支。
  - s202/e3392：阿奴在队时执行守卫与阿奴对白/行为切换分支。
  - s213/e3638：赵灵儿在队时与阿奴一样获得技能 389。
- 用户裁决: 2026-09-03/04 已明确列为第二阶段必修并要求 E6 后按序开始。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md` / `docs/phase2/READ-FIRST.md`：迁移缺陷只修上游、重生成、二跑零计划；正式上线前
    current-only，不保留旧 upgrader/fallback。
  - `docs/ops/tasks/MIG-PAL-ITEM-SCHEME-LABEL-1-pal-item-scheme-author-labels.md:108-110`：同型
    current-only 一次性 rewrite + 永久 invariant + 转换器退役先例。
- 代码锚点(`file:line`):
  - `reference/sdlpal/script.c:2230-2243`：0x79 原始语义。
  - `packages/game/src/core/event-system.ts:4815-4816`：第一阶段语义。
  - `packages/migrate/src/source-facts.ts:38-52`：名字 WORD → 稳定 ActorId。
  - `packages/migrate/src/translate-events.ts:1929-1948`：当前翻译已正确。
  - `packages/migrate/src/pal-current-publication.ts:94-109,131-179`：baseline-first 与分区回灌边界。
  - `packages/migrate/src/pal-current-publication.ts:73-78,348-354`：四条豁免。
  - `packages/content/src/validate-refs.ts:1090-1108`：actor condition 引用校验。
  - `packages/reforge/src/main.ts:3944-3947`：运行时精确 id/template 查询。
- 已知坑 / 审计文档:
  - current 与 baseline 各精确 3 files / 4 numeric actorId；全 PAL 两表合计只有这 8 个数字命中。
  - `projects/pal/content/actors.json:258,987`：目标 ActorId。
  - `packages/migrate/src/pal-current-publication.pal.test.ts`：current publication 真实 PAL 验证入口。
- 不得重新引入:
  - 数字身份、runtime compatibility、永久一次性 converter、豁免、只改生成产物、旧版本 fixture。
- 相关测试:
  - `packages/migrate/src/translate-events.test.ts:91-127`
  - `packages/migrate/src/pal-current-publication.pal.test.ts`
  - 新增 PAL stable actor-condition invariant 单元与真实 current/baseline 测试。

## 验收条件

- 功能:
  - current 与 baseline 的 s023/s202/s213 恰四值分别成为 `zhao-linger/anu/anu/zhao-linger`。
  - 全 PAL current/baseline 的数字 `inParty.actorId` 为 0；所有 inParty actor 引用命中 actors。
  - `PAL_CURRENT_KNOWN_REFERENCE_ERRORS` 及四条消息完全删除；publication 正常校验零 error。
  - raw stable translator 输出和未知 name WORD fail-loud 测试保持不变。
- 测试:
  - 永久 invariant 覆盖 stages、stateMachine transition、嵌套 condition，并有数字、悬空、漏路径反例。
  - 结构化 exact diff：current 与 baseline 各 3 scene / 恰 4 个 `.actorId` 值变化；其他 JSON 值、
    key、数组长度、命令顺序、TextId、entity/flow identity 全部不变；两表正文逐字镜像。
  - `pnpm --filter @type-pal/migrate test:fast`、`test:pal`、typecheck 通过。
  - `pnpm --filter @type-pal/migrate migrate:content --write` 原子发布成功；进程内 replay 为
    writes=0/deletes=0/conflicts=0/asset-deletes=0；删除一次性 converter 后独立 dry-run 仍零计划。
  - 非场景与资产内容零变化；baseline `_state.json` 只更新对应 3 scene hash。
- 文档:
  - 任务卡记录一次性转换器、发布回执、exact diff、退役证明和后续 Q1 用例。
  - 第二阶段队列移出本项并进入 ED-3/场景/商店生命周期。
- 视觉 / 手工验证:
  - 开发期不重复跑长剧情；登记 Q1 三个入口及业务断言。必要时可用脚本运行时金丝雀直接验证
    `inParty(zhao-linger/anu)` true/false 两态，但不得用人工点剧情替代迁移闭环。
- E2E 用例登记:
  - Q1/s023-e433：赵灵儿在队/不在队分别进入对应商贩分支，金钱与对白状态符合脚本。
  - Q1/s202-e3392：阿奴在队进入守卫对话并切换行为；不在队保持普通分支。
  - Q1/s213-e3638：赵灵儿在队时 role 1 学会 skill 389；阿奴 role 4 路径保持原样。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-09-04）**。原版/一阶段/translator/current publication/runtime 五层
    一手证据一致；current/baseline 独立 census 各 3 files / 4 values，豁免恰四条。
  - design: **agree**。使用临时 exact rewrite 经正式 transaction 发布，最终只留永久 invariant 并删除豁免；
    不改 schema/runtime/translator，不保留 converter。
- Kimi:
  - premise: pending
  - design: pending
- GLM:
  - premise: pending
  - design: pending
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: pending
  - 独立证据锚点: pending
  - 可证伪观察: pending
- counter / 分歧处理: 若四站点来源、name WORD 映射或 exact-diff 边界不成立，留 draft/blocked 重审。
- 缺签豁免: N/A
- build 准入结论: **blocked（等待 Kimi、GLM 独立 premise/design 签字）**

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: pending
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. **根因层不误修**：raw 0x79 translator 已正确，不再改它。问题只发生在 baseline-first 的 current
   publication 没有把历史作者 scene 的数字条件纳入一次性 stable-ID canonicalization。
2. **一次性 exact rewrite**：临时纯函数持有四条强类型地址、期望旧值和目标值；缺站点、多站点、旧值漂移、
   目标已部分改写或任何额外命中均 fail-loud。它接在作者 scenes 进入 alias/publication 之前，只用于产生
   本次 target，并经正式 migration transaction 同时写 current/baseline。
3. **最终树只留 invariant**：发布后删除 rewrite 函数及旧输入专属测试；永久断言递归扫描所有作者脚本
   condition，拒绝数字 ActorId 和悬空 ActorId。正常 `validateProjectReferences` 不再有豁免。
4. **差异可证明**：保存发布前 Git 基线，结构化比较 current 与 baseline，各自只允许 4 个 actorId 叶值变化；
   baseline state 只允许 3 个 scene hash 更新，assets/maps/actors/locale 等全部零差异。
5. **行为验证分层**：本卡证明身份、引用和运行时条件 true/false；长剧情观感在 Q1 集中验证，避免逐卡
   重跑 s023/s202/s213。

### 已知风险

- 风险: 把 generated scenes 整体覆盖 baseline，丢失作者编辑。
  - 缓解: 只改四个精确叶值，结构化 exact diff 禁止其他变化。
- 风险: 临时 converter 成为永久 compatibility 层。
  - 缓解: done 门要求 converter/旧输入 fixture 零命中，删除后再独立 dry-run 零计划。
- 风险: 只扫 branch body，漏 state transition 或复合 condition。
  - 缓解: invariant 覆盖两种 flow、递归命令臂和 all/any/not；反例测试逐类钉住。
- 风险: 直接删豁免后只看到报错，未修真实产物。
  - 缓解: 先通过正式 transaction 更新 current/baseline，再删除 converter/豁免并跑完整 publication。
- 风险: 修复触发意外剧情分支，表面像行为变化。
  - 缓解: before/after 与三场景 Q1 断言明确；这是恢复已核实 0x79 语义，不是新产品行为。

### 主审立场

- Reviewer: Kimi（current-only 架构、rewrite 退休、exact-diff）；GLM（四站点 census、递归覆盖、发布矩阵）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: premise verified / design agree；支持一次性 exact rewrite + 永久 invariant，反对 runtime 兼容。
- Kimi: pending
- GLM: pending
- 用户拍板: 2026-09-03/04，本项属于第二阶段必修并在 E6 后按序开始。

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
- 浏览器 / 手工检查: pending（剧情观感按 E2E 延后）
- 跳过的检查及原因: pending

## 资源生成记录(如适用)

- Generation Owner: N/A
- 生成目的 / 替换对象: N/A
- 提示词要点 / 风格约束: N/A
- 输出路径: N/A
- 尺寸 / 格式 / 透明背景 / 调色约束: N/A
- 资源登记位置: N/A
- 验证方式: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: e2e-deferred
- 验证方式: Q1 集中验证三场景条件分支；本卡只做数据/runtime 金丝雀。
- 集中 E2E 用例 / 批次: s023/e433、s202/e3392、s213/e3638。
- 截图 / 像素检查路径: 待 Q1。
- 结论: pending（不阻塞本卡的数据/运行时正确性收口）
- 未完成项: Q1 视觉/剧情节拍抽验。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: ED-3 统一引用边 + 场景/商店生命周期。

## 交接日志

- 2026-09-04 Codex: E6-1 用户验收后按唯一队列开本卡；完成原版、一阶段、stable translator、
  current-publication、runtime 与 current/baseline census 六向核验，签 premise verified/design agree。
  Evidence: 本卡真值矩阵。Next: Kimi/GLM 独立设计审查；签字未齐不得修改迁移实现或生成产物。

## 下一位 Agent 提示词

### Kimi

```text
接手任务: MIG-PAL-INPARTY-ID-1 PAL 四条队伍角色条件稳定 ID 修复
任务卡: docs/ops/tasks/MIG-PAL-INPARTY-ID-1-pal-actor-condition-ids.md
当前状态: draft
你的角色: current-only migration 架构、一次性 rewrite 退休与 exact-diff 主审；完成 premise/design 签字。
先读: AGENTS.md；docs/phase2/READ-FIRST.md；任务卡；reference/sdlpal/script.c:2230-2243；packages/game/src/core/event-system.ts:4815-4816；packages/migrate/src/source-facts.ts:38-52；translate-events.ts:1929-1948；pal-current-publication.ts:73-78,94-109,131-179,348-354；MIG-PAL-ITEM-SCHEME-LABEL-1 同型先例。
已完成: Codex 已确认 current/baseline 各 3 scene/4 numeric actorId，stable translator 已正确，runtime 只认稳定 id，根因位于 baseline-first current publication；尚未改实现或产物。
请你做: 独立读取一手证据，反证数字是否可能合法、根因层是否正确；审查临时 exact rewrite→正式 transaction→删除 converter→永久 invariant→零计划方案，给出 exact-diff/退休/回滚必落钉。把 premise verified/design agree 或 counter、直接证据、可证伪观察和必改项写回任务卡。
不要做: 不修改实现/baseline/projects/pal；不代签 GLM；不引入 runtime fallback/upgrader；签字未齐不得 build。
输出要求: 提交并推送任务卡签字，回复 commit hash 与 agree 或 counter，并给 GLM 下一位提示词。
```

### GLM

```text
接手任务: MIG-PAL-INPARTY-ID-1 PAL 四条队伍角色条件稳定 ID 修复
任务卡: docs/ops/tasks/MIG-PAL-INPARTY-ID-1-pal-actor-condition-ids.md
当前状态: draft
你的角色: 四站点数据 census、递归 invariant 与发布测试矩阵审查；完成 premise/design 签字。
先读: AGENTS.md；docs/phase2/READ-FIRST.md；最新任务卡；source-facts.ts:38-52；translate-events.test.ts:91-127；pal-current-publication.ts；pal-current-publication.pal.test.ts；current/baseline 的 s023/s202/s213 四处。
已完成: Codex 已核 current/baseline 各 4 值且豁免恰四条；方案只改四叶值、删除临时 converter 和豁免、保留永久递归门禁。
请你做: 独立复算站点、路径、37/39 映射、current↔baseline 镜像；压力测试 stages/stateMachine transition/嵌套 branch-loop/all-any-not 覆盖、旧值漂移/缺站/多站 fail-loud、exact diff、baseline state hash、正式 write+replay+删除 converter 后 dry-run。把 premise verified/design agree 或 counter、证据、可证伪观察和必改项写回任务卡。
不要做: 不修改实现或生成产物；不代签 Kimi；不放宽引用校验；签字未齐不得 build。
输出要求: 提交并推送任务卡签字，回复 commit hash 与 agree 或 counter。
```
