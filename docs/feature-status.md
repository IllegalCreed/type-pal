# Feature Status · type-pal

> 玩家可感知功能总表。**本表按“游戏里发生什么”分类,不按源码目录分类**;源码路径、opcode 名和数据表名只作为备注里的依据。
> 逐 opcode 明细以 [opcode-status.md](opcode-status.md) 为准;逐资源提取覆盖以 [resource-status.md](resource-status.md) 为准;逐物品 / 仙术 / 演出清单分别见 [item-status.md](item-status.md)、[magic-status.md](magic-status.md)、[cutscene-status.md](cutscene-status.md)。
>
> **当前快照**:2026-06-07。状态写实现事实,测试写覆盖事实;已经修完的历史流水放 `docs/plans/` 或 git log,不在本表顶部长期堆叠。

## 怎么读

- **✅ verified**:Claude port 自认 1:1,且 user 已按 sdlpal 源 / 实机表现核过。
- **✅ claimed**:Claude port 自认 1:1,但还需要 user 最终拍板。
- **⚠️ partial**:主功能可用,但已知有表现、低频分支、像素 / 时序或听验残项。
- **⬜ todo**:未做。
- **N/A**:有意不移植,或浏览器架构天然替代 SDL / DOS 细节。

测试列:

- **✅ unit**:有单元测试覆盖核心公式 / 状态机。
- **✅ regress**:有针对 user 报过问题的防回归测试。
- **✅ partial**:部分覆盖;常见于渲染 / 听验 / 长剧情 e2e。注意这是“测试覆盖不足”,不等于功能状态是 partial。
- **⬜ todo**:无测试。
- **N/A**:无需测试或无法单独测。

## 当前重点

- **剧情演出实机验收**:脚本 opcode 已整体收口,真正风险在对白分页、走位停顿、淡屏时长、镜头和音画同步。
- **战斗表现细节**:召唤 / 合击 / 变身 / 特殊法术动画、伤害数字时机、援护表现仍是最值得继续比对的地方。
- **大世界长路线验收**:队友跟随与队伍显示、明雷追击 / 驱魔香 / 十里香、对象隐藏 / 离屏复活需要按剧情路线继续跑。
- **音频听验**:BGM / CD / SFX 的触发点已接,MIDI soundfont 已随 public 提供;最终音色、音量和每曲是否正确仍需 user 听验。

### 当前状态列 partial

目前没有玩家功能状态列标为 `⚠️ partial`;表内 `✅ partial` 只表示测试、听验或长路线验收还不完整。

---

## 1. 启动、标题和结局

| 功能 | 状态 | 测试 | 说明 |
|---|---|---|---|
| 商标画面和标题前动画 | ✅ claimed | ✅ partial | WIN95 走 mp4, DOS fallback 走 palette/RNG/FBP 编排;`?skip-intro` 可跳过。 |
| 标题菜单:新的故事 / 读取存档 | ✅ claimed | ✅ partial | 选项文字、位置公式、键盘选择已接;读档入口接 IndexedDB。 |
| 新游戏开场影片 | ✅ claimed | ✅ partial | WIN95 播 `3.mp4`;DOS 无 AVI 时按原版直接返回。 |
| 通关动画和回标题 | ✅ claimed | ✅ partial | WIN95 播 `4/5/6.mp4`;DOS 结局走 RNG/FBP/EndingAnimation 编排。 |
| sdlpal 引擎版权页 | N/A | N/A | 只是不移植引擎 GPL 版权页;游戏内演职员表已归结局编排。 |

## 2. 存档、读档和新游戏数据

| 功能 | 状态 | 测试 | 说明 |
|---|---|---|---|
| 新游戏初始场景、金钱、队伍、背包、毒 / 状态清空 | ✅ claimed | ✅ regress | 对齐 `PAL_LoadDefaultGame`;角色等级和 8 类经验等级初始化已补齐。 |
| 保存到槽位 | ✅ claimed | ✅ regress | IndexedDB 存 typed GameState JSON;保存次数按跨槽最大值 +1。 |
| 从标题或系统菜单读档 | ✅ claimed | ✅ regress | 读档后重建场景、NPC 引用和运行时状态;旧未发布存档按决策不兼容。 |
| 原版 `.RPG` 存档文件兼容 | N/A | N/A | 浏览器版使用本地结构化存档,不做字节级 SAVEDGAME 文件兼容。 |

