# CODE2 MKF/RNG逐文件复审

> 2026-10-21当前accept：[shared逐文件A–H与完整门](../shared-codecs/evidence.json)。归约/重复缺口已闭合，O-5限支持域；以下partial/未跑/旧计数均为历史片段，保留原件，不作为当前门。
归[全83卡复审](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)，起点c727bc81e/main=f98d0ddd8，单Agent、唯一3y分支。生产MKF/RNG/YJ2字节未改；本片补两份boundary测试、精简一份主测试、登记精确退役。整卡当前partial，0新增关闭。

## 实际读取与文件结论

| 文件 | 完整读取及caller/oracle/生命周期 | 当前结论 |
|---|---|---|
| shared/src/mkf.ts | 全文55行；公共shared/index导出，extract/io/mkf重导出，真实extract CLI与RNG sub-MKF消费。按输入视图byteOffset读取表，验证表长/单调/范围，允许空chunk；readChunk只消费真实openMkf结果、拒非法index，借用原buffer。纯同步读取，无文件句柄/异步清理。 | 当前未发现生产缺陷；原关闭保留历史，本轮不新增关闭或复签全仓门。 |
| shared/src/mkf.boundaries.test.ts | 原98行与修改后全文。原整数guard删除仍11绿，旧注释还否认已实现的offset错误合同。 | 校正头尾注释；同一索引例补0.5/NaN并更名，一例总数11不变；buffer identity与精确byteOffset直接核借用ownership。旧关闭撤回review。 |
| shared/src/rng.ts | 全文222行；requirePayload/requireSurface逐opcode读取/写入前失败；surface由blit caller拥有，decodeRngFrames按chunk独占64k面、跨delta保留、输出slice快照。空subchunk和YJ2失败跳过，delta失败传播。核真实game rng-player与extract wrapper，合法opcode逐段对照SDLPal。 | 当前未发现生产缺陷；未扩成全帧事务或更改错误政策，正常数据native对拍见下。 |
| shared/src/rng.boundaries.test.ts | 原183行及修改后全文；MARK完整未触区域、各opcode、终止、坏payload/surface与合成sub-MKF直接oracle。原坏YJ2在首帧，错误清面仍16绿。 | 改成好帧→坏YJ2→后续delta，完整第一/末帧plane与index[0,2]断言；16例不变，旧关闭撤回review。 |
| shared/src/rng.test.ts | 原47行与精简后全文；基础literal/skip/repeat/end/unknown与空chunk入口。 | 一条delta累加被boundary全平面oracle覆盖，7→6，保留其余小surface/错误轴。精确退役及oracle转移见下，旧关闭撤回review；不以代码短豁免排重。 |

上表路径前缀packages/。还完整读取shared固定fixture、shared公共barrel（前片全文+当前未变hash）、extract/io/mkf.ts及测试、resources/parsers/rng-frames.ts及测试、game/shell/rng-player.ts及assets/rng-blob-snapshot.test.ts。CLI只读160–180/414–450附近实际生产消费区间，不冒充整个CLI验收。SDLPal只读PAL_MKFGetChunkCount/GetChunkSize/ReadChunk、PAL_RNGReadFrame/BlitToSurface对应函数；源码全文SHA只用于定位，不冒充全C文件语义阅读。

primary为本地SDLPal对应实现、原始MKF字节与独立手列fixture；phase1只保持已定正常字节/错误合同，phase2没有新增语义或接口。mkf/rng被两端复用，未在wrapper复制产品算法。payload/surface helper职责明确；MKF借用视图和RNG输出快照有不同ownership，不强抽成泛化状态工具。

## 判别力、排重与身份

- 删除Number.isInteger guard：旧MKF11绿，补证后10绿1个预期AssertionError；只失败于非法数值索引。
- YJ2错误catch错误清空surface：旧RNG16绿，补证后15绿1个预期AssertionError；只失败于坏帧后基面保持。
- delta排重：弱例只核8字节零面前4字节，保留例核真实320×200 MARK面全部未触区域；两次调用的opcode/落点相同，像素值/面大小在该合法路径不改变分支，其它小面/边界仍独立保留。只改0x02为错误清除跳过字节，退役前23例19绿4业务红，退役后22例19绿3业务红；失败集合恰好少了退休身份，保留的完整基面oracle及两条链路仍红，没有filter/skip。

[旧反控](old-counter-proof.json)、[新反控](new-counter-proof.json)、[退役前](transfer-before.json)/[后](transfer-after.json)及原始runner/raw齐全。MKF一个旧标题→新标题显式更名；其余A段身份和数量保留，B段仅删除一条已证重复。精确[退役数据](retirement.json)由原生Vitest list按run.mjs的project root规则计算，旧7例digest与HEAD/main/旧3y三份baseline一致。首次准备时误用default被旧digest校验拒绝，未写批准账；核实际runner后才登记。

approved-test-retirements仅加当前7→6/双digest/实际文件SHA条目；固定表23项/净52，matcher字节不变，字节漂移仍拒绝。修正旧“未知第六文件”误导标题为未批准的其它文件；未改拒绝谓词。没有降低lint、ignore/exclude/强转或覆盖率阈值，baseline未手改；官方ratchet仍待统一窗口。

## 当前真实数据与native oracle

[raw-primary-probe.py](raw-primary-probe.py)只读15个MKF（包括小写mus.mkf）/2373chunks，将真实openMkf/readChunk的计数和带长度chunk字节流SHA与独立原字节区间比较，全部一致。首轮诊断只匹配大写文件名，发现漏mus后改为不区分大小写重新全跑；不把14文件快照写成全量。

同一脚本提取未修改的SDLPal PAL_RNGBlitToSurface函数，最小surface shim、AddressSanitizer编译运行；每动画从零面开始，喂同一shared YJ2解压payload。12个动画/1464帧的index与完整64000像素均逐字节一致，命令/原函数SHA/输入与输出SHA见[原件](raw-primary-proof.json)。比较边界明确：不验证YJ2自身，不是pal.exe、播放时序或生成资产全面验收；约94MB临时plane文件已清理。另进程[核验](verification.json)检查所有raw SHA、源不变、matcher不变、输入SHA与临时副本清理。

## 门、未修项与下一批

最终定向33例，shared typecheck+16文件130例通过；相邻game13/extract17均0fail/0skip/0act/环境/navigation，覆盖工具68通过。详见[最终回执](final-tests.json)、[相邻](adjacent.json)、[静态门](gates.md)及同名raw.gz。相邻测试在生产字节相同的A段候选执行，B段仅测试精简/精确批准数据，未重复无变化的真实资源长测试。

相邻extract的“首帧非黑”只核PNG size种类，game blob第一层仅核长度，不能单独充当本片native oracle；这些完整相邻文件未在本片accept，后续资源caller批次核测试精度。主测试与boundary仍有基础opcode正控重叠，但不同错误/未触区轴须逐项证明，未按名称批删。全仓check/official ratchet/protected fast未重跑，editor诊断未清，禁止合main。三份测试旧关闭精确撤回review；机器已确认3287/216closed/207review/2864pending，0新关闭。下一片CODE2b YJ2；RLE格式风险卡继续draft。
