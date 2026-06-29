# 剧情脚本系统 — 数据模型 shape（v0 草稿，待评审）

> 第二阶段（Reforge）地基。本文**只定数据形状**，不写运行时解释器、不碰查看器/编辑器。
> 目标：让运行时、查看器、将来的编辑器三层都吃同一个干净、可序列化的模型。

## 一句话架构

**世界 = 实体 + 触发器 + 脚本。** NPC 对话、宝箱、地上道具、过场动画、用道具触发的剧情……
本质都是同一件事：某个**触发器**启动一段**脚本**，脚本按命令流演出（出字 / 给物 / 走位 / 镜头 / 换场景…）。
没有独立的「对话系统 / 宝箱系统 / 拾取系统」——只有一个解释器 + 一套命令 + 一层触发器。

> 活证：RPG Maker 的 Event = 触发条件（页）+ 命令列表，跑了 25 年;原版仙剑引擎本来就是这个。
> 我们是把这个被验证过的设计 clean-rewrite，**不沿用原版扁平 bytecode + IP 跳转，改结构化嵌套 AST**（见决策①）。

## 核心 shape

```ts
import type { DialogueLine, EntityDef, Facing, GridPos } from '@type-pal/content'

// ── 持久世界状态(跟存档)── 在现有 WorldState(party/money/learnedSkills/inventory)上加两层:
//    脚本的 branch 读它、命令写它。宝箱开过、NPC 说过、剧情进度,全是这里的 flag/var。
interface WorldStateScriptExt {
  flags: Record<string, boolean> // 开关:'chest_42_opened' / 'met_linger'
  vars: Record<string, number> // 计数/进度变量
}

// ── 条件 ── 只读 world flags/vars/背包;用于 branch、触发器守卫、模板生成。
type Condition =
  | { kind: 'flag'; flag: string; is: boolean }
  | { kind: 'var'; var: string; op: '==' | '!=' | '>=' | '<=' | '>' | '<'; value: number }
  | { kind: 'hasItem'; itemId: string; atLeast?: number }
  | { kind: 'all'; of: Condition[] }
  | { kind: 'any'; of: Condition[] }
  | { kind: 'not'; cond: Condition }

// 指谁:玩家 / 某实体(NPC、可动物件)。
type ActorRef = 'player' | { entity: string }

// ── 命令 ── 脚本的"指令"。判别联合 = clean-rewrite 自原版 opcode。
//    控制流(branch/parallel/wait)用**结构化嵌套**:子命令直接内嵌,不是 IP 跳转(决策①)。
//    下面是**起步集**,更多命令按内容需要再加(content-first,别一次造全)。
type Command =
  // —— 演出 / 对话 ——
  | { kind: 'dialog'; line: DialogueLine } // 出一句(复用现有 DialogueLine 载荷)
  | { kind: 'choice'; prompt?: DialogueLine; options: ChoiceOption[] } // 选项 → 各自分支
  // —— 角色 / 镜头 ——
  | {
      kind: 'moveActor'
      actor: ActorRef
      path: GridPos[] // 途经点,逐段直线走;非直线就拆成多点(不做自动寻路,演出要精准可控)
      speed?: 'slow' | 'normal' | 'fast' | 'run' // 移动速度可调
      wait?: boolean // true=阻塞到走完
    }
  | { kind: 'faceActor'; actor: ActorRef; facing: Facing }
  | { kind: 'camera'; to: { actor: ActorRef } | { pos: GridPos } | { follow: 'player' }; wait?: boolean }
  // —— 写世界状态 ——
  | { kind: 'giveItem'; itemId: string; count?: number }
  | { kind: 'loseItem'; itemId: string; count?: number }
  | { kind: 'learnSkill'; charId: string; skillId: string }
  | { kind: 'giveMoney'; delta: number } // 负数 = 扣钱
  | { kind: 'setFlag'; flag: string; value: boolean }
  | { kind: 'setVar'; var: string; value: number }
  | { kind: 'addVar'; var: string; delta: number }
  // —— 表现 ——
  | { kind: 'playEffect'; effectId: string; at?: ActorRef | GridPos }
  | { kind: 'playRng'; rngId: string } // 过场动画(RNG.MKF)
  | { kind: 'playSound'; soundId: string }
  | { kind: 'fade'; dir: 'in' | 'out'; ms?: number }
  // —— 流程控制(结构化嵌套)——
  | { kind: 'wait'; ms?: number; until?: Condition }
  | { kind: 'branch'; cond: Condition; then: Command[]; else?: Command[] }
  | { kind: 'parallel'; branches: Command[][] } // fork-join:全部并发,全完成才继续(多 NPC 同时动)
  | { kind: 'callScript'; scriptId: string } // 调用另一段脚本(复用)
  | { kind: 'loadScene'; sceneId: string; entry?: GridPos } // 换场景
  | { kind: 'startBattle'; enemyTeamId: string; onWin?: Command[]; onLose?: Command[] } // 调进战斗(边界:战斗是另一套系统)
  | { kind: 'stop' } // 提前结束本脚本

interface ChoiceOption {
  label: string
  cond?: Condition // 不满足则该选项隐藏/置灰
  body: Command[]
}

// ── 脚本 ── 一串命令,顺序执行;末尾隐含结束。
interface Script {
  id: string
  body: Command[]
}

type TriggerKind = 'interact' | 'use' | 'sceneEnter' | 'touch' | 'auto'

// ── 实体 ── 世界里的"东西"(NPC/宝箱/门/道具),类型不是子系统,只是"页"的集合。
//    用"页"模型(RPG Maker pages):实体挂多套**条件状态**,进场(及 flag 变化)时选**最末一个
//    when 满足**的页生效——决定造型/位置/在不在/交互脚本。这就是**跨场景联动**机制(决策⑥):
//    场景 A 的脚本置 flag → 场景 B 的 NPC 进场自己读 flag 选页(不是 A "通知" B)。
interface EntityPage {
  when?: Condition // 省略 = 默认页(兜底)
  sprite?: string
  pos?: GridPos
  facing?: Facing
  visible?: boolean // false = 这状态下 NPC 不出现
  trigger?: { on: TriggerKind; run: Script | { scriptId: string } } // 该页的触发口 + 脚本
}
interface Entity {
  id: string
  pages: EntityPage[] // 无 when 的页兜底;有 template 时由模板按 params 展开成 pages
  template?: TemplateInstance // 见决策③(模板=带参智能实体)
}

// ── 模板(决策③,b 方案:带参智能实体)──
//    存的是 params(永远能用友好表单改),expand(t) → Trigger[]/Script(标准命令,运行时/查看器零特判)。
//    expand 是逻辑(运行时/编辑器),不在 shape 里;这里只定 params 形状。
type TemplateInstance =
  | { kind: 'chest'; itemId: string; count?: number; message?: string; flag: string } // 宝箱
  | { kind: 'pickup'; itemId: string; count?: number; flag: string } // 地上道具
  | { kind: 'talk'; lines: DialogueLine[]; cond?: Condition } // 一句话/多句 NPC
// …更多模板按内容需要加,全部 expand 成标准 Command,底层统一。
```

