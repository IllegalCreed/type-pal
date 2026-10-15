# CODE94/95 — Codex 独立验收 counter（2026-10-15）

Reviewer: Codex。实现候选钉 `5cb6b9d22`（GLM CODE94/95 交付）；后续到 `e45378a81` 仅 CODE97–102 文档，不改变该候选的 packages/coverage baseline。审查在独立 `codex/quality-menu-accept-94-95` 工作树，不写主工作树或 GLM 实现。无新增文件闭合，无 main 合并。

## 结论

- CODE94：**counter / rework**。不能用退出0和静态lint0掩盖真实测试诊断；注释与测试报告还有直接反证。30条保持review，未做剩余整组语义accept，不宣称所有30条都已由本轮独立通过。
- CODE95：**counter / rework**。完整字段和roleId数组修正成立，但死角色目标用例仍未满足真实caller的单体物品前提（R4）。三份文件维持review，不恢复旧源字节信用。
- 原GLM报告/日志原样保留；本counter覆盖当前集成结论，不追溯改写历史。

## R1：统一门存在大量真实诊断（P1，阻止集成）

| 原件 | React act警告行数 | jsdom导航诊断 | 终态 |
|---|---:|---:|---|
| glm-check.txt | 3489 | 2 | CHECK_EXIT=0 |
| glm-ratchet.txt | 3527 | 2 | RATCHET_EXIT=0 |
| glm-protected-fast2.txt | 3499 | 2 | PROTECTED_EXIT=0 |

示例：glm-check:6428/6438、glm-ratchet:3300/3310、glm-protected-fast2:3300/3310 都为 React 原生 `not wrapped in act(...)` 指示，非反控字符串。导航诊断分别check:5250/43827、ratchet:1633/41059、protected:1633/40968。完整原件SHA/字节数、精确匹配行、terminal marker见codex-review-proof.json。

静态lint确实为4012/0/0/0；不能外推成包含这些诊断的全仓测试门干净通过。七包断言绿、coverage无下降同样不能消除本反证。

要求：保留原件并更正报告的门状态；先核实际诊断归属、异步act/flush/teardown与宿主导航策略，不静音console、不加exclude/ignore/silent或降门。集中存量诊断按AGENTS由Codex核白名单/Owner另卡，不授权GLM为了CODE94越界批量改editor。需要新增产品取舍才交用户裁决，当前无需用户重选已定机制。修复后须有未裁剪原始回执及error/warning/info/运行诊断核验；退出0有诊断仍不能accept。

## R2：候选生产注释与当前真源矛盾（P2，注释质量未完成）

- inventory-menu.ts:22仍称 `M5 stub log`，真实caller menu-driver.ts:716/720/733进入startOverworldItemScript执行链，已不是stub。阅读全文及生产dispatch调用域直接排除“仍只是日志占位”的解释。
- inventory-menu.ts:126-127仍称物品id0是观音符、不是空哨兵。当前提取器items.ts:62-72明确全局OBJECT ID与0哨兵；:88-101实际 `id=ITEM_OBJ_START+i`（有效物品61..294）。SDLPal itemmenu.c:343-347以wItem!=0计库存，uigame.c:1653及1683按全局object id寻址。不能把早期local-id历史解释写成当前合同。
- shared/tables.ts:52的相关旧注释也有历史风险，但不在本窗口的修复白名单，保持原专项状态，不能顺便改公共类型/映射。

要求：只据现行mapper/caller/primary修正本窗口错误注释，说明合成fixture不代表真实物品名称/flags；不借注释修复改行为、schema/save、生成物或ID映射。更新受影响源码SHA及逐文件证据，不能为了与旧closure字节相等而保留已证错误。

## R3：测试质量报告不能用合并结论冒充逐文件证据（P2）

GLM报告把21份测试合并为一行“通过/typed fixture零强转”，但该行没有分别列每文件caller/oracle、合法输入、隔离、去重和判别性证据。原历史卡可作为证据入口，不自动等同当前独立验收。它还与报告自己的E-3矛盾：item-magic-select.test.ts:24/30/33/37/39存在Item.flags强转，:127还有Spell.flags强转。不能声称所有typed零强转，随后把已识别的修正全部推到下一批。

