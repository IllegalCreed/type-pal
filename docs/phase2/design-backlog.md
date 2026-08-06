# 第二阶段 · 设计议题池（backlog）

> 陆续收集的第二阶段设计专题，避免散落丢失。每条 = 现状痛点（旧引擎）+ 第二阶段方向 + 归属子项目 + 状态。
> 这里是**议题池**，不是计划；具体设计在各子项目 spec 里展开。子项目分解见 [roadmap.md](roadmap.md)，铁律见 [READ-FIRST.md](READ-FIRST.md)。
>
> 「现状痛点」列每条都有**代码锚点证据**，见 [engine-debt-audit.md](foundation/engine-debt-audit.md)（文末有「backlog 议题 ↔ finding」反查表）。
>
> **2026-06-25 重新聚焦**：第二阶段 = 现代化引擎 + 编辑器 + 内容创作。MMO 量级的**玩法 / 世界观系统**（种族 / 门派 / 御灵 / 炼化 / 阵法 / 五灵矩阵 / 因果轮回…，原议题 7 / 8 / 9 / 14 / 15–24）与 MMO 整体**移交 [docs/phase3](../phase3/future-gameplay-and-mmo-backlog.md)**，不再占用第二阶段心智。本表只留服务于引擎 / 编辑器 / 内容管线的议题。

## 议题（引擎 / 编辑器 / 内容管线）

| # | 议题 | 现状痛点（旧引擎，仅作参考） | 第二阶段方向 | 归属 | 状态 |
|---|---|---|---|---|---|
| 1 | 核心系统重写 | 对话 / 战斗 / 存档 / 事件系统耦合重（事件 ↔ 存档 ↔ 战斗绑死） | 全部重写、解耦 | P1 | 待设计 |
| 2 | 动态时间 | 仅脚本静态切昼夜调色板（nightPalette），不是真时间 | 真正流动的时间轴，作世界态一等公民；事件 / 渲染 / 场景可响应 | P0 世界态 + P1 | 待设计（非首刀，按内容需要） |
| 3 | 天气 | 无 | 全新天气世界态，影响渲染 / 场景 / 遭遇 | P0 世界态 + P1 | 待设计（非首刀，按内容需要） |
| 4 | 地图分层扩展 + 尺寸可变 | 仅 lower/upper 2 视觉层 + tile 内单 bit 障碍；立交 / 楼层靠两张图 + 传送 fake；**所有图被 C 定长数组 `Tiles[128][64][2]` 焊成恒定 64×128**，小场景背满空格 | N 视觉层（z 序 + 是否遮挡角色）+ 独立碰撞 / 地形层；支持真立交 / 楼层 / 丰富地形；**每图尺寸可变**（有限网格 = 层次 A，现在做；超大无缝 / 分块流式 = 层次 B 留口不做） | P0 地图 schema + P1 | 尺寸可变已拍板（[D3](decisions.md)）；多层 / 立交方向待确认 |
| 5 | 演出 / cutscene 系统 | 黑屏语义纠缠：冻结型（死亡 / 切场景）、遮罩型（借黑屏移精灵）、叙事型（水月宫一夜过去）混用 `blackScreenHold`/`needToFadeIn`/`sceneLoading`/`paletteFadeState`；精灵移动、触发器拼凑式，杂乱 | 拆正交两维（底层冻结与否 × 遮罩层内容）；统一**声明式演出时间线**（清晰 action 词汇：淡入淡出 / 移精灵 / 等待 / 文本 / 镜头，可组合）；**触发器与演出分离**（触发器只管「何时」）；分层视觉合成（世界 / 遮罩 / 文字层） | P0 事件 & 演出建模 + P1 执行 + P2 可视化编排 | 待设计（**讲故事的核心**，内容驱动） |
| 6 | 遮挡的现代化处理 | 原版人物被前景挡住就完全看不见 | 被遮挡时前景半透明 / 或角色描轮廓剪影（二选一是**审美选择**，P1 渲染时定）；schema 保证遮挡关系可判定 | P1 渲染 + P0 留位 | 待设计（审美待拍，默认半透明） |
| 7 | ~~标签 + 相性 / 克制系统~~ | — | **→ 移交第三阶段**（种族 / 门派 / 五灵克制的骨架，属玩法系统）。见 [docs/phase3](../phase3/future-gameplay-and-mmo-backlog.md) | 第三阶段 | 移出 |

