import html2canvas from 'html2canvas';
import type { Passage } from 'searoute-ts';
import type { EmissionFactorSpec, EmissionUnit } from '../data/emissionFactors';
import {
  calculateSeaRoute,
  formatPortDisplay,
  getPortByCode,
  type RouteCalculationResult,
} from './routeEngine';

const METHODOLOGY_STATEMENT =
  'Shortest Feasible Distance (SFD) via 2025 Eurostat Maritime Network (searoute-ts / marnet-20km), Map © OpenStreetMap contributors，係數與數據一律以原出處機關最新公告為準';

/**
 * 產生 ISO 14064-1 類別 3 / GHG Protocol 範疇三類別 4 & 9 / ISO 14083 盤查清冊標準備註文字
 */
export function buildAuditTrailText(res: RouteCalculationResult): string {
  const portsText = res.portsSequence.map((p) => formatPortDisplay(p)).join(' -> ');
  const isTeu = res.emissionUnit === 'TEU-km';
  const metricLabel = isTeu ? '延櫃公里 (TEU-km)' : '延噸公里 (t-km)';
  const amountLabel = isTeu ? '20呎標準貨櫃數' : '貨物淨重';
  const amountUnit = isTeu ? 'TEU' : 't';

  const lines = [
    `[全球航海GHG排放計算器 · MRV 查證紀錄 | 晧脈元素庫 Zn 30]`,
    `盤查標準分類：ISO 14064-1 類別 3 ／ GHG Protocol 範疇三類別 4 & 9 ／ ISO 14083`,
    `航線序列：${portsText}`,
    `航道設定：${res.restrictionLabel}（狀態碼：${res.routeStatusCode}）`,
    `港到港最短可行距離 (SFD)：${res.distanceKm.toLocaleString()} km (${res.distanceNm.toLocaleString()} nm)`,
  ];

  if (res.baselineKm !== undefined && res.diffKm !== undefined && res.diffPercent !== undefined) {
    lines.push(
      `基準路徑對比：標準路徑 ${res.baselineKm.toLocaleString()} km，改道差異 ${res.diffKm >= 0 ? '+' : ''}${res.diffKm.toLocaleString()} km (${res.diffPercent >= 0 ? '+' : ''}${res.diffPercent}%)`
    );
  }

  if (res.activityAmount !== undefined && res.activityMetricValue !== undefined) {
    lines.push(
      `${amountLabel}：${res.activityAmount.toLocaleString()} ${amountUnit}｜${metricLabel}：${res.activityMetricValue.toLocaleString()} ${res.emissionUnit}`
    );
  }

  if (res.co2eKg !== undefined) {
    lines.push(
      `推估碳排放量：${res.co2eKg.toLocaleString()} kgCO2e (${res.co2eTonnes} tCO2e)｜採用係數：${res.factorCitation}`
    );
  }

  lines.push(`查詢時間：${res.timestampUtc8}`);
  lines.push(`方法學與邊界：Port-to-Port SFD (不含內陸段；若採用已含約15%繞航修正之預設係數，距離未再重複乘以1.15)。`);
  lines.push(`資料來源與免責：${METHODOLOGY_STATEMENT}`);

  return lines.join('\n');
}

/**
 * 將地圖與 MRV 查證資訊卡合成白底高對比 PNG 並觸發下載
 */