## 3. 大世界走路、场景和 NPC

| 功能 | 状态 | 测试 | 说明 |
|---|---|---|---|
| 玩家四方向走路和步频动画 | ✅ claimed | ✅ partial | 方向、步进和主角动画可用;像素级 priority 仍以实机验收为准。 |
| 队友跟随、换队显示和滞后走位 | ✅ claimed | ✅ regress | 队员按主角历史位置滞后跟随;队伍变化后按各自角色形象渲染。临时跟随者见下方。 |
| 临时跟随者,例如剧情同行 NPC | ✅ claimed | ✅ unit | 0x98 跟随者使用独立 sprite 和 trail 后槽,跨场景保持。 |
| 地图加载和瓦片渲染 | ✅ claimed | ✅ partial | 295 scene / 223 map / 223 tileset 已提取并加载;遮挡层和双层 tile 已接。 |
| 障碍、NPC 阻挡和可通行判定 | ✅ claimed | ✅ partial | 使用地图阻挡位、事件对象状态和菱形范围;明雷怪不阻挡玩家走路。 |
| 切场景、门、触发区和进场位置 | ✅ claimed | ✅ partial | 走进触发区下一帧触发;场景淡入门控和失败兜底解冻已修。 |
| 调查、开宝箱、主动对话 | ✅ claimed | ✅ partial | 确认键搜索范围、NPC 转向、触发脚本持久化已接。 |
| NPC 自动走位和剧情自动移动 | ✅ claimed | ✅ partial | autoScript 按原版每帧推进;已修“原地消失”和张四划船类 goto 时序。 |
| 镜头居中、瞬移和多帧平移 | ✅ claimed | ✅ unit | 0x7F 三分支已接:回正、绝对跳、相对 pan。 |
| 明雷怪追击、驱魔香、十里香 | ✅ claimed | ✅ partial | 明雷追玩家、接触开战、追击速度计时恢复已接;原版这里主要靠事件对象和自动脚本,不是另一个随机刷怪系统。 |
| 怪物 / 宝箱 / NPC 的隐藏、消失和离屏复活 | ✅ claimed | ✅ regress | `sState` / `sVanishTime`、全局事件对象持久化、负状态离开视口后复活已接;这是大世界“怪物刷新”的核心机制。 |

## 4. 对话、剧情脚本和演出

| 功能 | 状态 | 测试 | 说明 |
|---|---|---|---|
| 对话框、逐字显示、翻页等待 | ✅ claimed | ✅ partial | 颜色控制符、变速、尾暂停、等待箭头和阴影已接。 |
| 普通 NPC 对话和长对白 | ✅ claimed | ✅ partial | 文本来自 WORD/M.MSG/SSS 消息表;分页节奏仍需实机视觉验收。 |
| 自动剧情演出 | ✅ claimed | ✅ partial | 507 段演出已枚举;风险和逐场景清单见 `cutscene-status.md`。 |
| 给物品、授仙术、改 NPC 状态的剧情脚本 | ✅ claimed | ✅ partial | 相关 opcode 已接;物品框和剧情链见 item / opcode 状态表。 |
| 战斗前后接回剧情 | ✅ claimed | ✅ regress | 0x07 开战后可按胜利 / 失败 / 逃跑接回后续脚本;已修“打完怪不消失”。 |
| 归隐脱出、传送失败、特殊出口脚本 | ✅ claimed | ✅ partial | 0x38 / 0x6D 成功和失败路径已接;少数长链仍需路线验收。 |
| 整屏动画和结局过场 | ✅ claimed | ✅ partial | 旧版 RNG/FBP、WIN95 AVI 和结局播放器已接;高风险点是淡入、首帧、滚动和音画同步。 |
| 事件脚本能执行所有已知指令 | ✅ claimed | ✅ partial | `0x00..0xA7` 排除不存在指令后共 164 个;无 runtime ⬜ todo,0xA5 effectSprite 为 0 调用参数残项。 |

