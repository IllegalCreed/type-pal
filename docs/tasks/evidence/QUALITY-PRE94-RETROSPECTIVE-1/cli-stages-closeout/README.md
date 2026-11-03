# CODE3g CLI 总装质量收口

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

CODE3g CLI总装质量收口（2026-10-24，基点4c684dfd、codeHead b3dc6d12）。[review.json](review.json)、[receipts.json.gz](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/cli-stages-closeout/receipts.json.gz)、[verify.mjs](verify.mjs)。七新模块（io/read、data/animation/bitmap/sprite/sound/lookup/world-assets）加CLI八新关闭，world仅刷新既有接受；固定83卡76accept／7partial／0pending。代码接受与最终集成门分开；剩余1／3m／42／53／56／57／58继续，94–102不扩展。

## 来源与输入

四笔有限纯重构把数据、动画、位图、精灵、声音、lookup写出移出CLI；根显式传入，guard、源/翻译预检、清理、交错阶段顺序和最终manifest仍由CLI持有。三段完整AST／真实import还原与唯一私有false参数内联的冻结版本证明可只读重算（proofChain: 4c684dfd→7f5946aa data-proof→18233227 bitmap-animation→653e3656 sprite-sound-lookup→b3dc6d12 cleanup-proof）；不是用哈希或行数自动认证设计。MGO镜像Set与battle平行Map已删，一个记录同时持ID和字节；仍先扫完再写，战斗清单仍在背景之后。逐阶段搬移配方冻结在bitmap-animation-recipe.json与sprite-sound-lookup-recipe.json。

## 断言与业务 oracle

六真实CLI suite一次集中39/39（身份不增减），extract TC／scoped Biome零诊断。五cliHost suite33个child完整双流已核：19 exit0、13 exit1、1 exit2；其中ENOENT／格式／往返／共享输出拒绝和缺BDF／FBP尺寸降级都是既有业务合同，原文全部保留，不能说child stderr全空；entrypoint六例保留完整外层Vitest与原spawnSync断言，未另存每个child流。观察器只追加afterAll序列化，finally逐字节恢复原测试，不改fixture、断言、选择、timeout或mock核心。实际只读MGO/F/ABC三输入前后SHA不变；两个独立临时输出树809文件的名字／大小／SHA、172条battleRefs及完整日志相等、双侧stderr空——该比较只授精灵容器重构有限等价，不冒称全CLI提取、播放、视觉或所有异常codec验收。首两个失败（DATA证明printer空白差异误拒、pnpm filter改cwd致ENOENT）均为工具/harness错误不计产品红例，原件保留。

## 结果

量化初筛main热点55→24、world12：两个>10热点定向全文核对，接受依据是命名/归属、失败顺序和可测性而非下降数字。账本预期3432tracked/460verified/84review/2888pending；无新实现反控需求（纯重构），既有产品/弱测试反控按明确版本复用。没有生成物替代修复、格式／资产政策／Save／公共包API变更。

## 限制与复核

[static.json](static.json)：六文档consumer、ledger/diff和lint-zero通过，lint6026文件0error／0warning／0info；progress为0完整性问题，不代表文档全量接受。最新main b3d35be61的Documentation（run40078127138）与Coverage ratchet（run40078127160）服务端均success，该绿属那个确切main SHA，不授当前治理候选。两个自有精灵输出树与33个cliHost child临时树均已清理。全仓check、official coverage／protected和单PR仍等全部pre94代码与证据冻结，不宣称本批已通过这些门。本治理候选不重开任务、不重跑执行、不授新信用。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3052B / SHA-256 7f78e758a5fc1cb0d48832bc45357f84f5f473f56e90c8c3c77e97e463806da4；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3g CLI 总装质量收口

Status: code accepted; final unified pre94 gates deferred
Owner: Codex（单Agent，自审身份明确）

[逐文件八维、来源与限制](review.json)、[完整原件与原产生者](receipts.json.gz)、[默认只读快检](verify.mjs)。七新模块加CLI八新关闭，world仅刷新既有接受；固定83卡76accept／7partial／0pending。代码接受与最终集成门分开；剩余1／3m／42／53／56／57／58继续，94–102不扩展。

四笔有限纯重构把数据、动画、位图、精灵、声音、lookup写出移出CLI；根显式传入，guard、源/翻译预检、清理、交错阶段顺序和最终manifest仍由CLI持有。三段完整AST／真实import还原与唯一私有false参数内联的冻结版本证明可只读重算；不是用哈希或行数自动认证设计。MGO镜像Set与battle平行Map已删，一个记录同时持ID和字节；仍先扫完再写，战斗清单仍在背景之后。

六真实CLI suite一次集中39/39，身份不增减，extract TC／scoped Biome零诊断。五cliHost suite33child完整双流已核：19 exit0、13 exit1、1 exit2；其中ENOENT／格式／往返／共享输出拒绝和缺BDF／FBP尺寸降级都是既有业务合同，原文全部保留，不能说child stderr全空。entrypoint六例保留完整外层Vitest与原spawnSync断言，未另存每个child流。观察器只追加afterAll序列化，finally逐字节恢复原测试，不改fixture、断言、选择、timeout或mock核心。

实际只读MGO/F/ABC三输入前后SHA不变；两个独立临时输出树809文件的名字／大小／SHA、172条ref及完整日志相等，双侧stderr空。该比较只授精灵容器重构有限等价，不冒称全CLI提取、播放、视觉或所有异常codec验收。没有生成物替代修复、格式／资产政策／Save／公共包API变更。

首个DATA证明因printer空白差异误拒，修正完整结构遍历后四条判别控制和全部正文匹配；首次实际精灵命令因pnpm filter改cwd而ENOENT，writer未运行，换仓库根执行同producer成功。两失败原件均在包中，不计产品红例。证据工具格式首跑1error／5info的工具输出未落raw，仅保留作者披露；紧接相同六诊断复跑的完整raw已保存，随后修代码而未放宽规则。原反控／产品红绿沿明确版本复用，不重造。

当前只读快检也核活动83卡派生汇总一致；实现／caller／依赖／测试／合同变化会使相应pin过期，需要定向复核。全仓check、official coverage／protected和单PR仍等全部pre94代码与证据冻结，不宣称本批已通过这些门。

[静态门完整双流与CI/清理原件](static.json)：六文档consumer、ledger/diff和lint-zero通过，lint6026文件0error／0warning／0info；progress为0完整性问题，不代表文档全量接受。最新main b3d的Documentation与Coverage服务端均success，该绿不授当前治理候选。两个自有精灵输出树与33cliHost child临时树均已清理。
```
<!-- incremental-original-source:end -->
