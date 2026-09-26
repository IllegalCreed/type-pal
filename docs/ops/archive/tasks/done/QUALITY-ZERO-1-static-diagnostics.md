# QUALITY-ZERO-1 — 全仓静态诊断清零与硬门收紧

Status: done
Owner: Codex
Phase: ops
Visual Verification Timing: dev-functional（若清理涉及CSS/JSX，保持用户可见表现并最小核验）

## 用户裁决与现状

2026-09-27用户明确“清理QUALITY-ZERO-1”，Codex核定build allowed。隔离分支codex/quality-zero，
基点89485589；按现行单Owner模式实施，不等待他席。仅清已登记诊断、增加零诊断工具/回归和必要保真证据。
不改规则/排除/玩法；源码模板求值保真、callback运行行为保持、CSS最小功能验证是准入条件。

2026-09-27用户明确lint/typecheck等硬质量检查必须清零；本卡覆盖既有存量与机器门禁，不扩大到玩法或schema修订。
以下为开工前的历史盘点，不把旧exit0追认为零诊断。实施过程见
[保真回执](../../../../testing/quality-zero/README.md)；不允许无差别unsafe --write全仓修改。

- 原根package.json的lint是`biome check .`，warning/info可能exit0，不能据此报告质量全过。
- 开工前完整JSON扫描：**errors0 / warnings90 / infos7 / diagnosticsNotPrinted0**。
  其中5 warning来自已存在的未跟踪`docs/testing/gw3r3-witnesses.tmp.mjs`，其余85 warning+7 info为入库范围。
  不通过删除/排除该文件隐藏诊断；归属确认或保真修订另处理，未保存WIP保持。
- 七包`env -u NODE_COMPILE_CACHE pnpm -r run typecheck`首次exit0、零诊断。
- [扫描机账](../../../../testing/quality-zero-inventory.json)包含实际路径/行/规则；原始
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
## 实施与阶段核验

- 2026-09-27 Codex：清理85个入库warning和7个info，保留原规则/扫描范围/lockfile；主树临时工具5个
  warning独立保真修订，原文件保存在build/quality-zero-untracked-backup，仍未跟踪、不混入本包。
- 50个入库源码字面量与5个临时工具字面量求值完全一致，代表两套反控仍业务红。
- callback区分无结果通知与返回接受结果的函数；六生产模块编译JS与89485589逐字一致。
  中间`?? undefined`适配曾被ratchet挡住，18文件53处适配已全部撤回，不弱化门槛。
- 新lint入口拒绝error/warning/info、空扫描、跳过、截断、异常报告/退出；27项自测含真实Biome子进程。
- CSS/JSX最小功能验证在独立6017：RF14/RF17/RF23及原生隐藏标签几何/样式保持，RF14截图逐字相等。
  用户6010未操作；暂停中的两份帧编辑测试hash保持。
- 最终check：9712项/972文件、docs37/coverage30/quality27工具回归、七包TC、全仓严格lint全部通过。
- 最终ratchet：9220项/728生产文件通过；除content删除未用record函数导致分母S−3/B−5/F−1/L−3外，
  所有覆盖命中数及另六包完整基线对象均不变。没有新增统计范围或降低门槛，不计入+5pp补测贡献。
- 保护89485589的单次strict-fast：9220/9220通过，七包指标与ratchet结果精确相同。
- 2026-09-27 Codex实施/自验accept，核done并归档；按当前用户授权统一集成。未接收GLM/Cursor返工包，
  未重启+5pp目标，不声称full/E2E/Q1/Q2或远端CI已经通过。

## 交接与保留边界

原始日志/两轮check/两次ratchet（第一次拒绝中间回调方案）/最终单次strict分别留存，不取多数放行。
截图、样式快照、反控与最终门禁日志已备份主树build/quality-zero-evidence，原临时工具保留可恢复副本。
主树两份暂停中的帧编辑WIP未改，未纳入9712/9220；GLM/Cursor原counter保持。
无下一位Agent提示词；Codex完成合并推送与隔离工作树清理。
