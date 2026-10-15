# QUALITY-EDITOR-DIAGNOSTICS-4 — Kimi 战斗精灵真实工作流

Status: build
Owner: Codex
Reviewer: Codex（作者实测与独立验收分开）
Phase: phase2
Capability: editor test lifecycle correctness
Visual Verification Timing: N/A（纯测试，不改产品）

## 准入与独占范围

起点52d046f0b已推送两条治理分支，最新main=f98d0ddd8，0behind/36ahead；主树干净且只读。机器3284/229closed/54review/3001pending。
前卡稳定模块全门已留原件，统一诊断仍非零；不合main。默认单Agent，Coding Owner=Codex。旧Kimi十二组任务已done归档，无活动Owner重叠，不改其历史accept。

仅两份测试源码：

- packages/editor/src/ui/BattleSpriteLibrary.kimi-workflows.test.tsx（六条工作流整体，先不精简）
- packages/editor/src/__tests__/cursor-asset-r1/battle-sprite-fixtures.ts（仅头注明确编辑器测试复用；不改fixture实现）

完整读取Kimi模块、两套真实宿主/IO/typed fixture、共享UI驱动、prepareBattleSpriteImport及其类型；SHA见本片read-boundaries.json与上一片next-read-boundaries.json。
生产Library/InlinePreview及reader/cache/session/命令完整读取历史与当前SHA对照沿用前两卡；DataMode真实caller仅693-720调用段，不冒称全文审计App/DataMode。
必读AGENTS/CLAUDE/agent-workflow/phase2 READ-FIRST及旧[十二组卡](../archive/tasks/done/TEST-KIMI-EDITOR-WORKFLOWS-1-twelve-groups.md)。不碰其它任务、产品、公开接口、schema/save/资产管线、生成物与规则。

## 真值与可证伪观察

| 方向 | 一手证据 |
|---|---|
| Primary | React官方act：等待触发更新的真实异步工作；不得用空act或关闭检查。 |
| 第一阶段 | N/A，二阶段测试调度与oracle；不变游戏机制或UI。 |
| 第二阶段 | Library raw提交实际await gzip/hash/read/dispatch后发新notice，undo同步通知订阅并可能触发真实预览；prepareBattleSpriteImport:90-136按SHA返回真实复用记录。 |
| 目标 | 复用现有C02真实宿主与完成信号，撤掉重复宿主/轮询点击/空Promise；六条合法输入与业务oracle保留，同字节复用检查真实准备结果。 |

最强替代解释：告警可能由未等待的图片端口而非重复宿主造成。逐步保持六例看实际诊断与完整恢复；不以注释解释代替实测。
当前注释声称pending拒绝但只在proof就绪后点击，先撤回虚假声明，不凭空新增同义覆盖。append arrange改写prepare返回值不能作为真实复用证据；改为直接断言真实返回并原样dispatch。
原始六例、相邻模块、typecheck、零静态诊断；保留代表性缩帧反控，核错误为指定业务AssertionError而非超时。未知跨文件重复不删。
Codex：premise verified / design agree，build allowed，仅上述范围。

## 验证与交接

定向/相邻/typecheck后先提交推送检查点；下个稳定资源工作流模块窗口集中跑check、官方ratchet、protected及lint/docs/ledger，不为每一步重复全仓门。
本卡在统一门之前保持build/review，不关闭文件。原件见[证据](../evidence/QUALITY-EDITOR-DIAGNOSTICS-4/README.md)。无下一位Agent提示词，Codex继续。

## 作者检查点

六例完整398→0诊断；实际复用真实C02宿主与完成信号，不改核心、不静音。复制的宿主及空Promise/轮询点击已移除，六例名称/计数不变。两项旧绿/新红反控证DnD小数与真实复用oracle的改进，缩帧反控仍准确红；所有新红均完整六例、恰一指定业务AssertionError、0skip/0诊断，恢复六绿。隔离及清理后独立构造证据见README。
相邻11文件90例、editor typecheck、coverage工具65通过；全门在后续稳定资源工作流窗口集中跑，当前仍build，统一门未通过，不合main。只把两文件列review，机器3284/229closed/56review/2999pending，0新关闭。
下一候选为剩余native导航两测试，先限定Owner/白名单与真实caller；或World资源工作流，不能用标题直接断言根因。无下一位Agent提示词，Codex继续。
