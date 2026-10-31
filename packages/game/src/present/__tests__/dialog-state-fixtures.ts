/** Finishes these default-rate, no-now text fixtures; never a wall-clock oracle. */
import { FRAMES_PER_CHAR, type startDialogLine, tickDialog } from '../dialog-box.js'
export function finishDefaultTickLine(s: ReturnType<typeof startDialogLine>): void {
  if (s.currentLineText === null) return
  for (let i = 0; i < FRAMES_PER_CHAR * s.currentLineText.length; i++) tickDialog(s)
}
