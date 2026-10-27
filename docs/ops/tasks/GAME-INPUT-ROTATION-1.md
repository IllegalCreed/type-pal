# GAME-INPUT-ROTATION-1 - 手柄摇杆与虚拟方向键旋转

Status: review
Phase: phase1
Capability: 玩家输入与移动端
Coding Owner: input_rotation（隔离实现）；Codex（集成）
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Contributor: Codex
Branch: codex/map204-input-rotation

## 目标

按用户2026-10-27与[issue #24](https://github.com/IllegalCreed/type-pal/issues/24)，增加可记忆的45°旋转设置，使手机方向键与手柄左摇杆的斜向输入对应画面上的移动方向。

## 范围

- 范围内：可选顺时针45°；虚拟方向键的位置、箭头、触点命中一致；手柄左摇杆映射；中英文系统设置、偏好与必要回归。
- 范围外：第二阶段、键盘映射、硬件十字键布局、游戏移动速度/碰撞/存档schema；不增加移动端快捷键。
- 默认维持现有方向，选择后保存；确认/取消按钮及既有透明叠加布局保持。

## 前提真值门

### 一句话行为 / 工程前提

旋转的是输入方向布局，移动仍消费原有Up/Right/Down/Left语义。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | North向右上、East向右下，等角投影不是屏幕正交移动 | `reference/sdlpal/scene.c`的PAL_UpdateParty与`palcommon.h`方向枚举 |
| 第一阶段 | Up=(+16,-8)、Right=(+16,+8)、Down=(-16,+8)、Left=(-16,-8) | `packages/game/src/core/scene-system.ts:31`的DIR_DELTA；`scene-system.test.ts:44` |
| 当前二阶段 | N/A，本卡只改第一阶段输入外壳 | 本卡范围 |
| 本任务目标 | 顺时针45°后Up按钮在右上，右上摇杆触发Up；其余三向同理 | 用户本轮授权；issue #24 |

### 反证与替代解释

- 仅转CSS但不转命中坐标会造成按到右上却发Right；必须核真实指针与摇杆进入游戏的结果。
- 45°为用户请求的方向分区，实际像素移动斜率为1:2，不宣称精确投影角为45°。
- 旋转时旧按住态必须释放，失焦/隐藏/断开与回中规则继续有效；键盘和硬件十字键不因设置改变。

### 用户可见偏离

- yes：原正交布局可选顺时针45°；用户明确要求试做。代表：点右上方向按钮、向右上推左摇杆均向画面右上移动。

## 上下文锚点

- [CLAUDE](../../../CLAUDE.md)、[质量规范](../code-quality.md)、[工作流](../agent-workflow.md)、[测试治理](../../testing/governance.md)。
- `packages/game/src/shell/gamepad-input.ts`、`touch-controls.ts`、`game-shell.ts/.css`与`tools/tools-panel.ts`。
- [移动端既有取舍](GAME-MOBILE-LAYOUT-1.md)：按钮相对窗口、半透明、只方向/确认/取消；不恢复已移除工具。

## 验收条件

- 真实触点和Gamepad typed输入核四斜向→原四方向；默认回归、死区/回中、切设置释放和偏好失败可用。
- 相关实现逐文件八维审查，真实caller/独立oracle/排重；缺陷红例或有效反控→恢复，原始输出与原生结果可复验。
- 定向/相邻测试、受影响typecheck与零诊断lint；本窗口两卡冻结后集中必要大门，不按小切片重复全仓。
- 浏览器设置切换、刷新记忆、手机布局/命中与实际走向；没有实物手柄不能声称硬件实测。
- 本卡、看板、生成索引、测试配对证据和限定文档SHA链一致。

## 当前模式推进记录

- Codex build allowed：核DIR_DELTA与两输入caller后，允许在隔离worktree实现本卡输入外壳及定向测试。Owner独占相应shell、tools设置、字典；不改scene-system、存档、第二阶段或质量规则。
- 贡献者候选`0b0ce187e70f540ec2de198d671afd82ddaa99c5`已本地集成为`ae9e3226c`；14文件A–H、60定向/相邻、正式四象限单业务红→恢复、game TC与局部Biome零诊断。51旧合同保留、9新增、0退役。
- Codex独立accept本功能：实际diff、新叶与contacts/CSS边界、原生集合及附件指纹已核；[唯一回执与无损原件](../evidence/GAME-INPUT-ROTATION-1/review.json)。不增加整文件代码治理关闭。
- 用户产品方向已授权；本地体验已获用户确认；发布CI与部署仍待实际完成。

## Draft: 设计与风险

统一方向偏好提供给外壳；触点在稳定圆形命中区内逆变换45°再分区，视觉按钮顺时针排布；摇杆按同一语义分类。避免旋转整个正方形造成包围盒放大和边缘裁切。持久化失败保留内存偏好，设置切换不得继续旧方向。

## Build: 实现与自测

实际命令/cwd/时间/exit/source/native均在上述回执。正式反控完整gamepad文件9pass/1指定AssertionError/0skip，源码按字节恢复后60绿；早期过滤反控有9skip不计有效针。新增壳层监听沿用页面生命周期，adapter有对称detach。

本地浏览器真实开关默认off、on后刷新保留、off恢复原布局；横屏844×390/竖屏390×844实看布局，右上pointerhold350ms使坐标(1312,288)→(1328,280)、朝向up，中英文设置可读，warn/error日志为空。入口是明确skip-intro开发功能，不冒充自然剧情或硬件手柄实跑。

## Review: 审查与返工

有限功能接收；共享开关默认不转、可持久化，键盘和硬件十字键保持原语义。浏览器视觉/实际输入已核，集成静态窗见[当前回执](../evidence/GAME-NANZHAO-ROOM-EXIT-1/integration-gates.json)，本地用户体验已确认，发布待收口，不从原件指纹推导设计正确。

## 用户验收

2026-10-27用户明确“可以了”，接受本地结果并授权提交、CI、合并、阿里云部署与issue回复关闭；不外推为实物手柄或完整剧情E2E。

## 交接日志

- 2026-10-27 Codex：从main `123595ac3`开窗，核issue与四向移动，分派隔离输入实现；根独占任务/看板/索引及集成。
- 2026-10-27 用户再次明确必须可配置；当前共用开关已满足。Codex完成真实移动/刷新/开关回退与手机几何核验，状态review，待两卡稳定后集中必要门与用户本地体验。

- 2026-10-27 Codex集成收口：两卡定向证据与有限浏览器体验已独立接收；完整check:docs（125工具用例与全部consumer）、全仓typecheck、lint零诊断。历史失败原样保留，见集成门回执；未跑本窗官方coverage/受保护CI，未推送或部署。状态review仅待用户体验。

## 下一位 Agent 提示词

无用户转交；当前Owner完成输入实现和定向证据，Codex独立验收并提供本地体验。

2026-10-27发布窗口：用户已接受两项本地结果并授权完整发布。补齐提取快测真实caller与旧FPS测试语义定位，五文件有限A–H、正式反控及两遍资源一致见[准备回执](../evidence/GAME-NANZHAO-ROOM-EXIT-1/release-preparation.json)。当前review等待受保护PR/CI与真实部署，不提前声明上线或关闭issue。
