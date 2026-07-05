// 防闪退的 Playwright 有头会话启动器
// 机制：
//   1. 持久化用户数据目录 ~/.jetlinks-pw-profile/ —— 登录态/cookie/localStorage 落盘
//   2. CDP 远程调试端口 9222 —— 闪退后端口释放，重启即恢复
//   3. state.json 记录最后 URL/标题 —— 恢复时自动回到该页
import { chromium } from 'playwright'
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = resolve(process.env.HOME, '.jetlinks-pw-profile')
const STATE_FILE = resolve(__dirname, 'state.json')
const CDP_PORT = 9223
// 启动时的初始页（首次或恢复失败时用）；可通过 argv[2] 覆盖
const DEFAULT_URL = process.argv[2] || 'about:blank'

// 自动探测已下载的 Chromium 可执行文件（不强制要求 chromium-1228）
function findChromium() {
  const cache = resolve(process.env.HOME, 'Library/Caches/ms-playwright')
  try {
    // 优先 chrome-mac-arm64（新版），再回退 chrome-mac
    for (const sub of ['chrome-mac-arm64', 'chrome-mac']) {
      for (const dir of readdirSync(cache)) {
        if (!dir.startsWith('chromium-')) continue
        // Google Chrome for Testing.app
        const cft = resolve(cache, dir, sub, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing')
        if (existsSync(cft)) return cft
        // Chromium.app
        const chr = resolve(cache, dir, sub, 'Chromium.app', 'Contents', 'MacOS', 'Chromium')
        if (existsSync(chr)) return chr
      }
    }
  } catch {}
  return undefined // 让 Playwright 用默认逻辑（会抛清晰错误）
}
const EXEC = findChromium()

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'))
  } catch {
    return null
  }
}
function saveState(s) {
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2))
}

async function isAlive() {
  // 探测 CDP 端口是否已有浏览器在监听
  try {
    const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)
    return r.ok
  } catch {
    return false
  }
}

async function main() {
  mkdirSync(PROFILE_DIR, { recursive: true })

  if (await isAlive()) {
    console.log('[launch] 浏览器已在运行（CDP 9222 存活），无需重复启动')
    return
  }

  // 启动持久化上下文 —— 关键：登录态会保留在 PROFILE_DIR
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    executablePath: EXEC, // 复用已下载的 Chromium，不依赖特定版本
    viewport: null,     // 使用真实窗口尺寸，避免缩放问题
    args: [
      `--remote-debugging-port=${CDP_PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--start-maximized',
      '--disable-features=TranslateUI',
    ],
  })

  // 选定首个页面
  const page = context.pages()[0] || (await context.newPage())

  // 决定打开哪个 URL：有 state 且看起来有效则恢复，否则用默认页
  const st = loadState()
  let target = DEFAULT_URL
  if (st && st.url && st.url !== 'about:blank' && /^https?:\/\//.test(st.url)) {
    target = st.url
    console.log(`[launch] 恢复上次页面: ${target}`)
  } else {
    console.log(`[launch] 全新启动，打开: ${target}`)
  }
  await page.goto(target, { waitUntil: 'domcontentloaded' }).catch(() => {})

  // 后台轮询保存状态（每 3 秒记录当前 URL/标题）
  const tick = async () => {
    try {
      const pages = context.pages()
      const cur = pages.find(p => p.url() && !p.url().startsWith('chrome://')) || pages[0]
      if (cur) {
        saveState({
          url: cur.url(),
          title: await cur.title().catch(() => ''),
          savedAt: new Date().toISOString(),
        })
      }
    } catch {}
  }
  const interval = setInterval(tick, 3000)
  page.on('framenavigated', () => setTimeout(tick, 200))

  // 持久会话：不自动关闭，等用户手动关闭或进程退出
  console.log(`[launch] 会话已就绪（持久 profile + CDP ${CDP_PORT}）。浏览器关闭后本脚本自动退出。`)
  console.log(`[launch] profile: ${PROFILE_DIR}`)
  console.log(`[launch] state:   ${STATE_FILE}`)

  context.on('close', () => {
    clearInterval(interval)
    tick()
    console.log('[launch] 浏览器已关闭，状态已保存。下次运行 launch.mjs 将自动恢复。')
  })

  // 保持脚本存活
  await new Promise(() => {})
}

main().catch(e => {
  console.error('[launch] 启动失败:', e)
  process.exit(1)
})
