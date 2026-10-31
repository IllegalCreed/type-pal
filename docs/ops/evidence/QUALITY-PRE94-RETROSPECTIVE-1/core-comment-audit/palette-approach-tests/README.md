# pre94 ColorFade输入域与既有测试判别力返工

Status: recorded
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「pre94 ColorFade输入域与既有测试判别力返工」的治理候选页;证据原件即下方逐字节保全的固定main源(4450B,SHA f919c74b1a4f)。该证据片属 QUALITY-PRE94-RETROSPECTIVE-1 / core-comment-audit 第八组注释返工(base 9cc4b3fd,codex/code-quality-3y):palette-fade.ts 仅修事实注释,17例既有测试保持并加强判别力,产品执行不变。

## 来源与输入

两文件全文:palette-fade.ts(原328行)与原测(原235行);pal-extract decodePalette、历史3n卡全文及 event/present 生产caller分段的逐文件行界与SHA见[read-boundaries.json](read-boundaries.json);授权见[QUALITY-PRE94-RETROSPECTIVE-1.md](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。原C完整 PAL_ColorFade 函数按真实body边界提取,typed SDL_Color与最小globals、合成palette源及video/delay stub,回执见[native-oracle.json](native-oracle.json):clang O0/O2 -Wall/-Wextra/-Werror均零诊断、两组方向各65次完整256色RGB提交与实际TS同网格helper步骤1..64+finalize逐字相同。

## 断言与业务 oracle

核心有限域结论:原C ColorFade直接±4,正常PAL_GetPalette用v<<2,任意两通道差为4倍数——每步到目标距离减4,0..252至多63步,无越过或BYTE环绕,64步后另提交终值;『任意8位moveToward等价』错误,『原版永久振荡』也不能从非网格人工输入推出。C被人工喂101→40时末两步41/37、随后补40,只有64步内往返,不当正常原版缺陷。真实decodePalette吃合法768字节6位合成palette(25/20/10→101/81/40),TS饱和收敛给40/101/40;此输入是TS生产域而非C正常getPalette字节域,跨包调用只在隔离取证程序。源码仅修注释(离散量化非连续lerp、ColorFade等价域与FadeToRed显式clamp区分、撤销视觉1:1/夜色/GetPalette99-104错锚),双基点parsed TS与去注释JS相同验证见[emit-identity.json](emit-identity.json),控制之后只去掉一处错误行号。测试17例保持:ColorFade两方向补上升/下降/不变通道、中间帧、非网格饱和与同时间重绘快照ownership;RGB最大255仅验证边界公式,唯一标题映射见[test-title-mappings.json](test-title-mappings.json)。

## 结果

[四精确反控](controls.json):行别名、非网格仿C无clamp循环、上升红通道冻结、错误从工作色表累积——各完整未过滤旧17绿→新16绿1指定业务AssertionError,0skip/pending/unhandled。17恢复、86相邻、game typecheck零诊断;docs125/全部消费者、lint(5269文件)与ledger以[门回执](gates.json)为准。两个原closed转review(palette-fade.ts、palette-fade.test.ts),0新增closed;265closed/77review/2973pending,83卡50partial/33pending/0accept;mergeAllowed=false,未合main。

## 限制与复核

同网格对照是两具体正反palette×65次提交,非全数值域或原EXE/视觉验收;人工非网格输入在PAL_GetPalette正常域之外,不证生产C缺陷。整色域、其它fade数学、invalid delay、资源库存/视觉与完整异步生命周期仍未接受;共享moveToward提取未证多owner同域必要,不加新接口;全仓check、official coverage ratchet、protected fast、视觉/E2E未运行。未重跑原命令;历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4450B / SHA-256 f919c74b1a4f31f1748c0314f96bc9823ff2724a42c1af33ffb24aaad58f472e；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# pre94 ColorFade输入域与既有测试判别力返工

Status: recorded
Owner: Codex（单Agent，自身源码核证，不冒充第三方）
Date: 2026-10-18
Base: `9cc4b3fd4f4c6754cf2f727890c7f228b0b8e4f2`
Branch: `codex/code-quality-3y`

## 身份、范围与读取

id: QUALITY-PRE94-RETROSPECTIVE-1 / palette-approach-tests；schemaVersion:1；status:recorded。[父卡](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)低风险注释/测试准入，2文件全文：palette-fade.ts原328行及原测235行；实际提取器与历史3n卡全文，event/present生产caller分段见[读取边界](read-boundaries.json)。只本片两文件补证，不将旁读/执行变为相邻整文件验收。旧3n报告字节gzip保留，当前信用已收窄。

## Primary与反证边界

原C ColorFade直接±4，正常PAL_GetPalette用v<<2，任意两个通道差为4倍数：每步到目标距离减4，0..252至多63步，无越过或BYTE环绕。64步后另提交终值。因此“任意8位moveToward都等价”错误，“原版永久振荡”也不能从非网格人工输入推出；只确立这个有限域和结构事实。

[原C完整函数回执](native-oracle.json)按真实body边界提取，typed SDL_Color与最小globals、合成palette源及video/delay stub，clang O0/O2 -Wall/-Wextra/-Werror均零诊断、结果相同。两组方向各65次**完整256色RGB**提交，与实际TS同网格helper步骤1..64+finalize逐字相同；非全数值域或原EXE/视觉验收。C被人工喂101→40时末两步41/37、随后补40，只有64步内往返，不当正常原版缺陷。

真实pal-extract decodePalette吃合法768字节6位合成palette，把25/20/10展开成101/81/40；TS已有饱和收敛给40/101/40。此输入是TS生产域，不是C正常getPalette字节域。跨包调用只在隔离取证程序，不增加game产品/测试依赖、不生成/改写资产。保持现有行为，未提出色值/时间/asset pipeline改造。

## 两文件问题与测试质量

源码仅修事实注释：离散量化而非连续lerp；ColorFade等价域与FadeToRed显式clamp区分；撤销“视觉1:1”、夜色未提取说法、GetPalette99–104错误锚；说明SceneFade-in终值例外。源语法/JS完全未变，见[两基点证明](emit-identity.json)：Git基点及控制基点各对最终源作parsed TS与去注释JS相同验证。控制之后只去掉一处错误行号，控制源gzip保存，不为注释再次跑整组测试。

原测试17例保持，未加万能新例：blackColors补行与跨调用独立；ColorFade现有两方向补上升/下降/不变通道、中间帧、非网格饱和与同时间重绘快照ownership。RGB最大255输入仅验证边界公式，不能辨别删除不可达clamp，标题已更正，[唯一标题映射](test-title-mappings.json)保留，未改baseline/退役账。

四精确反控见[controls](controls.json)：行别名、ColorFade非网格仿C无clamp循环、上升红通道冻结、错误从工作色表累积；各完整未过滤旧17绿→新16绿1指定业务AssertionError，0skip/pending/unhandled，完整source/spec/mutant/nativeJSON/raw/restore SHA与finally清理。源SHA按controls-source-base.gz定位；最终源差一处引用勘误，AST双证明确。测试不直接构造被测算法来生成oracle：小值手算与原C/真实提取器完整对照相互核证。

## 门、状态与未决

实际结果及诊断见[gates](gates.json)，完整未裁剪raw gzip与独立命令回执随片；17恢复、86相邻、game typecheck零诊断。docs125/全部消费者、lint和ledger以最终回执为准。全仓check、official coverage ratchet、protected fast、视觉/E2E未运行，按用户成本规则留完整大任务窗口，不授统一门或main合并信用。

两个原closed转review，0新增closed；265closed/77review/2973pending，83卡50partial/33pending/0accept。整色域、其它fade数学、invalid delay、资源库存/视觉和完整异步生命周期仍未接受；共享moveToward提取未证多个owner同域必要，不为“复用”加新接口。第八组注释已处理，尺寸/快捷键继续；法术160/161与毒列表、两UI风险按原卡留待裁决/核证。

## 交接与下一步

同一3y治理分支提交推送，fetch确认0behind；未合main。下一有限范围核minimap/tools-panel/bootstrap尺寸与真实speedrun hotkey。无下一位Agent提示词，Codex单Agent继续94前全部复审。
```
<!-- incremental-original-source:end -->