### 引擎现代化（议题 10–13）

> backlog 1–6 偏「重写已有系统」，这几条补现代化硬缺口。**原议题 8（回合制/身法）、9（数据驱动 AI/多难度）、14（Mod 系统）已移交 [第三阶段](../phase3/future-gameplay-and-mmo-backlog.md)**（玩法 / 远期）。

| # | 议题 | 现状痛点（旧引擎，仅作参考） | 第二阶段方向 | 归属 | 状态 |
|---|---|---|---|---|---|
| 10 | 国际化（i18n）管线 | 原版文本靠 WORD.DAT 字面下标，硬编码 | 所有面向玩家文本（对话 / 物品名 / 仙术描述 / UI）走**稳定 text id**，运行时按 locale 查表；与 [p0 schema §2 稳定身份](foundation/content-schema.md) 一脉相承 | P0 schema（text id）+ P1 运行时查表 | 已定（[D9](decisions.md)）；做中文同人为先，多语言可后补，但文本字段一律走 id |
| 11 | 可访问性（A11y） | 原版无 | 文字速度 / 自动播放 / 对话回看日志；高对比度 UI 主题；全键盘 / 手柄 / 触屏 / 鼠标输入重映射 | P1 输入 + UI | 方向已定：可选，非阻塞主干 |
| 12 | 音视频多媒体系统统一 | 四个 player（avi/rng/fbp/ending）各自 `flushToCanvas` 绕过 present、各自 `await sleep()` 两套时钟（audit P0-9）；音频意图边界干净（audit A-1）但缺现代能力 | 统一多媒体管线：音频在 A-1 「意图队列」上加动态音乐过渡 / 分层；视频 / 动画走统一 CutsceneController（呼应议题 5），不再各自为政 | P1 多媒体 + P0 演出建模 | 待设计（A-1 是干净继承起点） |
| 13 | 开发 / 调试工具 | 无 | 时间旅行调试（effect 溯源回放，受益于 [D2](decisions.md) 的「意图→纯函数判定→结果」+ 注入时钟）；帧步进、碰撞层 / 触发区可视化、cheat console、世界变量检视器；编辑器时代降低内容创作成本 | P1 工具层 | 待设计（D2 红线已为其留地基） |

### 引擎架构（议题 14）

> 2026-06-26 立。本条由「reforge 切片 1 对话系统自编」引出。作者反馈：原版 dialog 系统「获得物品有时用 dialog、有时用物品 UI」、RNG 叠特效频出 bug；新引擎要做「系统的规范化的重构」。经对第一阶段 30+ 条相关 fix 记录的考古 + `mode.ts` 根因审计，确认为**真实且系统性的架构问题**，立为本议题。

