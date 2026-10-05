# TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1 排重账（GLM r1）

口径：`source:line × 公开 caller × 合法 typed 输入 × 业务 oracle × 旧 fullName` 逐分支排重。
标记：`NEW`（本卡新增合同）/ `existing-proof`（旧测已证，含 Kimi R1、R06/R04、FOUNDATION C2、
tables M3 T8 等，不换数字重测）/ `unreachable`（合法 typed 输入或真实 caller 不可达，附证据）/
`blocked`（政策未定，沿 R04 登记不造绿测）。一手测量：pal-extract vitest v8
branch coverage（20 个 events/scene/player-roles 相邻测试文件，2026-10-05）。

## 1. events/annotate.ts

| source:line | 公开 caller | 合法输入 | 业务 oracle | 判定 |
|---|---|---|---|---|
| :28-32 wordAt 越界/空词 | `annotate(giveItem)` | itemId=61/60/表尾+1 | 不注释 | existing-proof（annotate.glm-runtime-resource R06 邻位三针） |
| :38 `_item` 命中/symbols 优先 | 同上 | itemId 62 + symbols | 名称注释 | existing-proof（annotate.test「off-by-61/symbols 优先」） |
| :43 `_spell` 规则 | 无具名 Command 携 spellId（shared/src/events.ts Command 联合仅 itemId/enemyTeamId/sceneId） | — | — | **unreachable**（R06 已登记，本卡复核一致；不写强转绿测） |
| :48 `_person` 规则 | 同上（无 personId 字段） | — | — | **unreachable**（同上） |
| :53 `_enemy` 规则 | 同上（StartBattleCommand 是 enemyTeamId 非 enemyId） | — | — | **unreachable**（同上） |
| :60 `_enemyTeam` 仅 symbols | annotate(startBattle) | enemyTeamId | symbols 兜底 | existing-proof（annotate.test） |
| :66 `_scene` 仅 symbols | annotate(loadScene) | sceneId | symbols 兜底 | existing-proof（annotate.test） |
| :76-91 sequence/if/choice 递归 | annotate | 结构化命令 | 子列表注释/else 保留 | existing-proof（annotate.test + R06 choice/if-无-else） |
| :94 raw 跳过 | annotate | RawCommand | 原样 | existing-proof |
| :99-103 非数值字段跳过 | 同上 | 非 number 字段 | continue | existing-proof（raw/结构化路径连带） |
| :79-84 `if` 不递归 cond | — | cond 恒 raw（无具名携注释字段的 cond 语义） | — | 不登记（无业务 oracle，不造恒真） |

## 2. events/disasm.ts

| source:line | 公开 caller | 合法输入 | 业务 oracle | 判定 |
|---|---|---|---|---|
| :41-43 非 8 倍数 throw | disasm | 7B | fail-loud | existing-proof（disasm.test） |
| :58-71 raw 产出 + JUMP_TARGET/0xA2 目标收集 | disasm | 条件跳转/随机跳字节码 | 目标打 L_ 标 | existing-proof（disasm.test L29×13、R05 0xA2/0x04/0x24、kimi-r1 混合） |
| :76-80 具名 label 字段收集（goto/endReset/startBattle×2/setScriptEntry/ifItemLess） | disasm | 具名字节码 | labelTargets.add | existing-proof（goto/endReset/startBattle kimi-r1、ifItemLess kimi-r1；setScriptEntry(0x25) 与 0x24 同 raw 路径不重测） |
| :87-94 entryIps 打标/越界丢弃 | disasm | entryIps 含 -1/99 | 范围内打标 | existing-proof（kimi-r1 双向 + R05 subarray） |
| :108-134 emitCommand 12 具名 case | disasm | 各 opcode | Command 形状 | existing-proof（disasm.test 全 case + kimi-r1 setPalette） |
| :136-145 emitEnd advance/reset | disasm | 0x0001/0x0002 | advance/resetTo/idleFrames | existing-proof（recompile.test end 变体往返） |
| :182-188 setDialogStyle 非 0 进 arg | disasm | 0x003B-0x003E | arg0/1/2 | existing-proof（disasm.test 非 0 operand 往返） |
| :220-227 emitRawFallback | disasm | 8 个具名未结构化 verb | 保号 raw | existing-proof（kimi-r1 startBattle/0x0100；其余 7 verb 单映射同路径不换号重测） |
| :225 `operands[f] ?? 0` | — | 调用方恒传定长三元组（:73 `[o0,o1,o2]`） | — | **unreachable**（kimi-r1 ledger 已登记，复核一致） |
| :235 `n < found` / :238 `found ?? 0` | — | verb 多映射/表外才会走；现表内 verb 恒单映射（'end'×3 有专用 case 不达此处） | — | **unreachable**（kimi-r1 ledger 已登记，复核一致） |

