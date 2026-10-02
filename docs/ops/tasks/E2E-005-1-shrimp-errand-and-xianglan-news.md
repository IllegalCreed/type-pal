# E2E-005-1 买虾出门与香兰报信

Status: build
Phase: ops
Capability: Q1 / author choreography
Coding Owner: e2e005_runner（执行工具；内容包另核准入）
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: Codex
Visual Verification Timing: e2e-consolidated
Branch: codex/e2e-005

## 目标与范围

用户2026-10-02批准005：真实004结束→回厨房受托买虾→码头鱼嫂、水生叔、张四→回村香兰报信，
止于恢复正常操作。两阶段各自产生真实结束档、正式fresh恢复回验；不继续探病、诊断、求药或出海。
正常story不插取消、复读领奖、存读等专项；独立saves/guards按需要运行。无视频生成，不动6012服务与用户存储。
脚本合理化和实际经过实体/方案/步骤命名属于本段；后期方案不猜名，不恢复转换器。

## 前提真值门

一句话：水生首段切换张四的仙灵岛回应，该回应布防回村报信；买虾委托和鱼嫂补足叙事，非程序硬前置。

| 维度 | 真值与直接证据 |
| --- | --- |
| 原版 | 本机`data/extracted/events/all.json` L741给50，L1528切张四L1436，L1436末尾0x6D[5,903,0]，903香兰报信；L1606鱼嫂无布防 |
| 第一阶段 | `packages/game/src/core/event-system.ts:4493`处理场景override；scene5→村scene4对应脚本操作数6→5，不以内部编号要求二阶段对齐 |
| 当前二阶段 | s001/e19/c8-74bc98f07f8e给50；s005/e124/default选择e123/legacy-001；其selectSceneHooks选择s004 onEnter/legacy-003；s004/e83为香兰，e84为秀兰 |
| 目标 | 用户已确认上述范围；[滚动攻略](../../lore/timeline.md#005-买虾出门与香兰报信)；只允许正常按键/held导航和正式保存恢复，不直写世界或跳剧情 |

最强反例：张四初始闲聊也算成功、仅到达s004便算报信、错误使用004/story作有档前驱、恢复失败落新游戏。
必须完整核实际绘制对白及说话人、布防偏序、钱只增50、报信后的真实可控移动与本引擎存读相等。
导航失败先排工具模型、接近足迹和场景编号；演出失败分别排运行时/原版理解/解码/审计模型，不能据数量直接改迁移。
不主动改变已核剧情或UX。新引擎演出用清楚的显式作者编排，不复活全局对白冻结NPC。

## 上下文锚点

- [CLAUDE](../../../CLAUDE.md)、[二阶段纪律](../../phase2/READ-FIRST.md)、[E2E合同](../../testing/e2e.md)。
- [004实跑回执](../../testing/e2e-004.md)、[碎片和当前004前驱](../../../projects/pal/e2e-checkpoints/README.md)。
- `scripts/e2e/meal-contract.mjs:112`独立case合同；`meal-journey.mjs:41`连续held输入和异常先松键。
- `scripts/e2e/browser-journey.mjs:18`独占临时浏览器/服务，不连接用户profile。
- [一阶段经验](../../phase1/engineering-notes.md)§3.5香兰报信fade孤儿历史；[知识摘录](../../phase2/reference/phase1-knowledge-harvest.md)X7。
- 当前content21/SAVE10；只消费当前canonical，改内容后按正式拒绝/重建语义处理，禁止改档hash/兼容分支绕过。

## 当前模式准入与分工

Codex已核范围/一手数据/当前脚本，**执行器工具 build allowed**。工具Owner独占`scripts/e2e/errand-*`及
根`package.json`命令；只有证据证明必要时可窄改共享工具，先报root避免并写。禁止改生产runtime/schema/save/内容。
隔离工作树`/Users/zhangxu/.codex/worktrees/e2e-005/type-pal`，资产/依赖共享只读软链，不复制大文件。
独立前提审查e2e005_premise只读原版及作者正文；发现的内容问题先交Codex核定后再分派专属文件Owner。
根Codex独占卡/看板/回执，负责代码与原字节证据复核、全仓零诊断门、合并推送和工作树退役。
用户本轮确认6012无未保存改动，可在隔离验证后更新主工程；服务/页面继续保留。

内容首包独立Owner e2e005_content：仅`s001/s004/s005.json`和新增`pal-errand-author.test.ts`。
Codex已直接复核原L1436在布防后advance至524–527、再529–531，而当前e123/legacy-001缺这两个步骤，
批准补齐首次→提醒回店→天气复读及本段已核语义命名。原ID保持，奖励/布防只在首次；首包build allowed。
e2e005_premise独立确认同证据，并指出s004首句前480ms不保证已经走到终点；报信走位暂不改，
先取第一阶段真实对白/位置偏序。原L888返程是后台游标advance，不是空脚本；不为返程延迟玩家控制权。

## 验收与证据

- 当前真实004 saves报告及原档hash校验，拒绝story/items/capture/错引擎/坏档/伪passed。
- 两阶段正常回厨房、出客栈、到码头、鱼嫂→水生→张四→回村；正常对白完整、奖励和后续绑定正确。
- 报信参与者实际移动、站定对白、离开/控制恢复观感参考第一阶段；抽验截图，不录屏。
- 工具反控覆盖丢页/缺台词/错人/提前布防/重复钱/假移动/未恢复；专项不得掺进story演示。
- saves生成005真实结束档，在fresh空IDB上下文通过正式入口恢复，完整持久域及稳定画面匹配。
- 已理解正文命名，必要编排修复另列before→after和根因；不修改原版提取数据。
- 对应单测、全仓typecheck/lint/格式及docs零诊断；实跑回执冻结实际源码、档字节与输入链，保留失败记录。
- 攻略更新已跑与只读结论，005不冒称006已验证。最终观感由用户复验，技术验收由Codex独立完成。

## 进展

2026-10-02：范围已批准，首包执行工具准入；当前无005实跑通过结论。独立前提/内容审查进行中。

## 下一位 Agent 提示词

已直接委派，无需用户转发。贡献者只在白名单内交候选和自测；不得合main、标done、改变6012或用户存档。