export async function exportVerificationPng(
  mapContainerEl: HTMLElement,
  res: RouteCalculationResult
): Promise<void> {
  let mapCanvas: HTMLCanvasElement;

  try {
    mapCanvas = await html2canvas(mapContainerEl, {
      useCORS: true,
      allowTaint: false,
      scale: 2,
      backgroundColor: '#f8fafc',
      logging: false,
    });
  } catch {
    const innerCanvas = mapContainerEl.querySelector('canvas');
    mapCanvas = document.createElement('canvas');
    mapCanvas.width = 1440;
    mapCanvas.height = 760;
    const fctx = mapCanvas.getContext('2d')!;
    fctx.fillStyle = '#e2e8f0';
    fctx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    if (innerCanvas) {
      fctx.drawImage(innerCanvas, 0, 0, mapCanvas.width, mapCanvas.height);
    }
  }

  const outWidth = 1440;
  const mapTargetHeight = Math.round((mapCanvas.height / mapCanvas.width) * outWidth);
  const cardHeight = 376;
  const outHeight = mapTargetHeight + cardHeight;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = outWidth;
  finalCanvas.height = outHeight;
  const ctx = finalCanvas.getContext('2d')!;

  // 1. 繪製地圖
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outWidth, outHeight);
  ctx.drawImage(mapCanvas, 0, 0, outWidth, mapTargetHeight);

  // 2. 繪製下方白底高對比 MRV 查證資訊卡
  const cardY = mapTargetHeight;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, cardY, outWidth, cardHeight);

  // 淡天藍數值區背景
  ctx.fillStyle = '#f0f9ff';
  ctx.fillRect(32, cardY + 148, outWidth - 64, 142);
  ctx.strokeStyle = '#bae6fd';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(32, cardY + 148, outWidth - 64, 142);

  // 亮藍頂部邊線
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, cardY, outWidth, 4);

  const padX = 48;
  let y = cardY + 44;

  // 標題列
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 14.5px "JetBrains Mono", monospace';
  ctx.fillText('HAO ELEMENT MATRIX · Zn 30 · ISO 14064-1 / ISO 14083 MRV RECORD', padX, y);

  ctx.fillStyle = '#475569';
  ctx.font = '500 14.5px "JetBrains Mono", monospace';
  const tsText = `查詢時間：${res.timestampUtc8}`;
  const tsWidth = ctx.measureText(tsText).width;
  ctx.fillText(tsText, outWidth - padX - tsWidth, y);

  y += 38;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 25px "Noto Sans TC", "Inter", sans-serif';
  const routeHeadline = res.portsSequence.map((p) => formatPortDisplay(p)).join('  →  ');
  ctx.fillText(truncateText(ctx, routeHeadline, outWidth - padX * 2), padX, y);

  y += 32;
  ctx.fillStyle = '#334155';
  ctx.font = '500 16.5px "Noto Sans TC", "Inter", sans-serif';
  ctx.fillText(`航道條件：${res.restrictionLabel}（${res.routeStatusCode}）`, padX, y);

  // 核心數據 4 欄
  y = cardY + 186;
  const colW = (outWidth - padX * 2) / 4;
  const isTeu = res.emissionUnit === 'TEU-km';

  drawMetricColumn(
    ctx,
    padX,
    y,
    '港到港最短距離 (SFD)',
    `${res.distanceKm.toLocaleString()} km`,
    `${res.distanceNm.toLocaleString()} 海里 (nm)`,
    '#0284c7',
    colW - 14
  );

  const diffMain =
    res.diffKm !== undefined
      ? `${res.diffKm >= 0 ? '+' : ''}${res.diffKm.toLocaleString()} km`
      : `繞航比 ${res.detourRatio}`;
  const diffSub =
    res.diffPercent !== undefined
      ? `對比標準路徑 ${res.diffPercent >= 0 ? '+' : ''}${res.diffPercent}%`
      : `大圓距離 ${res.greatCircleKm.toLocaleString()} km`;
  drawMetricColumn(ctx, padX + colW, y, '路徑特徵 / 改道差異', diffMain, diffSub, '#0f172a', colW - 14);

  const actTitle = isTeu ? '延櫃公里 (TEU-km)' : '延噸公里 (t-km)';
  const actMain =
    res.activityMetricValue !== undefined
      ? `${res.activityMetricValue.toLocaleString()} ${isTeu ? 'TEU-km' : 't-km'}`
      : isTeu
        ? '未輸入櫃數'
        : '未輸入重量';
  const actSub =
    res.activityAmount !== undefined
      ? isTeu
        ? `貨櫃數量 ${res.activityAmount.toLocaleString()} TEU`
        : `貨物淨重 ${res.activityAmount.toLocaleString()} 公噸`
      : '僅距離佐證';
  drawMetricColumn(ctx, padX + colW * 2, y, actTitle, actMain, actSub, '#0f172a', colW - 14);

  const co2Main = res.co2eKg !== undefined ? `${res.co2eKg.toLocaleString()} kgCO₂e` : '未計算碳排';
  const co2Sub =
    res.co2eTonnes !== undefined
      ? `${res.factorCitation}`
      : `係數：${res.factorCitation}`;
  drawMetricColumn(ctx, padX + colW * 3, y, '推估碳排放量', co2Main, co2Sub, '#0284c7', colW);

  // 底部方法學與原出處免責聲明
  const footerY = cardY + cardHeight - 26;
  ctx.fillStyle = '#475569';
  ctx.font = '400 13px "Inter", "Noto Sans TC", sans-serif';
  ctx.fillText(truncateText(ctx, `方法學與資料來源：${METHODOLOGY_STATEMENT}`, outWidth - padX * 2), padX, footerY);

  const originCode = res.portsSequence[0].code;
  const destCode = res.portsSequence[res.portsSequence.length - 1].code;
  const datePart = res.timestampUtc8.slice(0, 10).replace(/-/g, '');
  const link = document.createElement('a');
  link.download = `sea-route-mrv-${originCode}-${destCode}-${datePart}.png`;
  link.href = finalCanvas.toDataURL('image/png');
  link.click();
}

function drawMetricColumn(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string,
  sub: string,
  valueColor: string,
  maxWidth: number
): void {
  ctx.fillStyle = '#475569';
  ctx.font = '600 14.5px "Noto Sans TC", sans-serif';
  ctx.fillText(truncateText(ctx, label, maxWidth), x, y);

  ctx.fillStyle = valueColor;
  ctx.font = 'bold 26px "JetBrains Mono", "Noto Sans TC", sans-serif';
  ctx.fillText(truncateText(ctx, value, maxWidth), x, y + 36);

  ctx.fillStyle = '#334155';
  ctx.font = '500 12.5px "Noto Sans TC", "JetBrains Mono", sans-serif';
  ctx.fillText(truncateText(ctx, sub, maxWidth), x, y + 62);
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 3 && ctx.measureText(s + '…').width > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + '…';
}

