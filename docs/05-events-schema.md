# 05 · events.json schema

原版的"剧情 / 事件层"(NPC 对话、过场、触发、任务条件、NPC 行为)在 `SSS.MKF` 里是一段**字节码小程序**。`pal-extract` 把它转成可读的 JSON 事件文件(`data/extracted/events/`),运行时的**事件系统**读取并执行。

本文件定义 events.json 的精确格式。背景决策见 `04-decisions.md` 的 D7、D16–D18、D20。

## 转换策略

- **忠实转写(D16)**:`pal-extract` 把字节码 1:1 转成带标签的可读命令清单 —— 反汇编,不是反编译。无损可逆。
- **富模型(D17)**:事件指令词汇本身支持结构化(`sequence` / `if` / `choice` / `loop`),但原版转写产物只用低层子集(`label` / `goto` + 条件命令 + 动作命令)。结构化子集留给手写新内容。

## 原版脚本数据(sdlpal 调查结论)

> 来源:`reference/sdlpal/script.c`、`global.h`。

- `SSS.MKF` 5 个 chunk:0 = 事件对象数组,1 = 场景数组,2 = 对象(物品 / 法术 / 敌人)数组,3 = 消息偏移表,4 = **脚本字节码**。
- 字节码 = 一条全局指令数组。每条指令**固定 8 字节**:`WORD opcode + WORD operand[3]`。指令"地址" = 数组下标。
- 约 **97 个 opcode**(`0x0000`–`0x00A6` 加 `0xFFFF`)。
- 跳转目标是**绝对下标**。没有结构化循环 —— 回跳形成循环。没有通用比较指令 —— 每种条件烤进专用 opcode。
- **两类脚本**:
  - **trigger**(玩家交互触发)—— 一次跑完整段(到 `0x0000` / `0x0001` / `0x0002`)。入口存在事件对象 / 场景 / 物品上,**可变**(触发后移位 → 同一对象不同阶段跑不同逻辑)。
  - **auto**(NPC 待机行为)—— 每帧只跑一条(协程式)。
- **没有标志位数组**。剧情进度靠事件对象 `sState` + 可变脚本入口指针编码。详见下方「状态」。

## 命令的形态

events.json 的一个事件 = 一个**命令清单**。每条命令是一个对象,`op` 字段是动词。三种形态:

**① 具名动作命令** —— opcode 换具名动词,操作数换具名字段:

```json
{ "op": "giveItem", "itemId": 123, "count": 1, "_item": "灵葫芦" }
{ "op": "playMusic", "musicId": 12 }
{ "op": "showDialog", "box": "bottom", "text": "你终于回来了。" }
```

**② 标签与跳转** —— 跳转目标(原版绝对下标)换成标签名:

```json
{ "label": "afterFight", "op": "showDialog", "text": "好身手!" }
{ "op": "goto", "to": "afterFight" }
```

`label` 是命令上的可选字段(作为跳转目标的那条命令带它)。多个跳转指同一处 → 共用一个标签。

**③ 原始兜底** —— 还没具名的 opcode,原样保留,仍可往返:

```json
{ "op": "raw", "opcode": 134, "operands": [0, 0, 0] }
```

> 增量友好:M1 垂直切片只需 ~15 个 opcode 具名;其余先走 `raw`,M4 填满。

## opcode 注册表

具名靠 `pal-extract` 里一张**双向注册表**(纯数据表,本身也是 opcode 文档)。每个 opcode 定义:动词名 + 三个操作数的字段名与**种类**:

```ts
0x001F: { name: "giveItem", fields: [
  { name: "itemId", kind: "object" },
  { name: "count",  kind: "value"  } ] }
0x0003: { name: "goto", fields: [
  { name: "to",         kind: "label" },
  { name: "frameDelay", kind: "value" } ] }
```

`kind` 决定转写与重编译规则:

| kind | 含义 | 转写时 |
|---|---|---|
| `value` | 普通数值 | 原样数字 |
| `label` | 脚本地址 | → 标签名 |
| `message` | 消息索引 | → 内联文字(见下) |
| `object` / `scene` / `item` / `enemy` / … | 各类 ID | 原样数字 + `_` 注释名(见 D20) |

注册表双向:反汇编用它把 opcode → 具名 JSON,重编译用它把具名 JSON → 字节码。

## 控制流

- **`goto` / 条件命令**:原版每种条件是专用 opcode(如"物品不足就跳")。忠实转写保留它们,跳转字段(`kind: label`)指标签:

```json
{ "op": "ifItemLess", "itemId": 123, "count": 5, "elseGoto": "noItem" }
```

