# JS1 - 酒神一生九次限用与移除(持久化计数器)

Status: done（2026-08-05 Codex / Kimi / GLM 三方 accept 齐；实现提交 `19ce1ca7`，签字批次未提交）
Phase: phase2
Capability: B10 / skill / save
Coding Owner: Codex
Reviewer: Kimi + GLM(async)
User Ruling: 2026-08-04 用户拍板并纠正真值
Branch: chore/docs-migrate-cleanup

## 背景与用户裁决

用户纠正酒神(370)原版真值,并裁决必须实现持久化九次限制:

- 原版 `scriptOnUse`(L_43075)先扣 1 个酒(item 86,`0x20` RemoveItem,不足跳“酒不足”);
- `0x57`(script.c:0057)按**当前剩余真气 × 8** 计算伤害并**清空真气**;
- 一生只能使用 9 次,第 9 次成功后**移除技能**并提示 `"酒神咒"使用次数已用尽`
  (原版脚本 `0x56` RemoveMagic + dlg.13366;文本在 `data/extracted/lookup/strings.json:13368`,
  该块在原版命令流中无显式跳转引用,sdlpal 引擎亦无计数器,属原版引擎侧语义)。

之前的错误表述“按饮酒数/剩余酒量 × 8”来自 `pal-authored-overlays.ts` 注释与
`migrate-content.ts` lossy 备注,均已修正为“按剩余真气 × 8”。

## 范围

- content schema:`SkillData.lifetimeLimit`(一生限用次数);`WorldState.skillUseCounts`
  (charInstanceId → skillId → 已用次数,旧档缺省空)。
- 迁移 overlay:R13-6B `'370'` 增加 `lifetimeLimit: 9`;R13-6B rewind 同步移除
  (历史 6A 投影保持冻结);canonical content(projects/pal + baseline)重生成。
- 战斗核心:`CreateBattleInput.skillUseCounts` → BattleState 副本;成功施放(资源门全过)
  入账并排队 `skillUse` mutation;满 9 时 `removed=true` 且当步 notice
  `"酒神咒"使用次数已用尽`;计数已满的防御性门在消耗前拦截。
- BattleSession:`skillUseCounts` 透传;`writeBackPersistentEffects` 写回计数并
  从 `learnedSkills` 移除满限技能。
- main.ts 透传 `world.skillUseCounts`;save 归一化旧档补 `{}`。

## 实现与验证

- migrate fast:76 files / 562 passed / 5 skipped;oracle manifest 仅更新
  source-tree fingerprint + content root bytes(+26B = `lifetimeLimit:9`)。
- reforge:77 files / 781 passed(新增 9 次连续施放、第 10 次拦截、酒不足不计数、
  session 写回移除)。
- content:33 files / 391 passed;三包 typecheck 通过。
- canonical 重生成:`migrate:content -- --write` 一次写入 1 文件(writes=1/0/0),
  二次幂等 0 写;R13-Z 真实 dry-run 重跑仍 fail-closed 于 `208 sites / 208 observations`
  (无回归;酒神 4 个 lossy 站点的关闭属 R13-Z 证据绑定工作,另见 N3-1 卡)。

## 编辑器入口（2026-08-05 追加闭环，常规迭代免签）

用户指出：所有技能均已结构化，但 `lifetimeLimit` 在编辑器无入口。JS1 原范围只覆盖
content schema / 迁移 / battle-core / session / save，未含作者侧闭环。本次追加：

- `SkillTab.tsx` 基础区新增「一生限用」数字输入（留空 = 不限，空值删键，沿用
  UpdateSkillCommand 的 undefined 删键语义），附酒神 9 次说明 title。
- 新增单测「一生限用次数」：设置入账、清空恢复不限、undo/redo 复原。
- 验证：editor 单测 4/4（SkillTab）与全量 798/798 绿，editor typecheck 通过。
- 不改变 schema / runtime / 存档语义，实现提交与签字批次仍由用户决定提交时机。

## 复审签字

- Codex: **accept**（2026-08-05，Coding Owner 实现与自验收口）。实现提交 `19ce1ca7`；
  migrate 76 files / 562 passed / 5 skipped、reforge 77 files / 781 passed、
  content 33 files / 391 passed、三包 typecheck 通过；canonical 重迁一次写 1 文件、
  二次幂等 0 写；R13-Z dry-run 保持 fail-closed 208/208 无回归。接受 Kimi / GLM 复审
  记录项：`debug-owner.ts` 不入库；酒神 4 个 lossy 站点关闭归 R13-Z 证据绑定。
