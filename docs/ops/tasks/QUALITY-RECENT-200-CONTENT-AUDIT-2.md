# QUALITY-RECENT-200-CONTENT-AUDIT-2 — 最近两百文件剩余项逐文件复核

Status: done
Owner: Codex
Reviewer: Codex（单 Agent）
Phase: ops（第一／二阶段按文件区分）
Capability: code-quality
Visual Verification Timing: N/A（不授新增视觉、E2E或资源格式信用）
Branch: codex/code-quality-94-102

## 目标

接续[首轮风险抽核](QUALITY-RECENT-200-ACCEPTANCE-AUDIT-1.md)，完成最近200主体中此前尚未复核的全部153个文件。用户2026-10-28在本轮发现新缺口后明确要求剩余文件全部复查；已复核47及本轮首15不重复做，仍有效的版本证据保留。用户要求按复杂度收缩切片，不能为了100文件降低标准。

## 范围

首片15个既有主体：shop三文件、ambience三文件、grid两文件、tileset三文件、stamp四文件；完整路径见[证据入口](../evidence/QUALITY-RECENT-200-CONTENT-AUDIT-2/README.md)。均属于原200、未被前47主体抽核。剩余138的固定清单见同目录queue.json；枚举/指纹只排期，不授阅读信用。必要的small-guards商店段、公共出口、实际runtime/editor caller和共享夹具作依赖补读，不充主体数。

写白名单为固定剩余主体内必要的注释、测试组织、断言、排重和有证据的内部结构整改，以及原回执的对应勘误、任务/账本投影。每片开工核活跃Owner并记范围；不改定义值域、结算规则、资源格式、存档或产品接口，新行为缺陷按实际风险另核准入。已批准的商店归属修复单列，不扩张其它机制授权。

## 前提真值门

基点6ebca402ae2c419ad9922f8d29097b45ea6a0df6；fetch成功后origin/main与治理分支0/0，工作树干净。合并后documentation 40653820151与fast-coverage 40653820177均success；完整日志CRC通过，可见warning/act/stderr/unhandled计数均0。首次fetch TLS失败保留，重试成功后才开始写入。

只核二阶段canonical源码/实际caller，不套用第一阶段逐状态保真。最强替代解释：共享纯值合同允许必要复用，相关断言可以成组；只有不同调用边界、已证重复或可证伪缺口才整改，不能用文件短、名称混合或措辞相同自动判差。

## 上下文锚点

[八维规范](../code-quality.md)、[工作流](../agent-workflow.md)、[二阶段边界](../../phase2/READ-FIRST.md)、[原第二窗口](QUALITY-PENDING-100-2.md)。原已关闭证据按精确版本复用；原200既有关闭不重复加数；新增路径helper单独逐项验收，发现重要问题则撤回相应文件信用。

## 验证

每个主体全文读取，记录具体A–H、caller/类型/ownership、逐例oracle、独有/重复合同及处置。旧→新测试映射和完整原件保留在本卡证据目录；低成本入口默认只读，不把指纹匹配当语义证明。

只跑改动相关的定向/相邻、typecheck、scoped静态与docs。全仓check、coverage与protected等待下一稳定大窗口，不因本片反复执行，不冒称已通过或已集成。

## 当前模式推进记录

2026-10-28 Codex build allowed：单一Owner，同一隔离治理分支；已核活动看板及相关卡，无shop/ambience/grid/tileset/stamp活跃写入Owner。实体预览、剧情、英文与其它治理线不写。无新分支/worktree；主工作树不动。

同日有限扩写：small-guards.glm-o.test.ts的四个商店重复用例移除，唯一的null条目拒绝迁入主测；删除仅服务该段的world/item两个夹具及过时排重宣称。该相邻文件全文已读，但非原200主体，不新增全文件关闭。用户已批准[商店定义归属修复](QUALITY-SHOP-DEFINITION-OWNERSHIP-1.md)，允许shop-box.test.ts补真实确认调用回归，不改UI实现；相邻测试同样不计15主体。

## 交接

首15核具体测试合同和定义查找，完成必要有限整改；接着逐模块读完固定余下138，补齐八维与必要返工。审查完成、定向验证和统一发布分别登记；不得把本片结果外推剩余文件。重型门在整个稳定窗口集中一次，不因每片频繁开PR或覆盖率。

## 下一位 Agent 提示词

无下一位Agent提示词；当前Codex单Agent执行本卡，未完成项在本卡与证据中继续。

## 第二片准入：纯文本、作者变量与守卫叶

