# 94 前治理回溯抽审

任务：[QUALITY-PRE94-RETROSPECTIVE-1](../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。这是风险概览和明确抽样，不是把所有旧卡重新签成accept。当前治理源f0cf0f7f；main=f98d0ddd8，主工作树只读。

## 实际范围

定位36张94之前的CODE-QUALITY卡，逐卡结构提取状态、Owner/Reviewer声称、最近路径commit、门命令和源SHA；仅8张全文读取（2b/3b/3o/3u/3w/3x/6a/92）。实际13个源码/测试/工具全文及caller/primary部分区间逐条列在read-boundaries.json。其余28张仅结构浏览，不以此宣布语义通过。Git身份或卡中Codex署名不能证明当时实际模型，也不能替代本轮核实。

## 局部有直接支持

- 6a账本工具：完整实现+专属测试直接调用真实validator，负控覆盖重复/未知路径、状态/计数漂移、非法清单与真实CLI。当前37质量工具测试通过；它明确只证明记录完整性，不能证明Agent读过源码。这条职责边界可保留为局部支持。
- 2b YJ2：decoder为shared唯一实现，extract入口是真re-export，未复制算法。全文核对SDL YJ2位流/回引段与独立固定向量，现9条边界包含截断、目标越界、窗口前回引、overlap和early-EOS；shared16文件131通过。不能由131绿推其它shared文件重新验收。旧卡声称2626真实raw字节对比，本轮未重新执行该census，不能升级为新证据。
- 战斗清理实现全文仍有≤999清临时态、>999保留装备态，符合已读battle.c与phase1机制；本轮没有动装备buff/复活/战斗行为。不是所有战斗或数值重新验收。

## 确认不足与返工入口

| 项目 | 直接发现 | 本轮处理 |
|---|---|---|
| 3o 毒状态域（高风险） | SDL global.c:1487-1502等先role→party index，当前player-poison-state所有key直接roleId；合法party[2,0]对role2施毒探针得到0_2，party键0_0为空。battle tick与status绘制同样读role。旧“SDL等价/合同完整”不成立；不能仅凭role键自洽证明无行为风险。 | 撤回该文件关闭结论为rework，另开[高风险前提卡](../../tasks/GAME-PLAYER-POISON-KEY-DOMAIN-1.md)draft；不改机制/schema/save。 |
| 3n 依赖ownership测试 | 第8例party=[1]却断言0_1，证明旧TS域，不能充当SDL party-slot的独立oracle；其它绑定identity负控有实际业务执行。 | 整文件改review，保留所有测试；不删除未知业务轴、不把局部缺口扩张为其它10例无效。 |
| 3u/3w finalization测试 | 全文两例实际调用cleanup，BattleState与空dialog通过强转绕过真实factory；第一例只7个status值。现测试可保护所断言状态快照，但不能仅凭本文件证明完整BattleState/9状态/全部outcome/forced caller域或精确释放时序；相邻历史oracle仍待重核。 | 改review，要求下一有限片使用真实工厂、完整合法输入和精确caller锚点；未宣布产品cleanup有错。 |
| 2b YJ2注释 | 文件头仍称空窗口回引“不能独立构造、待证”，而末例已有[3,0,0,0,0x7e,0x07,0]直接错误oracle。 | 改review，过期注释待窄修；不删除真实边界测试或改变early-EOS合同。 |

另外：extract旧raw两例只验输出长度，而当前decoder先按头分配输出，属于smoke，不能证明解码字节正确；其语义支持须来自固定向量/快照或真实冻结digest。两例仍保留，是否重复/能否精简待独立反控，不在抽审中按模式批删。

3u日志7条vs收口5条、3w日志4条vs收口3条的冲突已被后续6a明确记为历史重复计数并修正当前ledger；本轮没有发现机器账本仍重复，不能把旧文档矛盾再次计为新增产品bug。92也已记录83–89/91把check:fast误当protected的真实纠错；保留旧原件，当前门仍按候选重新跑，不复写旧失败成通过。

## 当前重跑与边界

shared16/131、game3文件24（ownership11/poison11/cleanup2）、extract YJ2两例及quality-tools37均通过，0skip，输出无act/环境/native模式，原件/命令/cwd/exit/SHA见test-results.json和raw.gz。绿色与上述反证同时成立，不能代替语义验收。毒域探针不是产品修复测试或正式变更验收。

这是只读抽审；未修改任何产品/测试/配置，未新增ignore/强转，未碰生成物、schema/save/公共接口/装备机制。全仓check/official ratchet/protected随editor下一稳定窗口运行，本概览不声称新全仓门通过。四条历史关闭撤回：当前机器3284/225closed/75review/2984pending（review统含rework），0新增关闭。其它225旧关闭保留原历史身份，既未批量否定，也没有被本轮重新证明。

## 后续次序

先完成editor Viewer Kimi/上传宿主有限片与统一零诊断窗口，94–102原goal持续；并行仅指同一Agent可做独立只读核验。前94先补毒域role/party/队伍改变/清理/保存的端到端真值，再处理合法finalization fixture与YJ2注释；场景/event/opcode大文件、升级随机数/数值、资源管线及其它28卡逐步补验，未知仍未知。不得趁“回溯”重写机制或恢复旧兼容代码。

用户临时查询旧分支：code-quality-3y=d4cf7f57d未合main（main...branch=5behind/86ahead，82非mergepatch不等价）；也非当前治理HEAD祖先，旧worktree干净但挂着它。按“已合并才清理”条件未删除，不把清理当作批准合并。

无下一位Agent提示词，Codex继续；专项未完成。
