# QUALITY-EXTRACT-RAW-TEST-EXECUTION-1 — extractor原盘用例执行完整性

Status: draft
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

下一步Codex单Agent继续事实核验与有限准入；无下一位Agent提示词。当前draft不授权产品实现或整体验收。
