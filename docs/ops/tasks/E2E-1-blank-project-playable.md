# E2E-1 - 空白工程可玩性:烟测缝隙清单(待用户排期)

Status: build
Owner: Opus(烟测发现方;修哪些待用户点菜)
Reviewer: N/A(清单卡;逐项修复时按分级定)
Phase: phase2
Capability: 作者之旅(空白工程 → 可玩)

## 目标
- 2026-07-10 端到端烟测(projects/e2e-own,纯自有内容引擎实测)暴露的缝隙集中登记;
  用户按优先级点菜,逐项修复。**烟测主链已通**:自有瓦渲染/行走/碰撞/穿门/双向遮挡全对。

## 范围
- 缝隙清单(按撞到的顺序):
  1. **空白工程开局即 404**:骨架 start 场景引用 `reuseOriginalMap: 0`,空白工程无
     原版资产(seed.ts buildBlankProject)。→ 应改自有地图 + 内置一张极小缺省 tileset。
  2. **party 空 → 引擎 boot 直接 throw**(main.ts 队长不在 actors 表)。空白工程
     startWorld.party=[] 必崩。→ 降级(无队长=自由观察模式?)或编辑器强制引导配主角。
  3. **骨架缺主色盘**:assets/palettes/0.json 不在空白骨架里,渲染必需。→ 骨架内置盘 0。
  4. ✅ 已修(7b696b41 后续):上传 tileset 落盘路径拼接 bug —— `assets/` 前缀条目
     误拼 assets-root 前缀(pal 下 404);单测钉住。
  5. **无 battler 的 actor 不能入队**(instantiate throw)。作者第一个纯剧情主角必踩。
     → 缺省 battler 或允许非战斗队伍。
  6. **引擎无条件预载原版立绘 chunk 1-91**,自有工程刷 91 条 warn(降级正确但吵)。
     → 按需/按资产存在性加载。
  7. ✅ 已修(本提交):编辑器建图 entry 重置公式 (W/2,H/2) 落在 iso 左缘
     (lattice x=0),人出生即卡边界;改 ((W+H)/2,(H-W)/2) = 图中心。e2e 实测抓出。
- 范围外:FSA 环节(新建工程/保存对话框)自动化驱动不了 —— 用户 5 分钟手动烟测:
  启动屏新建空白工程 → 确认开局表现(会撞 #1/#2)→ 数据模式上传 tileset → 保存 →
  重开 → 瓦片集详情能显示(验证 #4 修复的磁盘路径)。

## 上下文锚点
- 烟测 fixture:projects/e2e-own(README 有跑法与验证点);缝隙 #1/#2/#3/#5 的修复
  涉及 seed 骨架与引擎降级策略(行为设计,修复时按分级走签字)。
- 引擎坐标真相(修 #7 时钉死):OwnMap 存储/渲染用 lattice 域(像素 x∈[0,W*32] 全正),
  实体/entry/行走用 iso 轴(x=(col-row)*16 可负);方形 own 图的 iso 中心 = (W, 0)。

## 验证
- 每项修复:e2e-own 重跑 + 空白工程真实新建(FSA 用户手动)。

## 交接
- 2026-07-10 Opus: 烟测完成,主链通(渲染/行走/碰撞/穿门/双向遮挡);7 缝 2 修 5 待。
  Evidence: 本卡 + projects/e2e-own + 提交记录。Next: User / 按清单点菜排期。
