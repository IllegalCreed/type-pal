# CODE2b YJ2逐文件复审与独立字节oracle

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本篇是 CODE2b「YJ2 测试精度」切片的证据索引，归 [QUALITY-PRE94-RETROSPECTIVE-1.md](../../../cards/QUALITY-PRE94-RETROSPECTIVE-1.md) 全 83 卡复审（起点 8bac3254d / main=f98d0ddd8，唯一 3y 分支、单 Agent）。本片真实目标：生产 YJ2 与 extract 重导出字节不动，只修两处测试精度——pal-extract 的 io/yj2.test.ts 两个只看预分配长度的弱例整合为 1 个独立 SDLPal native 字节 oracle；shared 的 rle.glm-o.test.ts 移除与规范边界重复的 4 个 YJ2 用例（13→9）。整卡 partial、0 新增关闭。页首注记的后继事实：2026-10-21 shared 逐文件 A–H 已升级为当前 accept（[evidence.json](../shared-codecs/evidence.json)），归约/重复缺口闭合、O-5 限支持域，本页以下 partial/未跑/旧计数均为历史片段。

## 范围与证据

逐文件真实读取范围：shared/src/yj2.ts 211 行全文（建树/调整/位读/回引逐段核：每次调用独立树/输出、表只读、输入不变、DataView 保留 byteOffset、early-EOS 零尾保持）；yj2.boundaries.test.ts 73 行（仍 9 例，纠正「空窗口回引待证」过期注释，末例本有独立错误字节）；rle.glm-o.test.ts 180 行（去 YJ2 四例及专用 imports 后 RLE 测试体逐字节不变）；pal-extract/src/io/yj2.ts 6 行（真实 re-export，无算法复制）；io/yj2.test.ts 33 行（MGO 前 20 chunk 完整输出独立 native SHA oracle）。native 对拍 2626 段/34367608 字节逐字节一致（[native-proof.json](native-proof.json)，探针 [native-probe.py](native-probe.py)）；变异反控 [before-proof.json](before-proof.json) 与 [after-proof.json](after-proof.json)；退役登记 [retirement.json](retirement.json)；恢复回执 [tests.json](tests.json)；另进程核验 [verification.json](verification.json)；静态门 [gates.md](gates.md)。

## 发现

判别力真实数字：长度-only 零输出变异（只保留过短拒绝）下，旧共享两文件 22 例 15 绿 7 业务红，7 红全部落在规范边界 oracle（无位流显式失败、回引缺位置参数、三字面向量、ABC 重叠复制 ABCABCA、early-EOS 零初始化、回引超剩余空间、首指令回引未产生输出）；补证后 18 例 11 绿 7 红、失败集合完全相同——删掉的 4 个 YJ2 用例对该变异冗余。旧 extract 两例同变异仍 2 绿（盲点实证），新 1 例 native 字节 oracle 精确 1 红。rle.glm-o.test.ts 13→9 退役有双 identity digest 与 HEAD/main/旧 3y 三参考快照，matcher 批准前拒绝后才登记；extract raw 测试本不在三参考 fast inventory，不伪造退役豁免。

## 结论

本片时点结论：生产 YJ2 与 extract 重导出未改；混合文件旧关闭撤回 review、extract 新登记 review，0 新增关闭，机器 3287 inventory/215closed/209review/2863pending。边界如实：正常 raw 对拍不证明独立树归约向量或全部非法输入（树归约独立向量当时仍待证）；C 目标缓冲零初始化 shim 不能推广为任意 C caller 的 early-EOS 合同；只送真实合法压缩输入、未执行 pal.exe。上述树归约缺口由后继 shared-codecs accept 片补齐（YJ2 增独立树归约固定向量，禁用归约时恰 1 个字节 AssertionError）。

## 整改与复核

恢复门：定向 34、shared 16 文件 126+typecheck、extract 相邻 18+typecheck、coverage-tools 69 通过，0 fail/0 skip/0 act/环境/navigation；全仓 check、官方 ratchet、protected fast 未重跑，editor 诊断未清，不合 main。本治理页不重开任务、不重跑执行、不恢复旧完成声明；后续事实以 shared-codecs accept 片与全 83 卡队列为准，候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 5705B / SHA-256 0a55a00f3e17fa5baad9e4a0479f8578c77d717dcad08b4a6af65f23ff4c7538；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE2b YJ2逐文件复审与独立字节oracle

> 2026-10-21当前accept：[shared逐文件A–H与完整门](../shared-codecs/evidence.json)。归约/重复缺口已闭合，O-5限支持域；以下partial/未跑/旧计数均为历史片段，保留原件，不作为当前门。
归[全83卡复审](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)，起点8bac3254d/main=f98d0ddd8，单Agent、唯一3y分支。生产YJ2与extract重导出字节未改；本片只修测试/注释与精确退役支持数据，整卡partial、0新增关闭。

## 实际完整读取与结论

