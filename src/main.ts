import './style.css';
import type { Passage } from 'searoute-ts';
import { PortSearchInput } from './components/PortSearchInput';
import {
  DEFAULT_EMISSION_FACTOR,
  getEmissionFactorById,
  type EmissionFactorSpec,
} from './data/emissionFactors';
import {
  buildAuditTrailText,
  downloadBatchCsv,
  exportVerificationPng,
  runBatchCalculation,
  type BatchRowResult,
} from './services/exportService';
import { SeaMapService } from './services/mapService';
import {
  calculateSeaRoute,
  formatPortShort,
  formatUtc8Timestamp,
  getPortByCode,
  getPortCount,
  isNetworkReady,
  loadMarnet20km,
  type PortItem,
  type RouteCalculationResult,
} from './services/routeEngine';

interface WaypointRow {
  id: string;
  el: HTMLElement;
  search: PortSearchInput;
}

type AppTab = 'single' | 'multi' | 'batch' | 'reference';

class SeaRouteApp {
  private mapService: SeaMapService;
  private originInput: PortSearchInput;
  private destInput: PortSearchInput;
  private waypoints: WaypointRow[] = [];
  private lastResult: RouteCalculationResult | null = null;
  private lastBatchRows: BatchRowResult[] = [];
  private activeTab: AppTab = 'single';

  // DOM elements
  private statusPill = document.getElementById('network-status-pill')!;
  private statusText = document.getElementById('network-status-text')!;
  private loaderBar = document.getElementById('network-loader-bar')!;
  private loaderMessage = document.getElementById('loader-message')!;
  private loaderProgressFill = document.getElementById('loader-progress-fill')!;
  private btnRetryNetwork = document.getElementById('btn-retry-network') as HTMLButtonElement;

  private viewCalculator = document.getElementById('view-calculator')!;
  private viewBatch = document.getElementById('view-batch')!;
  private viewReference = document.getElementById('view-reference')!;
  private multiLegSection = document.getElementById('multi-leg-section')!;
  private tabWaypointBadge = document.getElementById('tab-waypoint-badge')!;

  private waypointsContainer = document.getElementById('waypoints-container')!;
  private btnAddWaypoint = document.getElementById('btn-add-waypoint') as HTMLButtonElement;
  private btnSwapPorts = document.getElementById('btn-swap-ports') as HTMLButtonElement;

  private restrictSuez = document.getElementById('restrict-suez') as HTMLInputElement;
  private restrictPanama = document.getElementById('restrict-panama') as HTMLInputElement;
  private restrictMalacca = document.getElementById('restrict-malacca') as HTMLInputElement;

  private selectEf = document.getElementById('select-ef') as HTMLSelectElement;
  private efSpecNote = document.getElementById('ef-spec-note')!;
  private unitModeBadge = document.getElementById('unit-mode-badge')!;
  private labelActivity = document.getElementById('label-activity')!;
  private labelEfValue = document.getElementById('label-ef-value')!;
  private teuHint = document.getElementById('teu-hint')!;
  private inputWeight = document.getElementById('input-weight') as HTMLInputElement;
  private inputEf = document.getElementById('input-ef') as HTMLInputElement;

  private btnCalculate = document.getElementById('btn-calculate') as HTMLButtonElement;
  private calcErrorMsg = document.getElementById('calc-error-msg')!;

  private precisionWarning = document.getElementById('precision-warning')!;
  private precisionWarningText = document.getElementById('precision-warning-text')!;
  private resultsDashboard = document.getElementById('results-dashboard')!;
  private legendBaseline = document.getElementById('legend-baseline')!;

  private resKm = document.getElementById('res-km')!;
  private resNm = document.getElementById('res-nm')!;
  private resDiff = document.getElementById('res-diff')!;
  private resDetour = document.getElementById('res-detour')!;
  private resActivityLabel = document.getElementById('res-activity-label')!;
  private resActivityUnit = document.getElementById('res-activity-unit')!;
  private resTkm = document.getElementById('res-tkm')!;
  private resWeightNote = document.getElementById('res-weight-note')!;
  private resCo2Kg = document.getElementById('res-co2-kg')!;
  private resCo2T = document.getElementById('res-co2-t')!;
  private resRoutePath = document.getElementById('res-route-path')!;
  private resRestrictions = document.getElementById('res-restrictions')!;
  private resPassages = document.getElementById('res-passages')!;
  private resSnap = document.getElementById('res-snap')!;

