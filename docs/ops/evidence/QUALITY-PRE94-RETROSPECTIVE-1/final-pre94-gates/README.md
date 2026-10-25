# pre94唯一最终集中门禁窗口

Status: running; no integration acceptance
Owner: Codex（单Agent）

[当前阶段/单文件八维与身份映射](review.json)、[首跑完整未裁剪原件](initial-receipts.json.gz)。冻结代码d36448a68，原83卡有限范围已代码接受，未扩94–102。最新main b3d35be6两CI成功链接及0behind在freeze原件。

全仓pnpm check首跑exit1，不能称通过：game G02-D11仍把原盘对话入口绑定为author解析器，与刚批准的PAL分域接线冲突。保留13身份数及全部像素/错误断言，改为精确shared PAL对象并明确排除canonical；头注“真实chunk”更正为手列合法fixture。定向13/13且0stderr，尚未以此授全仓通过。旧12业务合同不变，无静音、ignore、规则放宽或新产品行为。

下一步重跑一次完整check以取得实际exit0，再只采一次官方覆盖率；若合理重构使计数变化，按用户授权逐项核证并用同报告ratchet/protected。当前official/coverage/protected/PR/合并均未执行或未通过。原始失败不覆盖，后继结果另附。
