// 抓取页面结构骨架：从 #app 开始向下遍历，输出每个有意义节点的
// tag、class、文本摘要、尺寸、关键样式，用于精确复刻
export default async function (page) {
  const tree = await page.evaluate(() => {
    function rect(r) {
      return {
        x: Math.round(r.x), y: Math.round(r.y),
        w: Math.round(r.width), h: Math.round(r.height)
      }
    }
    // 只关心这些样式
    const STYLE_KEYS = ['display', 'flexDirection', 'justifyContent', 'alignItems',
      'gap', 'padding', 'margin', 'width', 'height', 'background', 'backgroundColor',
      'backgroundImage', 'border', 'borderRadius', 'color', 'fontSize', 'fontWeight',
      'position', 'top', 'left', 'right', 'bottom', 'overflow', 'boxShadow', 'flex', 'flexGrow']
    function pickStyle(el) {
      const cs = getComputedStyle(el)
      const o = {}
      for (const k of STYLE_KEYS) {
        let v = cs[k]
        // 去掉无意义默认值
        if (v === 'normal' || v === 'none' || v === 'rgba(0, 0, 0, 0)' || v === 'auto' ||
            v === '0px' || v === 'static' || v === 'block' || v === 'row' || v === '')
          continue
        o[k] = v
      }
      return o
    }
    function textSummary(el) {
      // 只取直接文本节点，不递归
      let t = ''
      for (const n of el.childNodes) {
        if (n.nodeType === 3) t += n.textContent
      }
      t = t.replace(/\s+/g, ' ').trim()
      return t.length > 60 ? t.slice(0, 60) + '…' : t
    }
    function build(el, depth, maxDepth) {
      if (depth > maxDepth) return null
      const tag = el.tagName.toLowerCase()
      // 跳过无用节点
      if (['script', 'style', 'link', 'meta', 'noscript', 'svg', 'path'].includes(tag)) return null
      const r = el.getBoundingClientRect()
      // 跳过不可见元素
      if (r.width === 0 && r.height === 0) return null
      const cls = el.getAttribute('class') || ''
      const id = el.id ? `#${el.id}` : ''
      const text = textSummary(el)
      const node = {
        d: depth, tag, cls: cls.slice(0, 120), id,
        r: rect(r), txt: text || undefined
      }
      // 只对前几层抓样式，避免太重
      if (depth <= 3) node.style = pickStyle(el)
      const kids = []
      for (const c of el.children) {
        const k = build(c, depth + 1, maxDepth)
        if (k) kids.push(k)
      }
      if (kids.length) node.kids = kids
      return node
    }
    const root = document.getElementById('app') || document.body
    // 只抓到第 6 层，否则数据太大
    return build(root, 0, 6)
  })
  return tree
}
