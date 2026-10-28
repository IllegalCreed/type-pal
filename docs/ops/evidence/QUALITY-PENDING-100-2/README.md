# 第二个百文件窗口：冻结审查回执

## 身份与范围

[父卡](../../tasks/QUALITY-PENDING-100-2.md)，唯一治理分支 `codex/code-quality-94-102`，最近成功 fetch 基点 `f47f052fa1e732f7e574e70b268790d301dada3d`，0 ahead / 0 behind。主工作树未写。70条改动路径的外部恢复包已逐字节校验；这些备份不构成审查信用。

实际新增主体 **100**：present 2、stats 7、RIX 10、controls 17、content surfaces 15、content values 9、author dialogue 5、enemy AI 5、index/locale/diagnostic 6、配置与测试夹具 9、battle sprite专测 3、TPFS/地图专测 5、cutscene专测/boot夹具 7。[逐文件A–H与指纹](review.json)列后98个，前两个沿用[完整present证据](../QUALITY-GAME-PRESENT-HOST-TESTS-1/README.md)。每个文件完整读取与实际caller/类型/生命周期的判断均由Codex单Agent完成，没有继承GLM自报全绿。

冻结核数发现 migration-diagnostic.ts 原已关闭，全文补读仍保留但不计新增；早期77/101阶段草稿数字多计1，已明确勘误为100。四退役专测、依赖补读与新增Canvas宿主不凑主体。宿主另列A–H。因此机器账本为3463 tracked / 695 closed / 101 review / 2667 pending；101 review含100主体和1新增宿主，这是冻结时状态；当前本地统一门已通过，101条转closed，现3463／796closed／0review／2667pending。

## 整改与验证边界

本窗仅测试、注释及零caller测试helper整理。没有产品可执行体、资产格式、存档、公共运行时接口或游戏行为修改。测试整改包括合法角色/脚本地址夹具、真实any组合子反例、输入/输出归属、RIX释放、DOM订阅清理、真实Canvas像素区域与异色渐变、确定时钟及失败清理。删除重复guard/roundtrip与空泛any-content，保留有效边界在现用合同中；[原身份与当前承接](identities.json)保留所有375条baseline原生身份，包括相邻文件，不把它们当新增数量。present另有67条身份映射。

定向与相邻原生结果、命令/时间/exit/完整stdout/stderr在[native索引](native-index.json)及无损[native包](native.json.gz)。逐组实际文件数/例数见review.batches.nativeCounts；前后集合含不同相邻文件，不能直接相减当退役数。最新cutscene六文件26绿；上一十文件48绿另含22条boot夹具消费者。game/content冻结typecheck均exit0、输出为空。若干片内Biome仅保存工具输出，未补造原始日志；统一静态门会另存完整原件。

敌AI `any → false` 单点反控：旧文件9绿，新文件8绿/1个AssertionError，身份为 `evalAiCond 组合子 all/any/not`，临时副本已清理，产品源未变。present两枚旧绿新唯一业务红及历史失败设置原件保留原证据包；没有重跑已接受反控。正常定向stderr均为空；变异失败属于预期判别实验，不能标成质量门通过。

## 未关闭的风险

- `battle-sprite.ts`声明200000帧时仍通过guard，FrameDemand(definition,1)构造集合后spread Math.max抛RangeError。已保存有界只读原件，[风险卡](../../tasks/QUALITY-BATTLE-SPRITE-DEMAND-BOUNDARY-1.md)为draft；未证明普通工程/UI可达，未改资产值域/实现。三个专测的有限域质量接受不替该源关闭。
- 两个无生产caller的battle-field/enemy-team leaf collector及两专测仍pending：旧teamId夹具与声明用途有债，未擅删公共出口。
- splash源的rAF/fadeout/skip注释及死helper仍pending；本窗只接受列出的专测，不把软件像素证据写成整段原版视觉验收。

## 低成本复验

仓库根运行 `node docs/ops/evidence/QUALITY-PENDING-100-2/verify.mjs`：只读检查100主体身份/A–H/当前字节、依赖包原件完整性、baseline身份承接、正常运行与故意反控分开，以及产品可执行体不变。它不代替语义审查，不重复测试或coverage。发生字节/合同漂移后仅回核受影响claim，不能直接刷新指纹消警。

## 统一质量门与发布

目前已冻结，尚未执行本窗全仓check、官方coverage ratchet/protected或远端PR。后续集中执行并保存完整失败/成功原件；全部硬性门error/warning/info清零后才提交推送、正常受保护PR合并。没有用前窗PR30绿替当前门，也没有修改ignore/exclude或降低任何规则。

统一门执行、中断边界、失败原件及最终结果见[统一原件回执](uniform/README.md)。全仓20503包测试、typecheck/lint零诊断，official20154/809，同报ratchet/protected通过；指标没有下降。早先TLS故障已恢复，04:11Z fetch成功并确认main仍f47、提交前0behind；推送、受保护PR与main CI继续由goal跟踪，本提交不提前声称远端通过。
