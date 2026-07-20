import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = "C:/Users/wsl18/.codex/visualizations/2026/07/20/019f7d79-b2be-7fe2-9283-a329341e42b5/workbench_help_inventory";
await fs.mkdir(outputDir, { recursive: true });

const observedAt = "2026-07-20";
const sourceUrl = "https://cloud-uat.jetlinks.cn/#/console/index";

const rows = [
  ["工作台", "我的项目", "工作台统计", "查看运行项目、启用模块、网关总数、待处理事项", "只读", "如何理解工作台顶部的运行项目/启用模块/网关总数/待处理事项？", "首页顶部统计卡"],
  ["工作台", "我的项目", "我的边缘网关摘要", "查看账号下最近网关、SN、所属项目、绑定时间、同步状态，并进入完整网关清单", "只读/导航", "为什么首页只显示部分网关？如何进入完整网关清单？", "首页左侧/侧栏网关摘要，管理网关入口"],
  ["工作台", "我的项目", "AI 创建项目描述框", "用自然语言描述项目诉求，支持输入后创建项目", "可能创建", "如何通过一句话描述来创建项目？创建按钮为什么是灰色？", "文本框、创建项目按钮"],
  ["工作台", "我的项目", "附带图片", "为项目创建描述附加图片材料", "可能上传", "创建项目时如何附带图片？图片有什么格式或大小限制？", "附带图片按钮"],
  ["工作台", "我的项目", "附带文档", "为项目创建描述附加文档材料", "可能上传", "创建项目时如何附带文档？支持哪些文档类型？", "附带文档按钮"],
  ["工作台", "我的项目", "语音描述", "通过语音补充项目创建需求", "可能录音/输入", "如何用语音描述项目需求？语音没有识别怎么办？", "语音描述按钮"],
  ["工作台", "我的项目", "快捷需求模板", "快速选择巡检模块、合规监管、从空白开始等创建意图", "页面状态", "巡检模块、合规监管、从空白开始分别适合什么场景？", "快捷按钮"],
  ["工作台", "我的项目", "打开能力市场", "跳转应用中心按行业应用、模块、场景包选择成熟方案", "导航", "如何从成熟方案开始创建项目？行业应用、模块、场景包有什么区别？", "打开能力市场、行业应用/模块/场景包入口"],
  ["工作台", "我的项目", "项目概览搜索", "按项目名、应用、运行区域、状态搜索项目", "只读筛选", "项目太多时如何搜索指定项目？支持按哪些字段搜索？", "项目概览搜索框"],
  ["工作台", "我的项目", "项目视图切换", "在卡片视图和列表视图之间切换项目展示方式", "页面状态", "如何切换项目的卡片/列表视图？", "卡片视图、列表视图按钮"],
  ["工作台", "我的项目", "项目卡片信息", "查看项目名称、访问标识、运行区域、启用状态、启用模块、剩余订阅、待处理数量", "只读", "项目卡片上的启用模块、剩余订阅、待处理是什么意思？", "段场巡检、办公室场景项目卡片"],
  ["工作台", "我的项目", "项目配置", "维护项目名称、地图服务 Key、项目 LOGO、浏览器页 icon", "可能保存", "如何修改项目名称、地图 Key、项目 LOGO 或浏览器页 icon？", "配置项目弹层，未点击确认"],
  ["工作台", "我的项目", "进入项目", "进入项目运行空间，继续管理设备、告警和数据", "导航", "如何进入项目？进入项目后能管理哪些内容？", "项目卡片进入按钮"],
  ["工作台", "我的项目", "新建项目 - 配置与用量", "选择运行地区，添加模块，添加能力，查看用量规则和计费提示", "可能创建/计费", "如何创建项目？运行地区、模块、能力和用量规则怎么选？", "新建项目三步弹窗第 1 步"],
  ["工作台", "我的项目", "新建项目 - 基本信息", "填写项目访问地址、项目名称、地图配置、登录资源、成员默认角色、通知接收人、应用入口", "可能创建", "项目访问地址怎么填？高德地图 Key 在哪里配置？成员默认角色怎么设置？", "新建项目三步弹窗第 2 步"],
  ["工作台", "我的项目", "保存草稿", "保存未完成的新建项目配置", "可能保存", "新建项目没填完可以保存草稿吗？草稿在哪里继续？", "新建项目弹窗保存草稿按钮"],
  ["工作台", "我的项目", "确认创建", "在第 3 步确认项目并可能生成待支付订单", "创建/计费", "确认创建项目后会发生什么？为什么会进入收银台？", "新建项目流程说明，未执行"],
  ["工作台", "我的项目", "帮助文档", "查看物联网、告警中心、可视化相关帮助入口", "导航/只读", "首页帮助文档里有哪些内容？如何新增产品/设备？", "帮助文档区域"],
  ["工作台", "我的项目", "账户信息", "查看账号、主账号标识、企业资料完善状态，进入账号中心或完善资料", "导航/可能编辑", "如何完善企业资料？账号中心在哪里？", "账户信息侧栏"],
  ["工作台", "我的项目", "通知与消息", "查看未读提醒、告警通知、系统消息、业务流程数量，并进入消息页面", "导航/只读", "如何查看系统消息和待处理通知？", "通知与消息侧栏"],
  ["工作台", "边缘网关", "网关统计", "查看全部网关、待加入项目、已加入项目数量", "只读", "网关统计里的待加入项目和已加入项目是什么意思？", "边缘网关页顶部统计"],
  ["工作台", "边缘网关", "绑定网关", "通过 SN 和扫码 Token 绑定一个或多个网关，支持批量粘贴、新增一行、重置、确认绑定", "可能绑定", "如何绑定网关？SN 和扫码 Token 从哪里获取？如何批量绑定？", "绑定网关弹窗，未输入未确认"],
  ["工作台", "边缘网关", "同步到设备", "将网关信息同步到设备侧", "可能同步", "同步到设备有什么作用？什么时候需要点同步？", "同步到设备按钮，未点击"],
  ["工作台", "边缘网关", "所属项目筛选", "按全部、待加入项目、具体项目过滤网关清单", "只读筛选", "如何只查看某个项目下的网关？", "所属项目筛选区"],
  ["工作台", "边缘网关", "网关搜索", "按 SN、项目、型号搜索网关", "只读筛选", "如何按 SN 或型号查找网关？", "搜索 SN、项目、型号输入框"],
  ["工作台", "边缘网关", "检查固件更新", "检查网关是否有可用固件更新", "可能触发检查", "如何检查网关固件是否需要更新？", "检查固件更新按钮，未点击"],
  ["工作台", "边缘网关", "网关列表/卡片视图", "切换网关清单展示方式", "页面状态", "如何切换网关列表和卡片视图？", "列表/卡片单选"],
  ["工作台", "边缘网关", "网关清单信息", "查看 SN、型号/别名、加入状态、最近更新时间、CPU、MEM、DISK 使用率", "只读", "网关列表中的 CPU、MEM、DISK 和更新时间怎么看？", "网关清单行"],
  ["工作台", "边缘网关", "加入项目", "为待加入项目的网关选择项目，进入确认设备步骤，可先新建项目", "可能绑定关系", "未加入项目的网关如何加入项目？加入后会发生什么？", "加入项目弹窗，未下一步未确认"],
  ["工作台", "边缘网关", "打开详情", "进入已加入项目网关详情页", "导航", "如何查看某个网关的详情？", "打开详情按钮"],
  ["工作台", "边缘网关", "网关详情基础信息", "查看 SN、在线状态、所属项目、绑定时间、当前固件、接入地址，支持返回和打开 Web", "只读/导航", "在哪里查看网关接入地址和当前固件？打开 Web 是什么？", "网关详情页顶部"],
  ["工作台", "边缘网关", "运行状态", "查看运行属性、采样时间、展开全部、属性历史图表/列表、近一小时到近30天和自定义时间范围", "只读筛选", "如何查看网关 CPU/内存/磁盘历史趋势？如何切换图表和列表？", "网关详情运行状态页签"],
  ["工作台", "边缘网关", "子设备", "查看网关下子设备，当前可显示空态，并提供绑定子设备入口", "可能绑定", "为什么网关详情里没有子设备？如何绑定子设备？", "子设备页签，未绑定"],
  ["工作台", "边缘网关", "消息日志", "查看当前网关相关设备消息，支持空态提示", "只读", "如何查看网关消息日志？为什么显示暂无匹配消息？", "消息日志页签"],
  ["工作台", "边缘网关", "远程调试 - 远程终端", "管理远程终端标签页，启动终端会话", "可能建立会话", "如何开启远程终端？远程终端未启动怎么办？", "远程调试页签，未开始终端"],
  ["工作台", "边缘网关", "远程调试 - Web访问", "输入边缘内网地址访问服务，支持新窗口访问、清空记录、历史记录筛选", "可能访问", "如何通过 Web 访问网关内网服务？地址格式怎么填？", "Web访问二级菜单"],
  ["工作台", "边缘网关", "远程调试 - 远程桌面", "填写目标 IP 和端口并连接远程桌面", "可能建立连接", "如何连接网关远程桌面？端口默认是多少？", "远程桌面二级菜单，未连接"],
  ["工作台", "边缘网关", "远程调试 - 文件管理", "浏览路径、返回上级/主页、上传文件、新建目录、搜索文件、预览/下载/右键批量操作", "可能上传/新建/下载", "如何在网关文件管理里上传文件、搜索文件或进入目录？", "文件管理二级菜单，未上传未新建"],
  ["工作台", "边缘网关", "远程调试 - 网络调试", "配置报文大小、采样周期、并发数、双工模式、随机负载，开始/停止测速，查看速度和样本", "可能测速", "如何做网关网络测速？双工模式和随机负载是什么意思？", "网络调试二级菜单，未开始测速"],
  ["工作台", "边缘网关", "升级任务", "查看固件升级记录，包含任务、目标版本/构建、状态、进度、创建时间，支持刷新", "只读/刷新", "如何查看网关固件升级记录？升级完成代表什么？", "升级任务页签"],
  ["工作台", "边缘网关", "视觉模型", "查看视觉模型列表、状态、当前版本、版本状态、历史版本，支持检查全部和查看", "可能检查/导航", "如何查看或检查网关视觉模型版本？历史版本在哪里看？", "视觉模型页签"],
  ["工作台", "边缘网关", "大模型", "查看当前部署、刷新状态、安装任务、云端可用模型、刷新模型", "可能刷新/下载/切换", "为什么大模型状态加载失败？如何刷新或安装大模型？", "大模型页签"]
];

