# GLM 第二对话：运行时与资源七批补测

[任务卡](../../ops/tasks/TEST-GLM-RUNTIME-RESOURCE-2-parallel-wave.md) · [冻结表](targets.json) ·
[交付回执](receipt.md) · [证据](evidence.json) ·
[第一对话独立包](../glm-leaf-workflows/README.md) · [上级](../README.md)

**直接实施，build allowed，不是再交一轮只读审计。** 本对话 28 组、A–G 七批，目标分布于
shared / pal-extract / reforge / migrate；不改 editor/content 生产或他人的测试。
每四组一批，候选固定后推送即可继续下一批；无需等 Codex 审完、不互相审签。
第一对话仍做 G01–G32；**本对话编号 R01–R28，不要混用台账**。
已备好工作树 `/Users/zhangxu/.codex/worktrees/glm-runtime-resource/type-pal`，
分支 `codex/glm-runtime-resource-r1`；依赖缺失时按锁文件 frozen 安装，gitignored资源不会自动随工作树复制。

## 冻结与贡献口径

生产冻结 `f6878b3cd18d916d3cac8aba3e50dc8c70556a2c`，对 `29e76fe6` 无产品/scripts 变化。
正式 fast 为 9,746 测试 / 730 文件、全仓分支 47,678/63,398（75.20%）；这不是本包交付结果。
冻结表列出 62 源 hash/计数/公开入口及新测试路径，与第一对话和 Kimi 主目标零交集。
引用指针是起读线索，不是去重或可达性证明。新测试需检索同名、`__tests__`、跨模块及已有 full/PAL 测试。

全文件的未命中数不能当本包承诺：如 `script-control-flow-audit.ts` 全文件缺 353 臂，
本包 R28 **仅** `collectSourceEntrySites:545–651`（0/31 臂、0/39 行），不要求做总审计器。
区分三种贡献：真正新合同 / 旧 full-only 合同改成自包含 fast / 已有无需重做。
不可达/未定政策如实登记。不能因只有少量新臂就复制旧例、改统计范围或测试私有函数。

## 七批清单与窄入口

