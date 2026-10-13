# CODE-QUALITY-80 只读复现证据

本目录是当前候选的诊断观察，不是产品修复验收，也不是浏览器视觉验收。临时 Vitest 源完整保存在 `dev-party-probe.ts.txt`，复制到 `packages/game/src/dev/dev-panel.code53-probe.test.ts` 后执行 manifest 中命令；结束后删除临时文件。未把错误行为固化成常驻通过测试。

- `observations.json`：真实 `applyFixture → startBattle` 和 `B → 队伍 tab → Role1 卡片` 的状态快照。
- `dev-party-probe.txt`：运行退出0，1个诊断探针；只断言入口/合法前提可达，变化结果记录而非接受。
- `manifest.json`：候选commit、实际源SHA、命令与探针SHA。
- 探针使用typed角色/敌人/资源，寿葫芦269和563/564原始脚本片段；无业务核心mock。0毒抗保证装备脚本施毒，不依赖随机命中。全局脚本/毒表和捕获的window监听器在finally恢复；未读写存档或生成物。

实际结果：fixture已经通过startBattle重建寿葫芦效果（563/564存在、runtime HP100→120），推翻“applyFixture必须额外重算装备”的片段推断。原始诊断还记录了战中点击Role1离队后party变为[0]、battlePlayers仍[0,1]，以及探索点击后寿葫芦仍装备269但563/564消失。用户已裁决战斗中禁止队伍编辑；当前实现让战斗卡 disabled，并让探索切队在清毒后调用 `updateAllEquipments`，因此第二个观察已由真实回归覆盖。

探针文本日志仅移除末尾空白行；没有删改诊断、执行结果或观察数据。

`implementation-controls.json` 保存两个实现后判别力反控：省略战斗卡 disabled 时，战斗 UI 回归恰失败一条；省略探索切队装备重建时，寿葫芦生命周期回归恰失败一条。两项恢复原字节后同一测试通过。该记录不冒充修复前 red-first 历史。

最终生命周期回归共 8 tests：真实战斗状态下入队/离队均保持 party、battle players、毒表、runtime 不变；面板先开后启战时旧卡也被 mode guard 拦截；探索离队和入队分别验证清除旧真毒并在新队伍槽重建 563/564。全仓静态门新增两处测试宿主修正：零存档 reload 使用可恢复的 location seam，菜单链接测试显式 preventDefault，消除两条 jsdom navigation 诊断。

最终质量门收据已保存：`gate-check-final.txt`（完整 `pnpm check` exit 0）、`gate-ratchet-final.txt`（官方 ratchet exit 0）、`gate-protected-final.txt`（以 `origin/main` 为保护基线 exit 0）、`gate-docs-final.txt`、`gate-lint-final.txt`、`gate-ledger-final.txt` 与 `final-gates.json`。check 包含 game 313/3545、pal-extract 70/423、reforge 359/8964、editor 631/4951、migrate 96/739；lint 为 4006 files、0 error/warning/info。ratchet 与 protected fast 均通过，coverage baseline 只升不降。

日志收据只去掉末尾空白行和覆盖率表格的行尾填充空格，诊断、计数、退出结果与原始命令均保留。