const summaryRows = [
  ["菜单", "已覆盖功能点数", "主要能力", "高风险动作提示"],
  ["我的项目", rows.filter(r => r[1] === "我的项目").length, "项目创建、项目概览、项目配置、进入项目、能力市场入口、帮助文档、账户与消息", "保存草稿、确认创建、上传资源、配置确认可能改变数据或产生订单"],
  ["边缘网关", rows.filter(r => r[1] === "边缘网关").length, "网关绑定、筛选搜索、加入项目、详情、运行状态、远程调试、升级任务、模型管理", "绑定网关、加入项目、同步设备、远程连接、上传文件、测速、模型刷新/下载/移除可能改变状态"]
];

const workbook = Workbook.create();
const summary = workbook.worksheets.add("覆盖总览");
const detail = workbook.worksheets.add("功能清单");

summary.getRange("A1:D1").values = [summaryRows[0]];
summary.getRange("A2:D3").values = summaryRows.slice(1);
summary.getRange("A5:B7").values = [
  ["观察日期", observedAt],
  ["观察地址", sourceUrl],
  ["安全边界", "仅观察页面、打开只读详情/弹窗；未新增、未编辑、未保存、未确认、未同步、未绑定。"]
];

detail.getRange("A1:G1").values = [["一级模块", "菜单", "功能点", "功能说明", "操作风险", "建议预置问题", "观察依据"]];
detail.getRangeByIndexes(1, 0, rows.length, 7).values = rows;

