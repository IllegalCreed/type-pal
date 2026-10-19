# game core 小文件四件复审（glm-foundation 模块 5 批 3）

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线（body 基准=assets 批2提交后 HEAD）
范围：`core/{mode,dialog-history,word-lookup,script-catalog}.ts`（93/44/27/98 行）。开工核对无 Owner 冲突。四文件均处 Codex 3n/3o 深切片范围,本批为任务文件指定的 B–G 补维轮。

## 短回执

- **改动 0 处**：四文件零缺陷。mode.ts 头部"T14 stub,T22 真实现"为自释性历史注（已言明后续真实现）,不作变更。
- **验证**：body-invariance 四文件一致（零编辑恒真）;定向 **7 套件 20/20、0 failed-suites**（mode/dialog-history/word-lookup/dependency 含 script-catalog 合同）;scoped biome 0/0/0;diff --check 干净。未跑 game 全包/全仓门。

## 八维结论（B–G 补维重点）

| 维 | 结论要点 |
|---|---|
| A(引用) | 3n/3o 期 A 维深切片证据（sdlpal PAL_GameUpdate 调度真值、own-property labelMap、老档归一化）依赖未变,复用。本批复核 mode.ts autoScript 门四态白名单/同帧再驱动两 bug 档案、script-catalog 宝物屋 tp 层补丁（用户 2026-06-13 裁决偏离,提取器忠实边界）与 CLAUDE 陷阱清单一致。 |
| B | 注释与实现/历史一致:mode.ts 的 PAL_GameUpdate 映射注、dialog-history 的 Object.assign 缺 key 语义注、word-lookup 的唯一文案源+降级注、script-catalog 的 MSG 错字考据注——均为有效领域知识,零修改。 |
| C | mode 为纯分发（依赖各 tick,无状态）;后三者为模块级单例（word 表/全局脚本目录）,写入 Owner 唯一（setWordTable/setGlobalEvents）,文档言明 bootstrap 单次注入。 |
| D | 无重复知识;resolveScriptLabel 保留 gs 参数的兼容性有注释依据。 |
| E | 20 例含 mode 门控矩阵、history CAP/去重/restore、getWord fallback、catalog 注入/解析。 |
| F/G/H | 小文件表达清楚;无死出口（均 bootstrap/interpreter 消费）;单例经 setter 注入可测,纯函数直测 ✓。 |

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/core/mode.test.ts src/core/dialog-history.test.ts \
  src/core/word-lookup.test.ts src/core/script-catalog.test.ts src/core/dependency.test.ts
```

失效条件:四文件实现变化 → 重测;PAL_GameUpdate 调度真值或宝物屋裁决变化 → 对应注释复核。
