# 任务专属证据

任务证据与可重跑验证工具按卡分目录存放；关闭后保留唯一工具入口或按验收结论归档。
目录存在不代表任务活动；状态以任务总索引为准，历史时点报告见 [archive](../archive/README.md)。

上级：[协作与工程维护](../README.md)。

## 当前证据
- [CODE-QUALITY-53 状态页 runtime-zero 与 party-slot poison](CODE-QUALITY-53/README.md)（候选 build：runtime 0 保留、非顺序队伍毒映射反例与换队清表；待全仓质量门与 Codex 独立收口）。
- [CODE-QUALITY-80 Dev Panel 换队生命周期](CODE-QUALITY-80/README.md)（用户已裁决战斗禁入队/离队；探索切队补装备效果重建；实现与全部质量门通过，文件仍按逐文件治理保持 pending）。
- [CODE-QUALITY-81 Dev Panel picker 生命周期](CODE-QUALITY-81/README.md)（observer 断开、列表 generation 与缩略图 rejection 反例；全量 check、ratchet、protected fast、lint、ledger 已通过，新增测试文件可收口）。
- [CODE-QUALITY-82 DATA.MKF 独立诊断脚本](CODE-QUALITY-82/README.md)（相对 checkout 路径、MKF 边界 fail-closed 与真实资源输出等价；已归档 done）。
- [CODE-QUALITY-83 game menu mode / stack](CODE-QUALITY-83/README.md)（menu-mode/menu-stack/menu-mode.test 逐文件核验；全套质量门通过，三条账本记录已验证并归档）。
- [战斗回合/结算边界返工](../tasks/TEST-GLM-GAME-TURN-BOUNDARIES-1.md#当前裁决2026-10-12)（2026-10-12撤回先前accept；原生反控报告、合法输入与阶段可达性待补）。
- [2026-10-11 residual 测试派发](TEST-DISPATCH-20261011.md)（ControlForm、ItemEffect、MenuBox 三包已由 Codex 独立验收并收口）。
- [ControlForm 残余合同](../tasks/evidence/TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1/)（1 合同、2 针反控，已收口）。
- [ItemEffect 残余合同](TEST-GLM-EDITOR-ITEM-EFFECT-RESIDUAL-1/README.md)（3 合同、3 针反控，已收口；puppet product-counter 保留）。
- [MenuBox 残余合同](TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1/README.md)（5 合同、5 针反控，已收口）。

## 历史交付入口

以下保留各批提交时的回执说明；当前验收状态以[任务总索引](../tasks/index.md)和对应卡最后一次 Codex 裁决为准，不能把旧回执中的“待验收”当作当前任务状态。

- [Game 大世界叠层测试性能修复](CI-GAME-OVERLAY-PERFORMANCE-1/README.md)（Codex有限维护；7反控、全包及受保护fast通过，覆盖/基准不变，新托管CI按推送HEAD另核）。
- [2026年10月8日有限合同派发](TEST-CONTRACT-BATCH-20261008/README.md)（三个 GLM 候选已由 Codex 在当前 main 独立复验；最终裁决见 [独立验收](TEST-CONTRACT-BATCH-20261008/codex-review.md)）。
- [炼蛊边界贡献候选](TEST-EDITOR-ALCHEMY-BOUNDARIES-1/README.md)、[脚本交互贡献候选](TEST-EDITOR-SCRIPT-INTERACTION-1/README.md)、[工程加载贡献候选](TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1/README.md)（原件保持历史候选身份；以共同目录的 Codex 当前版本复验为准）。
- [战斗宿主终局测试确定性与原子性](TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1/README.md)（独立accept；本地三道集成门通过，卡已归档；反控工具与原件保留）。
- [当前存档精简证据](TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/README.md)与[三审](TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/codex-review-r3.md)（r3独立accept；本地三道集成门通过，卡已归档；17针独立重放有效，不继续派发）。
- [当前作者命令表单引用与草稿合同](TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1/README.md)（独立accept；本地三道集成门通过，卡已归档；反控工具与原件保留）。
- [TEST-GAME-MEDIA-LIFECYCLE-1 交付证据](TEST-GAME-MEDIA-LIFECYCLE-1/README.md)（已集成 main；r3 媒体生命周期 7 合同、严格四态反控与污染判据探针；M3 产品缺陷另行登记）。
- [TEST-REFORGE-OPENING-IO-LIFECYCLE-1 交付证据](TEST-REFORGE-OPENING-IO-LIFECYCLE-1/README.md)（已集成 main；r3 标题读档 IO 3 合同、3 针反控与 8 条产品诊断；D-Q01-1 不夹修）。
- [TEST-REFORGE-BATTLE-PREVIEW-BINDING-1 交付证据](TEST-REFORGE-BATTLE-PREVIEW-BINDING-1/README.md)（已集成 main；r3 D-1 试打接线真实反例、污染判据与清理证明；产品修复另卡裁决）。
- [TEST-GLM-GAME-SHELL-BOOTSTRAP-1 交付证据](TEST-GLM-GAME-SHELL-BOOTSTRAP-1/README.md)（r1 候选：shell bootstrap 排重账 + syncShellAudio 战斗臂/SW 消息路由/persist 容忍/startRafLoop 帧链 6 新合同 + 6/6 三态反控 + U-1 swc.ready 拒绝悬空登记，待 Codex 验收）。
- [TEST-GLM-GAME-EVENT-STATE-OPCODES-1 交付证据](TEST-GLM-GAME-EVENT-STATE-OPCODES-1/README.md)（r1 候选：状态 opcode 臂级排重账（两轮 coverage 并集）+ 走位到达/清 pose/零距离/同场景 guard/onEnter goto/菱形回弹/稀疏写回 8 新合同 + 8/8 三态反控（复用已验收 r2 判据库），待 Codex 验收）。
- [TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 交付证据](coverage85-kimi-extract-migrate-r1/README.md)（已集成 main，Codex quality closure 见历史任务卡）：原始机账、反控件与生成器见 [coverage85-kimi-extract-migrate-r1/](coverage85-kimi-extract-migrate-r1)。
- [TEST-COVERAGE85-GLM-REFORGE-1 交付证据](TEST-COVERAGE85-GLM-REFORGE-1/README.md)（r5 三态反控、逐 fullName ledger 与 80.44% honest branch 账；覆盖率续跑未结束）。
- [TEST-GLM-GAME-EVENT-CONTROL-FLOW-1 交付证据](TEST-GLM-GAME-EVENT-CONTROL-FLOW-1/README.md)（r1 候选：事件控制流排重账 + fail-closed/0x7F 豁免 2 新合同 + 2/2 三态反控 + 全库 auto 0x7F 零可达数据面证据，待 Codex 验收）。
- [TEST-GLM-EDITOR-BATTLE-REGISTRY-1 交付证据](TEST-GLM-EDITOR-BATTLE-REGISTRY-1/README.md)（已集成 main；4 个注册/缺失回落/删帧守卫/深链同步合同与 4/4 三态反控）。
- [TEST-GLM-GAME-DIALOGUE-PAGINATION-1 交付证据](TEST-GLM-GAME-DIALOGUE-PAGINATION-1/README.md)（r1 候选：6 分页/等待键集合同 + 6/6 三态反控，待 Codex 验收）。
- [TEST-GLM-GAME-BATTLE-STATE-1 交付证据](TEST-GLM-GAME-BATTLE-STATE-1/README.md)（r1 候选：battle 状态机残余 10 合同 + 10/10 三态反控，待 Codex 验收）。
- [TEST-GLM-GAME-EVENT-CONTRACTS-1 交付证据](TEST-GLM-GAME-EVENT-CONTRACTS-1/README.md)（已集成 main，Codex quality closure 见历史任务卡）。
- [TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 交付证据](TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1/README.md)（r1 候选：6 装备效果层/applyAll/抗性边界合同 + 7/7 三态反控，待 Codex 验收）。
- [TEST-GLM-GAME-MENU-SAVE-IO-1 交付证据](TEST-GLM-GAME-MENU-SAVE-IO-1/README.md)（r1 候选：菜单输入锁/同帧取消/存档真链/坏导入/快存反馈 8 合同 + 8/8 三态反控 + U/B 账，待 Codex 验收）。
- [TEST-GLM-GAME-TURN-BOUNDARIES-1 交付证据](TEST-GLM-GAME-TURN-BOUNDARIES-1/README.md)（r1 候选：15 回合/结算合同 + 15/15 三态反控，待 Codex 验收）。
- [TEST-GLM-REFORGE-ASSET-RESOLVER-1 交付证据](TEST-GLM-REFORGE-ASSET-RESOLVER-1/README.md)（r1 候选：8 资源解析/缓存生命周期合同 + 7/7 三态反控，待 Codex 验收）。
- [TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 交付证据](TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1/README.md)（r1 候选：bgm/midi/readiness 6 生命周期残差合同 + 6/6 四态反控，待 Codex 验收）。
- [TEST-GLM-REFORGE-BATTLE-FLOW-1 交付证据](TEST-GLM-REFORGE-BATTLE-FLOW-1/README.md)（r1 候选：终局家族/宿主终局/会话残差 12 合同 + 12/12 四态反控 + U-1 零活敌 target 死区发现，待 Codex 验收）。
- [TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1 交付证据](TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1/README.md)（r1 饱和档案：五族排重账 + 三口径分支覆盖 + 候选解剖，零新增测试、零产品改动，待 Codex 独立验收）。
- [TEST-GLM-REFORGE-HOST-LIFECYCLE-1 交付证据](TEST-GLM-REFORGE-HOST-LIFECYCLE-1/README.md)（已集成 main，Codex quality closure 见历史任务卡）。
- [TEST-GLM-REFORGE-RUNTIME-SESSION-1 交付证据](TEST-GLM-REFORGE-RUNTIME-SESSION-1/README.md)（15 合同、反控 5/5、排重/非合同/受阻账与基线缺陷披露；待 Codex 独立验收）。
- [TEST-GLM-REFORGE-WORLD-LIFECYCLE-1 交付证据](TEST-GLM-REFORGE-WORLD-LIFECYCLE-1/README.md)（r1 候选：四家族排重后 4 残差合同 + 4/4 四态反控 + unreachable 登记，待 Codex 独立验收）。
- [TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1 交付证据](TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1/README.md)（r2 候选：7 文件排重账 + player-roles 2 新合同 + runner v2 严格反控（JSON reporter 判据/fullName 精确相等/执行集 identity/13 自测反例）+ 全包 417/417，待 Codex 二审）。
- [TEST-GLM-MIGRATE-ASSET-SUPPLY-1 交付证据](TEST-GLM-MIGRATE-ASSET-SUPPLY-1/README.md)（r1 候选：15 资产供应/所有权合同 + 13 针 identity 反控 + 合成 YJ2 特效链，待 Codex 二审）。
- [TEST-GLM-REFORGE-MOTION-TRANSITION-1 交付证据](TEST-GLM-REFORGE-MOTION-TRANSITION-1/README.md)（r2 候选：world-motion-runtime 3 残余合同 + identity artifact 严格反控 + 9 自测反例，待 Codex 二审）。
- [TEST-GLM-MIGRATE-PLAN-TRANSACTION-1 交付证据](TEST-GLM-MIGRATE-PLAN-TRANSACTION-1/README.md)（r1 候选：migration plan/transaction/write-plan 2 净新合同 + 2/2 identity 反控，待 Codex 验收）。
- [TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1 交付证据](TEST-GLM-REFORGE-BATTLE-CORE-SESSION-1/README.md)（r1 候选：battle core/session 排重后 6 残余合同（敌方施法三门/复活无保底/敌逃战果会计/AI 敌逃回执）+ identity TSV 全量反控 6/6 + 11 自测反例，待 Codex 独立验收）。
- [TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1 交付证据](TEST-GLM-REFORGE-MAIN-HOST-BOUNDARIES-1/README.md)（r1 候选：main 宿主编排排重后 5 残余合同（入场揭幕/触发脚本错误恢复/试打终局与错误回执/存档失败计数与队列）+ identity TSV 全量反控 5/5 + 11 自测反例 + D-1 `?battle-scene=` 投影死路缺陷披露，待 Codex 独立验收）。
