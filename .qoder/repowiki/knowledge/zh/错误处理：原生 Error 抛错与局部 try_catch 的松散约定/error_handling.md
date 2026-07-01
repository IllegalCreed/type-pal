本仓库未建立统一的错误类型体系或全局错误中间件，各包以直接 `throw new Error(...)` 为主，辅以少量 `try/catch` 做资源加载失败时的降级。整体呈现“无中心化、按模块自管”的松散风格。

1. 使用的系统/方法
- 全部使用 JavaScript 原生 `Error`，未定义任何自定义错误类（如 `GameError`、`ValidationError` 等），也未引入第三方错误库。
- 通过 `throw new Error(msg)` 向上冒泡；仅在少数 I/O 密集处用 `try/catch` 捕获并返回可恢复结果。
- 未发现 `panic/recover` 模式（TypeScript 无此语法）。
- 不存在全局错误中间件或统一 catch-all 入口；浏览器端由 Vite dev server / Service Worker 接管未捕获异常。

2. 关键文件与位置
- 共享解码层：`packages/shared/src/mkf.ts`、`packages/shared/src/rng.ts`、`packages/shared/src/yj2.ts`——对 MKF/YJ2/RNG 等二进制格式解析失败时直接抛错，作为底层契约。
- 内容校验层：`packages/content/src/validate.ts`、`packages/content/src/character.ts`——数据 schema 校验失败抛出带上下文路径的错误信息。
- 引擎核心：`packages/game/src/core/event-system.ts`、`packages/game/src/core/scene-system.ts`——事件脚本命令未实现、运行时参数不合法时抛错。
- 资源加载：`packages/game/src/assets/loader.ts`、`packages/game/src/assets/dialog-assets.ts`、`packages/game/src/shell/bootstrap.ts`、`packages/game/src/shell/rng-player.ts`——HTTP fetch 失败时抛错，部分位置用 `try/catch` 包裹继续执行。
- 存档 I/O：`packages/game/src/tools/save-io.ts`——JSON 解析失败、format 头不符时抛错。
- CLI 工具：`packages/pal-extract/src/cli.ts`——安全守卫式抛错（拒绝意外 OUT 目录）。
- 重试封装：`packages/game/src/shell/fetch-retry.ts`——内部记录最后一次 `new Error(...)` 以便重试后上报。

3. 架构与约定
- 分层职责清晰：shared 负责“输入即正确”，一旦解析失败立即抛错，调用方无需判断返回值；content 负责“数据即契约”，校验失败即终止构建；game 层在 bootstrap 阶段集中消费这些错误，决定启动流程是否中止。
- 错误消息采用“前缀 + 上下文”的字符串模板（如 `event-system: ...`、`dialog-assets: ...`、`assets: ...`），便于在控制台快速定位来源。
- 网络请求错误统一检查 `res.ok` 后构造包含 HTTP status 的 `Error`，保持可观测性。
- 测试中大量使用 `mockRejectedValue(new TypeError('Failed to fetch'))` 模拟网络失败，表明团队把网络错误视为可预期分支而非崩溃场景。

4. 开发者应遵循的规则
- 不要定义新的错误子类；如需区分错误类别，至少为 `Error` 附加结构化字段（如 `code`、`context`）并在消息中包含模块前缀。
- 底层解析函数（shared）遇到非法输入一律抛错，不做静默返回；上层在 bootstrap 阶段统一捕获并决定是否回退。
- 所有 `fetch` 调用必须检查 `res.ok`，失败时抛错并附带 URL 与 status。
- 需要容错的异步链路（如字体、PNG 解码）用 `try/catch` 包裹，记录错误日志后走降级路径，避免阻塞主循环。
- 避免在热路径（每帧 tick）中使用 `try/catch` 控制正常流程；将异常视为真正的异常。
- 未来若引入全局错误边界，建议在 `main.ts` 或 shell 入口处注册 `window.onerror` / `unhandledrejection` 收集器，统一上报到监控平台。

置信度：medium — 代码中存在一致的错误消息前缀与 `res.ok` 检查模式，但缺乏统一错误类型与全局捕获机制，属于“有约定但未工程化”的中等成熟度。