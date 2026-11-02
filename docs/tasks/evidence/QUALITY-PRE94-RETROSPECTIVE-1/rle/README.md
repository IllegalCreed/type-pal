# CODE1 shared RLE有限复审

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计主题:CODE1 shared RLE 有限复审,归[全83卡复审](../../../cards/QUALITY-PRE94-RETROSPECTIVE-1.md),起点 07b856bc2/main=f98d0ddd8,单Agent/唯一 3y 分支。本片仅修改 rle.test.ts 现有一例的字节与 oracle——原截断样本实际缺 header 且合法帧在前、未测声称的 catch/后续帧,修成完整 10×1 坏帧(声明 10 字节 literal、余流仅 7 字节)后置完整 1×1 合法帧;没有修改解码/编码实现、接口、生成资源或用户行为。整卡仍 partial,0 新增关闭,三条旧关闭精确撤回 review(时点 3287 tracked/219 closed/204 review/2864 pending)。

## 范围与证据

四文件结论:rle.ts(316 行)generic 允许 0/0x80 源字节无像素进度但最终有界失败、strict 按 offset 上界/尺寸/零长命令拒绝、indexed 区分 canonical 与坏尾前缀拒绝中间空洞,格式真值新分歧转[高风险draft](../../../cards/QUALITY-RLE-COMMAND-TRUTH-1.md)、算法冻结;rle.test.ts(原 329 行/修后 333 行)身份/数量不变、旧关闭撤回 review;rle.boundaries.test.ts(117 行)三处注释/标题精度问题如实保留——『换合法1长度』实际正控 length=2、『帧头越界』实际断言尺寸非法、badTail 注释 0xFFFF 实际 0x0FFF,不把这些描述冒充已验证;rle.glm-runtime-resource.test.ts(150 行)前缀选项矩阵/byteOffset/尾随 payload/legacy 拒绝有直接输入出口。判别力证据链:隔离模块把 parseSpriteChunk catch 改 rethrow,四份原 RLE 测试 54/54 仍绿(旧反控无效,[旧反控](catch-proof.json));修测试后同 54 身份 53 绿/1 红,唯一失败正是『宽容入口跳过截断坏帧并保留后续合法帧』([补证反控](catch-improved.json));恢复真实模块后 shared 16 文件 131 例全绿、game 21/extract 6/reforge 20 相邻全绿([相邻](adjacent.json));[另进程核对](verification.json)确认 54 身份一致、native 原件 SHA、decoder 未改、临时副本清理。

## 发现

SDLPal 直接证据:[primary-probe.py](primary-probe.py) 提取未改动原函数(functionUnmodified),最小 surface+ASan 编译运行;2×66 手列帧首指令 132,SDL 条件 132>128+2 使其为 literal、原函数实写 132 个 0x11,TS generic/strict 均拒绝;127+5 正控两端通过([native回执](primary-probe.json));pal.exe 未执行,不能称原版实测。停线理由:不能据此直接把 TS 条件换成 SDL 条件——当前作者 encoder 按 127 分段透明流且可跨行,属当前 canonical 消费者合同;真实修复层/兼容格式域未核定,高风险卡留 draft。GOP 只读结构[trace](gop-trace.json):226 chunks、67715 个当前 TS 成功帧、0 坏帧/0 分类分歧命令、226 跳槽、输入 SHA 前后不变;它不是逐像素 native census、未扫 MGO/ABC 等其它来源,不能推出当前所有资源无风险。

## 结论

复用与剩余:shared 公共出口已让 game/extract 重导出同一 codec;generic 与 strict 的源边界/零命令/错误合同不同,不因循环相似强抽公用 helper;『原 slot 身份』与『过滤后数组下标』分开;旧 WorldSprite 别名仍有真实 reforge/migrate 调用不按 deprecated 删除;模块头旧 0x02000000 注释等不批删未知合同。editor 仍非零诊断、禁止合 main;整仓 check/官方 ratchet/protected fast 留稳定窗口;[本检查点静态门](gates.md)单独记录,原始日志中的预期反控失败不会被重写成通过。继任:2026-10-18 Codex 独立[校准](calibration-20261018/README.md)(P-1 成立、实际丢失在 89bf84e16 合并;Codex 恢复 rle.ts/rle.test.ts 两行 review,三文件仍 review,3319/249/105/2965,0 新关闭;独立定向 4 文件 51/51);[copy-fix-r1](copy-fix-r1/README.md) 文案候选经 Codex rework 后有限 accept(9 处注释/标题、51 身份 47 不变+4 更正);2026-10-25 [CODE1测试质量收口](quality-closeout/README.md)六测试范围接受/四新关闭,rle.ts 与 CODE1 整卡仍 review/partial;[工程/Q1b收口](../code1-closeout/README.md)补来源边界。本治理不重开任务、不改写判定、不撤销旧撤信。

