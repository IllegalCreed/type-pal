# game assets png + rle-decode 复审（glm-foundation 模块 4 批 2 · assets 家族收口）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线（body 基准=game 批1提交后 HEAD）
范围：`game/src/assets/png.ts`（49）、`rle-decode.ts`（19）。批 1+2 合计覆盖 assets 全部 5 个生产文件。

## 短回执

- **改动 0 处**：两文件复审零缺陷。png.ts 的 cause 包装失败传播、finally 中 `bitmap.close()` 资源清理、R+A 双通道提取（M3.5 opaque 修复的运行时半边,与 pal-extract 写盘半边合同对齐）均成立;rle-decode.ts 在 shared RLE 批已核（借用视图/前缀分域说明仍准确,RGM/BALL 确走 PNG）。
- **验证**：body-invariance 两文件一致（零编辑恒真）;定向 4 文件 **10 套件 12/12、0 failed-suites**（png 三合同 + rle-decode）;scoped biome 0/0/0;diff --check 干净。未跑 game 全包/全仓门。

## 八维结论

| 维 | 结论要点 |
|---|---|
| A | decodePngToIndices:createImageBitmap 失败 cause 链式包装、2d context 缺失显式 throw、bitmap.close() 在 finally（成功/失败均释放）;索引/透明双平面长度守恒。rle-decode:re-export + base64ToBytes(atob,charCode 往返),空串快路径。无缺陷。 |
| B | png.ts 头部 RGBA 运输合同（R=G=B=index,A=opaque mask）与 M3.5 修复史完整准确;rle-decode 头部"RGM/BALL 已走 PNG"与 cli 现状一致（extract 批核）。零修改。 |
| C/D | png→canvas API 边界集中;rle-decode 为 shared codec 唯一 game 侧入口,无重复解码。 |
| E | 12 例:png 魔数/通道/cause 身份（grok-r1 家族,3h 期判别力已核,源未变复用）+ rle-decode 前缀矩阵。 |
| F/G/H | 49/19 行小而清楚;出口全消费;异步边界单一可 mock,纯转换可直测 ✓。 |

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/assets/png.test.ts src/assets/png-decode.grok-r1.test.ts \
  src/assets/png.glm-phase1-leaves.test.ts src/assets/rle-decode.test.ts
```

失效条件:两文件实现变化 → 重测;pal-extract PNG 运输合同变化 → png.ts 头部复核。
