# TEST-BATTLE-WORKFLOWS-1 · 实施回执（GLM，r1）

任务卡：[TEST-BATTLE-WORKFLOWS-1](../ops/tasks/TEST-BATTLE-WORKFLOWS-1-session-flows.md)（r1，build allowed @4872b017）。
Coding Owner：GLM。分支 `codex/glm-battle-workflows-r1`（worktree `/Users/zhangxu/illegal/type-pal-glm-battle`，
基点 `4872b017`）；生产冻结 `57dda7ed`——`git diff 57dda7ed..HEAD -- packages/reforge/src/battle/ packages/reforge/src/main.ts` 为空（四目标零产品改动）。
机账：[glm-battle-workflows-evidence.json](glm-battle-workflows-evidence.json)。

## 交付（W1～W6 六组连续，白名单内）

6 个新测试 + 3 薄 fixture + 2 工具，**31 项**（W1 选 7/W2 轮 5/W3 执行 6/W4 屏障 4/W5 终态 4/W6 写回 5）：

| 组 | 新增业务断言（代表） | 旧证据差异 |
|---|---|---|
| W1 | 默认攻击两键提交离开菜单；技能/物品菜单合法提交；Esc 取消换招零多余提交；两队员接力；无可法术提示不崩 | 旧「最后一件消耗品」只证 E 键轴；本组为组合选择/取消/接力 |
| W2 | A 持续自动多轮到终态、Esc 退出恢复手动；F 本轮不残留；R 重复 cast 后 MP 耗尽降级、目标消失换存活敌 | 旧「R 重复」只证正常重复；本组证降级与残留边界 |
| W3 | 一击致死经真 core 到 over；施法进入/离开 acting 时间线；prepareTurnSounds 拍到真实提交集合；MP 耗尽二轮不重复扣；sfx 记录器收到真实 AssetId | 旧 core/anim 专项证数值/帧；本组只证**接线**（选择→执行→完成信号） |
| W4 | 屏障挂起 pending 期间输入零提交（phase 停 preparing）、放行后真实回菜单；SfxReadinessResourceError 降级仍到终态；屏障放行后敌行动可见（HP 下降）；多轮屏障重拍 | 旧 readiness 十项证屏障基础；本组为钩子+下一动作组合 |
| W5 | victory 真实到达、settlement 恰一次（done 后断言）；非胜利零 settlement；Q 逃跑 playerFled；多屏 300ms 边界（<300ms 空格 done 仍 pending）+ 全放完 resolve victory | 旧逃跑 16 帧/无奖励保持；本组新增结算多屏与边界 |
| W6 | writeBackInventory 覆写同 itemId 计数/未持有保留/count 0 全清；writeBackPersistentEffects 二次调用幂等+party 外字段不变；空会话深快照不变 | 旧成长/skillUse 案例保留；本组为写回组合与幂等门 |

**观测纪律**：全部经公开 `tick(dt,pressed,now)`/`debugLog`/`debugReadiness`/`debugPlayers`/`done`/`writeBackInventory`/`writeBackPersistentEffects`；无任何私有成员反射/mock 核心/视觉操作。异步屏障用 entered+微任务冲洗+同步 phase 观察（不 await 永不 settle 的 promise、不用超时判红）；done 竞速上限 30-50ms 仅作 pending 见证，负控判据不依赖它。

## 负控（6 正控 + 7 针，全部业务红）

[工具](glm-battle-workflows-mutants.mjs)：每针唯一源码替换点、`MUTATION_HIT` 实际进入、`-t` 精确钉名（同文件其余项 skipped 不计执行）、每针恰 1 项执行且自身 AssertionError 首行、产品 hash 前后不变。最终树复跑 **6 正控 green + 7 针 detected**（`/tmp/bw1-mutants5.out`，证据 `/var/folders/.../bw1-mutants-sNY3xw/`）：

