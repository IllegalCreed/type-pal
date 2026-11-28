# EDITOR-FIRE-PREVIEW-DRAFT-TIMING-1 — 法术预览的草稿计时边界

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Last reviewed: 2026-11-28
Template: task-card-v1 / 1.0.0
Visual Verification Timing: functional

## 目标

让预览在作者编辑时能安全处理暂时不合格的动画计时参数。

## 范围

当前技能和投掷演出共享的 `SkillAnimationEditor` 与 `FireEffectPreview`。已验证的内容保存规则是此处的参数依据。

## 前提与证据

在合法 FIRE 素材上，经真实“循环起点”字段提交 −1，再点击播放。第一个帧间隔结束时绘制访问未定义帧的宽度并抛错。正式断言与原始结果 `fire-draft-invalid-loop-red` 归[治理窗口](QUALITY-EDITOR-COMBAT-SPRITE-PREVIEWS-1.md)。

## 验收

在用户明确取舍后验证无效参数状态、正常参数恢复及实际帧像素。保留共享保存校验和有效预览的速率、循环与音效时机。

## 状态与交接

2026-11-28 用户批准无效参数时提示并停播，修正后可重新播放。Codex build allowed。

当前预览只对有效的有限正数间隔和非负整数循环起点启动时钟。原反例经真实输入改回有效值后可继续播放，帧像素专测保持首帧、循环起点和倍率的独立判据。
