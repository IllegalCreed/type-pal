# 测试文档多维索引

以下页面由 `node scripts/docs/generate-testing-index.mjs` 生成，不能手工编辑：

- [按阶段/专项](by-stage.md)
- [按生命周期状态](by-status.md)
- [按标签](by-tag.md)
- [按 Owner](by-owner.md)

Agent 检索顺序：先读 `catalog.json`，再打开条目的 `index`，最后按 `canonical` 和证据链接读取报告。
