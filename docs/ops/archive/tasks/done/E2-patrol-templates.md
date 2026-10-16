# E2 - 巡逻模板(轻量卡)

Status: done
Last reviewed: 2026-10-15
Owner: Opus(选择器:闭合 ⚠️;E2 编辑器列最后一块)
Governance Owner: Codex
Template: task-card-v1 / 1.0.0
Phase: phase2 / Capability: E2 NPC 行为
Original Owner: Opus（原文记录）

## 目标

保存 E2 巡逻模板的原始轻量卡交付：把来回走、环线、驻足张望和随机单步展开为普通指令组，不引入黑盒循环指令。原任务顶部 done 保留，不将旧交付重新计为本轮产品成果。

## 范围

限 E2 编辑器插入菜单和当时 NPC auto runner 的模板。auto runner 自然重复整套 stages 是原卡前提；当前脚本模型是否仍按该形态实现不由文档迁移重验。第二阶段现行实现合同从 READ-FIRST 与 script-system 进入。

## 前提与证据

原卡引用 pal s004 e76 环线途经点与 e83 驻足张望的 wait/facing/frame0，A 点取实体当前位，速度与落点可就地编辑。最强替代解释是后续运行器或模板已变化；本卡只保留当时前提，不能据此要求当前引擎复活旧结构。

## 验收

原文记载 Playwright 可见四模板、插入来回走后展开 walk/wait 且 undo 激活，pnpm check 全绿、editor 113 测。这是原始陈述；原卡没有独立产物路径或执行日期，本轮不补造、不重跑或授予当前覆盖率信用。

## 状态与交接

历史顶部 Status: done；原任务 Owner 为 Opus，文档治理由 Codex。无下一位 Agent 提示词；任何新实现或缺陷另按当前任务准入，不将历史卡重新开 build。

## 历史范围

原文未标具体执行日期，原始字节由本批保留回执中的 Git blob/SHA 定位。只用于追溯当时的 E2 交付。

## 当时证据

原文的真实数据线索、菜单名称、参数和测试数完整保留在下方；缺少原始执行产物的部分保持明确缺失。

## 当前有效性

historical。done 与当时测试数不证明当前实现仍相同，也不代表本轮 runtime、E2E、视觉或 coverage 通过。

## 继任文档

当前规则见[现行工作流](../../../agent-workflow.md)与[作者脚本合同](../../../../phase2/specs/script-system.md)；本卡不指定新的产品继任任务。

## 原始结论

以下是完整原始卡，按原始时点读取：

> # E2 - 巡逻模板(轻量卡)
>
> Status: done
> Owner: Opus(选择器:闭合 ⚠️;E2 编辑器列最后一块)
> Phase: phase2 / Capability: E2 NPC 行为
>
> - 真值:auto runner = `while(!aborted){ runStages(stages) }` —— 跑完整套自动重跑 = 天然
>   循环,巡逻不需要任何「循环」指令。模板形状提炼自 pal 真实数据(s004 e76 环线途经点 /
>   e83 驻足张望 wait+facing+frame0)。
> - 落地:脚本抽屉插入菜单新「巡逻」组(标题写明插到实体行为脚本 auto):
>   🚶 来回走 A↔B(当前位↔右移4格,slow+wait400)/ 🔁 环线四角(顺时针途经点)/
>   👀 驻足张望(四向轮转 600ms)/ 🎲 随机游走一步(两层五五开 branch → 四向各 25% 单步)。
>   全部展开为普通指令组(N4 模板铁律,不引黑盒),落点/速度插完就地改;A 点取实体当前位。
> - 实测:Playwright 插入菜单四模板可见;点「来回走」展开进指令树(walk+wait 行),undo 激活。
>   pnpm check 全绿(editor 113 测)。
>
