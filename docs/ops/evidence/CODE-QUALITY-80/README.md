# CODE-QUALITY-80 只读复现证据

本目录是当前候选的诊断观察，不是产品修复验收，也不是浏览器视觉验收。临时 Vitest 源完整保存在 `dev-party-probe.ts.txt`，复制到 `packages/game/src/dev/dev-panel.code53-probe.test.ts` 后执行 manifest 中命令；结束后删除临时文件。未把错误行为固化成常驻通过测试。

- `observations.json`：真实 `applyFixture → startBattle` 和 `B → 队伍 tab → Role1 卡片` 的状态快照。
- `dev-party-probe.txt`：运行退出0，1个诊断探针；只断言入口/合法前提可达，变化结果记录而非接受。
- `manifest.json`：候选commit、实际源SHA、命令与探针SHA。
- 探针使用typed角色/敌人/资源，寿葫芦269和563/564原始脚本片段；无业务核心mock。0毒抗保证装备脚本施毒，不依赖随机命中。全局脚本/毒表和捕获的window监听器在finally恢复；未读写存档或生成物。

实际结果：fixture已经通过startBattle重建寿葫芦效果（563/564存在、runtime HP100→120），推翻“applyFixture必须额外重算装备”的片段推断。战中点击Role1离队后party变为[0]、battlePlayers仍[0,1]，毒表清空。探索中同样点击后寿葫芦仍装备269，但563/564消失。后两者保留为待修事实；本目录不批准具体产品取舍。

探针文本日志仅移除末尾空白行；没有删改诊断、执行结果或观察数据。
