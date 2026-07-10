# A5 - 工程打包导出 zip(分享/备份)

Status: done(FSA 真导出留用户点验:工程菜单 → 🗜 导出 zip → 得 <id>.zip)
Owner: Opus(作者之旅收尾环:游戏做好了得能打包分享)
Reviewer: 用户
Phase: phase2
Capability: A5 工程自包含分发(能力地图 A 域)

## 设计
工程自包含铁律 → 导出 = 把工程文件夹**原样**递归打包(不挑不滤,文件夹就是全部世界),
一个 zip 即可分享/备份。读磁盘:未保存改动不入包(dirty 时 confirm 提醒先保存)。

## 落地
- `core/zip.ts`:零依赖浏览器 ZIP 打包器 —— DEFLATE 走原生 CompressionStream('deflate-raw')
  (方法 8,反涨小文件择优 STORE)、CRC-32 查表、UTF-8 文件名位(中文路径不乱码)、
  DOS 时间恒 1980(**导出可复现**:同内容同字节)。无 zip64,超 4GB/65535 条报清晰错。
  4 测:crc 已知值 / 中文+二进制 roundtrip 逐字节 / STORE 择优 / 可复现性。
- `core/export-zip.ts`:FSA 目录递归收集 → buildZip → Blob 下载 `<projectId>.zip`。
- 工程菜单「🗜 导出 zip…」:有句柄才可用(dev 种子工程禁用带提示);打包中态;dirty confirm。

## 验证
- ✅ pnpm check 全绿(editor 111 测 = +4 zip)。
- ✅ Playwright:pal dev 菜单项就位、禁用 + 提示正确(无句柄)。
- ⏳ 用户:本地工程点导出 → 得 zip → 解开与工程夹逐文件一致(macOS 自带解压即可验)。

## 发现债 → 已修(次日)
- **「另存为」只写 serializeProject 文件集丢磁盘素材** —— 已修:`fsa-copy.ts`
  copyDirRecursive(整树递归拷贝,同名覆盖他文件保留,2 测双向内存 FSA mock)→
  saveProjectAs 先整树拷源目录再覆写内容文件(当前编辑赢);选同一目录 isSameEntry 跳过拷贝;
  App 穿 dirHandleRef。dev 种子工程(无句柄)保持旧行为(serialize-only,其素材本就在
  /extracted 绝对路径)。
