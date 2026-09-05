> **历史文档（2026-09-06 标注）**：本文写作于方案设计/计划阶段，正文中的执行指令、
> Agent 分工、版本号与“当前状态”均为**当时快照**，不是现行契约或待办；已被后续
> current-only / canonical 实现取代的方案不恢复。现行真值见 docs/phase2/READ-FIRST.md
> 与 capability-map.md。

# E7 · 大世界跟随者 + 显式骑乘 —— 设计(2026-07-07)

> 状态:设计定稿(作者定调「架构层面杜绝」),待实现。
> 关联:[E6 定位权威](e6-position-authority-design.md) · [能力地图 E7](../capability-map.md) · 铁律 #6(杜绝隐式态)。

## 0. 缘起

芦苇漂**共乘**(试炼窟 李逍遥+阿奴、s005 赵灵儿+李逍遥坐船)卡在一个未建地基:**reforge 大世界只渲染队长**([main.ts:295](../../../packages/reforge/src/main.ts#L295) `player` 只是单个 pos;[:639-645](../../../packages/reforge/src/main.ts#L639) 明写「跟随者渲染落地后接」)。没有跟随者,「一船人叠上去、一起转、一起漂」无从谈起。

## 1. 诊断:phase-1 为什么「非常混乱」(作者原话)

phase-1 忠实照搬 sdlpal:跟随者位置从 **`trail[]`(队长历史坐标)+ `frozenOffset[]`(每员冻结快照)+ `walking`(flag)三者隐式派生**([follower-pos.ts](../../../packages/game/src/present/follower-pos.ts) `computeFollowerWorldPos` 三分支)。位置不是「谁说了算」,是「从历史和快照里猜」。于是每个边界都要打补丁:

- 骑乘漏 `walking=false` → 走 trail 分支按滞后一步的 `trail[1]` 重算 → **阿奴掉队闪现**(phase-1 fix `a47334a1`)。
- `0xA1` 得**记住**「设重叠偏移」而非「清空」,否则骑乘每步 unshift trail 又滞后。
- 隐龙窟站立对话误转向、刘晋元黑屏间隙…注释里一长串,全是同一套隐式派生的边界事故。

**根因**:增量式 trail + 快照 + flag,与引擎已做对的 E6 定位权威(位置来自唯一权威、每 tick 派生、显式交接)是对立的两套。phase-2 不搬。

## 2. 架构决策:队员并进 E6 定位权威

队员 = 一等定位实体 `party:0`(队长)…`party:N`,各持**一个位置权威**(和 NPC 同一套 [Authority](../../../packages/reforge/src/main.ts#L550))。每 tick `deriveMounts` 末尾统一派生,**最后跑=最高权威**(确定性,同山神/骑鬼)。

| 权威 | 语义 | 用于 |
|---|---|---|
| `follow`(队员默认) | 声明式跟随队长:照原版 formation offset 派生(**2 人/3 人不同**,port [follower-pos.ts:67-73](../../../packages/game/src/present/follower-pos.ts#L67) 按下标的偏移) | 正常走位 |
| `script` | 显式设位置 + 朝向(per-member) | cutscene 精确站位 / s005 坐船 |
| `mount` | 位置 = 父实体 + **局部偏移**;朝向 `followDrift`(跟载体漂向)或 `locked` | 骑乘(芦苇漂/坐船) |

**三坑一次性消失,因为它们都是「隐式派生」的产物**:
- 无 `walking` flag → 走 `follow` 还是 `mount` 是**显式权威**,不是猜。
- 无 `frozenOffset` 快照 → 静止/骑乘的位置由 `script`/`mount` 权威**显式持有**。
- 无 `trail[1]` 滞后 → 骑乘期队员权威 = `mount` 父,**每 tick 派生 = 此刻父在哪 + 此刻偏移**,永不累积。阿奴掉队 bug 在这套下**不可能发生**。

### 2.1 mount 的「局部偏移 = 局部位置」(架构完备,实现按需)

mount offset 不是常量,是**父坐标系里的局部位置**。今天全是静态(固定座位/重叠 {0,0})。「在移动物体上移动」(甲板走动)= 让局部位置自己被一个局部走位驱动 → 世界坐标 = `父世界 + 局部位置` 每 tick 合成,零漂移。**现无场景,不建**;但模型天然容纳,将来是「在父坐标系 ride」不是重构。这是把 offset 定义成「局部位置」的全部好处。

## 3. 两个骑乘案例(现状全 `unmigrated`)

### s213 试炼窟遗迹 · 芦苇漂(interactive)
每筏实体 trigger 每段两条:`0xA1[0,0,0]`(全员收拢重叠,筏 1 格)→ `0x44[col,row,1]`(PartyRideEventObject:骑当前对象漂到 col,row)。102 条 = 整个筏网。
→ 直译:`mountParty(self,'overlap')` → `ride(self,{col,row},speed)` …末段 `unmountParty`。**self = 被踩的筏**。二十个筏子**同一套逻辑**,只有目标坐标不同(筏自身数据)—— 零逐筏演出。

### s005 码头市集 · 赵灵儿+李逍遥坐船(cutscene)
**无** ride opcode(0 条 0x3F/44/97/A1);全 `stepEntity`(912)+`animEntity`(596)= 脚本编排的过场(移动船实体 + 摆队伍)。→ 归 `script` 权威(party 逐拍显式站位),或 party mount 到船实体后 stepEntity 船。单独处理,不挡地基。

## 4. 迁移器翻译表(translate-events.ts)

| 原版 opcode | 语义 | → 清洁命令 |
|---|---|---|
| `0xA1` SetAllPartyPos | 全员收拢队首(重叠) | `mountParty(self,'overlap')`(骑乘上下文)/ 聚拢(cutscene 上下文) |
| `0x3F/0x44/0x97` PartyRideEventObject(速 2/4/8) | 骑当前对象走到 (x,y) | `ride(self,{col:x,row:y}, speed)` |
| `0x70/0x7A/0x7B` PartyWalkTo(速默/4/8) | 队伍走到 (x,y) | `walkTo`(party,{x,y},speed)(已部分有 moveParty) |

骑乘序列末尾补 `unmountParty`(离筏回 `follow`)。

## 5. 实现步骤

1. **引擎**:`party:1..N` 跟随实体(从世界队伍派生成员)+ `follow`/`script`/`mount` 三权威派生(扩 `deriveMounts`)+ 跟随者渲染(port formation offset,照原版 2/3 人队形)。
2. **迁移器**:§4 映射;s213 筏网 `mountParty+ride+unmount`。
3. **验收**:s213 李逍遥+阿奴芦苇漂共乘(重叠/转向/漂行)+ s005 坐船过场;真机 + 复现测试。

## 6. 杜绝清单(对照铁律 #6)

- ❌ 不引入 `walking` flag / `frozenOffset` 快照 / `trail[m]` 下标派生。
- ✅ 位置 = 显式权威每 tick 派生;队员是一等实体不是 trail 下标。
- ✅ 骑乘 = 声明式 `mountParty+ride`(通用),精确控制 = 按需 `script` 权威(付代价仅在需要时)。
