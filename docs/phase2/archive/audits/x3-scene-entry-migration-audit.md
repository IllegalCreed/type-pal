# X3-1 场景入场迁移审计

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: audit-report-v1 / 1.0.0

本页是 audit-report 的历史语义迁移。原始结论、日期、状态、数字、冲突和未知项保持在页内；本页不授予当前产品、runtime、E2E、视觉或 coverage 信用。

## 审计问题

- 历史问题：07-15 X3-1 场景入场迁移审计与数据规模快照。
- 停止线：原稿中的 done/open/✅/❌/unknown 只属于其声明日期；本轮不重签。

## 范围与证据

- 固定来源：`655b8c687cb3e568c85fa53084d503e40b845e6a`；本篇源正文 64 行、SHA `0bdd9f2df99e4217c1b0ff4f18740e7c8ccf3a8090d384029100e0af3d7f5129`。
- 复核范围：固定 11/17/13 场景清单、s001 音乐、s151 dither、829/294/297/47 和 idempotent0。
- 证据边界：无当前迁移、runtime、E2E、视觉或 coverage 信用。

## 发现

| 维度 | 历史发现 | 当前边界 |
|---|---|---|
| 问题 | 07-15 X3-1 场景入场迁移审计与数据规模快照。 | 仅历史范围 |
| 观察 | 保留 s182 override 与 s188 分片身份、共享安全目录及当时 classifier/validator/lifting 声明。 | 不升格当前事实 |
| 冲突 | 文件名不能推出 s182/s188 身份；旧穷尽声明与当前 consumer/保存轴并列。 | 保留并指向后继 |

## 结论

仅证明当时迁移数据和方法，不认证今天 Q 入场指南已完整消费或所有插入/保存门。

## 整改与复核

- 后继由 S203–211 与 Q 入场指南承担；不运行旧 scene-entry tests 或重做迁移。
- 下一入口：docs/phase2/guides/scene-entry-authoring.md；docs/phase2/specs/script-system.md
- 复核停止线：要重新打开任何红项，必须另有当前一手来源、合法输入、业务 oracle 和独立验收。

## 历史范围

- 源文件在 `655b8c687cb3e568c85fa53084d503e40b845e6a` 的历史快照；本次 only 文档结构/语义迁移，原日期轴不续期。

## 原始结论

- 仅证明当时迁移数据和方法，不认证今天 Q 入场指南已完整消费或所有插入/保存门。

## 当时证据

- 无当前迁移、runtime、E2E、视觉或 coverage 信用。；下方逐行 quote 保留原正文、链接、表格与未知项。

## 当前有效性

historical。文件名不能推出 s182/s188 身份；旧穷尽声明与当前 consumer/保存轴并列。

## 继任文档

docs/phase2/guides/scene-entry-authoring.md；docs/phase2/specs/script-system.md。继任入口不是本次产品或运行授权。

## 原文保全

固定源 SHA `0bdd9f2df99e4217c1b0ff4f18740e7c8ccf3a8090d384029100e0af3d7f5129`；以下只增加 quote 前缀，逆回读应得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> # X3-1 场景入场迁移审计
>
> > 日期:2026-07-15
> > 产物:`projects/pal`
> > 自动门禁:`packages/migrate/src/scene-entry-product.test.ts`
>
> ## 结论
>
> PAL 原始 `ditherScreen` 站点按“是否属于 onEnter，以及是否出现在安全同步前缀后”分成
> 三组。迁移器只提升第一组，后两组仍保留通用 `ditherScreen` 命令。
>
> ### 显式入场提升:11 场景
>
> `s001 / s018 / s057 / s090 / s151 / s180 / s182 / s196 / s197 / s198 / s200`
>
> - 10 个是 `root/on-enter/stage-0`。
> - 唯一 override 是 `scene/s182/override/on-enter/L-27448/stage-0`。安装该 override 的
>   `setSceneOnEnter` 命令物理位于 `scene/s188` 分片，但目标场景和稳定脚本 id 均是 `s182`；
>   不能用容器文件名猜目标场景。
> - `s001` 精确提升为 `prepare=[playMusic(31), teleportParty(59,-23)]`、
>   `reveal=dither(2160ms)`，body 第一条为李大娘对话。
> - `s151` 的第一个早期 dither 已提升，同一 body 后续仍有两个剧情 dither；“场景已提升”
>   不等于删除场景中所有逐像素特效。
>
> ### 独立站点反例:17 场景
>
> `s011 / s020 / s058 / s059 / s064 / s138 / s144 / s146 / s147 / s148 / s154 / s163 / s201 /
> s250 / s252 / s278 / s281`
>
> 这些站点在实体 trigger 或剧情编舞脚本中，以当前 presented frame 为 source，不是场景入场契约。
>
> ### onEnter 非早期反例:13 场景
>
> `s140 / s142 / s164 / s169 / s170 / s171 / s173 / s183 / s188 / s203 / s227 / s233 / s251`
>
> 这些 onEnter 在 dither 前已有非安全前缀，例如 `setActorSprite`、等待、对话或长演出。
> lifting 遇到第一个 blocked 命令即 fail-closed，不跨分支、不穿透调用、不猜执行路径。
>
> ## 安全与边界
>
> - `SCENE_ENTRY_PREPARE_SAFETY` 使用 `satisfies Record<Command['kind'], ...>` 穷尽命令联合。
>   validator 和 migrate lifting 共用该唯一分类源。
> - root onEnter 与 `setSceneOnEnter` override 独立扫描。运行时只读当前活动 stage 的
>   `entry` 元数据，不扫 body，不预读脚本分片。
> - 历史 `DETERMINISTIC_PREFIX_KINDS`、`hasEarlyDitherScreen` 与 `bindingHasEarlyDither`
>   已删除，实现包零引用。
> - dither 的 72 步、工程级假色 profile、source/target 像素算法和 2160ms 开场时长均未改动。
>
> ## MG2 迁移门禁
>
> 2026-07-15 完整 PAL 迁移结果:
>
> - 829 个内容文件，294 个场景，297 个脚本分片。
> - 体积比:`compact/all.json = 1.65x`、`pretty/all.json = 1.13x`、`commands/all.json = 1.53x`。
> - 第一次写入事务 47 个操作；迁移命令自带的第二次运行为
>   `writes=0 / deletes=0 / conflicts=0`。
> - 294 个场景校验通过，`warnings=0 / issues=0`。
>
> ## 回归门禁
>
> - `scene-entry.test.ts`:纯 lifting 规则，覆盖成功提升、分支/调用/等待阻断和已有 entry。
> - `migrate-content.test.ts`:`s001` 真实迁移集成，断言准备参数、呈现和正文边界。
> - `scene-entry-product.test.ts`:直接读取提交的 `projects/pal`，精确断言 11/17/13 三组清单、
>   s182 override 稳定 id 和 s001 开场参数。
<!-- original-source-quote:end -->
