# 04 · 决策记录与待定问题

## 已拍板的决策

| # | 决策 | 说明 |
|---|---|---|
| D1 | 目标版本 = **1998 Win9x 版** | 非 1995 DOS 版。数据格式按 Win95/98 系;有语音文件、AVI 过场。 |
| D2 | **原生 TS 重写**,不编译 C/WASM | 为了可读、可扩展。 |
| D3 | **忠实移植优先** | 第一目标是完整忠实跑原版;扩展能力是第二阶段。 |
| D4 | 不做通用游戏引擎 | 就针对这一个游戏;"可扩展"指这份代码以后好改。 |
| D5 | sdlpal 作**参考规格**,不 fork | C 源码当规格说明书,用 TS 重写。 |
| D6 | **两阶段架构**:离线 `pal-extract` + 运行时游戏 | 运行时完全脱离 MKF。 |
| D7 | 资源转现代格式;事件转**可读 JSON 事件** | 见 `02-architecture.md`、D16/D17、`05-events-schema.md`。 |
| D8 | 移植方式 = **方案 B(分层重构移植)** | 忠实还原行为,但用模块化 TS 重新分层。 |
| D9 | 法律不在考虑范围 | 个人自用,不发布。 |
| D10 | MIDI 音乐走 **SpessaSynth 运行时合成** | Win9x 版无 RIX 归档,BGM 是 86 个 `.mid`;运行时用 SpessaSynth(纯 TS,支持 SF2/SF3)实时合成,另配一个 SF3 音色库。`.mid` 原样进资源,不预转换。音色用 GM SoundFont,非 DOS OPL 原味 —— 数据里无 RIX,本就无法复原,接受。 |
| D11 | 字体用 **GNU Unifont(CN 变体)** | 原版不带字库文件(DOS 靠系统 HZK16,Win98 靠系统宋体)。`game` 包自带 GNU Unifont 16×16 点阵(OFL 免费)当构建资源;Win9x 版是简体 GBK,取 CN 变体使字形为简体写法。`pal-extract` 不涉及字库。 |
| D12 | 渲染 = **Canvas 2D + 软件索引帧缓冲** | 维护 320×200 索引色帧缓冲,每帧调色板查表写入 ImageData 再缩放上屏。精灵存**索引位图**、调色板单独存(不烤进 PNG)。调色板循环 / 渐变因此精确忠实。WebGL2 否决(对该分辨率过剩)。 |
| D13 | 主循环 = **固定步长、逻辑速率渲染** | 探索 / 菜单 / 事件 10fps、战斗 25fps(照原版 `FPS` / `BATTLE_FPS`);逻辑 = 渲染同帧,不插值。全局 `frameNum` 计数器。切后台不补帧。 |
| D14 | 输入 = **物理键 → 抽象按键** | Shell 把 `KeyboardEvent.code` 映射成抽象按键,核心层只见抽象按键(可单测)。`held`(走路)+ `pressed`(菜单,靠浏览器自动重复)双模型;方向最新按下优先。键位表可编辑、含 WASD 别名,不做改键 UI。输入流支持**录制 / 确定性回放**(自主端到端测试的基础,见 `06-testing.md`)。 |
| D15 | 转场 = **表现层效果 + 可等待命令** | 转场是盖在当前模式上的表现层覆盖(主要是调色板插值),不做成顶层模式。触发系统发命令后**跨帧挂起等回执**;此「可等待命令」机制由对话 / 动画 / 视频 / 转场共用,事件系统是协程式步进器。 |
| D16 | events.json = **忠实转写(反汇编级)** | 把字节码 1:1 转成带标签的可读命令清单,**不做结构化反编译**。无损可逆,`pal-extract` 可 round-trip 逐字节验证。结构化反编译降为第二阶段可选 pass,以忠实转写产出为测试基准。 |
| D17 | 事件模型 **富、结构化优先** | 事件指令词汇含结构化(`sequence`/`if`/`choice`/`loop`)+ 动作 + 低层(`label`/`goto`)。原版转写落在 `label`/`goto` 子集;新内容用结构化子集手写。扩展能力靠此模型,与 D16 的反汇编策略无关。 |
| D18 | events.json **按场景分文件** | `pal-extract` 从各场景入口做可达性追踪切分:`events/scene-NNN.json` 每场景一个 + `shared.json`(跨场景共用)+ `objects.json`(物品 / 法术脚本)。场景文件内按 NPC / 入口分段。 |
| D19 | 技术栈确认 | TS + Vite + Vitest + pnpm monorepo;**3 个包** `pal-extract` / `game` / `shared`(共用 JSON 类型);Biome 做格式化 + lint;**不做 CI**,用本地 `pnpm check`(类型检查 + 测试)代替。 |
| D20 | 数字 ID 的可读名 | 游戏自带名(`WORD.DAT`:物品 / 法术 / 人物 / 敌人 / 地名)由 `pal-extract` 自动解析;无名的(场景 / 路人)配可选、增量的 `symbols.json`。名字以 `_` 前缀注释字段呈现,**数字保持真值**,引擎不读注释。 |
| D21 | 测试走**重档**:sdlpal 差分自动化 | 利用「正确答案已存在」:events round-trip 全量验证 + RLE / 数据与 sdlpal 对拍 + 战斗逐回合差分 + 自主通关回放。完整策略见 `06-testing.md`。 |
| D22 | **反汇编器骨架提前到 M1**(events schema 钉死时机) | 原 `03-development-plan.md` 把"字节码 → events.json 忠实转写器"放 M4,但 `05-events-schema.md` 一直暗示 M1 就要做(原话:"M1 垂直切片只需 ~15 个 opcode 具名;其余先走 raw,M4 填满")。两份文档冲突,按 05 对齐:**M1 完成**双向 opcode 注册表 + disasm + recompile + 可达性切分 + 字符串内联 + WORD.DAT 注释 + 全量 round-trip;~15 个常用 opcode 具名其余走 `raw` 兜底。**M4 削去事件部分**,只补剩余 MKF 格式、全场景资源、全数据表;剩余 ~80 opcode 具名由 M3 战斗 / M5 菜单等按玩法增量补。**理由**:M2 运行时事件系统要对着真 events.json 写,schema 形态若到 M4 才被真实数据敲打,M2 必返工。详细设计见 [`plans/2026-05-23-m1-pal-extract-design.md`](plans/2026-05-23-m1-pal-extract-design.md)。**M1 完成验证(2026-05-23)**:SSS.MKF chunk 4 全量 43503 指令字节级 round-trip 通过 —— schema 经真实数据敲打,M2 起步前已钉死。 |
| D23 | **Win9x 版用 YJ2 解压,不是 YJ1** | M1 实施扫所有 14 个 MKF 找不到任何 YJ1 magic;`sdlpal/global.c:202 fIsWIN95 ? YJ2_Decompress : YJ1_Decompress`。YJ2 = 适配 Huffman + LZSS,无 magic,首 u32 是 uncompressed length;调用者按 MKF 类型决定是否解压。`io/yj2.ts` 1:1 port 自 `yj1.c::YJ2_Decompress`。 |
| D24 | **D20 修正:Win9x 版 WORD.DAT 无场景名** | D20 说"场景名在 WORD.DAT"。**Win9x 版的 `SCENE` struct 没有 name 字段**,WORD.DAT 末尾 14 条是毒物 / 杂项名而非场景名。`_scene` 注释**仅**从 `symbols.json` 拿。若以后做支持 DOS 版,DOS 版可能不同。 |
| D25 | **items / spells / enemies 数据在 SSS.MKF chunk 2(OBJECT 数组),不是 DATA.MKF** | 原 plan 假设这三表在 DATA.MKF。实际:SSS.MKF chunk 2 = OBJECT 数组(union),索引 0-60 角色 / 61-295 items / 296-397 spells / 398-550 enemies。DATA.MKF chunk 1 + 4 是 ENEMY / MAGIC 详细 stats(补充结构)。`Enemy.mp` 字段始终为 0(sdlpal ENEMY struct 无 mp)。 |
| D26 | **运行时 EventSystem 对未具名 raw opcode = no-op skip + log,不抛错** | M1 disasm 把 ~80 个未具名 opcode 走 `op: "raw"` 兜底,M2 起每个里程碑按玩法增量具名一批。运行时事件系统消费 events.json 时撞到 raw 的策略:**默认 no-op skip + `console.debug(ip, opcode, operands)` + ip++**,而非抛错。理由:scene 1 onEnter 等段大量 raw 是无关紧要环境设定(setBGM / setPalette / 设事件对象初始状态),抛错会让任何场景寸步难行;skip 让流程往前走,卡到真正影响执行流的 op(死循环 / 进战斗 / 切场景)时,console log 里看到 opcode 号再具名追加。**此决策跨所有里程碑生效**(M2 探索、M3 战斗触发、M5 菜单都遵循同一策略),避免每个里程碑重复决策。在 M2 设计 [`plans/2026-05-23-m2-runtime-slice-design.md`](plans/2026-05-23-m2-runtime-slice-design.md) 中钉死。 |
| D27 | **角色 / NPC 精灵提取从 M1 推到 M2** | M1 设计写过"该场景所用精灵的索引位图 PNG | 各精灵 MKF",M1 实施收窄到只做 tile bitmap;角色 / NPC sprite 在 M2 跨包顺手补上(队长 4 方向 + scene 1 NPC 待机帧)。**理由**:M2 的"端到端"目标要求"真原版数据",占位色块会跳过 D12 的「真索引位图 × 调色板查表 × anchor」 渲染路径,等于砍掉一段忠实度验证。复用 M1 已踩坑的 `parseSpriteChunk`,新增 `extractCharacterSprites(...)` + 新产物 `data/extracted/data/scene-1.json`(NPC 列表 + 入口 label 表)。**M4 不受影响**,其余非切片场景的 sprite 仍在 M4 全量补。 |
| D28 | **`Enemy` schema M3 必须重做(signed 语义 + 缺字段)** | M1 简化版 `Enemy = { id, name, level, hp, mp, attack, defense }` 不够用,M3 战斗实施时必须扩。两个真问题(M2 期间排查 enemies.json 数据时发现):**① signed 语义**:sdlpal `global.h::tagENEMY` 把 `wAttackStrength` / `wDefense` 等字段标 `WORD`(unsigned),但 `fight.c:4634` 实际用的时候强制 cast 成 `SHORT`(signed):`int str = (SHORT)g_Battle.rgEnemy[i].e.wAttackStrength`。所以 ATK=65535 = -1, DEF=65530 = -6 这种值是 stat **modifier**(在玩家等级算出的基础值上加减),不是直接伤害。**当前 enemies.json 把这些当 unsigned 直接 dump 出来,语义误导**。**② 缺字段**:`magStr / dex / pois / elemResistance[5] / physResistance / dualMove` 等战斗必需字段全部缺失;灯笼之类纯魔法攻击型敌人(ATK=0 DEF=0 magStr=6)在当前 schema 下完全看不出特征。**M2 不消费 enemies.json,不动**;**M3 第一件事**:① schema 扩字段;② attack/defense 用 `getInt16` 读,或加 `attackModifier: number`(signed) + JSDoc 说明语义;③ parseEnemies 同步改;④ 验证 sdlpal 战斗公式时把 signed cast 加进去。 |
| D29 | **「sdlpal 即规格」类模块实施前必须先建基准 —— M2 教训** | M2 tilemap 渲染先后修了 4 个 bug(9-bit id 提取 / h sub-row 偏移 / ROW_Y_STEP=16 / layer 1 顶层),根因是**全程没启动过 sdlpal,只靠 grep C 源码翻译成 TS**。每次 bug 都是用户视觉抓出来,而 06-testing.md 早就说过 D21 重档路线(差分对拍是关键)、`build/sdlpal/unix/sdlpal` M1 就编好了。 → 流程纪律:**任何"sdlpal 是唯一规格"的模块(渲染 / 战斗公式 / AI 决策 / 编排执行)实施前必须先准备 sdlpal 输出基准**,具体形式按模块挑:① 视觉类(渲染 / 转场):跑 sdlpal 截图存 `build/sdlpal-baseline/`;② 数值类(战斗 / AI):headless harness 喂固定 seed + fixture dump JSON;③ 字节类(RLE / 数据表):逐字节对比。没基准就不准实施。review subagent 模板也加一条「实施前问:sdlpal 基准呢?」。**例外**:纯类型 / 纯数据 schema / round-trip 自洽模块(M1 events disasm/recompile)可豁免 —— 字节级 round-trip 已是自证基准。 |