| # | 议题 | 现状痛点（第一阶段引擎考古实证） | 第二阶段方向 | 归属 | 状态 |
|---|---|---|---|---|---|
| 14 | **场景事件 / 脚本系统重构 — 根治子系统共享可变状态** | 原版（及第一阶段忠实复刻）靠 `mode`（explore/event/battle/menu）+ `waiting`（undefined/frame-wait/dialog/fade-screen/scene-load/palette-fade/camera-pan）+ `sceneLoading` + `needToFadeIn` **四个全局标志位交织**，每帧靠 `shouldRunAutoScripts = !sceneLoading && mode==='event' && (w∈{undefined,frame-wait,scene-fade,camera-pan})` 这类组合条件决定跑什么（见 [mode.ts:38-43](../../packages/game/src/core/mode.ts)）。对话 / RNG / 淡入淡出 / 立绘 / 走位 / 跟随者 / 吞键 全共享这组状态 → 任何分支漏判即 bug | **子系统隔离 + 意图通信**：①对话（纯状态机）；②演出/特效（fade/RNG/分镜）；③奖励/事件（物品获得、世界变量）；④跟随者/走位。各自封装状态，靠「意图→纯函数判定→结果」消息通信，不再共享可变全局 | P1 引擎核心 | **主体已落地（2026-08-06 核实）**：reforge 已隔离 dialogue/fade-driver/input/follower/gameplay-clock/async-intent，script-runner 无 waiting 枚举、AbortSignal 贯穿；N3-1 退役内部脚本。**剩余 = ①对话外观继承子项（见下，作者明确要求）+ ③奖励/事件总线统一收尾（物品提示两套 UI）+ ②演出意图协议完整性（分镜/RNG/镜头 pan）** |

#### 议题 14 的真实 bug 证据（第一阶段 fix 记录考古）

> 这些不是推测，是 commit 里白纸黑字的已修 bug。归类后可见**同一个根因（共享状态漏判）反复以不同症状出现**。

**A. RNG × 对话 × 调色板 交叉（你提的核心痛点）**
- `387d378` 求雨"天地诸神"花屏：PlayRNG 后对话 op2=0，`maybeEnterDialogRNG` 漏判 → 重绘大世界 + 停在 setPalette 6 花屏
- `f2c4cb6` 拜月跳水后说话露战斗替身：RNG 对话期没压住重绘
- `2aa43b2` 酒剑仙坐葫芦 RNG 演出偏色：setPalette 异步化丢同帧保证

**B. 淡入淡出 × 场景加载 × 对话**
- `387d378` 拜月"太好了"永久黑屏：showDialog 清 sceneLoading 时不消费 needToFadeIn
- `5b7bebb` 锁妖塔进塔运镜全黑：camera-pan 没进 autoFadeIn 白名单
- `c6482ff` 切场景直接走入被黑屏盖住：走位 op 没清 sceneLoading
- `ef70491` 仙灵岛靠岸黑屏：0x05 redraw 没对齐自动淡入
- `4ed8f46` 香兰报信演出吞键卡死：palette fade 孤儿到时没自清

**C. 立绘 / 头像 残留（修了 3 轮）**
- `eac8453` → `5ba288f` → `da665e4`：立绘随场景/对话框清除的逻辑反复修，残留导致"李逍遥说话显赵灵儿头像""扬州师爷复用太守头像"
- 根因：立绘状态挂在对话框全局，对话框复用 style 时残留

**D. 走位 / 骑乘 / 跟随者 × 演出冻结**
- `149b650` 走路进对话队伍冻迈步帧
- `c6482ff` / `a47334a` / `7c5158d` / `89f1f5b` / `2013a6d`：跟随者位置/朝向/重叠在演出期反复修
- 根因：跟随者状态、演出冻结态、走路态三方共享 party 全局

**E. 吞键 / 输入时序**
- `f8d473e` 渐变吞键、`4ed8f46` 孤儿 fade 吞键
- 根因：输入消费和状态切换没解耦

**结论**：这五类 bug 症状各异，但根因同一个 —— **多个子系统读写同一组全局标志位，靠组合条件碰运气**。新引擎把这组状态拆进各自模块 + 用意图消息通信，这五类 bug 从架构层根除。

#### 议题 14 的解法方向（待 spec 细化）

