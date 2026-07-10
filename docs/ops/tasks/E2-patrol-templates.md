# E2 - 巡逻模板(轻量卡)

Status: done
Owner: Opus(选择器:闭合 ⚠️;E2 编辑器列最后一块)
Phase: phase2 / Capability: E2 NPC 行为

- 真值:auto runner = `while(!aborted){ runStages(stages) }` —— 跑完整套自动重跑 = 天然
  循环,巡逻不需要任何「循环」指令。模板形状提炼自 pal 真实数据(s004 e76 环线途经点 /
  e83 驻足张望 wait+facing+frame0)。
- 落地:脚本抽屉插入菜单新「巡逻」组(标题写明插到实体行为脚本 auto):
  🚶 来回走 A↔B(当前位↔右移4格,slow+wait400)/ 🔁 环线四角(顺时针途经点)/
  👀 驻足张望(四向轮转 600ms)/ 🎲 随机游走一步(两层五五开 branch → 四向各 25% 单步)。
  全部展开为普通指令组(N4 模板铁律,不引黑盒),落点/速度插完就地改;A 点取实体当前位。
- 实测:Playwright 插入菜单四模板可见;点「来回走」展开进指令树(walk+wait 行),undo 激活。
  pnpm check 全绿(editor 113 测)。