## 5. 角色成长、属性和经验

| 功能 | 状态 | 测试 | 说明 |
|---|---|---|---|
| 角色基础数据和运行时属性 | ✅ claimed | ✅ regress | 战内外使用同一份运行时角色属性;开战投影,战后 HP/MP 回写。 |
| 主经验、升级阈值和等级上限 | ✅ claimed | ✅ unit | 战胜后写主经验,循环查升级经验表;满级 99 不再长属性。 |
| 升级后的体力、真气、武术、灵力、防御、身法、吉运成长 | ✅ claimed | ✅ unit | 使用原版随机成长和 999 属性上限;升级后 HP/MP 回满。 |
| 升级学会新仙术 | ✅ claimed | ✅ regress | 读取升级仙术表;跨级升级可一次学到多个满足等级的仙术。 |
| 隐藏属性经验和战后涨点提示 | ✅ claimed | ✅ unit | 战前清本场计数;攻击、防御、施法、逃跑失败累积不同隐藏经验,战后按占比分配到体力 / 真气 / 武术 / 灵力 / 防御 / 吉运。身法经验池存在,但原版无累积入口,忠实保持不涨。涨点框坐标已按全局最大字宽修正。 |
| 永久加属性和剧情加点 | ✅ claimed | ✅ partial | 金蚕王升级、属性药、剧情加点脚本等写运行时属性;逐物品见 `item-status.md`。 |
| 装备加成、临时加成和特殊装备属性 | ✅ claimed | ✅ unit | 装备效果、战斗临时加成、双击、抗性、攻击全体等进入战斗有效属性;战末清临时加成。 |
| HP/MP、毒和状态跨系统持久化 | ✅ claimed | ✅ partial | 战斗伤害 / 治疗回写运行时;毒和特殊状态在菜单、战斗和脚本间共享。 |
| 战斗后半血恢复、清毒 | ✅ claimed | ✅ regress | 胜利结算后恢复半血逻辑;战末清除战斗内毒 / 临时状态。 |
| 队友死亡 / 濒死 OBJECT_PLAYER 脚本 | ✅ claimed | ✅ regress | 队员跌入濒死(HP<min(100,maxHP/5))跑自身 `scriptOnDying`、阵亡跑守护者 `scriptOnFriendDeath`;即残血 / 阵亡触发的对象对话。需健康守护者在队、刚跨入阈值才触发。 |

## 6. 物品、装备和商店

| 功能 | 状态 | 测试 | 说明 |
|---|---|---|---|
| 背包列表、数量、图标和说明 | ✅ claimed | ✅ regress | 大世界物品菜单完整;战斗物品二级菜单也显示图标和说明。 |
| 大世界使用物品 | ✅ claimed | ✅ regress | 使用效果、成功判定、消耗规则和目标选择已接。 |
| 战斗中使用物品 | ✅ claimed | ✅ regress | 先跑使用效果,成功后按“可消耗”标记扣除;死亡角色不能继续执行行动。 |
| 投掷物品和投掷武器 | ✅ claimed | ✅ regress | 没有投掷脚本的投掷物也会被消耗;投掷法术 / 伤害路径已接。 |
| 装备、卸装备和装备效果 | ✅ claimed | ✅ regress | 装备槽消耗、卸装撤效果、装备属性进入菜单和战斗。 |
| 买东西、卖东西和金钱变化 | ✅ claimed | ✅ unit | 买卖菜单、确认框、价格、背包变化和金钱变化已接。 |
| 特殊物品:灵葫、炼蛊、引路蜂等 | ✅ claimed | ✅ partial | 主要玩法路径已接;圣灵珠剧情全链和少数视觉表现仍需真档验收。逐项见 `item-status.md`。 |

## 7. 仙术、技能和特殊法术

