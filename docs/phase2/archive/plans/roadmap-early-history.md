# 第二阶段早期决策与推进快照

历史记录；当前顺序见 [路线图](../../roadmap.md)，已拍板决策见 [决策日志](../../decisions.md)。

## 7. 决议与待定

> **历史边界（2026-09-06 标注）**：本节的各「进展」条目是当时快照，仅供追溯；
> 其中“下一步”“待建”等表述**不是当前待办**。当前队列只看文末「当前第二阶段完整队列」。

**已决（2026-06-17）**

- ✅ **首个内容目标**：室内小场景（客栈 / 民居）跑通 + 改对话 + 加 NPC（见 §5）。
- ✅ **代号：Reforge（重铸）** —— 把忠实还原「重铸」为可创作的现代引擎。
- ✅ **受众**：先按**单人本地工具**设计，不做账号 / 协作 / 云同步 / 分发；但内容工程走「文件 + 版本化（git 友好）」，架构**不堵死**将来协作（与 §3 第 5 条的 MMO 留口一脉相承）。
- ✅ **package 架构（[D18](../../decisions.md) 厘清职责 + 阶段隔离）**：`@type-pal/content`（**内容数据模型** = schema + 纯逻辑）、`@type-pal/reforge`（新引擎）、`@type-pal/editor`（编辑器）、`@type-pal/migrate`（**迁移器**，独立成包、不再塞进 content）。内容实例（场景 / 对话数据）= 内容工程数据目录（非 npm 包）。**阶段隔离**：第二阶段代码不碰第一阶段包（shared / game / pal-extract），迁移器是唯一桥。

**已决（2026-06-22）**

- ✅ **P0 schema 草案**：见 [content-schema.md](../designs/content-schema.md)（三层状态 / 稳定 id / 场景包 / 事件演出 / 角色实例化 + 迁移器）。
- ✅ **第一阶段引擎架构债已审计**：见 [engine-debt-audit.md](../audits/engine-debt-audit.md)（18 条 finding，P0/P1/P2 分级 + 反查表），是 P1 新引擎 spec 的**反面输入**——重写时绕开这些模式，不照搬旧模块结构（铁律第 3 条）。

**进展（2026-06-28 更新）**

- **P1 切片 1 已起**：室内场景跑通（地图 / 移动 / 碰撞含 NPC / 遮挡 / 对话）；对话现代化（结构化 + i18n + 外观 + 去 palette，见 [D11](../../decisions.md)–[D15](../../decisions.md)）完成。
- **前置 [D16](../../decisions.md) 渲染地基已落地**（2026-06-28）：逻辑 / 显示分离（菱形轴格坐标 `GridPos={col,row,height}` + 物理 1280 + UI 高清化，[render-foundation-plan](render-foundation-plan.md)）。它是菜单及后续所有 UI / 美术 / 编辑器的底座。**下一步 = [D17](../../decisions.md) 菜单**（设计已定、地基就绪可落地）。
- **之后**：菜单 → 多场景 / 事件演出 → 编辑器（P2）。schema 边跑边补（§5 切入策略）；P1 spec 输入 = [content-schema](../designs/content-schema.md) + [engine-debt-audit](../audits/engine-debt-audit.md)。

**进展（2026-07-02 更新）**

- **A 期工程化落地**：壳/肉分离（`projects/<id>/` 工程 = manifest + content JSON + assets 自包含），reforge 零具体游戏 import（[project-design](../designs/project-design.md)）。
- **编辑器 B1 布置模式 MVP 落地**：模式壳 + 画布复用 reforge 渲染 + command/undo + 选/拖/增删/FSA 保存（[editor-design](../designs/editor-design.md)）。
- **角色/精灵动画模型与创作闭环已落**：统一 ActorDef + SpriteLayout（[actor-model-design](../designs/actor-model-design.md)）；C1-1 已于 2026-08-14 完成角色 CRUD、预制人物/自定义实体双轨、引用处置和用户验收；C1-2 完成 content14 结构化对话人物身份；C1-3 第一批经用户 exact digest 审批后发布李大娘/酒剑仙 2 个 NPC Actor、6 个 entity 与 163 个 cue，三方审查和用户验收均完成。未批准候选继续保持 deferred。
- **编辑器后续整体审查方向已记录（2026-08-14，2026-08-15 用户补充拍板）**：B2 完成后先冻结一份
  完整、可执行、可验收的编辑器设计规范，再以该规范为尺分三线审查全编辑器——视觉/交互统一、ED-1
  七环创作闭环、Reforge/Editor 代码质量与重构。角色模块与战场模块是参考输入，不是两套各自扩张的
  局部标准；资源图像预览（当前挤在上方且不能缩放）和战斗模块布局是首批反例。规范未冻结前不得逐模块
  凭感觉翻新；B2 与 ED-DS-1 已于 2026-08-15 用户验收 done，设计规范 v1.0.0 已冻结。下一步为
  ED-DS-2 代码化 tokens、shared primitives 与 Design Lab。见
  [editor-modernization-follow-up](../audits/editor-modernization-follow-up-2026-08-14.md)。
- **脚本兼容决策拍死（原 content-schema §6 待定项）**：迁移器把原版脚本**翻译**成结构化脚本（[script-system-design](../designs/script-system-design.md) 的 AST），**不建永久 opcode 兼容执行器** —— 双解释器 = [engine-debt-audit](../audits/engine-debt-audit.md) P0-5/P0-6 的债重生。翻不净的意大利面脚本（有限集）迁移器标注 + 编辑器手修。

**进展（2026-07-04 更新）**

- **事件模式编辑闭环落成**：演出预览（播放 / 单步 / 命令高亮 / 日志桩）+ 脚本编辑 v1（选行改参 / 插删移 / undo / 保存）+ 事件模板库（按 4382 段触发脚本形状统计提炼：宝箱 / 拾取 / 得钱 / 跨房间镜头 / 钻洞 / 搭话，插入即展开、「自身」感知）。
- **事件抽象三层定调（2026-07-04 用户）**：① schema 命令 = opcode 语义抽象（已有）；② 编辑器插入模板 = 成组模式展开（已落地，不做黑盒高层命令）；③ **共享脚本 / 子程序**（callScript 的 clean 版：同一逻辑多处引用、改一处全生效）——**DLC / 批量内容期的刚需，届时立项**；迁移器现按内联展开，升级时需去重提炼。
- **N6b 意图式创作裁决（2026-09-03 用户拍板）**：第二阶段在薄 E2E 基线后完成四种内置取物意图、
  类型化参数持久化、业务表单回编辑和单向展开；2026-09-05 因 SceneIndex 先占用 content20，N6b 原子
  切换顺延为 content21。作者自定义模式、表达式、组合及
  完整对话/演出工作台留到第三阶段。现有 N6 v1 仍保持完成，N6b 不反向降级它。范围与顺序见
  [design-backlog N6b](../../design-backlog.md#n6b-强类型脚本模式库)。
