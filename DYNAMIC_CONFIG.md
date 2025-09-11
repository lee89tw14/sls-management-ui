# Dynamic Backend Configuration

這個分支新增了動態後端配置功能，解決了通過 nginx proxy (FQDN) 和直接 IP 連接時的後端連接不一致問題。

## 功能說明

### 自動檢測訪問方式
系統會自動檢測當前的訪問方式：

1. **IP 直接連接**：檢測到 IPv4 地址或 localhost 時
   - 使用相同的 hostname + 統計端口（預設8080）
   - 例如：`http://192.168.1.100:8080`

2. **FQDN 連接**：檢測到域名時
   - 假設使用 nginx 代理設置
   - 可配置代理路徑或使用相同來源

### 配置選項

#### 環境變數
```bash
# 明確指定後端 URL（優先級最高）
REACT_APP_BASE_URL=http://your-api-server.com

# API 代理路徑（用於 nginx 設置）
REACT_APP_API_PROXY_PATH=/api

# 其他端口配置
REACT_APP_SLS_STATS_PORT=8080
REACT_APP_SRT_PLAYER_PORT=4000
REACT_APP_SRT_SENDER_PORT=4001
REACT_APP_SRTLA_PORT=5000
```

## 使用場景

### 場景1：家庭網路直接 IP 連接
- 訪問：`http://192.168.1.100:3000`
- 後端API：`http://192.168.1.100:8080`

### 場景2：通過 nginx 代理的 FQDN 連接
- 訪問：`https://stream.example.com`
- 後端API：`https://stream.example.com` (直接代理)
- 或 `https://stream.example.com/api` (如果設置了 `REACT_APP_API_PROXY_PATH=/api`)

## Nginx 配置範例

### 直接代理（推薦）
```nginx
server {
    listen 443 ssl;
    server_name stream.example.com;
    
    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # 後端API直接代理
    location /health {
        proxy_pass http://localhost:8080;
    }
    
    location /api/ {
        proxy_pass http://localhost:8080/api/;
    }
    
    location /stats/ {
        proxy_pass http://localhost:8080/stats/;
    }
}
```

### 使用代理路徑
```nginx
server {
    listen 443 ssl;
    server_name stream.example.com;
    
    # 前端
    location / {
        proxy_pass http://localhost:3000;
    }
    
    # 後端API通過 /api 路徑代理
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host $host;
    }
}
```

然後設置環境變數：
```bash
REACT_APP_API_PROXY_PATH=/api
```

## 測試

你可以在瀏覽器控制台中測試配置：

```javascript
// 檢查當前主機信息
console.log(config.getHostInfo());

// 檢查動態端點
console.log(config.getDynamicEndpoint());

// 檢查最終配置
console.log(config.apiEndpoint);
```

## 遷移指南

現有部署不需要更改，系統會自動使用合適的配置：

1. **如果已設置 `REACT_APP_BASE_URL`**：繼續使用該設置
2. **如果未設置**：自動根據訪問方式選擇合適的後端URL

## 故障排除

如果後端連接有問題：

1. 檢查瀏覽器開發者工具的 Network 標籤
2. 確認 API 請求的目標 URL
3. 檢查 nginx 代理配置
4. 驗證後端服務是否在正確端口運行
