# game core 3o/3n 余量四件复审（glm-foundation 模块 5 批 4）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页审计主题:game 的 core/{player-poison-state,scene-system-search,palette-fade,scene-identity}.ts(142/98/328/13 行)B–G 补维;均处 Codex 3o/3n+后续审计深切片范围(palette-fade 另经数值审计与 ColorFade 输入域两轮);基点 53db76bbb 线(body 基准=批3提交后 HEAD)。原文 Status: review(候选待 Codex 据证验收)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收;可复用范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 范围与证据

零整改批(改动 0 处)。验证证据:body-invariance(同目录)四文件一致;定向 27 套件 90/90、0 failed suites(directed.json:game-state 61 含毒/身份合同+palette-fade 17+scene-system-search 12;poison 另有 status-poison-equip.glm-q/event-opcode-player 族相邻覆盖);scoped biome 0/0/0;diff --check 干净。未跑 game 全包/全仓门。

## 发现

核验要点:poison 的 level≥99 伪毒/ByKind-ByLevel 分工/Wear 与首空槽差异已显式挂 GAME-PLAYER-POISON-SLOT-COMPACTION-1(与看板 draft 一致,不做行为改动);search 的 13-cell/mode*6-4/h-parity 与 c3d943dde 注释修正一致;palette-fade 的 fade60/fade63 量化封顶、freeze 冻屏语义(真机 trace 档案)、approach 等价边界声明全部与实现吻合;scene-identity 单一存储+loadSceneCommon 手动同步说明准确。B 维四文件注释为仓内标杆级:poison 的 sdlpal 行锚+原版早期 bug 考据、palette-fade 的量化/冻结/等价边界声明、identity 的写路径分工——零修改。C:poison/word 类模块单例写入 Owner 唯一(setObjectPoisons);palette-fade 纯函数构造器+原地 mutate 边界清楚;identity 单变量单写者。

## 结论

零整改批:B–G 八维作者主张全部通过,零代码/注释改动;90/90 定向绿+body-invariance 四文件恒真。登记(不动):_DIR_WEST 未用枚举锚 nit(4 向枚举完整性锚,有意保留);poison 槽压缩差异归既有 draft 卡(本批未触碰)。

## 整改与复核

本批零整改。复验入口(原页给出,此处概述):在 packages/game 定向跑 palette-fade/scene-system-search/game-state 三测试。失效条件:四文件实现变化→重测;palette.c 真值或毒槽裁决变化→对应注释复核。本轮治理未重跑任何命令;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2840B / SHA-256 8b9f4ee210ae3cd3c7e6d9d32cda4419fe440e931a5a94a6296f713aaab5d516；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# game core 3o/3n 余量四件复审（glm-foundation 模块 5 批 4）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线（body 基准=批3提交后 HEAD）
范围：`core/{player-poison-state,scene-system-search,palette-fade,scene-identity}.ts`（142/98/328/13 行）。均处 Codex 3o/3n+后续审计深切片范围（palette-fade 另经数值审计与 ColorFade 输入域两轮），本批为 B–G 补维轮。

## 短回执

- **改动 0 处**：四文件零缺陷。核验要点:poison 的 level≥99 伪毒/ByKind-ByLevel 分工/Wear 与首空槽差异已显式挂 GAME-PLAYER-POISON-SLOT-COMPACTION-1(与看板 draft 一致,不做行为改动);search 的 13-cell/mode*6-4/h-parity 与 c3d943dde 注释修正一致;palette-fade 的 fade60/fade63 量化封顶、freeze 冻屏语义(真机 trace 档案)、approach 等价边界声明全部与实现吻合;scene-identity 单一存储 + loadSceneCommon 手动同步说明准确。
- **验证**：body-invariance 四文件一致;定向 **27 套件 90/90、0 failed-suites**(game-state 61 含毒/身份合同 + palette-fade 17 + search 12;poison 另有 status-poison-equip.glm-q/event-opcode-player 族相邻覆盖);scoped biome 0/0/0;diff --check 干净。未跑 game 全包/全仓门。

## 八维结论（B–G 补维重点）

| 维 | 结论要点 |
|---|---|
| B | 四文件注释为仓内标杆级:poison 的 sdlpal 行锚+原版早期 bug 考据、palette-fade 的量化/冻结/等价边界声明、identity 的写路径分工——零修改。 |
| C | poison/word 类模块单例写入 Owner 唯一(setObjectPoisons);palette-fade 纯函数构造器+原地 mutate 边界清楚(colors=gs.palette.colors,快照防别名有 cloneColors 保证);identity 单变量单写者。 |
| D | 无重复知识;moveToward/solidColors 等 helper 私有且单一职责。 |
| E | 90 例含量化中点/非网格 approach/黑行独立快照(ColorFade 输入域批产物)、13-cell 手算 oracle、毒槽全生命周期。 |
| F/G/H | 命名/结构清楚;`_DIR_WEST` 下划线前缀为 4 向枚举完整性锚(有意保留,nit 登记);纯函数直测/时间经 nowMs 注入可测 ✓。 |

## 登记（不动）

`_DIR_WEST` 未用枚举锚 nit;poison 槽压缩差异归既有 draft 卡(本批未触碰)。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/core/palette-fade.test.ts \
  src/core/scene-system-search.test.ts src/core/game-state.test.ts
```

失效条件:四文件实现变化 → 重测;palette.c 真值或毒槽裁决变化 → 对应注释复核。
````
<!-- incremental-original-source:end -->
