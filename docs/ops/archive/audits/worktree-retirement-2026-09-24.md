# 已完成 worktree 清理（2026-09-24）

Status: historical
Last reviewed: 2026-10-15
Owner: Codex（文档治理；原作者与原任务 Owner 保留在历史原文）
Template: audit-report-v1 / 1.0.0

## 审计问题

记录 2026-09-24 已完成 worktree 的清理范围、可恢复性与未动边界。目标是解释当次清理依据，不重新授权今天清理任何现存 worktree、分支或废纸篓。

## 范围与证据

原文称用户授权 Codex 自行判断：22 个工作树至仅 main，21 个移入废纸篓；16 个非祖先尖端/100 个独有提交有 bundle 备份，preflight 的 41 个未跟踪项独立核对。执行路径与本机验证库完整列于原文，本轮未访问或验证这些历史本机产物仍存在。

## 发现

- 原清理先排除 tracked/untracked 改动与进程 cwd 占用，ignored 资源随目录原样移动，不沿 symlink 清主仓。
- 最后 41 项含 39 个主仓 data 链接及两个同 SHA 常规文件；不能从非祖先尖端推断未交付功能。
- 原文明确分支未删/恢复，20+1 失效登记经 dry-run 后才 prune；初次 Swift 编译失败发生在移动前。

## 结论

原陈述为当次清理成功且未强删、强推、恢复旧 stash/分支。它不是当前机器的目录清单或备份可用性保证；复原必须重新核精确对象和实际路径。

## 整改与复核

本轮只治理历史说明。需要恢复时按原备份 README 的单分支方法逐项核验，不批量恢复旧候选；当前共享树纪律见[现行工作流](../../agent-workflow.md#共享工作树与-stash)。

## 历史范围

2026-09-24 的清理审计，引用 2026-09-23 bundle；原日期与数量不更新成当前盘点。

## 当时证据

完整原文保留 `.git/worktree-retirement-20260924.uSuSDV` 下记录、Trash 原目录、bundle/verify.git 和恢复限制。来源字节与 SHA 在本批保留回执中。

## 当前有效性

historical。此文件不证明当前 `.Trash` 或私有 Git 备份仍可用，不作为新增删除/恢复授权。

## 继任文档

当前操作先读[共享工作树规则](../../agent-workflow.md#共享工作树与-stash)与目标任务；原备份仅按实际可读性判断，不创建平行清理任务。

## 原始结论

以下完整原文保留当时的动作和证据陈述：

> # 已完成 worktree 清理（2026-09-24）
>
> 用户授权Codex自行判断并清理无用worktree；本次独立完成，未恢复旧分支。
>
> - 清理前22个工作树（含main），清理后仅main；21个已完成任务的工作树整体移入macOS废纸篓，未永久删除文件。
> - 16个非main祖先尖端、去重100个独有提交均在9月23日完整bundle中；逐尖端查bundle头、逐提交查已解包验证库通过。
>   其它尖端已在main。不能把“非祖先提交”直接认成尚未交付的产品功能。
> - 先清理20个无tracked/untracked改动且无进程cwd占用的工作树。ignored资源和node_modules连同目录原样入废纸篓，不沿符号链接清理主仓资源。
> - 剩余preflight工作树的41个未跟踪条目独立复核：39个链接指向主仓data，README.md与unifont-cn.bdf两常规文件SHA-256与主仓相同；无独有作者内容，因此也整体入废纸篓。
> - 本地与远端分支引用均未删/恢复；保留main、codex/glm-battle-workflows-r1、codex/pal-simulator-presets。
> - `git worktree prune --dry-run --verbose --expire now`确认精确20+1失效登记后才清理登记；主仓与活动Cursor进程cwd不动。
>
> ## 恢复与证据
>
> 文件仍在`/Users/zhangxu/.Trash/type-pal-*`对应原目录；不要自动清空废纸篓。
> Git完整历史备份为本机`.git/branch-archive-20260923.Bpmx6d/all-refs.bundle`，验证库为同目录`verify.git`。
> 原清理备份README包含单分支恢复方法；不批量重建旧远端分支，不把旧候选当当前main。
>
> 本次逐路径/HEAD/状态、实际废纸篓路径、引用前后比对与41文件复核记录位于
> `.git/worktree-retirement-20260924.uSuSDV/{plan.json,trashed.json,prune.json,preflight-review.json,preflight-trash.json}`。
> 需要恢复Git工作树时，从main或备份中的指定提交新建工作树，再按需恢复废纸篓中的附属文件；旧`.git`指针对应登记已退役。
>
> 初版本机Swift清理脚本因throw写入非throwing autoclosure编译失败，发生在任何移动之前；更正后执行成功。
> 没有使用递归强删、强推、旧stash或分支恢复；主仓代码变更属于另两张当前修复卡。
>
