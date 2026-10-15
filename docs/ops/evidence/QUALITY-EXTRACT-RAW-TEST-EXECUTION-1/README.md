# Extract原盘执行完整性与像素oracle

归[任务卡](../../tasks/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1.md)及[94前全83卡复审](../QUALITY-PRE94-RETROSPECTIVE-1/all-cards.md)。起点b41dc8d53，最新main=f98d0ddd8；唯一codex/code-quality-3y、单Agent。只改四份内聚测试/测试helper，生产/原盘/生成物/公共接口不改，0新关闭。

## 逐文件、primary/caller与未修

实际全文/区间、SHA与行数在[read-boundaries.json](read-boundaries.json)，不能把区间读取说成整文件accept。

| 文件 | 直接结论与当前边界 |
|---|---|
| data-misc.test.ts：201→188行 | 两real DATA入口只向上5级落到packages；删缺fixture早退、修6级路径，旧告警“data/extracted missing”还把原盘与生成物混为一谈。9/10块由71/85个有效槽完整RGBA摘要保护，不以≥1或尺寸sanity作为像素oracle。合成帧注释误称end-of-row已更正；既有经验/学习/效果表单位合同与P08完整数组的重复候选未在本片全部验收，仍review。 |
| misc-mkf.test.ts：204→178行 | 同样错误root，四real入口从无断言早退改为实际必需原盘。RGM空槽0/20/78/79与88头像、BALL空0与251图标、FIRE55块837帧均钉完整身份/尺寸/RGBA。FIRE0单独真实YJ2直解8帧，不catch再用raw掩盖失败；该例与helper不同caller，保留。1字节只验证明确空输出，原合成raw例从条件空循环改2帧固定RGBA；准确标题取代“多数/if frames exist”。12+9→12+8，仍review。 |
| indexed-frame-digest.ts：26行 | 唯一test-only实际输出摘要接线，caller仅本两文件。每个case新建SHA对象，PNG真解码并核尺寸，摘要输入包含chunkIndex/frameIndex/width/height及每个RGBA字节。没有生成expected、缓存输入、共享跨例状态或模拟parser；expected来自未改native C。普通__tests__ helper计入机器库存，不借文件名oracle进入generated分类。仍review。 |
| fire.glm-runtime-resource.test.ts：67→68行 | 全文核四合同；纠正“此前无测试/raw多帧入口不可达”注释；空块同一合同覆盖原0与7，另外三测试体/四身份原字节不动。合法16B raw两帧是直接反例；本文件保留0/7空块的完整输出、压缩2×2透明/opaque-0及短容器。当前不因此整文件accept。 |
| data-misc/rgm/ball/fire/sprite/shared-rle实现 | 全文只读。CLI348–405消费DATA三表/UI PNG及effect原始blob，452–538消费RGM/BALL并独立做FIRE YJ2→sprite→gzip；parseFirSprite helper当前只有测试caller，不能用helper绿冒充CLI执行。shared RLE的高位literal/canonical风险仍归原draft，未擅改或恢复兼容。 |

Primary是SDLPal palcommon.c真实PAL_SpriteGetFrame与PAL_RLEBlitToSurfaceWithShadow，yj1.c真实YJ2_Decompress，以及ui/battle/text/itemmenu/fight/global直接资源接线。参考资源表的71/85/88/251/837只是待核起点，本片已用源字节和native函数重新确认。DATA9/10声明72/86末尾0 offset，不是丢一帧。二阶段N/A：未改其schema/作者资源/运行时；不得把当前原盘结论扩到canonical作者格式。

## 独立像素来源

[native-probe.py](native-probe.py)提取未改函数体，最小8位surface、shadow=false、无裁剪；同一帧分别绘到全0和全255背景，只有两结果相同才判opaque，故实心palette-0与透明可区分。真实原盘完整DATA9/10、RGM/BALL、FIRE先原生YJ2再原生取帧，1332个图像逐像素派生RGBA；原件[函数C](native-primary.c.gz)、[RGBA stream](native-rgba.bin.gz)、[raw/source/frame SHA及5cohort摘要](native-proof.json)均保留。编译AddressSanitizer，两个原命令exit0；未执行pal.exe、未送畸形合成输入给无界C、未写资产。