2026-10-28 Codex单一Owner，build allowed：rich-text三文件、locale两文件、world-variable两文件、enemy-validation-shapes及leaf专测，共9原200主体。相关实体/变量工作台原功能卡不扩写；entity-display只读，不抢活跃实体预览文件。只清理富文本迭代的现有ignore、核纯变量/叶守卫及测试质量；Locale行为修复已有单项用户授权，不扩其它查表。全部主体全文读，生产caller/相邻类型按实际函数边界补读，不算额外主体。

## 第三片准入：作者对话、敌AI与地图目录专测

Codex单一Owner，build allowed：author-dialogue三个剩余专测、enemy-ai两专测、map-index三专测，共8原200主体；author-dialogue与enemy-ai实现复用前47已核精确版本，不重复全文。无活跃Owner重叠；不改机制、字段、资源或实体预览。map-index.contracts的tileset重复段按合同迁回已核tileset主测，只补该增量，不重做前15。AI fallback断言补完整action/ruleIdx；归属与schema取舍不扩张。

## 第四片准入：场景目录与迁移诊断

Codex单一Owner，build allowed：scene-index两专测、migration-diagnostic两专测，共4原200主体。对应实现全文补读，诊断fixture全文核定地址0与合法字段；只收窄错误断言和按合同排重。地图/场景normalizer的输入、输出、失败策略与生命周期逐段比较完全相同，仅错误前缀不同，允许在内部project-json-path.ts共享同一规则，两个公开领域入口/签名/错误保留；新helper不进入公共barrel，资产catalog的“拒绝不规范化”合同不接入。该纯内部提取及相邻map-index/scene-index实现不充原200数，不改路径政策或资产输出。原函数逐段还原与现有路径矩阵作行为保持证据，不添加镜像测试。

## 第五片准入：资源容器和地图专测

Codex单一Owner，build allowed：battle-sprite三专测、frame-sequence主测/leaf两文件、project-map主测/contracts两文件、glm-content-contract-fixtures共8原200主体。FrameSequence实现605行、ProjectMap剩余authoring/codec和战斗精灵实现及真实readiness/codec caller补读，不充主体。已登记战斗精灵声明帧风险继续draft，不授源文件关闭或擅改上限；本片只改必要测试oracle/注释。TPFS叶fixture以独立固定的v1/codec/32帧合同代替导入受测常量，防fixture与生产常量一起漂移；实现与格式不改。

## 第六片准入：工具专测与初始化器输入

Codex单一Owner，build allowed：coverage的metrics/inventory/environment/full-inputs/config/protected-baseline六专测、quality的lint-zero专测，以及initializers目录九fixture，共16原200主体。原任务done且无活跃Owner冲突；不改覆盖率实现、选择范围、规则或baseline。已有精确计数/身份/诊断反控按版本复用；主体仍全文阅读。只补protected classifier四格真值表遗漏的baseline有/config无断言，不增加测试身份；其它16文件不为了凑整改强改。工具单测及小fixture原生探针回归不是官方全仓覆盖率采集，后者仍等整窗。

## 第七片准入：RIX余项及偏好输入叶

Codex单一Owner，build allowed：audio-rix.ts/test、music-source.test、rix-worklet.ts/test、kernel.test、rix-fixture、bootstrap-audio.test八主体；input-direction、input-rotation.ts/test、touch-preference.ts/test五主体。music-source/kernel/gamepad/touch实现属于前47已核者，复用精确版本和真实调用域，不重做全文；实际bootstrap/source及原生PCM来源补读，只改bootstrap-audio过宽标题，明确仅核syncShellAudio输出而非真正CG/RAF生命周期。原RIX/移动功能卡done无重叠Owner；不改音频/偏好/UI机制或WASM产物，不授新真机/听感/视觉信用。

## 第八片准入：设备宿主、modal与移动显示

Codex单一Owner，build allowed：gamepad-input/host两专测、touch-controls专测、modal-input/menu-input-lock两专测、game-shell.ts/presentation.ts、tools/mobile-presentation/tools-panel.mobile两专测，共9原200主体。game-shell主测已在前47，仅读必要装配增量；输入/touch/gamepad实现复用前47当前版本，不重读整套。生产shell是单次页面寿命，不冒称可反复卸载；测试短宿主清理另核。移动偏好首例只切布局、未写移动选项，标题收窄为实际被抑制显示及保留桌面存储，不捏造“移动写入隔离”合同。presentationKey确有minimap读写caller，FPS/计时器目前是移动强制隐藏，不能盲目统一持久化策略。

