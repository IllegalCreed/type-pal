# extract font/bdf + scene + map 复审（glm-foundation 模块 3 批 3）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbbb5729ba8bc6525bd7ad2ad4bb425c02` 线
范围：`font/bdf-to-json.ts`（81）、`resources/scene.ts`（89）、`resources/map.ts`（70）。开工核对无 Owner 冲突；三文件出口均有活跃 cli.ts 消费（glyphsToJson/parseBdf@44、parseMap@696、dumpScene/dumpAllEventObjects@714-734）。

## 短回执

- **改动 1 处（仅注释）**：bdf 十六进制行解析的 `parseInt(hex,16) || 0` 补容错合同注释（短行/坏行降级 0 行，输入为仓库内置固定 Unifont；换不受信源须先收紧——归输入域候选族）。scene.ts/map.ts 复审零缺陷零改动。
- **验证**：body-invariance 三文件一致；定向 6 文件 **23/23**（bdf 两正式+glm、scene 两、map 含**真盘 MAP.MKF chunk1+GOP.MKF chunk1**；首跑 1 fail 为我 worktree 缺盘的环境失败，软链后全绿，两态如实记录）；scoped biome 0/0/0；diff --check 干净。未跑全仓门。

## 八维结论

| 维 | 结论要点 |
|---|---|
| A | bdf：STARTCHAR 状态机（ENCODING/BBX/BITMAP/ENDCHAR）边界自洽，codepoint>0 过滤，短 hex 容错（本批补注释）；输入域=内置 unifont-cn.bdf。scene：区间切法 [N.eventObjectIndex, N+1) + 末场景兜底、dumpScene 不存在即 throw、ip=0→undefined 合同与 shared 注释一致；**登记**：scenes 区间非单调时静默空场景（真实 SSS 由 io/sss 结构校验保证，O-2 族）。map：65536 字节固定尺寸守卫 throw、[row][col] u32 对读与 sdlpal Tiles[128][64][2] 一致、真盘 chunk1 实测通过。无新直接缺陷。 |
| B | 本批修 1 处（容错注释）。map 头注/调用约定（mapBytes 已解压/gopBytes raw）、scene 切法与 label 约定均准确。 |
| C/D | 三文件单向依赖（font 独立；scene←io/sss 类型；map←shared codec）；无重复知识。 |
| E | 23 例含真盘 oracle（map cells+tiles）、bdf 边界（boundaries 文件）、scene 切片/全局表双出口。 |
| F/G/H | 结构清楚；无死导出（全部 cli 消费）；纯字节/文本确定性 ✓。`substr` 为弃用 API 但行为等价、lint 未拦——不作变更（登记为 nit，不为美观改可执行字节）。 |

## 登记（不动）

bdf 不受信输入域收紧候选（同 O-2 族）；scene 区间非单调静默空场景候选；`substr`→`slice` 弃用 API nit（行为等价，不值一次可执行变更）。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
git -C "$WT" log --oneline 53db76bbb..HEAD -- packages/pal-extract/src/font packages/pal-extract/src/resources/scene.ts packages/pal-extract/src/resources/map.ts
node "$WT/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/prove-body-invariance.mjs" \
  --base 53db76bbbb5729ba8bc6525bd7ad2ad4bb425c02 packages/pal-extract/src/font/bdf-to-json.ts \
  packages/pal-extract/src/resources/scene.ts packages/pal-extract/src/resources/map.ts
cd "$WT/packages/pal-extract" && ../../node_modules/.bin/vitest run src/font src/resources/scene.test.ts src/resources/map.test.ts
# map 真盘用例需 data/raw/{MAP,GOP}.MKF 软链
```

失效条件：三文件实现变化 → 重证；Unifont BDF 更换 → bdf 容错域复核。
