# @type-pal/shared — 两阶段共享基础类型

第一阶段与第二阶段共用的纯类型/工具（游戏资源描述、事件命令形状、输入等），无运行时循环、
无框架依赖。新代码优先判断是否真的需要跨阶段共享——第二阶段领域类型应放
`@type-pal/content`，避免把两阶段世界观耦合进 shared。

```bash
pnpm --filter @type-pal/shared test
```
