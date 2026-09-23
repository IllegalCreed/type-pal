# TEST-BATTLE-WORKFLOWS-1 · 实施回执（GLM，r3 收窄返工）

任务卡：[TEST-BATTLE-WORKFLOWS-1](../ops/tasks/TEST-BATTLE-WORKFLOWS-1-session-flows.md)（r1 设计三签保持，
未重签）。r2 候选 b7ba48bb 被 Codex counter（[r2 独立复核](battle-workflows-r2-review.md)，C1～C4）；
本回执为 C1～C4 一次闭合后的 **r3 候选**。已修的原五反证、fixture 结构/路径、Biome 不重开；
不为凑数硬凑用例（34→39 为合同新增）。
Coding Owner：GLM。分支 `codex/glm-battle-workflows-r1`（合入主线 7f43b05b @22283e48）。
机账：[glm-battle-workflows-evidence.json](glm-battle-workflows-evidence.json)。

## 生产零改动（真四目标命令）

`git diff 57dda7ed..HEAD -- packages/reforge/src/battle/battle-session.ts packages/reforge/src/battle/battle-core.ts packages/reforge/src/battle/battle-anim.ts packages/reforge/src/battle/enemy-hook-runtime.ts` 输出为空。

## 交付（白名单内 9 代码文件 + 2 工具，39 项）

- 6 个测试文件：selection **10**（+2）/ round 6 / action 6 / script **8**（+3）/ terminal 4 / writeback 5 = **39**（r2 34 + 新增 5：投掷流、Esc 回退重选、hook 等待/选择恢复、召唤接线、变身接线）。
- 3 个 fixture 仍在 `packages/reforge/src/__tests__/battle-workflows/`；2 个工具同 r2 路径（mutants 重写判据）。

## C1｜写回完整结果与非目标保真

- **成长 8 字段全对账**：`真实成长写回` 测试断言 level/maxHP/maxMP/attack/**magicAttack**/defense/**speed**/**luck**
  全部 = before+delta（r2 漏验的 3 字段补齐）；负控针 `c1-growth-magicattack-skipped`（fixed 分支
  magicAttack 漏写）实测红。
- **限次技能移除**：`skillUse 写回` 现断言 `world.learnedSkills.p1` 由 `['wf-once']` → `[]`（满限真实移除），
  计数入账保持；旧证去重见下表。
- **HP 终值精确**（不再"减少且≥1"）：无伤一击胜利 → 写回**恰 100**；败（被一击打死）→ 写回**恰 0**
  （lost 分支允许 0，与胜/逃 ≥1 是不同分支）；多轮受击 → `100 − Σ(「e1 攻击 p1 造成 N」行)`，预期由
  战斗事件推导、非终值自证（HP 硬写任何别的数即红）。
- **≥1 钳制臂的调用域说明**：`writeBackHp` 的 `Math.max(p.hp,1)` 臂要求非 lost 相位且 `p.hp≤0`；
  公开驱动下 HP 归 0 即判负（走 lost 臂 `Math.max(p.hp,0)`），该输入不可达——按 C3 规则以调用域反证
  交 Codex 裁定，不冒称已验证该边界。
- **非目标保真正控**：world 队伍含**未参战的 p2**、money=77、库存非空；成长写回后除 p1 的 8 字段外
  整个 world 深快照相等（`expect(world).toEqual(expected)`，p2/money/库存/learnedSkills 全保真）。
- **奖励后保留**：首次写回后入账 `exp+=50`、`money+=99`（模拟结算奖励），二次写回保留奖励且成长
  不重复叠加（旧证另见去重表）。
- **标题/断言错位修正**：r2 '默认攻击…敌 HP 真实下降' 实读的是我方被反击 HP——已改名
  '…我方行动与敌反击真实发生（行动者按行首区分）'，敌 HP 归零的死亡证明由 W3 一击致胜用例承担。

## C2｜敌 hook 后续行动与失败清理

- **行动者以行首前缀判定**：敌 ready hook 测试现断言 `ready-hook ` 开头的敌行动行 + `debugPlayers()`
  HP 实际下降（r2 的子串匹配会把"我方攻击该敌"误当敌已行动；拿走敌行动队列的变异现可检出）。
  本批全部我方/敌方行过滤器统一为 `startsWith('<actorId> ')`。
