// 深挖主内容区 .flow-trend-page 的完整结构 + 样式
export default async function (page) {
  return await page.evaluate(() => {
    function rect(r) {
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
    }
    const STYLE_KEYS = ['display', 'flexDirection', 'justifyContent', 'alignItems', 'gap', 'padding',
      'margin', 'width', 'height', 'background', 'backgroundColor', 'backgroundImage', 'border',
      'borderRadius', 'color', 'fontSize', 'fontWeight', 'position', 'top', 'left', 'right', 'bottom',
      'overflow', 'boxShadow', 'flex', 'flexGrow', 'flexShrink', 'lineHeight', 'textAlign',
      'letterSpacing', 'minWidth', 'maxWidth', 'gridTemplateColumns']
    function pickStyle(el) {
      const cs = getComputedStyle(el)
      const o = {}
      for (const k of STYLE_KEYS) {
        let v = cs[k]
        if (v === 'normal' || v === 'none' || v === 'rgba(0, 0, 0, 0)' || v === 'auto' ||
            v === '0px' || v === 'static' || v === 'block' || v === 'row' || v === '' || v === 'nowrap')
          continue
        o[k] = v
      }
      return o
    }
    function textSummary(el) {
      let t = ''
      for (const n of el.childNodes) if (n.nodeType === 3) t += n.textContent
      t = t.replace(/\s+/g, ' ').trim()
      return t.length > 80 ? t.slice(0, 80) + '…' : t
    }
    function build(el, depth, maxDepth) {
      if (depth > maxDepth) return null
      const tag = el.tagName.toLowerCase()
      if (['script', 'style', 'link', 'meta', 'noscript', 'svg', 'path', 'i', 'span'].includes(tag) && depth > 2) {
        // span/i 只在第 2 层以内保留，深处跳过避免噪音
        if (depth > 2) return null
      }
      if (['script', 'style', 'link', 'meta', 'noscript', 'svg', 'path'].includes(tag)) return null
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) return null
      const cls = el.getAttribute('class') || ''
      const id = el.id ? `#${el.id}` : ''
      const text = textSummary(el)
      const node = { d: depth, tag, cls: cls.slice(0, 100), id, r: rect(r), txt: text || undefined }
      node.style = pickStyle(el)
      const kids = []
      for (const c of el.children) {
        const k = build(c, depth + 1, maxDepth)
        if (k) kids.push(k)
      }
      if (kids.length) node.kids = kids
      return node
    }
    // 找主内容区
    let root = document.querySelector('.flow-trend-page')
    if (!root) {
      // 回退到 main 内容
      root = document.querySelector('.ant-layout-content') || document.body
    }
    return build(root, 0, 8)
  })
}
