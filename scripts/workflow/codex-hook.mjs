import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openWorkflow, sha256, workflowIds, workflowInvocation, workflowNotice } from './open.mjs'

const event = 'PreToolUse'
const decision = (permissionDecision, permissionDecisionReason, additionalContext) => ({
  hookSpecificOutput: {
    hookEventName: event,
    permissionDecision,
    permissionDecisionReason,
    additionalContext,
  },
})
const help = `在首个执行工具前先按 AGENTS 操作路由，以单独的 Bash 调用运行 node scripts/workflow/open.mjs WORKFLOW[,WORKFLOW] [CARD]。WORKFLOW: ${workflowIds.join(',')}。读命中条款后，向用户用一两句说明范围、第一步和验收，再执行。`

async function gate(input) {
  if (input.hook_event_name === 'UserPromptSubmit')
    return { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: help } }
  if (input.hook_event_name !== event) return {}
  if (!input.session_id || !input.turn_id)
    return decision('deny', '缺少会话或轮次身份，无法绑定开工。')
  const directory = join(tmpdir(), 'type-pal-codex-workflow')
  const marker = join(directory, `${sha256(input.session_id)}.json`)
  const invocation = input.tool_name === 'Bash' && workflowInvocation(input.tool_input?.command)
  if (invocation) {
    const { receipt } = await openWorkflow(invocation.operations, invocation.card)
    await mkdir(directory, { recursive: true, mode: 0o700 })
    await writeFile(marker, JSON.stringify({ turn: input.turn_id, receipt }), { mode: 0o600 })
    return decision('allow', undefined, workflowNotice(receipt))
  }
  let recorded
  try {
    recorded = JSON.parse(await readFile(marker, 'utf8'))
  } catch {
    return decision('deny', help)
  }
  if (recorded.turn !== input.turn_id) return decision('deny', help)
  const { receipt } = await openWorkflow(recorded.receipt.operations, recorded.receipt.card)
  if (JSON.stringify(recorded.receipt) !== JSON.stringify(receipt))
    return decision('deny', '本轮已加载的规范或卡面已改变。重新执行开工入口后再继续。')
  return {}
}

try {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  console.log(JSON.stringify(await gate(input)))
} catch (error) {
  console.log(JSON.stringify(decision('deny', `工作流门未能校验来源：${error.message}`)))
}