完整读取该组合测试：makeItem返回对象有默认全字段flags，但入参Partial<Item>仍要求完整flags，调用处把残缺flags对象强转成完整ItemFlags绕过类型合同。要求核真实builder参数域，以明确Partial flags覆盖构造完整返回，移除掩盖输入合同的强转；完整Spell.flags的冗余断言也需说明或清理，不泛化为所有合法断言都禁止。不得弱化业务断言或把类型合同塞成运行时测试。

报告中的“重复≥3必须提取”不是用户规则。复用应以真实共享语义、输入、失败策略和生命周期证明，不能按次数机械抽象；也不能以“保持manifest旧字节”为理由延后已证的低风险修正。E-1公共签名调整仍另卡，不能偷改API。

## R4：CODE95 的目标用例不满足真实 caller 前提（P2）

inventory-menu.test.ts:65定义200物品applyToAll=true；:324-328的mkState统一选择这个物品；:341-354的死人可选用例却直接调用confirmInventoryItem建立目标层。生产menu-driver.ts:711-717对applyToAll直接跑script并return，:720才是单体选人入口。SDLPal play.c:268-323同样只有非ApplyToAll才调用PAL_ItemUseMenu。

因此类型字段合法和直接public函数通过，不能证明该fixture在真实caller的选人域可达；标题“复活药前提”把单函数直调结果升级成实际生产合同。公共空列表防御例已明确“不冒充真实生产队伍”，可保留这种限定；正向单体目标/取消场景应采用合法完整的非applyToAll物品fixture，并让oracle仍检死人可选/返回角色id/取消状态。

这是测试模型修正，不是要求生产函数新增applyToAll拒绝或改变产品行为。不得靠降标题、削断言或加弱测试回避已有正向单体合同；需纠正输入并保留相邻driver真实applyAll/single-target回归。此前Codex“局部合同通过”的初判在完整caller核验后收紧为此counter，未曾关闭文件或推送accept。

## CODE95 独立局部核验

全文读取三份修正测试、inventory-menu.ts/shop-menu.ts、纯makeRole harness、组合item-magic-select测试和items parser；核shared Item/PlayerRole/PlayerRoles类型、menu-driver inventory/buy dispatch与SDLPal itemmenu/uigame对应段。

- inventory-menu.test：完整typed Item/roles；空角色边界旧断言原本就是use-target与selectedItemId=200，修正标题和加空targetMenu断言未弱化；死人字段/禁选断言及public入口cancel确实执行，但生产caller输入域仍有R4问题，不能声明端到端成立。删除renderer局部复制不再冒称像素覆盖，保留真实pickItemRowColor oracle。
- inventory-menu.boundaries：roleId索引真实数组、party[2,0]返回0而非cursor1、inUse恰等拒绝、装备0/-1正控、snapshot不别名与实际catalog不变性成立；数量7合法。
- shop-menu.boundaries：完整Item、合法OBJECT id105/110；cash==price与差1、No意图/收尾、真实catalog-before对照成立；不宣称合成价格/flags是原始物品属性。

Codex独立运行：24files/241tests exit0，game typecheck exit0，均无stderr诊断。精确命令见既有targeted-command.json，当前工作树与真实终态在codex-targeted/codex-typecheck原件；同名raw.json保留完整未归一化输出。manifest候选与main各自SHA字段30/30匹配，纯机械一致性不升级为语义accept。

## 交接提示词（GLM）

先fetch最新codex/code-quality-menu-integration并保留已在推进的CODE97–102；阅读CODE94/95本counter、AGENTS/CLAUDE/agent-workflow及当前phase1真值。CODE94返工，30文件继续review，CODE95同样返工，完整字段/数组修正不消除R4。

按R2/R3/R4在当前白名单内修错误注释和fixture参数合同，补每个测试文件的真实caller/oracle/合法输入/隔离/排重/判别性记录；不要用“抽样”或一个21文件合并行代替逐文件证据。不要为减少pending强关，不因数量≥3机械建共享helper。R1的集中诊断另有Owner/白名单后再修，不为过门静音或越界改UI。

原始GLM检查、ratchet和protected退出0但带诊断均不计干净验收；修正后按官方门重新保留精确终态，不复制旧baseline。未过统一门不得标done或合main。CODE97–102和其它pending/review不因本review改变状态；提交当前白名单交付供Codex再次独立验收。
