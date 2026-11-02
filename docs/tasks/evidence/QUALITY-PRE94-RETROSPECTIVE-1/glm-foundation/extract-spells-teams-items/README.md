# extract spells + enemy-teams + items 复审（glm-foundation 模块 3 批 6）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页审计主题:pal-extract 的 parsers/spells.ts(309 行)、parsers/enemy-teams.ts(111 行)、parsers/items.ts(104 行)复审;基点 53db76bbb 线,body-invariance 基准=批5提交后 HEAD(0f65375d)。原文 Status: review(候选待 Codex 据证验收)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收;可复用范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 范围与证据

改动 0 处(零编辑批)。验证证据:body-invariance(同目录)三文件与整改前状态一致(零编辑批次恒真);tables.test.ts 全量 12 套件 89/89、0 fail/pending(补链 WORD.DAT 后;本批同时勘误批4/5 的套件级失败未披露问题,见各 README 勘误节);scoped biome 0/0/0。未跑全仓门。

## 发现

三文件复审无缺陷:梦蛇 295 追加、scriptDesc offset-10 union 陷阱、wObjectID 体系沿革、敌队翻译模式均有完整考证与 sdlpal 锚。八维要点:items 段界守卫 throw(T5 统一)、梦蛇排除逻辑与注释自洽、flags 拆位 bit6+6role;spells 梦蛇追加保序、union offset 考证、magicNumber 双索引体系说清;enemy-teams %10 守卫、0/0xFFFF 双空语义、翻译模式失映 warn+标空;magicmenu.c:191 陷阱注是关键领域知识。无新直接缺陷。

## 结论

零编辑批:89/89 tables 全量绿(该运行即批4/5 tables 套件失败的恢复件)+body-invariance 三文件恒真。唯一登记(不动):spells.ts 四同族函数截断策略不一致——parseSpells/parseObjectPlayers 界内 throw,parseObjectMagics/parseObjectPoisons floor(len/14) 静默截断(O-2 族,真实 chunk 尺寸固定),移交 Codex。

## 整改与复核

本批零整改。复验入口(原页给出,此处概述):在 packages/pal-extract 定向跑 src/resources/tables.test.ts,需 data/raw/{DATA,SSS,WORD}.MKF|DAT 软链。失效条件:三文件实现变化→重证;OBJECT 段布局变化→89 oracle 重跑。本轮治理未重跑任何命令;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2312B / SHA-256 4c018677063c2fd392d0a40cd74736538cf15a5ce5c818eec0df134d6f3f5b3a；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# extract spells + enemy-teams + items 复审（glm-foundation 模块 3 批 6）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线（body-invariance 基准=批5提交后 HEAD）
范围：`parsers/spells.ts`（309）、`parsers/enemy-teams.ts`（111）、`parsers/items.ts`（104）。

## 短回执

- **改动 0 处**：三文件复审无缺陷（梦蛇 295 追加/`scriptDesc` offset-10 union 陷阱/wObjectID 体系沿革/敌队翻译模式均有完整考证与 sdlpal 锚）。**唯一登记**：spells.ts 四同族函数截断策略不一致——parseSpells/parseObjectPlayers 界内 throw,parseObjectMagics/parseObjectPoisons `floor(len/14)` 静默截断(O-2 族,真实 chunk 尺寸固定)。
- **验证**：body-invariance 三文件与整改前状态一致（零编辑批次恒真）；**tables.test.ts 全量 12 套件 89/89**(0 fail/pending——补链 WORD.DAT 后;本批同时勘误批 4/5 的套件级失败未披露问题,见各 README 勘误节);scoped biome 0/0/0。未跑全仓门。

## 八维结论

| 维 | 结论要点 |
|---|---|
| A | items:段界守卫 throw(T5 统一)、梦蛇排除逻辑与注释自洽、flags 拆位 bit6+6role。spells:梦蛇追加保序、union offset 考证、magicNumber 双索引体系说清。enemy-teams:%10 守卫、0/0xFFFF 双空语义、翻译模式失映 warn+标空。无新直接缺陷。 |
| B | 三文件注释与实现/真值一致,零修改;magicmenu.c:191 陷阱注是关键领域知识。 |
| C/D | 单向依赖 _utils 常量+shared 类型;spells 的 magic/poison/player 三 union 视图各自独立 dump,复用 SPELL_OFF 恰当。 |
| E | 89 例真盘 oracle 覆盖三文件全部产出(本批实测)。 |
| F/G/H | 表驱动偏移常量清楚;出口全有 cli 消费;确定性 ✓。 |

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
cd "$WT/packages/pal-extract" && ../../node_modules/.bin/vitest run src/resources/tables.test.ts
# 需 data/raw/{DATA,SSS,WORD}.MKF|DAT 软链
```

失效条件:三文件实现变化 → 重证;OBJECT 段布局变化 → 89 oracle 重跑。
````
<!-- incremental-original-source:end -->
