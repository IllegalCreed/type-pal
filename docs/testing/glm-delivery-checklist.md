# GLM 交付前自检清单（强制）

2026-09-19 立档。依据：历次 Codex counter 的共性根因复盘（用户要求总结并落盘）。
适用范围：GLM 作为测试 Coding Owner 的每一个实施包/返工包，**交付给 Codex 接收之前**逐项过完；
任何一项不满足不得交差。本清单是自检下限，不替代卡面/工作包的专项验收条款。

## 历次返工的共性根因（为什么立这个清单）

| 错误类 | 典型实例（已发生≥2 次） | 根因 |
|---|---|---|
| fixture 未过现行守卫 | F bundle 带退役 onEnter；sprites 缺 label；非法 page.body；onTeleport 非 initial 状态放 entry；外部 runScript 与 itemPrivateScript 混在同一 use.effects；虚构 dither source 'held'；三字段手拼 world | 凭"看起来合理"构造数据，没有先喂给 validateAuthorScenes/validateAuthorItemCore 等现行守卫跑绿；用 as never/as unknown 把非法值编译洗白 |
| 回执与提交树不符 | 声明"虚构 source 已删除"实际只加注释；声明"finally 消费收口 Promise"树里没有；逐文件计数写 5/5/3/6 实际 6/4/4/5；"7 文件 Biome 干净"实际 9 文件 1 error；"24 项"实际 23 | 回执凭意图/记忆写，不是从最终提交树的重跑产物生成 |
| 断言无鉴别力 | `cues.length >= 0` 恒真；`expect(w).toEqual(deepSnapshot(w))` 同时刻自比较；快照的是另一次 readJson 的 clone 而非实参；"Unicode 成功正控"实际用非法 schema + toThrow 期待失败；六个单点坏实现下候选全绿 | 按断言形状写测试，没有问"什么坏实现能通过这条断言"；交付前没有对自己的测试做变异自检 |
| 取消/异步证据无因果 | outcome await 可能永不 settle 的 Promise 靠 5s 超时变红（STACK_TRACE_ERROR 非业务红）；finally 只置布尔不释放同一底层；收口 Promise 与实际读取无因果；"同 reader 重播"实际用了另一个 reader | 缺"进入见证 + 可释放底层 + 同一对象观测"三件套；用别的 reader/Promise/布尔冒充证据 |

## Codex 的查法（对齐检查方式）

1. 拿候选 fixture 直接喂产品守卫（witness 工具 fixture checks）——不听"合法"声明，跑一遍。
2. 注入单点坏实现，看**候选自己的测试**是否以 AssertionError 业务红失败（不是独立 oracle 红）；
   并构造"目标超时 + 别例业务红"等混合场景验证判据本身。
3. 回执对着树核：git show 候选树、Vitest JSON 逐文件计数、完整新文件清单跑 Biome。
4. 逐条读断言找空转：哪条断言什么坏实现都挡不住，一眼挑出。

## 交付前强制清单（按序执行，缺一不交）

1. **fixture 合法性门**：每个新 fixture 在测试文件内先过对应现行守卫全绿
   （assertXFixtureLegal 模式：守卫调用写进测试、在消费前执行）；Codex witness 工具的
   fixture 检查（有就）全 accepted。grep 本包新文件中所有 `as never` / `as unknown`，
   逐个说明合法性依据；说明不了的删掉或归防御/非法域轴，不得当合法正控。
2. **变异自检**：自己的 mutants 脚本全绿，且**每针是新增断言自身的 AssertionError 红**
   （钉名测试精确标题 failed + 该目标 failureMessages 首行匹配 AssertionError/^expect(）；
   不允许目标超时/STACK_TRACE_ERROR/未运行/仅别例红。存在 Codex witness 工具时复跑：
   detected 全、MISSED/invalid 为零、mixedFailureAccepted=false。
3. **保真断言审计**：每条"不变/保真"断言确认三点——快照的就是**真正传入**的对象、
   时机是**调用前**拍**最后一次消费后**比、无恒真无自比较。API 本身原地改 state 的按合同
   写正向断言，不误套不变性。
4. **取消/异步三件套**：取消类用例固定写法——entered 标志证明真进入；abort 后**同步观察
   变量**断言（不 await 可能永不 settle 的 Promise）；finally 释放**创建的那个** deferred 并
   消费**发起的那个**播放/读取 Promise、核迟到零提交。禁止用别的 reader/Promise/布尔冒充。
5. **回执从树生成**：所有数字（逐文件计数、Biome、覆盖）只从**最终提交树的重跑产物**抄
   （Vitest JSON、Biome 完整新文件清单含 JSON/mjs/mts、/tmp 覆盖报告）；回执每句强声明
   在树上 grep 对应代码确认存在；声明清单与树证据逐条对一遍。
6. **门禁复跑**：定向、相邻、涉及包全测、包 typecheck、全部新增文件 Biome——exit 码如实
   记录，不省略不粉饰。

## 纪律

- 清单是**下限**：卡面/工作包的专项条款（计数口径、覆盖分栏、白名单、负控数量）另行满足。
- 自检发现的问题在交付前修完；修不完如实报告并延期交付，不带病交差。
- 每次收到 counter 后，先对照本清单定位是哪一档失守，更新本表实例列（错误类表是活文档）。
