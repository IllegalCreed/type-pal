# 007–009 运行时测试来源核验

Status: recorded
Owner: Codex
Last reviewed: 2026-11-06
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

[E2E-R4-1](../cards/E2E-R4-1-route-and-checkpoint-foundation.md) 收口时，检查器在三组 `document-audit` 中报告 16 条来源诊断。旧来源为 `dccd4095fff93626f16c68f8d4aca3627ff6e8e7`，新来源与绑定维护基点为 `a636321333e368da03607ec2ea5bba6fb205c2bc`。三组原出版 revision 仍各自引用 `d02278dc0154dd73b5db24388a35c30bb096cc81`。

## 来源与输入

下表各源指纹均取完整 Git 文件字节。同一 `main.ts` 的四个 caller 范围前后逐字节相等。

| 来源 | 旧 SHA-256 | 新 SHA-256 |
| --- | --- | --- |
| `packages/reforge/src/main.ts` | `f5b9317e5aadbdd4b6fcbd99512418bb0b9cdb464b24e4b8041fb15916bd3120` | `c5d7bd5cb15293d3757c9e20d7d0870a63ad7aae28c29a3ab0590c3e90bcd1d7` |
| `packages/reforge/src/world-camera.test.ts` | `08978bf5b4af768ab1d22a8adf7c2492f6f9429bcbe9fd74c0798cf071723721` | `77fd8d046b763348474c9fd306f5299c2bd1a95e8f826e8d1056b6dc65779b04` |
| `packages/reforge/src/world-scene-presentation.ts` | `e6edaddf9e78747a11e409f6058d6f3014f169b799cda182a225827cc700efa0` | `81af6d6d3582ecff255b2242b108ffb270b4c9e017bc015b687417b409d402d2` |
| `packages/reforge/src/world-scene-presentation.test.ts` | `0925a2b288cab4ba75f054c6880845e5ef800d80ba07d8dc2bd04c5dc8f716cd` | `f18b1755bab15ad924c19700cc53f9c87d3a4712b44cd70ba7afbb35be719bf6` |

## 断言与业务 oracle

| 稳定 ID 与报告 | 旧范围 → 新范围 | 源码复核 |
| --- | --- | --- |
| [`runtime-active-scene`](../../testing/domains/runtime/scene/active-scene/report.md) | `main.ts` 407–414 → 407–414、448–455 → 448–455。`world-camera.test.ts` 108–125 → 143–157 | `ActiveScene.commit` 发布资源、兑现旧等待和更新 room/bounds 的分支沿用原实现。`WorldCamera.pan` 在替换前拒绝已取消信号，`reset` 仍把采样留给宿主。预取消测试沿用已取消 signal、旧 pan 未提前结束和终位移 `[8,12]` 三个判据，推进从一次 `advance(32)` 改为 `advance(16)`、`advance(100)`，配合新节拍。新范围精确覆盖这条测试，旧范围末尾相邻用例的开头仍保存在 Git 原件。 |
| [`runtime-battle-host`](../../testing/domains/runtime/battle/battle-host/report.md) | `main.ts` 1242–1261 → 1242–1261 | 主壳端口及 `BattleHost` 实现、既有 live inventory 测试文件逐字节相同。准备后提交读取 live 输入，旧 finally 仅释放本 session，释放与 `finishWorld` 同一 continuation。普通明雷的接敌时机和奖励窗另有 007 原件。 |
| [`runtime-world-owners`](../../testing/domains/runtime/world/world-runtime/report.md) | `main.ts` 434–445 → 434–445。`world-scene-presentation.ts` 71–88 → 71–88。`world-scene-presentation.test.ts` 82–105 → 82–105 | `WorldMotionRuntime` 及其 ownership 测试文件逐字节相同。生产呈现的 owner 类、独立的 override / 实际绘制帧状态仍在声明范围内。`sprites` 新增 static 明雷的 gait frame 分支，原 directional fixture 的输入与实际帧 5、锚点、排序几何断言完整保留。普通明雷步态及接敌的运行结论归 007。 |

## 结果

三个报告、三个 evidence 及 catalog 对应项使用同一组新来源。各 history 追加一条事件，完整收录实际改动的旧引用。`runtime-active-scene` 的 source-backed claim 只有 `world-camera.test.ts` 的行号指针随锚点更新。桥接反向还原后比较完整原对象，保留原出版状态、身份、版本、执行字段、旧历史、附件和 claim 结论。

`node scripts/docs/check-testing.mjs` 在恢复 006 的 8 份固定原件后由 16 条来源诊断收敛到 0。`testing-source-bridge.test.mjs`、`check-testing.test.mjs` 和 `document-location.test.mjs` 合计 85 项通过，覆盖移动指针、过期及越界指针、claim 结果修改和未移动时改指针。三个 evidence 均通过与固定 `159cd0e2` 原件的逆向校验。catalog 原 `159cd0e2 → 37bf9106` 维护层与后续有限桥接均实核通过。

## 限制与复核

本回执限于源绑定和文档工具检查。若来源、锚点、业务判据或配对合同再变化，先检查固定 Git 差异。产品运行、视觉、覆盖率与 E2E 验收各取对应的原生证据。
