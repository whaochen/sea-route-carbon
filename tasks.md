# TASKS.md — 全球海運航線與碳排計算箱（晧脈元素庫 `Zn` 30 鋅）

> **專案定位**：100% 純前端、零伺服器成本的全球海運距離與碳足跡佐證工具，收納於 **晧脈元素庫（Hao Element Matrix）** 第 4 週期過渡金屬運輸專列 **`Zn`（30 鋅）**（象徵遠洋船舶防海水腐蝕的「犧牲陽極鋅塊」）。
> **開發與部署架構**：沿用 **Gemini（總架構與規格）+ Google Antigravity（本機實作與驗證）+ GitHub（版本控管）+ Cloudflare Pages（免費靜態自動部署）** 四層零成本架構。
> **技術基準**：參考 [叡揚資訊港口距離計算工具](https://molecularcalculator.azurewebsites.net/SeaDistance) 之純前端架構，以開源 [**searoute-ts**](https://github.com/mayurrawte/searoute-ts)（2025 Eurostat Maritime Network）+ **Leaflet** + **OpenStreetMap** 為核心，並完整補強 **ISO 14064-1 類別三** 與 [**ISO 14083**](https://www.clecat.org/media/clecat-guide-to-iso-14083---greenhouse-gas-emissions-in-the-transport-sector.pdf) / [**GLEC Framework**](https://zerocarbon.org.in/blog/glec-framework-v3-2-iso-14083-freight-emissions-guide) 第三方查證所需之方法學揭露、運河改道切換、精度控管與 MRV 佐證匯出功能。

## 1. 技術架構與核心套件定案

| 層級 | 選定技術／套件 | 用途與選型理由 |
| :--- | :--- | :--- |
| **開發與部署鏈** | **Gemini + Antigravity + GitHub + Cloudflare Pages** | 100% 靜態網站零伺服器費用，GitHub 推送即自動建置上線。 |
| **海運航線引擎** | [**searoute-ts**](https://github.com/mayurrawte/searoute-ts)（MIT 授權） | 內建 2025 歐盟統計局海運路網（Eurostat Marnet），100% 瀏覽器端運算、免付費 API；原生支援 `marnet-20km` 精細路網、運河限制與跨換日線處理。 |
| **港口編碼庫** | `searoute-ts/ports` + 自建繁體中文港口對照表 | 內建約 1,600 個 UN/LOCODE 五碼海港（如 `TWKHH`、`CNSHA`、`NLRTM`），外加常用台灣／亞洲／歐美港口中文別名搜尋。 |
| **地圖與視覺化** | **Leaflet** + **OpenStreetMap** | 輕量互動地圖，繪製起迄點、轉運港與藍色海運航線折線。 |
| **佐證圖片匯出** | **html2canvas** + **leaflet-image**（或原生 Canvas 合成） | 一鍵產出含地圖、參數、時間戳記與資料來源宣告的 PNG 查證佐證圖。 |
| **元素庫整合** | **晧脈元素庫 `Zn`（30 鋅）** + `badge.js` | 與 `Ti`（空運）、`Fe`（軌道運輸）並列第 4 週期過渡金屬電光天藍（`#29b6f6`）運輸專列。 |

## 2. 分階段實作任務清單

### Phase 1：專案初始化與核心海運路網串接

- [ ] **1.1 建立專案結構與部署設定**：初始化靜態網頁專案（建議倉庫名 `sea-route-carbon`，含 `index.html`、`src/`、`public/`），確保可於 Cloudflare Pages 零設定建置與部署。
- [ ] **1.2 載入 `searoute-ts` 與 `marnet-20km` 精細路網**：整合 [searoute-ts](https://github.com/mayurrawte/searoute-ts) 並預設載入 20 km 解析度路網（`searoute-ts/marnet-20km`，[套件規格](https://classic.yarnpkg.com/en/package/searoute-ts)），避免預設 100 km 路網在短程近海航線產生過大吸附誤差；提供非同步載入進度條與失敗重試提示。
- [ ] **1.3 實作 UN/LOCODE 中英文雙向港口搜尋選單**：支援輸入五碼代碼（如 `TWKHH`、`CNSHA`、`NLRTM`）、英文港名或常用中文港名（高雄、基隆、台中、台北、上海、新加坡、鹿特丹、洛杉磯等）即時篩選。
- [ ] **1.4 建置 Leaflet 地圖與航線繪製**：整合 OpenStreetMap 底圖，顯示起點（綠）、終點（紅）、中繼轉運港（藍）標記與航線 GeoJSON，並正確處理跨太平洋國際換日線（`antimeridian: 'split'`）不斷線渲染。

### Phase 2：ISO 14064-1 / ISO 14083 查證防呆與進階航道功能

- [ ] **2.1 運河／海峽改道切換開關（解決紅海繞航痛點）**：開放 `searoute-ts` 原生 `restrictions` 參數介面，至少提供勾選排除：
  - 蘇伊士運河（`suez`）／曼德海峽（`bab_el_mandeb`）— 一鍵切換「紅海危機繞行好望角」情境。
  - 巴拿馬運河（`panama`）— 支援大型貨櫃船或乾旱限航改道情境。
  - 同步顯示「標準最短路徑」與「改道後路徑」之距離差異（km 與 %）。
- [ ] **2.2 短程航線精度與吸附距離警示**：當計算結果出現 `detourRatio < 1` 或起迄點吸附距離（`originSnapKm` / `destinationSnapKm`）過大時，於介面顯示醒目查證提醒，告知使用者短程近海航線建議優先向船公司或貨代取得實測航程。
- [ ] **2.3 邊界與 GLEC 繞航因子防呆說明卡**：在結果區固定呈現查證口徑提示：
  - 明確標示本距離為「港到港最短可行距離（Port-to-Port SFD）」，工廠至港口之內陸運輸需另行計算。
  - 依 [GLEC Framework / ISO 14083 指南](https://zerocarbon.org.in/blog/glec-framework-v3-2-iso-14083-freight-emissions-guide) 標註提醒：若選用已內含約 15% 實際繞航修正之 GLEC／環境部預設海運排放係數，**切勿將 SFD 手動再乘上 1.15**，避免重複計算。
- [ ] **2.4 支援多段航程（轉運港）與噸公里（t-km）試算**：允許新增 1~3 個中繼轉運港分段加總里程；提供選填「貨物淨重（公噸）」與「排放係數（kgCO₂e / t-km）」，自動產出 `延噸公里（t-km）` 與 `推估排放量（kgCO₂e / tCO₂e）`。

### Phase 3：MRV 查證軌跡（Audit Trail）一鍵匯出

- [ ] **3.1 高解析度查證佐證圖（PNG）匯出**：將 Leaflet 地圖與「查證摘要資訊卡」合成為單一張高解析度 PNG 下載，圖面必須自動壓印以下欄位：
  - 起迄與轉運港口（UN/LOCODE + 中英文名稱）
  - 航線條件（例如：標準最短路徑 / 避開蘇伊士運河繞行好望角）
  - 計算結果（總距離 `km` 與 `nm`、若有輸入重量則一併列出 `t-km`）
  - 查詢日期時間（UTC+8）
  - 方法學與資料來源聲明：`Shortest Feasible Distance (SFD) via 2025 Eurostat Maritime Network (searoute-ts / marnet-20km), Map © OpenStreetMap contributors`
- [ ] **3.2 一鍵複製「盤查清冊標準備註文字」**：產生可直接貼入 ISO 14064-1 盤查清冊「數據來源／備註」欄位的制式文字（含起迄代碼、航道設定、距離、查詢日期與 Eurostat Marnet 方法學依據）。
- [ ] **3.3 批次查詢與 CSV 匯出（選配擴充）**：支援貼上多筆「起運港代碼, 目的港代碼, 貨物重(噸)」清單，一次完成批次距離運算並匯出含來源說明欄位的 CSV 報表。

### Phase 4：晧脈元素庫（`Zn` 30 鋅）雙向對接

- [ ] **4.1 子站掛載中央 3D 回航徽章（`badge.js`）**：
  - 於 `<head>` 載入：`<script src="https://hao-element-matrix.pages.dev/badge.js" defer></script>`
  - 於**導覽列最右側與頁尾品牌列**嵌入：`<hao-element-badge symbol="Zn" theme="dark"></hao-element-badge>`（依頁首深淺色調整 `theme="dark|light"`，絕不遮擋或取代子站既有主 Logo）。
- [ ] **4.2 品牌用字與視覺色系對齊**：全站涉及「晧脈」品牌文字、註解與 `<title>` 一律使用「**晧**」（`U+6667`），嚴禁誤植異體字；主色系對齊第 4 週期過渡金屬運輸工具箱系列之電光天藍（`#29b6f6`）。
- [ ] **4.3 主站 `hao-element-matrix` 登錄 `Zn` 元素資料**：於子站上線取得正式 Cloudflare Pages 網址後，將下列 JSON 寫入主站 `data/projects.json`（上線前可先以 `status: "beta"` 測試，正式啟用改為 `"live"`）：

```json
"Zn": {
  "shortName": "海運碳排",
  "title": "全球海運航線與碳排計算箱",
  "subtitle": "Sea Route Carbon Box",
  "description": "純前端全球海運最短航線與碳排估算工具，整合 Eurostat 路網、運河改道切換與 ISO 14064-1 查證佐證圖匯出。",
  "whyElement": "遠洋船舶常焊裝「犧牲陽極鋅塊」防海水腐蝕，以 Zn 象徵海運航線守護。",
  "url": "https://sea-route-carbon.pages.dev/",
  "domainLabel": "sea-route-carbon.pages.dev",
  "status": "live",
  "statusLabel": "LIVE 上線中",
  "tags": ["海運距離", "類別三盤查", "航線佐證"],
  "emblemType": "default"
}
```

### Phase 5：自動化驗證、建置與 Cloudflare Pages 上線

- [ ] **5.1 基準航線回歸測試**：驗證以下 3 組測試案例皆可正確計算、繪圖並匯出 PNG：
  1. **長程標準航線**：`CNSHA`（上海）→ `NLRTM`（鹿特丹），標準路徑距離應落於約 `19,750 km` 區間（對照基準頁 `19,752.85 km` 與 [searoute-ts 範例](https://github.com/mayurrawte/searoute-ts) `19,753 km`）。
  2. **紅海改道航線**：`CNSHA` → `NLRTM` 勾選「避開蘇伊士運河」，路線應正確繞行南非好望角且距離顯著增加。
  3. **跨換日線航線**：`TWKHH`（高雄）→ `USLAX`（洛杉磯），確認太平洋航線在地圖上不出現橫跨歐亞大陸的錯誤連線。
- [ ] **5.2 響應式與無障礙檢查**：確認桌機與行動裝置排版無跑版、匯出 PNG 字體清晰無亂碼、3D 回航徽章可正常跳轉至 `https://hao-element-matrix.pages.dev/?el=Zn`。
- [ ] **5.3 GitHub 推送與 Cloudflare Pages 部署**：完成 `build` 零錯誤檢查，推送至 GitHub 並連結 Cloudflare Pages 自動部署上線。

## 3. 給 Google Antigravity 的雙向交辦指令範本

### 指令 B（給新子站 `sea-route-carbon`）

```text
請閱讀專案根目錄的 TASKS.md，依序完成 Phase 1 至 Phase 5 的實作與驗收測試。
核心要求：
1. 全程採用 100% 純前端靜態架構（零後端 API），使用 searoute-ts（預設載入 marnet-20km 路網與 ports 模組）搭配 Leaflet + OpenStreetMap，部署目標為 Cloudflare Pages。
2. 務必實作「運河改道開關（避開蘇伊士／巴拿馬運河）」與「含方法學來源、時間戳記的 PNG 查證佐證圖匯出」功能。
3. 於導覽列最右側與頁尾品牌列掛載中央共用 3D 回航徽章（<script src="https://hao-element-matrix.pages.dev/badge.js" defer></script> 與 <hao-element-badge symbol="Zn" theme="dark"></hao-element-badge>），不得覆蓋主 Logo，全站品牌字一律使用「晧」（U+6667）。
4. 完成 Phase 5 的 3 組基準航線驗證（CNSHA→NLRTM 標準與繞行好望角、TWKHH→USLAX 跨換日線）並確認 build 無誤後，push 至 GitHub 並回報預覽網址與截圖驗收。
```

### 指令 A（子站上線後，給主站 `hao-element-matrix` 點亮 `Zn`）

```text
請在 hao-element-matrix 專案的 data/projects.json 新增元素 "Zn"（30 鋅，全球海運航線與碳排計算箱），使用 TASKS.md 第 4.3 節之 JSON 規格（請先將 url 與 domainLabel 更新為子站實際上線的 Cloudflare Pages 網址；若 data/mining_veins.json 有對應預告礦脈請一併移除）。完成後執行 python scripts/verify_project.py 確認零異體字誤植與 JSON 格式無誤，再 commit 並 push 至 GitHub。
```