  private btnExportPng = document.getElementById('btn-export-png') as HTMLButtonElement;
  private btnCopyAudit = document.getElementById('btn-copy-audit') as HTMLButtonElement;
  private copyFeedback = document.getElementById('copy-feedback')!;
  private auditPreviewBox = document.getElementById('audit-preview-box')!;

  // Batch Panel
  private batchInput = document.getElementById('batch-input') as HTMLTextAreaElement;
  private btnRunBatch = document.getElementById('btn-run-batch') as HTMLButtonElement;
  private btnExportCsv = document.getElementById('btn-export-csv') as HTMLButtonElement;
  private batchResultWrap = document.getElementById('batch-result-wrap')!;
  private batchTbody = document.getElementById('batch-tbody')!;

  constructor() {
    this.mapService = new SeaMapService('sea-map');

    const portCountEl = document.getElementById('nav-port-count');
    if (portCountEl) {
      portCountEl.textContent = `${getPortCount().toLocaleString()} 港`;
    }

    const defaultOrigin = getPortByCode('CNSHA');
    const defaultDest = getPortByCode('NLRTM');

    this.originInput = new PortSearchInput(document.getElementById('origin-search-mount')!, {
      placeholder: '輸入起運港代碼或中英文名稱（如 CNSHA、上海）',
      initialPort: defaultOrigin,
      onChange: () => this.clearPresetActive(),
    });

    this.destInput = new PortSearchInput(document.getElementById('dest-search-mount')!, {
      placeholder: '輸入目的港代碼或中英文名稱（如 NLRTM、鹿特丹）',
      initialPort: defaultDest,
      onChange: () => this.clearPresetActive(),
    });

    this.bindEvents();
    this.applyEmissionFactorSelection(DEFAULT_EMISSION_FACTOR.id);
    void this.initNetwork();
  }

  private async initNetwork(): Promise<void> {
    this.statusPill.className = 'stat-box loading';
    this.statusText.textContent = '載入 20km 中…';
    this.btnRetryNetwork.classList.add('hidden');
    this.loaderBar.classList.remove('hidden');

    try {
      await loadMarnet20km((pct, msg) => {
        this.loaderProgressFill.style.width = `${pct}%`;
        this.loaderMessage.textContent = msg;
      });
      this.statusPill.className = 'stat-box ready';
      this.statusText.textContent = '20 km 就緒';
      this.btnCalculate.disabled = false;

      window.setTimeout(() => {
        this.loaderBar.classList.add('hidden');
        this.mapService.invalidateSize();
      }, 650);

      // 路網就緒後自動計算預設基準航線
      this.executeCalculation();
    } catch (err) {
      this.statusPill.className = 'stat-box error';
      this.statusText.textContent = '路網載入失敗';
      this.loaderMessage.textContent = `載入 marnet-20km 失敗：${err instanceof Error ? err.message : '未知錯誤'}`;
      this.btnRetryNetwork.classList.remove('hidden');
    }
  }

  private switchTab(tab: AppTab): void {
    this.activeTab = tab;

    document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const isCalc = tab === 'single' || tab === 'multi';
    this.viewCalculator.classList.toggle('hidden', !isCalc);
    this.viewBatch.classList.toggle('hidden', tab !== 'batch');
    this.viewReference.classList.toggle('hidden', tab !== 'reference');

    if (tab === 'multi') {
      this.multiLegSection.classList.remove('hidden');
      if (this.waypoints.length === 0) {
        this.addWaypoint();
      }
    } else if (tab === 'single') {
      this.multiLegSection.classList.add('hidden');
    }

    if (isCalc) {
      window.setTimeout(() => this.mapService.invalidateSize(), 60);
    }
  }

  private clearPresetActive(): void {
    document.querySelectorAll<HTMLButtonElement>('.chip-btn[data-preset]').forEach((b) => {
      b.classList.remove('active');
    });
  }