## 3. events/recompile.ts

| source:line | 公开 caller | 合法输入 | 业务 oracle | 判定 |
|---|---|---|---|---|
| :23-28 raw 三 operand 写回 | recompile | RawCommand | u16 LE 位型 | existing-proof（R04 手列字节 oracle） |
| :30-37 end 三态 opcode 写回 | recompile | EndCommand 全字段 | 0x0000/1/2 + resetTo/idleFrames | existing-proof（recompile.test/R04） |
| :34-35 `resetTo ?? 0` / `idleFrames ?? 0` | 产品 caller 仅 cli.ts:263 与 roundtrip.ts:27，输入均为 disasm 产出（emitEnd :139-143 reset 时恒写全两字段） | authored `{op:'end',reset:true}` 缺字段 | 默认 0 政策 | **blocked**（与 R04「缺 label 目标默认值政策未定」同类：无产品 caller 会产出该形状，不为其新增正确绿测） |
| :39-44 goto 重定位/frameDelay | recompile | GotoCommand + label 表 | labels.get(to) | existing-proof（R04 goto 命中 + recompile.test 前向引用） |
| :41 `labels.get(c.to) ?? 0` | — | 悬空/跨文件标签（'shared#L_N'） | 写 0 为静默改写 | **blocked**（R04 明确政策未定：disasm 可产出越界 `L_99`，recompile 现行为写 0 非 fail-loud；不为未定政策造绿测，留产品裁决） |
| :42 `frameDelay ?? 0` | — | authored goto 缺 frameDelay | 默认 0 政策 | **blocked**（同 :34-35 理由，disasm 恒写 frameDelay） |
| :45-49 showDialog messageIndex | recompile | ShowDialogCommand | index 保真、text 不参与 | existing-proof（R04 同文本不同 index） |
| :50-67 giveItem/loadScene/setPalette | recompile | 各命令 | opcode+operand 位型 | existing-proof（R04 八类手列） |
| :68-87 setDialogStyle×4 opcode 选择 | recompile | 四命令 | 0x3B-0x3E | existing-proof（R04 bottom + disasm.test 四样式往返） |
| :91 unsupported op throw | recompile | sequence/if/choice（Command 联合合法成员） | fail-loud | existing-proof（R05 三针 test.each；卡面示例轴已证） |
| :17-19 label Map 后者覆盖 | — | authored 重复 label；disasm 产出 label 来自 Set 去重不重复 | — | 不登记（真实 caller 不可达，无 oracle） |

## 4. events/roundtrip.ts

| source:line | 公开 caller | 合法输入 | 业务 oracle | 判定 |
|---|---|---|---|---|
| :23-27 真链 disasm→recompile | roundtripCheck | SSS.MKF+M.MSG 字节 | 字节全等 | existing-proof（roundtrip.test 真实数据 ok + kimi-r1 合成 ok） |
| :29-36 长度不等分支 | — | disasm 每 8B 恒产 1 命令、recompile 每命令恒产 8B（:12），构造上长度恒等 | — | **unreachable**（kimi-r1 ledger 已登记，复核一致） |
| :38-51 首差异 offset/instruction/opcode | roundtripCheck | setPalette 尾 operand 丢失类 | 三元组精确 | existing-proof（kimi-r1 合成 4/0/0x008b） |
| :41 opcode 位差异（i%8<2） | — | 具名 opcode 经 lookupOpcode/表内单映射恒等写回，opcode 位差异不可构造 | — | **unreachable**（本卡推演登记；表结构证据 opcodes.ts verbToOpcode 单映射） |
| :53-57 ok=true | roundtripCheck | 合法脚本 | originalSize=recompiledSize | existing-proof（真实+合成） |

