# game-tools(tools 8 件 + speedrun 9 件 = 17 文件)八维复审批

- 批次:pre-94 foundation 模块 11 批 28
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 61+ 提交)
- Coding Owner:GLM;17 文件全文读毕(map-names 11/save-io 26/display-scale 51/quick-save 61/toast 81/fps-overlay 110/minimap 487/tools-panel 1107 + speedrun: countdown 29/time-format 36/store 58/snapshot 58/detectors 76/checkpoints 110/index 116/overlay 120/timer 218)
- **零整改批**(B–H 全维通过;零代码/注释改动,工作树零 diff)

## 零整改依据

- **speedrun 家族**:checkpoints 的 PARTYOFFSET(160,112) 视口↔世界换算考证(PalTimer 源码+香蕉实测坐实)、香蕉树 3 格 tol=0 照抄 PalTimer 精确命中论证、边缘点 ⚠ 待实跑核的诚实标注;snapshot canMove 起表门(boot 预载窗口实测四阶段);timer 的暂停双轨(香蕉拿到即恢复无倒计时 vs F8 倒计时)与 setStep 边沿检测器重置论证;detectors/bossWon 镜像 PalTimer 声明 — 全部准确。
- **minimap**:kinds 缓存按 gs.npcs 引用判失效(wNumScene 先于 npcs 更新的 user 报错根因)、baseFailed 防 404 洪水、currentMapNum>0 门防标题空 widget、"不保证每档都是降采样"边界声明。
- **tools-panel**:battleSig"不是完整 checksum"的范围声明、我方 HP/MP 不显示的滞后理由(战斗工作副本边界回写)、Backquote stopPropagation 放行论证;快捷键 tab 与 input.ts CODE_MAP 一致。
- **小件**:map-names/save-io/display-scale/quick-save/toast/fps-overlay 全部注释与实现一致(F5 拦刷新/对数刻度/HP 颜色阈值)。

## 验证

- 定向 21 文件(speedrun 全家 + save-io/quick-save/msio):**52 套件 106/106,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0;工作树零 diff

## 登记项

无新增。