| 文件 | caller/primary/oracle/ownership及当前结论 |
|---|---|
| shared/src/yj2.ts（211行） | 全文及C的建树/调整/位读/回引逐段核。每次调用独立树/输出，表只读，输入不变；DataView保留byteOffset；位流/负窗口/目标溢出显式失败，正常LZSS重叠按前向逐字节，既有early-EOS零尾保持。shared/rng真实caller已在CODE2完整读且当前未变，extract由真实io重导出；本轮没有生产缺陷证据或新增关闭，不能按raw全绿宣称任意输入/树归约独立向量完备。 |
| shared/src/yj2.boundaries.test.ts（原69/现73行） | 全文，纠正“空窗口回引待证”的过期注释；末例本来已有独立错误字节。承接精确短头错误、零长带尾随payload、字面/重叠两次各自固定expected（没有产品输出自比）；仍9例。独立树归约向量继续待证，保持review。 |
| pal-extract/src/io/yj2.ts（6行） | 全文真实re-export；没有复制解压算法。CLI的loadMkfChunk/map/MGO/FBP/火焰caller分段直接读取，不冒充CLI全文件复验。原关闭留历史，本轮不新增关闭。 |
| pal-extract/src/io/yj2.test.ts（原42/现33行） | 两旧例只看预分配长度，错误零数组变异仍2绿。整合为MGO1..20完整输出的独立SDL native SHA oracle，索引/长度/所有输出字节入digest；不再按长度阈值跳过未知chunk，1例，变异精确1个AssertionError。纠正MAP压缩/PAT裸表注释，真实map.ts全文与CLI palette分段支持。pending登记review，不按邻包绿关闭。 |
| shared/src/rle.glm-o.test.ts（原215/现180行） | 全文，YJ2四例重复于规范边界：短源、零长尾随、字面、overlap重复调用。弱值例只核len/自比；去掉该四例及专用imports后RLE测试体逐字节不变，13→9，提高职责内聚。原关闭撤回review，RLE剩余轴不因本片accept。 |

上表路径前缀packages/。固定fixture全文与shared公共barrel沿前片已读未变代码；resources/map.ts全文，CLI的160–180、669–680、726–744等实际消费片段；native只读/执行yj1.c的YJ2完整类型/表/函数部分，未声称整份YJ1或其它caller文件重审。未改schema/save/API、资产或生成物，没有新增ignore/exclude/强转或降低门。

## 独立primary和真实输入

[native-probe.py](native-probe.py)提取未修改SDLPal YJ2全部类型/表/算法，以本机little-endian shim、AddressSanitizer编译执行。ABC/F/FBP/FIRE/MAP/MGO非空chunk加RNG内层，共2626段、34367608输出字节，native与TS逐字节一致；[原件](native-proof.json)有每段输入/输出SHA、命令/cwd/exit及原函数区间SHA。MGO前20输出golden由native bytes独立生成（index u32LE+length u32LE+全部bytes），不是TS自制oracle。源文件及原始输入SHA前后不变，临时压缩/输出文件已清理。

边界：只送当前真实合法压缩输入给无源长参数的C函数，不给C喂畸形synthetic；未执行pal.exe。C目标缓冲初始化为零，不能把此shim推成任意C caller的early-EOS初始化合同。正常raw对拍不证明独立树归约向量或全部非法输入。

## 判别力、排重与精确退役

长度-only零输出变异保留短头拒绝：[旧共享](before-proof.json)22例15绿7业务红，7红全部在规范边界，旧混合文件13例全绿；[补证后](after-proof.json)18例11绿7红，失败集合完全相同。四退役合同分别由规范短头精确错误、零长尾随空数组、两次独立字面expected、两次独立重叠expected承接。旧extract两例同变异2绿，新raw oracle精确1红。所有红均为原生AssertionError，0skip，无name filter或setup/timeout替代。

[原生list/退役数据](retirement.json)核13→9、双identity digest、实际文件SHA与HEAD/main/旧3y三参考；批准前拒绝，登记后仅精确快照通过、字节漂移拒绝。表24项/净56，matcher字节不变。extract raw测试本来不在三参考fast inventory，不新增规则/豁免，也不把full-test精简假记成fast删除。baseline未手改，后续官方ratchet仍须实际生成。

## 当前门与剩余

[恢复回执](tests.json)：定向34、shared16文件126+typecheck、extract相邻18+typecheck、coverage-tools69通过，原生runner/raw与命令完整保留。定向/相邻0fail/0skip/0act/环境/navigation。另进程[核验](verification.json)核source/raw SHA、RLE体不变、matcher不变、输入不变和临时副本清理，非第三方签字。

[静态门](gates.md)另记；全仓check、官方ratchet、protected fast未重跑，editor诊断未清，不合main。shared规范边界仍review；混合文件旧关闭撤回review、extract新登记review，0新关闭，机器计数以本片ledger原命令为准。下一片CODE3c工程runner确定性，再回CODE3 extraction模块；RLE格式专卡仍draft，94–102/editor原返工保留。

本片机器已重新对账：3287 inventory /215closed /209review /2863pending。标准边界原本review不重复撤回；只撤回混合文件一条旧关闭、将extract待核项登记review。
```
<!-- incremental-original-source:end -->
