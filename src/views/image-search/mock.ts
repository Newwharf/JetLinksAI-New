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
  { title: '棕色', bg: 'rgb(155, 63, 52)' },
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

// 车辆颜色 chip（色块）：与人员颜色体系一致，色值取自 UAT 配色
export const vehicleColorChipsWithBg: ColorChip[] = [
  { title: '白色', bg: 'rgb(246, 247, 251)' },
  { title: '黑色', bg: 'rgb(17, 17, 17)' },
  { title: '银色', bg: 'rgb(201, 205, 212)' },
  { title: '灰色', bg: 'rgb(141, 141, 141)' },
  { title: '蓝色', bg: 'rgb(32, 71, 244)' },
  { title: '红色', bg: 'rgb(255, 36, 36)' },
  { title: '绿色', bg: 'rgb(25, 139, 18)' },
  { title: '黄色', bg: 'rgb(255, 200, 0)' }
]

// 结果卡片「更多」菜单（人员 / 车辆各一套）
export const personMenuItems = [
  { key: 'search', label: '以此搜图', icon: 'i-ant-design-search-outlined' },
  { key: 'trace', label: '添加到临时轨迹跟踪', icon: 'i-ant-design-node-index-outlined' },
  { key: 'add-profile', label: '添加到人员档案', icon: 'i-ant-design-idcard-outlined' },
  { key: 'download', label: '下载图片', icon: 'i-ant-design-download-outlined' }
]
export const vehicleMenuItems = [
  { key: 'search', label: '以此搜图', icon: 'i-ant-design-search-outlined' },
  { key: 'archive', label: '归档', icon: 'i-ant-design-folder-outlined' },
  { key: 'download', label: '下载图片', icon: 'i-ant-design-download-outlined' }
]

// ===== 摄像头区域树（用于按区域选择摄像头）=====
export interface CameraTreeNode {
  value: string
  label: string
  children?: CameraTreeNode[]
}
export const cameraTreeData: CameraTreeNode[] = [
  {
    value: 'park-1', label: '物联网产业园区',
    children: [
      {
        value: 'b-e', label: 'E栋',
        children: [
          {
            value: 'f-4f', label: '4F',
            children: [
              { value: 'cam-rd-1', label: '研发部-东门摄像头' },
              { value: 'cam-rd-2', label: '研发部-大厅摄像头A' },
              { value: 'cam-pm-1', label: '项目部-走廊摄像头B' },
              { value: 'cam-pm-2', label: '项目部-会议室摄像头' }
            ]
          },
          {
            value: 'f-2f', label: '2F',
            children: [
              { value: 'cam-2f-1', label: '车库摄像头' },
              { value: 'cam-2f-2', label: '南门摄像头' },
              { value: 'cam-2f-3', label: '前台摄像头' },
              { value: 'cam-2f-4', label: '电梯口摄像头' }
            ]
          }
        ]
      },
      {
        value: 'b-a', label: 'A栋',
        children: [
          {
            value: 'f-1f', label: '1F',
            children: [
              { value: 'cam-op-1', label: '运营办公室摄像头' },
              { value: 'cam-op-2', label: '入口摄像头' }
            ]
          }
        ]
      }
    ]
  }
]

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
  title: string       // 摄像头名称
  time: string // 如 "07-02 13:33"
  location: string
  areaPath: string    // 完整区域路径，如 "E栋/4F/研发部办公区"
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

const camNames = ['东门摄像头', '大厅摄像头A', '走廊摄像头B', '车库摄像头', '南门摄像头', '前台摄像头', '电梯口摄像头', '会议室摄像头']
const areaPaths = [
  'E栋/4F/研发部办公区',
  'E栋/4F/研发部办公区',
  'E栋/4F/项目部办公区',
  'E栋/2F/停车区',
  'E栋/2F/前台',
  'E栋/2F/电梯口',
  'A栋/1F/运营办公室',
  'A栋/1F/入口'
]

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
    const areaPath = areaPaths[i % areaPaths.length]
    out.push({
      id: `card-${i + 1}`,
      img: imgs[i % imgs.length],
      title: camNames[i % camNames.length],
      time: `07-02 ${hh}:${mm}`,
      location: areaPath,
      areaPath,
      // 随机 1-2 个 bbox（模拟目标检测框）
      bboxes: [
        { x: 20 + (i * 7) % 50, y: 15 + (i * 5) % 40, w: 25 + (i * 3) % 30, h: 30 + (i * 4) % 35 },
        ...(i % 3 === 0 ? [{ x: 60 + (i * 2) % 20, y: 50 + (i * 3) % 25, w: 15, h: 20 }] : [])
      ]
    })
  }
  return out
}

// 车辆场景：摄像头名 / 区域路径偏向卡口、停车场、园区出入口
const vehicleCamNames = ['东门卡口摄像头', '南门卡口摄像头', '地下车库入口', '地面停车场A', '地面停车场B', '园区主干道', '西门卡口摄像头', '车库出口']
const vehicleAreaPaths = [
  '物联网产业园区/出入口/东门',
  '物联网产业园区/出入口/南门',
  '物联网产业园区/E栋/地下车库',
  '物联网产业园区/E栋/地面停车场',
  '物联网产业园区/E栋/地面停车场',
  '物联网产业园区/主干道',
  '物联网产业园区/出入口/西门',
  '物联网产业园区/E栋/地下车库出口'
]

// 生成车辆结果卡片（复用现有 12 张图作为占位，后续可替换为车辆素材）
export function buildVehicleResults(): ResultCard[] {
  const imgs = [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12]
  const out: ResultCard[] = []
  let hour = 13, minute = 40
  for (let i = 0; i < 24; i++) {
    minute -= 3 + (i % 4)
    while (minute < 0) { minute += 60; hour -= 1 }
    const hh = String(hour).padStart(2, '0')
    const mm = String(minute).padStart(2, '0')
    const areaPath = vehicleAreaPaths[i % vehicleAreaPaths.length]
    out.push({
      id: `vehicle-card-${i + 1}`,
      img: imgs[i % imgs.length],
      title: vehicleCamNames[i % vehicleCamNames.length],
      time: `07-02 ${hh}:${mm}`,
      location: areaPath,
      areaPath,
      // 车辆检测框：横向偏宽
      bboxes: [
        { x: 15 + (i * 6) % 50, y: 30 + (i * 4) % 30, w: 35 + (i * 3) % 25, h: 28 + (i * 2) % 20 },
        ...(i % 3 === 0 ? [{ x: 58 + (i * 2) % 20, y: 40 + (i * 3) % 20, w: 22, h: 18 }] : [])
      ]
    })
  }
  return out
}
