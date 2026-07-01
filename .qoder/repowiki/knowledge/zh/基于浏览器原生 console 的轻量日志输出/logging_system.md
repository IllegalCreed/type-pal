本仓库未引入任何第三方日志框架，也未实现统一的 Logger/LogService 抽象。全项目日志输出完全依赖浏览器原生 console API（console.log、console.debug、console.warn、console.error），属于无系统的原始输出方式。

使用模式与约定：
- 开发调试集中在 packages/game/src/dev/dev-panel.ts，以 [dev] / [dev-panel] / [font-test] 等字符串前缀区分来源，用于 F1 面板、场景跳转、MIDI 试听、状态注入等开发者工具。
- 核心运行时兜底在事件系统 (core/event-system.ts)、装备脚本 (core/equip-effect.ts) 等模块中，对尚未具名化的 opcode、越界 ip、未知 label 等情况采用 console.debug 或 console.warn 做 no-op skip + ip++ 式容错，保证游戏不因缺失命令而崩溃。
- 启动错误由 main.ts 通过 console.error('bootstrap failed:', err) 上报异常，并配合 UI overlay 显示。
- 大量单元测试通过 vi.spyOn(console, 'debug').mockImplementation(() => {}) 拦截 console 输出，验证 raw opcode 走 debug 分支的行为。

设计决策：
- 未定义 log level、未封装 logger 工厂、未将日志路由到文件或远端服务；日志仅面向本地浏览器控制台，适合单页游戏引擎的快速调试。
- 所有日志均为同步调用，无异步批处理或采样策略。

开发者应遵循的规则：
- 新增日志直接调用 console.log/debug/warn/error，按来源加 [module] 前缀以便过滤。
- 对可恢复但需关注的路径（未知 opcode、越界）优先用 console.warn；纯调试信息用 console.debug。
- 避免在生产路径中高频 console.log，以免阻塞主循环。