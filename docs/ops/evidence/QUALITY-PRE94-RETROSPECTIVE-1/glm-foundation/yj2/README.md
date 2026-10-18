# CODE2b YJ2 两文件复审（glm-foundation 批 3）

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `63735f72fb12f6ca27bb3a3443418dd808b101cf`（同一 foundation worktree 线）
范围：`packages/shared/src/yj2.ts`、`yj2.boundaries.test.ts`。开工核对：无他人 Owner/未提交修改。

## 短回执

- **改动**：仅注释 1 处——boundaries 头部 `yj2.ts:8-20` 脆弱行号引用改为"yj2.ts 模块头"（与前两批同类修正一致）。零实现/fixture/断言/标题变化（body-invariance 两文件一致）。
- **验证**：定向 4 文件 **41/41**（yj2.boundaries 9 + rng 6 + rng.boundaries 17 + rle.glm-o 9 作 YJ2 消费方相邻，0 fail/pending，[directed.json](directed.json)）；scoped biome 0/0/0；diff --check 干净。未跑 extract io/yj2 相邻（worktree 依赖软链登记项）、全仓/coverage/protected。

## 八维结论

| 维 | yj2.ts（211 行） | yj2.boundaries.test.ts（9 例） |
|---|---|---|
| A | 1:1 移植（yj1.c::YJ2_Decompress，Win95 分支锚 global.c:202）；CODE2b 原生 SDL 2,626 段 / 34,367,608B 逐字节一致为既有 A 维证据（版本适用：本批 body-invariance 证明源未变）。边界：源 <4 拒绝、bt() 位流越界显式失败、回引 preStart<0 与 len>剩余双守卫、提前 EOS 零填充语义。无新直接缺陷。 | 头错误三轴单例；字面/回引向量期望值由符号语义推导（fixture 注释记录初始树路径推导，非解码器回算）；malformed 回引（缩 uncompLen）与空窗口回引反例在。 |
| B | 模块头文件头/树/符号语义与实现逐项吻合（CODE2b 已全文核对）；biome-ignore 的 16 列表注释说明镜像 sdlpal 来源。本批无需修改。 | 本批修 1 处（行号引用）。"树归约(0x8000)合成向量仍待证、不作绿色宣称"的诚实登记保留。 |
| C | 纯函数；树/输出数组均为每次调用新建，无模块级状态。 | fixture 向量共享自 glm-foundation-fixtures（冻结晶向量，CODE2b 判定向量）。 |
| D | 唯一实现；consumers：shared/rng、extract io/yj2 re-export 及测试；与 mkf/rle 无重复知识。 | 与 rle.glm-o 的 YJ2 例已由 CODE2b 精简（13→9 承接），现存无重复合同。 |
| E | — | `attempt<2` 双次调用证明模块无跨调用状态（当前实现树为局部，防御未来模块级缓存）；保留。 |
| F/G/H | 命名/结构清楚；无死代码（YJ2_DATA1/2、Tree、adjustTree 全用）；确定性纯字节可直接测 ✓。 | 同。 |

## 问题与登记（不动）

- **O-5（新登记，归输入域候选族）**：`uncompLen` 直接来自输入 u32，`new Uint8Array(uncompLen)` 在腐蚀头上可先尝试 ~4GB 分配（与 RLE O-1 同族）。当前 caller 域=原盘/生成数据（CODE2b 全量一致），无不受信输入证据；如未来接作者/外部输入需加上限。不修。
- 树归约独立合成向量：维持 CODE2b 的 pending 登记。
- ledger 建议：两文件维持既有登记；yj2.boundaries 已是 review 状态，B 维修正后随 CODE2b 整卡由 Codex 裁定。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
git -C "$WT" log --oneline 63735f72f..HEAD -- packages/shared/src/yj2.ts packages/shared/src/yj2.boundaries.test.ts
node "$WT/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/prove-body-invariance.mjs" \
  --base 63735f72fb12f6ca27bb3a3443418dd808b101cf packages/shared/src/yj2.ts packages/shared/src/yj2.boundaries.test.ts
cd "$WT/packages/shared" && ../../node_modules/.bin/vitest run src/yj2.boundaries.test.ts src/rng.test.ts src/rng.boundaries.test.ts src/rle.glm-o.test.ts
```

失效条件：yj2 两文件实现/断言变化 → 重证；CODE2b 原生比对证据在输入域或 yj1.c 参考变化时需重估；基点后 3y 新提交 → rebase。
