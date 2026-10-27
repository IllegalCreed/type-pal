# PR30：RNG fast／原盘测试合同修复

## 实际缺陷与范围

PR30首候选 `be4ab0cb8d294050da4b5d6f004b4748ea3f982b` 的Coverage run40529517328仅一例失败：新迁移的RNG writer测试在fast任务读取未提供的 `data/raw/RNG.MKF`，ENOENT；其余356个extract fast用例通过。服务端测试合并树为32e0d8e566f529d591919ceed33bb61173639d0f。完整job原件单独保存；下载鉴权URL的网络错误不进入公开附件。

这是本次漏核的运行环境前提，原本地20536包测试／732工具及首次采集只能代表有原盘的原候选，不可冒称无原盘CI通过。当前只修两测试与证据/source pin，三个退役API的生产实现和其它pending范围不扩展。

## 文件与八维

- `animation-assets.rng.test.ts`：fast实际执行writer，三外chunk含空chunk；sub-MKF含索引0/2与空尾槽，gzip完整原字节、完整manifest及两帧完整surface分别断言。复用既有LE/MKF及literal-only encoder仅造输入，期望不是生产输出推导；明确owned临时树与清理，无原盘/核心mock依赖。
- `animation-assets.rng.pal.test.ts`：与首候选原文件逐字节相同，12chunk、1464帧清单、54帧读回及原字节守恒全部保留。只改变文件名使它进入项目既有full/raw合同；未加skip、新exclude或配置变更。完整A–H桥接和原文件SHA随增量记录；作为相邻迁移文件不凑第101个主体。
- `approved-baseline-adjustments.mjs`：只替换当前writer测试SHA并追加原盘伴随文件SHA；原有限指标数据和运行时谓词不改。已有批准的branch比较673/796→661/790仍须经真实当前报告验证，不以环境修复消耗其它增益。

A正确/边界：真实writer、IO和shared decoder完整核读；空chunk与稀疏帧不被挪位。B注释：区分fast与原盘前提，注明SDLPal op06/02/13和fixture encoder的证据边界。C内聚/ownership：每例显式临时根，生产函数不改，退出清理。D复用：共用纯输入造器，不将原盘oracle与自足fixture混为同合同。E测试：原合同不退役，无data树旧单红/新绿；单点压紧索引变异旧原盘绿/新唯一业务AssertionError。F可读性：first/later/other及字面索引/完整对象清楚表达保留关系。G简洁：仅一fast合同与一原盘接线，各有独立运行前提，不恢复旧适配器。H可测性：fast不再依赖用户私有原盘；原盘full入口明确且仍严格执行。

## 当前验证

无data目录的完整临时包中，原用例精确ENOENT，新用例通过；不是跳过缺文件。三个YJ2向量由既有有界SDLPal C真正读至EOS，解出4／5／4字节，与手列命令字节完全一致。原盘合同逐字节守恒；索引压紧反控只改临时生产副本，原盘1绿、新fast唯一manifest断言红，源树未改。

两个RNG＋FIRE共5例绿，完整extract83文件413例绿，extract typecheck零输出。其它六包源码/测试不变，复用原全仓20,536包测试与732工具原件，仅替换受影响extract包的当前验证；未再跑整仓check。测试入口改变后另起一次必要official采集，原报告冻结保留，不把原fast身份替换成当前结果。当前新采集20,188/809、ratchet及protected实际exit0/空stderr，七包809源的每文件summary与首报完全相同；仅快测身份重新采集。远端复验仍待，PR尚未合并。

后续快检仍从[窗口统一入口](../README.md)进入；当前增量收口后给只读验证与无损原件索引，不要求再次全文审查100文件。原阶段“唯一采集”描述只限首候选；本次重采因真实CI失败和测试输入改变，不是小切片例行重跑。

附件收口披露：初始native.json.gz采于官方进程运行中，仅为checkpoint；旧包逐字节保留。完整native-complete.json.gz另行生成，核原stdout前缀及其它成员不变，包含完成的命令/exit与完整日志，不用中途快照冒称全量原件。首次复验因尚未补齐完整包而拒绝，修正后只读复验0.28秒通过。
