# CODE1 工程／Q1b质量收口与格式边界补证

> 当前代码结论与来源修复见[PAL来源修复](pal-source-fix/README.md)。下方Q1b/格式停线记录保留原时点；原生与工程证据按新版本桥复用，统一门尚未完成。

Status: current scoped receipt
Owner: Codex
Date: 2026-10-25

## 裁定

同一codex/code-quality-3y，基点ea8651ce3f071e6ad04ac2eb042d28725c47eb7a，单Agent。当前project-reference.pal.test.ts全文八维接受，刷新原仅“过期数量oracle”的历史关闭；**0新关闭**。原工程清单／账本四文件复用CODE6a已接受的逐文件八维、caller和原始反控，实际源码SHA全部相同，不重做全文或工具回归。

CODE1已明确原卡三个范围：工程清单、RLE、Q1b；前者和Q1b此窗收口，RLE测试六范围依上窗，**RLE产品格式仍review，整卡partial**。固定83卡仍80accept／3partial，另两卡3m／42未提前接受。全仓check／官方coverage／protected／PR继续等全部pre94，不扩94–102。

## 实际代码质量整改

原964行测试把实体／场景／战斗数据／角色／物品／精灵／资源／行为／Worker九类合同塞入一个test。现按九个可定位身份组织，真实作者工程只在beforeAll加载和投影一次；各例只查询该快照、排序局部数组，Worker例单独创建可变runtime。原30秒限制移到setup，未增加，单例仍走正常超时。公共API、生产实现、工程JSON和断言值均未变；不触碰ED状态方案实现。

[具体A–H与真实caller边界](review.json)区分固定数量／命名owner和locator、旧collector适配关系、Worker传输。同核比较不是独立算法oracle：资源路径共享collectAssetReferences，只支撑两适配路径一致；固定数量、剧情四处portrait和真实删除blocker另有直接断言。此窗只检查canonical作者数据／工具合同，不用SDLPal第一阶段机制验收二阶段。

[完整映射](split.json)记录原119条语句去向。[只读AST证明](prove-split.cjs)逐条检查setup和九组当前语句、全部84个matcher AST、imports／常量／输入表达式均保留，不以数量相同冒充等价。它证明代码保持，不能自动认证设计优良；全文八维判断由Codex本次实际审查承担。

## 验证和原件

- 基点1／1；拆分9／9；seed20261025打乱顺序仍9／9，0skip、无诊断。总耗时约6秒，setup没有按九倍重复。
- 相邻4文件78／78：index、adapters、diagnostics、derived-store；editor typecheck exit0、stderr0。
- 没有行为修复，不伪造“先红后绿”。AST工具初次因在仓库外临时目录找Git根失败，原件和初版脚本保留；修正cwd后只读证明通过。这是工具环境失败，不算业务反控。
- [无损原件包](receipts.json.gz)收完整stdout／stderr、native JSON、精确命令／cwd／时间／exit／signal、产生者和证据映射，每成员字节数与SHA均可复算。

[539份实际PAL JSON指纹](fixture-inputs.json)绑定当前census；它们不是“已全文读完539文件”或完整剧情E2E信用。实际全文：964行基点测试及全部变更；bounded caller包括当前工程loader、toEditorState、diagnostics投影、index只读query、Worker实例ownership和资源collector两入口。actor／item／battle等更广产品文件不因作caller升整文件accept。

## 格式前提新证据：必须区分输入来源

归同一[格式风险卡](../../../tasks/QUALITY-RLE-COMMAND-TRUTH-1.md)，没有新产品build：当前公开编码器用合法285×346和1×1两帧就生成第二偏移99396（WORD49698）。当前宽容／严格均正确返回两帧；未改SDL原取帧函数却会把它指向33860。无来源区别套用该规则会丢作者合法帧，严格入口报frame0像素越界。因此不能只在通用codec加一行特殊值判断。

真实MGO571仅在内存中改其偏移表后，严格／legacy入口都得到两帧、坏尾0；两帧完整pixels／opaque SHA与上窗独立原生C输出完全一致。实际当前catalog记录经过validateAssetCatalog，调用真实Reforge公共decodeWorldSpriteAssetBytes仍读一帧；内存候选连同正确元数据经同入口得到两帧。此事实涉及源格式适配，不能声称已修或授权改资源。

迁移器还冻结571为1帧／1坏尾、全组4133帧／30坏尾；这些计数需要随最终获准方案按事实校准。归档保存完整typed探针、未改C函数／编译原件和两轮结果；原盘、提取物和作者工程零写入，未在projects/pal打补丁。没有执行PAL.EXE、全二阶段或完整结局验收。

## 低成本复验

在治理树根运行：

```bash
node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/code1-closeout/verify.mjs
```

默认只读、不联网、不跑tests／coverage，核候选上下文、539输入、119／84映射、真实native结果、原工程四文件及RLE代码版本桥。版本变化只使相关claim待核，不机械重读全部。原RLE快检的历史static报告绑定了当时父卡／看板；本窗进度文字改变不影响其代码／原盘／原件，不能因此重复59例或伪称旧static适用于今天。

需要定向重放时，从原件包展开到新owned临时目录，按冻结命令修正路径；wx不会覆盖冻结件。未变邻测／类型／原生和旧工具证据直接复用。后续只剩已登记的格式／数值／对话产品裁决，未知不关闭。

过程补充：新证明工具初次格式门有两条useTemplate info，exit0也未记通过；手动修正模板字符串。格式化statement映射后，旧SHA被快检如实拒绝；核JSON语义未变后绑定最终字节，两次回放原件保留。没有降低规则或静音。当前最终[文档／lint／ledger原件](static.json)单列，不复跑未变的125项docs工具测试。


## 2026-10-25 两文件B维窄修与版本桥

只改shared/rle.ts及rle-encode.ts注释：真实game重导出、indexed容器通用职责、legacy跳尾的校验策略与原盘真值分开、作者格式与PAL规则区别、编码器131070整体上限不冒称u16格式必然限制。没有临时待裁状态塞入产品文案。完整[两源前后指纹](rle-comments.json)及[只读AST证明](prove-rle-comments.cjs)确认imports／类型／所有执行体逐字打印一致；59个RLE／52相邻及原类型结果复用，不重跑。

默认快检只对这两份已证明的注释delta采用新SHA，且必须先匹配原验收SHA并执行完整AST等价证明；其它旧context继续逐字节校验。原raw不改、不盲刷旧source hash，不继承格式正确或整文件新接受信用。rle.ts仍review，encoder历史代码接受只刷新本注释增量，0新关闭。

2026-10-25当前：用户原盘读取裁决已收到，[PAL来源修复与CODE1代码收口](pal-source-fix/README.md)取代本页旧format停止线；原工程／Q1b及539fixture证据有效复用，旧原件不重写。整批统一门另记。
