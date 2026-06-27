# M1 · pal-extract Design

> 这是 M1 的**设计文档**(brainstorming 产出),只讲"做什么 / 怎么组织 / 怎么验证"。
> 配套的 step-by-step 实施计划由 writing-plans 阶段产出,落在 `docs/plans/2026-05-23-m1-pal-extract.md`。

## 与全局文档的关系

- 调整了 `../03-development-plan.md` 的 M1 / M4 边界(见下方"对里程碑划分的调整")。
- 全部决策依据来自 `../04-decisions.md`(D6 / D7 / D12 / D16–D18 / D20 / D21)、`../05-events-schema.md`、`../06-testing.md`。
- 共享底层模块的字节级语义以 `../../reference/sdlpal/` 为规格(`yj1.c` / RLE 在 `video.c` / `res.c`、`script.c` 等)。

## 对里程碑划分的调整

原 `03-development-plan.md` 把"字节码 → events.json 忠实转写器"放在 **M4**;`05-events-schema.md` 又说"M1 垂直切片只需 ~15 个 opcode 具名;其余先走 raw,M4 填满"。这两份文档对"反汇编器骨架在哪个里程碑"是冲突的。

本次 M1 设计**把冲突按 05 这边对齐**:

| 工作项 | 原 03 安排 | 本设计 |
|---|---|---|
| 字节码反汇编器骨架(注册表 / disasm / recompile / 可达性切分 / 字符串内联 / round-trip 验证) | M4 | **M1** |
| ~15 个常用 opcode 具名 | M1 | M1(不变) |
| 剩余 ~80 个 opcode 具名 | M4 | 后续按需补(M3 战斗补战斗 opcode,M5 菜单补菜单 opcode,等) |
| 其他 MKF 格式补全(F / MGO / PAT / SOUNDS …) | M4 | M4(不变) |
| 全数据表 | M4 | M4(不变) |

**理由**:M2(运行时切片)的事件系统要对着 events.json 写。如果 schema 形态在 M2 时还没被真实数据敲打过,M4 一做就会发现要返工。把"反汇编器骨架 + 全量 round-trip"提前到 M1,M2 拿到的是真·原版 events.json,接口形态钉死。剩余 opcode 具名是数据表填充工作,后续按需补不会破坏 schema。

## 范围

### 1 共享底层(资源管线 / 事件管线共用)

- **MKF 归档 reader** —— 解析偏移表 + 提取子文件。
- **YJ1 解压** —— 部分 MKF 子文件压缩。
- **RLE 精灵解码** —— RLE 字节流 → 索引位图(每像素 = 调色板下标)。

### 2 资源管线 · 切片(开局场景一带:余杭客栈 / 李宅)

| 产物 | 输入 |
|---|---|
| 该场景所用瓦片集 PNG + tilemap JSON | MAP.MKF + 切片场景在场景表中的条目 |
| 该场景所用精灵的索引位图 PNG + 帧偏移 JSON | 各精灵 MKF(MGO / BALL / FBP / FIRE / F / GOP / PAT / ABC 中相关条目) |
| 该场景调色板 JSON(含循环动画段元数据) | 各精灵 / 场景调色板段 |
| 该场景需要的物品 / 法术 / 怪物条目 JSON(切片子集) | DATA.MKF |

`M.MSG` 文本由事件管线消费(字符串内联进 events.json),不在资源管线产出 —— `game` 包从 events.json 拿对话文字,不读单独的 strings 文件。M.MSG 整份会再 dump 一份到 `lookup/strings.json` 仅作开发调试用。

具体 scene id 在实施时跑一遍 sdlpal / 翻 SSS.MKF 场景数组确定,不在本设计预先固化。

### 3 事件管线 · 全量

- **SSS.MKF 5 chunk 解析** —— 事件对象数组 / 场景数组 / 对象数组 / 消息偏移表 / 字节码。
- **双向 opcode 注册表** —— 单一数据表;反汇编器与重编译器都查它。
  - 字段:动词名、三个操作数的字段名与 kind(`value` / `label` / `message` / `object` / `scene` / `item` / `enemy` / …)。
  - 覆盖范围:**所有 ~97 个 opcode 都登记**(否则 round-trip 不可能逐字节通过);其中 ~15 个 M2 切片要用的 opcode 给具名(显式动词),其余条目仍登记但走 `op: "raw"` 兜底。
