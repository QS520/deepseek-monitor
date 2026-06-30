# DeepSeek V4 API 用量监控

实时监控 DeepSeek 两个模型（`deepseek-v4-flash` / `deepseek-v4-pro`）的 API 用量与费用余额的手机 App。

## 功能

- 双模型实时用量监控（每 2 秒更新）
- 余额卡片 + 费用预警阈值
- Token 趋势折线图、费用环形图
- 深空黑 + 蓝紫科技监控美学
- Capacitor 打包为 Android APK，离线可用

## 定价（元 / 百万 tokens）

| 模型 | 缓存命中 | 缓存未命中 | 输出 |
|------|---------|-----------|------|
| V4 Flash | ¥0.02 | ¥1 | ¥2 |
| V4 Pro   | ¥0.025 | ¥3 | ¥6 |

## 在手机上拿到 APK（无需电脑）

利用 GitHub Actions 在云端编译 APK，全程在手机浏览器完成：

1. 在手机浏览器登录 GitHub，新建一个仓库（例如 `deepseek-monitor`）。
2. 把本项目代码上传到该仓库（见下方「上传代码」）。
3. 推送后，仓库 **Actions** 标签页会自动开始编译（约 5–8 分钟）。
4. 编译完成进入该次运行详情页，底部 **Artifacts** 区域下载 `deepseek-monitor-apk`。
5. 解压得到 `app-debug.apk`，点击安装（需允许「未知来源」）。

> 也可在 Actions 页面手动点 `Run workflow` 重新编译。

### 上传代码到 GitHub（手机端）

- 最简方式：在 GitHub 网页新建仓库时选择「上传文件」，把项目根目录文件拖入提交。注意 `.github/workflows/build-apk.yml` 必须上传。
- 或用手机终端 Termux：`git push` 推送。

## 本机编译（如有电脑）

```bash
pnpm install
pnpm cap:sync          # 构建 Web 资源并同步到 Android
cd android
./gradlew assembleDebug
# 产物: android/app/build/outputs/apk/debug/app-debug.apk
```

或 `pnpm cap:open` 用 Android Studio 打开后 `Build → Build APK(s)`。

## 技术栈

React 18 + TypeScript + Vite + Tailwind CSS + Zustand + Capacitor 8 + Vite PWA
