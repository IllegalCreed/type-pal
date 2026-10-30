# QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1 — 大世界精灵宿主与真实资源见证

Status: build
Owner: Codex
Reviewer: Codex（作者自验与独立复核分记）
Phase: phase2
Capability: world sprite test fidelity
Visual Verification Timing: N/A（纯测试）

## 隔离与前提

cae26b1c7已推送，origin/main=f98d0ddd8、0behind/39ahead。C04/C05/C06完整门冻结运行期间，本片先在四个本地包的独立临时副本准备，不改治理树任何源码；单Agent，唯一Coding Owner Codex。交付前按原始SHA核对再接回治理分支，不覆盖任何并发改动。

白名单：WorldSpriteLibrary.kimi-workflows.test.tsx、WorldSpriteLibrary.glm-ui-wave.test.tsx、cursor-asset-r1/world-sprite-harness.tsx三文件。完整读两测试、真实WorldSpriteLibrary1457行、SpriteResourceViewer581行、reader/cache门、K02与Cursor合法fixture、硬件端口和共享宿主；DataMode704-770仅caller段，sprite-commands仅1-190/388-549，不冒称全部治理。

| 方向 | 一手事实与本片目标 |
|---|---|
| Primary | React act覆盖真实异步IO交付及卸载；不得关闭检查或吞诊断。 |
| 第一阶段 | N/A，二阶段编辑器测试，不改原版机制。 |
| 二阶段 | WorldSpriteLibrary261-277 proof需asset+revision匹配；Viewer218-280真实sprite/palette Promise.all，alive归属；host须等待两者。命令1-190/388-549管当前引用、解码证明和可撤销资产。 |
| 目标 | 真实宿主共享，操作一次、等待实际解码/palette/提交；删除无效定时“等待”；原九例不退役。12→14未跨四向上限阈值，测试改12→16并以固定max3反控区分；不改产品。 |

最强替代解释：只给轮询套act可能隐藏重复点击/迟到覆盖；先留原始9例与诊断，再保留pending/late/failure/undo oracle并核真实promise。未知跨文件重复不自动删除；全仓窗口仍未清诊断，不标done。
Codex premise verified / design agree，build allowed，仅三测试/宿主文件；产品、schema/save/公共接口/资产管线、规则与ED-ENTITY-STATE-PLAN-1只读。若产品缺陷或新边界则另卡停线。

## 交接

定向/相邻、typecheck与有效反控先验；doc/lint/ledger按新候选。集中质量窗口另记，包级全绿不关闭文件。证据见[本片](../evidence/QUALITY-EDITOR-WORLD-SPRITE-DIAGNOSTICS-1/README.md)。无下一位Agent提示词，Codex继续。

## 注释边界补充准入

复用后k02-fixtures.ts有三位真实测试caller（World Kimi、World glm-ui、SpriteResourceViewer Kimi），原“只被两个新测试导入”注释失效。该fixture此前已全文读；Codex build allowed扩展第四文件，仅将首段注释改为编辑器测试共享，不改任何import/类型/函数体。第三位caller完整审计仍待下一片，fixture不关闭。

## 作者检查点与独立反控复核

接回完整树后的9例/相邻7文件121例、Editor typecheck均通过，三类诊断0。去重复mock/Harness、等待真实IO，保留9个身份/数量；两枚反控旧绿/新恰1条AssertionError/恢复9绿，已在临时副本删除后独立重构核SHA。ArrayBuffer等长内容弱断言的首轮无效反控保留为REJECTED，已改Uint8Array逐字节。其它准备失败与原因完整保留，不当作通过，见README与preparation-limits。

只有测试/宿主/fixture注释变更，产品源码SHA未变；无schema/save/接口/机制/生成物/规则边界变化。四文件仅review，机器3284/229closed/65review/2990pending。最新完整窗口属于旧候选cae26b1c7，尚有1031act/243环境/native0；本新片完整门待下一稳定窗口，未知项不关、不合main。无下一位Agent提示词，由Codex继续。

检查点静态门：docs 0 issues，lint 4250文件0 error/0 warning/0 info，ledger通过。原件见static-preflight.json；下一稳定全仓窗口仍待执行，不以本片定向零诊断替代统一收口。
