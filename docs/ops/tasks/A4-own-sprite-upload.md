# A4 - 自有精灵上传(作者行走图/静物/循环入库)

Status: done(编辑器全链实测;引擎按 path 加载单测钉住;「保存→引擎真跑」留用户 FSA 烟测)
Owner: Opus(选择器规则二「解锁最多」:空白工程线最后一块 —— 不能传自己的角色图谈不上做自己的游戏)
Reviewer: 用户(观感 + FSA 全环)
Phase: phase2
Capability: A4 用户上传自有素材(能力地图 A 域)

## 设计(复用 W7B 瓦片集管线 90%)
- **双轨加载**:`SpriteDef.path?`(A4 新字段)—— 缺省走原版号约定
  `{root}/{sprites}/{num}.rle`;有值走 W7B 同路径约定(`assets/` 前缀 = 工程根相对,
  不拼 root —— pal 的 root 是 /extracted/data,拼上必 404)。上传条目仍分配唯一
  spriteNum(max+1,spriteByNum 缓存键不变)。
- **上传向导**(SpriteUploadWizard,照 TilesetTab 形态):选 PNG → 布局(行走/静物/循环)→
  切帧(行走 = **4 行下/左/上/右 × 每向 N 列**,恰为 dir*framesPerDir+frame 的自然序;
  循环单行;静物整图)→ 量化贴盘 0 预览(行走按向分行显示)→ id/标签 →
  AddSpriteCommand(注册表 + .rle 字节暂存,保存落盘 assets/sprites/<id>.rle)。
- **未保存先内存**(W7B 同理):blob 暂存进 tilesetBlobs(该字段 W7B 起名,现泛化为
  「一切上传二进制」,键 = 工程相对路径 —— 有意不改名,38 处纯噪声 churn 不值当,注释正名);
  SpriteFrames/SpriteThumb/场景画布(useSceneAssets.spriteSources)三处内存解码优先。
- 命令:AddSpriteCommand / RemoveSpriteCommand(捕获条目+字节,invert 原位还原)。

## 顺手根治
`.dscroll`(TilesetTab 中栏容器)从未有过 CSS 规则 —— 落在 .center 的 auto 行,内容超高
= 被 .editor overflow:hidden 裁死且无人能滚(与「指令手册看不到」同病根,瓦片集内容短
至今没暴露)。立规则 `.center > .dscroll { grid-row: 1/-1; min-height: 0; overflow-y: auto }`
一条根治两页(瓦片集 + 精灵向导)。

## 验证(2026-07-10 实测)
- ✅ pnpm check 全绿(3231 测:reforge+1 双轨路径 / editor+2 命令)。
- ✅ Playwright 全链(6010 pal):生成 54×104 四向×3帧测试行走图 → 向导切帧推导
  「3×4 帧 · 每帧 18×26」→ 量化预览按 下/左/上/右 分行(紫袍贴盘后色相保持)→ 入库
  test-hero #637(637 = max 636+1)→ 撤销键激活 → 帧详情页 **12 帧全部从内存字节渲染**
  (磁盘无此文件)→ 场景模式放置 palette 选中(缩略图内存渲染)→ 点画布放置 entity-1 →
  **画布渲染出上传的小人**(spriteSources blob 分流)→ 检查器绑定 test-hero #637。
- ✅ 引擎双轨单测:缺 path 走号约定 / assets/ 前缀直达 / 其余拼 root(assets.test)。
- ⏳ 用户 FSA 全环烟测:上传 → 💾 保存(落盘 assets/sprites/)→ 引擎试玩该场景看到自有精灵;
  以及空白工程里把占位主角换成自己的行走图(actor 换精灵下拉已有)。

## 遗留
- A 域其余格未动:A1 预制素材库(服务器)/ A5 打包导出 zip / A6 更新检查。
- 上传精灵默认无 poses(特殊动作姿势另用姿势框选工具标注,C2 既有)。

## 追加修复(同日):本地工程「引擎试玩」开出李逍遥
作者空白工程点脚本抽屉「🎮 引擎试玩」→ 出来是 pal 的李逍遥。根因:三处按钮(试玩/试打/
试放)写死 `http://…:6051` —— 那台 dev 实例永远 `VITE_PROJECT_ID=pal`;而本地工程 = FSA
句柄,**跨源根本读不到**。修:
- 引擎入口拆成页面无关的 `bootGame(project)`(canvas/location 全部延迟进函数 —— barrel
  导出后 node 测试 import 即执行模块级代码,曾炸 6 个测试文件;boot.ts = 独立页入口壳)。
- 编辑器新增**同源 play.html**:?project=<id> → IndexedDB 句柄(本地工程)→ 手势授权门 →
  fsaSource 磁盘启动;无句柄 → 回退 dev 种子 http(pal 走这)。scene/pos/battle/skill 等
  参数由 bootGame 自读 location,原样生效。vite 多页 build input 补齐。
- 三处按钮全改 `play.html?project=${manifest.id}&…`(PreviewCanvas 试玩 / EnemyTab 试打 /
  SkillTab 试放,projectId 穿线)。
- 实测:6010/play.html?project=pal&scene=s042 引擎起且夜景;6051 独立页零回归;pnpm check
  全绿。FSA 路径(空白工程授权→磁盘启动)留用户烟测 —— 记得先 💾 保存,试玩读磁盘。

## 追加(同日 A4c):战斗外观上传(敌/我双面)—— 作者之旅下一堵墙
空白工程作者能建敌人数值/建队,但敌人外观读原版 `battle-sprite/enemy/<num>.rle` → 自有工程
打起来是**隐形怪**;玩家侧同病(`battler.battleSpriteNum ?? 0` → 404 → 主角战斗中也隐形)。
- content:`EnemyDef.spritePath?` + `BattlerSpec.battleSpritePath?`(同 SpriteDef.path 约定)。
- reforge:`loadBattleSprite(base, kind, id, path?)` 双轨 + 单测;战斗建态两处穿 path。
- 编辑器:共用 `BattleSpriteUploader`(PNG → 帧宽×帧高网格切**顺序帧** → 量化贴盘 0 预览 →
  应用);敌人工作台外观区「⬆ 上传外观」(路径按 id 定死 `assets/battle-sprites/enemy/<id>.rle`,
  重传即覆盖)+ 角色模式「战斗形象」区(player/<actorId>.rle);复合命令 SetEnemy/
  SetActorBattleSpriteCommand(patch path + blob 暂存一步 undo,重传 invert 还原旧字节,3 测)。
- EnemyAnimPreview 吃 path+blob:**上传未保存即在预览台上播动画**(待机/施法/攻击帧字段
  现成可调)。
- 实测(Playwright,pal):生成 4 帧弹跳史莱姆帧带 → 上传器切 4 帧量化预览 → 应用 →
  预览台内存播动画 +「自有外观(未保存)」徽章 → 撤销 → 徽章消失回原版路径。
  pnpm check 全绿(3235 测)。引擎战斗内效果(保存落盘后)同 A4 逻辑,留用户 FSA 全环。
