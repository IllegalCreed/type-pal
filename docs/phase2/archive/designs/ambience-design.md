# 氛围系统(W6 昼夜)设计 — 全帧乘法滤镜 + 氛围数据表

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: design-spec-v1 / 1.0.0

本页把历史设计正文接入 `design-spec-v1`，并保留 archive overlay。原始日期、方案语义、版本数字、冲突、未知项和链接均通过下方逐行引用保全；本页不授予当前产品、runtime、E2E、视觉或 coverage 信用。

## 问题与目标

- 历史设计问题/目标：W6 只做昼/夜；以全帧乘法调色拟合原版，WorldState ambience 单值，setAmbience 脚本命令，300ms 渐变，编辑器预览和 12 场景手补迁移。
- 文档身份：phase2 / archive；原始状态为 `archived`，当前有效性固定为 `historical`。
- 本次目标：让历史设计具备可检索的设计章节和历史边界，不把当时方案改写成当前合同。

## 真值与约束

- 固定源 revision：`45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA：`7fc897e7bb51fe2fa77d5b6c9c60998ef7c881be9b35c6f3c2fc0f6aa9451def`；原文 98 行、5279 bytes。
- 一手来源/正文锚点：docs/phase2/archive/designs/ambience-design.md:1-1；标题锚点：1:氛围系统(W6 昼夜)设计 — 全帧乘法滤镜 + 氛围数据表, 7:0. 一句话, 13:1. 原版语义(考证), 23:2. 夜色拟合(数据出处,非拍脑袋), 37:3. 数据模型(content), 50:4. 脚本指令, 60:5. 渲染(引擎), 72:6. 迁移(不动迁移器 —— MG2 红线)。
- 当前阶段证据：本批只做文档全文读取、语义分层和字节保全；current contract 必须回读继任规范、当前代码和真实调用域。
- 不可违反的约束：历史状态词只描述原文时点；旧 schema、迁移计划、done/待审标签和演出设想不得单独证明今天的实现。
- 未知与冲突：
- ambiences.json/自定义黄昏天气、真实时间流逝和天气明确是设计边界或后续阶段，不是现行合同。
- 历史 contentVersion、脚本入口和滤镜实现需与当前 content22/视觉实现重新核对。

## 方案

- 原始方案语义：W6 只做昼/夜；以全帧乘法调色拟合原版，WorldState ambience 单值，setAmbience 脚本命令，300ms 渐变，编辑器预览和 12 场景手补迁移。
- 本次治理方案：将上述语义拆入问题、真值、方案、边界、验收五个可定位章节；原文不删节，以 quote 作为唯一完整正文保全层。
- 继任关系：
- docs/phase2/specs/content-schema.md
- docs/phase2/READ-FIRST.md
- 当前 visual/runtime ambience 调用域（如存在）
- 明确不做：不执行原文迁移/实现步骤，不恢复 legacy fallback，不把历史计划、Self-Review 或静态审计当作 runtime/E2E/视觉/coverage 结果。

## 边界与风险

- 历史边界：本文可以说明当时为什么设计、如何计划和哪些问题已被识别，不能替代当前 canonical 文档、源码、测试或用户裁决。
- 主要冲突/风险：
- ambiences.json/自定义黄昏天气、真实时间流逝和天气明确是设计边界或后续阶段，不是现行合同。
- 历史 contentVersion、脚本入口和滤镜实现需与当前 content22/视觉实现重新核对。
- 停止线：不得把天气/实时钟或旧 ambience 表当作当前功能，也不得以文档推断运行时或视觉通过。
- 若重新启用：必须以当前一手来源重新核对 schema、版本、调用方、合法输入和业务 oracle，并建立新的 review record；不得沿用本页日期作准入。

## 验收

- 可执行验证：模板章节完整；原文 quote 去除 `> ` 前缀后与 source UTF-8 字节逐字节相等；source/after SHA 写入 central review、registry、catalog 和 evidence receipt。
- 业务 oracle：历史结论、日期、状态、数字、链接、未知和冲突可定位；任何当前性主张都有继任入口或明确停止线。
- 本次执行范围：只读源、模板迁移、账本同步和静态治理门；runtime、E2E、视觉、coverage 均未运行。
- 复核 Owner 与截止条件：Codex 独立复核本页及三账本；非作者候选验收通过前保持 build/review，不标全量完成。

## 历史范围

- 原始范围：phase2 archive design；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，原始正文 SHA `7fc897e7bb51fe2fa77d5b6c9c60998ef7c881be9b35c6f3c2fc0f6aa9451def`，原文日期和版本轴以 quote 为准。
- 归档原因：正文混合历史设计、阶段计划和后来附录；继任规范/代码已经承担当前合同，故本页只保留历史证据。

## 原始结论

- 氛围系统(W6 昼夜)设计 — 全帧乘法滤镜 + 氛围数据表：这是 design-spec，当前文档状态为 historical。全文 99 行、11 个标题；摘要/首段为「> 2026-07-10 用户拍板。范围:**只做昼夜**。2026-09-03 用户进一步裁决：真实时间流逝与天气」。属于历史/归档材料，不能单独证明当前实现。
- 上述结论只属于其原始日期和适用范围；本页新增的结构化表述不改变原始结论。

## 当时证据

- source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `7fc897e7bb51fe2fa77d5b6c9c60998ef7c881be9b35c6f3c2fc0f6aa9451def`；全文 98 行 / 5279 bytes。
- 原文标题/章节锚点：1:氛围系统(W6 昼夜)设计 — 全帧乘法滤镜 + 氛围数据表, 7:0. 一句话, 13:1. 原版语义(考证), 23:2. 夜色拟合(数据出处,非拍脑袋), 37:3. 数据模型(content), 50:4. 脚本指令, 60:5. 渲染(引擎), 72:6. 迁移(不动迁移器 —— MG2 红线)。完整正文与链接、表格、代码、历史状态词在下方 quote 保留。

## 当前有效性

historical。不得将历史设计字段、迁移步骤、旧版本号、done/待审标签或静态审计结果外推为当前事实。
- 当前不得外推的部分：不得把天气/实时钟或旧 ambience 表当作当前功能，也不得以文档推断运行时或视觉通过。

## 继任文档

- 当前 canonical / 复核入口：docs/phase2/specs/content-schema.md, docs/phase2/READ-FIRST.md, 当前 visual/runtime ambience 调用域（如存在）。
- supersedes / superseded-by：本页保留旧结构化记录作为历史；当前合同由继任规范、代码和新的独立审查记录决定。
- 重新启用条件：新的 primary source、版本/适用范围、合法输入、business oracle、可证伪观察和独立验收齐备。

## 原文保全

固定源 SHA `7fc897e7bb51fe2fa77d5b6c9c60998ef7c881be9b35c6f3c2fc0f6aa9451def`；以下 quote 只增加 Markdown blockquote 前缀，逆回读必须得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> # 氛围系统(W6 昼夜)设计 — 全帧乘法滤镜 + 氛围数据表
>
> > 2026-07-10 用户拍板。范围:**只做昼夜**。2026-09-03 用户进一步裁决：真实时间流逝与天气
> > 不在第二阶段重开，统一移交第三阶段。
> > 观感真值:**一阶段夜色**(用户指示:先参考一阶段夜晚色彩风格,再微调滤镜)。
>
> ## 0. 一句话
>
> 原版「夜晚调色板」在数学上就是一次逐通道乘法(实测拟合,见 §2)——清洁重写用
> **每帧最后一条 Canvas `multiply` 合成**复现它,零调色盘概念;夜色是 content 数据
> (`ambiences.json`),作者可自定义新氛围(黄昏/水下/血月),引擎零改动。
>
> ## 1. 原版语义(考证)
>
> - `0x53` = 用白天调色板(`fNightPalette = FALSE`);`0x54` = 用夜晚调色板(TRUE)。
>   sdlpal script.c:1802/1809。**全局 flag,跨场景持续**,只被脚本改;随存档。
> - 夜盘作用于**整个画面**(全局调色板):UI 也染(菜单米白 [199,186,174]→[93,166,174],
>   描述黄 [243,239,93]→[113,215,93] —— 数据实证,不是只染世界)。
> - pal 使用量:**13 处 / 12 场景**(迁移器 unmigrated 挂账):
>   昼 s011/s020/s034/s036/s037/s038/s043/s048,夜 s033/s035/s042/s097/s195。
>   考题 = s042 隐龙窟外夜景。
>
> ## 2. 夜色拟合(数据出处,非拍脑袋)
>
> palette 0 的 `colors` vs `nightColors` 逐通道比值(>20 的分量,n≈600):
>
> | 通道 | 中位 | p10–p90 |
> |---|---|---|
> | R | 0.458 | 0.440–0.473 |
> | G | 0.899 | 0.867–0.914 |
> | B | **1.000** | 1.000–1.000 |
>
> 分布极窄 = 原版夜盘就是**均匀乘法**(往深蓝压,蓝通道不动)。
> → 起步滤镜 = multiply `rgb(117,229,255)`(= 0.458/0.899/1.0 × 255)。
> 最终值以 **s042 与一阶段并排截图对比**微调定案。
>
> ## 3. 数据模型(content)
>
> ```ts
> /** 氛围定义:全帧乘法色。day = 恒等([255,255,255])= 不染。 */
> interface AmbienceDef { id: string; name: string; tint: [number, number, number] }
> ```
>
> - `content/ambiences.json`(manifest.content.ambiences 声明才加载;缺省 = 空表)。
> - pal 带两条:`day`(恒等)+ `night`(拟合值)。
> - `WorldState.ambience?: string` —— **全局单值**(照原版 flag 语义),默认 `'day'`,
>   只被脚本指令改,跨场景持续,随 SavePayload.world 免费持久化(旧档缺省 → day)。
>   **不加 per-scene 默认字段**:原版 13 处全走 onEnter 脚本切换,模型够用(YAGNI)。
>
> ## 4. 脚本指令
>
> ```ts
> | { kind: 'setAmbience'; ambience: string } // 0x53(day)/0x54(night) 的 clean 表达
> ```
>
> - ScriptHost 加 `setAmbience(id: string): void`(main.ts 唯一实现;scriptHost/autoHost
>   是 `{...host}` 委托自动继承)。
> - 未知 id → warn + 不动(工程没带 ambiences 表时指令自然 no-op)。
>
> ## 5. 渲染(引擎)
>
> - main.ts 持 `ambienceFx`:当前乘色 + 目标乘色 + 300ms 线性过渡(原版切换都夹在
>   黑屏淡入淡出里,渐变只是兜底更顺滑;确定性 time-based,纯视觉无输入门,无收尾人问题)。
> - **每帧最末**(一切 UI 画完后)一条:
>   `globalCompositeOperation='multiply'` + fillRect 全画布。恒等色(≥254 全通道)跳过。
> - **两个出口都挂**:tick 的战斗分支早退(`activeBattle.render` 后)+ 大世界路径末尾
>   —— 夜里进战斗照染(原版夜战就是夜盘,一阶段同)。
> - 普通编辑器场景画布**不染**（创作视图恒白天）。氛围工作台另有显式、只读的场景效果预览：它复用当前作者
>   快照和场景 renderer，在独立 surface 上调用 runtime 同一 multiply compositor；场景、相机、缩放和原图/滤镜
>   A/B 只属于临时预览上下文，不写入 content、撤销栈或存档。完整脚本过渡、战斗和 UI 染色仍走引擎试玩 / E2E。
>
> ## 6. 迁移(不动迁移器 —— MG2 红线)
>
> 手补 12 个场景 JSON 的 13 处 `{kind:'unmigrated',opcode:83/84}` →
> `{kind:'setAmbience',ambience:'day'|'night'}`(一次性脚本,同 C3 洗 desc 套路)。
>
> ## 7. 编辑器
>
> - 指令手册(command-catalog)+ CommandForm:setAmbience 表单(氛围下拉,origin 0x53/0x54)。
> - `ambiences` 入 EditorState/序列化 round-trip(同 battleFields 惯例,manifest 声明才产出)。
> - 氛围工作台：左侧定义目录；中央编辑名称/RGB/HEX 并以真实静态场景 A/B 预览；右侧只展示引用与生效说明。
>   新建氛围 = 作者自定义（血月/水下），右上角全局保存是唯一落盘入口。
> - 预览底帧按工程、场景、地图修订和资源身份缓存；改 tint 或切换 A/B 只重做末端合成，不重复组装场景，也不
>   执行场景脚本、实体行为、战斗、菜单或时间推进。
>
> ## 8. 验收
>
> 1. `?scene=s042`(onEnter 真跑)→ 夜色;与一阶段 game(6005)同场景并排截图,色差可辨则调滤镜。
> 2. s043 洞内 onEnter 0x53 → 回昼。
> 3. 夜态存档 → 读档 → 夜色还原;新档 = 昼。
> 4. 夜里开战斗 → 战斗画面同染。
> 5. `pnpm check` 全绿;编辑器指令表单可编可存。
>
> ## 9. 砍掉的(记录在案)
>
> - 时间流逝(游戏内时钟):原版无此机制,且与剧情脚本切换打架。不做。
> - 天气(雨/雪粒子):新子系统,无原版考题。有真内容需求再立项。
> - per-scene 默认氛围字段:onEnter 脚本已覆盖。真有作者需求(「这洞永远黑」)再加。
<!-- original-source-quote:end -->