## 整改与复核

本页正文承载原审计真实目标/发现/结论/限制与继任时间线;原件逐字节保全在下方;候选待Owner接收。

原文存活链接原样保留:[QUALITY-PRE94-RETROSPECTIVE-1.md](../../../cards/QUALITY-PRE94-RETROSPECTIVE-1.md) [QUALITY-RLE-COMMAND-TRUTH-1.md](../../../cards/QUALITY-RLE-COMMAND-TRUTH-1.md) [README.md](../code1-closeout/README.md) [adjacent.json](adjacent.json) [README.md](calibration-20261018/README.md) [catch-improved.json](catch-improved.json) [catch-proof.json](catch-proof.json) [README.md](copy-fix-r1/README.md) [gates.md](gates.md) [gop-trace.json](gop-trace.json) [primary-probe.json](primary-probe.json) [README.md](quality-closeout/README.md) [verification.json](verification.json)。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 7655B / SHA-256 33ae3285d6ec1b8f870b1d1424d22c265e9f64a008e5925e2e45b4205eb451ba；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE1 shared RLE有限复审

归[全83卡复审](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)，起点07b856bc2/main=f98d0ddd8，单Agent/唯一3y分支。仅修改rle.test.ts现有一例的字节与oracle；没有修改解码/编码实现、接口、生成资源或用户行为。整卡仍partial，0新增关闭。

## 实际读取与四文件结论

| 文件 | 直接证据与当前结论 |
|---|---|
| packages/shared/src/rle.ts | 全文316行；generic允许0/0x80源字节无像素进度但最终有界失败；strict按offset上界、尺寸及零长命令拒绝；indexed区分canonical与坏尾前缀、拒绝中间空洞。真实caller、公共barrel与类型已核，格式真值新分歧转[高风险draft](../../../tasks/QUALITY-RLE-COMMAND-TRUTH-1.md)，旧关闭精确撤回review，算法冻结。 |
| packages/shared/src/rle.test.ts | 原329行全文及当前修改完整核；基础pixels/opaque、no-op、边界、宽容/strict/profile直接oracle。原截断样本实际缺header且合法帧在前，未测声称的catch/后续帧。修成完整10×1坏帧声明10字节literal、全部余流仅7字节，后置完整1×1合法帧；精确断言完整dimensions/pixels/opaque。身份/数量不变，本文件旧关闭撤回review。 |
| packages/shared/src/rle.boundaries.test.ts | 全文117行；手列strict字节、zero command、越界与legacy报告有执行。仍有注释/标题精度问题：“换合法1长度”实际正控length=2；“帧头越界”实际断言尺寸非法，未证明该header轴；badTail注释0xFFFF实际0x0FFF。保持测试，不把这些描述冒充已验证，旧关闭撤回review，待独立窄修。 |
| packages/shared/src/rle.glm-runtime-resource.test.ts | 全文150行；前缀选项矩阵、byteOffset、尾随payload和legacy拒绝有直接输入/出口。独立缓冲对照只证明视图偏移，不冒充全格式native oracle；没有本批新增关闭或整卡accept。 |

全文相邻：rle.glm-o.test.ts、rle-encode.ts、shared/index.ts及package.json；game/assets/{rle-decode,tileset-blob}.ts；extract/resources/sprite.ts；shared/mkf.ts（GOP只读探针caller）。SDLPal只读PAL_RLEBlitToSurfaceWithShadow/宽高前缀/PAL_SpriteGetFrame对应函数，未冒充整份palcommon.c语义验收。reforge/assets.ts只读取140–180、270–314、420–445附近真实解码入口，不计整文件关闭；extract CLI/migrate调用由检索定位，未冒充全文。phase1工程笔记真值分层和phase2 READ-FIRST已读；无战斗/数值机制变更。

## 测试判别力与隔离

隔离模块只把parseSpriteChunk catch改为rethrow，四份原RLE测试仍54/54绿。补证后同54身份53绿/1红，唯一失败正是“宽容入口跳过截断坏帧并保留后续合法帧”，实际RLE pixel run异常越过catch；不是timeout/setup错误。恢复真实模块后shared check：typecheck通过、16文件131例全绿；game两文件21例、extract两文件6例、reforge两文件20例通过，三相邻均0act/环境/navigation、0skip。

