# EDITOR-ENTITY-NAMES-1 - 实体名称与稳定身份分离

Status: build
Phase: phase2
Capability: W7 / P3
Coding Owner: entity_names 贡献者
Contributor: Codex 子 Agent
Generation Owner: N/A
Reviewer: Codex Root 独立验收
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Branch: codex/editor-entity-names

## 目标与边界

用户2026-10-02批准“最好有个实体名称”：场景实例增加可编辑名称，列表、实体属性、脚本参数和移动轨迹优先显示名称，
编号为次要信息；内部ID、脚本目标和存档状态键不改。已确认客栈角色先命名，未核实体不猜名。

- 实现白名单：content实体名称元数据及校验、editor名称编辑/统一解析/相关显示与回归测试；贡献者是唯一实现写入Owner。
- Root只写本卡/看板/规范文档、已核PAL作者实体label、验收证据；不与贡献者同时修改实现文件。
- 排除：实体ID重命名、NPC身份合并/转为actor、正文/演出/轨迹计算修改、存档升级、digest设计变化、旧版本兼容、恢复原版转换核。
- 候选树：`/Users/zhangxu/.codex/worktrees/e2e-003/type-pal`，冻结基线f5726a504。6012主树服务及页面保持打开，接收前不更新。

## 前提真值门

一句话前提：当前实体只提供稳定ID和actor/sprite/zone外观，sprite实体没有独立作者名称，补名称比改身份更符合作者阅读诉求。

| 维度 | 真值与直接证据 |
| --- | --- |
| 原版/primary source | N/A：实例作者名称是新编辑器元数据；剧情命名依据现行正文和已核RF001～003，不声称原版提供实体命名字段。 |
| 第一阶段 | N/A：没有此场景作者编辑器；本任务不修改第一阶段或游戏渲染表现。 |
| 当前二阶段 | `content/src/index.ts:71–91` EntityBase没有名称，BaseSceneEntity继承它；`editor/src/ui/App.tsx:3527–3548`仅actor解引用名字；`command-form-controls.tsx:125`直接以ID为下拉label；`PreviewCanvas.tsx:766–777`仅actor有中文轨迹名；`script-world.ts:102–113`以scene/entity ID记录持久行为。 |
| 本任务目标 | 可选非空`label`只用于作者阅读；显示优先级为实例label→actor人物名→ID，同名仍以ID区分；保存重开保真、可撤销重做，所有引用和执行行为不变。 |

最强替代解释：用精灵名称或修改e59即可。精灵是共享外观，不能推定实例剧情身份；e59被命令与持久行为寻址，改它不是显示改名。
可证伪观察：名称改变目标ID/脚本内容，保存丢名，同名实体目标混淆，修改后脚本区/轨迹还用旧名，非法label通过校验，均拒绝接收。
本任务不是批量审计红项或迁移修复；现行作者正文自行维护，不能恢复已退役转换器。

用户可见before→after：`e59`→`苗人头领`（次要编号e59）；实例名称与人物预制名分离。用户已明确批准，不需再次裁决。
名称改变仍可能改变完整场景digest，旧开发档活动续接遵守现行严格校验，不承诺历史档不受影响，不另做save兼容。

## 上下文锚点与设计

- [第二阶段铁律](../../phase2/READ-FIRST.md)：稳定身份、作者真源、仅当前版本。
- [前批方案/步骤命名](E2E-SCRIPT-NAMES-1-plot-scheme-and-step-labels.md)：label元数据，不改执行，已核剧情范围和digest边界。
- [脚本合同](../../phase2/specs/script-system.md)、[E2E合同](../../testing/e2e.md)：后续走过的内容同步核读命名。
- `entity-commands.ts:138–196`不可变patch与undo；`script-editor-projection.ts:30–75`主属性会话和脚本真值保存合并。
- `ScriptEditor.tsx:640–649`当前摘要只读脚本会话；名称从主属性会话编辑时必须及时供给脚本摘要/目标选择，不能等保存重开才更新。
- 唯一显示解析器，不从sprite猜角色；可选名称表示当前未填写，非旧版本fallback。空输入清除label，guard拒绝非空白字符串之外的显式值。
- ID仍唯一：名称相同合法，下拉/引用应可查看次要ID，选择value/key继续稳定ID；跨场景地址保留场景上下文。
- 使用现行DsDraftTextInput，Enter/blur一次提交、Escape取消，按scene/entity ID隔离草稿；支持撤销重做。