## 5. events/slice.ts

| source:line | 公开 caller | 合法输入 | 业务 oracle | 判定 |
|---|---|---|---|---|
| :29-37 pushRawJumpTargets（JUMP_TARGET_OPERAND 表驱动 + 0xA2） | sliceByScene | raw 条件跳/随机跳 | 目标入队 | existing-proof（slice.test 0x95/0xA2/L29×13） |
| :35 `operands[0] ?? 0` | — | RawCommand.operands 类型为定长三元组 | — | **unreachable**（kimi-r1 ledger 已登记） |
| :57-72 scene 入口收集（enter/teleport>0、EO 区间、trigger/auto>0、越界槽跳过） | sliceByScene | scenes+EO | 入口集 | existing-proof（slice.test/R06/kimi-r1 EO 三针） |
| :81-121 scene BFS（end 三态/goto 跟随/字符串扫描/fall-through） | sliceByScene | 命令清单 | 可达集 | existing-proof（slice.test 黑屏回归三针 + kimi-r1 showDialog 早退/reset 缺 resetTo） |
| :127-159 globalEntries BFS（同构） | sliceByScene | globalEntries>0 | global 可达集 | existing-proof（R06 独达/重合、kimi-r1 全变体、glm-runtime-resource 非正过滤） |
| :163-171 global 强制 shared（Math.max(n,2)） | sliceByScene | 全局命中 | sceneCount≥2 | existing-proof（R06 重合针） |
| :174-186 scene 文件 count===1 过滤 | sliceByScene | — | 独占归属 | existing-proof（slice.test 单/双场景） |
| :189-196 shared 过滤 `?? 0` :193 | — | sceneCount 与 commands 同长（:163 map 同源） | — | **unreachable**（kimi-r1 ledger 已登记） |
| :205-229 collectAndRewrite/rewriteJumps（shared# 改写、同景不改写、非 L_ 不动） | sliceByScene | goto 目标 count>1 | 跨文件改写 | existing-proof（slice.test 两场景/同景 + R06 raw 不改写 + kimi-r1 follow 针证 global 强制参与改写 + glm-runtime-resource 死端） |
| 场景文件 × global 强制改写组合 | — | — | — | existing-proof（组合轴：kimi-r1 follow（shared 内 goto）+ slice.test（scene 内 goto×双景强制）两针已覆盖改写判定的两条路径，无新分支，不重测） |
| :236-239 parseLabel 正则 | — | — | — | existing-proof（跨文件/越界标签针连带） |

## 6. resources/scene.ts

| source:line | 公开 caller | 合法输入 | 业务 oracle | 判定 |
|---|---|---|---|---|
| :13-15 labelOf ip>0 | dumpScene/dumpAllEventObjects | Scene/EO | L_ip/undefined | existing-proof（scene.test trigger0/teleport + R04 onTeleport） |
| :18-38 mapEventObject 全字段 | 同上 | EventObject | SceneEventObject 形状 | existing-proof（scene.test 全字段 toEqual） |
| :44-58 dumpAllEventObjects id/区间/末景兜底 | cli.ts:713 | parseSss 产出 | 下标 id + [start,end) | existing-proof（R04 三景区间 + 末景空区间） |
| :52 `if (!scene) continue` | — | 唯一 caller cli.ts 传 parseSss 产出；parseScenes（io/sss.ts:134）循环 push **恒密集**，稀疏数组需手造 holey `new Array<Scene>(n)`，无真实 caller | — | **unreachable**（防御分支；本卡以 parseSss 密集性证据登记） |
| :60-72 dumpScene 未知 sceneId throw | cli.ts:703 | sceneId 越界 | fail-loud 带 length | existing-proof（R04） |
| :70-72 末景兜底 toIdx=length | 同上 | 末景 | 空间/到尾 | existing-proof（scene.test 末场景 + R04 [3,3)） |
| :82-85 EO 区间缺对象 `!eo` continue | 同上 | 区间越过 eventObjects 尾 | 跳过不崩 | existing-proof（v8 branch 一手测量该分支已走（相邻 20 文件），kimi-r1 slice 同形 EO 越界三针证语义） |