- **反汇编器** —— 字节码 → JSON 命令清单。具名 opcode 出具名命令、未具名 opcode 出 `raw` 命令。
- **重编译器** —— JSON 命令清单 → 字节码。`disasm` 与 `recompile` 严格对偶。
- **可达性切分** —— 从每场景入口(场景进入 / 传送 + 该场景所有事件对象的 trigger / auto 入口)做控制流追踪,产出 `scene-NNN.json` / `shared.json`(≥2 个场景可达)/ `objects.json`(物品·法术等的脚本)。
- **字符串内联** —— `kind: message` 操作数 → 命令字段(如 `showDialog.text`)。文字源自 M.MSG。
- **可读名注入** —— 解析 `WORD.DAT`,在数字 ID 旁加 `_item` / `_scene` / `_person` / `_enemy` 注释字段;数字 ID 保持真值。
- **`symbols.json` 接入** —— 可选、增量的人工补名机制(D20);M1 文件可空。
- **全量 round-trip 验证** —— 反汇编 → 重编译,产物与原始 SSS.MKF chunk 4 **逐字节比对**;失败即转写器不忠实。

### 4 CLI 入口

仓库根一条命令 `pnpm extract` 一次性把上面三块串起来,产出 `data/extracted/` 下全部内容。无子命令 / 无参数(切片场景与输入路径写死或走环境变量,实施时定)。

### 5 shared 包扩充(@type-pal/shared)

新增 TS 类型,作为 `pal-extract` 产出 / `game` 消费的契约:

- events.json schema(`Command` 联合类型、`Event` 文件结构)
- tilemap JSON
- palette JSON(含循环动画段)
- 数据表条目(物品 / 法术 / 怪物)

`game` 包代码本身在 M1 不动(仍是 M0 hello-world);只是新类型对它**可见**,M2 起步即可用。

## 不在 M1 范围

- 剩余 ~80 个 opcode 具名(后续里程碑按玩法补)。
- 其他 MKF 格式补全(F / MGO / PAT / SOUNDS 等中切片不用到的部分)→ M4。
- 全数据表 → M4。
- 其他场景资源 → M4。
- 音频(.mid / SOUNDS.MKF / TRACK*.ogg)→ M6。
- 视频(.avi → mp4/webm)→ M6。
- 字库 —— 永不做,`game` 包用 GNU Unifont(D11)。
- `.RPG` 解析、sdlpal 差分 harness、dev 面板、输入录制 / 回放 —— 按需逐步搭,不绑 M1。

## 模块组织

```
packages/pal-extract/src/
├── cli.ts                        # `pnpm extract` 入口
├── io/                           # ① 共享底层(纯字节解码,易单测)
│   ├── mkf.ts
│   ├── yj1.ts
│   └── rle.ts
├── resources/                    # ② 资源管线(切片)
│   ├── palette.ts
│   ├── sprite.ts
│   ├── map.ts
│   ├── message.ts                # M.MSG 全量(事件管线也消费)
│   └── tables.ts                 # 数据表切片子集
├── events/                       # ③ 事件管线(全量)
│   ├── sss.ts                    # SSS.MKF 5 chunk 解析
│   ├── opcodes.ts                # 双向 opcode 注册表(数据表)
│   ├── disasm.ts
│   ├── recompile.ts
│   ├── slice.ts                  # 可达性切分
│   ├── annotate.ts               # WORD.DAT + symbols.json → _ 注释名
│   └── roundtrip.ts              # 全量逐字节对比
└── internal/
    └── word.ts                   # WORD.DAT 解析(annotate 用)
```

`@type-pal/shared` 同步加:

```
packages/shared/src/
├── index.ts                      # M0 已存在,补 export
├── events.ts                     # 新增,Command / Event 类型
├── resources.ts                  # 新增,tilemap / palette / sprite JSON
└── tables.ts                     # 新增,数据表条目
```

### 关键不变量

- **资源管线与事件管线不互相 import**;它们都各自只调 `io/`。共享的**数据**是 `WORD.DAT`(事件管线作 `_` 注释)和 `M.MSG`(事件管线做字符串内联)—— 数据共享不算代码耦合。
- **opcode 注册表是单一数据源** —— `disasm` 和 `recompile` 都查它;改一处自动改两处。
- **`disasm` 与 `recompile` 严格对偶** —— round-trip 逐字节通过的前提。
- **数字 ID 永远是真值** —— `_` 注释字段只是给人看的,引擎不读,round-trip 时被忽略(D20)。
- **RLE 放在 `io/`** —— 即便目前只有资源管线消费;它是字节级 decoder,和 MKF / YJ1 同性质,留位置给未来事件管线侧也可能需要的解码(如某些动画 opcode)。

## 输出文件布局

