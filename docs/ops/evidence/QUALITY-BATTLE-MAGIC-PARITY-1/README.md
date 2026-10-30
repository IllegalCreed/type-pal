# pre-94 战斗三机制 counter 返工

Status: review
Owner: Codex（单 Agent；作者自测与源码复核，不冒充第三方独立签收）
Date: 2026-10-18
Base: `0e3fc84fe5949f7ca9c3eb87b1d2a284be945f3c`
Branch: `codex/code-quality-3y`

任务：[QUALITY-BATTLE-MAGIC-PARITY-1](../../tasks/QUALITY-BATTLE-MAGIC-PARITY-1.md)。用户本条要求三项缺陷“开新卡先红例后修”；原 CODE3m/3t 的相应无缺陷信用撤回，历史 quote/raw 保留。不是整文件、全仓或波次验收。

## 实际读取与边界

完整文本读取的实现、直接测试、fixture、公共类型与 caller/primary 的范围、修前/当前 SHA 和行数见 [read-boundaries.json](read-boundaries.json)。三个主实现均先全文读取，再核真实 caller/ownership；新增 helper 不从战斗叶模块反向导入 battle-system。battle-opcodes 主测2425行全文重读，旧 any/无崩类 oracle 并未因此获得当前整文件信用。battle-system 源码/主测沿用本会话3s已全文读取且修前SHA相同的记录，本次只补读投掷/法术 caller 与 fixture delta，不宣称重新逐行核完主测。

## 一手真值、caller、oracle

| counter | primary / 实际 caller | 回归与限制 |
|---|---|---|
| 模拟法术自动选靶 | fight.c:87–128、5300–5400；0x42/0x66 → simulateMagic 与投掷 FIRE | 上次活目标；显式/全体优先级；死/清槽/越界上次目标；全灭保留全槽分支；零伤 sentinel 与本击击杀后仍用同一特效落点 |
| 投掷裸武术 | script.c:2007–2014；performThrowItem → 真实 runScript → 0x66；hydrate/project ownership | party [2,0] 的slot0→role2，runtime A=50/0；装备和Extra各0→100，精确手算伤害仍263/213。保留原77/223相邻oracle，不回退 effective 投影 |
| 所有敌法术预掷 | fight.c:4719–4768；performMagic → 真实睡眠script → enemy timeline → advanceBattleAnimFrames | 非伤害单体/AoE预掷在script前；预掷防御姿frame3独立于伤害；睡眠短路、掷不中、玩家施法负控；没有mock脚本/公式/动画核心 |

全灭用例采用非normal的attackWhole法术、object flag不强制全体，合法经过自动选靶失败分支。normal无目标在C动画中有assert(sTarget!=-1)，不能拿normal全灭合成输入声称完整生产路径正确；初版该输入已更正，旧日志保留但不以该非法场景取得业务信用。极端WORD溢出、脚本失败演出及其它旧分支未闭合，浏览器/视觉未运行。

## 先红后绿与精确反控

- 改生产前正式回归：`red-corrected.json` / `.raw.gz`，8 failed / 6 passed，均业务AssertionError。初版FIRE帧数2误写，按builder实际公式纠正为1后才改生产；初版原件为`red.json`，不以错误帧数oracle或normal全灭输入取得信用。
- 最终合法15例在原基点三生产文件上的重放：[red-legal.json](red-legal.json)，9 failed / 6 passed / 0 runtime error suite；完整stdout/stderr、Vitest JSON、精确spec gzip均保存。重放finally恢复当前三源字节，SHA见回执；不覆盖首次原件。
- 当前合法spec：[adjacent-legal.json](adjacent-legal.json)，37 files / 935 passed，含专属15 passed；该次显式reporter仍有1块stderr（缺失敌人101），不计干净通过；原件保留，修后结果另见`adjacent-clean.json`。初次相邻3失败原件是`adjacent-initial`：旧fixture只有投影而无runtime，补裸runtime后保留精确伤害断言；没有降规则、静音或弱化断言。
- [controls.json](controls.json)：忽略上次目标、改读effective、恢复伤害预掷门、丢失防御姿名单、击杀后重新选特效目标五枚变异，各恰1条业务AssertionError，0 runtime error suite；源码finally恢复SHA一致。工具与每枚native/raw及Vitest JSON均gzip保存。变异当时标题中的5405是尚未修正的注释锚，正式当前源/边界已更正到实际EOF5400；不重写历史原件。
- game typecheck零诊断见`types-current.json`及原始`.raw.gz`。最终文档/lint/ledger/diff结果见本目录后续`gates.json`；其作用不超出各命令。

## 逐文件结果与未修项

两实现magic-damage/battle-opcodes、三旧测试的原闭合记录转review；actions/magic、新helper、新spec登记review。没有新关闭文件。账本当前3314 tracked / 284 closed / 55 review / 2975 pending；pre-94为83卡50partial/33pending/0accept。

高风险仅phase1战斗行为；本卡窄修已获用户明确指令。无schema/save/migration/资产、规则或既有公共签名变更。全仓check、official coverage ratchet、protected fast按用户要求留大任务收尾，本次未运行；浏览器/视觉未运行，不合main。53-wave-gates仍rework，旧完整raw缺失不能由新定向日志补成通过。

## 下一批

先处理父复审卡登记的十项注释与剩余六项证据簿记；draw-equip单人rows、draw-inventory阴影两UI差异只读取证，未经裁决不直接改行为。随后续pre-94逐卡，其后才是94–102；不扩展新编号治理。原始文件保留各自SHA/版本，不把后修行数绑定到修前SHA。

## 相邻诊断追加返工

显式default+JSON reporter显示H01夹具单敌输入仍把第二槽补为101，生产startBattle警告并保留空槽。新增精确roster断言后旧实现1红2绿（`fixture-red`），再将缺省槽补成SDL enemyTeam的0xffff终止符；不mock/静音console、不改生产错误防御。全文重读该123行专测，撤回其旧整文件闭合信用，待本候选统一门。隐式reporter的摘要没有stderr展示，不再据此登记诊断0。

同一H01的终态反控原先把敌B入口指向ip2=end，漏break仍能绿；改指ip3=对话，不增用例。[h01-control.json](h01-control.json)保留同一漏break变异下旧绿1/new红1、零runtime error及生产恢复SHA；当前3例恢复绿、无stderr见`h01-final.json`。前述37/935零诊断回执对应修终止符候选，新增这条oracle后只重跑受影响3例，未重复其它932例。

最终静态回执：[gates.json](gates.json)。首条完整check:docs的125工具测试通过，随后机制catalog SHA失败；补行级catalog与分片manifest绑定后五个实际consumer均0 issue。初次失败与修后原件都保留，未重复125工具测试。lint实跑5086文件、error/warning/info全0；ledger/diff通过，五旧closed转review，未新增关闭文件。新回执JSON写入后的格式另作定向检查。