1. **对话系统**：reforge `dialogue.ts` 已示范（纯状态机、不碰 DOM/RNG、独立单测）。✅ 方向验证
2. **演出/特效系统**：fade、RNG、分镜、镜头 pan 各成独立模块，状态自管；对上层暴露"开始/进行中/完成"的意图，不共享 `needToFadeIn` 这种全局。
3. **奖励/事件系统**：物品获得、世界变量改动走独立事件总线；"得物品时弹 dialog"改成"物品系统发意图 → 对话系统订阅"，而非塞同一条脚本流（解"物品提示走两套 UI"）。
4. **跟随者/走位**：位置/朝向/冻结态封装在 party 组件，演出冻结通过"冻结意图"通知，而非改全局 `fWalking` 标志。
5. **输入**：输入消费与状态切换解耦，每个子系统声明"我此时是否吃输入"。

> ⚠️ 本议题**不阻塞切片 1**。切片 1 已用纯状态机验证了对话这条线。本议题是 P1 引擎核心层的设计任务，等更多子系统在切片中验证后统一 spec。

### 对话系统外观继承（议题 14 子项 · 作者明确要求）

> 2026-06-26 作者反馈：reforge 当前对话框是"自己编的样式"（粗框 + 右上角提示），**不满意**。原版的对话外观**应当继承**：头像、人名、翻页、头像位置、上/下显示位置、字体、结尾光标及光标的不同形式、带交互的对话 vs 自动播放的动画。**代码可重构，外观要继承。**

| 子项 | 原版外观（第一阶段已忠实复刻，可作真值） | reforge 现状 | 待办 |
|---|---|---|---|
| 头像（portrait） | RGM.MKF RLE，左右位置由 `setDialogStyleX` 决定，随 0x09/0x7F 清除 | ❌ 无 | 移植 |
| 人名 / 正文分行 | setDialogStyleX arg0/arg1（portrait/fontColor） | ⚠️ 有但简陋 | 对齐版式 |
| 翻页 | 4 行/屏，key icon（DATA chunk 12 sprite）结尾光标 | ⚠️ 自绘"继续"文字 | 换原版光标 sprite |
| 光标形式 | typing animation + 不同 wait 光标形态 | ❌ 无 | 移植 |
| 上/下显示 | setDialogStyleTop（求雨 RNG / 结局用） | ❌ 无 | 移植 |
| 字体 | 原版字模（FONT_COLOR_DEFAULT 0x4F + shadow） | ❌ 用系统宋体 | 移植字模 |
| 自动播放 vs 交互 | 0x09 wait（自动延时）vs wait-key | ❌ 仅交互 | 加自动播放 |
| 物品提示 UI | **独立 UI**（非 dialog）— 见议题 14 解法 ③ | ❌ 未涉及 | 随事件系统设计 |

> **原则**：对话**行为/状态**重构（议题 14 主体），对话**外观/资产**继承原版（本子项）。两者解耦 —— 外观是数据 + sprite 资产，行为是纯状态机。

### 实体行为 / NPC 移动（议题 15）

> 2026-06-27 立。切片 1 收口时作者提出:原版 NPC 会自主游走、有碰撞,主角移动中撞上**会动的** NPC 时有错位避让(不硬卡)。reforge 切片 1 的 NPC 是静态的(游魂站着传话),`collide` 字段一度还是死字段(content 填了 `collide:true`、reforge `isBlocked` 没读)。先补**静态碰撞**(玩家不能穿过站着的 NPC,见 [npc-collision-plan.md](slice1-indoor/npc-collision-plan.md));**自主移动 + 动态碰撞 + 错位避让**复杂度高一个量级,记此防忘。

| # | 议题 | 现状痛点（旧引擎,仅作参考） | 第二阶段方向 | 归属 | 状态 |
|---|---|---|---|---|---|
| 15 | NPC 自主移动 + 动态碰撞 + 错位避让 | 原版 NPC 巡逻/游走(`PAL_NPCWalkOneStep`)、主角撞上移动的 NPC 会错位避让/滑步而非硬卡;reforge 切片 1 NPC 静态、`collide` 曾为死字段 | NPC 移动作**独立子系统**:巡逻/路径行为 + 每帧动态碰撞(NPC 不穿墙、不穿彼此)+ 玩家↔NPC 互相让路 + 转向动画。clean rewrite——拿原版当手感灵感、**不逐帧复刻** | P1 引擎(移动/碰撞/实体行为) | **待设计**(切片 1 不做;静态碰撞先行) |