export interface BatchRowResult {
  refDocId: string;
  originCode: string;
  destCode: string;
  routeStatusCode: string;
  distanceKm?: number;
  distanceNm?: number;
  activityAmount?: number;
  activityUnit: EmissionUnit;
  activityMetricValue?: number;
  factorName: string;
  factorYear: string;
  co2eKg?: number;
  restrictionLabel: string;
  status: 'OK' | 'ERROR';
  errorMsg?: string;
}

/**
 * 執行批次航線計算（支援第 4 欄 ref_doc_id 提單編號）
 */
export function runBatchCalculation(
  rawText: string,
  restrictions: Passage[],
  emissionFactorValue?: number,
  emissionFactorSpec?: EmissionFactorSpec
): BatchRowResult[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const unit: EmissionUnit = emissionFactorSpec?.unit ?? 'tkm';
  const factorName = emissionFactorSpec?.name ?? '自訂海運係數';
  const factorYear = emissionFactorSpec?.year ?? '-';
  const results: BatchRowResult[] = [];

  for (const line of lines) {
    const cols = line.split(/[,\t]+/).map((c) => c.trim());
    const originCode = (cols[0] ?? '').toUpperCase();
    const destCode = (cols[1] ?? '').toUpperCase();
    const amount = cols[2] ? Number(cols[2]) : undefined;
    const refDocId = cols[3] ?? '';

    const origin = getPortByCode(originCode);
    const destination = getPortByCode(destCode);

    if (!origin || !destination) {
      results.push({
        refDocId,
        originCode: originCode || '?',
        destCode: destCode || '?',
        routeStatusCode: '-',
        activityAmount: amount,
        activityUnit: unit,
        factorName,
        factorYear,
        restrictionLabel: '',
        status: 'ERROR',
        errorMsg: !origin ? `找不到起運港代碼 ${originCode}` : `找不到目的港代碼 ${destCode}`,
      });
      continue;
    }

    try {
      const calc = calculateSeaRoute({
        origin,
        waypoints: [],
        destination,
        restrictions,
        activityAmount: amount,
        emissionUnit: unit,
        emissionFactorKgPerUnit: emissionFactorValue,
        emissionFactorSpec,
      });
      results.push({
        refDocId,
        originCode: origin.code,
        destCode: destination.code,
        routeStatusCode: calc.routeStatusCode,
        distanceKm: calc.distanceKm,
        distanceNm: calc.distanceNm,
        activityAmount: calc.activityAmount,
        activityUnit: calc.emissionUnit,
        activityMetricValue: calc.activityMetricValue,
        factorName,
        factorYear,
        co2eKg: calc.co2eKg,
        restrictionLabel: calc.restrictionLabel,
        status: 'OK',
      });
    } catch (err) {
      results.push({
        refDocId,
        originCode: origin.code,
        destCode: destination.code,
        routeStatusCode: '-',
        activityAmount: amount,
        activityUnit: unit,
        factorName,
        factorYear,
        restrictionLabel: '',
        status: 'ERROR',
        errorMsg: err instanceof Error ? err.message : '無法計算航線',
      });
    }
  }

  return results;
}

/**
 * 下載 UTF-8 BOM CSV 四層溯源查證報表
 */
export function downloadBatchCsv(rows: BatchRowResult[], timestamp: string): void {
  const header = [
    'ref_doc_id(提單編號)',
    '起運港(UN/LOCODE)',
    '目的港(UN/LOCODE)',
    '航道狀態碼',
    '港到港距離SFD(km)',
    '港到港距離(nm)',
    '活動數據量(t或TEU)',
    '活動數據單位',
    '延噸/延櫃公里',
    '係數全名',
    '公告年份',
    '總碳排量(kgCO2e)',
    '狀態',
    '產出時間戳(UTC+8)',
    '方法學與免責聲明',
  ];

  const csvLines = [header.join(',')];
  for (const r of rows) {
    const unitCsv = r.activityUnit === 'TEU-km' ? 'TEU-km' : 't-km';
    const fields = [
      `"${r.refDocId}"`,
      r.originCode,
      r.destCode,
      r.routeStatusCode,
      r.distanceKm ?? '',
      r.distanceNm ?? '',
      r.activityAmount ?? '',
      unitCsv,
      r.activityMetricValue ?? '',
      `"${r.factorName}"`,
      r.factorYear,
      r.co2eKg ?? '',
      r.status === 'OK' ? '成功' : `"錯誤: ${r.errorMsg ?? ''}"`,
      `"${timestamp}"`,
      `"${METHODOLOGY_STATEMENT}"`,
    ];
    csvLines.push(fields.join(','));
  }

  const bom = '\uFEFF';
  const blob = new Blob([bom + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sea-route-batch-${timestamp.slice(0, 10).replace(/-/g, '')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
