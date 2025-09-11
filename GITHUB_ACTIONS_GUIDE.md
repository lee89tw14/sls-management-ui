# GitHub Actions Docker 構建指南

這個專案已經配置了完整的 GitHub Actions CI/CD 管道來自動構建和發布 Docker 映像。

## 🏗️ 工作流程概覽

### 1. Release 工作流程 (`release.yml`)
- **觸發時機**：當您發布新的 Release 時
- **功能**：構建 React 應用 → 打包 Docker 映像 → 推送到 GitHub Container Registry
- **映像標籤**：
  - `ghcr.io/lee89tw14/sls-management-ui:v1.0.0` (版本標籤)
  - `ghcr.io/lee89tw14/sls-management-ui:latest` (main 分支)
  - `ghcr.io/lee89tw14/sls-management-ui:next` (其他分支)

### 2. 構建工作流程 (`build.yml`)
- **觸發時機**：
  - 推送到 `main` 或 `feature/dynamic-backend-config` 分支
  - 創建 Pull Request 到 `main`
  - 手動觸發
- **功能**：持續集成，可選擇是否推送映像

## 🚀 使用方法

### 方法 1：發布正式版本
```bash
# 1. 推送您的代碼
git push origin feature/dynamic-backend-config

# 2. 在 GitHub 網頁創建 Release
# - 前往：https://github.com/lee89tw14/sls-management-ui/releases
# - 點擊 "Create a new release"
# - 設置標籤：v1.0.0
# - 選擇分支：feature/dynamic-backend-config
# - 填寫發布說明
# - 點擊 "Publish release"
```

### 方法 2：開發版本自動構建
```bash
# 推送到指定分支會自動觸發構建
git push origin feature/dynamic-backend-config
```

### 方法 3：手動觸發
1. 前往 GitHub → Actions → "Build and Push"
2. 點擊 "Run workflow"
3. 選擇分支和是否推送到註冊表

## 🐳 使用構建的 Docker 映像

### 拉取映像
```bash
# 最新版本
docker pull ghcr.io/lee89tw14/sls-management-ui:latest

# 特定版本
docker pull ghcr.io/lee89tw14/sls-management-ui:v1.0.0

# 開發版本
docker pull ghcr.io/lee89tw14/sls-management-ui:next
```

### 運行容器
```bash
docker run -d \
  --name sls-management-ui \
  -p 3000:3000 \
  -e REACT_APP_BASE_URL=http://your-backend:8080 \
  -e REACT_APP_SRT_PLAYER_PORT=4000 \
  -e REACT_APP_SRT_SENDER_PORT=4001 \
  -e REACT_APP_SLS_STATS_PORT=8080 \
  -e REACT_APP_SRTLA_PORT=5000 \
  ghcr.io/lee89tw14/sls-management-ui:latest
```

## 🔧 自定義配置

### 修改映像名稱
編輯 `.github/workflows/release.yml` 和 `.github/workflows/build.yml`：
```yaml
env:
  docker_repo: 'ghcr.io'
  image_name: 'your-username/your-image-name'  # 修改這裡
```

### 添加更多觸發條件
在工作流程檔案中的 `on:` 部分添加：
```yaml
on:
  push:
    branches: [ main, develop, feature/* ]  # 添加更多分支
  schedule:
    - cron: '0 2 * * 0'  # 每週日凌晨 2 點自動構建
```

### 添加測試步驟
在 Node 構建後添加測試：
```yaml
- name: Run Tests
  shell: sh
  working-directory: html/
  run: npm test -- --coverage --ci
```

## 🔒 權限設置

確保您的倉庫設置正確：

1. **Settings** → **Actions** → **General**
   - Workflow permissions: "Read and write permissions"
   - 勾選 "Allow GitHub Actions to create and approve pull requests"

2. **Settings** → **Packages**
   - 確保包的可見性設置正確

## 📊 監控構建

### 查看構建狀態
- GitHub → Actions 標籤
- 每次推送或 Release 都會顯示構建狀態

### 查看構建的映像
- GitHub → Code → 右側 Packages 部分
- 或直接訪問：https://github.com/lee89tw14/sls-management-ui/pkgs/container/sls-management-ui

## 🐛 故障排除

### 常見問題

1. **權限錯誤**
   ```
   Error: buildx failed with: ERROR: failed to solve: failed to push
   ```
   - 檢查 GitHub Token 權限
   - 確認倉庫 Packages 設置

2. **構建失敗**
   ```
   Error: Process completed with exit code 1
   ```
   - 檢查 Node.js 版本兼容性
   - 查看詳細錯誤日誌

3. **Docker 構建緩慢**
   - 已配置 GitHub Actions cache
   - 多平台構建 (amd64, arm64) 需要較長時間

### 調試技巧

1. **本地測試 Docker 構建**
   ```bash
   # 在本地運行相同的構建
   docker build -f docker/production.Dockerfile -t test-image .
   ```

2. **查看構建日誌**
   - GitHub Actions 提供詳細的步驟日誌
   - 展開每個步驟查看具體錯誤

## 🔄 更新和維護

### 定期更新
- 更新 Node.js 版本
- 更新 GitHub Actions 版本
- 更新依賴包

### 性能優化
- 使用多階段構建減少映像大小
- 優化 Docker 層次結構
- 配置適當的快取策略
