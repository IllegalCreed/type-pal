# QUALITY-ZERO-1 — 全仓静态诊断清零与硬门收紧

Status: draft
Owner: Codex
Phase: ops
Visual Verification Timing: dev-functional（若清理涉及CSS/JSX，保持用户可见表现并最小核验）

## 用户裁决与现状

2026-09-27用户明确lint/typecheck等硬质量检查必须清零；本卡覆盖既有存量与机器门禁，不扩大到玩法或schema修订。
本轮先核配置/只读扫描、登记规则，**尚未清完存量，尚未改变package.json脚本**。
代码实施须按下方分组完成保真检查；不允许一条无差别unsafe --write全仓修改。

- 根package.json的lint仍是`biome check .`，当前warning/info可能exit0；今后不能据此报告质量全过。
- 本席完整JSON扫描：**errors0 / warnings90 / infos7 / diagnosticsNotPrinted0**，未清零。
  其中5 warning来自已存在的未跟踪`docs/testing/gw3r3-witnesses.tmp.mjs`，其余85 warning+7 info为入库范围。
  不通过删除/排除该文件隐藏诊断；归属确认或保真修订另处理，未保存WIP保持。
- 七包`env -u NODE_COMPILE_CACHE pnpm -r run typecheck`首次exit0、零诊断。
- [扫描机账](../../testing/quality-zero-inventory.json)包含实际路径/行/规则；原始
  `/tmp/codex-quality-zero-before.json`与`/tmp/codex-quality-zero-typecheck-before.log`。

## 保真清理范围

1. 反控/审查工具和测试中的55处模板字面量告警：表达方式修正，但字符串求值、唯一针锚点、生成源码逐字保持。
   不加biome-ignore，不能把原探针改成易过；需要字节等价见证与代表反控复验。
2. 未使用声明/导入/参数、type import、const与冗余fragment等：先核副作用/React状态保留，再窄修。
3. void返回联合的类型告警：明确callback返回契约，保留既有行为/调用者；禁止用any/unknown避开。
4. CSS specificity/important：核实际层叠与调用域，保持DOM/布局/交互，必要最小视觉/样式回归；不关闭规则。
5. 机器门禁必须拒绝非零诊断（含info）及截断/不完整报告；不要只依赖--error-on-warnings。
   现有合法扫描范围保持，不以少扫文件实现清零。补正常/各severity/异常报告的判据回归。

## 接收与未完成边界

最终要有全仓lint/格式/typecheck零诊断、必要相邻/全仓check、涉及生产改动时的防回退验证，
确认并行贡献者源码/用户WIP未被覆盖。历史done报告和告警数字原样保留；不将旧exit0追认成零诊断。
当前两贡献者的测试包仍按原白名单返工；他们不得为本卡处理主线全局诊断或改共享lint配置。
Codex补覆盖目标继续暂停；此卡是代码质量债，不把清理后分母变化算作补测贡献。
本轮只登记，不标done、不声称零诊断已实现。
