# ARCH-REGRESSION-LAB-GLM-1 r7 独立接收

2026-09-26；候选内容 `9a197825`，登记树 `fb251df8`。结论：**counter，隔离候选暂不转正**；任务保持 `draft`，不计入官方覆盖率、不合入产品或正式测试。GLM 是候选贡献者，以下是 Codex 独立复核。

## 机械复跑

- `33df9378..fb251df8` 的 candidates/fixtures 有 11 文件、`+597/-191`，本轮确有真实测试改动。候选工作树干净，HEAD 与远端一致。
- 新鲜 JSON 写入 `/tmp/codex-glm-r7-candidates.json`：32/32；`tools/verify.mjs` 对该 JSON PASS，40 条账为 38 candidate-green / 1 existing-proof / 1 blocked-environment；`tools/red-control.mjs` 为 `detected`，exit1、1 执行、AssertionError、产品 hash 未变。`tsc --project configs/tsconfig.json --noEmit`、`node scripts/docs/check.mjs`、`git diff --check` 均 exit0。
- **目录 Biome exit1**：最终提交树中的 `configs/candidates-exec.json` 是未格式化的一行 JSON；独立运行 `pnpm exec biome check docs/testing/glm-architecture-regression-lab` 报该文件 formatter 错。GLM 回执声称目录 Biome exit0 与最终树不符。新鲜执行 JSON 应放临时目录，或在提交前格式化并重新核验。
- 六张旧视觉截图由 verify 核完整 SHA；本轮未重拍，也不能据此将 V01–V04 未执行矩阵视作已证。

## 逐组裁决

| 组 | 本轮可接收的窄证据 | 完整组裁决 |
|---|---|---|
| G01 | `g01-map-gesture.test.tsx` 的取消后无选区预览、正控选区后删除实际 session 瓦片，已由新断言及 32/32 执行支持。 | **部分 accept**；平移 view 变化仍由回执自列 pending，不作为完整组转正。 |
| G02 | `g02-map-scope.test.tsx` 用独立深拷贝会话，并在新会话选区删除后比较新旧地图，闭合上一轮“只查通知/DOM”的反证。 | **accept 当前三项候选合同**，正式接入时仍需去重与官方门禁。 |
| G03 | `g03-app-lifecycle.test.tsx:207-249` 确实从 `initialDir` 进入、Cmd+S 后检查 `manifest.json` 和 `content/` 写闭，卸载后检查零新增写闭。 | **counter**：注释/回执声称“save-state 终写”，实际没有断言 `.type-pal/save-state.json` 写闭或 `phase=committed`；以连续 300ms 静默代替事务完成。不能称完整保存闭环。 |
| G04 | `g04-script-draft.test.tsx:113-151` 的旧草稿翻转、外部换 body、弹层关闭且零写回、重开新草稿确认写回两行新 body，闭合上一轮弱例。 | **accept 当前四项候选合同**，正式接入仍待统一门禁。 |
| G05 | 新 `ScriptStage[]` 输入及真实 `CanonicalSceneScriptWorkspace` 挂载是进展。 | **counter**：`g05-playback-scope.test.tsx:61-71` 新源 80ms 到 `done` 即停循环，未保证推进超过旧源余下 300ms，且旧 `wait` 已进入没有见证；“旧尾命令不复活”未证。`:184-220` 只要求 `stopSpy` 曾调用，而生产 `Playback.playCanonical` 在 `playback.ts:299` **启动时就调用 stop**，`SceneScriptWorkspace.tsx:191-194` 挂载/换源 effect 也调用 stop；即使删掉卸载 cleanup，该断言仍可绿。须在卸载前取调用数/实例状态，卸载后验证增量及旧 pending 收口。 |
| G06 | `g06-validation-crosscalls.test.ts:45-141` 改走真实 `validateEnemies`、合法 `EnemyDef` 无强转、非法叶 path 与输入深等，可保留。 | **部分 accept**；当前用例均从 enemy 定义入口进入，未覆盖工作包所列 author→enemy choreography 的另一个方向及七入口代表组合。回执“全组闭环”须收窄或补测试。 |
| G07 | `g07-core-boundaries.test.ts:37-49,64-83` 的 event-system 对话历史按 scene 图号入账，以及 0x30 消费装备派生 getter，确实到达先前缺失的消费者。 | **部分 accept**；工作包还列装备脚本经 event 表执行，本轮仍由测试直接调用 `writeEquipmentEffectField`，该中间调用链未证。 |
| G08 | `g08-conversion-isolation.test.ts:69-102` 的 0x47 sound 回调调用/产物和非法 opcode gap 见证成立。 | **部分 accept**；工作包列出的 `globalRoots/options` 差异见证、异常路径不污染下次调用仍未证；gap 不抛并非异常路径。 |
| V01–V04 | 六图及 V04-01 预期 beforeunload 中止、V04-02 环境阻断分类维持既有窄事实。 | **未转正**；六类表单键盘、非空工作区分隔条、失败→重试/A-B 乱序、合法媒体操作矩阵仍在回执中明确未证。不得用 40 条账本总数替代这些操作链。 |

## 收窄返工范围

1. 先修最终树 Biome 与回执不一致，重新跑目录门。
2. G03 钉住真实保存事务终态；G05-02 钉旧 wait 已进入、推进越过旧窗口；G05-04 钉卸载前后 stop **增量**，最好分别加单点反控证明鉴别力。
3. G06/G07/G08 若不补剩余原工作包轴，就在候选/机账/回执中明确降为窄合同，不宣称全组完成；V01–V04 维持未证，不必重拍旧图。

本轮不改 GLM 候选语义、不代签、不标 done。无 Kimi 提示词（用户豁免）。
