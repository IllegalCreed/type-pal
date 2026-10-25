# QUALITY-REVIEW-52-CLOSEOUT-1 — 剩余52个review文件收口

Status: build
Phase: phase1 / phase2 / ops（逐文件区分）
Capability: fixed-cohort code-quality closeout
Coding Owner: Codex（单Agent）
Generation Owner: N/A
Reviewer: Codex（据证验收与必要返工）
Visual Verification Timing: mixed（按实际修改；旧有效现场复用）
Branch: codex/code-quality-94-102

## 目标

用户明确指定下一阶段完成账本剩余52个review文件。复用有效全文八维、caller、primary、反控和原生门证据，补缺口及必要返工，区分代码接受、统一门和发布。旧“等待覆盖率/act诊断”不能直接当当前阻塞，卡片accept也不自动授予整文件accept。

## 范围

- 固定基点为PR23合并后的`0e14c184eed91841ee0f48323b98c98b734a3129`。[52路径及原状态/理由/源码身份](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/scope.json)为唯一分母；以首次live机器表枚举，不读历史comment表。
- 覆盖pal-extract19、game12、scripts6、editor5、shared4、reforge3、migrate2、content1。28产品、17测试、4工具、3fixture。
- 相关caller/测试只核实际影响；若需新增/移动/删除，保留合同映射并单列库存增量，不偷换固定52分母。
- 现纳入52中的103–106遗留测试；不因此重开全部103+任务或已接受的pre94/94–102文件。2870个pending、ED-ENTITY-STATE-PLAN-1、其它活动GLM/E2E实现不抢写。
- 主工作树只读，四处未跟踪英文资源保持；不新建治理分支或worktree。

## 前提真值门

### 工程前提与反证

`review`只表示已读或局部整改而未完成整文件验收。历史原因可能已过时，但不能由全仓绿推定八维完整。若旧证据缺维、当前源码/caller/合同漂移、反控不成立或记录只覆盖切片，继续review并补核；未知不为了达到0而强关。

| 方向 | 本阶段约束与来源 |
|---|---|
| primary | 每文件既有真值/真实caller/oracle先按版本核用；一阶段必要时读原盘/SDLPal，原版与参考分开。 |
| phase1 | CLAUDE与game-mechanics约束机制/可见行为；允许有证据的结构治理，纯重构与行为修复分提交。 |
| phase2 | READ-FIRST与当前canonical优先；不靠一阶段保真给editor/reforge/content设计授信用。 |
| 本阶段 | 52个整文件各具A–H结论、明确旧→新合同及未修项；再按集中门/真实CI完成发布。 |

新schema/save/migration/资产管线、接口删除或用户可见取舍不从本卡概括授权。先证事实、保留正式失败反例，沿原停止线另作有限准入；只暂停受影响项，其余继续。既有用户明确裁决按原范围复用，不重复请示。

## 上下文锚点与推进次序

长期合同：[工程质量](../code-quality.md)、[当前工作流](../agent-workflow.md)、[文档模型](../guides/documentation-model.md)、[测试治理](../../testing/governance.md)。[唯一阶段证据入口](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/README.md)记录实际进度，不复制旧章节的过期数字。

1. 固定记录解析/文本链9文件：enemy/role四文件、WORD/GBK五文件；先核旧全文/反控与当前差异。
2. shared类型/编译合同4文件；补公共出口与消费者，不用运行时fixture冒充类型测试。
3. extract格式/CLI/IO余10文件；失败与写盘所有权另核，产物不代替上游。
4. game战斗、启动、装备、呈现12文件；补整文件职责与生命周期余域。
5. 第二阶段11文件；editor5、reforge3、migrate2、content1按当前canonical和真实宿主核八维。
6. 治理工具6文件；证据生成与规则消费分别核，不通过放宽判据获得完成。

## 验收与低成本复验

- 逐文件记录A正确性/边界、B注释、C职责/所有权、D共享取舍、E测试、F可读性、G无多余部分、H可测试性；复用与实际补读分开。
- 快检默认只读，核源/依赖版本、原件与原生结果、合同映射；设计结论不冒充机器证明。变化仅使受影响claim失效。
- 定向/相邻/必要TC随实际变更安排；已有效同候选结果复用。无改动的证据收口不重跑相同产品测试。
- 多个相关切片完成后才集中全仓check、官方覆盖率/ratchet/protected；一次采集合理结构重计须保留原件，规则/断言/超时/范围不放宽。
- 诊断error/warning/info清零；只通过受保护PR合main，PR/main实际CI和日志单独核验。不直接推main，不管理员绕过。

