# 两实体靠近条件的前提与合同

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: design-spec-v1 / 1.0.0

SCRIPT-GOV-3 统一步骤后核出独立条件误译：两实体同一场景身份存在被当成靠近，相关取物与芦苇漂后台动作提前开始。Root 准入通用显式 entitiesNear 条件；不恢复 raw opcode、不修改物品放置资格、不把实体可见状态混进距离判断。

## 问题与目标

- 两实体同一场景身份存在被当成靠近，相关取物与芦苇漂后台动作提前开始。Root 准入通用显式 entitiesNear 条件；不恢复 raw opcode、不修改物品放置资格、不把实体可见状态混进距离判断

## 真值与约束

- 四向证据：原始输入 raw83@10423（s048/e797 检查 e796）与 raw83@31286（s213/e3606 检查 e3607）operand1 均 0；第一阶段 event-system.ts:4363-4388 OP_JUMP_IF_OBJ_NOT_IN_ZONE 先查两实体在当前实例再查 abs(dx)+2*abs(dy)<operand1*32+16 相等走失败支（无可见 state 条件）；当前二阶段两自动正文只读 entityInScene 移动前后均真；目标=from/to 显式复合地址当前活体位置 Chebyshev 格距离严格小于 range（原检查 range=0.5）
- 坐标换算：新坐标 x=16*(col-row)、y=8*(col+row)，abs(dx)+2*abs(dy) 等于 32*max(abs(dcol),abs(drow))——原 operand1=0 的严格 16 像素阈值即格距离严格小于 0.5（0.499 过、0.5/0.501 不过，不能用「半格以内」把边界误作包含）；height/隐藏/碰撞不参与
- 合同 {kind:entitiesNear,from,to,range}：range 必填非负有限、地址过严格形状与引用检查、任一端不在当前实例或不存在即 false；组合条件递归/分支/循环同一条件不另造等待指令或游标机制
- runtime required 查询读 active scene 实际实体 pos（不读缓存静态定义或到达终点才更新的 canonical endpoint）；编辑器播放读叠加层当前移动位置；现有实体在场条件保留为通用身份判断撤掉错误 raw83 注释不兼容旧距离误译；资源缩略图不能知动态位置应标需场景播放不伪装恒真
- 替代解释排除：raw83 仅检查场景归属被第一阶段明确读取两实时 x/y 且有距离失败分支直接推翻；隐藏物件解释因原实现不读 state 不纳入（加 visibility 会改变脚本）；若原数组重提取后身份/operand1/caller 坐标与本记录不符应重核映射不能猜范围
- 验收：同点/各象限/半格边界/height 不同/隐藏实体/任一缺失跨场景；真实移动经过阈值前后改变判断（不能用静态坐标替代移动中检查）；严格 validation 拒缺字段/未知字段/坏地址/负数-NaN-Infinity；引用守卫同报 from/to；编辑器双地址导航与预览按实际 tick 更新
- 交付验证：定向反控 22 项（Content 11 strict guard+双引用、Reforge 9 像素公式+真实移动查询、Editor 2 实时叠加+双地址编辑导航）；相关 UI/引用回归 132 项；三包 typecheck 与相关静态零诊断；初版三个测试前提错误保留日志（引用路径尾 .entity/正常走位步长未经过 4.5/未修改草稿完成不提交）修正后通过未放宽阈值；两条业务链由对应作者内容 Owner 更新执行本包不并写；当前 build 未宣称 E2E 完成；Root 最终冻结批次统一切 content23、SAVE11 结构不变

## 方案

- 见真值与约束各条：合同/所有权/修改路径按原文时点冻结；本页只接治理模板，不改变设计结论。

## 边界与风险

- 替代解释的排除与「不冒称」边界见真值与约束各条；业务 JSON 归 Content Owner，本包不并写。

## 验收

- 反控与回归清单见真值与约束末条与原文验收节；交付验证数字按原文时点。

## 历史范围

- legacy batches/script-governance 的前提/合同设计记录；固定来源与 source SHA 见下方保全节。

## 原始结论

- 本记录为 SCRIPT-GOV-3 系列设计准入证据（四向证据+替代解释排除+精确合同）；实现与测试按此执行。

## 当时证据

- 四向证据表、反例与验收清单在 quote 保全。

## 当前有效性

- historical。设计合同按冻结时点；当前行为以现行实现为准。

## 继任文档

- 当前结论归 SCRIPT-GOV 系列任务卡与现行 canonical 实现。

## 原文保全