[旧反控](catch-proof.json)、[补证反控](catch-improved.json)、[相邻](adjacent.json)及各raw/原生JSON完整保留；[另进程核对](verification.json)确认54身份完全一致、native原件SHA、实际decoder未改及临时副本清理。before.gz与当前SHA支持精确重构；没有删/加用例，未新增ignore/exclude/强转或弱化断言。

## SDLPal直接证据与停线

[primary-probe.py](primary-probe.py)提取未改动SDLPal原函数，用最小surface与原坐标宏/影色函数编译运行（AddressSanitizer、shadow=false），不是手写RLE模型。2×66手列帧首指令132，SDL条件132>128+2使其为literal，原函数实写132个0x11；TS generic/strict均拒绝。127+5等像素正控两端通过。[native回执](primary-probe.json)记录完整命令/源码SHA/函数SHA与字节；SDLPal已直接验证，pal.exe未执行，不能称原版实测。

不能据此直接把TS条件换成SDL条件：当前作者encoder按127分段透明流且可跨行，属于当前canonical消费者合同。真实修复层/兼容格式域尚未核定，高风险卡留draft，未授权算法、资源或接口变更。GOP只读结构[trace](gop-trace.json)：226chunks、67715个当前TS成功帧，0坏帧/0分类分歧命令、226跳槽，输入SHA前后不变。它不是逐像素native census，也没有扫描MGO/ABC等其它来源，不能推出当前所有资源无风险。

## 复用、注释与剩余

shared公共出口已使game/extract重导出同一codec；generic与strict的源边界、零命令/错误合同不同，不能只因循环相似就强抽公用helper。parseSpriteChunk压缩过滤后序列与tileset/framesToOut caller一致；“原slot身份”与“过滤后数组下标”须分开，不能凭shared注释换键。旧WorldSprite别名仍有真实reforge/migrate调用，不按deprecated字样直接删除。模块头旧0x02000000注释、boundary标题及GLM-o的YJ2自比候选后续核定，不批删未知合同。

根CODE1还含工程清单与Q1b editor PAL census，这些不因本RLE片通过完成；6a/92也仍partial。整仓check/官方ratchet/protected fast留稳定窗口，editor仍非零诊断，禁止合main。当前仅三条旧关闭撤回review，机器已确认：3287/219closed/204review/2864pending。下一片CODE2 shared MKF/RNG，RLE格式风险转专卡只读取证。

[本检查点静态门](gates.md)单独记录；原始日志中的预期反控失败不会被重写成通过。


## 2026-10-18 GLM首批的Codex独立校准

[本次校准、八维结论、有限build与低成本复验入口](calibration-20261018/README.md)以170edee44为基点。P-1成立，实际丢失在89bf84e16合并，不把9cf1fd09f另一支线的旧表误写成其本次有意恢复；完整243行差异已保存。Codex仅恢复当前rle.ts/rle.test.ts两行review，三文件仍review；3319/249closed/105review/2965pending，0新关闭。

独立定向4文件51/51，完整raw/native已附；不继承GLM未附原件的执行信用，不与本页历史54身份混同。上表316/329/117/150等行数属于各历史时点，当前逐文件字节/行数另列新包，不覆盖旧证据。GLM仅获三文件文案/标题候选准入，漏项需补，八维整体尚未接收；格式/分支/fixture/断言均未改。全仓门/coverage/protected在稳定窗口执行，本次未跑、未合main。


## 2026-10-18 RLE三文件文案整改候选（GLM r1）

[copy-fix-r1](copy-fix-r1/README.md)以d3f59cadd为基点、临时detached worktree交付：仅注释/docblock/错误测试标题9处，实现/fixture/断言零变化；51身份47不变+4标题更正一一映射，去注释打印AST三文件字节级一致，定向前后51/51。候选待Codex独立验收后集成，本节仅为导航，不作接收结论。


## 2026-10-25 CODE1当前测试质量收口

[当前逐文件八维、59→50完整合同映射、三真实反控与只读复验](quality-closeout/README.md)：六测试范围接受、四新关闭；产品rle.ts及CODE1整卡仍review／partial。真实MGO571特殊偏移现有原生C和实际结局调用counter，转原格式卡待裁决；不把本页旧未扫描叙述当成当前可达性结论。统一门／coverage／PR继续等全部pre94，不授原版EXE或全结局视觉验收。

[2026-10-25 CODE1工程／Q1b收口与来源边界补证](../code1-closeout/README.md)：同一offset在公开作者编码器中合法，故不能全局套PAL特例；当前Reforge源profile和迁移计数亦有直接影响。仅隔离内存探针、原始源无写入，格式风险仍draft，不新增产品接受信用。
```
<!-- incremental-original-source:end -->
