# CODE2 RNG 三文件复审（glm-foundation 批 2）

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `63735f72fb12f6ca27bb3a3443418dd808b101cf`（承接 MKF 批后的同一 worktree 线）
范围：`packages/shared/src/rng.ts`、`rng.test.ts`、`rng.boundaries.test.ts`。开工核对：无他人 RNG Owner/未提交修改（rng.boundaries 在 ledger 为 review，属本批范围）。

## 短回执

- **改动**：仅注释 2 处——①rng.ts `decodeRngFrames` 的 `catch { continue }` 补宽容策略注释（坏 YJ2 sub-chunk 跳帧、index 留空档、surface/后续帧不受影响；CODE2 期 1,464 帧原生比对无此路径命中）②rng.boundaries 头部"rng.ts:19-35 opcode 表"错误引用（实际指向守卫函数且行号漂移）改为"rngBlitDelta docblock 的 opcode 表"。零实现/fixture/断言/标题变化（titles 8/24 不变，body-invariance 三文件一致）。
- **验证**：定向 `rng.test + rng.boundaries + mkf.boundaries` 3 文件 **34/34**（6+17+11，0 fail/pending/todo，[directed.json](directed.json)）；scoped biome 0/0/0；diff --check 干净。未跑 extract rng-frames 相邻（同 MKF 批登记的 worktree 依赖软链问题）、全仓/coverage/protected。
- **勘误（本批内修正）**：MKF 批 README 将 mkf.boundaries 例数误写为 10，实际 **11**（openMkf 头合同 8 + readChunk 边界 3）；本次提交内已改正，34 计数不受影响。

## 八维结论

| 维 | rng.ts（222→227 行） | rng.test.ts（6 例）/ rng.boundaries.test.ts（17 例） |
|---|---|---|
| A | 每个 opcode 写前双重守卫（requirePayload/requireSurface），unknown throw 早失败；0x01/0x05 在 sdlpal 无 case（已注明）。decodeRngFrames 空 chunk→[]、坏 YJ2 跳帧、pixels=surface.slice() 拷贝。opcode 语义本批抽查 rngplay.c：0x00/0x13@190-191、0x03@201、0x0b@273、0x12@346 与 docblock 表一致；0x0b 的 C 列换行算术在 pitch=320 下与线性写等价（CODE2 原生 1,464 帧逐像素一致实证，不另立 pitch 断言）。无新直接缺陷。 | 34 例逐例核输入/oracle：expectExact 同时证 [from,to) 精确值与两侧未触字节全 MARK（强判别）；族补齐（0x07-0x0a/0x0e-0x10）、跨字节宽度（0x01FF/0x0100）、0x13 后忽略尾字节、拷贝语义反证（帧0 在帧1 后不变）、坏 YJ2 跳帧不中断。截断/越界单轴分组合理（同错误模板成组）。 |
| B | 本批修 2 处（见短回执）。模块头锚 rngplay.c:27-137/139-369 与实际 28/140 起始差 1 行（C 返回类型行），语义范围正确，不改。RngFrame.index"=原 per-frame PNG frame index"与空档语义由测试钉住。 | 两文件头部分工声明与实际互补关系一致；boundaries 错误行号引用已修。 |
| C | 纯函数链 rng→{mkf,yj2}，方向正确；surface 唯一写者=rngBlitDelta 循环内，decodeRngFrames 独占生命周期。 | 局部 helper（surface/expectExact）无跨例状态。 |
| D | 唯一实现；consumers：migrate pal-assets(decodeRngFrames)、game rng-player、extract rng-frames（经 shared，rng.test 头部已注明）；YJ2 复用 yj2.ts 不重复解压逻辑。 | CODE2 B 段已退役 rng.test 弱子集 delta 例（7→6）；现存 6+17 无重复合同（0x06/0x0d/0x00 基础例在 rng.test，族扩展与 ownership 在 boundaries，互补）。 |
| E | — | 均原子、独立 oracle、合法输入；无 mock。 |
| F | switch 按 opcode 族分组清晰；守卫函数命名达意。 | 同。 |
| G | 无死代码；RNG_WIDTH/HEIGHT 有 caller；两个 require helper 全程使用。 | helper 在用。 |
| H | 纯字节/确定性 ✓。 | 全屏 surface 构造成本可忽略，直接可测 ✓。 |

## 问题与登记

- 无新已证缺陷。登记（不动）：rngplay.c 行号锚 ±1 行（返回类型行归属，不改）；extract rng-frames 真实原盘相邻未跑（worktree 依赖软链问题，见 MKF 批登记；CODE2 期原生 1,464 帧比对为既有 A 维证据，版本适用性由 body-invariance 保证同源）。
- ledger 建议：rng.ts/rng.test.ts 维持既有登记；rng.boundaries.test.ts 已是 review，本批 B 维修正后可由 Codex 裁定是否随 CODE2 整卡处理。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
git -C "$WT" log --oneline 63735f72f..HEAD -- packages/shared/src/rng.ts packages/shared/src/rng.test.ts packages/shared/src/rng.boundaries.test.ts
node "$WT/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/prove-body-invariance.mjs" \
  --base 63735f72fb12f6ca27bb3a3443418dd808b101cf packages/shared/src/rng.ts packages/shared/src/rng.test.ts packages/shared/src/rng.boundaries.test.ts
cd "$WT/packages/shared" && ../../node_modules/.bin/vitest run src/rng.test.ts src/rng.boundaries.test.ts src/mkf.boundaries.test.ts
```

失效条件：rng 三文件实现/断言变化 → 重证；基点后 3y 对这些文件新提交 → rebase；CODE2 原生比对证据在 yj2/mkf 依赖变化时需重估。


## Codex阶段1接收说明（2026-10-18）

有限文案/身份保持证据已接收，非整文件或整卡八维accept；作者历史原文与native保持。集成注释纠正、证据适用范围及旧撤回状态校正见[阶段终验](../codex-stage1.json)。仅原生JSON支持计数/身份；本批未附的console/scoped静态原始输出保留作者自报层级，不写成独立零诊断。
