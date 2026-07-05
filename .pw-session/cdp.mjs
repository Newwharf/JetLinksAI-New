// CDP 客户端：连到 9223，对当前激活的 page 执行操作
// 用法：node cdp.mjs <action> [arg]
//   screenshot <path>      截当前页整屏到文件
//   eval <file.js>         执行 JS 文件，文件内容需 export default async function(page){...}
//   url                    打印当前 url
import { chromium } from 'playwright'

const CDP_PORT = 9223
const action = process.argv[2]
const arg = process.argv[3]

async function main() {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`)
  const ctx = browser.contexts()[0]
  const pages = ctx.pages()
  // 取第一个 page（我们的会话只有一页）
  const page = pages.find(p => p.url() && !p.url().startsWith('chrome://')) || pages[0]
  if (!page) throw new Error('没有可用页面')

  switch (action) {
    case 'url':
      console.log(JSON.stringify({ url: page.url(), title: await page.title() }, null, 2))
      break
    case 'screenshot':
      await page.screenshot({ path: arg, fullPage: false })
      console.log('截图已保存:', arg)
      break
    case 'screenshot-full':
      await page.screenshot({ path: arg, fullPage: true })
      console.log('全页截图已保存:', arg)
      break
    case 'eval': {
      const mod = await import(arg)
      const fn = mod.default
      const result = await fn(page)
      if (result !== undefined) console.log(JSON.stringify(result, null, 2))
      break
    }
    case 'dom': {
      // dump 主框架根元素的 outerHTML
      const html = await page.evaluate(() => {
        const el = document.getElementById('app') || document.body
        return el ? el.outerHTML.slice(0, 50000) : '<empty>'
      })
      console.log(html)
      break
    }
    default:
      console.error('未知 action:', action)
      process.exit(1)
  }
  await browser.close() // 只断开 CDP 连接，不关浏览器
}

main().catch(e => { console.error('CDP 错误:', e.message); process.exit(1) })
