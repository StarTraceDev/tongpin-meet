# Changelog

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 SemVer。
项目尚未发布正式版本，以下为开发期累计变更。

## [Unreleased]

### Added

- 账号体系：手机号 + 密码登录、刷新令牌、自动注册开关、设备会话与踢下线
- 会议主链路：建会 / 预约、会议号入会、密码与等候室、签到、结束会议、会议事件时间轴
- Web 会中能力：麦克风/摄像头、屏幕共享、聊天、成员列表、白板、会议纪要
- 桌面端：Electron 窗口池、自定义屏幕共享选择器（desktopCapturer 缩略图）、自动更新、托盘、`tongpin://join?no=` 深链、mac dmg/zip + win nsis + linux AppImage 打包
- 管理台：仪表盘统计、会议管理与强制结束、用户/部门/角色权限、短信与 AI 配置、系统配置与功能开关、告警规则、审计日志、反馈管理、系统公告、成本统计、主机监控、四类资源异步导出与下载中心
- 管理台按钮级权限：`<Can>` 隐藏无权限操作，路由缺权限渲染 403
- 共享层：zod 契约、枚举、状态机、错误码、权限点、WS 事件；设计 token 与主题包
- 工程化：pnpm workspace + catalog、ESLint/Prettier、husky + lint-staged + commitlint、GitHub Actions、Prisma 迁移与 seed

### Security

- 管理台短信/AI 密钥使用 AES-256-GCM 加密入库，接口只回掩码
- 全部管理接口挂 RBAC 守卫；审计日志记录关键操作
- 导出文件落本地磁盘，按资源权限校验，不暴露任意路径

### Changed

- 桌面端依赖 `electron-updater` 以 semver 固定，避免 electron-builder 不识别 pnpm `catalog:`
- 审计日志导出由同步 CSV 改为异步任务（下载中心）

[Unreleased]: https://github.com/StarTraceDev/tongpin-meet/commits/main
