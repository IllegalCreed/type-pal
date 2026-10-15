# QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1 — C03 查看器宿主、回调与迟到读取

Status: build
Owner: Codex
Reviewer: Codex（作者自验/独立证据重构分记）
Phase: phase2
Capability: sprite viewer test fidelity
Visual Verification Timing: N/A（纯测试）

## 边界与真值

起点4f4b236df已提交推送两治理分支，main=f98d0ddd8、0behind/41ahead；主树只读。单Agent唯一Coding Owner Codex，避开GLM/ED-ENTITY。当前机器3284/229closed/65review/2990pending，0关闭。

本片为边界清晰C03模块：g03/g04两测试、upload-harness.tsx与upload-ui.ts四源；helper只改Viewer分段及通用卸载finally，不借机改Wizard/Uploader。精确退役另同步approved-test-retirements.mjs及其固定清单测试，matcher/拒绝合同不变。不得改产品、schema/save、接口、资产管线、规则或生成物。父共享helper其它caller先回归，未知项保持review。

两测试、两helper已全文读；SpriteResourceViewer581行、WorldSpriteLibrary1457行、reader/sprite-assets与两个合法fixture、两套硬件端口已全文直接读。assets.ts仅1-85/175-300 cache/palette段，DataMode704-770只caller段；不宣称整模块治理。旧C07主树product SHA均不变，可复用已核一手事实。

| 方向 | 直接事实与目标 |
|---|---|
| Primary | React act等待真实异步交付/卸载；既有C02观察器call-through观察真实cache/palette promise，不替换核心结果。 |
| 第一阶段 | N/A，二阶段测试宿主，不改原版机制。 |
| 二阶段 | Viewer206/218-279：selectedFrame是受控prop，effect只跟资产/reader/稳定callback，World父页给稳定setState函数。upload-harness的inline onSelectedFrameChange每次渲染变身份，引起额外重读；外部setFrame不应伪造用户callback。 |
| 目标 | 先保持20例留基线，写外部受控更新不额外callback的失败反例，再稳定宿主callback；真实cache/palette call-through等待，late/unmount/revision实际完成后才断言。g03-10仅命中helper无record占位，不调用产品组件，按用户无业务执行用例规则精简；未知重复不删。 |

最强替代解释：等待helper主动再解码会先于产品完成或制造额外失败retry；使用真实SpriteAssetCache.load与实际assetResolver.readRoleText返回promise，仅按reader+当前asset归属等待。预期失败仍由真实组件catch呈现，测试必须断言UI/回调，不吞console。pending gate显式保留，release在act内等待真正任务完成。

Coding Owner Codex premise verified / design agree，build allowed，仅以上模块与精确退役记录；新产品边界另卡停线。g03-02未证循环不宣称循环，g04-07按序等待不宣称快速切换；controlled callback标题按真实caller重核，不沿用误导注释。

## 验证与交接

基线、失败反例、定向/相邻、typecheck、至少一枚有效业务反控与退役精确身份/SHA；官方完整门与C07/后续检查点集中稳定窗口。原始失败/诊断不改写，退出0但非零诊断不算通过。证据见[本片](../evidence/QUALITY-EDITOR-VIEWER-DIAGNOSTICS-1/README.md)。无下一位Agent提示词，Codex继续。

## 作者检查点与独立反控复核

原20例51act；受控更新反例先红。稳定宿主、真实IO等待后完整20例零诊断，再以产品调用正/负控证明G03-10只有helper执行，精确退役1条；最终19通过/0skip/三模式0。相邻9文件69通过但63act，完整editor typecheck通过；coverage-tools66通过，matcher未改。隔离业务反控8绿1指定AssertionError、恢复19绿，删除副本后独立重构SHA一致。TypeError准备失败、trace源码及所有原件保留，见证据README。

增加直接全文依据AssetResolver125行；非configurable gate不改descriptor，以typed委托原方法观察真实promise。四源仅review，229/71/2984；完整门待C07/C08稳定窗口，不合main、不关闭文件。原主线f98d0ddd8仍只读，最新同步与分支计数提交前另核。
