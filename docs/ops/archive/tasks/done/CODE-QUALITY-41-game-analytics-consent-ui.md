# CODE-QUALITY-41 — game analytics consent UI 窄批

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

原卡目标:逐文件核验可选访问统计的 DOM 提示层两文件（`analytics-consent-ui.ts` 与测试）:面板/偏好按钮结构、ARIA、定位样式、show/hide 状态、合法选择、storage/eventTarget ownership、重复安装与 destroy 清理;不自作主张改 UI 形态。

## 范围

两文件;由 `install-analytics.ts:29-36` 安装,使用 analytics-consent 的存储/广播接口;不改变游戏状态、存档、schema、输入或正式 UI 形态。jsdom 断言不冒称真实浏览器截图。

## 前提与证据

历史批:定向 3/3、game 全包 3519、AX 树实际验证 localhost:6005 显示"可选访问统计"面板/隐私政策链接/拒绝/允许按钮,控制台仅预期 autoplay 警告;editor 既有 number-field-adoption 失败未改;ratchet 按主线新增测试更新官方 fast baseline（19,798 tests,提升9项/范围4项）。

## 验收

2026-10-21 analytics 四卡收口:原 UI 两文件接受——实现字节未改;补真 hidden/偏好切换与已存在焦点,两个旧 3 绿→新 2 绿 1 指定业务红,外部 Owner 探针恢复;真实浏览器拒绝/重开/允许/再重开/清理通过;旧图片附件缺失明示,当前截图已看。逐文件 A–H 与原件见 [analytics-closeout.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json)。

## 状态与交接

done 保持原历史语义;收口只接受原卡范围及明确支持文件。

## 历史范围

原卡属 2026-10-11 前后窄批时点;原始记录在保全块内逐字保留。

## 原始结论

原卡结论按 Status(done) 原样:未发现直接缺陷。治理不撤销/不恢复旧信用。

## 当时证据

当时回执（3 定向、AX 树验证、ratchet baseline 更新）属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;当前结论以 analytics-closeout 原件为准。

## 继任文档

CODE-QUALITY-3y/3z/40（analytics 同族）与 analytics-closeout 为继任;当前任务导航以看板为准。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2915B / SHA-256 4c7089068a1230271acca717594c644f97abd969e3430967cb8b6a5542397f74；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-41 — game analytics consent UI 窄批

Status: done
Phase: phase1 game
Coding Owner: Codex
Scope: `packages/game/src/analytics/analytics-consent-ui.ts`、`analytics-consent-ui.test.ts`
Visual Verification Timing: dev-functional（现有 DOM UI 形态与可达性；不改变布局取舍）

## 前提与范围

这是可选访问统计的现有 DOM 提示层，由 `install-analytics.ts:29-36` 安装，使用
`analytics-consent.ts` 的存储/广播接口。它不改变游戏状态、存档、schema、输入或正式 UI 形态；
本批只核全文实现、按钮/焦点/销毁生命周期、存储失败策略、隐私信号文案与真实测试 oracle。

## 逐文件核验计划

- `analytics-consent-ui.ts`：全文核对现有面板/偏好按钮结构、ARIA、定位样式、show/hide 状态、合法选择、
  storage/eventTarget ownership、重复安装与 destroy 清理；不自作主张改 UI 形态。
- `analytics-consent-ui.test.ts`：全文核对公开 mount caller、DOM 合法输入、布局/焦点/按钮与失败存储 oracle；
  jsdom 断言不冒称真实浏览器截图，必要的最小功能 UI 证据另记。

## 当前证据

已读取实现、测试、`install-analytics.ts`、consent caller、`main.ts`；未发现直接缺陷。

## 收口验证

- 定向 Vitest：3/3 通过；game typecheck：通过。
- 开发期功能 UI：`http://localhost:6005/` 的 AX 树实际显示“可选访问统计”面板、隐私政策链接、拒绝/允许按钮；截图核对加载画布，控制台仅有预期 autoplay 警告。未改变 UI 形态。
- game 全包：311 test files，3519/3519 通过。
- `pnpm check`：docs/content、shared、game、pal-extract、reforge 通过；editor 既有 `number-field-adoption.test.ts` 失败（`command-form-controls.tsx@Num` 实际 37、期望 39），未改 editor 或 coverage 配置。
- `pnpm coverage:ratchet`：通过并按主线新增测试更新官方 fast baseline；总 19,798 tests，提升 9 项、范围变化 4 项。
- protected `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：通过，0 项下降。
- `pnpm lint`、docs/content review、ledger、`git diff --check`：归档后复核通过。

## 下一位 Agent 提示词

无下一位 Agent；Codex继续完成本批审计，未完成准入前不得扩大范围或标记 done。

## 2026-10-21 analytics四卡收口

原UI两文件接受。实现字节未改；补真hidden/偏好切换与已存在焦点，两个旧3绿→新2绿1指定业务红，外部Owner探针恢复。真实浏览器拒绝/重开/允许/再重开/清理通过；旧图片附件缺失明示，当前截图已看。

[逐文件A–H、完整原件与集中门](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json)；只读verify-analytics默认不写树/不重跑测试。原卡范围及明确支持文件接受，广域main/实网/E2E不附带关闭。
```
<!-- incremental-original-source:end -->
