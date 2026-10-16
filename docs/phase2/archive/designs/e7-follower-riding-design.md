# E7 · 大世界跟随者 + 显式骑乘 —— 设计(2026-07-07)

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: design-spec-v1 / 1.0.0

本页把历史设计正文接入 `design-spec-v1`，并保留 archive overlay。原始日期、方案语义、版本数字、冲突、未知项和链接均通过下方逐行引用保全；本页不授予当前产品、runtime、E2E、视觉或 coverage 信用。

## 问题与目标

- 历史设计问题/目标：E7 把队员作为一等实体接入 E6 authority；follow/script/mount 三态，mount 为父实体+局部偏移；s213 芦苇漂、s005 坐船案例；translate-events 翻译表与实现步骤。
- 文档身份：phase2 / archive；原始状态为 `archived`，当前有效性固定为 `historical`。
- 本次目标：让历史设计具备可检索的设计章节和历史边界，不把当时方案改写成当前合同。

## 真值与约束

- 固定源 revision：`45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA：`f29ca5c2e543edcd13c86d41189acc3721aecfcfb109d2beaa34b95a1888f50b`；原文 73 行、5934 bytes。
- 一手来源/正文锚点：docs/phase2/READ-FIRST.md:1-1; packages/reforge/src/main.ts:1-1; packages/game/src/present/follower-pos.ts:1-1；标题锚点：6:E7 · 大世界跟随者 + 显式骑乘 —— 设计(2026-07-07), 11:0. 缘起, 15:1. 诊断:phase-1 为什么「非常混乱」(作者原话), 25:2. 架构决策:队员并进 E6 定位权威, 40:# 2.1 mount 的「局部偏移 = 局部位置」(架构完备,实现按需), 44:3. 两个骑乘案例(现状全 `unmigrated`), 46:# s213 试炼窟遗迹 · 芦苇漂(interactive), 50:# s005 码头市集 · 赵灵儿+李逍遥坐船(cutscene)。
- 当前阶段证据：本批只做文档全文读取、语义分层和字节保全；current contract 必须回读继任规范、当前代码和真实调用域。
- 不可违反的约束：历史状态词只描述原文时点；旧 schema、迁移计划、done/待审标签和演出设想不得单独证明今天的实现。
- 未知与冲突：
- 两个案例正文标记为 unmigrated；“待实现”和杜绝清单是历史设计约束，不是当前场景行为证据。
- trail index、walking/frozenOffset 等旧想法被排除，但需以当前 follower/mount 实现确认。

## 方案

- 原始方案语义：E7 把队员作为一等实体接入 E6 authority；follow/script/mount 三态，mount 为父实体+局部偏移；s213 芦苇漂、s005 坐船案例；translate-events 翻译表与实现步骤。
- 本次治理方案：将上述语义拆入问题、真值、方案、边界、验收五个可定位章节；原文不删节，以 quote 作为唯一完整正文保全层。
- 继任关系：
- docs/phase2/READ-FIRST.md
- docs/phase2/capability-map.md
- 当前 scene/entity mount/follower 实现与 s005/s213 内容
- 明确不做：不执行原文迁移/实现步骤，不恢复 legacy fallback，不把历史计划、Self-Review 或静态审计当作 runtime/E2E/视觉/coverage 结果。

## 边界与风险

- 历史边界：本文可以说明当时为什么设计、如何计划和哪些问题已被识别，不能替代当前 canonical 文档、源码、测试或用户裁决。
- 主要冲突/风险：
- 两个案例正文标记为 unmigrated；“待实现”和杜绝清单是历史设计约束，不是当前场景行为证据。
- trail index、walking/frozenOffset 等旧想法被排除，但需以当前 follower/mount 实现确认。
- 停止线：不得重启旧 E7 迁移或把案例状态写成已闭环；先核当前场景内容、authority owner 与 E7/C7 后继。
- 若重新启用：必须以当前一手来源重新核对 schema、版本、调用方、合法输入和业务 oracle，并建立新的 review record；不得沿用本页日期作准入。

## 验收

- 可执行验证：模板章节完整；原文 quote 去除 `> ` 前缀后与 source UTF-8 字节逐字节相等；source/after SHA 写入 central review、registry、catalog 和 evidence receipt。
- 业务 oracle：历史结论、日期、状态、数字、链接、未知和冲突可定位；任何当前性主张都有继任入口或明确停止线。
- 本次执行范围：只读源、模板迁移、账本同步和静态治理门；runtime、E2E、视觉、coverage 均未运行。
- 复核 Owner 与截止条件：Codex 独立复核本页及三账本；非作者候选验收通过前保持 build/review，不标全量完成。

## 历史范围

- 原始范围：phase2 archive design；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，原始正文 SHA `f29ca5c2e543edcd13c86d41189acc3721aecfcfb109d2beaa34b95a1888f50b`，原文日期和版本轴以 quote 为准。
- 归档原因：正文混合历史设计、阶段计划和后来附录；继任规范/代码已经承担当前合同，故本页只保留历史证据。

## 原始结论

- E7 · 大世界跟随者 + 显式骑乘 —— 设计(2026-07-07)：这是 design-spec，当前文档状态为 historical。全文 74 行、11 个标题；摘要/首段为「> **历史文档（2026-09-06 标注）**：本文写作于方案设计/计划阶段，正文中的执行指令、」。属于历史/归档材料，不能单独证明当前实现。
- 上述结论只属于其原始日期和适用范围；本页新增的结构化表述不改变原始结论。

## 当时证据

- source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `f29ca5c2e543edcd13c86d41189acc3721aecfcfb109d2beaa34b95a1888f50b`；全文 73 行 / 5934 bytes。
- 原文标题/章节锚点：6:E7 · 大世界跟随者 + 显式骑乘 —— 设计(2026-07-07), 11:0. 缘起, 15:1. 诊断:phase-1 为什么「非常混乱」(作者原话), 25:2. 架构决策:队员并进 E6 定位权威, 40:# 2.1 mount 的「局部偏移 = 局部位置」(架构完备,实现按需), 44:3. 两个骑乘案例(现状全 `unmigrated`), 46:# s213 试炼窟遗迹 · 芦苇漂(interactive), 50:# s005 码头市集 · 赵灵儿+李逍遥坐船(cutscene)。完整正文与链接、表格、代码、历史状态词在下方 quote 保留。

## 当前有效性

historical。不得将历史设计字段、迁移步骤、旧版本号、done/待审标签或静态审计结果外推为当前事实。
- 当前不得外推的部分：不得重启旧 E7 迁移或把案例状态写成已闭环；先核当前场景内容、authority owner 与 E7/C7 后继。

## 继任文档

- 当前 canonical / 复核入口：docs/phase2/READ-FIRST.md, docs/phase2/capability-map.md, 当前 scene/entity mount/follower 实现与 s005/s213 内容。
- supersedes / superseded-by：本页保留旧结构化记录作为历史；当前合同由继任规范、代码和新的独立审查记录决定。
- 重新启用条件：新的 primary source、版本/适用范围、合法输入、business oracle、可证伪观察和独立验收齐备。

## 原文保全

固定源 SHA `f29ca5c2e543edcd13c86d41189acc3721aecfcfb109d2beaa34b95a1888f50b`；以下 quote 只增加 Markdown blockquote 前缀，逆回读必须得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> > **历史文档（2026-09-06 标注）**：本文写作于方案设计/计划阶段，正文中的执行指令、
> > Agent 分工、版本号与“当前状态”均为**当时快照**，不是现行契约或待办；已被后续
> > current-only / canonical 实现取代的方案不恢复。现行真值见 docs/phase2/READ-FIRST.md
> > 与 capability-map.md。
>
> # E7 · 大世界跟随者 + 显式骑乘 —— 设计(2026-07-07)
>
> > 状态:设计定稿(作者定调「架构层面杜绝」),待实现。
> > 关联:[E6 定位权威](e6-position-authority-design.md) · [能力地图 E7](../../capability-map.md) · 铁律 #6(杜绝隐式态)。
>
> ## 0. 缘起
>
> 芦苇漂**共乘**(试炼窟 李逍遥+阿奴、s005 赵灵儿+李逍遥坐船)卡在一个未建地基:**reforge 大世界只渲染队长**([main.ts:295](../../../../packages/reforge/src/main.ts#L295) `player` 只是单个 pos;[:639-645](../../../../packages/reforge/src/main.ts#L639) 明写「跟随者渲染落地后接」)。没有跟随者,「一船人叠上去、一起转、一起漂」无从谈起。
>
> ## 1. 诊断:phase-1 为什么「非常混乱」(作者原话)
>
> phase-1 忠实照搬 sdlpal:跟随者位置从 **`trail[]`(队长历史坐标)+ `frozenOffset[]`(每员冻结快照)+ `walking`(flag)三者隐式派生**([follower-pos.ts](../../../../packages/game/src/present/follower-pos.ts) `computeFollowerWorldPos` 三分支)。位置不是「谁说了算」,是「从历史和快照里猜」。于是每个边界都要打补丁:
>
> - 骑乘漏 `walking=false` → 走 trail 分支按滞后一步的 `trail[1]` 重算 → **阿奴掉队闪现**(phase-1 fix `a47334a1`)。
> - `0xA1` 得**记住**「设重叠偏移」而非「清空」,否则骑乘每步 unshift trail 又滞后。
> - 隐龙窟站立对话误转向、刘晋元黑屏间隙…注释里一长串,全是同一套隐式派生的边界事故。
>
> **根因**:增量式 trail + 快照 + flag,与引擎已做对的 E6 定位权威(位置来自唯一权威、每 tick 派生、显式交接)是对立的两套。phase-2 不搬。
>
> ## 2. 架构决策:队员并进 E6 定位权威
>
> 队员 = 一等定位实体 `party:0`(队长)…`party:N`,各持**一个位置权威**(和 NPC 同一套 [Authority](../../../../packages/reforge/src/main.ts#L550))。每 tick `deriveMounts` 末尾统一派生,**最后跑=最高权威**(确定性,同山神/骑鬼)。
>
> | 权威 | 语义 | 用于 |
> |---|---|---|
> | `follow`(队员默认) | 声明式跟随队长:照原版 formation offset 派生(**2 人/3 人不同**,port [follower-pos.ts:67-73](../../../../packages/game/src/present/follower-pos.ts#L67) 按下标的偏移) | 正常走位 |
> | `script` | 显式设位置 + 朝向(per-member) | cutscene 精确站位 / s005 坐船 |
> | `mount` | 位置 = 父实体 + **局部偏移**;朝向 `followDrift`(跟载体漂向)或 `locked` | 骑乘(芦苇漂/坐船) |
>
> **三坑一次性消失,因为它们都是「隐式派生」的产物**:
> - 无 `walking` flag → 走 `follow` 还是 `mount` 是**显式权威**,不是猜。
> - 无 `frozenOffset` 快照 → 静止/骑乘的位置由 `script`/`mount` 权威**显式持有**。
> - 无 `trail[1]` 滞后 → 骑乘期队员权威 = `mount` 父,**每 tick 派生 = 此刻父在哪 + 此刻偏移**,永不累积。阿奴掉队 bug 在这套下**不可能发生**。
>
> ### 2.1 mount 的「局部偏移 = 局部位置」(架构完备,实现按需)
>
> mount offset 不是常量,是**父坐标系里的局部位置**。今天全是静态(固定座位/重叠 {0,0})。「在移动物体上移动」(甲板走动)= 让局部位置自己被一个局部走位驱动 → 世界坐标 = `父世界 + 局部位置` 每 tick 合成,零漂移。**现无场景,不建**;但模型天然容纳,将来是「在父坐标系 ride」不是重构。这是把 offset 定义成「局部位置」的全部好处。
>
> ## 3. 两个骑乘案例(现状全 `unmigrated`)
>
> ### s213 试炼窟遗迹 · 芦苇漂(interactive)
> 每筏实体 trigger 每段两条:`0xA1[0,0,0]`(全员收拢重叠,筏 1 格)→ `0x44[col,row,1]`(PartyRideEventObject:骑当前对象漂到 col,row)。102 条 = 整个筏网。
> → 直译:`mountParty(self,'overlap')` → `ride(self,{col,row},speed)` …末段 `unmountParty`。**self = 被踩的筏**。二十个筏子**同一套逻辑**,只有目标坐标不同(筏自身数据)—— 零逐筏演出。
>
> ### s005 码头市集 · 赵灵儿+李逍遥坐船(cutscene)
> **无** ride opcode(0 条 0x3F/44/97/A1);全 `stepEntity`(912)+`animEntity`(596)= 脚本编排的过场(移动船实体 + 摆队伍)。→ 归 `script` 权威(party 逐拍显式站位),或 party mount 到船实体后 stepEntity 船。单独处理,不挡地基。
>
> ## 4. 迁移器翻译表(translate-events.ts)
>
> | 原版 opcode | 语义 | → 清洁命令 |
> |---|---|---|
> | `0xA1` SetAllPartyPos | 全员收拢队首(重叠) | `mountParty(self,'overlap')`(骑乘上下文)/ 聚拢(cutscene 上下文) |
> | `0x3F/0x44/0x97` PartyRideEventObject(速 2/4/8) | 骑当前对象走到 (x,y) | `ride(self,{col:x,row:y}, speed)` |
> | `0x70/0x7A/0x7B` PartyWalkTo(速默/4/8) | 队伍走到 (x,y) | `walkTo`(party,{x,y},speed)(已部分有 moveParty) |
>
> 骑乘序列末尾补 `unmountParty`(离筏回 `follow`)。
>
> ## 5. 实现步骤
>
> 1. **引擎**:`party:1..N` 跟随实体(从世界队伍派生成员)+ `follow`/`script`/`mount` 三权威派生(扩 `deriveMounts`)+ 跟随者渲染(port formation offset,照原版 2/3 人队形)。
> 2. **迁移器**:§4 映射;s213 筏网 `mountParty+ride+unmount`。
> 3. **验收**:s213 李逍遥+阿奴芦苇漂共乘(重叠/转向/漂行)+ s005 坐船过场;真机 + 复现测试。
>
> ## 6. 杜绝清单(对照铁律 #6)
>
> - ❌ 不引入 `walking` flag / `frozenOffset` 快照 / `trail[m]` 下标派生。
> - ✅ 位置 = 显式权威每 tick 派生;队员是一等实体不是 trail 下标。
> - ✅ 骑乘 = 声明式 `mountParty+ride`(通用),精确控制 = 按需 `script` 权威(付代价仅在需要时)。
<!-- original-source-quote:end -->