- **finally 消费实际 pending**：`prepareTurnSounds` 回调返回的**同一个 Promise** 被保存；finally 先
  `gate.resolve()` 再 `await pending`（body 已抛错时吞 pending 拒绝以**保留最初断言错误**，无 body
  错误时透传 pending 拒绝）——不再只放行不消费，断言失败不留悬挂 Promise。
- **cancel 完整性**：取消+迟到放行+后续 tick 后，除 phase 停留外断言 `debugLog()` 与 `debugPlayers()`
  快照**逐项相等**（零日志增长、零状态变化）。
- **敌 hook 等待/选择恢复（W4 原合同）**：新测试 `敌 hook 等待与选择恢复`——turnStart hook 带
  `wait 400ms`，等待窗口内连按确认零提交（log 零 `p1 ` 行、尾音未播），时间推过后 hook 完成、
  菜单恢复可继续提交攻击。

## C3｜原六组合同补齐与准确去重

**新增实现**（新测试，标题可直接定位）：

| 合同项 | 新测试 | 关键断言 |
|---|---|---|
| W1 投掷有效选择 | `投掷：W 直开投掷列表→选目标→提交，敌真实受伤害且库存恰耗一件` | `p1 投掷…受到 N 伤害` 行 + writeBackInventory 2→1 |
| W1 回退后重选（一次代价） | `Esc 回退上一队员重选：p1 已交 cast 被撤回…` | readiness 快照 2×attack 且无 cast；MP 保持 40 |
| W4 敌 hook 等待/选择恢复 | `敌 hook 等待与选择恢复…` | wait 期间零提交；完成后可继续 |
| W3 召唤接线 | `敌 hook effect 召唤接线…` | `minion ` 开头行动行 + 我方 HP 实降（auto 推进回合） |
| W3 变身接线 | `敌 hook effect 变身接线…` | `boss-true ` 开头行动行、旧 id 不再作为行动者 |
| W5 逃跑零奖励 | playerFled 用例加 `settlementCalls===0` | 非胜利零结算 |
| W5 末屏精确 | 多屏用例改为第三屏放行后 `probe==='done'`（无 finish 循环兜底） | 第三屏即最后一屏；`settlementCalls===1` |

**旧标题去重**（未重复实现的已签项，确切标题+源码位置+实际断言）：

| 合同项 | 旧证据（标题 @ file:line） | 该证据实际断言 |
|---|---|---|
| W5 enemyFled 经真实行为到达 | `fleeBattle 立即播放逃跑演出，但当前 hook closure 排净后才结算` @ battle-session.test.ts:1405 | `:1424` `done` resolve `'enemyFled'`（fleeBattle hook 真实驱动） |
| W5 terminated 经真实行为到达+无奖励 | `endBattle terminate:choreography 撑到 turn → 战斗终止无奖励(林天南 7 回合)` @ battle-session.test.ts:1284 | `:1314` `done` resolve `'terminated'`（非 cancel AbortError） |
| W5 playerFled 零奖励 | `玩家逃跑成功返回 playerFled，且不进入胜利结算` @ battle-session.test.ts:1213 | 逃跑不进胜利结算 |
| W5 defeat 零奖励 | `endBattle lost 返回 defeat，且不进入胜利结算` @ battle-session.test.ts:1258 | 败不进胜利结算 |
| W1 coop 有效选择（会话级） | `合击消费其余队员后仍先冻结完整动作快照，再进入行动` @ battle-session.test.ts:690 | 快照 `{0: coop, 1: attack}`——其余队员被消费、快照先冻结 |
| W1/W2 coop 无效降级 | `healthy≤1 → 退化普攻(不扣合击 HP 代价)` @ battle-core.test.ts:2790 | 无效合击退化普攻零 HP 代价 |
| W1 投掷无效选择 | `世界专用用途与非法投掷在扣库存前拒绝；大蒜战斗毒抗有真实消费方` @ battle-core.test.ts:1064 | 非法投掷在扣库存前拒绝 |
| W6 skillUse 满限移除（旧证） | `skillUse mutation 写回：计数持久化 + 满限从 learnedSkills 移除` @ battle-session.test.ts:1704 | 满限从 learnedSkills 移除（r3 本包亦补自身断言） |
| W6 奖励后保留（旧证） | `成长与明雷感知只写回一次，不覆盖随后发生的战后奖励` @ battle-session.test.ts:1629 | 二次写回不覆盖战后奖励（r3 本包亦补自身断言） |
| W3 summon core 语义 | `summon 只填当前上限内空槽，count 非正归 1，且不足时不部分写入` @ battle-enemy-confused.test.ts:263 | 空槽填充/上限语义 |
| W3 变身演出帧合同 | `变身现形:旧图 colorShift 0→5 六帧染白 → 72帧 dither 过渡至新图` @ battle-anim.test.ts:508 | 变身帧形制（数值/帧专项） |
| W4 hook runtime 等待推进 | `continue 同 activation 执行，advance 只在结束时提交 cursor` @ enemy-hook-runtime.test.ts:51 | runtime 级 cursor/等待推进 |

