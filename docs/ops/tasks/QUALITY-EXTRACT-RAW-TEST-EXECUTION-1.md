# QUALITY-EXTRACT-RAW-TEST-EXECUTION-1 — extractor原盘用例执行完整性

Status: build
Owner: Codex
Reviewer: Codex（当前源码与原件复核，不冒充第三方）
Phase: phase1 engineering / test IO
Capability: pal-extract test evidence reliability
Visual Verification Timing: N/A（离线解析/PNG断言，不是UI）

## 已证前提与边界

CODE3/3f复审的完整extract runner报告433 passed/0pending，完整stderr却显示六条“raw不存在”后return的绿色用例。两个文件都在resources/parsers/__tests__，HERE向上5级落到repo/packages，真实root应回6级；当前repo/data/raw的DATA/RGM/BALL/FIRE均存在，repo/packages/data/raw不存在。只改日志或把0pending当全部执行不成立。

- 白名单候选：packages/pal-extract/src/resources/parsers/__tests__/data-misc.test.ts（已全文读）与misc-mkf.test.ts（已全文读），路径、缺fixture早退、真实caller/oracle、重复和弱断言逐项核；未授权生产parser、公共接口、raw或生成物改动。
- 当前primary：scripts/coverage/config.mjs既有required原盘输入与上述两文件的fast排除；既有word.test.ts等直接readFileSync原盘；完整原件及源码定位见[标注复审](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3-annotate/README.md)。不为过门新增skip/ignore/exclude，不给packages/data/raw造假链接。
- 六条入口：DATA chunk9/10；RGM真实全表；BALL真实全表；FIRE真实全表及chunk0直解。其余单位测试未因本卡全文读取而自动accept。

## 准入与验收计划

先核实际fixture根/源字节、生产caller及SDL/第一阶段资源合同，建立可证伪正常/错误路径对照；只读探针允许，实施前在本卡明确test-only白名单与反控。错误根与早退不能借“CI无原盘”获得假passed信用；如环境确缺必需输入，明确失败/不验收，不放宽正式门。

原文件还有“多数成功”阈值、FIRE raw fallback相关条件断言及PNG魔数弱oracle，需要真实caller/primary逐项核定，不能只改路径就宣布整文件好代码。若真实raw执行暴露decoder/格式/资产管线分歧，立即停线关联QUALITY-RLE-COMMAND-TRUTH-1等高风险卡，不为过测改产品或生成物。

恢复须有定向与相邻、typecheck、stderr归因、无无断言早退、有效单例业务反控、真实数据读取证明和临时树精确清理。保留四块parser负面日志的原始事实；是否构成可断言的输出合同需逐条核，不静音、不作常驻豁免。统一check/ratchet/protected仍未新跑，本卡不标done。

下一步Codex单Agent继续事实核验与有限准入；无下一位Agent提示词。初始draft不授权产品实现或整体验收；后续测试准入见下方记录。


## 2026-10-16 有限测试准入

Codex premise verified/design agree/build allowed：白名单仅两份现有data-misc.test.ts/misc-mkf.test.ts与本卡/证据/账本导航。已全文读实现、相邻PNG/边界测试、shared RLE及真实CLI348–405/452–538；SDLPal ui/battle/text/itemmenu/fight接线与未改PAL_SpriteGetFrame、PAL_RLEBlitToSurfaceWithShadow、YJ2_Decompress直接执行原件见本卡证据native-probe.py。原盘71/85/88/251/837个有效图像已完整取像素，两种底色独立确定透明/opaque-0，固定native cohort摘要可作测试oracle。仅矫正测试root五级→六级并删除六处缺fixture假passed；不碰原盘、生成物、生产接口/解码/规则。

保持现有21身份和数量，六原盘例加强精确空槽/数量/全像素摘要；不把partial范围关闭。合成raw sprite实测确实解2帧，原“may or may not”是弱断言，不是已证不可达；当前仅核该合法合成向量，不能支持所有raw fallback有真实caller的结论。FIRE helper现只有测试caller；生产CLI原盘接线单独是decompress→parseSpriteChunk→gzip，不能把helper测试冒充CLI执行。FIRE direct例明确强制真实YJ2成功并核chunk0原生摘要，不能catch后重用错误raw掩盖失败。

