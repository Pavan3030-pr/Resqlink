/**
 * Browsers, password managers and automation can fill a field without firing the input event React Hook Form
 * listens to, which then reports "required" for a field that visibly has text. Reading the DOM at submit time
 * makes the form trust what is on screen.
 */
export function readFormValues(form: HTMLFormElement, names: string[]): Record<string, string> {
  const data = new FormData(form)
  const out: Record<string, string> = {}
  for (const n of names) {
    const v = data.get(n)
    if (typeof v === 'string') out[n] = v
  }
  return out
}
