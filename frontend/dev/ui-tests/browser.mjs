import puppeteer from 'puppeteer-core'

/** Launches Chrome/Chromium. Set CHROME_PATH, or install `@sparticuz/chromium` as a fallback. */
export async function launch(viewport = { width: 1440, height: 900 }) {
  let executablePath = process.env.CHROME_PATH
  let args = ['--no-sandbox']
  if (!executablePath) {
    try {
      const mod = (await import('@sparticuz/chromium')).default
      executablePath = await mod.executablePath()
      args = [...mod.args, '--no-sandbox']
    } catch {
      console.error('Set CHROME_PATH to a Chrome/Chromium binary (e.g. /usr/bin/google-chrome).')
      process.exit(2)
    }
  }
  // A system Chrome uses its current headless mode; the bundled chromium build needs the legacy 'shell' mode.
  return puppeteer.launch({ executablePath, args, headless: process.env.CHROME_PATH ? true : 'shell', defaultViewport: viewport })
}
