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