```
data/extracted/
├── images/
│   ├── tilemap-<sceneId>.png         # 切片场景的瓦片集
│   └── sprite-<id>.png               # 索引位图,每像素 = 调色板下标
├── data/
│   ├── tilemap-<sceneId>.json        # 该场景 tilemap
│   ├── sprite-<id>.json              # 帧偏移、锚点
│   ├── palette-<id>.json             # 含循环动画段
│   ├── items.json                    # 切片子集(M4 全量)
│   ├── spells.json                   # 同上
│   └── enemies.json                  # 同上
├── events/
│   ├── scene-NNN.json                # 每场景一个,全量
│   ├── shared.json                   # 跨场景共用片段
│   └── objects.json                  # 物品 / 法术脚本
├── lookup/                           # 开发期参考,运行时(game 包)不读
│   ├── words.json                    # WORD.DAT 全量 dump,看一眼游戏自带名
│   └── strings.json                  # M.MSG 全量 dump,看一眼对话原文
└── symbols.json                      # 人工补名(输入,可空,实施时给个占位)
```

索引位图存为 8-bit grayscale PNG —— 像素值 = 调色板下标(0–255),不烤色。

## 测试策略

按 `../06-testing.md` 的"重档"路线(D21)。M1 落实四类:

1. **MKF / YJ1 / RLE fixture 单测** —— 用 `data/raw/` 切出来的极小子样本(几十字节级)断言核心解码逻辑。
2. **opcode 反汇编 / 重编译单测** —— 几条手造字节码,测往返对偶 + 字段映射 + 字符串内联。
3. **全量 events round-trip** —— 用 `data/raw/SSS.MKF` 作输入,反汇编 → 重编译,与原始 chunk 4 字节缓冲做 `Buffer.equals`。**这是事件管线最重要的验证。**
4. **RLE 精灵与 sdlpal 逐像素对拍** —— 切片场景所有精灵都对一遍。
   - 需要一个能让 sdlpal 把它的 RLE 解码结果 dump 出来的小工具:在 `scripts/` 加一个对 sdlpal 的最小 patch(或 headless harness),输入 (sprite id) → 输出 (索引位图 dump)。我们的 `rle.ts` 解出来后逐字节比。
   - 这部分基建在 M1 内做出来即可,**不必通用** —— 只要能对拍切片范围。
5. **数据表与 sdlpal 抽样对拍** —— 切片场景**涉及到的**条目,逐字段比 + 抽几个已知值核对。客栈 / 李宅场景可能根本没有敌人条目 —— 涉及不到的类目跳过。手测即可,不强求自动化。

`pnpm check` 应跑 1 / 2 / 3 单测全自动;4 / 5 是 `pal-extract` 自身的额外检查,可放 `scripts/` 下手动跑,但产物结果(json diff 报告)能 commit 进仓库追溯。

## 完成定义

1. 仓库根 `pnpm extract` 一次性产出完整的 `data/extracted/` 上述结构。
2. 全量 events round-trip 通过(SSS.MKF chunk 4 逐字节相等)。
3. 切片场景所有精灵与 sdlpal RLE 输出逐像素相等。
4. 切片场景**涉及到的**数据表条目与 sdlpal 抽样对拍通过(不涉及的类目跳过)。
5. `pnpm check` 全部包 typecheck + 单测绿。
6. `@type-pal/shared` 的 events / 资源 / 数据表类型可被 `game` 包 import(尽管 `game` 暂不使用)。
7. README 当前状态更新到 M1 已完成,下一步指向 M2。

## 第三方依赖新增

允许小范围引入,只要纯逻辑、易替换:

- PNG 编码 —— Node 内置无,用 `pngjs` 或类似(只要支持 grayscale 8-bit 索引位图)。
- GBK → UTF-8 转码 —— `iconv-lite` 之类(M.MSG / WORD.DAT 是 GBK)。

不引入大型框架。具体取舍由实施阶段决定。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| ~97 opcode 注册表登记成本不小 | 数据表纯填充工作,可对照 `reference/sdlpal/script.c` 的 switch 一次性扫完;~15 个具名给详细字段,其余只登记 `kind` 占位走 `raw`。 |
| 跨文件 `goto` 切分边界 case 难处理 | 可达性追踪先做单场景,跨场景跳转生成 `shared.json#label` 形式即可(05 已定);疑难片段可临时塞 `shared.json` 保底。 |
| sdlpal 对拍 harness 写法不明朗 | M1 内做最小版,只支持"喂 sprite id → dump 索引位图",通用化推迟。允许打补丁(类似 `scripts/sdlpal-extern-c.patch` 那样)。 |
| 切片场景 id 当前未确定 | 实施时跑一遍 sdlpal 或解析 SSS.MKF 场景数组首项;落到 `pal-extract` 的常量里,后续场景扩展时改它即可。 |
