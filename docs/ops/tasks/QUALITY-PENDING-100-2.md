# QUALITY-PENDING-100-2 — 第二个百文件代码治理窗口

Status: done
Owner: Codex
Reviewer: Codex（单 Agent；审查判断与执行事实分别记录）
Phase: ops
Capability: code-quality
Visual Verification Timing: N/A（首片为软件呈现测试，不授浏览器或剧情视觉信用）
Branch: codex/code-quality-94-102

## 目标

接续已合并的[首个百文件窗口](QUALITY-PENDING-100-1.md)，按用户2026-10-28指令累计约100个实际完成八维审核的主体文件后，再集中执行重型检查、覆盖率和提交发布。

## 范围

首片是[present 主测与 hold 专测](QUALITY-GAME-PRESENT-HOST-TESTS-1.md)。后续只选机器账本 pending 且无活跃 Owner 冲突的有限模块，逐片记录准入；依赖补读、文件搬移、退役、哈希枚举和未完成审查不计入100。

## 前提真值门

同一治理分支，基点 `f47f052fa1e732f7e574e70b268790d301dada3d`，fetch 后与 origin/main 同点、工作树干净。前窗 PR30 已合并，合并后 Documentation 40543911264、Coverage 40543911792 均 success，原始日志已核零诊断；这不授予本窗集成信用。初始账本3466 tracked／695 closed／0 review／2771 pending。

## 上下文锚点

[八维与成本节奏](../code-quality.md)、[当前工作流](../agent-workflow.md)、[实时账本](../audits/code-quality-file-ledger.md)。任务事实取各子卡，证据不以摘要或包绿替代逐文件结论。

## 验证

片内只运行必要定向/相邻、受影响 typecheck 与静态检查，保留完整原件。约100主体后冻结、集中全仓 check／official coverage ratchet／protected fast；零诊断后正常受保护 PR 合并，不绕过 main 保护。不将延后门写成通过。

## 当前模式推进记录

2026-10-28 Codex build allowed：首片两测试及其任务/证据投影，单一 Coding Owner Codex，不调用子 Agent。初始0／约100；新产品取舍仍按停止线另核，仅暂停受影响范围。

## 交接

无下一位 Agent 提示词。首片审查/整改完成与统一门/提交/发布分别记录；保持同一治理分支。

## 当前计数

2026-10-28：100／100主体完成逐文件A–H与必要返工（98当前记录＋present两文件），新增Canvas宿主另列、不占主体，四重复专测退役不计数。机器3463tracked／796closed／0review／2667pending。全仓20,503例、typecheck、lint与同报official20154／809、ratchet/protected均通过且零诊断。提交前fetch恢复，main仍f47、0behind；推送/受保护PR/main CI由goal继续跟踪。[逐文件证据](../evidence/QUALITY-PENDING-100-2/README.md)。

## 第二片准入：属性与状态专测

2026-10-28：16个incoming WIP路径与前检查点完全一致，另存无损外部备份；fetch后main仍f47f052fa、0behind。Codex单一Owner，build allowed限core/__tests__/stats中六pending专测（E1/E3/E5/E6/I1/I2）及stats-test-fixtures，共7主体；E2/E4和equipment-state/equip-effect/inspect现行证据复用/相邻，不给新增主体。活跃turn-boundaries白名单及英文/SLF/剧情产物不写。只修合法fixture、注释与测试质量；必要产品取舍另停线。定向与静态随片，重门继续等约100。

## 第三片准入：RIX与音源生命周期

Codex build allowed限audio-rix.ts/test、music-source.ts/test、rix-worklet.ts/test、rix/kernel.ts/test、__tests__/rix-fixture.ts、bootstrap-audio.test.ts十主体。原RIX任务done无活跃Coding Owner；bootstrap/audio/tools-panel及vendor bridge/build脚本仅作caller/primary补读，不写其实现或生成WASM。只允许测试隔离/判别力和事实注释改进；声音/格式/接口行为新取舍停线。复用原生PCM golden与固定ABI，当前caller只把source订阅用于UI观察，不授通用重入扩展或听感信用。

## 第四片准入：输入控制与移动壳

Codex build allowed：input-direction、input-rotation及test、gamepad-input及test与host test、touch-controls及test、touch-preference及test、modal-input test、menu-input-lock test、game-shell及test、presentation、mobile-presentation test、tools-panel.mobile test共17主体。移动布局与旋转原功能卡done；英文Owner的language/static-shell仅补读、不写，turn-boundaries及剧情文件不写。默认页面寿命的shell不冒称可任意卸载；只补测试隔离/失败边界及事实注释，无产品行为/API变更。当前回归与原功能证据分别保留，不授真机/硬件或新视觉信用。

## 第五片准入：content 坐标、富文本与地图注册/图章专测

Codex build allowed：pending grid.ts/test、rich-text.ts及两专测、tileset.ts及三专测、stamp.ts及三专测、tileset-stamp.contracts、map-index四专测。实际读到的project-map/map-index实现及load/save/render caller作依赖；不重复给已closed实现计数。不写实体预览、schema值域、资产路径策略或生成物；仅事实注释与测试判别力/排重。被整文件退役的重复专测不计100主体，旧合同→存活用例逐条留映射。READ-FIRST、现行content-schema与D16/D29按历史/当前边界分别核读。

## 第六片准入：content 纯值与作者默认值

