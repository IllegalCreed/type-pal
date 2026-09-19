# 战斗模拟器 r2 实施记录

关联[任务卡](../ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md)与[冻结设计](battle-simulator-r2-design.md)。
Coding Owner：Codex。起点 `af916f5b`，分支 `codex/editor-battle-simulator-r2`。
隔离工作树：`/Users/zhangxu/.codex/worktrees/battle-simulator-r2/type-pal`。

## 2026-09-19：S1 配置与作者保存基础

状态：**部分实现，仍为 build；不是整卡完成、不是可用战斗模拟器**。
未改GLM候选或官方覆盖率基线；尚未运行全仓check/ratchet/strict-fast，留完整首批集成后串行执行。

已落产品：

- Reforge小型配置合同：我方成员、基础属性覆写、装备槽继承/空槽、技能继承/替换、HP/MP满值/绝对值/百分比、
  五个敌方语义槽、背包、战场、三态音乐与金钱/自动/Boss。只解析数据，不另写战斗算法。
  战场ID直接使用 `BattleFieldDef['id']` 的非负安全整数，敌队ID使用 `EnemyTeamDef['id']` 字符串；不把现行数字稳定ID误作数组位置。
- 编辑器四类命名记录、严格当前格式、独立副本解析、引用/内嵌来源及整段显式覆写；空队伍是可编辑草稿，不等于可开战。
  删除被方案引用的预设要求确认精确受影响方案集，保留悬空引用供修复；命令进入现有EditSession，不加新撤销栈。
- `editor/battle-simulator.json`接入本地/开发HTTP打开、toEditorState、序列化、准备写集复验和原作者事务。
  真正不存在与坏JSON/权限错区分；损坏错误不被包成泛泛的canonical内容错，保留具体文件路径与重新打开提示。
- 已打开/复制的可选文件“缺席”也加入字节基线，防止读取后被外部创建却悄悄忽略。配置文件不能与任何内容/资产路径及其大小写别名冲突。
- 首次使用写文件、删空删除文件、重开后首次保存也显式删除；App保存/另存两条实际回调接入删除路径。
  原始克隆逐字节携带附属文件；另存以当前编辑覆盖源副本或执行明确删除；作者ZIP自然携带，恢复目录仍排除。
- 编辑器开发/预览服务对缺席附属文件返回404，权限/目录等错误返回500，不落SPA的200 HTML。普通运行时不读模拟器库。

## 证据与边界

新增67项：Reforge配置29；编辑器库/命令11、真实持久化13、实际App撤销保存1、服务路由12、真实HTTP1。
新增夹具使用正式 `buildBlankProject` 工程；库夹具的空敌队是合法**编辑草稿**，没有宣称已经可开战。
存储集成只替换浏览器FSA/IDB/picker边界；loader、事务、恢复、身份/锁、克隆、ZIP、序列化均执行生产代码。

定向与相邻：13文件243项通过；Reforge配置29项通过；服务路由与真实HTTP共37项通过。
完整fast测试选择（复用 `scripts/coverage/config.mjs` 的 `testSelection`，**不启用覆盖率/不写基线**）：
editor 225文件/2397项，reforge 117文件/1219项，全绿。两包typecheck另跑；仅本卡改动文件执行Biome。

负控制：[可重建脚本](battle-simulator-s1-mutants.mjs)，运行 `node docs/testing/battle-simulator-s1-mutants.mjs`。
四正控全绿、四个单点坏实现由精确新测试标题产生AssertionError；原产品文件SHA-256前后相同。

| 控制点 | 唯一变更 | 真正被钉的业务失败 |
|---|---|---|
| open | open-local不加载库 | 正式重开丢失已提交配置 |
| preflight | 移除附属JSON早期校验 | 无效输入进入journal准备，非零凭据 |
| absence | 不记录读取时的文件缺席 | 外部创建后finish错误成功 |
| delete-after-open | 只移除App save的删除路径，保留save-as | 删空→保存→重开仍残留配置 |

逐项失败记录（不省略返修过程）：

- 扩大相邻测试首跑8红：1项原census仅列输出文件、不含新缺席见证；7项AST调用链环境未注入新实际函数。
  更新精确census、注入真实函数，原业务断言未删除；新增真实App删空/撤销/重开用例。复跑37/37通过。
- 新命名记录更新函数初版参数只写 `{id}` 导致新测试对象字面量typecheck拒绝；收紧到真正 `TrialPreset<unknown>` 后通过。
- 负控首跑停在absence：Vitest `.rejects` 对错误resolve报告为普通Error，而非本脚本要求的AssertionError。
  改成观察该次Promise结果，明确断言真实 `AuthorSaveConflictError` 与对应path；不放松反控判据。随后四针全红。
- 真实HTTP测试初放src内，`import vite`把Node类型传入编辑器DOM-only程序，触发5条旧ts-expect-error变为unused。
  该Node宿主测试移到 `packages/editor/scripts/*.test.mjs`，仍纳入原Vitest/fast选择，不改生产tsconfig、不删旧断言、不加排除。
- 初版配置实现把战场ID当字符串，核 `content/enemy.ts:119` 与 `validateBattleFields` 后修正为当前数字稳定ID，
  用0作合法正控；未发布此错误形态，也未引入兼容分支。

本轮没有正式界面或真实战斗可验；此前草图的布局检查不充当本批产品视觉证据。

## 接续工作（不重签设计）

1. S1剩余：按目录/记录/字段定位的内容引用诊断与启动前合法性校验；接入四目录UI后验证真实跨页历史。
2. S2：复用正式玩家派生，独立临时world、握手和BattleSession宿主、零正常存档IO、资源/取消/结果链。
3. S3：完整配置界面、技能/敌队/单敌原入口替换，本场调整差异可见；视觉仅Codex执行。
4. S4：实际1～5人/技能/配装/道具行为、隔离负控、功能视觉，最终全仓check→ratchet→受保护strict-fast，再给两席终审。

无下一位Agent提示词；当前由Codex继续实现，不交终审、不标done。