测试只读固定预期摘要，实际经过TS解析与PNG真解码后完整匹配。PNG压缩字节不作为跨版本oracle，比较的是RGBA和身份/尺寸。四个canonical原盘SHA固定列出；本片不能证明其它版本原盘、GOP/MGO或作者资源全部合法。

## 判别力、精简、身份与缺输入拒绝

[counter-probe.py](counter-probe.py)保留同目录隔离typed wrapper、整两文件执行，无name filter/skip/todo/timeout变化。wrapper调用真实函数后只破坏指定输出；正式源码/测试执行时不改，完整command/cwd/exit/signal、原生JSON/raw及重建SHA在[补证前](before-proof.json)、[最终补证后](after-proof.json)。

| 输出变异 | 旧21例 | 新20例 |
|---|---|---|
| DATA9改变1个opaque像素 | 21绿（real早退） | 19绿1指定AssertionError |
| DATA10少1帧 | 同上 | 同上 |
| RGM1或BALL1改变1个PNG像素（两针） | 同上 | 各同上 |
| FIRE1改frame index | 同上 | 同上 |
| FIRE0直解缺1槽 | 同上 | 同上 |
| 合成raw fallback改空结果 | 21绿（空循环/自比） | 同上 |

恢复正常20绿、0stderr。最初补证的成功反控在[initial-after](initial-after/after-proof.json)留原件，随后仅准确改名/注释，最终七针完整重跑；不把旧SHA或旧身份冒充当前。原生[native-identities.json](native-identities.json)21→20，实际8旧身份移除/7新身份加入，七项是明确标题改名，唯一业务例删除是FIRE空块。其[oracle转移](empty-transfer.json)在原文件及GLM同一空输出破坏下旧2红→新仅GLM1红，0与7都保留在同一空块合同，全部AssertionError；这是多红转移，不冒充单例业务针。

[fast-scope.json](fast-scope.json)确认HEAD/main/旧3y的官方fast库存都不含这两份既有排除的原盘测试，所以这次精简不触发fast移除豁免；baseline/config/退役matcher与25项净59条目完全不动。没有新增ignore/exclude或强转。

[缺输入拒绝](missing-input.json)只在测试副本重现错误root，六例明确ENOENT失败/14pass/0pending；与旧六例warn后假passed形成对照。IO Error不计业务AssertionError信用，未移动原盘、造链接或静音。[verify.py](verify.py)/[verification.json](verification.json)另进程核1332RGBA/源码、24轮wrapper与副本SHA/执行身份/单例失败、转移/身份/恢复和精确清理；不是第三方签字。

## 恢复、门与下一批

定向7文件36例、shared16文件126例及双方typecheck通过，0stderr/act/环境/navigation。完整extract原生72文件432passed/0pending；六原盘早退日志已消失，仍有4个stderr块/46行：tables unknown OBJECT、misc-guards RGM零尺寸、BALL GLM零尺寸、enemy-teams缺映射。这四处真实负面日志未改，包级零诊断验收仍不通过，不以432绿接受。完整原命令/原生报告在extract-*.json/raw.gz与shared-adjacent.json。

[静态门](gates.md)按真实命令补录。全仓check、official coverage ratchet、protected fast未新跑，editor仍有诊断；本片是有限检查点，0文件关闭、卡留build，不合main。机器计数以ledger原命令实测为准；全83编号卡仍9partial/74pending/0accept，本片支持工程核验不自动增加整卡accept。

下一有限片先核上述4块诊断的真实caller/输出合同和测试判别力，再续CODE3b及94–102/editor；禁止blanket console mock/ignore，不为零输出改产品诊断行为。无下一位Agent提示词，Codex单Agent继续。

最后全文重读四测试文件：两份私有makeFakeSpriteChunk同为无sentinel的1×1固定像素构造器，后续可单独提取共用fixture并核既有输入/oracle转移；本片只提取实际摘要接线，未用“已读”关闭这两文件。空块0/7最终补证后定向36/typecheck及完整432重跑原件均为当前版本；四块诊断未变。最终lint4450文件error/warning/info全0，ledger保持3288/209/220/2859。

2026-10-16 后续[C1同步诊断合同](diagnostics-c1/README.md)：BALL/RGM负面输出转为显式完整IO断言，8有效反控，局部生产V8不降；退一同输入弱例5→4，extract431仍2stderr块。原四块日志保留历史原件，C2两处未修；0关闭。
