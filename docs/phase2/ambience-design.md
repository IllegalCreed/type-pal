# 氛围系统(W6 昼夜)设计 — 全帧乘法滤镜 + 氛围数据表

> 2026-07-10 用户拍板。范围:**只做昼夜**(时间流逝/天气砍掉,有真内容需求再开)。
> 观感真值:**一阶段夜色**(用户指示:先参考一阶段夜晚色彩风格,再微调滤镜)。

## 0. 一句话

原版「夜晚调色板」在数学上就是一次逐通道乘法(实测拟合,见 §2)——清洁重写用
**每帧最后一条 Canvas `multiply` 合成**复现它,零调色盘概念;夜色是 content 数据
(`ambiences.json`),作者可自定义新氛围(黄昏/水下/血月),引擎零改动。

## 1. 原版语义(考证)

- `0x53` = 用白天调色板(`fNightPalette = FALSE`);`0x54` = 用夜晚调色板(TRUE)。
  sdlpal script.c:1802/1809。**全局 flag,跨场景持续**,只被脚本改;随存档。
- 夜盘作用于**整个画面**(全局调色板):UI 也染(菜单米白 [199,186,174]→[93,166,174],
  描述黄 [243,239,93]→[113,215,93] —— 数据实证,不是只染世界)。
- pal 使用量:**13 处 / 12 场景**(迁移器 unmigrated 挂账):
  昼 s011/s020/s034/s036/s037/s038/s043/s048,夜 s033/s035/s042/s097/s195。
  考题 = s042 隐龙窟外夜景。

## 2. 夜色拟合(数据出处,非拍脑袋)

palette 0 的 `colors` vs `nightColors` 逐通道比值(>20 的分量,n≈600):

| 通道 | 中位 | p10–p90 |
|---|---|---|
| R | 0.458 | 0.440–0.473 |
| G | 0.899 | 0.867–0.914 |
| B | **1.000** | 1.000–1.000 |

分布极窄 = 原版夜盘就是**均匀乘法**(往深蓝压,蓝通道不动)。
→ 起步滤镜 = multiply `rgb(117,229,255)`(= 0.458/0.899/1.0 × 255)。
最终值以 **s042 与一阶段并排截图对比**微调定案。

## 3. 数据模型(content)

```ts
/** 氛围定义:全帧乘法色。day = 恒等([255,255,255])= 不染。 */
interface AmbienceDef { id: string; name: string; tint: [number, number, number] }
```

- `content/ambiences.json`(manifest.content.ambiences 声明才加载;缺省 = 空表)。
- pal 带两条:`day`(恒等)+ `night`(拟合值)。
- `WorldState.ambience?: string` —— **全局单值**(照原版 flag 语义),默认 `'day'`,
  只被脚本指令改,跨场景持续,随 SavePayload.world 免费持久化(旧档缺省 → day)。
  **不加 per-scene 默认字段**:原版 13 处全走 onEnter 脚本切换,模型够用(YAGNI)。

## 4. 脚本指令

```ts
| { kind: 'setAmbience'; ambience: string } // 0x53(day)/0x54(night) 的 clean 表达
```

- ScriptHost 加 `setAmbience(id: string): void`(main.ts 唯一实现;scriptHost/autoHost
  是 `{...host}` 委托自动继承)。
- 未知 id → warn + 不动(工程没带 ambiences 表时指令自然 no-op)。

## 5. 渲染(引擎)

- main.ts 持 `ambienceFx`:当前乘色 + 目标乘色 + 300ms 线性过渡(原版切换都夹在
  黑屏淡入淡出里,渐变只是兜底更顺滑;确定性 time-based,纯视觉无输入门,无收尾人问题)。
- **每帧最末**(一切 UI 画完后)一条:
  `globalCompositeOperation='multiply'` + fillRect 全画布。恒等色(≥254 全通道)跳过。
- **两个出口都挂**:tick 的战斗分支早退(`activeBattle.render` 后)+ 大世界路径末尾
  —— 夜里进战斗照染(原版夜战就是夜盘,一阶段同)。
- 普通编辑器场景画布**不染**（创作视图恒白天）。氛围工作台另有显式、只读的场景效果预览：它复用当前作者
  快照和场景 renderer，在独立 surface 上调用 runtime 同一 multiply compositor；场景、相机、缩放和原图/滤镜
  A/B 只属于临时预览上下文，不写入 content、撤销栈或存档。完整脚本过渡、战斗和 UI 染色仍走引擎试玩 / E2E。

## 6. 迁移(不动迁移器 —— MG2 红线)

手补 12 个场景 JSON 的 13 处 `{kind:'unmigrated',opcode:83/84}` →
`{kind:'setAmbience',ambience:'day'|'night'}`(一次性脚本,同 C3 洗 desc 套路)。

## 7. 编辑器

- 指令手册(command-catalog)+ CommandForm:setAmbience 表单(氛围下拉,origin 0x53/0x54)。
- `ambiences` 入 EditorState/序列化 round-trip(同 battleFields 惯例,manifest 声明才产出)。
- 氛围工作台：左侧定义目录；中央编辑名称/RGB/HEX 并以真实静态场景 A/B 预览；右侧只展示引用与生效说明。
  新建氛围 = 作者自定义（血月/水下），右上角全局保存是唯一落盘入口。
- 预览底帧按工程、场景、地图修订和资源身份缓存；改 tint 或切换 A/B 只重做末端合成，不重复组装场景，也不
  执行场景脚本、实体行为、战斗、菜单或时间推进。

## 8. 验收

1. `?scene=s042`(onEnter 真跑)→ 夜色;与一阶段 game(6005)同场景并排截图,色差可辨则调滤镜。
2. s043 洞内 onEnter 0x53 → 回昼。
3. 夜态存档 → 读档 → 夜色还原;新档 = 昼。
4. 夜里开战斗 → 战斗画面同染。
5. `pnpm check` 全绿;编辑器指令表单可编可存。

## 9. 砍掉的(记录在案)

- 时间流逝(游戏内时钟):原版无此机制,且与剧情脚本切换打架。不做。
- 天气(雨/雪粒子):新子系统,无原版考题。有真内容需求再立项。
- per-scene 默认氛围字段:onEnter 脚本已覆盖。真有作者需求(「这洞永远黑」)再加。
