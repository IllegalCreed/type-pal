# ARCH-SUPPORT-GLM-1 · 总报告（GLM 八包准备取证，r3 收窄返工）

日期 2026-09-25（r1 交付 3967a376 → r2 717d507d/9e5ba310 → r3 闭 Codex r2 counter 1e4e3382 的 C1～C4）。
贡献者：GLM（证据/测试贡献者，**不充独立第三方**）；接收复核：Codex。
任务卡：[ARCH-SUPPORT-GLM-1](../../ops/tasks/ARCH-SUPPORT-GLM-1-eight-audit-packages.md)（draft，不进 build）。

## 起点/终点与白名单核验

- 起点 SHA `3270473862d1e1574f266b70b65de89ca8b65352`；**接收审查候选 `3967a376`**（Codex counter 对象）；
  r2 返工 tip 见分支（登记提交单独回填 finalSha，避免自引用）。
- 冻结核验：`git diff b11d4bc9..32704738 -- packages/ scripts/` 空；`32704738..3967a376` packages/scripts 零 diff。
- 白名单：r1 恰 12 文件全部在 `docs/testing/glm-architecture-support/**`（r1 曾误写 9）；r2 追加仅本人
  报告/机账更正与 6 张新截图的登记。
- 未改产品/正式测试/配置/基线/共享看板/任务状态；未跑全仓 check/ratchet/strict、迁移写盘、完整剧情 E2E；
  未触碰 A3 帧循环。视觉操作后 `git status` 核验磁盘零改动。

## R0 账本更正（对照 Codex counter 逐条）

1. **条目数更正**：38 个唯一 ID（r1 手填"32 条"错误，此处为勘误记录非现行数）。r2 机械小计由 node 脚本从 entries 数组重算：
   **covered 19 / risk 14 / blocked 0 / reproduced 0 / N/A 5 = 38**。r1 的两项 blocked 已在 r2 闭合：
   V1 未覆盖页以 6 张新截图补齐（V1-003），对象列表折叠由 Codex 6010 实测正常（V2-002，归属 Codex）。
2. **逐条字段闭合**：每条新增 `evidenceKind`（静态事实/已读测试断言/文件计数/本次执行四口径）、
   `actual`、`expectedSource`、`affectedDomain`、`testsScope`、`attribution`；覆盖主张一律附**完整测试
   标题**（editor-navigation 17 条、hooks-session 3 条、leave-guard 8 条等逐条列出）；大文件计数明确标
   "文件计数口径，未逐条宣读"，不以 grep 计数冒称全绿。
3. **finalSha 登记**：接收候选 3967a376 + 返工 tip（登记提交回填）；浏览器版本/zoom/DPR 如实未测量，
   视觉结论收窄为 CSS px 布局观察。
4. **Biome**：r1 的 evidence.json formatter exit1（Codex 日志 /tmp/codex-arch-support-biome.log）——
   r2 已 `biome format --write` 本人 JSON，复检通过。
5. README 链接索引由 Codex 机械补齐，本席不重做。

## 源码 hash 附录（审查候选 3967a376，SHA256 前 16 位；`git show 3967a376:<path>` 复算）

| 文件 | hash | 文件 | hash |
|---|---|---|---|
| editor/src/ui/App.tsx | 0803997f6a5552ce | game/src/core/event-system.ts | e42292d549175a9b |
| editor/src/ui/MapMode.tsx | 8418dee784cd9bea | game/src/core/scene-system.ts | c1a0a1445c6dcb8f |
| editor/src/ui/ScriptEditor.tsx | 7b39070c3d12a466 | game/src/core/equip-effect.ts | 7daa55fa6951af32 |
| editor/src/ui/CommandForm.tsx | d6004c29b4e8b7cd | game/src/core/battle/battle-opcodes.ts | b9fb8d53cfffdb40 |
| editor/src/ui/editor-navigation.ts | 091277ddd2850f00 | game/src/core/menu/menu-driver.ts | a66844fd9893bafa |
| editor/src/ui/design-system/multi-select.tsx | 9d143ad34bed199e | game/src/core/menu/menu-mode.ts | 87f352d5473e6acd |
| editor/src/core/editor-derived-store.ts | e8ed0e39e4d66fac | game/src/core/menu/magic-script.ts | f17ff47860de4697 |
| reforge/src/battle/battle-session.ts | 24cdd3e539e22481 | content/src/author-script-core.ts | 0270998b8c1dcd2d |
| reforge/src/battle/battle-core.ts | 651efc8f7dab8cf2 | content/src/enemy-script.ts | dc4fecaa314a0813 |
| migrate/src/migrate-content.ts | df2ed14c30b7743f | migrate/src/translate-events.ts | 4d4efd3f27eb81d3 |
| migrate/src/migration-transaction.ts | f22787611d1e0ae9 | migrate/src/translate-enemy-scripts.ts | 77cafdcc95ce6b61 |

## 八包 r2 状态（每包详据见对应报告顶部"r2 返工更正"块 + evidence.json 条目）