## 7. resources/parsers/player-roles.ts

| source:line | 公开 caller | 合法输入 | 业务 oracle | 判定 |
|---|---|---|---|---|
| :93-100 size 门 900B | cli.ts:346 | DATA.MKF chunk3≠900 | fail-loud 带尺寸 | existing-proof（boundaries 898 + tables 100B） |
| :103-208 SoA 游标 75 行走读 | cli.ts:346 | 900B chunk | 行=字段 列=角色 | existing-proof（C2 主轴 + tables 真实值；未逐一判别的标量行（avatar/attackAll/defense/dexterity/poisonResistance/unknowns/coverSound/dyingSound 等）为同一游标机制的采样面，C2/tables 已跨 0..74 全程采样钉机制，不再逐行换数字重测） |
| :211-215 cursor 走偏 throw | — | size 门通过后游标为编译期常量 75×12=900，恒等 | — | **unreachable**（tables :814 的 toThrow 实际先中 size 门；本分支构造上不可达） |
| :146-153 signed 五字段 s16 | 同上 | 0xFFFF 等 | -1/-2 | existing-proof（C2 attackSound -1 + tables fake -1/-2） |
| :159-165 elemRes 5 行读 + :237-243 键字面量 | cli.ts:346 | 5 行 u16 | wind/thunder/water/fire/earth 映射 | wind/thunder/fire existing-proof（C2）；**water/earth NEW（本卡 PR-ELEM-ORDER-1：手写字面量 5 键中 2 键无判别——C2 未写、真实数据未断言值，water↔earth 互换不可检）** |
| :176-182 magic 32 槽 | 同上 | slot0/31 | 长度+槽位 | existing-proof（C2 两端槽） |
| :265-271 rgwName 反查 _name（含 3/4 对调真值） | cli.ts:346 | name 行 + words.persons | 按指针权威取名 | 全在表内 existing-proof（C2 [36..41] + tables 真实）；**指针越表/0 哨兵缺省 NEW（本卡 PR-NAME-BOUNDARY-1：C2 全命中、tables 真实全命中、no-words 走 `words?.` 短路——「表存在但指针越界/哨兵」的 fail-soft 缺省无任何断言）** |
| :92 无 words | 同上 | 不传 words | _name 全 undefined | existing-proof（tables no-words 针） |

## 8. 明确不做（卡面 + 复核）

- `src/cli.ts`、`scripts/extract-videos.ts`、真实 `data/raw`/`data/extracted` 提取入口：子进程执行不归因 V8 coverage 是既有归因，本卡零接触、零进程内 import、零真实写盘。
- 产品/旧测/config/baseline/真实数据零改动；无强转/skip/ignore/timeout 扩大/恒真断言。

## 9. 环境观察（main 既有，非本卡引入）

- `rng-frames.test.ts`「全 12 chunk 都能解」在 **--coverage 全量仪表**下超 30s 超时（52s）；无 coverage 单文件 7.31s 通过、无 coverage 全包 417/417 通过（本卡全包证据）。属 main 既有「coverage 开销×大 chunk 解码」交互，不在本卡范围，不改动，登记待 Codex 裁量。
- `check:docs` 在本卡动手前即报 `board.md`/`tasks/index.md` after-SHA drift（main 上次开卡提交 7a9157ac5 改两文档未刷 pin，pin 落在 `docs/phase-governance/reviews/20261004-semantic-current-batch.json`）。本卡按「三 pin drift 随卡修复」判例外科刷新（board.md 含本卡行更新后的字节、tasks/index.md 当前字节），只动 pin 三处 + history 头插，不重排 JSON。

## 结论

- 新合同 2 条（PR-NAME-BOUNDARY-1、PR-ELEM-ORDER-1，均在 player-roles.ts 公开 parser 边界），events/annotate/disasm/recompile/slice/roundtrip 与 scene 全轴 existing-proof 或 unreachable/blocked——**不新增测试不造数字**。
- 针 2 枚全 VALID（见 [counterproof.json](counterproof.json)）：N1 名称指针下限钳 0、N2 water↔earth 键互换；各针红相位 exit 1、恰 1 业务 AssertionError、还原字节=原始、还原绿。
