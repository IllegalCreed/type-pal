# 百文件窗口统一门原件

[父回执](../README.md)。本目录只记录冻结100主体后的统一门，不授给未审文件任何关闭信用。

## 采集边界

首次 official fast 在第七包 editor 中途随会话执行被中断，没有退出回执，不能记通过。前六包均有完整原生通过摘要、coverage-summary与test inventory，原字节保留。恢复脚本提取官方 runner 的原函数、归一化/census与聚合语句，只补跑editor；同批候选输入指纹及六包产物复读相等后才生成最终报告。恢复脚本首版在启动任何包前有重复raw局部声明的语法错误；失败原件保留，第二版修正词法作用域。

重放工具 [replay.mjs](replay.mjs) 复用完整采集报告，原样提取官方ratchet/protected比较与写基线逻辑，不重复跑覆盖率。最终同报ratchet与protected fast均exit0、stderr为空；809个生产源范围不变，四个指标均提升，无覆盖率基线降档。

首次pnpm check在testing docs处报告四条sourceRef漂移并退出1；对照引用测试字节后完成有限行号/SHA桥接，保留原失败回执，不复写为绿。旧main CI下载及fetch遇到GitHub TLS连接失败；不得将本地origin缓存冒称最新远端。

## 本地结果与复验

完整 `pnpm check`：七包20,503例通过，各包typecheck（含editor脚本）通过，全仓lint为0 errors / 0 warnings / 0 infos；完整stdout 389099字节、stderr 0字节。测试退役数据变更后另跑coverage工具套件，正常通过。官方fast实际20,154例；六完成包复用加editor一次成功补采，首段不是整门通过。8个仍存文件精确快照退役23例，四重复文件删除12例，新存储失败例+1，净-34。

[精确计数与合同去向](recount.json)、[完整字节索引](native-index.json)、[无损原件](native.json.gz)。只读运行 `node docs/ops/evidence/QUALITY-PENDING-100-2/uniform/verify.mjs` 核原件、退出状态、精确身份/范围与未变官方比较器；它不代替实际GitHub发布验收。[复验实现](verify.mjs)。源/test指纹与100主体A–H仍由父目录verify核。

收口账本行已转closed而底部汇总初次仍为695/101，机器检查明确失败；首跑只保存工具输出，随后同状态重现的完整原件为window2-ledger-projection-red。修正汇总为机器实际796/0/2667后再核，不把原失败改成通过。中途Markdown写入首次因Python输入编码未声明而退出、未写文件；加UTF-8声明后完成，只有工具输出，不补造raw。

## 发布状态

100主体＋1新增宿主叶本地接受，机器3463 tracked / 796 closed / 0 review / 2667 pending。新资产需求风险与未审实现保持pending。早先GitHub TLS故障已恢复；04:11Z fetch成功，当前origin/main仍f47，提交前0ahead/0behind。推送、正常受保护PR与合并后main CI继续由goal执行，本地门不能提前替远端声明通过。

成功同步原件window2-fetch-before-commit与[基点快照](publication-base.json)单列发布前提，不算新增代码审查信用。