| 包 | r1→r2 变化 | 条目 |
|---|---|---|
| P1 | P1-001 risk 撤回改 covered（derivedStore useMemo 创建→start 返回 stop→terminate worker，测试 22/22 本轮执行）；editor-navigation 17 条 it 完整标题入账；assertSessions 修复表述撤回；盘点按 AST 重做（r3：29 state/16 ref/15 effect+1 useLayoutEffect，逐行绑定） | 6 = P1-001~006（covered 2/risk 3/N-A 1） |
| P2 | P2-002 risk 撤回改 covered（pointerCancel/lostCapture 均存在且统一 cancel）；58 静态/72 收集分列；吞错表述收窄单调用点 | 5 = P2-001~005（covered 3/risk 2） |
| P3 | 50 旧适配 case ↔ 81 canonical 键区分（**守门测试合同收窄**：只核命名集合，不证 50 分派映射）；WorldVariablePicker 纯计算更正；P3-005 hooks-session 三轴 covered；JSON 指纹锚 :3149 | 5 = P3-001~005（covered 3/risk 2；r2 的报告/机账 6 vs 5 不齐已消除） |
| P4 | P4-002 改 covered（门归属更正：:604 属 beginTurnPreparation；writeBackHp 无 preparing 门）；计数 87→93；P4-003 covered 补共享状态 writer→reader→清理小表（dialogBox/casualty/choreoBanner/choreoWaitUntil/scriptAnimation/anim 家族）；P4-004 risk（构造窗口）；P4-005 N/A——与机账 ID 完全对齐 | 5 = P4-001~005（covered 3/risk 1/N-A 1） |
| P5 | 撤回"6 文件两环"→**7 节点 15 边单 SCC**（补 4 条漏读回边）；撤回"最短无行为切法"；计数 703→**702**（分项 326/110/158/37/28/36/7，本轮逐文件 vitest list 实测） | 4 = P5-001~004（covered 1/risk 2/N-A 1） |
| P6 | 双向校验递归更正（author↔enemy 互调；**自递归 7 处** :661/:663/:669/:708/:710/:722/:726）；mapScenesStatic 6 参数；无 fs 事实收窄到四模块 | 5 = P6-001~005（covered 2/risk 2/N-A 1） |
| V1 | 撤回 a11y 缺名（multi-select.tsx:120 aria-label 存在）与语义裁决请求（DS-C.5a/DS-C.6 条款即合同）；6 张新截图补齐 Actor/物品/技能/敌队/战场/TrialDialog。**ID 对齐**：V1-002 合并 a11y 更正、V1-003=新截图覆盖，无 V1-005（与机账一致） | 4 = V1-001~004（covered 3/N-A 1） |
| V2 | 折叠功能归属 Codex 6010 实测正常（GLM 环境差异留档）；:568 归因更正；**分隔条更正为"测试存在+本轮未执行"**（PanelResizeHandle-interaction 三条标题入账）；空态图不再冒充编辑合同 | 4 = V2-001~004（covered 4） |

**机械小计（r3 重算）**：38 条 = covered **21** / risk **12** / blocked 0 / reproduced 0 / N/A 5
（node 脚本从 entries 重算；分项 P1 6/P2 5/P3 5/P4 5/P5 4/P6 5/V1 4/V2 4，与各报告 ID 一一对应）。
reproduced=0 与 blocked=0 均为如实结果。r1 手填 32、r2 过渡 19/14 均已废弃。

## 未证风险（如实，交 Codex 复核）

1. 画布内容（tileset/调色板/精灵/战场背景预览）全未判定——worktree 资源缺口，属资源完整环境复核。
2. MapMode 取消路径专项回归充分性（P2-002 保留的开放问题）；分隔条拖拽/键盘未验证（V2-003）。
3. assertSessions 渲染期失败路径无测试（P1-002）；P5 切边后剩余环形态未评估（P5-002）。
4. mapScenesStatic 参数组合矩阵无快照（P6-002）；walkBody 深度无上限（P6-005）。
5. 非空脚本工作区的编辑合同未走查（基线项目 0 条可复用脚本，构造内容超出只读边界）。

## 建议可拆实施批次（供实施卡参考，非本包执行）

1. **零行为批**：V1 可发现性小建议（多选过滤输入补 placeholder）；P2-003 双 effect 合并（先核消费者）。
2. **低风险批**：P4-002 记录的屏障/写回概念区分文档化；P3-002 抽 useFocusRevision hook；P5-002
   getCurrentMapNum 搬家（先做切后剩余环评估）。
3. **中风险批**：P4-002→render/输入路由拆分（transitionUi 单点先行）；P1 导航簇拆分。
4. **最后**：P1 保存流程（lease/recoverySnapshot/journal）单独卡。
5. **最小正式回归集合**：P1 三测试文件（29 条已读标题）+ MapMode 生命周期 20 条 + battle 93 条 +
   hooks-session 3 条 + reference-navigation 全族 + event/scene 抽样（P5 文件计数口径）。

## 复算命令

```bash
cd /Users/zhangxu/illegal/type-pal-glm-architecture
git log --oneline 32704738..HEAD                     # r1 九包提交 + counter 合并 + r2 返工提交
git diff 0e751efe..HEAD --name-only | grep -v '^docs/testing/glm-architecture-support'  # 本席返工增量，应为空（32704738..HEAD 会包含 Codex 对任务卡的授权修改，不要求空）
node -e "const e=require('./docs/testing/glm-architecture-support/evidence.json');console.log(e.entries.length, e.mechanicalSubtotals.byType)"  # 38 {covered:19,risk:14,N/A:5}
git show 3967a376:packages/editor/src/ui/App.tsx | shasum -a 256 | cut -c1-16  # 0803997f6a5552ce（hash 附录抽查）
cd packages/editor && npx vitest run src/core/editor-derived-store.test.ts  # 22/22（P1-001 本次执行）
npx biome check docs/testing/glm-architecture-support/evidence.json  # 在仓库根目录执行（最终待交付树），exit 0
# 视觉复验：dev 6013 + 截图 SHA256 对照 evidence.json.screenshots（17 张）
```
