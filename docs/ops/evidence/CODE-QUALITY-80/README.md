# CODE-QUALITY-80 只读复现证据

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE-QUALITY-80（dev party 编辑生命周期诊断）证据目录的索引页,对应任务卡 docs/ops/tasks/CODE-QUALITY-80-dev-party-edit-lifecycle.md（Status: done）。本目录是诊断观察与实现后反控,不是产品修复验收,也不是浏览器视觉验收。证据原件即下方逐字节保全的固定main源(3113B,SHA fdccb41f5ba2)。

## 来源与输入

来源为固定Git载体,非本次运行;本页正文无 markdown 链接(原0个链接,处置见作者review的linkDisposition)。目录内容与真实发现:

- 临时 Vitest 探针源完整保存为 dev-party-probe.ts.txt,复制到 packages/game/src/dev/dev-panel.code53-probe.test.ts 执行 manifest 中命令后删除临时文件;未把错误行为固化成常驻通过测试。探针用 typed 角色/敌人/资源与寿葫芦269/563/564原始脚本片段,无业务核心 mock;0毒抗保证装备脚本施毒不依赖随机命中;全局脚本/毒表与捕获的 window 监听器 finally 恢复,未读写存档或生成物。
- observations.json 四个状态快照:fixture 经 applyFixture→startBattle 后寿葫芦效果已重建(563/564 存在、runtime HP100→120),推翻『applyFixture 必须额外重算装备』的片段推断;战中点击 Role1 离队后 party=[0] 而 battlePlayers 仍 [0,1];探索点击离队后 269 仍装备但 563/564 消失。
- 用户已裁决战斗中禁止队伍编辑;当前实现让战斗卡 disabled、探索切队在清毒后调用 updateAllEquipments,第二个观察已由真实回归覆盖。
- implementation-controls.json 两个实现后判别力反控:省略战斗卡 disabled 时战斗 UI 回归恰失败一条(expected false to be true);省略探索装备重建时寿葫芦生命周期回归恰失败一条(expected {} to deeply equal {…(2)});恢复原字节后同一测试通过,不冒充 red-first。
- 最终生命周期回归共 8 tests:真实战斗下入队/离队均保持 party/battlePlayers/毒表/runtime 不变,面板先开后启战旧卡被 mode guard 拦截,探索离队/入队分别验证清旧真毒并在新队伍槽重建 563/564。
- 全仓静态门新增两处测试宿主修正(零存档 reload 用可恢复 location seam、菜单链接测试显式 preventDefault),消除两条 jsdom navigation 诊断。
- final-gates.json 七门回执全 exit 0(check 含 game 313/3545、reforge 359/8964、editor 631/4951;ratchet game 88.05/79.31/89.63%、baseline 只升不降;protected 以 origin/main 为基线通过;lint 4006→证据提交后 4007 files 均 0/0/0;ledger 3268 files/338 closed/10 review/2920 pending);closedFiles 为空,dev-panel 全文件生命周期风险(全局按键 disposer、picker observer/缩略图取消)仍 pending,无文件被强关。

日志收据只去掉末尾空白行与覆盖率表格行尾填充空格;诊断、计数、退出结果与原始命令保留。

## 断言与业务 oracle

文档事实核对(currentExecution=false):各记录按其自身字段成立。本轮逐篇核读 observations/manifest/implementation-controls/final-gates 四个 JSON 与本页记载一致;关键身份:探针 exit 0 带1个诊断探针、反控两针红绿计数(1 failed/4 total)、final-gates 七门 exit 序列全 0 与 targeted 4 files/45 tests。空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;本轮语义整改把探针发现、两项反控与最终门的真实语义写回可见正文,不重开任务、不重跑执行。不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点。gate-*.txt 等文本日志不在本轮1916候选集合内,其数字按本页与 final-gates.json 交叉见证。任务卡已 done,本页不改变终态。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3113B / SHA-256 fdccb41f5ba205c119abf0de6806f475d0aa3e9515c7f20189e6c99d1483e33f；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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

最终质量门收据已保存：`gate-check-final.txt`（完整 `pnpm check` exit 0）、`gate-ratchet-final.txt`（官方 ratchet exit 0）、`gate-protected-final.txt`（以 `origin/main` 为保护基线 exit 0）、`gate-docs-final.txt`、`gate-lint-final.txt`、`gate-ledger-final.txt` 与 `final-gates.json`。check 包含 game 313/3545、pal-extract 70/423、reforge 359/8964、editor 631/4951、migrate 96/739；check 当时 lint 为 4006 files、0 error/warning/info。证据提交后追加的当前 `pnpm lint` 扫描 4007 files，仍为 0/0/0；ratchet 与 protected fast 均通过，coverage baseline 只升不降。

日志收据只去掉末尾空白行和覆盖率表格的行尾填充空格，诊断、计数、退出结果与原始命令均保留。
```
<!-- incremental-original-source:end -->
