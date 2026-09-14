# 验证记录与兼容性边界

状态时间：2026-09-14。不要把源码存在等同于已编译、已发布或已真机验收。

## 已通过

- Node.js 核心测试：8 项通过，包括单双周、间断周、日期跨年与假期、调休源日期语义、CSV 引号与换行往返、非法输入、ICS UTC+8 与稳定 UID、时间冲突、虚构 PDF 跨页解析。
- 原始用户 PDF 使用 PDF.js 实际提取：2 页、9 门课、20 条课程时段、1 条实践事项。
- 与独立 pdfplumber 版面提取逐字段比对一致。样本本身只保存在本地工作区，不发布。
- 修复横向旋转 PDF：文本坐标应用 viewport 变换，不能直接将原始 PDF 坐标当成屏幕坐标。
- 网页生产构建成功，包含 PDF worker、中文 CMap、字体与离线缓存清单；无运行时 CDN 依赖。
- 本地 HTTP 服务首页返回 200。

## 发布状态与待验证项

- 浏览器检查已完成，见下方记录。
- Android Gradle 编译与签名校验已通过。Android 15 模拟器安装、离线界面、强行停止后课表保留检查通过。
- GitHub 仓库、Actions 构建与 Pages 已上线，签名 APK 已生成。Release 提供公开签名体验版。
- 各品牌 Android / iOS Safari / 华为浏览器真机测试：未执行。
- Android 锁屏通知、重启恢复、拒绝权限、精确闹钟授权、厂商省电、覆盖升级数据保留：已写实现，需真机验证。
- ICS 在 Apple / 华为 / 小米等日历客户端的导入与重复导入行为：未真机验证。
- XLSX / CSV / HTML 的文件选择、预览、单双周解析和持久化导入均已在 Chrome 实测通过。

## 设备验收矩阵

| 平台 | 交付路线 | 必测项 | 状态 |
|---|---|---|---|
| Android 8+ 且使用现代 System WebView | APK / 网页 | PDF、多页、中文、文件选择、导出 | 待测 |
| Android 12+ | APK | 精确闹钟授权 / 拒绝、锁屏 | 待测 |
| Android 15 模拟器 | APK | 安装、离线界面、强停重启保留 | 已通过；通知与覆盖升级待测 |
| HyperOS / ColorOS / OriginOS / One UI | APK / 网页 | 后台策略、文件 MIME、升级保留 | 待测 |
| iOS / iPadOS Safari | 网页 | PDF worker、文件选择、主屏幕、安全区、ICS | 待测 |
| 可运行 Android 应用的华为系统 | APK / 网页 | WebView、文件选择、后台限制 | 待测 |
| 原生 HarmonyOS | 网页 | 华为浏览器导入、保存与日历路径 | 待测；无原生 HAP |
| 微信内置浏览器 | 引导系统浏览器 | 文件下载、选择器、复制链接 | 待测 |

提醒不使用网页后台计时器。网页关闭后的通知可靠性不能用前台模拟器演示来证明。禁止宣称已适配“所有手机”。

## 后续真机验收清单

1. 使用稳定签名生成 APK，验证签名和包名，测量实际安装包体积。
2. 干净安装后导入虚构文件，关网启动，锁屏等待提醒，重启后再验证。
3. 同一签名覆盖安装后检查课程、设置与调休；保留签名密钥安全备份。
4. 验证 Pages 的所有 PDF 资源可加载，首次缓存完成后断网刷新。
5. 各机型记录系统版本、WebView 版本和失败步骤；敏感课表请脱敏后再反馈。

## 浏览器追加记录

2026-09-14 恢复运行权限后，Chrome 实测通过：真实 PDF 文件选择、20 条预览、确认导入、刷新后持久化、课程搜索、手动添加、1440px 桌面与 390px 手机布局；零 JavaScript 异常、无整页横向溢出。Playwright 初始界面快照通过。截图使用虚构示例。

发布扫描中的两处 PDF.js worker“疑似密码”实际是 `password=this.hasFieldFlag` 和 `password:this.data.password`，均为 PDF 字段属性代码，不是凭据。产物与安装的官方 PDF.js worker 字节一致（SHA-256：88b29a656ecf0b104c2ef1b620be099c523be2a57f27fbb8a42bdac6b8c9a4c0）。已人工核定为误报。