## C4｜判据精确化、入口 guard 与回执纠正

- **工具判据**（[glm-battle-workflows-mutants.mjs](glm-battle-workflows-mutants.mjs) 重写）：
  - 钉名目标 = **正控实跑解析出的唯一 fullName**（转义+`^$` 锚定传 `-t`），验证 failed 项 fullName
    **精确相等**（同 leaf 后缀的异 suite 拒收）；
  - 文件身份 = **规范绝对路径全等**（同后缀无关项目文件拒收）；
  - `MUTATION_HIT:<needle>` 带针身份：本针 marker 必须出现、不得出现他针 marker；
  - 混错拒绝：套件级 message 非空、失败项 ≠1、执行项 ≠1、log 含 Unhandled 错误；
  - timeout 扫**全部行**（首行业务断言+后续 `Test timed out` 亦拒）；
  - 判据自测走**真实 judge 入口**，覆盖 r2 反证矩阵全部 7 类构造；
  - 正控兼 fullName 解析逐组实跑；单针模式只报实际跑过的组数（`1 controls (of 6)`），不虚称 6 组。
- **入口 guard**：守卫移到 `makeWfSession`/`makeWfSessionFromWorld` 会话入口，对**每次实际消费**的
  敌定义（含 hook 改造后）/技能/物品/enemiesById/演员数据跑现行生产校验器；不再以"每文件首组样本
  guard 测试"冒充（该声明已从 r2 回执勘误）。`守卫门非装饰` 测试改为负向：破坏敌定义/技能定义时
  驱动器确实 throw。
- **as-unknown 声明收窄**：机账"无 as-unknown 强转"改为"**业务 fixture 无绕 guard 强转**"；
  `controlled-io.ts` 3 处声音/字库/调色板 **外部 IO 替身**的 `as unknown` 按原卡薄 IO 替身条款保留。

## 负控（6 正控 + 10 针，全部业务红）

10 针 = r2 9 针 + 新增 `c1-growth-magicattack-skipped`（fixed 成长分支 magicAttack 漏写，多行唯一锚）。
最终树复跑 **6 正控 green + 10 针 detected**，rc=0（证据目录 `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/bw1-mutants-JpR04b/`，
含每针 config/log/json 与 summary）。HP 硬写与 learnedSkills 移除跳过两个方向由精确值/移除断言覆盖
（未加针以守 6～10 针带上限；Codex 可按同法单点复现）。

## 验证总账（最终树）

- 定向 6 文件 **39/39**；相邻 `src/battle/` 19 文件 **272/272**；全 reforge **158 文件 1453/1453**
  （合入主线 7f43b05b 后基线；本批 6 文件 39 项 = r2 34 + 新增 5）；TC rc=0；Biome 10 代码/工具文件
  format+check rc0；负控 6+10 rc0。
- 覆盖率同口径 before/after 见机账（输出仅 /tmp，不入仓）。

## 剩余与归属

- session render 段（~189 行）仍归视觉/渲染侧；组合状态/anim 演出臂/hook 剩余保留分母。
- `writeBackHp` 非 lost 相位且 HP≤0 的钳制臂公开不可达（见 C1 调用域说明），交 Codex 裁定记录。
- Codex r1/r2 冻结见证工具（锚旧树路径）零改动；r2 见证对 r3 需其自行适配复核。