| 功能 | 状态 | 测试 | 说明 |
|---|---|---|---|
| 仙术列表、可用性、目标和说明 | ✅ claimed | ✅ regress | 大世界和战斗仙术菜单都显示说明;战斗中按 MP / 标志判断是否可选。 |
| 攻击法术 | ✅ claimed | ✅ unit | 伤害、命中、敌方受击、脚本直接造成伤害已接。 |
| 回血、回蓝、复活、解毒、解除状态 | ✅ claimed | ✅ unit | 死人不吃普通治疗、复活清状态、解毒 / 解状态已接。 |
| 增益、减益、控制和毒 | ✅ claimed | ✅ unit | 好状态、坏状态、临时加属性、毒脚本 tick 和抗性判定已接。 |
| 召唤神、合击和协力攻击 | ✅ claimed | ✅ partial | 召唤 / 合击主逻辑、音效和法术动画调度已接;表现时序仍是重点验收项。 |
| 梦蛇 / 变身类法术 | ✅ claimed | ✅ regress | 梦蛇可重复施放并播放施法 / 变身路径;其他低频变身表现仍需实机验收。 |
| 乾坤一掷、酒神、金蝉脱壳等特殊法术 | ✅ claimed | ✅ regress | 钱 / 酒 / 逃跑等失败提示和成功判定已接;金蝉脱壳逃离路径已补逃跑表现。 |
| 敌方法术 | ✅ claimed | ✅ partial | 敌方施法、音效、目标、伤害和状态脚本已接。 |

## 8. 战斗规则和回合流程

| 功能 | 状态 | 测试 | 说明 |
|---|---|---|---|
| 进入战斗、战斗背景和敌队加载 | ✅ claimed | ✅ partial | 敌队同时保留敌人属性编号和脚本编号,确保同一种敌人挂不同脚本时也正确。 |
| 玩家选择攻击、仙术、防御、逃跑、物品 | ✅ claimed | ✅ regress | 五个基础行动和投掷行动已接;装备战斗中切换在原 CLASSIC build 不存在。 |
| 死亡角色不能行动 | ✅ claimed | ✅ regress | 已选择行动但执行前死亡会跳过;复活后的行动按原版回合序列语义处理。 |
| 目标选择、自动目标和 R 重复目标 | ✅ claimed | ✅ regress | 单体 / 全体 / 死亡目标重选 / 自动目标已接;全敌死亡死循环按 sdlpal 自身 bug 显式规避。 |
| 出手顺序和速度 | ✅ claimed | ✅ unit | 按玩家 / 敌方 speed 与行动队列排序;特殊状态影响行动。 |
| 普通攻击和群体攻击伤害 | ✅ claimed | ✅ unit | 单体、暴击、李逍遥双倍、群攻衰减、双击、命中序等已接。 |
| 法术伤害和治疗公式 | ✅ claimed | ✅ unit | 法术威力、抗性、随机扰动、保护 / 防御等修正已接。 |
| 防御、援护和自动保护 | ✅ claimed | ✅ partial | 伤害规则可用;coverer 跳出、音效、受击演出仍需视觉对齐。 |
| 毒、睡眠、沉默、混乱、麻痹等状态 | ✅ claimed | ✅ unit | 战斗逻辑可用;底部信息框按原版只显示乱 / 定 / 眠 / 封四个异常状态字,buff 类无显示字。 |
| 敌人行动、偷盗、收妖、召唤、分裂、吹飞 | ✅ claimed | ✅ partial | 敌人行动脚本和战斗指令主路径已接;低频视觉 / 时序需继续验。 |
| 逃跑、金蝉脱壳、敌人逃跑 | ✅ claimed | ✅ regress | 逃跑成功 / 失败提示、逃离动画、逃跑失败隐藏经验计数和无奖励敌逃跑已接。 |
| 胜利奖励、掉落、获得物品提示 | ✅ claimed | ✅ partial | 经验、金钱、升级、学仙术、隐藏涨点、战后脚本和获得物品 UI 已接;像素和真实掉落路线仍需验。 |
| 战败、剧情失败分支和战后接回 | ✅ claimed | ✅ regress | 战败 / 逃离 / 胜利分支都能接回脚本;Boss / 剧情战仍需逐路线跑。 |
| R 键重复上一回合行动、跨战斗记忆、自动战斗 | ✅ claimed | ✅ regress | 致死回合行动、跨战斗、队伍人数变化后的记录更新已有回归测试。 |