| 批/组 | 目标（具体公开入口行号见 targets.json） | 做什么 / 不做什么 |
|---|---|---|
| A/R01 | shared `rle.ts` / `rle-encode.ts` | 合法小帧长短 run、透明/不透明、子数组 byteOffset、截断边界；真实 encode/decode + 独立手算像素/掩码，不能仅自我 roundtrip。已有YJ2待证不接，本组不动压缩算法。 |
| A/R02 | reforge `quantize.ts` / extract `palette.ts` | 量化最近色、透明与 atlas切格的边界，实际RGBA输入保真；合法原始palette字节映射与cycle字段。只测既有函数，不另造调色算法或改变色盘政策。 |
| A/R03 | extract `parsers/ball.ts` / `rgm.ts` / `fire.ts` | 空槽/合法帧、标记头部和当前压缩/原始分支；PNG真实解码后尺寸/像素/alpha，不以PNG签名冒充图片。压缩样本必须有已知输出，不随机字节“碰绿”。 |
| A/R04 | extract `resources/scene.ts` / `sprite.ts` | 场景对象区间与末场景、入口0、全局id保留；encodeIndexedPng/framesToOut/合法sprite小资源输出。不是运行时走位、不是主树提取。 |
| B/R05 | extract `events/disasm.ts` / `recompile.ts` | 当前支持opcode与raw的操作数、label、消息索引；真实字节逐项核对+往返。字节忠实不代表故事语义正确；不能用重编译器生成唯一预期来掩蔽成对缺陷。 |
| B/R06 | extract `events/slice.ts` / `annotate.ts` | 当前场景入口切片的边界/重复入口/未知label；非空符号与词表的注解映射和实际输入保真。只测已定切片/注解，不推测auto/trigger引擎语义。 |
| B/R07 | extract `parsers/enemy-teams.ts` / `items.ts` / `stores.ts` | 合法固定宽度二进制条目、末项/空槽/保留值的现行解析；独立小字节样本，断言完整记录。旧boundaries已有的字段拒绝不复制，不发明格式限制。 |
| B/R08 | extract `font/bdf-to-json.ts` / `resources/asset-manifest.ts` / `parsers/battle-fields.ts` | 自包含BDF位图/偏移/宽度、manifest稳定排序/哈希和自有临时目录枚举、战场表字段。不得扫描/写整仓资产，不跑CLI。 |
| C/R09 | reforge `text/glyph.ts` / `text/text-render.ts` | 合法BDF的精确像素、measure/render的换行/颜色/缺字合同；同一spans实参保真。小字体样本不是原版中文可读性证明。 |
| C/R10 | reforge `engine-chrome/registry.ts` / `menu/item-list.ts` | chrome当前真实资源的失败上下文/恢复（已有则引用）；物品格网、数量/选中、长说明裁剪在指定时间的绘制。只测UI消费，不证明使用/投掷执行。 |
| C/R11 | reforge `menu/menu-box.ts` / `menu/system-box.ts` | drawNumber/Left、九宫格/scroll/confirm/system菜单的边缘值与实际绘制参数/像素；合法非空图集，不能所有drawImage都空实现还声称画对。 |
| C/R12 | reforge `menu/magic-box.ts` / `use-box.ts` / `equip-box.ts` | 当前菜单数据的空/非空、选中与禁用、MP或装备派生信息显示、换行/分页。准备实际被消费的world/数组；不证明战斗伤害或写回。 |
| D/R13 | reforge `menu/shop-box.ts` / `save-browser-box.ts` | shop公开输入游标/返回动作与绘制，slot空/有档/错误状态的显示；存档仅合成摘要，不访问用户存储/真实存档。买卖结算/恢复链不归此组。 |
| D/R14 | reforge `battle/battle-ui.ts` / `present-battle.ts` | 公开battle绘制函数在合法小战斗快照下的菜单/数值/精灵裁剪和溶解；固定时间、明确像素/命令正控，不启动 BattleSession、不测公式。 |
| D/R15 | reforge `battle/battle-anim.ts` / `battle-positions.ts` | **只选现有公开builder/AnimPlayer的剩余简单边界**：返回帧/事件/终帧、零或非零时间推进、队列结束。不可增加完整施法/合击会话或私有reflect调用；已证大流程引用即可。 |
| D/R16 | reforge `battle/settlement.ts` / `battle-settlement-presentation.ts` | 给定合法非空RewardReport，屏幕顺序/学习/成长展示、输入消费与关闭状态；空结果正反对照。不是计算奖励，也不触碰真实world奖励写回。 |
| E/R17 | reforge `audio/midi-preview.ts` / `audio/sfx-readiness.ts` | **只准** createMidiNoteActivity/analyzeMidiBytes 与 collectTurnActionSounds 的公开数据合同：已知MIDI事件/音符区间、去重asset集合。大transport初始化/整场脚本递归不接；真实解析器，硬件不是此组被测对象。 |
| E/R18 | reforge `audio/bgm.ts` / `audio/sfx.ts` | 通过现有公开runtime/AudioContext端口测音量、停止/释放、线性成功/失败的可见结果；真实解码/载入入口不用核心mock。**不裁决BGM initP拒绝缓存待证政策，不做多代竞态总矩阵、不称音质已验**。 |
| E/R19 | reforge `battle/battle-sprite-readiness.ts` / `battle-launch-preparation.ts` | 所需资源集合/无特效条目/显式错误和isBattleAbort分类；顺序调用合法reader的最小ready/拒绝。不同世代在途交错/真正开战由已有流程卡承担。 |
| E/R20 | reforge `battle-trial-assets.ts` / `battle-trial-config.ts` / `battle-trial-prepare.ts` | **只准** 配置解析/issue与队伍预览、createTrialFileSnapshot的真实读取保真、abortableTrial已进入/释放的基本合同。1–3人/第四人拒绝、敌方五槽既有则不重抄；不打开模拟器或正常存档。 |
| F/R21 | migrate `pal-battle-sprites.ts` / `pal-world-sprite-layouts.ts` | 现有id边界、合法源表到完整定义及其guard；已有逐项layout表的精确匹配/失败上下文。禁止增加alias/帧数表、按资源号概括身份，更不是换装功能。 |
| F/R22 | migrate `pal-sprite-action-materialize.ts` / `pal-world-sprite-semantic-alias.ts` | 当前纯内存映射的成功/拒绝与实际对象变化，非目标actor/entity/asset保全，合法新输出过guard。注意API是否约定原地变更，不统一硬造immutability；不生成工程写盘。 |
| F/R23 | migrate `pal-item-scheme-labels.ts` / `pal-store-boundary.ts` | 用最小合法工程验证当前不变量及单点失配诊断的正确对象/路径；不能手填“全部成功报告”，也不发明未签物品/炼丹规则。复杂政策未知时登记继续。 |
| F/R24 | migrate `pal-casualty-scripts.ts` / `music-reference-audit.ts` | 已定小伤亡脚本/locale映射、音轨引用集合计数和缺失上下文；完整输出/非目标输入保全。不得声称真实剧情或音频已执行；不运行PAL全量迁移。 |
| G/R25 | reforge `runtime-project-view.ts` / `project-map.ts` / `asset-resolver.ts` | **限定** projectItemsView/current引用与JSON投影、地图纯编辑/层id/矩阵深保真、resolver明确角色/错误上下文。场景hook时序、实际移动碰撞、loader总壳不在本组；地图输入先正式guard。 |
| G/R26 | migrate `script-library-normalize.ts` / `script-overlays.ts` | 当前版本脚本文件Map的标准化/幂等/标签引用，以及已有overlay的精确改变与非目标保全；真实函数，不造旧schema。不操作磁盘/升级旧项目。 |
| G/R27 | migrate `project-map-converter.ts` / `project-map-audit.ts` / `bake-indexed-rgba.ts` | 已知位字段→合法地图→原字回读、残差/边界定位及精确RGBA；合成小map/图像、完整实际输入快照，不依赖PAL原始资源。不决定运行时碰撞语义。 |
| G/R28 | migrate `script-control-flow-audit.ts:545–651` | **唯一入口 collectSourceEntrySites**：scene enter/teleport、entity auto/trigger、全局item/skill/enemy/actor已知源位点与0指针分类。完整sites/emptyPointers、有序身份/通道及输入保真；不做 auditPalScriptControlFlow、ForTest或整个图算法。 |