先在隔离同目录副本核旧原盘早退下六枚输出变异仍绿，再补六个独立固定oracle，使每枚仅一个指定业务AssertionError；错根/缺输入另记IO拒绝对照，不算业务反控。恢复后定向/包级/共享及typecheck，完整stderr归因，不静音或放宽规则。统一门和所有83卡复审仍未完成，本卡不自动done。注释与相邻重复候选只在有直接证据时调整，不以包绿结论关闭。


准入补记：两文件相同的PNG→RGBA/元数据摘要接线提为唯一test-only indexed-frame-digest.ts（同__tests__目录）；只接受实际framesToOut的公开类型，不生成expected、不模拟parser，caller仅本两文件。该helper须逐文件核ownership与无跨例hash共享；不进入产品公共出口。已证重复的FIRE空块例由现有fire.glm-runtime-resource.test.ts精确空输出合同承接，misc原9→8、两文件21→20；额外raw-fallback变异将核现有合成2帧例从弱条件循环改为固定像素的判别力。只允许相应approved-test-retirements精确9→8 metadata和工具固定条数调整，matcher/拒绝合同/baseline不变；原生身份/双digest/新SHA必须匹配，不能把新helper当降覆盖例外。白名单是三份内聚测试文件及两份退役支持数据，不批准其它实现。


最终准入对齐：已核HEAD/main/旧3y的official fast inventory均不含这两份既有排除的原盘测试，所以本轮精简不触发fast test-count移除，不新增任何退役豁免表项，支持数据文件无需修改。保留身份的测试标题改为实际全RGBA/短输入合同，原生list完整披露改名与唯一空块删除。相邻fire.glm-runtime-resource.test.ts只纠正已被合法两帧raw反例推翻的“入口不可达”注释，原四个测试体/身份不改；该文件已全文读，整文件仍待其它复审。原21身份保持的准入文字由本段实际21→20与显式改名替代，不伪称身份不变。


## 本检查点实际结果

四测试文件只做执行/断言/共享摘要与事实注释修复，0产品改动。原盘71/85/88/251/837图像与未改native SDLPal全RGBA一致；七针旧21绿/新各19绿1指定AssertionError，恢复20绿；唯一空块重复转移旧2红→新GLM1红。明确标题改名后原生8移除/7加入，两文件21→20。重现错root使6例ENOENT失败，不再假passed；该IO拒绝不冒充业务针。native和24轮探针/输入/副本/恢复/清理另进程核验见[完整证据](../evidence/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1/README.md)。

定向7文件36、shared16/126与typecheck零诊断；完整extract72/432通过但仍4stderr块/46行，六早退告警已消失，不能接受全包零诊断。其余四块为tables unknown OBJECT、RGM零尺寸、BALL零尺寸及enemy-team缺映射测试，需独立核caller/oracle/输出合同，不能静音。全仓check/ratchet/protected未新跑，editor未清，卡留build/文件review，不合main。新helper进入tracked库存，不借generated/命名规避；native raw/source/meta均未改。下一有限片先核四处诊断，再续3b及94–102/editor。无下一位Agent提示词。

本检查点静态docs、coverage-tools70、ledger、diff-check均通过；lint4445文件error/warning/info全部0。机器已确认3288 inventory /209closed /220review /2859pending，0关闭。完整check/official ratchet/protected未新跑、extract和editor仍非零运行时诊断，保持build/不合main。

精简最终复核准入：空块转移须连同原chunkIndex=0保真，不只保留GLM的7。允许在GLM原空块同一合同内参数化[0,7]并核各自完整输出，其余三测试体/四身份保持；这是原合同转移，不新增产品行为/测试计数。旧“只改注释/四体不动”仅保留为初稿历史，当前以本段为准；重跑空块转移、定向/包级与typecheck后再提交。