## 第九片准入：配置、类型声明与hold专测

Codex单一Owner，build allowed：game package/tsconfig/vitest.config/vitest.setup与styles/worker-url声明六文件、content package/tsconfig两文件及present-hold专测，共9原200主体。配置必须核真实import/CLI/根严格配置；不改规则、include/exclude、依赖版本或超时。修game Vitest过时的不存在的pnpm e2e注释，指向实际scripts/e2e独立入口，配置正文不变。两个声明由CSS side-effect与RIX worker URL真实消费，类型合同只typecheck不造运行时测试。hold九例核优先级、帧ownership与完整像素，present实现/主测已在前47范围复用，不重新加数。

## 第十片准入：属性与检查器专测

Codex单一Owner，只读完整复核六stats专测与stats-test-fixtures七主体。当前活跃turn-boundaries白名单不写；实现/类型/检查器真实caller按已验版本复用与必要函数补读，不重推SDL所有机制。合法六角色runtime、七effect槽、global script地址含end、正式战斗构造和poison队伍槽逐项核；发现反例才窄修，不为了本轮有diff改写已充分测试。

## 阶段记录：集中门之前

153原200主体全文八维完成，连同前47累计200／200；固定排队0。当时零新增关闭信用，新增路径规则helper暂pending（现已按下节统一门接受，新增1）。content整包1473、reforge相邻36、editor相邻31及相关typecheck通过；content最后一次快照helper窄改仅补跑tileset3例。改动20文件scoped静态0/0/0。首次structuredClone类型错误及格式两诊断保留，均已窄修；全仓check/official/protected未跑，发布未启动。两已批产品卡代码接受待本父窗口集成。

## 第十一片准入：开场／结局与提取叶专测

Codex单一Owner，build allowed：剩余五个FBP/ending/splash专测，以及asset-manifest三专测、表解析/fixture、palette、enemy-pos、BDF三专测等原200排队项。核活动看板，当前在飞实体／英文／剧情任务不重叠。只补测试、注释和同合同test-only MKF构造复用；不重跑已核47或改变资源格式。五播放器相邻实现补读，允许删除无caller的私有_blitFullScreen/恒零时间偏移并纠正定时器、默认跳过和MGO接线注释，不改变播放流程；相邻源不计原200主体。数据精灵合成用例由单字节PNG魔数改为真实解码后完整尺寸／RGBA；原生摘要继续复用已冻结来源。

## 第十二片准入与冻结：资源余项和事件编解码

Codex单一Owner，build allowed：固定队列最后20主体，含misc-mkf、FIRE/RNG当前writer专测、scene fixture/两专测、map、BALL/RGM两专测、events十专测与bytecode fixture。无新产品修改，完整实现与CLI/writer真实边界补读。BALL/RGM共底层解码/PNG，但领域诊断归属不同，合并需增加通用日志策略与stack改变，未强行抽象；RNG与FIRE失败政策不同不混。源码recompile头注只更正可逆子集事实，不改接口/格式。R05一重复startBattle例由KIMI完整command/双目标/字节断言承接，原契约未失。

本窗口153主体及必要相邻改动冻结；全原200均已逐项复核，非全仓完成。提取整包83文件412例与播放器5文件22例均exit0、default reporter可见诊断0。新增PNG反控首筛选匹配父describe导致过选，已保留失败原件；修正为leaf词组后旧指定1绿、新指定1业务红，源码/测试精确恢复。统一全仓check、official ratchet/protected与最终lint/账本现在集中执行，不再新增治理模块。

## 当前窗口代码收口

2026-10-28 Codex单Agent：153本轮主体＋前47有效复用＝200／200，原200复查排队0；不授其它pending信用。两已批归属修复正式红例／真实caller与相邻验证成立。全仓20506／typecheck／lint0；官方20157／810采集按包恢复，精确content重计与三退役快照后同报ratchet/protected0。失败原件和限制见父窗口audit；最后文档／静态回执及受保护PR发布事实另据实际命令，不提前冒称已推送/合并。无新增产品取舍。

最终静态补验：check:docs、lint6195文件0/0/0、diff检查、只读证据校验与账本全部通过，具体命令／时间／完整原件见证据gates.json。原200不重复计数；新增helper1已单独关闭，当前3464／797closed／0review／2667pending。后续同一治理分支分提交并受保护发布；实际远端状态以Git/关联PR为准，不在此预写合并。
