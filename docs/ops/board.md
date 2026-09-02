# 三贤人系统任务看板

这张看板只记录当前进行中和阻塞任务。候选任务看 `docs/phase2/capability-map.md`（任务卡 `Capability` 字段对应地图格号；议题型卡 D6/D12/D13/D14/D15 落点见地图 §3.1「议题→格映射」），完成记录看 git log 和任务卡。

> **2026-08-15 额度状态：Kimi、GLM 均可用。** ED-DS-2 恢复完整三贤人流程：Kimi 主审架构/视觉，
> GLM 主审覆盖/测试；两席对最新版重签后才可 build，不再走额度豁免。

工作流: [`agent-workflow.md`](agent-workflow.md)
任务卡模板: [`tasks/TASK-template.md`](tasks/TASK-template.md)
轻量模板: [`tasks/TASK-lite-template.md`](tasks/TASK-lite-template.md)

## 进行中

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| ED-INPUT-PERF-1 | 编辑器输入提交与全局派生状态性能收口 | done | 三方 accept + 用户确认齐，整卡收口 | `a7109fd4`：五字段 commit max 8.6–18.2ms、urgent Long Task 0 |
| ED-DS-3 | 编辑器设计系统全量采用与防回流门禁 | done | 三方 accept 齐，整卡收口 | `9dd4e4a3`：25 页面采用闭包、公共 owner、三态静态门禁与精灵虚拟滚动完成 |
| ED-FLOATING-LAYER-ADOPTION-1 | 编辑器浮层真实采用收口 | done | 三方 accept + 用户验收齐，整卡收口 | 25 路由 overlay evidence 双向闭合；浮层边界、Escape 与焦点归还复验通过 |
| ED-TEXT-OVERFLOW-1 | 编辑器文本截断与完整值披露合同 | done | 三方 accept + 用户复验齐，整卡收口 | 8 面迁移、148-arm 门禁、RF-06、条件 Tab stop/SHA 全量 DOM 与独立复跑均通过 |
| ED-FIELD-LAYOUT-1 | 编辑器字段标签列与响应式布局合同 | done | 三方 fresh accept + 用户末轮小修直接验收齐，整卡收口 | 六族共享效果卡、手柄/字段对齐、语义标题与投掷演出单开关闭合 |
| ED-NUMBER-FIELD-1 | 编辑器数字控件与响应式数值字段密度合同 | done | 三方当前实现 accept + 用户复验齐，整卡收口 | 36 文件/111 leaf 门禁闭合；Skill `关闭 -> 1 -> 关闭` 用户反例复验通过 |
| ED-FIELD-COMMIT-1 | 编辑器字段草稿、提交与撤销边界统一 | done | 三方 accept + 用户验收齐，整卡收口 | `b118ce3a`：公共草稿/提交合同、首批采用与 AST 防回流门禁完成 |
| ED-ADD-PICKER-DIALOG-1 | 编辑器候选对象添加弹窗统一 | done | 三方 accept + 用户验收齐；`0787197d` 已推送 | DsAddPickerDialog v2.13.0、4+7 AST census 门禁、234/225 项 14 行有界挂载、四 adapter 单命令 |
| ED-REORDER-DRAG-1 | 编辑器有序集合拖拽手柄统一 | done | 三方 accept + 用户复验齐，整卡收口 | Startup inventory 唯一遗漏动作槽已封组；1280/900/720 组内不拆行、无溢出 |
| ED-REORDER-SURFACE-1 | 编辑器排序项可见边界与列表表面合同 | done | 全部增量三方 accept + 用户验收齐，整卡收口 | contentLayout form/list；Shop 公共 panel + danger 下架；角色视觉与 surface 四桶闭合 |
| ED-ACTION-GROUP-SPEC-1 | DsActionGroup 公共规范与当前采用闭合 | done | 三方 accept + 用户验收齐，整卡收口 | `1c320ce0`：DS 2.22.0；8/46/16/30/15；1 equivalent +14 deferred；单枚与1→3均必红 |
| ED-ACTION-GROUP-ADOPTION-1 | 同项动作组采用第一批（战斗 / 毒回合；项目设置 / 入口点） | done | `d8b04a23` 三方 accept + 用户验收齐，整卡收口 | 280同排正文98px；279/235下沉165/121px；10/46/20/26/13闭合 |
| ED-ACTION-GROUP-ADOPTION-2 | 帧动画时间线动作组与纵向可见边界 | cancelled | 用户否决大卡/独立grip/左右按钮；由RESTORE-1替代 | 未实现；旧186px方案失效 |
| ED-FRAME-TIMELINE-UX-RESTORE-1 | 帧动画原始卡片拖拽形态恢复 | done | 用户验收通过；Kimi/GLM签字豁免在案，整卡收口 | `f019ba8d`：72×76/78/86/visible/native drag恢复；1523全绿，三档实机通过 |
| ED-ACTION-GROUP-ADOPTION-3 | 地图与组合库图层动作组及窄栏合同 | review | `44c0cfd5` Codex + Kimi accept；待 GLM 覆盖终审与用户验收 | 三组+320/216换轨；1534全绿，DS2.23.0与13/44/22/22/11闭合 |
| ED-SPRITE-ACTION-MODAL-1 | 大世界精灵预制动作中心弹窗编辑器 | draft | 依赖RESTORE-1/ADOPTION-3；用户形态批准；三方 design 签字齐，依赖齐后可 build | 中央Hero+单一Dialog+源帧区+搜索listbox；目标DS2.24与action15/42/24/18/9、reorder17/27/30/19 |
| ED-FRAME-TIMELINE-VIRTUALIZATION-1 | 长帧动画时间线 DOM windowing | cancelled | 用户恢复旧形态后合并入RESTORE-1；历史卡保留 | RESTORE-1接管visible window与410帧DOM上界验收 |
| ED-FIELD-LABEL-TRACK-WIDE-1 | 编辑器整组宽标签轨合同 | done | 三方 accept + 用户验收齐，整卡收口 | `6e7999ef`：wide=160px/<560 stacked；RoleBindings 唯一采用；DS 2.21.0 |
| ED-ITEM-ALCHEMY-SURFACE-1 | 炼蛊皿与紫金葫芦双炼化工作台 | done | 全部增量三方accept + 用户验收齐，整卡收口 | Craft header/handle/formula稳定对齐；Stepper outer与控件统一36px，三态/高对比闭合 |
| ED-PROJECT-STARTUP-IA-1 | 入口与开局 / 全局资源与启动工作台收口 | done | 三方 accept + 用户复验齐，整卡收口 | 数量改为可见字段 + 公共 short-number measure，三动作成为原子槽；其余验收通过 |
| ARCH-ACTOR-CONDITION-SEED-1 | 入口与剧情入队角色当前状态播种 | done | 三方 accept + 用户验收齐，整卡收口 | content19 三 carrier 全链闭合；三路只读审计无剩余 blocker，PAL replay 为零 |
| ED-CATALOG-ROW-IA-1 | 编辑器对象目录行信息层级收口 | done | 三方 accept + 用户复验齐，整卡收口 | Hero 56px 复用 idle.start，同缓存防串图；EnemyTeam/Vars 无媒体，六面 census 闭合 |
| ED-WORKSPACE-ADOPTION-DEBT-1 | 编辑器旧工作区滚动壳真实采用清零 | draft | 待逐文件真值与 Codex/Kimi/GLM build 前设计签字；不得实现 | 清零 6 文件 bounded raw `ds-object-workspace*` 旧债 |
| MIG-PAL-MAP-NAME-1 | PAL 一阶段考据地图名迁入二阶段 | done | 三方 accept + 用户验收齐，整卡收口 | 222/294/221/223/2、s230/s243 双钉、shared 专用边界、104/164 精确占位与 replay 全 0 均已终审 |
| MIG-PAL-ITEM-SCHEME-LABEL-1 | PAL 物品剧情方案作者命名收口 | done | 三方 accept + 用户验收齐，整卡收口 | 53 label-only 两侧镜像、49/11/4 闭包、292×13/273×12 消歧、machine-inner 同步、转换器/upgrader/fallback 清零均双席独立复算 |
| MIG-PAL-STORE0-SHOP-BOUNDARY-1 | PAL Store[0] 奖励表与商店边界收口 | done | 三方 accept + 用户验收齐，整卡收口 | Shop 20家；writes=1→双零计划；sell shop0 原值保留；migrate 391 全绿 |
| MIG-PAL-CRAFT-FAILURE-MESSAGE-1 | PAL 炼蛊失败原文迁移闭环 | done | 三方 accept + 用户验收齐，整卡收口 | strict producer + publication 接线；三文件 exact diff、writes=1→双零、migrate 402 绿、浏览器预填通过 |
| MIG-PAL-GOURD-FAILURE-MESSAGE-1 | PAL 紫金葫芦零灵葫值原文迁移闭环 | done | 三方 accept + 用户验收齐，整卡收口 | 三文件 exact diff、writes=1→双零、migrate 410 绿、编辑器预填通过 |
| ARCH-ENTRY-ACTOR-SEED-1 | 入口角色完整初始状态所有权与快照模型 | done | 三方 accept + 用户验收齐，整卡收口 | content18、首次技能播种、当前 HP/MP 继承 UI 与 PAL replay 已完成 |
| MIG-PAL-ROLE-SPRITE-ALIAS-CLOSURE-1 | PAL 角色大世界精灵语义别名全量闭包 | done | 三方 accept + 用户验收齐，整卡收口 | `0e84e565`：4 定义 + 44 引用归一，严格重复为 0，replay 零计划 |
| MIG-PAL-WORLD-SPRITE-ALIAS-1 | PAL 大世界角色精灵语义别名收口 | done | 三方 accept + 用户确认齐，整卡收口 | `bde33d13`：1 重复定义 + 7 引用归一，迁移零计划，migrate 354 tests 全绿 |
| ARCH-ENTRYPOINT-CANONICAL-1 | 显式启动入口与独立开局配置 | done | 三方 accept + 用户验收齐，整卡收口 | content17 三工程 canonical；默认/显式/menu/?scene 语义与编辑闭环已实现，终审无返工项 |
| ARCH-CURRENT-ONLY-1 | 开发期单版本架构收口 | done | 三方 accept + 用户验收齐，整卡收口 | 旧产品版本层、升级入口与兼容 fallback 已清零；PAL replay 零差异 |
| ED-PAL-WORKSPACE-MODES-1 | PAL 开发基线、评审沙盒与种子晋升边界 | done | 三方 accept + 用户验收齐，整卡收口 | GLM 终审：GP1-GP3/KP1-KP2 全落，focused 68+20 复跑全绿 | Codex accept；editor 134/981 + typecheck，全链路内部压力审查 P0/P1/P2 清零 |
| MIG-PAL-ACTOR-FACE-1 | PAL 角色小头像缺席语义与迁移收口 | done | 三方 accept + 用户验收齐，整卡收口 | 迁移 replay、受控退休与默认头像兜底均已核验 |
| ED-ENTITY-INSPECTOR-IA-1 | 场景实体 Inspector、状态指令与删除入口收口 | done | 三方 accept + 用户验收齐，整卡收口 | 唯一指令入口、三 Tab、中文状态/朝向帮助、行尾删除与真实 PAL 294 场景回归闭环 |
| ED-MEDIA-ASSET-ACTIONS-1 | 媒体资源对象操作与生命周期统一 | done | 三方 accept + 用户验收齐，整卡收口 | 集合动作归左栏、当前资源动作归 Hero；live 引用、fail-closed 删除与二进制 undo 闭环 |
| ED-AUDIO-WORKBENCH-1 | 音乐 / 音效统一资源工作台与音频时间轴 | done | 三方 accept + 用户验收齐，整卡收口 | 播放终点、滚动与浮层返工已复验 |
| ED-AMBIENCE-WORKBENCH-1 | 氛围滤镜工作台与真实场景预览 | done | 三方 accept + 用户验收齐，整卡收口 | 共享 compositor、真实场景 A/B 与控件合同已核验 |
| ED-DS-2 | 编辑器设计系统代码基础与 Design Lab | done | 三方 accept + 用户验收齐，整卡收口 | 四入口同源、WK2 与 sash 边界复审通过；全量 118/872 独立复跑全绿 |
| ED-AUDIT-2 | 编辑器全页面视觉、闭环与代码质量审计 | done | 三方 accept + 用户验收齐，整卡收口 | GA1/GA2 闭环（门禁 18/17/17/6）；census 脚本可复现、boundary 23/23 |
| ED-BATTLE-UI-1 | 战斗数据工作台族与共享对象 Hero | done | 三方 accept + 用户验收齐，整卡收口 | N1-N6/BK1-BK3 + RK1 全闭环；editor 124 files / 912 tests + typecheck、1280×720 实机通过 |
| ED-ENEMY-1 | 敌人、敌队预制与结算/偷取编辑闭环 | done | 三方 accept + 用户验收齐，整卡收口 | content15 稳定 enemyTeamId、敌队七环、奖励/偷取单权威；380/828/174/0 与四包全测通过 |
| ED-ENEMY-DEFEATED-EVENT-1 | 敌人击败后结果可读化与安全编辑边界 | done | 当前返工三方 refreshed accept + 用户复验齐，整卡收口 | `偷物 125 ×9 -> 偷物 断肠草 ×9` 复验通过；41/41 聚焦绿，schema/runtime/data 不变 |
| ED-SCENE-UX-1 | 场景画布直接操作与取消选择 | done | 三方 accept + 用户验收齐，整卡收口 | SK1+G1-G3 逐钉通过；focused 10 + 全量 930 独立复跑全绿 |
| ED-INSPECTOR-TABS-1 | 属性面板共享 Tab 全局统一 | done | 三方 accept 齐，整卡收口 | 24 页审计无漏项；GT1-GT5+IK1、共享计数徽标、浏览器矩阵与 885 项全测通过 |
| ED-REFERENCE-UI-1 | 属性面板引用呈现全局统一 | done | 三方 accept + 用户确认齐，整卡收口 | 16 面统一；RK1-RK2/GN1-GN4 逐钉通过；当前 editor 892/892 全绿 |
| ED-DIAGNOSTIC-UI-1 | 属性面板问题与诊断呈现统一 | done | 三方 accept + 用户验收齐，整卡收口 | DK1 数值门禁单一 frame、DK2 六面内联无新 Tab、cf-err 正向保护；focused 82 + 全量 927 独立复跑全绿 |
| ED-CATALOG-CONTROLS-1 | 编辑器全局目录筛选区统一 | done | 三方 accept + 用户验收齐，整卡收口 | GC1-GC5/CK1-CK2/RK-A 全闭环；editor 912 复跑全绿；palette debt 见 ED-MAP-PALETTE-CONTROLS-1 |
| ED-WORLD-VARIABLES-1 | 世界变量定义表与作者工作台 | done | 三方 accept + 用户验收齐，整卡收口 | 变量定义/初值/全 owner 引用闭环；editor 131 files / 975 tests + typecheck 全绿 |
| ED-SHARED-SCRIPT-UI-1 | 可复用脚本工作台与通用脚本控件收敛 | done | 三方 accept + 用户验收齐，整卡收口 | owner-context 工作台与公共脚本控件收敛；editor 131 files / 975 tests + typecheck 全绿 |
| ED-STAMP-EDITOR-1 | 组合模板内容编辑闭环 | done | 三方 accept + 用户验收齐，整卡收口 | 共享 content/画布、多来源、relative H 与会话级引用索引落地；全量门禁复绿 |
| ED-MAP-PALETTE-CONTROLS-1 | 地图组合 Palette 控件统一 | done | 三方 accept + 用户验收齐，整卡收口 | Palette 行为/边界与共享控件统一；editor 131 files / 975 tests + typecheck 全绿 |
| ED-STAMP-MAP-MODEL-1 | 组合/地图共享内容模型与相对高度 | done | 三方 accept + 用户验收齐，整卡收口 | 唯一 v4、relative H、共享 content/画布与当前工程切版完成；全量门禁复绿 |
| ED-MAP-MULTI-TILESET-1 | 地图多瓦片集作者模型 | done | 三方 accept + 用户验收齐，整卡收口 | 紧凑 source matrix、runtime/编辑/组合放置与 223 图迁移完成；全量门禁复绿 |

## 看板规则

- 看板只写当前可行动状态,不维护候选池和完成历史。
- `负责人/下一步` 是用户拍板保留的唯一责任列。
- 细节、证据、讨论、验证结果放任务卡。
- 任务阻塞时,在阻塞区写清楚缺哪个决定或输入。
