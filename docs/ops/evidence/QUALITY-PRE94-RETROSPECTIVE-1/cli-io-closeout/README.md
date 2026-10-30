# CLI IO与输出边界：相关卡冻结窗口

Status: recorded
Owner: Codex

## 边界与逐文件

同一3y，承接前一[slice本地修复](../event-slice-approved/README.md)。七明确文件A–H、冻结SHA、caller/来源及限制见[review.json](review.json)。CLI全文872行及搬移差异已核；内部write与music模块新读，现有测试全文/增量及共用宿主证据按具体范围复用。CLI大编排仍rework，不以本片关闭整卡。

079150fc7仅纯搬移：两个writer正文完全相同，音乐块只改RAW/OUT根变量，其余CLI正文完全同；4df29238f只补已有六身份中的MIDI/OGG完整字节等式；314fa5eb1只补两原生错误/一默认路径测试并提前登记临时树Owner。无产品格式、路径、argv、raw或生成物变更。来源优先用Git版本和移动块，不复制整份源码。

## 观察、反控与原件

六CLI套件38绿，默认输出/原生lstat边界20相邻绿，typecheck0；都带default reporter与完整外层双流。旧MIDI测试放过空文件（6绿），新字节oracle仅指定1红；errno宽吞针4绿1红，default输出错用cwd针修正采集副本后5绿1红。初采default针的6个scripts目录ENOENT全为harness错误，原件不改、不计反控。恢复复制scripts/，未改产品、选择、timeout或规则。

[native.json.gz](native.json.gz)含原始stdout/stderr、原生JSON、执行身份/版本、失败与恢复、移动证明/反控脚本；短@@原件保留，另给校SHA的unified patch。不声称完整child流逐份保存；真实子进程关键字节/错误由业务断言核验。

## P3新停线

disasm的startBattle仍落raw7，而切分单目标表未覆盖其两个return。SDL trigger与当前game保存/接回caller一致。合法8指令scene/global探针缺L_4/L_6，raw43503条有434条raw7、334入片、327带非零return；610边中的609目的不在切片，实际仅3个不同目的6186/41073/41075。完整all.json仍完整且为生产默认，不把它说成609个游玩故障。原件同包；新修复在[既有高风险卡](../../../tasks/QUALITY-EVENT-SLICE-CONTROL-TRUTH-1.md)待用户裁决，未动P3算法，CODE3与slice仍review。

## 门禁与下一步

本窗统一门未跑、0新关闭；六文件仅候选。新两source路径review登记，旧CLI-isolated“完整透传”信用因直接反控撤review，当前3340/355closed/129review/2856pending。前窗main9b的Documentation与Coverage实际success只属旧候选。当前代码冻结后集中check/official ratchet/protected/lint，过门再逐文件裁定、推3y与同步main。94–102不扩展。

本窗复验由上一slice包的既有verify.mjs增量读取本review/附件；不再建立一套平行验收状态。快检只核当前版本/原件/指定结果，不执行测试或coverage；尚未统一门时只能LOCAL MATCH。

## 集中门实际进展（2026-10-22）

原“统一门未跑”是冻结时点。window-check实际完成：七包20,400项Vitest、typecheck与工程工具均过，lint5754文件error/warning/info为0；完整可见stdout/stderr中act、环境、未实现指令、静态与异步诊断均0。260个测试stdout块/18种不同内容另逐项分类为正常装配、存档成功、像素比对、房间就绪与读盘成本记录，不能只凭正则零命中得结论。

首次window-ratchet-protected的20,002测试/752生产源全绿，但官方门exit1，539字节stderr全为八项覆盖率比率拒绝，保留原件，不写“通过”。实际取回前窗main9b的Coverage CI原始artifact（run39639678308，artifact12366915217；服务端zip摘要ada055d2…）；旧pal-extract逐文件总数与完整旧baseline相等。对比只有cli.ts、slice.ts与两个新增内部模块四文件指标变化，其余原文件及其它六包逐项不变。

slice两段已覆盖BFS去重，statement/line仍全覆盖；搬出的IO仍纳入统计，真实CLI子进程执行未计入本进程V8覆盖率，不用排除掩盖。依据用户已授合理结构变化可精确校准的权限，6d15b6c91只在现有有限迁移表增加一项：完整旧baseline摘要+166当前路径SHA+四项精确before/after计数。原算法尾与旧条目不变，93工具测试、实际数据核对及两个额外下降反控都过；不改规则、选择、阈值或超时。官方入口无报告复用选项，故校准后必须真实重跑一次；首次失败仍独立保留。

第二次window-ratchet-calibrated仍20,002绿、计数与首次完全相同，exit1；553字节stderr仅为目标分支保护拒绝。共享Git的origin/main在采样期间被其它会话fetch前移至移动端基线，而本治理树尚无这些代码。不得据旧候选覆盖新主线基线，也不加游戏包校准掩盖缺码；当前0关闭，先同步origin/main再跑整合后的门。后续官方保护用启动时最新origin/main的完整SHA，结束后仍fetch核0behind，避免将可移动ref误记成固定采样前提。

补充输入域实测：治理树Musics缺失，主树原盘目录实际存在。real-music只读原盘86个001–087（缺029）MID、8个TRACK02–09 OGG和mus.mkf，运行实际新音乐阶段到唯一自有临时树；95个输出逐字节、manifest逐字段匹配，95个输入的SHA前后一致，输出树已清理。生产源码/原盘/主树产物未改，不是全CLI提取或音频codec/播放验收。原件含95输入的名字/大小/SHA，实际入口和双流；后续可据固定输入身份复验，不把历史样本说成任意音乐文件名政策。

旧CI来源只保留相关pal-extract原始summary/LCOV，不保留整个zip/HTML；服务端artifact摘要是来源字段，并非声称本包重新计算过整个zip摘要。两次本地失败和最终本地门的stdout/stderr则完整未裁剪保存。

## 最终接收

最新主线aba959e603be755f869c6e6c646afbbb58c479c0已整合。最终merged-check为20430项Vitest，merged-ratchet为20032项/757生产源，完整双流及语义分类0诊断；严格protected/scope与canonical投影复用同一官方报告，未再采样。接受六个review.json明确路径，CLI仍rework、CODE3/3g仍partial，账本3354/361/123/2870。六次本窗接受含CLI-isolated撤回后重验，相对最初356closed净增5，不把两个大卡或P3关闭。

之前失败与正常测试输出分类原件完整保留；一个快检格式假设及一次rebind验证器预期数组形状错误已披露/修正，不计产品反控。全部门完成后才更新这六行；发布按Git实际refs，先推同一3y、远端Docs CI，再fetch0behind快进main。后续从3w/3x原证据补真正质量缺口，不扩94–102。