  private bindEvents(): void {
    // 頁籤切換
    document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab as AppTab;
        if (tab) this.switchTab(tab);
      });
    });

    this.btnRetryNetwork.addEventListener('click', () => {
      void this.initNetwork();
    });

    this.btnSwapPorts.addEventListener('click', () => {
      const o = this.originInput.getPort();
      const d = this.destInput.getPort();
      this.originInput.setPort(d, false);
      this.destInput.setPort(o, false);
      this.clearPresetActive();
      if (isNetworkReady() && o && d) {
        this.executeCalculation();
      }
    });

    this.btnAddWaypoint.addEventListener('click', () => {
      if (this.waypoints.length >= 3) return;
      this.addWaypoint();
    });

    // 係數下拉選單切換（動態切換 tkm / TEU-km）
    this.selectEf.addEventListener('change', () => {
      this.applyEmissionFactorSelection(this.selectEf.value);
      if (isNetworkReady() && this.lastResult) {
        this.executeCalculation();
      }
    });

    this.inputEf.addEventListener('input', () => {
      const currentSpec = getEmissionFactorById(this.selectEf.value);
      if (currentSpec && Number(this.inputEf.value) !== currentSpec.factor) {
        this.selectEf.value = 'custom';
        this.applyEmissionFactorSelection('custom', false);
      }
    });

    // 快速基準航線預設按鈕（膠囊高亮切換）
    document.querySelectorAll<HTMLButtonElement>('.chip-btn[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        document.querySelectorAll<HTMLButtonElement>('.chip-btn[data-preset]').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
        this.clearWaypoints();
        if (this.activeTab === 'multi') {
          this.switchTab('single');
        }
        if (preset === 'CNSHA-NLRTM') {
          this.originInput.setPort(getPortByCode('CNSHA') ?? null, false);
          this.destInput.setPort(getPortByCode('NLRTM') ?? null, false);
          this.restrictSuez.checked = false;
          this.restrictPanama.checked = false;
          this.restrictMalacca.checked = false;
        } else if (preset === 'CNSHA-NLRTM-CAPE') {
          this.originInput.setPort(getPortByCode('CNSHA') ?? null, false);
          this.destInput.setPort(getPortByCode('NLRTM') ?? null, false);
          this.restrictSuez.checked = true;
          this.restrictPanama.checked = true;
          this.restrictMalacca.checked = false;
        } else if (preset === 'TWKHH-USLAX') {
          this.originInput.setPort(getPortByCode('TWKHH') ?? null, false);
          this.destInput.setPort(getPortByCode('USLAX') ?? null, false);
          this.restrictSuez.checked = false;
          this.restrictPanama.checked = false;
          this.restrictMalacca.checked = false;
        }
        if (isNetworkReady()) {
          this.executeCalculation();
        }
      });
    });

    this.btnCalculate.addEventListener('click', () => {
      this.executeCalculation();
    });

    // 切換限制時自動重算
    [this.restrictSuez, this.restrictPanama, this.restrictMalacca].forEach((chk) => {
      chk.addEventListener('change', () => {
        this.clearPresetActive();
        if (isNetworkReady() && this.originInput.getPort() && this.destInput.getPort()) {
          this.executeCalculation();
        }
      });
    });

    this.btnExportPng.addEventListener('click', async () => {
      if (!this.lastResult) return;
      const originalText = this.btnExportPng.innerHTML;
      this.btnExportPng.disabled = true;
      this.btnExportPng.textContent = '⏳ 正在合成查證圖…';
      try {
        const mapCaptureEl = document.getElementById('map-capture-area')!;
        await exportVerificationPng(mapCaptureEl, this.lastResult);
      } finally {
        this.btnExportPng.disabled = false;
        this.btnExportPng.innerHTML = originalText;
      }
    });

    this.btnCopyAudit.addEventListener('click', async () => {
      if (!this.lastResult) return;
      const text = buildAuditTrailText(this.lastResult);
      await navigator.clipboard.writeText(text);
      this.copyFeedback.classList.remove('hidden');
      window.setTimeout(() => this.copyFeedback.classList.add('hidden'), 2400);
    });

    // 批次查詢面板
    this.btnRunBatch.addEventListener('click', () => {
      if (!isNetworkReady()) {
        alert('請等待 marnet-20km 路網載入完成後再執行批次運算。');
        return;
      }
      const ef = this.inputEf.value ? Number(this.inputEf.value) : undefined;
      const spec = getEmissionFactorById(this.selectEf.value);
      this.lastBatchRows = runBatchCalculation(
        this.batchInput.value,
        this.getSelectedRestrictions(),
        ef,
        spec
      );
      this.renderBatchTable(this.lastBatchRows);
      this.btnExportCsv.disabled = this.lastBatchRows.length === 0;
    });

    this.btnExportCsv.addEventListener('click', () => {
      if (this.lastBatchRows.length === 0) return;
      downloadBatchCsv(this.lastBatchRows, formatUtc8Timestamp());
    });
  }

  private addWaypoint(initialPort?: PortItem): void {
    const id = `wp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const rowEl = document.createElement('div');
    rowEl.className = 'waypoint-row';

    const label = document.createElement('div');
    label.className = 'waypoint-header';
    label.innerHTML = `
      <span class="field-label"><span class="dot dot-waypoint"></span> 中繼轉運港</span>
      <button type="button" class="btn-remove-wp" title="移除轉運港">✕ 移除</button>
    `;

    const mount = document.createElement('div');
    rowEl.appendChild(label);
    rowEl.appendChild(mount);
    this.waypointsContainer.appendChild(rowEl);

    const search = new PortSearchInput(mount, {
      placeholder: '輸入轉運港代碼或名稱（如 SGSIN、新加坡）',
      initialPort,
    });

    const wp: WaypointRow = { id, el: rowEl, search };
    this.waypoints.push(wp);

    label.querySelector('.btn-remove-wp')!.addEventListener('click', () => {
      this.waypoints = this.waypoints.filter((w) => w.id !== id);
      rowEl.remove();
      this.updateWaypointUI();
    });

    this.updateWaypointUI();
  }

  private clearWaypoints(): void {
    this.waypoints = [];
    this.waypointsContainer.innerHTML = '';
    this.updateWaypointUI();
  }

  private updateWaypointUI(): void {
    this.btnAddWaypoint.disabled = this.waypoints.length >= 3;
    this.tabWaypointBadge.textContent = String(this.waypoints.length);
  }

  private getSelectedRestrictions(): Passage[] {
    const restrictions: Passage[] = [];
    if (this.restrictSuez.checked) {
      restrictions.push('suez', 'babelmandeb');
    }
    if (this.restrictPanama.checked) {
      restrictions.push('panama');
    }
    if (this.restrictMalacca.checked) {
      restrictions.push('malacca');
    }
    return restrictions;
  }

  private applyEmissionFactorSelection(id: string, overwriteInput = true): void {
    const spec: EmissionFactorSpec | undefined = getEmissionFactorById(id);
    if (spec) {
      if (overwriteInput) {
        this.inputEf.value = String(spec.factor);
      }
      this.efSpecNote.textContent = spec.note;
      const isTeu = spec.unit === 'TEU-km';
      this.unitModeBadge.textContent = spec.unit;
      this.labelActivity.textContent = isTeu ? '20 呎標準貨櫃數（TEU）' : '貨物淨重（公噸 t）';
      this.inputWeight.placeholder = isTeu ? '例如：1 或 2' : '例如：20';
      this.inputWeight.step = isTeu ? '1' : '0.01';
      this.teuHint.classList.toggle('hidden', !isTeu);
      this.labelEfValue.textContent = isTeu ? '係數值（kgCO₂e / TEU-km）' : '係數值（kgCO₂e / tkm）';
    } else {
      this.efSpecNote.textContent = '自訂係數模式：以延噸公里 (tkm) 為預設活動量單位。';
      this.unitModeBadge.textContent = 'tkm';
      this.labelActivity.textContent = '貨物淨重（公噸 t）';
      this.inputWeight.placeholder = '例如：20';
      this.inputWeight.step = '0.01';
      this.teuHint.classList.add('hidden');
      this.labelEfValue.textContent = '係數值（kgCO₂e / tkm）';
    }
  }

  private executeCalculation(): void {
    this.calcErrorMsg.classList.add('hidden');

    const origin = this.originInput.getPort();
    const destination = this.destInput.getPort();
    if (!origin || !destination) {
      this.showError('請從下拉選單選擇有效的起運港與目的港（UN/LOCODE）。');
      return;
    }

    // 僅在「多段轉運航程」頁籤時才計入中繼轉運港
    const waypointPorts =
      this.activeTab === 'multi'
        ? this.waypoints
            .map((w) => w.search.getPort())
            .filter((p): p is PortItem => p !== null)
        : [];

    const weightVal = this.inputWeight.value.trim();
    const efVal = this.inputEf.value.trim();
    const selectedSpec = getEmissionFactorById(this.selectEf.value);

    try {
      const result = calculateSeaRoute({
        origin,
        waypoints: waypointPorts,
        destination,
        restrictions: this.getSelectedRestrictions(),
        activityAmount: weightVal ? Number(weightVal) : undefined,
        emissionUnit: selectedSpec?.unit ?? 'tkm',
        emissionFactorKgPerUnit: efVal ? Number(efVal) : undefined,
        emissionFactorSpec: selectedSpec,
      });

      this.lastResult = result;
      this.renderResult(result);
      this.mapService.renderResult(result);
    } catch (err) {
      this.showError(err instanceof Error ? err.message : '航線計算失敗，請檢查港口與水道限制設定。');
    }
  }

  private showError(msg: string): void {
    this.calcErrorMsg.textContent = msg;
    this.calcErrorMsg.classList.remove('hidden');
  }

  private renderResult(res: RouteCalculationResult): void {
    this.resultsDashboard.classList.remove('hidden');

    this.resKm.textContent = res.distanceKm.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    this.resNm.textContent = `${res.distanceNm.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} 海里 (nm)`;

    if (res.diffKm !== undefined && res.diffPercent !== undefined && res.baselineKm !== undefined) {
      const sign = res.diffKm >= 0 ? '+' : '';
      this.resDiff.textContent = `${sign}${res.diffKm.toLocaleString()} km (${sign}${res.diffPercent}%)`;
      this.resDiff.className = 'metric-value ' + (res.diffKm > 0 ? 'text-warn' : '');
      this.resDetour.textContent = `標準路徑：${res.baselineKm.toLocaleString()} km · 繞航比 ${res.detourRatio}`;
      this.legendBaseline.classList.remove('hidden');
    } else {
      this.resDiff.textContent = '標準路徑';
      this.resDiff.className = 'metric-value';
      this.resDetour.textContent = `大圓距離 ${res.greatCircleKm.toLocaleString()} km · 繞航比 ${res.detourRatio}`;
      this.legendBaseline.classList.add('hidden');
    }

    const isTeu = res.emissionUnit === 'TEU-km';
    this.resActivityLabel.textContent = isTeu ? '延櫃公里 (TEU-km)' : '延噸公里 (t-km)';
    this.resActivityUnit.textContent = isTeu ? 'TEU-km' : 't-km';

    if (res.activityMetricValue !== undefined && res.activityAmount !== undefined) {
      this.resTkm.textContent = res.activityMetricValue.toLocaleString();
      this.resWeightNote.textContent = isTeu
        ? `貨櫃數量：${res.activityAmount.toLocaleString()} TEU`
        : `貨物淨重：${res.activityAmount.toLocaleString()} 公噸`;
    } else {
      this.resTkm.textContent = '--';
      this.resWeightNote.textContent = isTeu ? '請輸入 TEU 貨櫃數以試算' : '請輸入貨物淨重以試算';
    }

    if (res.co2eKg !== undefined && res.co2eTonnes !== undefined) {
      this.resCo2Kg.textContent = res.co2eKg.toLocaleString();
      this.resCo2T.textContent = `${res.co2eTonnes} tCO₂e（${res.factorCitation}）`;
    } else {
      this.resCo2Kg.textContent = '--';
      this.resCo2T.textContent = `係數：${res.factorCitation}`;
    }

    this.resRoutePath.textContent = res.portsSequence.map((p) => formatPortShort(p)).join(' → ');
    this.resRestrictions.textContent = res.restrictionLabel;
    this.resPassages.textContent = res.passages.length > 0 ? res.passages.join('、') : '未經主要受限運河／海峽';
    this.resSnap.textContent = `起運港 ${res.originSnapKm} km / 目的港 ${res.destinationSnapKm} km`;

    this.auditPreviewBox.textContent = buildAuditTrailText(res);

    if (res.precisionWarnings.length > 0) {
      this.precisionWarningText.textContent = res.precisionWarnings.join(' ');
      this.precisionWarning.classList.remove('hidden');
    } else {
      this.precisionWarning.classList.add('hidden');
    }
  }

  private renderBatchTable(rows: BatchRowResult[]): void {
    this.batchResultWrap.classList.remove('hidden');
    this.batchTbody.innerHTML = '';

    for (const r of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="mono">${r.refDocId || '-'}</td>
        <td class="mono">${r.originCode}</td>
        <td class="mono">${r.destCode}</td>
        <td class="mono">${r.routeStatusCode}</td>
        <td class="mono">${r.distanceKm !== undefined ? r.distanceKm.toLocaleString() : '-'}</td>
        <td class="mono">${r.activityAmount !== undefined ? `${r.activityAmount} ${r.activityUnit === 'TEU-km' ? 'TEU' : 't'}` : '-'}</td>
        <td class="mono">${r.activityMetricValue !== undefined ? `${r.activityMetricValue.toLocaleString()} ${r.activityUnit}` : '-'}</td>
        <td class="mono">${r.co2eKg !== undefined ? r.co2eKg.toLocaleString() : '-'}</td>
        <td>${r.status === 'OK' ? '<span class="tag-ok">成功</span>' : `<span class="tag-err">${r.errorMsg}</span>`}</td>
      `;
      this.batchTbody.appendChild(tr);
    }
  }
}

new SeaRouteApp();
