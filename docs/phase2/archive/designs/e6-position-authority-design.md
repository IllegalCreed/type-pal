# E6 · 实体定位权威 设计方案（2026-07-05 · **已评审**:决策①仅被接管实体暂停 auto/②位移指令才隐式接管;③④留 E7/C7 期再拍）

> 解「队形 vs 演出 vs 载具打架」的根本（capability-map E6，当前最高优先地基）。
> 解锁：E7 载具/挂载（父动子随，D20 契约）、N7 演出接管（显式 take/release 非冻帧）。
> 考证素材：reforge 位置写点全景 + 原版冻帧机制拆解（两路 agent 考证，2026-07-05；要点内嵌下文）。

---

## 0. 问题是什么（考证结论压缩）

**原版把三件事焊在 party 全局上碰运气**：队形（rgTrail 扇形偏移）+ 演出冻结（walking
闸门 + frozenOffset 快照 + 静止期从不重算 wFrame/xy）+ 载具共乘（0xA1 聚拢锁重叠 +
0x3F/0x44/0x97 骑乘每步刷 trail/camera）。一阶段照抄后在跟随者朝向/位置/间隙上反复修了
5 个 commit（design-backlog 议题14 D组），根因一句话：**三方共享全局，没有权威概念**。

**reforge 现状**（写点普查）：
- `player.pos` 单点、脚本期 runner 吞输入 → 输入 vs 脚本互斥，**干净**。
- `e.pos` 六个写点（moveEntity tick / stepEntity / nudgeEntity / chaseStep / tickHostiles / spawn），
  **无仲裁**。B9 已被 runner gate 挡住；但 **auto 巡逻在主脚本演出期不暂停**
  （main.ts:976 实现「并行」——2026-07-03 作者拍板不复刻对话冻结 NPC；而 main.ts:416 注释
  仍写「主脚本期间暂停」）——**416↔976 矛盾注释就是权威未定的化石**。主脚本 moveEntity
  与该实体自己的 auto stepEntity 可对同一 `e.pos` 交错写 = 现存打架面。
- 相机：恒跟随玩家 + `cameraOffset` 脚本偏移**叠加**（不暂停跟随）——考证确认此模型工作
  良好（彩依飞走案的教训已内化），**本设计不动相机**。
- 跟随者：不存在（只画队长；CharacterInstance 无 pos）——是待建项不是待修项。

---

## 1. 核心模型：每实体一个位置权威（authority）

```ts
type Authority =
  | { kind: 'world' }                          // 缺省:explore 物理(输入/auto/hostile)
  | { kind: 'script'; token: number }          // 演出接管(N7):脚本持有,world 侧让位
  | { kind: 'mount'; parent: string; dx: number; dy: number } // 挂载(E7):位置=父+偏移,不自写

// 运行时一张表(不进存档 —— 权威是演出/挂载的瞬时态,读档回 world):
authority: Map<'party' | entityId, Authority>   // 缺省不在表 = world
```

**写入规则（唯一裁决点）**：任何要写 `pos` 的代码先过 `canWrite(who, id)`：

| 写者 | world | script(本脚本) | script(他人) | mount |
|---|---|---|---|---|
| 玩家输入(party) | ✅ | ❌(现状 runner 吞输入,不变) | — | ❌ |
| 主脚本 moveEntity/stepEntity/… | ✅(隐式 take) | ✅ | ❌排队/跳过 | ❌(先 unmount) |
| auto 巡逻 | ✅ | **❌暂停该实体** | ❌ | ❌ |
| tickHostiles | ✅(现有 gate 不变) | ❌ | ❌ | ❌ |
| mount 派生(每 tick) | — | — | — | ✅(唯一写者) |

---

## 2. take/release：隐式为主，显式为辅

- **隐式（迁移内容零改动）**：主脚本的任何位移 op（moveEntity/stepEntity/nudgeEntity/
  teleport…）执行时自动对目标实体 `take(script)`；**脚本链收尾（完成/abort/切场景）自动
  release 全部**——一阶段「time-based 状态要有兜底收尾人」教训直接内化为结构，不可能泄漏。
- **显式（手工内容增强）**：新命令 `takeEntity` / `releaseEntity`——演出中途归还某实体
  （比如群演先动后自由巡逻）。迁移器不产出，编辑器命令面板提供。
- **auto 巡逻语义（对齐既有拍板）**：默认**并行**（作者 2026-07-03：不复刻对话冻结 NPC）；
  仅当实体被脚本 take 时**该实体的 auto 暂停**（release 后恢复）。修 416 注释对齐实现。

## 3. 挂载（E7 地基，D20「父动子随」落地形）

```ts
// 运行时挂载(E7 实施;E6 只定契约):
mount(id, parent, dx, dy)   → authority[id] = mount;每 tick pos = parent.pos + (dx,dy)
unmount(id)                 → 回 world(位置留在当下)
```
- **骑乘 = 反向挂载**：party mount 到载具实体，**输入转发驱动载具**（载具的碰撞规则——
  芦苇漂 floating 穿水——天然生效），party 跟着走。原版 0xA1 聚拢+锁重叠的语义 =
  全员 mount 到队长 offset(0,-1)，用同一契约表达，不再特例。
- 嵌套（人挂船、船挂洋流）：拓扑排序每 tick 派生，禁环（编辑器校验）。

## 4. 跟随者（预留模型，随 C7 实施）

E6 只定数据形：`trail: RingBuffer<{x,y,dir}>`（队长移动 unshift）+ **数据驱动偏移表**
（per-slot {dx,dy}，替换一阶段 m===2 硬编码分支）。跟随者位置 = 纯派生（trail + 偏移表），
不进 authority 表（它们从不被单独写——演出要单独调队员时先 detach 成临时实体，这正是
原版 0x15 point-name 转向的 clean 表达）。实现排 C7（有队友才有跟随者）。

---

## 5. 实施切分（评审通过后）

| 步 | 内容 | 动面 |
|---|---|---|
| E6a | authority 表 + canWrite 裁决 + 隐式 take/release + auto 暂停语义 + 416 注释修正 | main.ts 集中改造;行为回归=现有 Playwright 垫 |
| E6b | takeEntity/releaseEntity 命令(schema+runner+编辑器表单) | 三包小增量 |
| E7 | mount/unmount + 骑乘输入转发 + 0xA1/骑乘 op 迁移翻译 | 单独一轮 |
| N7 | 演出接管验收:隐龙窟门口垫(回归沙盒❌→✅) | 内容验证轮 |

---

## 6. 待作者拍板的决策点

1. **auto 巡逻暂停粒度**：✅ 拍板 =「仅被 take 的实体暂停」（2026-07-05）。
2. **隐式 take 的范围**：✅ 拍板 =「位移指令才 take」（2026-07-05）。
3. **骑乘输入转发**（E7 期）：推荐「输入驱动载具、party 挂载跟随」；备选「输入仍驱动
   party、载具跟 party」（简单但载具碰撞规则失效,芦苇漂穿水要特判——不推荐）。
4. **跟随者偏移表**放哪：推荐工程 content（创作者可调队形）；备选引擎常量（原版忠实值）。
