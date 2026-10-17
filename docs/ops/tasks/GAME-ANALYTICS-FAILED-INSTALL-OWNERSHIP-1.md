# GAME-ANALYTICS-FAILED-INSTALL-OWNERSHIP-1 — GA安装失败后的订阅所有权

Status: draft
Owner: Codex
Phase: phase1 project analytics extension
Capability: optional analytics / initialization ownership
Coding Owner: Codex（只读核证，产品执行冻结）
Reviewer: Codex（自身源码与反例核证，不冒充第三方）
Visual Verification Timing: dev-functional（若产品准入后执行；本卡尚未浏览器实跑）
Branch: codex/code-quality-3y

## 目标

明确可选GA安装在外部gtag端口抛错后的资源归属与重试方式；失败安装不得在无返回controller的情况下继续拥有授权订阅。当前只读反例成立，产品行为选择尚未批准。

## 范围

候选实现边界：google-analytics.ts、install-analytics.ts及其定向回归。当前仅本卡与3z证据，不改生产执行、GA数据范围、Measurement ID、隐私政策、游戏机制、UI布局、schema/save、资产或公共接口。用户裁决后重新定有限白名单与先红后绿步骤；不由历史done或父卡测试治理授权产品修复。

## 前提真值门

一句话前提：真实install在建立consent订阅后执行初始granted；外部gtag在js初始化命令抛错，安装没有返回销毁句柄，订阅仍响应后续授权。

| 维度 | 当前真值与直接证据 |
|---|---|
| primary | OPS-GA4既有可选analytics/失败隔离意图；当前typed gtag端口及正式game jsdom原生Storage/window事件。Google官方API只定义命令，不为本项目异常/重试策略背书。 |
| 第一阶段 | google-analytics.ts:118–139先订阅后applyConsent，:78–81初始化命令异常不在发送catch内；install-analytics.ts:28–56先装UI后GA，GA抛错时未返回installation；main.ts:9–15隔离启动异常但无法取得该句柄。 |
| 当前二阶段 | N/A：没有Reforge/编辑器/内容域或SDLPal机制对应功能。 |
| 目标 | 初始化失败后明确释放，或保留完整可重试controller；不得继续留下半初始化的无owner订阅。 |

### 反证与替代解释

- 真实gtag通常只排队，不假称真实Google SDK已被观察抛错；本例是合法外部函数端口的同步IO异常。
- 反例完整调用真实installTypePalAnalytics、writeAnalyticsConsent、原生window/EventTarget和localStorage，只用自有无浏览上下文Document及可抛错的SDK端口；不是手写ga状态机。随后替换为恢复的SDK函数，再明确deny/grant，实际排队一次page_view。
- 后续page_view发生在再次明确授权后；本卡结论是失败安装仍有存活订阅与不完整初始化，未声称未经同意发送或游戏启动失败。
- 若产品明确规定失败安装仍须保留可重试监听，则A前提应改为B，并补齐初始化状态与异常隔离；现实现没有返回可销毁controller，也未重发js/config，不能靠旧12绿证明完整重试。
- extractor/原盘/机制真值N/A；复现不消费游戏资源，无生成物变化。

### 用户可见选择（pending）

A（建议最小边界）：安装失败即回滚本次GA订阅和UI，将原错误交给main既有隔离层；本次安装停用，刷新页面后重新安装。正常安装和脚本资源error重试保持既有合同。

B：保留隐私按钮和可销毁controller，在后续明确授权时重试SDK初始化；需另核部分命令已执行后抛错的重复/提交边界。

当前before→after仅为待裁决方案；A/B都尚未build allowed。

## 上下文锚点

- AGENTS.md高风险/用户可见行为边界；CLAUDE.md可选扩展与异常隔离、工程/生命周期审查要求。
- [父卡3z准入](QUALITY-PRE94-RETROSPECTIVE-1.md)仅注释与测试治理。
- [旧OPS-GA4](../archive/tasks/done/OPS-GA4-consent-pageviews.md)为设计来源，旧三签/部署不是当前准入。
- [完整反例](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3z-google-analytics/initialization-probe.json)、完整nativeJSON/raw及probe源gzip同目录。

## 验收条件

- 用户选择A或B，先把反例变成正式回归并确认旧实现精确业务红，再修实现；纯测试重构与产品修复分提交。
- 核实际install→consent→gtag caller；SDK例外、订阅解绑、UI归属、部分初始化和后续授权/销毁均有精确oracle。
- 正常12原合同与当前治理后合同、consent/UI/installer相邻、必要typecheck/静态零诊断通过；昂贵全仓/coverage/protected按大任务窗口实际执行。
- 若进入产品build，功能性浏览器入口验证延期到稳定候选，不伪造实网GA数据；不向真实property制造测试采集。

## 当前模式推进记录

- Codex前提：counter已证；冻结4b86b04b7，原12绿＋精确清理反例1个AssertionError，0skip/pending/unhandled。
- Owner：Codex单Agent/同3y树，未分派其它Owner。
- 用户产品裁决：pending；本卡product build not allowed。
- 独立第三方审查：N/A，没有冒充他席；作者自验不替代将来Codex产品验收。
- done：不允许，当前draft。

## Draft: 设计与风险

A分别由GA创建者撤订阅、安装器撤UI，保留原异常与main隔离；B须有完整的失败状态与重试提交语义。未定项是用户可见重试方式，不能先改实现再请求确认。创建失败可能发生在subscribePage/readPage/初始化不同阶段，获批后逐一核caller与cleanup，不把单个gtag反例外推所有异常已收口。

## Build: 实现与自测

产品未实现。只读probe临时树逐项清理，三生产源SHA逐字节恢复；真实Google端点、完整浏览器、全仓check/coverage/protected未运行。详见probe回执。

## Review: 审查与返工

旧google主测“Google或URL异常”实际只覆盖URL；当前3z先撤销此过强信用并补强合法合同，不用错误绿测固化本缺陷。

## 用户验收

pending，等待A/B裁决；不在本卡恢复历史固定三签。

## 交接日志

- 2026-10-18 Codex：完整读取139/169/121行与实际install/main/consent/UI；正式runner旧12绿，真实安装失败后恢复SDK/再次授权仍收到page_view，清理期望单红。产品源码未改，先开本卡draft；3z测试宿主治理独立继续。

## 下一位Agent提示词

无下一位Agent提示词；Codex单Agent维护。未获裁决前只读该产品异常路径，不改实现、不标done、不以3z其它测试绿关闭。