> ⚠ 不阻塞切片 1。静态 NPC 碰撞是切片 1 基础(已单独 plan);本议题(会动的 NPC)等真有巡逻 NPC 的场景再立项 brainstorm + plan。别夹进切片 1 收口顺手做(避免范围蔓延)。

### 精灵命名动作消费闭环（议题 16）

> 2026-07-20 用户要求记录；2026-07-21 用户确认立项。它是独立高风险能力，不并入
> [`C2-PAL`](../ops/tasks/C2-PAL-world-sprite-layout-cleanup.md) 的 541/特殊布局清洗，现由
> [`C2-ACT`](../ops/tasks/C2-ACT-sprite-action-playback.md) 承接。

| # | 议题 | 当前缺口 | 第二阶段方向 | 归属 | 状态 |
|---|---|---|---|---|---|
| 16 | 固定循环 auto 脚本提升为预制动作 | `SpriteDef.poses` 能登记帧序/循环，但脚本与 Reforge 没有动作消费闭环；PAL 仍靠 `setEntityFrame`/`animEntity` auto 脚本逐帧驱动。`layout.loop` 是定义级全局壁钟相位，不能表达同资源静态/循环混用、实例错相、非均匀帧时长或运行中 `setEntityAuto` 切换 | 演进现有 `poses`，不另造平行体系：精灵库定义稳定动作、帧时间线与受限关键帧事件；场景脚本只以语义命令引用动作并选择单次/循环，动作播放器持有实例级游标与起始相位；迁移器仅对可证明等价的循环做“严格识别 → 动作去重 → 引用重写”，其余保留实例脚本 | C2 精灵动画与姿势 + E5 实体动画 + P0 schema/P1/P2/migrate | **done（2026-07-22）**：G2 v2 冻结并迁移 387 个实例 / 54 场景 / 32 个动作；差分 oracle、MG2 二跑 0/0/0、全包与浏览器验收通过，三方 accept 与用户验收齐。 |

边界与验收锚点：

- 当前编辑器投影出的 `506` 个 cycle 实例只是候选上界，不是可批量迁移结论；随机、移动、声音、显隐/状态、跨实体写等脚本必须保留。
- 蜡烛类相同循环的多实例应共用一个动作，并以实例 `startFrame/phaseOffset` 保留错相；不得复制三份动作或强制整份资源全局同步。
- `sprite-76` 的纯 `animEntity` 是直接候选；`sprite-72`/`sprite-490` 含随机分支，不能折成固定动作；`sprite-35` 有非均匀等待、启动 stage 和运行中 auto 切换，只有动作模型覆盖逐帧时长与动态切换后才可迁。
- 必须以旧 `ScriptRunner` 与新动作播放器做差分轨迹验收：首帧、逐帧时长、至少两轮、隐藏再显示、场景重入、脚本定帧覆盖、`0x24/setEntityAuto` 切换、共享 asset 多定义/同定义多动作。
- 落地会触碰 schema/contentVersion、公共类型、Reforge、编辑器、迁移器和 capability-map，必须新开高风险任务卡、三方设计签字、全量重迁与 MG2 二跑零差异；禁止直接手改 `projects/pal`。

（后续议题继续往下登；玩法 / 世界观 / MMO 设想统一去 [docs/phase3](../phase3/future-gameplay-and-mmo-backlog.md)）

### 脚本蓝图编辑视图（议题 17）

> 2026-07-24 用户提议。N3-1 P7（结构化脚本模型冻结）后候选,不阻塞当前批次。