Codex单一Owner build allowed：ambience.ts/test、ambience-skill.glm-o.test、shop.ts/test/cursor-pure-wave2、world-variable.ts/test/glm-leaf-wave共9主体。既有氛围/变量工作台卡done；render/shop-input/buildWorld及skill/author-dialogue仅caller/邻接补读，不授其新关闭。不改定义字段/值域、商店结算、颜色语义或存档；只修注释、合法fixture、断言与已证排重。页面/作者默认值和运行态ownership分别核，未证明的原拟合/视觉不补授信用。

## 第七片准入：作者对话值合同

Codex build allowed：author-dialogue.ts及主测/contracts/cursor-pure-wave2/field-guards五主体。只审守卫/纯投影与专测，不改作者字段、表情解析、UI或实体预览。author-script全树caller、ActorDef和loader/render仅补读；已证重复缺资源case由更精确主测承担，unknown守卫反例不得靠as never/强转压类型。重门仍等百文件。

## 第八片准入：敌AI纯规则与守卫叶

Codex build allowed：enemy-ai.ts/test/cursor-pure-wave2、enemy-validation-shapes.ts/leaf test五主体。actual battle-core/hook/session与enemy-script/condition-guard仅读；不改随机算法/次数、AI行为或数据域。修复测试标题声称any但未执行的缺口，阈值与ruleIdx期待补强，注释只陈述当前可证范围。两无生产caller的战场/敌队leaf collector另留pending不计数，不擅删公共API。

## 第九片准入：场景目录专测、locale与迁移诊断元数据

Codex build allowed：scene-index两专测、locale.ts/test、migration-diagnostic.ts及三专测。实际复用已接受scene-index实现，current loader/project-io/item diagnostics caller补读；不改schema/物理输出策略。重复GLM诊断专测退役不计数，独有空表/类别集常量移入主测；错误类别必须在其余字段合法输入下命中，不能拿缺id造成的失败冒充category拒绝。

## 第十片准入：两包配置与测试夹具叶

Codex build allowed：game package/tsconfig/vitest.config/vitest.setup、styles.d.ts、worker-url.d.ts；content package/tsconfig及__tests__/glm-content-contract-fixtures.ts九主体。依赖声明须核实际import/工具入口，短文件不自动接受；改game tsconfig错误责任注释，退役0-caller测试断言helper的恒真/死参数分支（无产品API）。Vite中间件本体不纳本批接受，不写共享配置/版本/锁文件；重门仍等约100主体。

## 第十一片准入：战斗精灵三个专测

Codex build allowed仅battle-sprite.test/boundaries/profile.contracts三pending专测。BattleSpriteDef纯profile值合同、实际assets readiness/editor上传caller按当前源码补读；source整文件不预授接受，已发现frame集合随声明count枚举、在实际资源边界检查前分配的问题另卡冻结，不在本窗口擅加schema上限或改资产发布。只修合法typed fixture、独立集合与返回身份oracle及排重；实现/ABI不写。

## 第十二片准入：TPFS三个专测与地图两专测

Codex build allowed仅frame-sequence.test/glm-leaf-wave/contracts及project-map.test/contracts五主体。真实codec/加载/预览及project-map v4 validator作依赖补读，不授源全文件关闭；改合法metadata fixture、独立字节/路径/输出oracle、既有重复合同映射，不改格式/压缩/值域/生成物。测试组织与identity变化各自记录，退役不计主体；相关consumer与模块门只在窗口统一运行一次。

## 第十三片准入：FBP/结局/splash专测与boot夹具

Codex build allowed：fbp-player.test、fbp-scroll.grok-r1.test、ending-player.test、ending-player.glm-next-wave.test、splash-fallback.test、splash-fallback.glm-next-wave.test及grok-boot-mid-1/legal.ts七主体。source/dos-cutscenes/bootstrap与SDL对应函数只作caller/真值复用，不授实现全文件关闭。以真实Canvas替代双强转/原型伪宿主、固定时钟与像素oracle补判别力，精简噪音注释；不改演出/跳过/图像格式。必要共享canvas-host新叶另列A–H、不占pending百文件数。

## 冻结计数勘误

逐项与HEAD旧账本核对发现 migration-diagnostic.ts 原已关闭；全文复核保留但不授新增主体，原77/101阶段草稿数字多计1，当前真实新主体100。原行恢复既有证据，新增Canvas宿主另计不占100；四退役文件同样不凑数。

## 百文件窗口本地收口

2026-10-28：100主体＋1宿主叶本地接受，机器账本3463／796closed／0review／2667pending。七包全仓20503测试、必要typecheck、lint0；official20154／809无指标下降，精确8快照退役与四删文件经原合同映射核定，同报ratchet/protected0。第一次check的四条sourceRef失败、原采集中断及恢复脚本首跑语法错误均留原件。只补跑未完成editor，前六包原字节复用。新旧已审主体/原件/身份只读复验通过。

远端fetch连续TLS失败；卡保持review仅待发布，不代表这100文件还待全文复审。先保留本地已验收提交，GitHub恢复后成功fetch并确认0behind，再推送、正常受保护PR、合并及main CI核验。未合并、不宣告整个goal完成。详见[统一回执](../evidence/QUALITY-PENDING-100-2/uniform/README.md)。

## 提交前同步恢复

2026-10-28T04:11Z重新fetch成功，origin/main仍f47f052fa，治理分支提交前0ahead/0behind。上述TLS故障已恢复；100主体与本地统一门完成，卡转done。推送、受保护PR及合并后CI按goal继续执行；本提交不提前声称远端检查或合并通过。
