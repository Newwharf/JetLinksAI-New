<script setup lang="ts">
import { useRouter } from 'vue-router'
import guideImage1 from '@/assets/gatewayGuide/video-device-guide-1.png'
import guideImage2 from '@/assets/gatewayGuide/video-device-guide-2.png'
import guideImage3 from '@/assets/gatewayGuide/video-device-guide-3.png'

const router = useRouter()

interface DocTreeNode {
  title: string
  path?: string
  children?: DocTreeNode[]
}

const docTree: DocTreeNode[] = [

  {
    title: '物联网',
    children: [
      { title: '设备管理' },
      { title: '运维管理' },
      { title: '告警中心' },
      { title: '规则引擎' },
      { title: '数据采集' },
    ],
  },
  {
    title: '网关配置',
    children: [
      { title: '平台接入' },
      { title: '远程终端' },
      { title: '插件管理' },
      { title: '固件升级' },
      { title: '网络配置' },
      { title: '串口管理' },
    ],
  },
  {
    title: '视频中心',
    children: [
      {
        title: '视频设备',
        children: [
          { title: '新增视频设备', path: '/video/device-guide' },
        ],
      },
      { title: '分屏展示' },
      { title: '国标级联' },
      { title: '自动录像' },
    ],
  },
  {
    title: '系统管理',
    children: [
      { title: '基本信息' },
      { title: '用户管理' },
      { title: '角色管理' },
      { title: '日历维护' },
    ],
  },
  {
    title: '人工智能',
    children: [
      { title: '智能体开发' },
      { title: '知识库管理' },
      { title: '机器视觉' },
    ],
  },
  {
    title: '资源库',
    children: [
      { title: '采集器模版' },
    ],
  },
]

function openDocNode(node: DocTreeNode) {
  if (node.path) {
    router.push(node.path)
  }
}
</script>

<template>
  <div class="guide-page">
    <aside class="guide-tree">
      <div class="guide-tree__title">边缘网关功能说明书</div>
      <ul class="guide-tree__list">
        <li v-for="root in docTree" :key="root.title" class="guide-tree__node">
          <button class="guide-tree__item guide-tree__item--root" type="button" disabled>
            {{ root.title }}
          </button>
          <ul v-if="root.children?.length" class="guide-tree__children">
            <li v-for="child in root.children" :key="`${root.title}-${child.title}`">
              <button class="guide-tree__item" type="button" :disabled="!child.path" @click="openDocNode(child)">
                {{ child.title }}
              </button>
              <ul v-if="child.children?.length" class="guide-tree__children guide-tree__children--leaf">
                <li v-for="leaf in child.children" :key="`${child.title}-${leaf.title}`">
                  <button
                    class="guide-tree__item guide-tree__item--leaf"
                    :class="{ 'is-active': leaf.path === '/video/device-guide' }"
                    type="button"
                    :disabled="!leaf.path"
                    @click="openDocNode(leaf)"
                  >
                    {{ leaf.title }}
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    </aside>
    <article class="guide-doc">
      <h1>新增视频设备</h1>

      <img class="guide-doc__image" :src="guideImage1" alt="新增视频设备入口" />

      <h2>路径</h2>
      <p>视频中心 → 视频设备 → 新增设备</p>

      <h2>概要</h2>
      <p>
        视频设备新增功能用于将摄像头接入边缘网关的视频中心。用户可以通过新增设备入口进入接入流程，选择摄像头接入方式，扫描或填写摄像头信息，并完成账号认证。新增成功后，摄像头会出现在视频设备列表中，后续可用于实时预览、分屏展示、告警联动和录像查看。
      </p>

      <h2>操作步骤</h2>
      <ol>
        <li>进入网关地址页，点击顶部导航栏中的“视频中心”。</li>
        <li>在左侧菜单中选择“视频设备”。</li>
        <li>点击页面中的“新增设备”按钮，进入视频设备新增流程。</li>
        <li>
          选择设备接入方式。
          <br />
          可根据摄像头实际接入方式选择对应类型，例如 Onvif、GB/T28181、固定地址、插件或 Agent 接入。
        </li>
        <li>
          如果选择 Onvif 接入，可先进行设备扫描。
          <br />
          系统会扫描当前网络环境中的摄像头设备，并展示可接入的设备列表。
        </li>
      </ol>

      <img class="guide-doc__image" :src="guideImage2" alt="扫描摄像头设备" />

      <ol start="6">
        <li>
          在扫描结果中选择需要新增的摄像头。
          <br />
          已接入的设备不可重复选择，未接入的设备可以勾选后继续操作。
        </li>
        <li>点击“下一步”或“绑定设备”，进入账号认证。</li>
        <li>
          输入摄像头账号和密码。
          <br />
          通常需要填写摄像头自身的登录账号和密码，用于完成设备认证和接入。
        </li>
      </ol>

      <img class="guide-doc__image" :src="guideImage3" alt="摄像头账号认证" />

      <ol start="9">
        <li>
          提交认证信息。
          <br />
          系统会校验账号密码，并返回绑定结果。
        </li>
        <li>
          查看绑定结果。
          <br />
          绑定成功的摄像头会加入视频设备列表；绑定失败的摄像头可重新输入账号密码后再次尝试。
        </li>
        <li>
          确认完成新增。
          <br />
          新增成功后，可返回视频设备列表查看摄像头名称、IP、厂商、状态等信息。
        </li>
      </ol>

      <p>
        后续可点击摄像头进行视频预览，也可以在分屏展示、告警联动、自动录像等功能中使用该摄像头。
      </p>
    </article>
  </div>