固定源 revision `226f8cb90880b74c82f3c39b6e09d949f2a16e7b`，source SHA `65ef7ecf3132cb6cf99c608cd63b6213d0c6b998317f59ec6b988f75889abfd3`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 两实体靠近条件的前提与合同
>
> SCRIPT-GOV-3 在统一步骤后的作者工程核出一个独立条件误译：两实体在同一场景的身份存在被当成了靠近。
> 这让相关取物与芦苇漂的后台动作提前开始。Root 已核原始输入和第一阶段调度，准入一个通用、显式的
> `entitiesNear` 条件；不恢复 raw opcode、不修改物品放置资格、不把实体可见状态混进距离判断。
>
> ## 四向证据
>
> | 维度 | 直接证据与结论 |
> | --- | --- |
> | 原始输入 | raw83@10423 属于 s048/e797 检查 e796，raw83@31286 属于 s213/e3606 检查 e3607；operand1 均为 0。完整 caller、坐标和后继由 SCRIPT-GOV-3 动作/入口报告登记。 |
> | 第一阶段 | event-system.ts:4363–4388 的 OP_JUMP_IF_OBJ_NOT_IN_ZONE 先查两实体是否在当前实例，再检查 `abs(dx)+2*abs(dy) < operand1*32+16`；相等时走失败支。没有可见 state 条件。 |
> | 当前二阶段 | 上述两个自动正文只读 `entityInScene`，main 的查询仅查场景 ID 和实体定义是否存在；移动前后均为真，无法等到物件真的靠近。 |
> | 目标 | from/to 显式复合地址，当前活体位置的平面 Chebyshev 格距离严格小于 range；两个原检查用 range=0.5。height、隐藏和碰撞不参与。 |
>
> 新坐标中 `x=16*(col-row)`、`y=8*(col+row)`，故 `abs(dx)+2*abs(dy)` 等于
> `32*max(abs(dcol),abs(drow))`。原 operand1=0 的严格 16 像素阈值就是格距离严格小于 0.5；
> 不能用“半格以内”把边界误作包含。距离为 0.499 可通过，0.5 和 0.501 不通过。
>
> 最强替代解释是 raw83 仅检查场景归属。第一阶段明确读取两个实时 x/y 且有距离失败分支，直接推翻该解释。
> 另一解释是隐藏物件应当不参与；原实现没有读取 state，加入 visibility 会改变脚本，因此不纳入。
> 如果原数组重新提取后 raw83 身份、operand1 或 caller 坐标与本记录不符，应重核映射，不能猜范围继续覆盖。
>
> ## 完整实现边界
>
> 作者合同为 `{kind:'entitiesNear',from:EntityAddress,to:EntityAddress,range:number}`。range 必填、非负有限；
> 地址必须分别通过严格形状与引用检查。任何一端不在当前实例或不存在即为 false。
> 组合条件递归、分支和循环均使用同一个条件，不另造等待指令或游标机制。
>
> Project runtime required 查询接受两个复合地址和 range；主壳读取 active scene 的实际实体 pos，
> 不读缓存的静态定义或只在到达终点才更新的 canonical endpoint。编辑器播放读取叠加层的当前移动位置。
> 现有实体在场条件继续保留为通用身份判断，撤掉其错误的 raw83 注释，不兼容旧距离误译。
>
> 编辑器提供两个可导航的实体地址和“距离小于几格”，摘要同时呈现两者语义名及严格阈值；保存、复制和
> 删除保护分别保留 from/to 地址。资源缩略图若不能知道动态位置，应标为需场景播放，不能伪装恒真。
> 真实宿主必须实现 required 查询；测试 dummy 可以显式 false，但业务距离用例必须用实际位置。
>
> ## 反控与验收
>
> 验证包含：同点、各象限、半格边界、height 不同、隐藏实体、任一缺失/跨场景；真实移动经过阈值前后改变判断，
> 不能用静态坐标正确替代移动中的检查。严格 validation 拒缺字段、未知字段、坏地址、负数/NaN/Infinity；
> 引用守卫同时报 from/to，编辑器双地址导航和预览按实际 tick 更新。
> 两条业务链由对应作者内容 Owner 更新和执行，本包不并写其 JSON 或 pal-gov3-motion/content 测试。
>
> 当前为 build，未宣称 E2E 完成。Root 最终冻结批次统一切 content23；SAVE11 结构不变。
> 本记录、相关实现与测试提交前由 Root 独立复核，无须新增产品取舍。
>
> 本包定向反控 22 项通过：Content 11 项 strict guard/双引用，Reforge 9 项像素公式及真实移动查询，
> Editor 2 项实时叠加位置、双地址编辑/导航。相关 UI/引用回归 132 项通过；三包 typecheck 与相关静态
> 检查已零诊断。初版三个测试前提错误保留日志：引用路径尾是 `.entity`、正常走位步长未经过 4.5、
> 未修改草稿时完成不会提交。修正测试取样和预期路径后通过，没有放宽业务阈值或复制静态坐标当活体。
>
<!-- original-source-quote:end -->
