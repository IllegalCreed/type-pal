# TEST-GLM-LARGE-WAVE-4 · Codex R3 独立代码验收

日期：2026-09-29。候选 `codex/glm-large-wave-r1` HEAD
`4e200099257ed5167b640eb5abadd7129859dfee`。结论：**测试/证据候选 accept；
尚未集成 main，任务保持 review，官方统一质量/覆盖门未运行，不标 done**。

- R3 对 R2 仅改 8 个原卡工具/回执文件；候选工作树干净，产品源、旧测、
  配置/基线、F–J 零改。60 目标及五个源码 digest 独立校验通过，
  并集为 17 新增源测试 / 43 existing-proof。
- Codex 复跑完整 lint：2666 文件，0 error/0 warning/0 info；editor/reforge/migrate
  三包 typecheck 零诊断；新增定向 editor 50/50、reforge 7/7、migrate 9/9。
- `needle-judge.selftest.mjs` 输出的 8 项断言均通过；Codex 用真实命令表单测试
  独立验证错误 fullName→INVALID/exit2 **无临时文件遗留**，精确 fullName→VALID/exit0，
  执行数 6→6、产品 hash 不变；非唯一注入点→INVALID/exit2，也无遗留。
  判据现在精确比对绝对失败文件、完整 fullName 和 failed=1。
- R2 的硬门、非法强转、同扩展名与实际 17/43 均已核闭合。其余组件 probe
  仅按回执窄范围证明父组件委派，不提升为完整子组件/E2E 合同。
- 候选 `docs/check.mjs` 的 7 条均是只读 `README.md` 未链接五回执、并集、
  R2 证据；Codex 在选择性集成时维护导航。R3 证据所称 selftest“9 项”
  实际打印 8 项；缺的非唯一注入反例由 Codex 实针补核，如上记录。
  返工提交自身 SHA 无法自写进同一提交；本审核回执固定上述完整 HEAD。

后续：与 F–J 已接收候选去重选择性集成，统一串行 `pnpm check` → 官方 ratchet →
受保护 fast，正式收益以 main 并集实测。未过这些门前不标 done/不清理工作树。
