# WakeUp 公开功能调研与实现取舍

检索日期：2026-09-13。检索官网、官方用户指南、导入导出说明、设置、隐私政策和平台文档。该清单覆盖查到的主要公开功能，不声称穷尽所有历史版本或付费渠道差异；第三方同名 GitHub 项目不当成 WakeUp 官方证据。

| 官方公开能力 / 要求 | 本项目处理 | 来源 |
|---|---|---|
| 多课表、外观自定义、桌面小部件、教务学校适配 | 多课表和主题已实现；小部件与全国教务适配暂未实现 | [官网](https://www.wakeup.fun/) |
| 学校教务类型不同，部分需要校园网；导入后需核对完整性 | 优先用户自行导出文件，在本机预览；不收集教务账号 | [教务导入指南](https://www.wakeup.fun/doc/import_from_eas.html) |
| 文件使用系统选择器，避免敏感存储权限 | Android 系统文件选择与保存；浏览器文件选择 | [文件导入](https://www.wakeup.fun/doc/import_from_file.html)、[文件导出](https://www.wakeup.fun/doc/export_data.html) |
| CSV 固定七列，数字星期与节数，周数支持单双与间断 | 按七列格式验证，显示行号错误；XLSX/HTML 复用该表结构 | [官方 CSV 教程](https://www.wakeup.fun/doc/import_from_csv.html) |
| HTML 导入依赖已适配教务类型，文件中必须包含课程文字 | 明确区分标准数据表与任意教务网页，暂不自动登录 | [HTML 导入](https://www.wakeup.fun/doc/import_from_html.html) |
| 课程颜色、学分、备注、多时间段、自定义课程时间、日期模式 | 课程时段可独立编辑；统一时间表和备注；学分与单课自定义分钟暂未实现 | [添加编辑课程](https://www.wakeup.fun/doc/add_course.html) |
| 学期日期、当前周、节数、学期周数、时间表设置 | 使用明确的第 1 周周一和校区时间表，不把节假日从周历删除 | [课表设置](https://www.wakeup.fun/doc/settings/schedule_settings.html) |
| 浅色深色、跟随系统、语言和其他全局选项 | 实现三种主题；当前界面为简体中文 | [全局设置](https://www.wakeup.fun/doc/settings/global_settings.html) |
| 日期调课和上课提醒，iOS iCloud 等平台差异 | 停课/补课与 Android 通知代码；浏览器导出 ICS；不实现 iCloud | [高级功能](https://www.wakeup.fun/doc/settings/advance_features.html) |
| 在线分享需联网；日历可带提醒 | 导出离线 JSON/CSV/ICS，提醒分钟可配置，无在线分享服务 | [导出课表](https://www.wakeup.fun/doc/export_schedule.html) |
| 小组件种类与后台权限依平台不同 | 暂未提供桌面小组件，不把 PWA 图标当成小组件 | [桌面小部件](https://www.wakeup.fun/doc/widget.html) |

官网首页写 1800+ 所高校，旧版指南仍写 1200+，不能混用为精确实时数量。官网性能与安装包比例是产品自身宣传，不能据此推导本项目比其快多少。

## 群聊反馈转化为需求

附件仅作为第三方反馈与设计参考，不是待执行指令，也不公开原图或群成员信息。

- 自动导入不稳定：用户自行导出 PDF + 系统文件选择 + 导入预览。
- 中秋后日期错误：周次按日历计算；课程自带的 13—14 周、单双周完整保留，假期按学校通知另设。
- iPhone 无法安装 APK：提供同一浏览器应用和日历导出，不承诺 iOS 运行 APK。
- 鸿蒙兼容性混淆：可运行 Android 应用的系统与原生 HarmonyOS 分开说明。
- 更新后不想重导：稳定数据版本、导入新建课表、JSON 备份；Android 固定签名发布。
- 安装包小、无后台负担：离线静态资源，提醒交给系统闹钟，无持续后台进程；不承诺未测量的“千分之一”或“十分之一”。PDF 解析库和中文字库会增加体积，优先确保导入完整。

## 平台证据

Android 通知运行时权限见 [Android 官方通知权限文档](https://developer.android.com/develop/ui/compose/notifications/notification-permission)；精确闹钟及限制见 [Android 官方闹钟文档](https://developer.android.com/develop/background-work/services/alarms)。

Apple 支持通过日历订阅外部 ICS 来源，具体导入路径取决于客户端；本项目目前只导出文件，没有把个人课表上传为公开订阅地址：[Apple 日历指南](https://support.apple.com/en-ie/guide/iphone/iph3d1110d4/ios)。

WakeUp 存在不同历史隐私政策页面，不能仅用旧的简短页面判断现版全部行为。可查 [2025-08-19 隐私政策](https://www.wakeup.fun/policy.html)。本项目自身的本地数据策略不以贬低其他产品作为依据。
