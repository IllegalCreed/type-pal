# GAME-ANALYTICS-FAILED-INSTALL-OWNERSHIP-1 — GA安装失败后的订阅所有权

Status: review
Owner: Codex
Phase: phase1 project analytics extension
Capability: optional analytics / initialization ownership
Coding Owner: Codex（用户A裁决，三文件窄修）
Reviewer: Codex（自身源码与反例核证，不冒充第三方）
Visual Verification Timing: dev-functional（本地诊断宿主已实跑；非实网GA/完整游戏）
Branch: codex/code-quality-3y

## 目标

安装在返回controller前失败，应由创建者撤已取得的监听和本次隐私UI，保留原错误供main隔离；本次停用，刷新后重新安装。用户2026-10-18已明确批准A，不重复请求。

## 范围

build allowed有限白名单为google-analytics.ts、install-analytics.ts、新正式google-analytics.install-failure.test.ts。只修失败ownership；正常GA采集范围/ID/URL白名单/去重/同意策略、脚本资源error重试、UI布局、公共接口、schema/save/资产/二阶段冻结。3w本轮仅只读，没有改动。

## 前提真值门

| 维度 | 证据与停止线 |
|---|---|
| primary | OPS-GA4现已历史保留的可选扩展/失败不阻启动意图；本轮用户A为重试产品真值。Google命令API不为项目异常策略背书。 |
| 第一阶段 | 真实main.ts:9–15捕获可选安装异常；GA先取得订阅再apply初始授权，旧错误导致无返回句柄却继续响应重授；安装器先装UI。基点完整源/5正式业务失败和原早期probe分别保全。 |
| 二阶段 | N/A：无Reforge/editor/content或SDLPal机制对应。 |
| 目标 | GA构造器撤本次已取得的订阅；installer撤本次UI；同一错误对象传播至原启动catch。正常合同不扩张。 |

### 反证与替代解释

真实gtag通常只排队，不能声称Google实网SDK已观测抛错。本例是公开可注入外部函数端口的同步异常；正式runner与原生浏览器用实际SUT/native事件/Storage和独占Document/记录型SDK。后续命令只在再次明确授权后出现，原缺陷是无owner订阅，不是未经同意发送。若旧源相同输入不泄漏，counter应撤回；本轮精确最终spec回放仍5业务红。

## 用户裁决与准入

用户原话：“A：失败即撤销本次监听和隐私控件，刷新页面后重试（推荐，改动较小）”。Codex premise verified/design agree/build allowed，单Owner/同3y隔离树；先正式失败回归再实现。B（保留可重试controller/同页重试状态机）不实施。原probe冻结4b86b04b7与历史draft不替代此新准入。

## 上下文锚点

- [父卡](QUALITY-PRE94-RETROSPECTIVE-1.md)、[本轮完整证据](../evidence/GAME-ANALYTICS-FAILED-INSTALL-OWNERSHIP-1/README.md)。
- [旧3z probe](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3z-google-analytics/initialization-probe.json)和源/native/raw为当时未修观察；本次不改旧原件。
- [旧OPS-GA4](../archive/tasks/done/OPS-GA4-consent-pageviews.md)仅设计来源，不恢复固定三签/历史部署信用。

## 验收条件

1. 正式修前js/config/page订阅/初次readPage/真实installer UI失败为精确业务红，错误对象不替换。
2. 释放已取得的监听、UI撤销、已保存选择与不相关DOM保留；失败后native重授/页面事件不再触发本次SDK。
3. 正常现有合同与同意/UI相邻、TC/静态零诊断；全仓/coverage/protected留大任务收尾。
4. 本地浏览器失败及刷新重试功能实跑，不向真实property发送测试采集。

## Draft: 设计与风险

事务边界从已取得consent释放句柄开始，page订阅与初次apply位于try内；异常撤已取得的consent/page，再抛回。installer另撤自己UI。共享SDK/global/脚本不是本次独占资源，不清；已执行SDK命令不可逆，不宣称完整撤销外部副作用。任意外部unsubscribe自身抛错、订阅源已注册却抛且不交句柄、已返回controller后的事件回调错误未据本卡认证。

## Build: 实现与自测

产品只改上述两生命周期块。修前4文件15绿/5指定AssertionError；先红源/spec/native SHA保存后再修，随后7文件30绿。TC首版测试spy泛型有TS2344，改真实类型推断闭包恢复，未cast/ignore；最终TC零诊断。最终spec以两旧源回放仍5红；两单针各4绿1指定红，全部源/测恢复字节，自有临时目录清理。无纯重构夹带、baseline/退役/规则或生成物修改。

## Review: 审查与返工

三文件全文及main/真实UI/consent/共享host核读。既有25相邻测试未改，无弱化/skip。30绿仅本slice执行，三个文件继续review，0新增closed；83卡55partial/28pending/0accept不变。实际docs/lint/ledger以本轮gates为准。统一check/ratchet/protected未跑，review不等于整卡done或允许合main。

## 用户验收

A产品方向已批准。本地浏览器诊断宿主实际看到失败后无控件/无后续命令，刷新后controller/隐私设置可用；真实模块执行，SDK是显式记录端口。不是Google网络/完整游戏启动验收；无需用户重复技术步骤。

## 交接日志

- 2026-10-18早期：冻结4b86b04b7，旧12绿+真实install清理单红，未改产品，开draft等待裁决；原件留3z。
- 2026-10-18本轮：用户A到达；暂停3w只读，先正式五红再窄修，7文件30绿/TC最终零诊断/两单针与本地浏览器通过。三代码路径review，新测试库存+1；3317/253closed/99review/2965pending。main/其它Owner未写，统一门仍待。

## 下一位Agent提示词

无下一位Agent提示词，Codex单Agent继续；本卡窄功能证据有效但全仓门未收口，随后回pre94 3w settlement，不把本次修复当专项完成。
