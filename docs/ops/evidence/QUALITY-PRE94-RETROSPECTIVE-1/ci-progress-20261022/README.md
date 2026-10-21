# pre94 收口 GitHub Documentation CI 返工

Status: recorded
Owner: Codex

## 证据身份

基点e8566c2c7ea1fbdccdbc782bd54216f94cd0823e，同一3y；当前为未提交候选。[机器记录与模板版次指针](record.json)。主树只读。

## 来源与输入

GitHub run39624843994与39600770046的完整job日志，经GitHub connector取回，分别保存在github-docs-e856.raw.gz与github-docs-0f642.raw.gz；gzip解包为完整字节，未裁剪stderr/步骤。两次均check:docs成功、进度完整性失败7项，lint步骤因此跳过。平台action安装/Node弃用告警原样保留，不能写远端全日志零告警。

## 断言与业务 oracle

既有report-governance-progress检查器和task-card-v1合同不改：catalog卡仅三个现成标题映射到requiredSections并补唯一route，原status/正文/历史执行记录保留；三份模板源不修改，逐字节对比当前已批准e856版次与Git blob，为该edition登记保存证据。2026-10-18授权内容修改不冒称与10-17旧源相同，旧sourceSha/独立署名/history仍只属旧版。package.json将真实进度consumer接回check:docs，不移除CI门。

## 结果

本地同入口原progress exit1/7项，修复后exit0/0 integrity issues；五文档consumer全部0，lint5744文件0/0/0。完整本地失败/恢复原件见record索引的local-native.json.gz；首check:docs在工具测试通过后被新增目录缺导航拒绝，已补真实父导航并复验五consumer，不把首跑写成成功。最新e856的Coverage ratchet远端已success；本修复远端Documentation尚待运行。不为文档修复重跑产品coverage。

## 限制与复核

不授产品、E2E、视觉或旧卡重新执行信用。快速核对record的三枚edition pin与Git show e856:<path>、当前字节一致；实际运行node scripts/docs/report-governance-progress.mjs应0 integrity issues，pnpm check:docs须包括此入口。原始失败不会因后续通过而改写。
