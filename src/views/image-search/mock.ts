/**
 * 文搜图 mock 数据 - 1:1 复刻 UAT 页面文案与结构
 * 数据来源：cloud.jetlinks.cn/project_pdkwhy/#/video/text-search DOM 抽取
 */

// ===== 颜色 chip（上衣/裤子颜色，用色块表示）=====
export interface ColorChip {
  title: string
  bg: string
}

// 上衣颜色：11 个
export const upperColors: ColorChip[] = [
  { title: '白色', bg: 'rgb(246, 247, 251)' },
  { title: '黑色', bg: 'rgb(17, 17, 17)' },
  { title: '灰色', bg: 'rgb(141, 141, 141)' },
  { title: '蓝色', bg: 'rgb(32, 71, 244)' },
  { title: '红色', bg: 'rgb(255, 36, 36)' },
  { title: '绿色', bg: 'rgb(25, 139, 18)' },
  { title: '黄色', bg: 'rgb(255, 230, 0)' },
  { title: '棕色', bg: 'rgb(155, 63, 52)' },
  { title: '紫色', bg: 'rgb(127, 30, 166)' },
  { title: '粉色', bg: 'rgb(246, 168, 199)' },
  { title: '其他', bg: 'transparent' }
]

// 裤子颜色：8 个
export const lowerColors: ColorChip[] = [
  { title: '白色', bg: 'rgb(246, 247, 251)' },
  { title: '黑色', bg: 'rgb(17, 17, 17)' },
  { title: '灰色', bg: 'rgb(141, 141, 141)' },
  { title: '蓝色', bg: 'rgb(32, 71, 244)' },
  { title: '红色', bg: 'rgb(255, 36, 36)' },
  { title: '绿色', bg: 'rgb(25, 139, 18)' },
  { title: '棕色', bg: 'rgb(155, 63, 52)' },
  { title: '其他', bg: 'transparent' }
]

// ===== 时间范围选项 =====
export const timeOptions = [
  '全部时间',
  '今天',
  '近 3 天',
  '近 7 天',
  '近 30 天',
  '自定义'
]

// ===== 目标身份（人员标签下） =====
export const identityChips = ['人员', '男', '女', '儿童', '青少年', '青年', '中年', '老年']

// ===== 人员穿着 =====
export const clothingChips = ['长袖', '短袖', '外套', '卫衣', '运动装']

// ===== 车辆标签 =====
export const vehicleTypeChips = ['车辆', '轿车', 'SUV', '货车', '公交车', '摩托车', '面包车', '皮卡', '电动车', '自行车', '跑车']
export const vehicleColorChips = ['白色', '黑色', '银色', '灰色', '蓝色', '红色', '绿色', '黄色']
export const plateColorChips = ['蓝牌', '绿牌', '黄牌', '白牌', '黑牌']

// ===== 结果卡片 =====
export interface BBox {
  x: number // %
  y: number // %
  w: number // %
  h: number // %
}

export interface ResultCard {
  id: string
  img: string
  title: string
  time: string // 如 "07-02 13:33"
  location: string
  bboxes: BBox[]
}

// 静态导入 12 张缩略图
import r1 from '@/assets/text-search/result-01.jpg'
import r2 from '@/assets/text-search/result-02.jpg'
import r3 from '@/assets/text-search/result-03.jpg'
import r4 from '@/assets/text-search/result-04.jpg'
import r5 from '@/assets/text-search/result-05.jpg'
import r6 from '@/assets/text-search/result-06.jpg'
import r7 from '@/assets/text-search/result-07.jpg'
import r8 from '@/assets/text-search/result-08.jpg'
import r9 from '@/assets/text-search/result-09.jpg'
import r10 from '@/assets/text-search/result-10.jpg'
import r11 from '@/assets/text-search/result-11.jpg'
import r12 from '@/assets/text-search/result-12.jpg'

const locations = ['研发部工作区域', '研发部门口', '应用部门口', '应用部工作区域', '研发部机房过道']

// 生成 24 张卡片（复用 12 张图，时间递减）
export function buildResults(): ResultCard[] {
  const imgs = [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12]
  const out: ResultCard[] = []
  let hour = 13, minute = 40
  for (let i = 0; i < 24; i++) {
    minute -= 3 + (i % 4)
    while (minute < 0) { minute += 60; hour -= 1 }
    const hh = String(hour).padStart(2, '0')
    const mm = String(minute).padStart(2, '0')
    out.push({
      id: `card-${i + 1}`,
      img: imgs[i % imgs.length],
      title: locations[i % locations.length],
      time: `07-02 ${hh}:${mm}`,
      location: locations[i % locations.length],
      // 随机 1-2 个 bbox（模拟目标检测框）
      bboxes: [
        { x: 20 + (i * 7) % 50, y: 15 + (i * 5) % 40, w: 25 + (i * 3) % 30, h: 30 + (i * 4) % 35 },
        ...(i % 3 === 0 ? [{ x: 60 + (i * 2) % 20, y: 50 + (i * 3) % 25, w: 15, h: 20 }] : [])
      ]
    })
  }
  return out
}
