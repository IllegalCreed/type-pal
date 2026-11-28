/** Shared fixture exports retained for scene-preview tests under their existing Owner. */
export { type Deferred, deferred } from '../../__tests__/test-promises.js'
export { type LegalProject, loadLegalUiProject } from './authoring-project-fixture.js'
export {
  buttonByLabel,
  chooseComboboxOption,
  clickButton,
  clickCheckboxByLabel,
  comboboxByAriaLabel,
  fieldControlByLabel,
  inputByAccept,
  inputByAriaLabel,
  loadFilesIntoInput,
  setInputValue,
  useActEnvironment,
} from './dom-gestures.js'

/** Snapshot project data before a tested operation. */
export function deepSnapshot<T>(value: T): T {
  return structuredClone(value)
}
