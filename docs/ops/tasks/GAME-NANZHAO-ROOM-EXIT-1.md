# GAME-NANZHAO-ROOM-EXIT-1 - 南诏地宫中间房间出口回归

Status: done
Phase: phase1 / phase2
Capability: 地图传送与脚本纠错
Coding Owner: map204_investigation（隔离实现）；Codex（集成）
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Contributor: map204_investigation
Branch: codex/map204-input-rotation

## 目标

修复[issue #27](https://github.com/IllegalCreed/type-pal/issues/27)：第一阶段scene287/map204中间房间可进入且能离开；核清与此前D10脚本修复的关系，同时核第二阶段对应内容，避免单边修复。

## 范围

- 范围内：英文补丁原件、D10版本化纠错、原始事件与触发模式/位置、当前持久化状态、两阶段出口及往返回归。
- 范围外：无证据修改地图、未核验的传送口、全盘重烘焙、改变无关遇敌或迁移存档。
- 不直接编辑生成物替代上游修复，不把手动调用传送脚本当成触点可达。

## 前提真值门

### 一句话行为 / 工程前提

旧档完整事件表覆盖新版出口已稳定复现。按用户追加方向保留原遇敌，新增独立出口；加载时只补入资源作者明确新增且旧档缺少的实体，不重置其它进度。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 英文SSS把一基event4842由敌人改为(880,840)、mode5出口；43503–43506返回scene286 | 原始及英文Win SSS二进制，调查原件后续随回执固定SHA |
| 第一阶段 | 当前资源真实tick可退出；旧原始事件表配当前指令重现无法退出。线上事件表和指令表与当前本地逐字节相等 | issue #27；D10规则；调查`probe.json`及线上资源观察原件待随正式回执发布 |
| 当前二阶段 | canonical s286恢复原敌并加入独立zone；真实boot/input/touch退出并重新进房通过 | `projects/pal/content/scenes/s286.json` |
| 本任务目标 | 真实玩家沿门进房、走回门能退出；当前及既有存档影响分别核清 | 用户2026-10-27本轮反馈 |

### 反证与替代解释

- 不预认定“漏抄出口”：位置不在同连通区、触发mode、事件状态、旧存档覆盖、资源缓存均可能造成现象。
- 若原件和当前出口一致且真实tick可触发，应继续查存档/线上资源，不能无证据加新口。
- 旧档路径已可复现，但未取得issue作者本人存档；将其记为与报告一致的强推断，不能声称直接核过用户现场。

### 用户可见偏离

yes（用户2026-10-27追加方向）：从复用原遇敌作出口，改为保留原遇敌并新增独立出口。新游戏恢复原敌；已发布D10档里曾有的旧出口状态保留，不借修复倒推恢复历史遇敌。

## 上下文锚点

- [CLAUDE](../../../CLAUDE.md)、[质量](../code-quality.md)、[前置D10修复卡](GAME-SCRIPT-CORRECTIONS-1.md)、[Reforge铁律](../../phase2/READ-FIRST.md)、[E2E合同](../../testing/e2e/contract.md)。
- `scene-system.ts`实际自动触发；原件纠错层及s285/s286作者内容；raw一基scene287与canonical s286须明确区分。

## 验收条件

- 查原补丁入口/出口修改、D10整组前值/落点和两阶段真实生产caller；修复旧反例明确失败、新通过。
- 进门/出门完整链核坐标、连通区、触发事件与目的落点；至少覆盖中间房间，控制其它房间不误传。
- 旧存档/缓存如为根因给准确复现与最小处理；不为过测注入私有进度或掩盖状态变化。
- 实现逐文件八维、真实caller/oracle和测试排重；定向/相邻、受影响静态门零诊断；与输入卡集中稳定窗口再跑必要大门。
- 浏览器仅开发功能验证可用明确准备入口，不能冒充自然全剧情；正式剧情E2E按合同记录未跑边界。

## 当前模式推进记录

- Codex build allowed：原/英文SSS、真实scene/event tick与线上资源已核；按用户追加方向，map204_investigation在`codex/map204-exit`隔离实施supplemental独立出口、加载补缺及两阶段真实触发回归。根独占文档/集成。
- 白名单：shared资源类型、提取器现有纠错与场景/global输出、game窄helper与两场景装载caller和定向tests、canonical s286原敌恢复/独立zone及Reforge回归tests；不改Save/GameState schema/版本/通用触发语义/其它剧情/规则/coverage基线。
- 新ID从原生5077实体之后追加，不插入中段、不改变任何原ID或sceneRanges。场景加载只补显式supplemental缺项；已有新实体引用/状态保持，不覆盖未知撞ID。
- 旧replacement候选及其定向结果另保留为探索历史，不计最终新方案修复信用。
- 用户明确授权保留原遇敌并另加出口；本地结果已获用户接受；保护CI、合并与实际部署完成，见发布收口。

## Draft: 设计与风险

纠错计划声明独立supplemental对象，原始SSS实体数组不变；全局导出在尾部追加稳定ID，原生范围仍以原数组长度切片，只有所属场景导出包含该出口。第一阶段装载根据明确新增标记补缺，游戏引擎不含地图/实体ID/IP特判。canonical二阶段恢复原敌并加入独立zone，不加旧版本兼容。

## Build: 实现与自测

候选`1e00fd113886bb41ddf05f8913ecb89b4d1f383f`已本地集成为`4088bcd21`，21文件实际差异及逐文件A–H由Codex定向独立核验。新增资源标记、规则pal-win-2、稳定尾ID5077、原生范围、全局及所属场景脚本根均经过生产caller验证。真实party夹具补充`e4a78b9d`已集成为`f150c4922`；当前PAL5绿，83相同字节邻测复用、extract49与Reforge5421绿。断开补缺的完整文件4业务红/1pass/0skip、改错原敌的完整文件1业务红/5413pass/0skip均已精确恢复；早期过滤红不计正式信用。细节及全部原件见[独立接收回执](../evidence/GAME-NANZHAO-ROOM-EXIT-1/review.json)。

## Review: 审查与返工

原拓扑用例保留并改指独立出口；新增Save保存/导入/加载、真实scene/event tick与Reforge真实boot/input/touch。历史non-script hash保留原敌，严格核新zone后仅移除新zone做历史比较；不刷新旧hash/基线。统一静态门另见[集成门回执](../evidence/GAME-NANZHAO-ROOM-EXIT-1/integration-gates.json)。

## 用户验收

用户已提供失败位置并决定独立新增出口；本地结果已于2026-10-27获用户“可以了”确认。根浏览器通过普通UI导入合法已战胜旧档、原菜单读slot5并真实方向输入，实跑map204/#287 (928,816)→map203/#286 (1392,616)→原房间→再次出门；队伍保持1,0,4，warn/error为空。初始normal档核对时进入原生遇敌，未当作出口通过；已战胜夹具只使用原共享胜利尾状态-2/800。未取得issue作者存档、未跑自然剧情。

## 交接日志

- 2026-10-27 Codex：核issue27，用户补问英文原件是否有出口。二进制已核确有出口且上次同步；fresh真实scene/event tick可返回，玩家位置与出口可走区连通。线上事件4841也是新版出口。继续查旧存档allEventObjects覆盖路径，不把替代解释冒充issue作者的已证现场。
- 2026-10-27 用户追加：提出不动原遇敌、增加独立传送实体。Codex核追加ID与原生范围可分离后采用此方向；原replacement实现中止并保全，新候选补缺而不覆盖原状态。两个阶段同步，原生数组/旧脚本引用不变。

- 2026-10-27 Codex集成收口：两卡定向证据与有限浏览器体验已独立接收；完整check:docs（125工具用例与全部consumer）、全仓typecheck、lint零诊断。历史失败原样保留，见集成门回执；未跑本窗官方coverage/受保护CI，未推送或部署。状态review仅待用户体验。

## 下一位 Agent 提示词

无下一位Agent；两项实现及用户体验已接收，保护CI、合并、部署和v1.1.0发布完成。后续从最新main另定范围。

2026-10-27发布窗口：用户已接受两项本地结果并授权完整发布。补齐提取快测真实caller与旧FPS测试语义定位，五文件有限A–H、正式反控及两遍资源一致见[准备回执](../evidence/GAME-NANZHAO-ROOM-EXIT-1/release-preparation.json)。当前review等待受保护PR/CI与真实部署，不提前声明上线或关闭issue。

## 2026-10-27 发布收口

用户本地验收已确认。PR [#28](https://github.com/IllegalCreed/type-pal/pull/28) 的 documentation / fast-coverage（Actions App15368）在最新base、精确候选`c42e333385fe464805de88a51b95ab092abb9f6a`上通过；按保护规则合并为`bde596695d9c4d90a8031443ddd1ea033edd5245`。本地官方20,203例/812源、七包类型检查、lint与完整文档门零诊断见[本地门](../evidence/GAME-NANZHAO-ROOM-EXIT-1/release-gates.json)。

实际从合并树新构建并部署阿里云应用和资源；源站/CDN逐字节及完整资源清单、浏览器设置/刷新回退验证通过，两个issue已回复并关闭；第一阶段[v1.1.0](https://github.com/IllegalCreed/type-pal/releases/tag/v1.1.0)固定该部署提交。实现分支已按可恢复备份清理；一份临时worktree已归档，当前聊天主工作树按工具保护规则保留并同步最新main。完整命令、原件、CDN任务、备份与限制见[发布回执](../evidence/GAME-NANZHAO-ROOM-EXIT-1/release.json)。未宣称实物手柄、issue原存档、离线激活或自然全剧情E2E。无下一位Agent；收尾文档继续走受保护PR。
