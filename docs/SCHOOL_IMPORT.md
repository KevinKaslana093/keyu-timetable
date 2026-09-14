# 1.1.0 教务导入与校区作息

## 已核实的学校入口

2026-09-14 读取学校公开 HTTP 首页，其脚本将浏览器引导到 HTTPS 统一认证，并携带 HTTP 教务回跳地址。未输入或获取任何真实账号、密码、Cookie。

- [学校教务入口](http://xsjw2018.jw.scut.edu.cn/)
- [学校公布的教务登录说明](https://www2.scut.edu.cn/design/_t2289/2024/0625/c2818a557524/page.htm)
- [Android 官方原生桥风险说明](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges)

独立学校 WebView 不注册 JavascriptInterface；只有本地应用界面有原生存储接口。用户点击读取后提取课程表文本，不提取表单或页面脚本，不请求隐藏接口。退出清除应用范围的学校会话，系统浏览器不受影响。学校目前的 HTTP 教务传输不等于端到端加密。

## 校区时间

[学校体育学院公开手册中的作息表](https://www2.scut.edu.cn/_upload/article/files/8d/32/1dbbcf9a47729b8e2b85e4c02e01/a25ee229-19e8-4f09-afd5-3ea70b02bec6.pdf) 与用户截图的起始时刻一致。内置五山及大学城 / 国际校区各 11 节完整起止时间；遇到学校后续调整，可编辑自定义时间。跨校区课程暂用不同课表分别配置。

## 验证范围

- 11 项 Node 测试通过，包含单双周、间断周、课程时段变化、校区切换对课程与 ICS 时间的影响。
- Chrome 中使用独立构造的虚构教务 DOM 验证 rowspan、多课程、周日、文本提取不包含密码表单、导入预览、两套校区设置持久化及网页版降级说明。
- Android CI 使用拦截产生的虚构页面验证应用内读取流程，不将其描述为真实教务账号验证。结果以 Actions 的 Android installation smoke 为准。
- 真实账号登录后网页布局、校园网/学校 VPN、厂商浏览器内核及后台提醒仍待用户手机验证。若学校页面改版，报错后保留原课表，使用 PDF 兜底。


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

## 1.1.3：纠正 blockedFrames 误诊并兼容 DOM 集合

1.1.2 的诊断在统计 weekdayCells 之前，已经取得 documents/tables/nestedTables，却没有 frameOrigins。检查发现：旧版外层 catch 将任意执行错误均计为 blockedFrames；因此此前按跨域分析证据不足。

浏览器对照试验构造 12 张表、4 张嵌套表，并移除 DOM 集合迭代器。旧版输出与用户反馈相同的 documents=1 / blockedFrames=1 / tables=12 / nestedTables=4 / weekdayCells=0 / cards=0 / frameOrigins=[]，实际没有跨域框架；新版读取同一虚构课程成功。这验证了一种与反馈一致的根因，但尚未直接检查用户手机的页面运行环境。

改用按索引复制 NodeList/HTMLCollection，不依赖 DOM 集合迭代器或 NodeList.forEach。仅文档访问的 SecurityError 计为 blockedFrames；其他错误仅记阶段和标准错误类型，诊断代码失败也不会跳过提取和子框架。诊断不包含异常原文。

13 项单元测试、旧/新浏览器对照、嵌套表格和跨域回归通过。[Android 15 完整测试](https://github.com/KevinKaslana093/keyu-timetable/actions/runs/34857917916) 在移除 DOM 集合迭代支持后通过学校内页读取、预览、校区选择和保存。生产网页预览及两套校区时间回归通过，签名 APK 构建成功。仍需用户真实页面重试。

## 1.1.4：提取阶段兼容修订

用户新版诊断：blockedFrames=0、weekdayCells=14、cards=40、extract TypeError。可确认访问正常且提取阶段失败，不能仅凭异常类型确定具体调用。

用虚构页面覆盖全局 Map，复现 1.1.3 在已读到课程块后抛出相同 extract TypeError。新读取器不依赖 Map/Set，使用数组保存列与去重记录；DOM 操作采用 parentNode/replaceChild/insertBefore/appendChild，避免旧环境缺少 closest/remove/replaceWith/prepend/append。诊断仅新增白名单步骤名称，不记录异常原文。

13 项单元测试通过；Chrome 对照测试同时覆盖 Map 被替换和新版 DOM 方法缺失，修订后成功读取。[Android 15 完整测试](https://github.com/KevinKaslana093/keyu-timetable/actions/runs/34862648011) 通过：跨域内页、缺少 DOM 迭代器、Map 覆盖、缺少新版 DOM 方法 → 读取 → 预览 → 校区选择 → 保存。原有嵌套表格与跨域浏览器回归通过。真实用户设备仍需重试，测试不代表已确定其具体触发点。
