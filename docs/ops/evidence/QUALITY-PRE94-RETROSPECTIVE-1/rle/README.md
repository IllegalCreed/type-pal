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

