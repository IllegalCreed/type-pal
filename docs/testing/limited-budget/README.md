# Kimi / Grok限额短审（2026-10-02）

用户报告两者约剩1/3额度，改派**各一轮独立短审**，不要求耗尽剩余额度、不自动续派。
不派大量补测，不运行全包、coverage、官方门或浏览器。

| Owner | 卡 | 上限 | 唯一报告白名单 |
|---|---|---|---|
| Kimi | [读档错误边界短审](../../ops/tasks/AUDIT-KIMI-OPENING-LOAD-SMALL-1.md) | 一个缺陷、≤两方案/两页；额外复现最多一例且可不跑 | `docs/testing/kimi-opening-load-small-report.md` |
| Grok | [写入计划六合同短审](../../ops/tasks/AUDIT-GROK-WRITE-PLAN-SIX-1.md) | 六行、≤两页/三条建议 | `docs/testing/grok-write-plan-six-report.md` |

工作树/分支均已由Codex预建；源基点分别849255a4、a295f42c，完整值与读取范围见卡。
角色仅证据Owner；产品、旧测、配置、baseline、真实数据、原GLM/Cursor/Grok大包、共享卡全部只读。
不恢复ZCode UI操作或自动投递，用户手动转发；Kimi不裁具体错误界面，Grok不代修O或否定已accept的400包。
报告独立提交推送后停止，Codex接收并与活动原卡最新状态去重，不把短审当产品build/done或覆盖率增量。
报告交付前不添加不存在的文件导航；接收时由Codex补链接。GLM/Cursor连续返工范围与原配额保持。