## 9. 战斗画面、动画和战斗 UI

| 功能 | 状态 | 测试 | 说明 |
|---|---|---|---|
| 战斗主菜单和二级菜单 | ✅ claimed | ✅ regress | 攻/仙/物/防/逃、仙术说明、物品图标和说明已接。 |
| 玩家普攻、敌人普攻、受击和死亡动画 | ✅ claimed | ✅ partial | 主体动画和音效路径可用;像素帧和个别命中特效需继续比对。 |
| 法术、召唤、合击、变身动画 | ✅ claimed | ✅ partial | 主路径可播;武神、巫后协力、梦蛇、斩龙诀等特殊时序仍是重点验收。 |
| 伤害数字和掉血时机 | ✅ claimed | ✅ partial | 数值显示链已接;召唤 / 大法术的“受击时显示还是动画后显示”需继续按原版逐招验。 |
| 敌人受击、死亡、吹飞和分裂表现 | ✅ claimed | ✅ partial | 受击变色、死亡、吹飞状态已有;分裂 / 特殊敌表现继续验收。 |
| 战斗底部头像、HP/MP、毒色和状态提示 | ✅ claimed | ✅ regress | 头像、HP/MP、毒 / 死亡头像变色、乱 / 定 / 眠 / 封状态字已接;勇 / 护 / 速 / 双攻等 buff 原版不在底部显示。 |
| 战斗内震屏、淡屏和波纹效果 | ✅ claimed | ✅ partial | 震屏、淡入淡出、波纹和战斗内施法演出主路径已接;个别时长和同步继续视觉验收。 |

## 10. 常用菜单和界面

| 功能 | 状态 | 测试 | 说明 |
|---|---|---|---|
| ESC 主菜单和系统菜单 | ✅ claimed | ✅ regress | 物品 / 仙术 / 状态 / 装备 / 系统入口,退出二次确认已接。 |
| 大世界物品菜单和使用目标 | ✅ claimed | ✅ regress | 全屏列表、说明、目标选择、数量为 0 自动取消等已测。 |
| 装备菜单 | ✅ claimed | ✅ regress | 角色切换、装备列表、装备效果和 UI 绘制已接。 |
| 角色状态页 | ✅ claimed | ✅ partial | 属性、头像、毒 row 已接;字体像素不是 PALFONT。 |
| 大世界仙术菜单 | ✅ claimed | ✅ regress | 法术列表、说明、MP、使用脚本和目标选择已接。 |
| 商店买卖界面 | ✅ claimed | ✅ unit | 买菜单、全屏卖菜单、价格、确认和现金框已接。 |
| 确认框、数字图标、现金框、九宫格边框 | ✅ claimed | ✅ partial | UI 原语已接;少数像素仍以视觉验收为准。 |
| 中文字体和文字阴影 | ✅ claimed | ✅ partial | 算法接近原版;字模用 Unifont 替代 PALFONT,属于版权资产决策。 |

## 11. 视觉资源和画面特效

| 功能 | 状态 | 测试 | 说明 |
|---|---|---|---|
| 角色、怪物和 NPC 图片资源 | ✅ claimed | ✅ partial | MGO/F/ABC 等 sprite 资源全量提取并可渲染。 |
| 地图、瓦片和遮挡图层 | ✅ claimed | ✅ partial | MAP/GOP 提取和 draw-tilemap 已接。 |
| 整屏插图、滚动插图和叠加特效 | ✅ claimed | ✅ partial | FBP 0x76/0xA4 主路径已接;0xA5 effectSprite 参数为 0 调用残项。 |
| 旧版序列动画 | ✅ claimed | ✅ partial | RNG 0x36/0x37 和 DOS 片头路径可播;首帧淡入等剧情过场衔接仍需实机验收。 |
| 调色板、昼夜、淡入淡出、红屏 | ✅ claimed | ✅ partial | palette ramp、dither fade、night palette、FadeToRed 已接。 |
| 水波、震屏和场景特效 | ✅ claimed | ✅ partial | 波纹和震屏主路径已接;精确时长继续验。 |
| WIN95 影片资源 | ✅ claimed | N/A | 原版 AVI 以提取后的 mp4 播放,不是 runtime 移植 aviplay.c。 |
| 资源提取总体覆盖 | ✅ claimed | ✅ partial | 非空 chunk 已全落地,零真实数据 gap;详见 `resource-status.md`。 |