## 关键决策

① **结构化嵌套 AST，不用扁平 IP 跳转。** 原版/sdlpal 是扁平 bytecode + goto;我们让 `branch`/`parallel`
   把子命令**直接内嵌**（`then: Command[]` / `branches: Command[][]`）。理由:人读、查看器渲染、编辑器
   都对树形友好,且杜绝悬空 goto。代价:不能表达任意 spaghetti 跳转——但 clean-rewrite 本就不想要。

② **持久状态是一等公民。** 脚本不是纯线性——它读/写 world `flags`/`vars`,`branch` 据此分支。
   宝箱开过、NPC 说过、进度计数全在这里。挂到现有 `WorldState`(跟存档)。

③ **模板 = 带参智能实体(b 方案)。** 高频物件(宝箱/捡道具/一句话 NPC)不手搓命令——存 `params`,
   编辑器给友好表单,运行/导出时 `expand` 成标准命令。**底层模型统一,编辑器在上面铺易用 UI**,
   复杂的 5% 留「降到原始脚本」逃生口。和现有「能力块 + effect[] 判别联合 / 菜单特化视图」同一原则。

④ **战斗是边界外的独立系统。** 脚本用一条 `startBattle` 命令**调进去**,回合战引擎本身不是脚本。
   世界交互/演出 = 脚本;战斗 = 脚本能调用的另一套。接口就是这一条命令,别糊一起。

⑤ **命令集 content-first 增长。** 上面是起步集,不追求一次造全;真做某段剧情时缺什么加什么。

⑥ **实体是场景本地的;跨场景联动只靠全局 flag。** 脚本/实体跟着场景加载(进哪个场景加载哪个的)。
   每个场景加载时读全局 `flags`/`vars`,决定**本场景内**哪些 NPC 出现、以何状态出现(= 实体的多个
   条件"版本/页",**作用域仅在本场景**;大多数 NPC 只一版)。NPC 不知道别的场景,只看全局 flag。
   - 跨场景:场景 A 置 flag → 回场景 B 时,B 自己加载、自己读 flag 呈现(A/B 互不知情)。
   - **同一角色可在多个场景各自独立定义**(碰巧同造型/名),无"全局 NPC 对象",故无冲突、无需注册表。
     (= RPG Maker:同一人物在两张图 = 两个互不相干的事件。)

⑦ **移动是路径点,不做自动寻路。** `moveActor` 给一串途经点逐段直线走 + 速度可调;非直线就拆点。
   演出要精准编排(走你指定的路线),寻路(A*)对过场不划算且多套陌生技术。自由游荡 NPC 的寻路将来另说。

## 接到现有的东西

- `dialog` 命令的载荷 = 现有 **`DialogueLine`**;`dialog-box` 仍是表现层,改由脚本驱动+排序。
  现有 `Dialogue{id,lines[]}` ≈ 一段全是 `dialog` 命令的脚本。
- `EntityDef` 升级成"页"模型(`pages[]`),泛化当前 demo 的 `interact`(= 单页、单 interact 触发)。
- `ItemUseEffect.triggerScript`(风灵珠/桂花酒)= `use` 触发口指向一段脚本。
- `WorldState` 加 `flags`/`vars`。

## 本文不含（按梯度推迟）

- **运行时解释器**（跑这棵树;第一阶段 `event-system.ts` 是 1:1 参考）——下一步地基。
- **查看器/检查器**（渲成树/流程 + 高亮执行到哪）——和运行时一对,早做,是单人开发的验证眼睛。
- **模板 expand 逻辑** + **可视化拖拽编辑** + **完整命令集**——增量、可推迟。

## 待定 / 评审点

- 命令起步集是否够覆盖第一段要做的剧情？
- `Condition` 表达力够不够（要不要表达式而非固定 kind）？
- `parallel` 的 join 语义（全完成才继续）是否够，要不要「任一完成」/超时？
- 模板起步三个（chest/pickup/talk）选得对不对？