## 当前模式推进记录

Codex build allowed：限固定52的审查、证据校准、注释/测试/行为保持的必要结构整改；单一Owner和同一隔离分支已核。新产品取舍依上方停止线。当前机器3453tracked／531closed／52review／2870pending，0新增关闭；逐文件审查和所有新阶段门尚未完成，不预填pass。

## 设计与风险

- 先处理证据仍完整的有限文件，再补真实缺口，避免把52条状态理解为52个bug或52次从头重审。
- source bytes相同也须核caller/输入/生命周期；“统一门待”消失不等于原来缺失的C/D/E/F/G/H自动补齐。
- 保留原卡/原件作为历史；当前状态变更写回live账本及本阶段索引，必要时更新相关原卡的当前段，不涂改旧执行事实。

## 实施、审查与交接

- 2026-10-25 Codex：fetch后与origin/main同点0e14，工作树干净；固定52清单与源blob。未改产品、生成物或规则，未运行新全仓/coverage。下一步按模块据证验收并补必要返工。
- done准入：pending；全部52有实质处置、缺口闭合和集中门/实际发布完成后才允许。
- 无下一位Agent提示词；由Codex继续，不要求用户搬运或重复全文复审。

- 2026-10-25首组：13个整文件代码接受，39个仍review。八维复用原全文与有效counter，补当前CLI→DATA编排、MSG、共享出口/类型和资源消费者；修四源码注释（AST不变），136相关与两个TC零诊断，未跑全仓/coverage。新计数3453／544／39／2870；原路径分母不变，剩余extract10→game12→phase2十一→tools6。

- 2026-10-26 同一提取模块子提交：用户批准移除 extractCharacterSprites/CharacterSpriteOut 及专属测试，并将 FieldKind/OpcodeDef 私有化。保留生产帧包装/PNG和已有三场景产物连通性；三个测试文件23→19、精确四身份退役。disasm复用registry推导类型并去两处多余强转，四源码发射JS不变；17相邻文件110例及extract TC0，未跑重门。另诊断脚本两正式字节/退出红已核，下一独立行为提交处理；视频新三红继续单项停止线，不纳本纯重构提交。

- 2026-10-26 诊断工具独立行为提交：合法全阻挡地图与缺地图两条真实CLI反例先为退出码业务断言红，再以partyStart空值guard恢复三绿；caller后的[5,6,1]保持176/104。新测试只把固定/tmp报告写重定向到自有临时树，不替换遍历/BFS逻辑。报告明确为直线扫描启发式，BFS实际取首个>100点区域中位，不冒称最大区域/全可达脚本真值。产品/生成资源字节不改，统一门仍等全52。

- 2026-10-26 纯清理续项：视频main移除只push从未读取的results集合；收窄无损/固定耗时等无证注释。补正实际caller邻接_utils的enemyId 1-based错注、map的half-cell/layer混淆及已接收player-role模块头的modifier误述；只改对应注释，不借相邻文件扩展整文件接受。原counter/27绿保持，同窗证据后续统一桥接，不再跑重门。

- 2026-10-26提取模块收口：固定23/52代码接受，剩game12/phase2十一/tools6，共29；新诊断专测1单列且已接受，current3454／555／29／2870。17文件110与输出/诊断4文件27有1文件/6身份重叠，机械核得20文件131身份出现项，未合称137独立合同；原红/退役正文/七源JS不变证据齐。八维与raw补入同一阶段索引，未跑重门、未推/合main。下一范围game bus/装备与动作/宿主真实生命周期，保持同一分支。

- 2026-10-26 装备四文件有限整改：六getter相同base+七槽求和抽为私有窄输入helper，毒抗clamp仍由独立getter所有；同步runner仅纠错注/去冗余tuple强转。E2用非零前像验证写0；E4使用真实全局地址并以10+128=138核256步。两枚精确变异均旧绿、新恰一条业务红、恢复绿，临时树已移除；当前3实际文件44绿、game TC0，原件暂存阶段external/equipment-*，待同一game证据包桥接。纯重构/测试补强，本提交不改产品行为、接口、存档或账本状态；重门未跑。

- 2026-10-26 测试工厂独立修复：脚本化RNG原来把非法值钳制并错误消费空区间，默认复制RNG也已漂移。正式7例先1绿6业务红，再复用生产createSeedableRng并拒绝坏fixture，6实际文件35绿、game TC0；只改测试工厂，不改产品RNG/分布/抽样次数。源码与原生红绿将在game模块证据冻结。三个无caller视图helper留至下一纯清理提交。