## 验收条件

- 名称输入、撤销/重做/清除、切实体草稿不串；普通实体、actor覆盖/继承、zone均可命名。
- 当前schema合法/非法/无名称/同名测试，真实作者工程save→open保留元数据；ID、正文、引用完整不变。
- 列表/选中标题/地图标签/脚本参数摘要和目标选择/轨迹名称一致，刚改名未保存也即时显示；不存在名字写到另一个会话后丢失的问题。
- content与reforge必要回归、editor相关工作流/UI测试；全仓lint/格式/typecheck零error/warning/info，PAL作者校验及docs/设计控件gate。
- Root独立复核差异/真实入口，最小功能性浏览器核名称与可编辑字段；剧情纯元数据不重复执行既有RF001～003报告。
- 6012更新前确认无草稿；不停止服务、不关闭页面。已核作者内容去除新增entity.label后须与冻结基线逐项一致。

## 当前模式推进记录

- Root前提 verified：直接读取以上模型、UI、保存合并和持久寻址代码；反证项可由回归证明。
- 范围/设计 agree；用户批准实例名称，不授权身份重写。Codex build allowed（2026-10-02）。
- 贡献者自验 pending；Codex独立验收 pending；用户体验 pending。
- 旧固定三席签字不适用当前临时模式；独立验收仍不可由实现自验替代。

## 已核作者命名收据（Root，2026-10-02）

| 场景/实体 | 实例名称 | 直接依据 |
| --- | --- | --- |
| s001/e8 | 密道遮挡物 | RF001实际密道开启图及`docs/testing/e2e-001.md:193`纠正旧“锅具”误称；不从sprite-55推断身份。 |
| s001/e10、e11 | 李大娘（房内走动）、李大娘（床边） | RF001真实参与矩阵；`opening-matrix.mjs:195–215`床边替身隐藏→行走婶婶显示，现行s001正文同坐标换身。 |
| s001/e19 | 李大娘（厨房） | actor=li-daniang；RF003厨房126/127交代端菜。 |
| s003/e56 | 李大娘（走廊与大厅） | actor=li-daniang；RF002接待、下楼及RF003大厅交谈。 |
| s003/e59、s001/e24 | 苗人头领 | RF002走廊头领；进房方案显式显示s001/e24并隐藏s003/e59；房内身份为相邻正文核读，不冒充本批入房交互。 |
| s003/e60、s001/e25 | 苗人随从（开门） | RF002开门随从及原进房正文显示s001/e25；职责名，不发明人物本名。 |
| s003/e61、s001/e26 | 苗人随从（随行） | RF002跟随进房及原正文显示s001/e26；房内实例为正文核读。 |
| s003/e62 | 醉酒道士（客栈门口） | RF003首次讨酒及现行对白/门口醉卧姿势；用本段身份，不凭外观猜人名。 |

共12个实例字段。Root从Git读取冻结f5726a504的两场景，当前树仅删除entities[].label后deepStrictEqual，
所有ID、坐标、精灵/actor、页、对白、指令、路径、去向均零差异。其余实体不猜名，随后续E2E继续。

## 下一位 Agent 提示词

接手EDITOR-ENTITY-NAMES-1，状态build。先读AGENTS.md、CLAUDE.md、第二阶段READ-FIRST、本卡及引用锚点。
你是唯一实现写入Owner，在指定候选树实现实体label及可读编辑器，修改packages/content与packages/editor及相关测试，
不写PAL内容/文档，不改6012主工作树，不改ID/运行逻辑/save/schema版本/规则配置，不恢复转换核。
特别检查主属性会话和脚本会话的即刻名称一致性、真实保存重开、同名不同ID、草稿串写。
使用apply_patch，按触发规则读pnpm/Vitest等skill；自测留日志，提交候选但不合main、不关闭服务、不操作用户浏览器。
输出SHA、修改范围、红→绿与验证证据、风险；Root独立review后决定接收或返工。不得自行标done。