- **两类脚本分开标注**:每个脚本块带 `kind: "trigger" | "auto"`。运行时按各自的执行语义跑(见下)。
- **`end`**:`0x0000` / `0x0001` / `0x0002` 转成显式的 `end`,带"是否推进 / 重置入口"的标记。

## 对话与文字

原版 `0xFFFF` 的操作数是消息索引,指向 `m.msg`。忠实转写时**把文字内联进命令**(`kind: message` → 直接取文本):

```json
{ "op": "showDialog", "box": "center", "text": "这把剑就交给你了。" }
```

内联的好处:剧本可读、可改、自包含,不必跟一个独立文字表对照。对话框类型(居中 / 上 / 下,`0x003B`–`0x003E`)转成 `box` 字段。

## 富模型:给新内容的结构化子集

手写新剧情时,可以用结构化命令(运行时事件系统认得,但 `pal-extract` 反汇编不产出):

```json
{ "op": "choice", "prompt": "要帮她吗?", "options": [
    { "text": "帮",   "then": [ /* 命令清单 */ ] },
    { "text": "不帮", "then": [ /* … */ ] } ] }
{ "op": "if", "cond": { /* … */ }, "then": [ /* … */ ], "else": [ /* … */ ] }
{ "op": "sequence", "steps": [ /* … */ ] }
```

结构化命令与 `label` / `goto` 在同一个事件系统里都能跑。原版转写产物纯低层、新内容纯结构化,一般不混用。

## 文件组织(D18)

原版脚本是一整块全局数组,不天然分场景。`pal-extract` 做**可达性追踪**切分:从每个场景的入口(场景进入 / 传送脚本 + 该场景所有事件对象的 trigger / auto 入口)出发,顺控制流收集可达指令。

```
data/extracted/events/
  scene-001.json   每场景一个 —— 只被该场景可达的事件
  scene-002.json
  …
  shared.json      被 ≥2 个场景可达的公共片段(原版复用代码)
  objects.json     物品 / 法术等的脚本(不属于任何场景)
```

- 跨文件跳转:`{ "op": "goto", "to": "shared#someLabel" }`。
- 场景文件内部按入口分段标注(场景进入、N 号对象的 trigger、N 号对象的 auto …),便于人定位。

## 可读名字(D20)

events.json 里大量数字 ID。可读名分两个来源:

1. **游戏自带名** —— 物品 / 法术 / 人物 / 敌人 / 地名都在 `WORD.DAT`。`pal-extract` 自动查出,作 `_` 注释字段。
2. **`symbols.json`**(可选、增量)—— 给没名字的(场景编号、路人对象)。人边玩边补:`{ "scene": { "17": "客栈" } }`。

**关键**:数字 ID 永远是真值;名字只是 `_` 前缀注释字段(`_item`、`_scene` …),引擎不读、round-trip 时忽略。改了 `symbols.json` 重跑 `pal-extract`,注释更新。

## 运行时:事件系统怎么执行

事件系统是一个**协程式步进器**(对应 `04-decisions.md` D15、`02-architecture.md` 表现 / 外壳层设计):

- **trigger 脚本**:被触发后,在事件模式里一步步推进命令清单。遇到**可等待命令**(`showDialog` 等玩家确认、`startBattle`、转场、`playAnim`)就停在该步、每 tick 查回执,完成才进下一步 —— 用协程模拟原版"整段跑完(中途阻塞)"的语义。
- **auto 脚本**:每 tick 推进一条命令(跳转除外),对应原版 auto 的逐帧语义。NPC 闲逛行为即此。
- 内部表示:结构化命令在加载时可展平成"带标签指令 + 指令指针"的统一形式,事件系统只需一种执行器。

## 状态:没有标志位数组

原版**没有通用标志位 / 变量数组**。剧情进度全靠两样东西编码,GameState 直接存它们:

- **事件对象 `sState`** —— 隐藏 / 正常 / 阻挡(宝箱取过了 = 隐藏、门开了 = 正常,等等)。
- **可变脚本入口指针** —— 事件对象的 trigger 入口触发后会移位,同一 NPC 在不同剧情阶段跑不同脚本段。

所以 events.json 不需要"标志位"概念;改状态的命令直接是"设事件对象状态""设脚本入口"。

## round-trip 验证

忠实转写无损可逆 —— `pal-extract` 提供反向编译器:events.json(忠实转写产物)→ 字节码,与原始 `SSS.MKF` chunk 4 **逐字节比对**。这是验证转写忠实度的金标准,也是第二阶段"结构化 pass"的测试 oracle。
