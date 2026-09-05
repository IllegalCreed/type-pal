# E2E-1 - 空白工程可玩性:烟测缝隙全清

Status: done
Owner: Opus(烟测发现 + 落地;用户裁定「修空白骨架真能开局」+ 占位素材现生成)
Reviewer: 用户(方向拍板 + 观感待手动 FSA 复验);Codex/GLM 补签可选(非阻塞)
Phase: phase2
Capability: 作者之旅(空白工程 → 可玩)

## 目标(达成)
- 2026-07-10 端到端烟测暴露 7 条缝,现**全部解决**:点「新建空白工程」→ 出生在一间
  12×12 草地房、可四向行走、被房间边界挡住、占位主角朝向正确 —— 作者从零到可玩的
  主链打通,且启动 **0 警告 0 错误**。

## 缝隙清单(7 缝,全修)
1. ✅ **空白工程开局 404**:骨架旧 start 场景引用 `reuseOriginalMap:0`(空白工程无原版
   资产)。→ 改自有 12×12 OwnMap(草棋盘单层)+ 内置起始瓦片集。`buildBlankProject`。
2. ✅ **party 空 boot 崩**:骨架 `startWorld.party=[]`。→ 内置占位主角 `hero` 入队。
   (引擎侧「无队长也自由观察」的容错是独立健壮性小活,种子塞了主角即不触发,暂不做。)
3. ✅ **缺主色盘**:渲染必需。→ 内置**合成盘 0**(工程自有,非 PAL 原盘;零原版字节)。
4. ✅ 上传 tileset 落盘路径拼接 bug(`assets/` 前缀误拼 assets-root,pal 下 404);单测钉住。
5. ✅ **无 battler 的 actor 不能入队**(instantiate throw)。→ 占位主角带最小 battler。
6. ✅ **引擎无条件预载原版立绘 91 条 warn**:main.ts 硬编码 fetch `/extracted/…/portraits.json`
   → 朝自有工程不存在的 portraits 目录刷满 warn。→ **manifest 未声明 portraits 即整段跳过**
   (pal 声明了 → 路径零变化;自有工程 → 0 warn)。reforge/main.ts。
7. ✅ 编辑器建图 entry 重置公式落在 iso 左缘(卡边界);改 `((W+H)/2,(H-W)/2)` = 图中心。
8. ✅ **dev 模式「新建工程」卡死「载入工程…」**(用户手动 FSA 烟测第一步抓到):菜单
   「新建工程」=回启动屏,但 boot 状态用 null 一态两义(dev=载入占位/生产=启动屏),
   dev 下回 null 永远卡载入占位(自动载入 effect 只跑一次)。→ 摊开四态
   `loading/picker/Booted/error`,回启动屏任何模式都真显示三选一;错误屏也加「回启动屏」
   出口(不再死胡同);顺带更新启动屏空白工程过期文案("地图模块即将推出"→开箱即玩)。
   editor/main.tsx。Playwright 实测 6010:菜单→新建工程→三选一出现。

## 占位素材方针(用户裁定:现生成自有极简小人 = 零原版字节)
- `seed-assets.ts`:合成 256 色盘 + 4 块菱形地形瓦 + 12 帧(4 向×3)占位主角,全部**手工
  指定调色板索引**作画(非量化),经 `encodeSpriteChunk` + 浏览器 gzip 落成原版同构 `.rle`。
- 作者随后在编辑器里逐一替换成自己的瓦片集/精灵/色盘。占位一眼看出「是占位、请替换」。

## 上下文锚点 / 坐标真相(钉死)
- `buildBlankProject` 现为 **async**(占位 .rle 走浏览器 `CompressionStream`);产物二进制值 =
  ArrayBuffer,`writeProject` 走 Blob 落盘。落盘产物与引擎 `loadProject` 已实测互通。
- `entry.pos` = **菱形轴逻辑格**(玩家直接生此);方形 W×H 图房间中心 = `((W+H)/2,(H-W)/2)`。
- 碰撞可全 0:lattice 越界(`col∉[0,W)` 或 `logicalRow∉[0,H)`)自动阻挡 → 天然把玩家困在
  矩形 iso 房间,不必显式画边界墙。floor 铺满所有 lattice 格 = 一个矩形房间。

## 验证(已做 / 待用户手动)
- ✅ 引擎实测(6053,真实 `buildBlankProject` 产物落盘):渲染 / 四向行走 / 边界碰撞
  (右走精确停 col 23)/ 朝向(下双眼、左单眼)/ 相机跟随 / 0 warn。截图存 scratchpad。
- ⏳ **用户 5 分钟手动 FSA 烟测**(自动化驱动不了原生对话框):启动屏「新建空白工程」→ 确认
  开局即出生可走(不再撞 #1/#2)→ 编辑器落在地图模式能看到草地房 → 数据模式上传一张瓦片集 →
  保存 → 重开 → 瓦片集详情能显示。任何不顺立卡。

## 交接
- 2026-07-10 Opus: 7 缝全修,主链引擎实测通(0 warn),`pnpm check` 全绿(顺带修好上次提交
  潜藏的 reforge typecheck 红:assets.test.ts 的 node zlib → 浏览器 compressGzip)。
  Next: 用户手动 FSA 复验开局观感 + 后续 W7 进阶笔刷(随机/盖章/autotile,见 W7B 卡)。
