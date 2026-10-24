# CODE3r 事件作用域、主测与 E2E 依赖返工

Status: local technical review; unified pre94 gates deferred
Owner: Codex（单Agent）
Base: bdbcb5cec6b2a32e39fed4295a6ca0f075327808
Code: 99a0d8f75（纯重构）／b0f4a124d（主测）／a82a739f8（E2E工具）

复用[3r全文与机制](../3r-event-system/README.md)、[GLM29逐文件结论](../glm-foundation/codex-final29.json)和[3q冻结原件](../scene-quality/README.md)，本片只补实际变化及八维缺口。八个文件的逐项A–H、完整/增量读域、caller、oracle、版本指纹与324身份映射见review.json；不冒称重新全文通读5k解释器和6k测试。两个新叶模块及E2E插桩/自动批工具完整核读，opening-trace专测仅核变化依赖和相应业务用例，其它用例不授新增逐文件信用。

- **结构**：self／当前场景／全局对象定位移入只依赖类型的叶模块；保持不同fallback和诊断合同，借用原对象而不复制。NPC帧规则独立为纯函数，旧出口保留。五函数体token一致，剩余解释器JS整体token一致；仅移除私有jump的死GS参数、19实参与1void，类型收窄不改运行。185个旧公共出口保持，没有按行数制造通用helper。
- **注释与测试**：纠正pCurrent/pEvtObj、party位置、TS对象ID和dither说明；删除已经归玩家opcode模块的过时重复说明。主测324→324、两标题一一映射；真实hydrate＋createBattleState取代空fighter/核心强转，setup缺失立即失败，17个本文件写入的服务/目录在afterEach清理。补真实宿主dialog/style/死亡hold、goto跳过及命中效果、精确诊断参数与次数；显式palette源消除被清理暴露的前例依赖。
- **判别力**：end错返回、raw错参数、误清宿主dialog三枚单点变异各旧单绿／新单业务AssertionError红，原始结果与恢复正文保存。之后仅三条其它用例补goto业务断言、字色默认0x4f和deathHold断言；只读快检核其余正文与counter快照一致，未把这三条附加修改冒称新反控。
- **工具真缺陷**：meal观察器仍读已退役参数，在合法且有库存的Item进入当前真实分派时TDZ。正式可用fixture先产生AssertionError，再把采样移到有效OBJECT入口绑定之后、状态写入之前；Item拥有consuming字段。保留精确语义锚和拒绝测试。另同步3q私有调用和本片帧模块迁移漏掉的两个依赖，采样仍在整轮trigger扫描之后，严格锚计数与往返/无别名断言不变。

最终18相邻游戏文件546/546、6个Node工具文件80/80，stderr与可见运行诊断0；最后增加的deathHold断言由同文件324/324刷新，Node最后仅格式整理由2/2刷新，不把重叠例数相加。game typecheck及8文件Biome零诊断；docs/lint/ledger最终原件见review.json。Node工具执行不是浏览器004、视觉、剧情或编辑器预览验收，没有改lore/test catalog状态。

低成本复验（仓库根）：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/event-quality/verify.mjs`。默认只读，不联网、不写报告、不跑测试；核当前文件和依赖指纹、原件字节、原生身份、反控AssertionError、正文移动和完整JS守恒。MATCH只表示这些机械事实匹配，设计/全文审查结论仍按明确读域由作者负责。漂移只重核相关claim；3q旧快检会因event-system上下文及后续文档投影变更报STALE，本片以原3q八成员不变和整解释器守恒承接，不能把历史快检结果倒写成新通过。

receipts.json.gz按条目保存原件base64、字节数和SHA256，包括首次失败与纠正。过程失误分别登记：最初parallel tsImport的SyntaxError、两份未完成合法性补齐的中间红夹具不计产品红；首轮324exit0带1palette日志、首TC缺类型、首次546字色oracle错误、首次Node76中7个依赖失败和最后格式提示均不冒称干净。旧proof producer重复运行的wx EEXIST没有覆盖冻结件；它不是业务反控，提交的快检默认只读。

本片0新增closed、两个新产品路径仅review，固定83卡仍67accept／16partial／0pending。全仓check、官方coverage/ratchet/protected、新PR和main合并全部延后到剩余pre94完成；剩余广域事件装配、3s/3t及后续模块继续，不扩94–102。没有改变机制、schema/save、资产管线、旧公开签名或产品行为。

文档检查首轮125工具用例通过，但执行命令exit1：两E2E配对报告共4个sourceRef失配。其引用world-pass用例116行逐字节不变，仅515–630→516–631；仅同步当前绑定/两claim指针，保留历史quote、日期、revision、publication及执行信用。补跑实际文档消费者，不复跑未变125工具；中间两claim指针遗漏和producer原文标记假设错误分别保留。不存在“check:docs原命令exit0”的宣称。
