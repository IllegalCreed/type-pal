# E2E 前置欠账与 R4 准入核对

日期：2026-09-21；Owner：Codex。核对生产基线 `14257da75f4c3c91dd9aae5f37de13a5f1040f8c`。
这是当前欠账分流与取证记录，**不是 R4 开工签字，不是所有审计问题清零，也不是 E2E 执行回执**。
用户要求先核清前置工作后继续；本轮不改产品、生成内容、原审计探针或覆盖率基线。

## 当前结论

- TB00～TB10、保存/编辑器已验收卡的完成状态保持，不重开旧签字。最新同候选
  [Coverage ratchet #280](https://github.com/IllegalCreed/type-pal/actions/runs/35600608901)为success，fast7502项/632生产文件。
  CI绿只证明现有门禁通过，不证明尚未编写的业务测试或已登记缺陷也通过。
- R4尚无正式实施卡；`packages/reforge/package.json:10-19`没有E2E runner命令，
  `projects/pal/e2e-checkpoints/README.md`只有001/002文字边界，003～010仍待起草与作者确认。
  当前已有导出/恢复接口，不等于连续检查点链已经存在。
- 当前仍复现A-08/A-09，先开[迁移写盘保护卡](../ops/tasks/MIGRATION-WRITE-GUARD-1-planned-snapshot-and-paths.md)r1。
  这是本轮优先消除已证数据安全风险的工作选择，**不把原本有条件的迁移问题改写成所有R4用例的绝对前置**。
  R4→N6b→完整Q1/Q2的既定版本顺序不变。

## 剩余项与准入关系

| 项目 | 最新证据/状态 | 所属阶段与限制 |
|---|---|---|
| A-08：规划后作者字节被重新采样、覆盖 | 当前E02 observe复现，contract为业务AssertionError；规划时hash没有进入普通JSON写删计划 | 本轮修复卡；N6b发布前必须闭环。R4若只读冻结内容、编辑器只写隔离工程，不调用迁移CLI，不能凭此宣称其路径受影响 |
| A-09：二进制物化父链符号链接越界 | 当前E06/E07/E08复现；JSON journal已有部分路径拒绝，不等于二进制路径有保护 | 同卡；不得在真实PAL/作者目录做破坏性复现。N6b资源物化前必须闭环 |
| E-05：旧输入/历史输出退役 | 当前E09～12 census仍找到dense enemies、旧throw参数、历史翻译选项；这里covered指审计证据成立，不是缺陷已修 | 独立清理批，迁移翻译面在N6b前处理；不删除当前raw→canonical桥/局部格式/来源标签 |
| C-01～05与原Q2音画/操作缺口 | 审计战斗台账仍未收口；本轮未重跑或重新裁定整组 | Q2五批修复与真实战斗验证。Q1速胜不可冒充这组已通过；若R4实际依赖其中某条，先修该条，不绕过正式结算 |
| U-02旧detached finally | 当前B08实跑：取消走AbortError、普通新入口仍被runner门挡住；仍缺合法新权威被旧finally释放的端到端证据 | 保持待证，不登记为已修/安全/已确认bug。R4设计必须列换世界/取消调度观察；若证明影响所选路径，先独立修复 |
| frame在途invalidate、BGM initP失败缓存 | 原卡明确政策待证，不是未清counter | 后续真实调用域与合同核定，不为凑覆盖率把当前行为固化成正确 |
| N6b窄版content21 | 已拍板，尚未实施 | R4薄基线后、完整Q1/Q2前；重生成当前工程与版本绑定checkpoint，不加兼容层；先处理真实pending作者保存 |
| 敌队大目录虚拟滚动 | 路线图仍待做 | 编辑器综合E2E前，不扩成本轮UI重构 |
| 一阶段A-04～06/B-01～03/C-06～07/E-02 | 独立台账尚未整体收口；本轮不声称复验全组 | 一阶段专项，不能混成二阶段R4的全部前置 |
| 覆盖率与可选优化 | fast行72.63%/分支64.22%；full未在本轮执行，长期90%/85%未达 | 高风险未测路径继续补；长期全仓比例、大模块拆分、大克隆性能优化不新增为薄E2E硬门 |

## 本轮实际验证

| 命令 | 结果 | 证据 |
|---|---|---|
| `node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-migration.mjs --mode=observe --case all` | exit0，12记录：8 covered/4 reproduced（E02/E06/E07/E08） | `/tmp/type-pal-r4-migration-current.log` |
| 上述命令改`--mode=contract --case E02` | exit1，作者值未保留/项目已写的AssertionError，不是环境失败 | `/tmp/type-pal-r4-migration-E02-red.log` |
| 上述命令改`--mode=contract --case E06` | exit1，路径拒绝/原字节保全的AssertionError | `/tmp/type-pal-r4-migration-E06-red.log` |
| `node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-barrier.mjs --mode=observe --case B08` | exit0，1项risk；不是covered | `/tmp/type-pal-r4-u02-current.log` |
| `pnpm --filter @type-pal/migrate exec vitest run src/migration-project-io.test.ts src/migration-project-io.boundaries.test.ts src/migration-write-plan.test.ts src/migration-write-plan.boundaries.test.ts src/migration-transaction.test.ts src/migration-transaction.boundaries.test.ts src/pal-assets.test.ts` | 7文件49项exit0 | `/tmp/type-pal-r4-migration-adjacent.log` |
| `pnpm --filter @type-pal/reforge exec vitest run src/checkpoint-export.chain.test.ts` | 17项exit0，当前导出接口有效 | `/tmp/type-pal-r4-checkpoint-current.log` |

迁移探针的所有业务IO只在虚拟文件系统；相邻测试仅用自身临时目录与只读源输入。
没有运行迁移CLI、extract、真实工程写入或浏览器剧情；没有新增正式测试、提升覆盖率或重复全仓重型门禁。
E07的叶链接原子替换本身保留外部目标，是反例控制；不能把它与父链穿透混报为相同结果。
U-02本轮没有用无视signal的假invoke伪造新权威反例，也没有修改旧探针令其“通过”。

## R4开门前的明确清单

1. 另开R4正式卡：冻结content20/SAVE8、PAL输入与隔离浏览器/作者目录；核所选调用路径的剩余阻断项。
   上表是分流依据而非自动豁免；三席前提/设计齐后才能build。
2. 保留用户已定001/002；Codex据剧情与当前场景脚本起草003～010边界给作者确认，不由技术探针猜剧情真值。
3. 明确runner的观察协议、语义断言、失败停线、证据与checkpoint来源链；新游戏真实结束生成002起档，
   不手造后续剧情状态。恢复/导出走正式接口，不能用raw AST来冒充整页E2E。
4. 四类取物canary按库存/提示/实体生命周期/防重入断言；一条隔离编辑器保存→重开→试玩链。
   这部分是R4建设内容，不要求“E2E先完成才能进入E2E”。
5. Q1遇战斗只使用已批准速胜路径但必须正式结算；不能清空敌人、伪造奖励或跳过后续剧情。
   未执行的Q2、full、平台授权边界如实标记，N6b切版后同业务断言复跑。

本轮下一步：迁移保护r1两席独立设计审查；Codex统一核门后实施。E-05/Q2/R4不能借本卡签字开门。