没有真实新合同的模块不用强建测试文件。四包会有旧 full-only 用例；复用其合同改成小型自包含样本
须单列“fast可执行性贡献”，不能当发现了新逻辑。不要为压缩样本、不可达臂或未知政策停住整个批次。

## 两对话协作与资源约束

- 本对话只在 `codex/glm-runtime-resource-r1` 的自有工作树；第一对话是
  `codex/glm-leaf-workflows-r1`，Kimi 是 `codex/kimi-editor-workflows-r1`，**不要切换/合并它们**。
- 只新增 targets.json 指定的 `.glm-runtime-resource.test.ts`；本包fixture分置四包各自
  `src/__tests__/glm-runtime-resource/**`，不改现有fixture，不相互引用第一对话/Kimi新增文件。
- 工具/诊断/浏览器宿主都放本目录。targets.json只读；旧测试/产品/官方配置/依赖/锁/基线不改。
- 测试 FS 只用自己的 mkdtemp，可写自有样本；不写或重建正式data/projects，不能运行extract/migrate/bake。
- 默认 **maxWorkers=1、单个测试进程**。可以同时编写、定向测试；不能两个对话并发大覆盖/全仓门。
  本对话的全包和正式覆盖由Codex接收时串行执行，不要求你额外补跑；不终止别人的进程。
- E2E/用户服务不动；临时可视化宿主优先检查空闲 **6072–6075**，strictPort，独立浏览器profile。
  第一GLM6066–6069、Kimi6062–6065、6010/6005/6050与E2E服务均不占用。

## 测试与反控纪律

1. 每族只写一行去重账：旧file/title/断言 → 新差异 → 新title/业务断言 → 结果/归属。别先写巨型报告。
2. 当前合法typed fixture先过正式guard；二进制正控必须有已知内容和独立像素/字节预期。
   仅roundtrip不够，双方同时错也能往返；PNG必须解码验像素，不能只检查magic或文件长度。
3. 调真实公开函数；只替浏览器/FS等外部端口，不mock解码器/守卫/命令/被证明的函数。
   输入保真用实际被消费对象调用前structuredClone、调用后立即比；可变API断言正确变化及非目标保全。
4. 合法路径不用any/强转/ts-nocheck。格式防御可从合法字节单点篡改或传公开unknown参数；
   不用类型绕过上游守卫打死臂，更不能把错误policy当已签合同。
5. 有promise的例先证entered，finally释放并消费原pending，不遮蔽原错；不得用超时作为取消证明。
6. 每批选约两针代表业务反控，优先真实字节/pixel、实参污染、错误结果/身份与正确拒绝方向。
   共用一个按批/单针runner；参考[既有严判据](../glm-state-commands/tools/state-commands-mutants.mjs)，不改原工具。
   对照exit0，反控恰exit1、指定绝对file/fullName真执行、唯一注入命中、候选AssertionError；
   timeout/混错/exit2/null/skip/零执行=invalid。判据自测必须走实际judge。
   仅隔离loader/临时副本变异，不临时改写checkout产品；前后产品hash不变。