for (const sheet of [summary, detail]) {
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(1);
}

summary.getRange("A1:D1").format = {
  fill: "#1F4E79",
  font: { bold: true, color: "#FFFFFF" },
  wrapText: true
};
summary.getRange("A1:D3").format.borders = { preset: "all", style: "thin", color: "#D9E2F3" };
summary.getRange("A5:B7").format.borders = { preset: "all", style: "thin", color: "#D9E2F3" };
summary.getRange("A5:A7").format = { fill: "#EAF2F8", font: { bold: true } };
summary.getRange("A1:D7").format.wrapText = true;
summary.getRange("A:A").format.columnWidth = 18;
summary.getRange("B:B").format.columnWidth = 16;
summary.getRange("C:C").format.columnWidth = 56;
summary.getRange("D:D").format.columnWidth = 60;

detail.getRange("A1:G1").format = {
  fill: "#1F4E79",
  font: { bold: true, color: "#FFFFFF" },
  wrapText: true
};
detail.getRangeByIndexes(0, 0, rows.length + 1, 7).format.borders = {
  preset: "all",
  style: "thin",
  color: "#D9E2F3"
};
detail.getRangeByIndexes(1, 4, rows.length, 1).conditionalFormats.add("containsText", {
  text: "可能",
  format: { fill: "#FFF2CC", font: { color: "#7F6000" } }
});
detail.getRangeByIndexes(1, 4, rows.length, 1).conditionalFormats.add("containsText", {
  text: "创建",
  format: { fill: "#FCE4D6", font: { color: "#9C0006" } }
});
detail.getRangeByIndexes(1, 0, rows.length, 7).format.wrapText = true;
detail.getRange("A:A").format.columnWidth = 14;
detail.getRange("B:B").format.columnWidth = 14;
detail.getRange("C:C").format.columnWidth = 28;
detail.getRange("D:D").format.columnWidth = 54;
detail.getRange("E:E").format.columnWidth = 16;
detail.getRange("F:F").format.columnWidth = 54;
detail.getRange("G:G").format.columnWidth = 34;

const tableRange = `A1:G${rows.length + 1}`;
const table = detail.tables.add(tableRange, true, "WorkbenchFunctionInventory");
table.showFilterButton = true;
table.showBandedRows = true;

const inspect = await workbook.inspect({
  kind: "table",
  sheetId: "功能清单",
  range: "A1:G8",
  tableMaxRows: 8,
  tableMaxCols: 7,
  maxChars: 3000
});
await fs.writeFile(path.join(outputDir, "inspect.txt"), inspect.ndjson, "utf8");

const preview = await workbook.render({ sheetName: "功能清单", range: "A1:G18", scale: 1, format: "png" });
await fs.writeFile(path.join(outputDir, "preview.png"), new Uint8Array(await preview.arrayBuffer()));

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(path.join(outputDir, "工作台功能帮助中心问题梳理.xlsx"));
