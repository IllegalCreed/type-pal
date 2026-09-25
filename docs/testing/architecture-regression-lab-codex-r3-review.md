# ARCH-REGRESSION-LAB-GLM-1 — Codex 三轮独立接收

2026-09-25；候选 `bc8613d17a15262bddb01a1a47b3669428d22b02`。结论：**counter，十二组均暂不以完整组合同转正式测试；保留已证的窄正控，任务仍为 draft。** 这轮接收只针对最终候选，不把二轮旧 SHA 的结果冒充当前验证。[二轮反证](architecture-regression-lab-codex-r2-review.md)保留为历史。

## 机械事实与当前阻断

- `git diff a2415868..HEAD --name-only` 仅在 `docs/testing/glm-architecture-regression-lab/**`；该合入点后 GLM 自身 packages/scripts 零 diff。**但** `git diff a3ceaf05..HEAD -- packages/ scripts/` 非空，含中途合入的 Codex/Gemini/Grok 主线修改；只能说起点 `86e928b5..a3ceaf05` 冻结零漂及 GLM 自身增量零产品改动，不能说最终树相对 `a3ceaf05` 零 diff。
- 本席 `env -u NODE_COMPILE_CACHE pnpm exec vitest run --config .../candidates.vitest.mts`：**9 文件、32/32**，不是交付文字的 33 项。独立 JSON 报告 `/tmp/codex-glm-r3-vitest.json` 同为 32/32；机账仍为 **40 条（38 candidate-green / 1 existing-proof / 1 blocked）**，其中候选测试引用 32 条，但 **11 条 fullName 与本次真实执行名不符**（把旧 ` > ` 分隔符正规化后仍不符），G08-03 已从测试文件删除却仍在机账作执行证据。`results.json:832-862` 的命令仍写“36 项”、旧 537 文档数与过期 V04 reproduced-defect；README/receipt 也仍报旧 39 条 36/1/1/1。故 `verify.mjs` PASS 不能代表最终树证据闭环。
- `tools/verify.mjs` 现在确为**只读**，重算 40 条小计；但 `:64-91` 只查测试文件存在与截图 `sha256_16` 前缀，没有读取 Vitest JSON 验 `fullName`/status/执行数，也不核命令退出码。六张截图均存在，本席重算完整 SHA-256，其前缀均与机账一致；机账仍只存 16 位，未满足工作包的完整 SHA 登记。
- `node tools/red-control.mjs`：detected，exit1/1执行/1失败/业务 AssertionError、注入见证1、产品 hash 不变；本席产生的唯一 `.tmp-red-HOXY97` 已移至 `/tmp/type-pal-arch-lab-red-HOXY97`，候选树干净。其后全目录 Biome 20 文件 exit0，`node scripts/docs/check.mjs` PASS，diff 检查 PASS。负控仍只覆盖启动小样，不证明各组的新合同。候选目录也未交独立 TS/TSX typecheck 配置/结果。

## 十二组决定

| 组 | 本轮有效进展/可保留项 | 正式转正前剩余 counter |
|---|---|---|
| G01 | 笔划正常提交与三种取消零写入、取消平移后仍可绘制 | `g01-map-gesture.test.tsx:257-280` 仍只数通知，未证实际选区状态；平移 view 取消结果未证。 |
| G02 | 活跃笔划换同/异 map 会话后的两侧 tiles 正控 | G02-03 仍只比选区通知，不比新会话选区或实际提交状态。 |
| G03 | 挂载上屏及旧会话卸载 fail-loud 可保留 | `g03-app-lifecycle.test.tsx:198-212` 发 Cmd+S 后直接调用旧 session.dispatch 并断言它抛错；**即使快捷键监听残留、保存 IO 已发生也会绿**，不能称键盘/保存 owner 收口。derivedStore/临时试玩生命周期亦未测。 |
| G04 | 弹层 entered 后确认一笔、关闭零笔可保留 | `g04-script-draft.test.tsx:113-125` 标题称旧草稿不写回新对象，代码只数新 body 行；注释自己承认旧草稿覆盖待浏览器确认。G04-01 仍只是 props 替换，不是 session undo/redo。 |
| G05 | stop 后 mode/path/view 的局部保真；`waitFlow` 已改 `satisfies` | `g05-playback-scope.test.tsx:58-69` 新源后立即再 stop，仅推进 fake timer，不调用驱动 wait 的 `Playback.tick()`（生产 `playback.ts:597-652`）；旧源复活未证。G05-04 手工置 `onUi=undefined` 不是工作区 unmount。 |
| G06 | `checkEnemyOnDefeatedCommands` 的非法 branch 确实触达 enemy→author condition 校验（源 `enemy-script.ts:576-600`），比二轮直接调 author 更窄有效 | G06-05 仍 `as never`，错误断言只含 owner 前缀；G06-01 的实际 flow 无所称 onDefeated 嵌套，G06-02 未证明作者→敌方的完整调用链。须收窄标题/范围或补合法 typed caller。 |
| G07 | 装备效果改经生产 `writeEquipmentEffectField`，比直接赋槽更真实；库存实例隔离正控可留 | `g07-core-boundaries.test.ts:12-23` 的 map 读写仍都来自 scene-system；`:36-42` 仍只读 equip getter，没有调用 `battle-opcodes.ts:343` 的消费者。不能宣称 scene→event 或 equip→battle。 |
| G08 | 非法 opcode 确实登记至少一条 gap，后续合法调用可运行；可收窄为“报告非空/下次可用” | `g08-conversion-isolation.test.ts` 现在只有 01/02/04 三项，机账仍有 G08-03。G08-02 未见证 sound 回调执行/产物差异，且标题仍称“回调轨迹”；G08-04 不是异常 throw 路径，旧标题和机账未同步。 |
| V01 | 旧三张截图仍显示角色名改动及恢复 | 未给 Enter/blur 双提交次数、归焦/键盘链或其余代表表单；缺头像素材不能充资源正控。 |
| V02 | 旧 PanelResizeHandle 测试可作 existing-proof；720px 角色页可见 | 未测非空场景/地图/脚本三宽度、实际分隔条与 zoom；不能称工作区矩阵通过。 |
| V03 | 无效 objectId 深链回退的窄事实 | 与一次性读取失败、A→B 乱序、解除故障重试三态无关。 |
| V04 | 脏页 beforeunload 中止的现象已由 Codex 证为预期；缺合法 sprite 二进制的环境阻断可保留 | `results.json:731,758,856` 仍保留“覆写回 actor/待归因/ reproduced-defect”旧话，README/receipt 同样旧；无自包含合法媒体/decoder 正控或 fit/1:1/替换操作。 |

返工只动 GLM 实验目录及自身机账/回执，不改产品、正式测试、基线或 Codex 原审查。**先让 JSON 与真实 32 项及 40 条分类逐项一致**，让 verifier 只读且真正读取 JSON/完整 hash；然后对不能触达目标链的组主动降级或补真实 caller/状态反例。没有必要为了保住“十二组全部 green”再补弱测试。候选不合 main、不计官方覆盖率、不标 done。