7. 真产品缺陷保留正确预期，红例放本目录diagnostics专用config，不污染默认绿套件。
   写复现与正确期望来源交Codex修；不要改预期或skip凑绿。一族受阻继续其它族。

## 四项固定输入视觉（不探索游戏）

可在本目录建立自有小宿主，必须调用真实解码/绘制函数、真实Canvas和相同测试输入；明确不是游戏总壳。
读取既有engine chrome资产只读；样本字体/图标是自包含测试资源须披露，不冒充原版观感。

| ID/批 | 明确操作 | 证据范围 |
|---|---|---|
| RV1/A | 展示R03真实解码PNG和R02量化结果，1:1/4倍，透明格背景，含两种非同色像素 | alpha/轮廓/颜色与独立预期对应；不是原版全部资源验收 |
| RV2/C | 同一物品菜单输入，短说明→长说明、固定两个时间点，空/非空列表切换 | 3列、数量/选中、说明裁剪；实际Canvas图与代码断言一致 |
| RV3/D | 固定合法战斗绘制快照，切两种菜单/disabled状态，数字用非零哨兵 | 菜单与数值可见、不覆盖不该覆盖区域；不声称战斗执行通过 |
| RV4/D | 固定非空RewardReport切换结算屏并关闭；对照空report | 屏幕顺序/文本/数值和终态，没有残影；不是奖励入账或真档 |

每项保留必要前后图、实际操作与console错误，截图置 `/tmp/type-pal-glm-runtime-resource/`，
记录候选SHA/URL/尺寸/全SHA256。可用640×400与960×600展示320×200逻辑画布，不自创响应式游戏布局。
无浏览器/资源或未看图就如实未证，不用源码猜视觉。B/E/F/G无额外视觉要求，不测音质，不走剧情。

## 本地门与统计分工

从自己的仓库根，示例中的文件清单必须非空；四包真实package名字与现有pnpm配置一致：

```sh
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec vitest run <本批包内新测试与相邻> --maxWorkers=1 --reporter=json --outputFile=/tmp/glm-runtime-C.json
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/migrate exec vitest run --config vitest.config.ts --project unit <本批包内文件> --maxWorkers=1 --reporter=json --outputFile=/tmp/glm-runtime-F.json
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge typecheck
# 其它受影响包同样typecheck；shared/pal-extract定向命令不带migrate的project参数
pnpm exec biome check <本批新增测试与fixture> docs/testing/glm-runtime-resource-wave
node scripts/docs/check.mjs
git diff --check
```

lint/格式/typecheck必须error/warning/info全零；exit0但有诊断不算通过。缺依赖按锁文件frozen安装，不升级。
新包测试名不得加 `.pal.test` 逃出fast；需PAL素材的旧合同不强转成伪造“自包含”，如实登记已有/待证。
普通定向数量与官方fast数量分栏；migrate默认全测含PAL project，不能误跑主树资产流程或用缺资产报产品bug。

**不逐例跑覆盖，也不在本对话自行跑四包大覆盖/全仓门。** 准备可复建的局部对照config/命令，复用
`scripts/coverage/config.mjs` 的包include/exclude与`testSelection(package,'fast')`；before仅排除本卡新测试，
after加入它们，同源码/旧测试/分母，不依赖第一GLM/Kimi候选。报告目录只在/tmp，交Codex统一执行。
对照未执行写未执行，不编数字；其它Agent贡献最终按main并集去重。全包/check/ratchet/strict与基线只由Codex做。

## 交付

本目录新增receipt.md/evidence.json与工具/诊断，子目录有Markdown时补自己的README；不改冻结表、
任务卡/看板/公共导航。每批从新鲜Vitest JSON重建精确file/fullName/status，区分新合同与旧full-only转fast。
附候选SHA、命令/cwd/退出码、零诊断、源hash、反控、视觉和未证项；不用报告长度或总测试数代替业务断言。

| 批 | 组 | 候选 | GLM第二对话自验 | Codex独立验收 |
|---|---|---|---|---|
| A | R01–04 | pending | pending | pending |
| B | R05–08 | pending | pending | pending |
| C | R09–12 | pending | pending | pending |
| D | R13–16 | pending | pending | pending |
| E | R17–20 | pending | pending | pending |
| F | R21–24 | pending | pending | pending |
| G | R25–28 | pending | pending | pending |

GLM只填本人自验与候选，不代签/合main/标done。Codex分批独立接收、统一门、合并推送及清理。