| # | 议题 | 当前缺口 | 方向 | 归属 | 状态 |
|---|---|---|---|---|---|
| 17 | 脚本蓝图（节点+连线）编辑视图 | 当前脚本编辑全部是列表式缩进树;状态机（P5 的 stateMachine）和多层嵌套 branch 在列表里难以直观看出控制流转移关系 | 按内容自动选视图,不是蓝图 vs 列表二选一:①线性/简单分支保持列表（默认,高效）;②`ScriptFlow.kind === 'stateMachine'` 自动切节点+连线白板;③超 3 层嵌套 branch 可选折叠树或节点视图。蓝图只用于真正需要看转移关系的复杂流控,不强迫作者为了改一行台词去拖节点 | ED 编辑器 | **移交第三阶段（2026-08-06 用户拍板），第二阶段不立项** |

边界:

- 前置（若未来第三阶段立项）:N3-1 P7 完成、ScriptFlow/stateMachine schema 冻结后才开;在 schema 不稳定时做蓝图 UI 会反复返工。
- 蓝图 UI 是独立大工程（拖拽/连线/缩放/小地图/键盘/无障碍）,应单开任务卡,不顺手夹进其他批次。
- 数据模型不变:蓝图只是 ScriptFlow/stateMachine AST 的另一种视图,底层同一份 canonical 数据;列表和蓝图双向同步。
- 参考:Unreal Blueprint State Machine、Unity Animator 状态图。

### Reforge 战斗引擎缺口（议题 18）

> 2026-07-29 GLM 逐行代码审计 `packages/reforge/src/battle/` vs `docs/phase1/game-mechanics.md`。
> **2026-08-05 GLM 审计纠正**：初次审计有盲区——只看 reforge 代码有没有某机制，没检查
> "一阶段已实现的机制，数据/字段有没有迁到二阶段"。系统性交叉核对（逐机制 × 一阶段代码 ×
> 迁移覆盖 × reforge 代码 × content schema 四维）后，除原 18a/18b 外新发现 18c/18d 两项
> 数据链断裂缺口。以下 4 项缺口需补齐。

