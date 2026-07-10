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
