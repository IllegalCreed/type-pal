# TEST-CURSOR-CONTENT-PURE-WAVE-2 · Codex 首轮接收

候选 `codex/cursor-content-pure-wave-2@424ac428809041081a00998ef574c7da1e770ecd`，
起点 `8254ce64`。结论：**counter / rework**，只退回下面两处 C3 正控前提。

本人复跑 `vitest -t 'C[1-4] '`：16 文件有26项执行通过，其中候选18项；
content `tsc --noEmit` exit0；17新增代码文件 Biome零诊断；
`module-mutants.mjs` 的 c1–c4 对照绿、目标新例业务 `AssertionError` 红、源 hash 不变。
`git diff 8254ce64..424ac428` 只有测试、`__tests__` fixture、工具与回执，
无产品/旧测试/配置/基线改动。这些通过不能替代输入可达性判断。

1. **R1 — C3 成长非正次数是现行防御臂，不是业务残项。**
   `packages/content/src/rewards.ts:44-50` 的 `applyLevelGrowth` 会把 levels 钳为非负，
   但生产调用域仅有 `rewards.ts:215` 的常量 `1`、`item.ts:1110` 的已校验
   `eff.levels`、`packages/reforge/src/battle/battle-core.ts:2078` 的已校验物品效果。
   `packages/content/src/validate.ts:1010-1011` 明确要求 `levelUp.levels` 是正整数。
   候选 `rewards.cursor-pure-wave2.test.ts` 的 `0/-3/0.9` 无法从当前合法工程
   到达；c3 针恰改 `count=1`，因此虽红也不能证明现行业务。撤回该例的
   「当前剩余合同」归因及 c3 针；如需保留纯防御研究须隔离分类、不计本包贡献。
   c3 改选同组真正可达的单点业务反控，例如 `grantBattleRewards` 的死者
   hiddenCounts/存活门，并让候选已有真实回归自身变红。
2. **R2 — C3 物品使用正控的奖励引用未闭包。**
   `item.cursor-pure-wave2.test.ts` 只把 gourd 放进 `items` map，却令
   `drawFromResourcePool.rewards[0].itemId='reward'`。正式
   `packages/content/src/validate-refs.ts:1554-1562` 对每个资源池奖励检查
   `itemIds`，这里必产生 error「资源池奖励物品 reward 不在 items」。
   直接调用 `resolveWorldItemUse` 成功不等于项目可保存。给 reward 建真实
   物品记录，先通过现行 item 结构及引用闭包门，再断言相同资源池业务结果；
   不能改产品校验或把缺引用改称合法。

本轮不要求重写其它组、旧已核断言或负控；修正后请更新十六行账、最终命令与
候选 SHA，在原隔离分支交付。Codex 再独立接收；未接收前不执行全仓
`check → ratchet → strict-fast`，不合 main、不标 done。
