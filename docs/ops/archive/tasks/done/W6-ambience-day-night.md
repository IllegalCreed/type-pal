# W6 - 昼夜氛围系统(全帧乘法滤镜 + 氛围数据表)

Status: done(观感微调留用户:一阶段夜色为真值,可在编辑器氛围页直接调乘色)
Owner: Opus(用户点题「做昼夜系统」;brainstorm 全流程 + 设计拍板「可以」)
Reviewer: 用户(夜色观感终审);Codex/GLM 补签可选
Phase: phase2
Capability: W6 时间/天气/昼夜(本切片只做昼夜;时间流逝/天气砍掉记录在案)

## 设计
[docs/phase2/archive/designs/ambience-design.md](../../../../phase2/archive/designs/ambience-design.md) —— 核心发现:**原版夜盘
在数学上就是一次均匀逐通道乘法**(R×0.458 / G×0.899 / B×1.000,p10-p90 极窄,从 palette 0
的 colors vs nightColors 拟合)→ clean 版 = 每帧最末一条 Canvas `multiply` 合成,零调色盘
概念;起步夜色 `#75e5ff` 有数据出处,非拍脑袋。

## 落地
- **content**:`AmbienceDef {id,name,tint}` + `resolveAmbienceTint`/`lerpTint`/`isIdentityTint`
  纯函数(5 测);`WorldState.ambience?`(全局单值,照原版 fNightPalette 语义,随存档,
  旧档缺省昼);指令 `{kind:'setAmbience', ambience}`。
- **reforge**:loader 读 manifest.content.ambiences(缺省空);ScriptHost.setAmbience
  (main 唯一实现,scriptHost/autoHost 委托自动继承;编辑器 playback host 记日志);
  帧滤镜挂**两个出帧口**(大世界 render() 尾 + 战斗分支)—— UI/对话/菜单/战斗全染
  (原版全局调色板语义,UI 色区夜盘也移位,数据实证);300ms 线性过渡;读档 syncAmbience
  瞬时还原。
- **pal 数据**:ambiences.json(day 恒等 + night 拟合)+ manifest 声明 + **手补 13 处
  unmigrated 0x53/0x54 → setAmbience**(12 场景;不动迁移器,MG2 红线)。
- **编辑器**:指令手册 setAmbience 条目(origin 0x53/0x54)+ CommandForm 氛围下拉
  (Sel 加 labels 可选参)+ ScriptTree 显示「切氛围 夜晚」+ 数据模式「🌗 氛围」页
  (name/拾色器/multiply 滤镜预览条,所见即引擎效果;新建氛围 = 作者自定义)+
  ambiences round-trip(manifest 声明才产出)+ Update/AddAmbienceCommand(undo)。

## 验证(2026-07-10 实测)
- ✅ pnpm check 全绿(3228 测:content+5 / reforge+2 / editor+3)。
- ✅ **s042 隐龙窟外考题**:`?scene=s042` onEnter 真跑 setAmbience → 夜色(深蓝绿压暗);
  同场景 `?pos=79,43`(X5 跳过 onEnter)= 白天版 —— 同机位 A/B 对照截图。
- ✅ 存读档:夜态 F5 → 白天新局 → F9 → ambience=night + 回 s042,夜色还原;新档恒昼。
- ✅ 夜里 startBattle → 战斗画面同染(原版夜战即夜盘)。
- ✅ 编辑器氛围页:2 条列出、拾色器/预览条正常;毒页/物品页等零回归。
- ⏳ 用户观感终审:一阶段夜色为真值(6005 已起,https 自签需点过警告),
  觉得偏了直接在编辑器氛围页调 night 乘色(即改即生效,引擎试玩验)。

## 砍掉的(设计 §9)
时间流逝(原版无此机制,与剧情脚本打架)/ 天气粒子(新子系统无考题)/
per-scene 默认氛围字段(onEnter 脚本已覆盖)—— 有真内容需求再立项。