## 待定问题

设计阶段的待定问题(Q1–Q6)已**全部讨论完毕**(2026-05-23),结论见上方决策表:

- Q1 渲染技术 → D12
- Q2 表现层 / 外壳层 → D13(主循环)、D14(输入)、D15(转场)
- Q3 events.json schema → D16、D17、D18;完整 schema 见 `05-events-schema.md`
- Q4 技术栈 → D19
- Q5 数据文件清单 → 见下方「数据核对结论」
- Q6 符号表 → D20。注:原表述「标志位是数字编号」有误 —— 原版无标志位数组(见 `05-events-schema.md`)

目前没有待定的设计问题。

## 数据核对结论(2026-05-23)

原版数据已就位(`data/raw/`),核对结果 —— 对应原 Q5:

- 拿到的是 **「完美补丁集成版 3.0.2014.628」**,基于正版 Win98 版重新打包。
- **14 个 MKF 全部是标准格式**,偏移表单调有效,可正常解析。完整文件清单见 `data/raw/README.md`。
- **音乐不是 RIX**:这一版没有 RIX 音乐归档。BGM 是 `Musics/` 下 86 个 `.mid`(编号 001–087,缺 029),外加 8 个 CD 音轨 `TRACK02–09.ogg`(Vorbis)。→ MIDI 的处理见 D10。
- **没有独立字库文件**:原版不带字库(DOS 靠系统 HZK16,Win98 靠系统宋体);sdlpal 自己也是内嵌 GNU Unifont 解决的。`game` 包改用 GNU Unifont(16×16 点阵、OFL 免费)当构建资源,Win9x 版是简体 GBK 故取 CN 变体;`pal-extract` 只提取文本、不提取字库。详见 D11。
- **视频**:6 个 `.avi`(msmpeg4v3 视频 + mp3 音频),ffmpeg 可直接转 mp4/webm。
- **音效**:在 `SOUNDS.MKF`(505 子文件)内,需 `pal-extract` 解包;是否含语音待 M6 核实。
- 附带 `1.RPG`–`5.RPG` 原版存档,可当 `pal-extract` 的校验 / 测试素材。

## 设计讨论进度

**方案设计阶段已完成。** brainstorming 覆盖:可行性、目标、版本、移植方式、两阶段架构、资源 / 事件模型、核心层划分、渲染、表现 / 外壳层、events.json schema、技术栈、符号方案。

下一步:进入实现,从 `03-development-plan.md` 的 M0 开始。

## 曾经考虑过、已否决的方向

- **方案 A(直译式移植)**:把 sdlpal 的 C 模块 1:1 翻成 TS。否决:会继承 C 的全局状态和大 switch,以后扩展痛苦。
- **方案 C(第一天就做现代脚本 API)**:否决:偏离"忠实移植优先",属第二阶段。
- **运行时直接解析 MKF**:否决:改为离线 `pal-extract` 一次性转换,运行时脱离 MKF。
- **把字节码当"资源"原样保存**:否决:字节码是程序不是资源,改为反汇编成结构化 JSON 事件 + 事件系统执行。