</template>

<style scoped lang="scss">
.guide-page {
  height: 100vh;
  overflow: hidden;
  background: #fff;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
}

.guide-tree {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 28px 18px;
  border-right: 1px solid #eef0f4;
  background: #fafbfc;
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  &__title {
    margin: 0 0 18px;
    padding: 0 8px;
    color: #1f2329;
    font-size: 15px;
    line-height: 22px;
    font-weight: 700;
  }

  &__list,
  &__children {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__node {
    margin-bottom: 6px;
  }

  &__children {
    margin-top: 2px;
    padding-left: 14px;

    &--leaf {
      padding-left: 16px;
    }
  }

  &__item {
    width: 100%;
    min-height: 30px;
    padding: 5px 8px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #4b5563;
    font: inherit;
    font-size: 13px;
    line-height: 20px;
    text-align: left;
    cursor: default;

    &:not(:disabled) {
      cursor: pointer;
    }

    &:not(:disabled):hover,
    &.is-active {
      background: rgba(110, 75, 255, 0.1);
      color: #6e4bff;
    }

    &--root {
      color: #1f2329;
      font-weight: 600;
    }

    &--leaf {
      font-size: 13px;
    }
  }
}

.guide-doc {
  width: min(780px, calc(100vw - 64px));
  height: 100vh;
  margin: 0 auto;
  padding: 56px 0 80px;
  overflow-y: auto;
  scrollbar-width: none;
  color: #262626;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 15px;
  line-height: 1.86;

  &::-webkit-scrollbar {
    display: none;
  }

  h1 {
    margin: 0 0 28px;
    color: #1f2329;
    font-size: 32px;
    line-height: 1.35;
    font-weight: 700;
  }

  h2 {
    margin: 28px 0 10px;
    color: #1f2329;
    font-size: 18px;
    line-height: 1.5;
    font-weight: 700;
  }

  p {
    margin: 0 0 16px;
  }

  ol {
    margin: 0 0 18px;
    padding-left: 24px;
  }

  li {
    margin: 8px 0;
    padding-left: 2px;
  }

  &__image {
    display: block;
    max-width: 100%;
    margin: 18px 0 22px;
    border-radius: 6px;
  }
}

@media (max-width: 900px) {
  .guide-page {
    display: block;
  }

  .guide-tree {
    position: static;
    height: auto;
    max-height: 42vh;
    border-right: none;
    border-bottom: 1px solid #eef0f4;
  }

  .guide-doc {
    width: calc(100vw - 36px);
    height: auto;
    min-height: 58vh;
    max-height: 58vh;
    padding: 32px 0 64px;
  }
}
</style>