## 12. 音频

| 功能 | 状态 | 测试 | 说明 |
|---|---|---|---|
| 场景 BGM、战斗 BGM、胜利音乐 | ✅ 待听验 | ✅ unit | core 发音乐意图,shell 用 Web Audio / SpessaSynth 播放;soundfont 已有,剩 user 听验。 |
| 音效 SFX | ✅ 待听验 | ✅ unit | 大世界 opcode、战斗攻击、命中、死亡、施法、投掷、逃跑等触发点已接。 |
| CD 音轨 | ✅ 待听验 | ✅ unit | 8 个 OGG track 已提取,0xA3 播放路径已接。 |
| MIDI 音色库配置 | ✅ claimed | N/A | `packages/game/public/soundfont.sf3` 已随仓库提供(GeneralUser GS 2.0.3),授权见 `packages/game/public/soundfont-LICENSE.txt`。 |

## 13. 输入、运行时和开发工具

| 功能 | 状态 | 测试 | 说明 |
|---|---|---|---|
| 键盘方向、确认、取消、菜单、搜索、重复 | ✅ claimed | ✅ partial | 物理键映射和 repeat 过滤已接;战斗 R 见战斗表。 |
| 鼠标、手柄、触屏 | N/A | N/A | user 决策不做,不作为原版功能缺口。 |
| 主循环、逻辑 tick 和渲染节奏 | ✅ claimed | ✅ partial | explore / battle tick 与 raf 渲染解耦,修 cutscene 被加速类问题。 |
| 播放过场时独占画面 | ✅ claimed | N/A | AVI/RNG/FBP/结局播放时暂停主渲染,避免闪烁。 |
| 开发调试面板 | N/A | N/A | 纯开发工具,不计玩家功能完成度。 |

## 14. 单独维护的明细表

| 文档 | 负责内容 |
|---|---|
| [opcode-status.md](opcode-status.md) | 164 个事件 / 战斗 opcode 的逐条实现状态。 |
| [resource-status.md](resource-status.md) | MKF、WORD、M.MSG、Musics、AVI 等资源逐 chunk 提取覆盖。 |
| [item-status.md](item-status.md) | 235 个物品的用途、脚本、装备 / 投掷 / 特殊玩法状态。 |
| [magic-status.md](magic-status.md) | 玩家仙术、敌方法术、合击、召唤、特殊法术状态。 |
| [cutscene-status.md](cutscene-status.md) | 507 段自动演出的风险分级和逐场景清单。 |

## 测试入口

| 入口 | 覆盖 |
|---|---|
| `pnpm --filter @type-pal/game test` | game 包 unit/regression 全量。 |
| `pnpm --filter @type-pal/game run typecheck` | TypeScript 类型检查。 |
| `packages/game/src/core/event-system.test.ts` | opcode、大世界脚本、场景切换、follower、物品框等。 |
| `packages/game/src/core/battle/__tests__/battle-system.test.ts` | 战斗主循环、R 重复、结算、逃跑、死亡、菜单输入等。 |
| `packages/game/src/core/battle/__tests__/battle-opcodes.test.ts` | 战斗 opcode、偷盗、召唤、分裂、逃离等。 |
| `packages/game/src/core/menu/` | 主菜单、物品、装备、状态、商店、存读档。 |
| `packages/game/src/present/` | 大世界渲染、队伍 sprite、cover tile、菜单 / 战斗 UI。 |

## sdlpal 自身 bug(audit 过程发现,ts port 时显式 fix)

| # | 描述 | sdlpal 行 |
|---|---|---|
| Bug-1 | `PAL_BattleSelectAutoTarget` 全敌死时可能卡在 while。 | fight.c:4500-4517 |
| Bug-2 | `PAL_BattleStealFromEnemy` 无 dead target check,R 重复偷死敌时可能数值 underflow。 | fight.c:5193+ |