## 发布和离线检查

GitHub Pages 首页及静态资源可访问；Chrome 已实测生产 URL 加载、首次完整缓存后断网刷新、示例课表持久化。XLSX 读取使用 read-excel-file 9 的 readSheet 接口，已用独立生成的标准 OOXML 文件验证。

- 网站：https://kevinkaslana093.github.io/keyu-timetable/
- 仓库：https://github.com/KevinKaslana093/keyu-timetable
- 下载：https://github.com/KevinKaslana093/keyu-timetable/releases

## 最终生产环境检查

全新 Chrome 配置访问正式网站：XLSX 选择、预览和导入通过；等待离线缓存完成后，断网重新加载到新文档并恢复课程通过；保持断网选择真实 PDF，20 条时段解析预览通过。测试未将个人课表发布到网站。

Android 15 状态栏避让使用原生容器布局处理，参考 [Android 官方 WebView 窗口边距说明](https://developer.android.com/develop/ui/views/layout/webapps/understand-window-insets)。


## 1.1.0 发布验收（2026-09-14）

11 项单元测试通过；正式网站已验证教务 HTML 解析、导入预览和两套校区作息保存。Android 15 模拟器通过基础安装/重启，以及虚构网页读取 → 原生回传 → 预览 → 校区选择 → 本地保存全流程；学校窗口无 KeyuNative 接口。此测试使用拦截生成的虚构教务页面，**未使用真实学校账号登录**。真实教务 DOM、校园网环境及各厂商真机仍待验证。

[Android 验证运行](https://github.com/KevinKaslana093/keyu-timetable/actions/runs/34794479083) · [签名构建](https://github.com/KevinKaslana093/keyu-timetable/actions/runs/34794482783) · [1.1.0 下载](https://github.com/KevinKaslana093/keyu-timetable/releases/tag/v1.1.0)


## 1.1.1：读取失败反馈修订

用户在正确的个人课表表格页仍看到“请打开个人课表”提示。排查发现 1.1.0 存在严格星期标题匹配、跳过嵌套课程表格、仅探测一层框架、吞掉实际错误等限制。截图不足以确定该真实页面具体触发哪项，未取得真实 HTML，不宣称已复现该账号页面。

修订支持附加日期标题、嵌套课程表格、多层同源框架和分离表头的列位置识别；错误不再统一替换成操作提示。失败时可复制仅含结构计数的诊断，不包含页面文本、账号、密码、Cookie。

浏览器回归覆盖这些结构、几何列定位与无个人内容诊断；11 项单元测试通过。[Android 15 测试](https://github.com/KevinKaslana093/keyu-timetable/actions/runs/34812194376) 通过两层框架 + 嵌套表格 → 原生回传 → 预览 → 校区选择 → 保存。仍需用户在真实学校页面重试验证。

## 1.1.2：跨域内页读取

用户诊断为 documents=1 / blockedFrames=1 / weekdayCells=0 / cards=0。证据说明外层没有匹配课程且一个内页不可访问，尚不能证明该内页必然是课表。

新增可见学校 iframe/frame 地址候选和“打开课表内页”。用户点击后保留登录会话，将严格校验的内页提升为当前页面，再次确认学期并读取。只允许原有教务 HTTP 域名，其他候选必须为学校 HTTPS 子域；不关闭同源策略、不增加学校页面原生桥。诊断仅增加来源，不包含路径或查询参数。限制最多打开 3 个不同候选。

11 项单元测试及浏览器结构回归通过。另用真实跨域的虚构页面验证诊断、隐藏框架排除、地址参数不进入诊断、内页直接读取。[Android 15 完整导入测试](https://github.com/KevinKaslana093/keyu-timetable/actions/runs/34814445135) 通过：跨域阻断 → 原生打开内页 → 两层同源框架和嵌套表格 → 预览 → 校区选择 → 本机保存；两处学校页面均无 KeyuNative 桥。签名 APK 构建与验证、网页部署均通过。生产网页的课程预览与两套校区作息回归通过。

尚未使用用户真实登录页面验证，各品牌真机仍待反馈。网站检查首页与静态资源可达；社交分享 og:title/og:image 元数据检查仍未通过，与本次导入修复无关。隐私扫描命中已核实的 PDF.js 字段属性及文档中引用该属性的文字，无实际凭据。
