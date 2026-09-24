# 已完成 worktree 清理（2026-09-24）

用户授权Codex自行判断并清理无用worktree；本次独立完成，未恢复旧分支。

- 清理前22个工作树（含main），清理后仅main；21个已完成任务的工作树整体移入macOS废纸篓，未永久删除文件。
- 16个非main祖先尖端、去重100个独有提交均在9月23日完整bundle中；逐尖端查bundle头、逐提交查已解包验证库通过。
  其它尖端已在main。不能把“非祖先提交”直接认成尚未交付的产品功能。
- 先清理20个无tracked/untracked改动且无进程cwd占用的工作树。ignored资源和node_modules连同目录原样入废纸篓，不沿符号链接清理主仓资源。
- 剩余preflight工作树的41个未跟踪条目独立复核：39个链接指向主仓data，README.md与unifont-cn.bdf两常规文件SHA-256与主仓相同；无独有作者内容，因此也整体入废纸篓。
- 本地与远端分支引用均未删/恢复；保留main、codex/glm-battle-workflows-r1、codex/pal-simulator-presets。
- `git worktree prune --dry-run --verbose --expire now`确认精确20+1失效登记后才清理登记；主仓与活动Cursor进程cwd不动。

## 恢复与证据

文件仍在`/Users/zhangxu/.Trash/type-pal-*`对应原目录；不要自动清空废纸篓。
Git完整历史备份为本机`.git/branch-archive-20260923.Bpmx6d/all-refs.bundle`，验证库为同目录`verify.git`。
原清理备份README包含单分支恢复方法；不批量重建旧远端分支，不把旧候选当当前main。

本次逐路径/HEAD/状态、实际废纸篓路径、引用前后比对与41文件复核记录位于
`.git/worktree-retirement-20260924.uSuSDV/{plan.json,trashed.json,prune.json,preflight-review.json,preflight-trash.json}`。
需要恢复Git工作树时，从main或备份中的指定提交新建工作树，再按需恢复废纸篓中的附属文件；旧`.git`指针对应登记已退役。

初版本机Swift清理脚本因throw写入非throwing autoclosure编译失败，发生在任何移动之前；更正后执行成功。
没有使用递归强删、强推、旧stash或分支恢复；主仓代码变更属于另两张当前修复卡。
