# JS1 - 酒神一生九次限用与移除(持久化计数器)

Status: build(Codex 自验完成;Kimi / GLM 异步补审中)
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

## 待办

- Kimi / GLM 按 schema/save 变更纪律异步补审。
- 未提交 git;与 R13-Z 工作树批次一起由用户决定提交时机。
- `packages/migrate/debug-owner.ts` 是调试脚本,不入库。

## 下一位 Agent 提示词

```text
复审任务: JS1 酒神一生九次限用(持久化计数器)实现审查
任务卡: docs/ops/tasks/JS1-jiu-shen-nine-use-limit.md
当前状态: build;Codex 自验完成,未标 done。
你的职责: 只读审查;输出 accept 或 counter。不得改实现文件。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡、N3-1 卡 R13-Z 节。
重点: SkillData.lifetimeLimit / WorldState.skillUseCounts 的存档兼容(旧档缺省空);
 成功施放计数点(资源门全过后)与满 9 移除;防御性门在消耗前;
 6B overlay 与 rewind 对称;canonical 重生成 + R13-Z 208/208 无回归。
输出: 签字 accept / counter 理由。
```
