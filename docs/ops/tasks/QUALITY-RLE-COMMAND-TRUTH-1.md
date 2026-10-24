# QUALITY-RLE-COMMAND-TRUTH-1 — PAL RLE高位literal判定前提核验

Status: draft
Owner: Codex
Phase: shared cross-phase resource decoding
Capability: RLE resource format truth
Visual Verification Timing: 纯字节前提核验N/A，若实际像素行为受影响另登记

## 停线与范围

94前全量复审CODE1时完整读取shared/rle.ts及三专属测试、相邻GLM-o测试与真实game/extract caller，发现primary palcommon.c判定为(T & 0x80)且T<=0x80+uiWidth才是透明段，TS generic和strict均用>=0x80。当前仅证明源码存在分歧，真实资源可达性、canonical作者格式与影响范围待核；不直接宣布生产故障。跨包公共解码/资源管线属高风险，立即停止实现，无build allowed。

只允许读取primary/真实caller、隔离原生C与TS字节探针、现有测试和只读资源census；不得修改算法、资源、生成物、公开接口或产品行为。当前全部文件不因原卡done或包绿重新accept。

| 方向 | 当前直接证据与未知 |
|---|---|
| Primary | reference/sdlpal/palcommon.c:133-137，宽度参与透明判定；需要直接执行原函数验证手列literal样本。 |
| 第一阶段 | shared decodeRle/parseSpriteChunk被game tileset/dialog与pal-extract sprite/map/ball/rgm消费；真实caller读取分段与全文件分别登记，源资源census待核。 |
| 第二阶段 | shared strict/indexed被reforge assets和migrate pal-assets消费；phase2 READ-FIRST优先，不能把SDL兼容条件自动扩到canonical作者格式。 |
| 目标 | 核清格式合同与真实输入，不改行为；若需要产品/API/管线变更先明确修复层与可证伪反例。 |

最强替代解释：所有当前资源/作者编码器只使用<=127的literal，TS实现范围有限但合法当前资源输出无差异；或者SDL分支仅接受非canonical帧，不能直接移植。可证伪观察：直接执行原函数未按literal解读该样本，或有效真实输入在TS/原版结果一致且该指令从不可达。尚未验证的项保持unknown/draft。

另有低风险测试证据缺口：rle.test.ts所谓“截断坏帧/后续合法帧”样本实际合法帧在前、坏帧连完整header都没有，走sanity guard而非decodeRle catch；原catch合同判别力需隔离反控，未修测试前不得关闭。

无下一位Agent提示词，Codex仅继续前提取证；不请求用户代替事实核查。

## 与独立测试补证的边界

原生C探针已直接执行未改函数：2×66、132长度literal正确写132个0x11，TS generic/strict拒绝；分成127+5的同像素正控两端成功。仅为SDLPal已验/原版pal.exe未验，非真实资产census。encoder原文还使用不按行界分段的127透明游程，说明canonical作者格式不能盲目套SDL条件；修复层仍unknown，卡留draft。

另由QUALITY-PRE94-RETROSPECTIVE-1单独批准现有坏帧catch测试的fixture/oracle补证，只修改主测试，不改变任何实现或本卡格式范围。格式风险继续冻结，不把低风险测试补证当作本卡build。

## 当前只读原件

[未改SDL函数native探针与原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/primary-probe.json)：两正/反字节向量、AddressSanitizer编译运行、函数SHA/完整命令，临时目录已清理。GOP只读trace226chunks/67715个TS成功帧，0分类分歧，不是native全资源像素比对。MGO/ABC、当前catalog origin域与其它真实资源仍unknown。任何算法修复仍无build allowed，未请求用户替代事实核验。

2026-10-16 只读影响域新增证据：[DATA9/10、RGM/BALL/FIRE共1332图像](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/README.md)执行未改SDL取帧/绘制/YJ2与当前TS/PNG全RGBA摘要一致；四原盘SHA/所有frame记录保留。仅支持这五个canonical原盘cohort当前输出相同，不解决作者canonical与高位literal的一般格式分歧，也不替代GOP/MGO/其它资源census；本风险卡仍draft，无算法build授权。


## 2026-10-18 校准登记：取帧特殊offset与尺寸域

SDLPal `PAL_SpriteGetFrame`（palcommon.c:803–852）先将u16 word offset乘2，遇0x18444再转WORD，结果为0x8444；当前TS parseSpriteChunk/strict/indexed没有该特例。此处仅已证源码差异，真实cohort触达与修复层未定，归本格式真值卡继续只读取证，不据此新增兼容或修改canonical格式。

通用decodeRle不设sprite的400尺寸上限；u16最大宽高理论上每个plane需4,294,836,225字节、两个plane共8,589,672,450字节，不保证当前宿主会分配成功。资源/作者输入的支持上限及具体caller可达域仍待核，不能把“可传畸形头”冒充生产漏洞或擅自套sprite上限。parseSpriteChunk过短输入/table截断的RangeError也只登记错误合同候选，真实caller与期望容错须先核；不得为了错误消息一致直接改实现。详情见[独立校准与分派](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/calibration-20261018/README.md)。原高位literal风险、全部历史原件与draft/无算法build状态保持。


## 2026-10-25 实际MGO571消费者与原生反例（仍draft）

[本次完整原件和低成本复验](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/quality-closeout/README.md)取代上方“特殊offset真实可达性未知”这一项当前结论：八原盘域结构census共4,662,630条当前TS成功帧命令，0高位分类分歧不是全帧native等价。唯一special是MGO571槽1，原WORD49698在TS转99396越界，SDL特殊取帧到33860。未改SDL YJ2／取帧／绘制函数ASan执行获得两幅320×200帧；实际loadSpriteFramesBlob只给1帧，DOS playEndingAnimation因此跳过整个妖兽。真实Canvas第200步与native第二帧有23036非零像素的独立SHA反例成立，无其它浏览器诊断；非PAL.EXE、非完整剧情结局E2E。

已请求用户批准“只修原盘精灵读取，自建canonical格式保持”；当前未答，算法／公开接口／生成物仍冻结，无build allowed。不能直接在canonical严格codec塞入特殊offset，因为作者合法大容器可能真用99396；高位literal与作者透明游程的一般分歧也未因此解决。范围内独立测试质量排重可收口，但不得借它关闭本卡或产品rle.ts。原始资源无写入，原生大plane／binary不入库，完整producer／C源／执行日志／函数和输入SHA保留。
