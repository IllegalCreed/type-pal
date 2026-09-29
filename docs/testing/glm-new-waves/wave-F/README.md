# Wave F — 编辑器主工作台与预览（TEST-GLM-NEW-F-1 证据目录）

GLM Wave F 的回执、反控判据与隔离视觉宿主。任务卡
[TEST-GLM-NEW-F-1-editor-shell](../../../ops/tasks/TEST-GLM-NEW-F-1-editor-shell.md)；
冻结目标与本 wave 定位见[父 README](../README.md)（父目录导航由 Codex 维护）。
候选/登记 SHA 与逐组旧证→新差异见 [receipt.md](receipt.md)。

## 本目录索引

| 路径 | 内容 |
|---|---|
| [receipt.md](receipt.md) | 交付回执：12 源逐组旧证→新差异、门禁结果、四针反控记录（含自测）、视觉证据 SHA256、未证边界、候选 SHA 登记 |
| [needle-judge.mjs](needle-judge.mjs) | 反控判据 r2：唯一注入、恰 exit1、绝对 file/精确 fullName/failed=1/executed 一致/skipped=0/timeout/exit2/产品 hash，任何路径 finally 清理临时针；`--selftest` 七场景反例自测 |
| [browser-host/](browser-host/) | 端口 6091 隔离功能视觉宿主：`vite.config.mts` + `index.html` + `host.tsx`（CanonicalScriptBodyEditor + BattleSpriteUploader）+ `drive-f.mjs`（playwright chrome 驱动）+ `evidence-browser-f.json` |
| [evidence/vitest-final.json](evidence/vitest-final.json) | 全部 10 个新测文件的新鲜 Vitest JSON（file/fullName/status；22/22） |

## 对应生产源与新测

| 组 | 冻结源 | 新测 |
|---|---|---|
| F01 | `packages/editor/src/ui/App.tsx` + `ScriptEditor.tsx` | `src/ui/App.glm-next-wave.test.tsx` |
| F02 | `packages/editor/src/ui/PreviewCanvas.tsx` + `FrameAnimationEditor.tsx` | `src/ui/PreviewCanvas.glm-next-wave.test.tsx`、`src/ui/FrameAnimationEditor.glm-next-wave.test.tsx` |
| F03 | `packages/editor/src/design-lab/DesignLab.tsx` + `packages/editor/src/ui/ActorMode.tsx` | `src/design-lab/DesignLab.glm-next-wave.test.tsx`、`src/ui/ActorMode.glm-next-wave.test.tsx` |
| F04 | `packages/editor/src/ui/BattleSpriteUploader.tsx` + `SpriteFrameWorkbench.tsx` | `src/ui/BattleSpriteUploader.glm-next-wave.test.tsx`、`src/ui/SpriteFrameWorkbench.glm-next-wave.test.tsx` |
| F05 | `packages/editor/src/ui/BattleSimulatorWorkbench.tsx` + `packages/editor/src/core/battle-trial-launch.ts` | `src/core/battle-trial-launch.glm-next-wave.test.ts` |
| F06 | `packages/editor/src/core/battle-sprite-commands.ts` + `sprite-commands.ts` | `src/core/battle-sprite-commands.glm-next-wave.test.ts`、`src/core/sprite-commands.glm-next-wave.test.ts` |

专属 fixture：`packages/editor/src/__tests__/glm-next-wave/F/app-script-kit.tsx`（F01 App 挂载底座）。
截图（/tmp/type-pal-glm-new-wave/F/）的 SHA256 与核验记录在 receipt.md 视觉节。
