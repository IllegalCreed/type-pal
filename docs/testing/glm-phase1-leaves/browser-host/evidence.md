# 四项隔离短视觉样本证据（LV1–LV4）

- 候选：分支 `codex/glm-phase1-leaves-r1`，视觉批次基线 `ee1651b8`（批 F 回执头），
  宿主文件 `browser-host/{host.html,main.mjs,vite.config.mjs}` 随本目录提交（提交 SHA 见 git log）。
- URL：`http://localhost:6082/docs/testing/glm-phase1-leaves/browser-host/host.html`
  （vite strictPort 6082，中间件只读服务主仓 `data/extracted`；未触 6005/6010/6050/606x/607x/E2E 端口）。
- 宿主仅导入实际生产 draw/setup：`drawMenuStack`、`drawBattleUI`、`drawBattleSettlement`、
  `setupToolsPanel`、`drawMinimap`、`createUnifiedProgressUi`、`renderOverlay/hideOverlay`、
  `showCountdown`；真实调色板（fetchPalette 0）+ 真实字形（glyphs.json）+ 真实 SPRITEUI 帧
  （frame-NN.png 按 manifest 下标就位）。320×200 逻辑画布 2× 整数像素展示。
- console 错误：无（页面 error 钩子全程未触发；见各次运行 log 文本）。
- 截图存放 `/tmp/type-pal-glm-phase1-leaves/`（本表 SHA256 为完整值）。

## LV1/C 菜单绘制（drawMenuStack 三态）

| 图 | SHA256 | 尺寸 | 步骤/预期 | 实际 |
|---|---|---|---|---|
| LV1-menu-hub.png | `47efbe9d2d7d5ec05a8f79ca81764d916f95c79aa464fbd063c1778ded9cc165` | 660×430 | 主菜单 hub：金钱框 + 状态/仙术/物品/系统，选中金色闪烁 | 与单测坐标/色合同一致：金钱 1234 数字精灵、(3,37) 框、(16,50) 起 18px 行距 |
| LV1-system-switch.png | `8a68447dab51cd1581aeb6db184e779b3ea6008eede41f03f20e90347ef313a5` | 660×430 | 系统菜单 switch 相：5 项 + 关/开 两单行框（关高亮） | 关/开 框 (130/205,100)、左「关」选中 0xF9 系 |
| LV1-save-slots.png | `2cf40ecb032952cab436c8c61c99bc945e12e527f42be821fef86de1a02e26ef` | 660×430 | 5 槽单行框 + savedTimes（进度二=12 黄数字，余 0）+ 选中色 | 进度一..五 (195,7+38i)、数字右对齐 (270,21+38i) |

## LV2/D 固定战斗快照 + 结算（drawBattleUI / drawBattleSettlement 四态）

| 图 | SHA256 | 尺寸 | 步骤/预期 | 实际 |
|---|---|---|---|---|
| LV2-battle-selectMove.png | `1911fa6f27795d47c4503c44e54068d62d0a2afe8f198a08a277664926d88855` | 650×434 | selectMove：4 主菜单图标 + 双人 PlayerInfoBox + 当前行动箭头 | 真实图标/头像帧；HP 黄/MP 青、slash、箭头在 anchor+(-8,-74)；无异常覆盖 |
| LV2-settlement-exp-cash.png | `3091e3a56d51d7156be54742405376389c7e9765f0b4827652efef5c77d6b97c` | 650×434 | 获得经验值 120 / 打败敌人得 7 文钱 | 数字可见、右/中对齐正确 |
| LV2-settlement-level-up.png | `3420cf0a92a974b3f4d3c3db839006fcafffcd934bdc44e6b7c4396b47052e57` | 650×434 | 李逍遥修行提升 8 行 old→cur | 数字/斜杠/蓝色 max 全部可见 |
| LV2-settlement-learn-magic.png | `eb0e3e1f1c978593a30ac09b8ea5bad6651a3c2ad0e8922b0f185283b2020135` | 650×434 | 赵灵儿练成观音咒（0x1B 色） | 名称黑、法术名红 0x1B |

## LV3/E 工具面板 + 小地图（setupToolsPanel / drawMinimap）

| 图 | SHA256 | 尺寸 | 步骤/预期 | 实际 |
|---|---|---|---|---|
| LV3-tools-panel-open.png | `17f252fe6c170bb51c65d2f64ff66539815c52a4ddd086550b5501f4504b6e00` | 432×812 | Backquote 唤出真实 DOM 面板 | 6 tab + 面板框架渲染 |
| LV3-tools-panel-scene-tab.png | `b17d30f35b00156eae72b0f3fe5a191994b0afa8c5a4fa665abb9f8a5fff0fde` | 432×812 | 切场景 tab：小地图 + 图例 + toggles + 场景信息 | 主角白点+可视白框、NPC/宝物 toggle 勾选、场景信息读自有 GameState（x=1600 y=1040 / 朝向 down / 镜头 x=1440 y=928），只读展示 |
| 点击回调 | —（文本证据） | — | 点「点小地图」记录回调 | `#lv3-callback` = 「点击委派已记录」（截图 LV4-progress 内亦可读） |

## LV4/F 进度收尾 + 计时 overlay（precache-ui / overlay / countdown）

| 图 | SHA256 | 尺寸 | 步骤/预期 | 实际 |
|---|---|---|---|---|
| LV4-progress-playable.png | `989842f6a66aacc6946b8acbff221b3e045f3c5fa88ef939bc0257355d264153` | 1100×1500 | 假消息源推进 setNecessaryProgress 10→100 → 「必要资源就绪 — 可进入」 | 填充到虚线 mark、可玩文案出现 |
| LV4-overlay-visible.png | `989842f6a66aacc6946b8acbff221b3e045f3c5fa88ef939bc0257355d264153` | 1100×1500 | renderOverlay 显示：21 节点 splits + 主计时 | 右上角完整 overlay（预计通关 2:31:39 / 0:01:05.43） |
| LV4-overlay-hidden.png | `c928a5fa8cbe7fc13e76a4349fbbab468c9141141ae8c33f71534dedee959e59` | 1100×1500 | hideOverlay 隐藏 | overlay 消失、状态文字「隐藏」 |
| 倒计时 | —（log 文本证据） | — | showCountdown 3→2→1→null | log：「LV4 倒计时 3→2→1→null 收尾」 |

## 未证项（如实登记）

- 真实地图底图（getMapThumbnail PNG）未接：面板小地图/宿主 minimap 为暗底占位 + 定位点
  （底图 Image 异步链路在单测/集成外，登记未证）。
- 真实 SW 离线、真实音频听感、真实战斗一局不在此样本范围（端口协议与显示已证）。
- 箭头 blink 红/蓝双相位只呈现当前相位；贴图观感以真实 SPRITEUI 资源为准（已用真帧）。