| # | 议题 | 当前缺口 | 方向 | 归属 | 状态 |
|---|---|---|---|---|---|
| 18a | 敌人混乱攻击同伴 | `battle-core.ts` 的 `decideEnemyAction` 无混乱分支，导致中了"乱"的敌人仍照常施法、变身、召唤、逃跑或攻击玩家。完整缺口还包括专用结算、lastAction、session 路由和 12 帧专用动画；严格 RNG 还要求保留 confused 前废弃玩家抽样和原始敌队空槽。 | 已开高风险 [B10-1 任务卡](../ops/tasks/B10-1-enemy-confused-attack.md)：二次真值核对发现当前 schema/migration 压掉 68/380 队的源空槽，先冻结语义槽位方案，再做全槽拒绝采样（含自身→Pass）、专用公式和演出；不改玩家混乱 | B4 / B5 / B10 | draft，Codex/Kimi/GLM 均待精确 schema 后签字 |
| 18b | 实体暂离、重现与明雷逃跑冷却 | `main.ts:3234-3263` 用 `respawnSeconds` + detached `host.wait`，且迁移把 `0x4B` / `0x52` 合并成 `vanishEntity`。缺口包括自动触碰冷却、手动确认保留、world-update pause、0x52 toggle、固定 320×320 当前坐标离屏门、跨场景/存档持久和战斗结果接续。 | 已开高风险 [W9 任务卡](../ops/tasks/W9-entity-lifecycle-respawn.md)：用稳定实体地址的语义生命周期状态 + 世界逻辑 reducer，拆分短暂停自动行为/隐藏待重现，区分普通胜利、玩家逃跑、敌逃与 terminate，修迁移上游并全量重生成 | W9 世界 / B8-B9 / X1 | draft，二次真值方案待三方设计签字 |
| 18c | 队友阵亡/濒死战斗脚本（scriptOnFriendDeath/scriptOnDying） | ~~三层全断~~ **已由 B11-1 修复**（提交 `58f8f846`）：① battle-core.ts:717 `runPlayerCasualtySweep`（friendDeath + dying + 健康门 + 每 action/毒 tick 后调用）；② coveredBy 迁移落地（final actors.json 6 actor battler.coveredBy = 正确 slug）；③ BattlerSpec.casualty 结构化数据已生成（pal-casualty-scripts.ts 162 行翻译四个源脚本）。 | [B11-1 任务卡](../ops/tasks/B11-1-player-casualty-scripts.md) 三方实现 accept（2026-08-05）。 | B9 战斗 / R13-Z | **已修复**（B11-1 实现 + R13-Z actor-casualty 证据族关闭 110 site，三方 accept） |
| 18d | 援护（Cover）数据链断裂 | ~~数据没迁~~ **已由 B11-1 修复**：mapActor coveredBy（migrate-content.ts:314）产物已生效 —— final actors.json li-xiaoyao coveredBy=lin-yueru、gai-luojiao coveredBy=anu 等，main.ts:2239 → battle-core.ts:2341 数据链完整。 | 同 18c（B11-1 coveredBy 迁移）。 | B9 战斗 | **已修复**（B11-1 formal publication 落盘后 coveredBy 有值） |
| 18e | 编辑器角色战斗字段缺失（coveredBy / casualty / cooperativeMagic） | ActorMode.tsx（480 行）只编辑 baseStats / battleSprite / sounds / initialEquipment / initialMagic，**不编辑 coveredBy、casualty（friendDeath/dying）、cooperativeMagicSkillId**。B11-1 已让 coveredBy + casualty 在数据层/runtime 完整工作，但编辑器无入口 → 作者不能查看/修改/为新角色配置 → **功能未闭环**。参照 SkillTab（R13-6B 已编辑 execution/preShake 结构化字段）可实现。 | 在 ActorMode 增 coveredBy 角色选择器 + casualty 脚本编辑器（gates/lines/effects 结构化，复用 SkillEffect 编辑组件）+ cooperativeMagic 选择器。优先级：coveredBy（简单下拉）> casualty（结构化脚本，较重）> cooperativeMagic。 | ED 编辑器 / B9 | 待立项 |

边界:

- 18a 优先级高于 18b，但二次真值核对后已不是"纯 battle-core 小改"：要严格保留原始空槽 RNG，需先改 enemy-team schema/migration。18b 仍是 world/save/migration/editor 跨包任务。
- **18c/18d 已由 B11-1（`58f8f846` + `0ea144c2`）修复并三方 accept（2026-08-05）**：
  coveredBy 迁移落地 + casualty sweep 实现 + 结构化 casualty 数据生成 + R13-Z
  actor-casualty 证据族关闭 110 site。GLM 2026-08-05 重新审计时一度误报为"全 None /
  三层全断"，实际是审计时工作树未含 B11-1 最新提交；纠正后确认数据链完整。
- 剩余缺口仅 18a（敌人混乱）+ 18b（怪物刷新），均为纯代码缺口。
- 一阶段引擎（`packages/game`）全部机制都有完整实现，可作为参照。

**已覆盖确认（2026-08-05 抽样复核通过，非缺口）**：隐藏经验、伤害公式、暴击/会心、主动/自动防御、护体、群体递减、战后 HP/MP 恢复、战场五灵 fieldEffect（数据+注入双全）、合击、身法/出手顺序、吉运/逃跑、特殊技能成功率、紫金葫芦炼丹（Store[0] 九档完整迁移）、五灵/毒抗性、巫术 0x2E（含 ≥ 修复）、异常状态、毒系统（七大毒/相克/致死/无影毒）、大世界状态带入战斗、状态刷新/死亡/复活/梦蛇/明王觉醒、乾坤一掷、敌普攻附带 attackEquivItem。