| 针 | 唯一替换点 | 钉名目标 |
|---|---|---|
| w1-menu-input-swallowed | `if (this.ui === 'menu') {` → `if (false) {` | W1 默认攻击（提交后不得停留菜单） |
| w3-ui-never-over | `this.ui = 'over'` → `'menu'` | W3 一击致死（终态必须可达） |
| w4-preparing-unlock | `if (this.ui === 'preparing') return` → 按键穿透切 menu | W4 挂起零提交 |
| w5-settlement-rebuilt | `&& this.settlement === null) {` → 每 tick 重建 | W5 settlement 恰一次（done 后断言） |
| w5-early-done | `this.overTimer >= 300` → `>= 0` | W5 300ms 边界（提前空格 done 须仍 pending） |
| w6-inventory-overwrite-skip | `if (w) w.count = s.count` → 不覆写 | W6 覆写计数 |
| w6-zero-clear-removed | 清项循环头 → no-op | W6 count 0 清项 |

**W2 针如实说明**：F/R 跨轮残留方向未找到唯一单点（`stickyForce = false` 出现 2 处非唯一；按卡面「不硬造放行」放弃拼凑变异），该方向由 W2 五项断言覆盖（F 不残留/R 降级/目标消失换向），负控针数 7 在 6～10 带内。

## 同口径覆盖（官方 fast 选择，输出仅 /tmp）

[配置](glm-battle-workflows-coverage.config.mts)：官方 `testSelection(reforge,'fast')` 与生产 include 全量复用；before 仅排除本批 6 文件。`/tmp/type-pal-bw1-cov/{before,after}` 双 exit0，before 1378/after 1409（恰 +31）：

| 目标 | 行 before→after/总 | 分支 | 函数 |
|---|---|---|---|
| battle-session.ts | 880→887/1331 | 761→775/1457 | 138→140/181 |
| battle-core.ts | 1037→1037/1140 | 977→978/1183 | 114→114/118 |
| battle-anim.ts | 316→316/402 | 220→220/318 | 42→42/54 |
| enemy-hook-runtime.ts | 50→50/58 | 40→40/53 | 5→5/5 |

净增 **+7L/+15B/+2F**（session 主导 +7L/+14B/+2F，core +1B）。**如实声明**：本批价值在连续组合回归与接线证明，非大批新行——session 大部分遗漏行在 render 入口后（计划已分离 189 行 render 剩余）及本批未覆盖的组合状态；剩余缺口（session ~444L/~682B、anim 86L/98B、hook 8L/13B）保留分母，不虚报为已覆盖，也不宣称 whole-file 95/90 达成。

## 验证总账（最终树）

- 定向 31/31（6 文件）；相邻 `src/battle/` 全目录 19 文件 264/264；全 reforge 包 **152 文件/1409 项全绿**（`/tmp/bw1-full-reforge.log`，FULL_RC=0）。
- `pnpm --filter @type-pal/reforge typecheck` rc=0（修直 fixture 相对导入与隐式 any 后归零）。
- 11 个新增代码文件 + 2 工具 Biome format+check rc=0。
- 修复记录（不省略）：① 首版 fixture 导入深度错（`../../battle-core` 应为 `../../battle-core` 三级 vs 二级混淆）与 `CreatePlayerInput` 导入源错（battle-player-input 本地类型 → 改从 battle-core 导出位）；② 隐式 any 参数 4 处；③ W6 误断言 `world.flags`（WorldState 无该字段 → 改比 `world.script`）；④ W5 settlement-once 断言原放在 poll 后即查，检不出每-tick 重建变异 → 移到 done 后；⑤ mutants 首版 `-t` 过滤被 config 内 testNamePattern 覆盖 + skipped 计入 executed → 修正语义；⑥ 首版 7 针中 4 针为无鉴别力拼凑（MISSED/invalid）→ 按唯一替换点+钉名目标重设计为 7 针全 detected，W2 方向如实放弃单点。

## 剩余与归属

- session render 段（~189 行）归视觉/渲染侧，本卡不碰；组合状态遗漏继续保留，不判不可达。
- 敌 hook-runtime 8L/13B 剩余与 anim 演出臂未覆盖——后续按现行消费者细分，不在本卡硬刷。
- 无产品疑点发现；无未决政策新增。旧版本兼容审查：pass——零产品改动、无兼容层。