- Kimi: **accept**（2026-08-05，只读实现审查）。一手核对：
  1. **存档兼容**：`WorldState.skillUseCounts?`（charInstanceId→skillId→count）为可选字段，
     旧档 `ops.ts:123 ??= {}` 缺省空，不 bump SAVE_VERSION（与 collectValue/hostileAwareness
     先例一致）；`SkillData.lifetimeLimit?` 可选，缺省=不限。
  2. **计数点**：battle-core.ts:1064-1069 在全部资源门（限用门 :1002、MP :1011、金钱 :1018、
     物品 :1043）通过、扣减完成后入账——“资源门全过=真实施放”口径正确；酒不足（:1049-1057）
     不计数，与设计一致。
  3. **满 9 移除**：usesAfter>=9 → removed=true + 当步 notice `“酒神咒”使用次数已用尽`；
     write-back（battle-session.ts:2398-2411）写回计数并从 learnedSkills 移除。
  4. **防御性门**：battle-core.ts:1002-1009 在一切消耗（MP/物品/金钱）之前拦截，失败
     不吃任何消耗，防旧档/计数漂移。
  5. **overlay/rewind 对称**：lifetimeLimit:9 只在 `r13SixBExecution` 门控路径叠加
     （历史 6A producer 冻结）；rewind 要求其存在以剥离并缺则 fail-loud
     （pal-r13-six-b-rewind.ts:207-208）。
  6. **产物与测试**：projects/pal 370 含 lifetimeLimit:9 且 execution 分支正确；
     reforge battle 测试 144/144 绿（9 连放、第 10 次拦截、酒不足不计数、写回移除）。
  记录项（非反例）：`packages/migrate/debug-owner.ts` 调试脚本按卡内约定不入库；
  R13-Z 的 208/208 属既有 fail-closed 未回归，酒神 4 个 lossy 站点关闭归 R13-Z 证据绑定。
  未修改实现文件。
- GLM: **accept**（2026-08-05，schema/save/数据守恒审查）。一手核实：
  1. **schema 兼容**：`SkillData.lifetimeLimit?`（skill.ts:135 可选，缺省=不限）；
     `WorldState.skillUseCounts?`（character.ts:28 `Record<charInstanceId, Record<skillId, number>>`，
     可选）。旧档 `ops.ts:123 w.skillUseCounts ??= {}` 缺省空，**不 bump SAVE_VERSION**（仍=8），
     与 collectValue/hostileAwareness 先例一致 ✅。
  2. **final 产物**：skill 370 `lifetimeLimit=9` + `execution.player.prepare=
     [remainingResourceDamage mp ×8 consume:all]` ✅（与 R13-6B 酒神 MP×8 清 MP 设计一致）。
  3. **防御性门**（battle-core.ts:1133-1141）：在 MP/物品/金钱消耗**之前**拦截
     `usedBefore >= lifetimeLimit` → return 不吃任何消耗；注释"防旧档/计数漂移"✅。
  4. **计数点**（:1197-1203）：资源门**全部通过、消耗完成后**（:1194 slot.count 减、
     :1196 moneyDelta 减之后）`usesAfter = usedBefore + 1` 入账 ✅。
  5. **满 9 移除**（:1203-1213）：`removed = usesAfter >= lifetimeLimit` → 当步 notice
     `"酒神咒"使用次数已用尽` + pendingWorldMutations 排队 skillUse mutation ✅。
  6. **writeBack**（battle-session.ts:2440-2453）：`world.skillUseCounts[char][skill]=usesAfter`
     写回；`mutation.removed` 时从 `learnedSkills` 过滤掉该技能 ✅。
  7. **测试**：reforge battle 8 files / 195 tests 全绿（含 9 连放、第 10 次拦截、酒不足
     不计数、session 写回移除）✅。

  记录项（非反例）：R13-Z 208/208 fail-closed 是既有状态，酒神 4 lossy 站点关闭归 R13-Z
  证据绑定，不在本卡范围。未修改实现文件。

## 待办

- 三方复审已完成（Kimi / GLM 均于 2026-08-05 accept），本卡推进至 `done`，等待用户验收/收口。
- 本次签字批次（本卡 + design-backlog）未提交，与 R13-Z 工作树一起由用户决定提交时机。
- `packages/migrate/debug-owner.ts` 是调试脚本，不入库（提交前删除或保持忽略）。

## 下一位 Agent 提示词

无下一位 Agent 提示词，等待用户验收/收口（签字批次提交时机由用户拍板）。
