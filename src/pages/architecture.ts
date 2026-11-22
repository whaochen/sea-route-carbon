import '../style.css';

// ① 動態資料流節點切換
const flowDetails: Record<string, string> = {
  n1: '【節點 1 · 港埠字典解析】接收使用者輸入之 UN/LOCODE 五碼海港代碼或中英文別名，於瀏覽器記憶體中比對「UN/LOCODE 全球主要商港字典（持續擴充）」，取得標準化經緯度座標，全程不向外部資料庫送出查詢。',
  n2: '【節點 2 · 20km 海洋路網尋徑】於本地端非同步載入 20 km 解析度海洋路網拓樸，依使用者勾選之運河／海峽限制條件與跨換日線分段規則，執行確定性圖論最短路徑演算法，產出港到港最短可行距離 (SFD)。',
  n3: '【節點 3 · 單位防呆與 GHG 計算】依據所選環境部或國際係數之宣告單位（tkm 或 TEU-km），自動切換淨重（公噸）或貨櫃數（TEU）檢核，以 100% 確定性數學公式計算延噸／延櫃公里與碳排放量 (kgCO₂e)。',
  n4: '【節點 4 · MRV 佐證與零留存輸出】於瀏覽器本地 Canvas 合成白底高對比查證佐證圖 (PNG)，或產生含提單溯源鍵 (ref_doc_id) 之 UTF-8 CSV 報表與清冊引用文案；頁面關閉後所有輸入數據即刻釋放，伺服器端零留存。',
};

const flowDetailEl = document.getElementById('flow-detail-box');
document.querySelectorAll<HTMLButtonElement>('.flow-node').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll<HTMLButtonElement>('.flow-node').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const id = btn.dataset.node ?? 'n1';
    if (flowDetailEl) {
      flowDetailEl.textContent = flowDetails[id] ?? '';
    }
  });
});

// ④ 動態載入晧脈生態系串聯地圖
interface MatrixProject {
  symbol?: string;
  shortName?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  url?: string;
  statusLabel?: string;
}

async function loadEcosystemMap(): Promise<void> {
  const mountEl = document.getElementById('eco-grid');
  const statusEl = document.getElementById('eco-status');
  if (!mountEl || !statusEl) return;

  try {
    const res = await fetch('https://hao-element-matrix.pages.dev/data/projects.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = (await res.json()) as Record<string, MatrixProject>;
    const entries = Object.entries(raw);

    if (entries.length === 0) {
      statusEl.textContent = '目前尚無生態系節點資料。';
      return;
    }

    statusEl.textContent = `已即時同步主站 ${entries.length} 項元素工具節點`;
    mountEl.innerHTML = '';

    for (const [sym, item] of entries) {
      const card = document.createElement('a');
      card.className = 'eco-card';
      card.href = item.url || 'https://hao-element-matrix.pages.dev/';
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.innerHTML = `
        <div class="eco-card-top">
          <span class="eco-sym">${sym} · ${item.shortName ?? ''}</span>
          <span class="eco-status">${item.statusLabel ?? 'LIVE'}</span>
        </div>
        <div class="eco-title">${item.title ?? sym}</div>
        <div class="eco-desc">${item.description ?? item.subtitle ?? ''}</div>
      `;
      mountEl.appendChild(card);
    }
  } catch {
    statusEl.textContent = '生態系串聯資料暫時無法取得，請前往晧脈元素庫主站檢視完整清單。';
  }
}

void loadEcosystemMap();

// ⑤ 一鍵複製標準查證報告書引用文案（附 Toast）
const STANDARD_CITATION_TEXT = [
  '【海運活動數據與溫室氣體排放計算方法學引用】',
  '本盤查清冊之海運段距離與排放量係透過「晧脈元素庫 Zn 30｜全球航海GHG排放計算器（https://sea-route-carbon.pages.dev/）」計算產出，符合 ISO 14064-1 類別 3 ／ GHG Protocol 範疇三類別 4 & 9 ／ ISO 14083 之盤查規範。',
  '1. 距離計算依據：採用 2025 歐盟統計局海運路網（Eurostat Marnet 20km）與 UN/LOCODE 全球主要商港字典，計算港到港最短可行距離（Port-to-Port SFD），已排除內陸段運輸並支援運河改道情境。',
  '2. 排放係數依據：優先採用環境部產品碳足跡資訊網公告之海運服務係數（依 OGDL-Taiwan-1.0 釋出，區分 tkm 與 TEU-km 單位），且未重複乘以 1.15 繞航修正因子。',
  '3. 聲明：本工具僅供研究與初步試算參考，非官方背書；所有數據與係數一律以原出處機關最新公告為準。',
].join('\n');

const btnCopyCitation = document.getElementById('btn-copy-citation');
const toastBanner = document.getElementById('toast-banner');

btnCopyCitation?.addEventListener('click', async () => {
  await navigator.clipboard.writeText(STANDARD_CITATION_TEXT);
  if (toastBanner) {
    toastBanner.classList.remove('hidden');
    window.setTimeout(() => toastBanner.classList.add('hidden'), 2500);
  }
});
