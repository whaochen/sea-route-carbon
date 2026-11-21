import html2canvas from 'html2canvas';
import {
  calculateSeaRoute,
  formatPortDisplay,
  getPortByCode,
  type RouteCalculationResult,
} from './routeEngine';
import type { Passage } from 'searoute-ts';

const METHODOLOGY_STATEMENT =
  'Shortest Feasible Distance (SFD) via 2025 Eurostat Maritime Network (searoute-ts / marnet-20km), Map © OpenStreetMap contributors';

/**
 * 產生 ISO 14064-1 盤查清冊「數據來源／備註」制式文字
 */
export function buildAuditTrailText(res: RouteCalculationResult): string {
  const portsText = res.portsSequence.map((p) => formatPortDisplay(p)).join(' -> ');
  const lines = [
    `[海運航線與碳足跡查證紀錄 | 晧脈元素庫 Zn 30]`,
    `航線序列：${portsText}`,
    `航道設定：${res.restrictionLabel}`,
    `港到港最短可行距離 (SFD)：${res.distanceKm.toLocaleString()} km (${res.distanceNm.toLocaleString()} nm)`,
  ];

  if (res.baselineKm !== undefined && res.diffKm !== undefined && res.diffPercent !== undefined) {
    lines.push(
      `基準路徑對比：標準路徑 ${res.baselineKm.toLocaleString()} km，改道增加 ${res.diffKm >= 0 ? '+' : ''}${res.diffKm.toLocaleString()} km (${res.diffPercent >= 0 ? '+' : ''}${res.diffPercent}%)`
    );
  }

  if (res.weightTonnes !== undefined && res.tonKilometers !== undefined) {
    lines.push(`貨物淨重：${res.weightTonnes.toLocaleString()} t｜延噸公里：${res.tonKilometers.toLocaleString()} t-km`);
  }

  if (res.co2eKg !== undefined && res.emissionFactor !== undefined) {
    lines.push(
      `推估排放量：${res.co2eKg.toLocaleString()} kgCO2e (${res.co2eTonnes} tCO2e)，係數 ${res.emissionFactor} kgCO2e/t-km`
    );
  }

  lines.push(`查詢時間：${res.timestampUtc8}`);
  lines.push(`方法學與邊界：Port-to-Port SFD (不含內陸段；若採用已含約15%繞航修正之預設係數，距離未再重複乘以1.15)。`);
  lines.push(`資料來源：${METHODOLOGY_STATEMENT}`);

  return lines.join('\n');
}

/**
 * 將地圖與 MRV 查證資訊卡合成高解析度 PNG 並觸發下載
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
    // Fallback：若外部圖磚 CORS 受限，改擷取 Leaflet 內建 canvas
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
  const cardHeight = 360;
  const outHeight = mapTargetHeight + cardHeight;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = outWidth;
  finalCanvas.height = outHeight;
  const ctx = finalCanvas.getContext('2d')!;

  // 1. 繪製地圖
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outWidth, outHeight);
  ctx.drawImage(mapCanvas, 0, 0, outWidth, mapTargetHeight);

  // 2. 繪製下方淺色白底高對比 MRV 查證資訊卡
  const cardY = mapTargetHeight;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, cardY, outWidth, cardHeight);

  // 淡天藍數值區背景
  ctx.fillStyle = '#f0f9ff';
  ctx.fillRect(32, cardY + 146, outWidth - 64, 134);
  ctx.strokeStyle = '#bae6fd';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(32, cardY + 146, outWidth - 64, 134);

  // 亮藍頂部邊線
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, cardY, outWidth, 4);

  const padX = 48;
  let y = cardY + 46;

  // 標題列
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 15px "JetBrains Mono", monospace';
  ctx.fillText('HAO ELEMENT MATRIX · Zn 30 · MRV VERIFICATION RECORD', padX, y);

  ctx.fillStyle = '#475569';
  ctx.font = '500 15px "JetBrains Mono", monospace';
  const tsText = `查詢時間：${res.timestampUtc8}`;
  const tsWidth = ctx.measureText(tsText).width;
  ctx.fillText(tsText, outWidth - padX - tsWidth, y);

  y += 38;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px "Noto Sans TC", "Inter", sans-serif';
  const routeHeadline = res.portsSequence.map((p) => formatPortDisplay(p)).join('  →  ');
  ctx.fillText(truncateText(ctx, routeHeadline, outWidth - padX * 2), padX, y);

  y += 34;
  ctx.fillStyle = '#334155';
  ctx.font = '500 17px "Noto Sans TC", "Inter", sans-serif';
  ctx.fillText(`航道條件：${res.restrictionLabel}`, padX, y);

  // 核心數據 4 欄
  y = cardY + 184;
  const colW = (outWidth - padX * 2) / 4;

  drawMetricColumn(
    ctx,
    padX,
    y,
    '港到港最短距離 (SFD)',
    `${res.distanceKm.toLocaleString()} km`,
    `${res.distanceNm.toLocaleString()} 海里 (nm)`,
    '#0284c7'
  );

  const diffMain =
    res.diffKm !== undefined
      ? `${res.diffKm >= 0 ? '+' : ''}${res.diffKm.toLocaleString()} km`
      : `繞航比 ${res.detourRatio}`;
  const diffSub =
    res.diffPercent !== undefined
      ? `對比標準路徑 ${res.diffPercent >= 0 ? '+' : ''}${res.diffPercent}%`
      : `大圓距離 ${res.greatCircleKm.toLocaleString()} km`;
  drawMetricColumn(ctx, padX + colW, y, '路徑特徵 / 改道差異', diffMain, diffSub, '#0f172a');

  const tkmMain = res.tonKilometers !== undefined ? `${res.tonKilometers.toLocaleString()} t-km` : '未輸入重量';
  const tkmSub = res.weightTonnes !== undefined ? `貨物淨重 ${res.weightTonnes.toLocaleString()} 公噸` : '僅距離佐證';
  drawMetricColumn(ctx, padX + colW * 2, y, '延噸公里 (t-km)', tkmMain, tkmSub, '#0f172a');

  const co2Main = res.co2eKg !== undefined ? `${res.co2eKg.toLocaleString()} kgCO₂e` : '未計算碳排';
  const co2Sub =
    res.co2eTonnes !== undefined && res.emissionFactor !== undefined
      ? `${res.co2eTonnes} tCO₂e (係數 ${res.emissionFactor})`
      : '需輸入淨重與係數';
  drawMetricColumn(ctx, padX + colW * 3, y, '推估碳排放量', co2Main, co2Sub, '#0284c7');

  // 底部方法學聲明
  const footerY = cardY + cardHeight - 28;
  ctx.fillStyle = '#475569';
  ctx.font = '400 14px "Inter", "Noto Sans TC", sans-serif';
  ctx.fillText(`方法學與資料來源：${METHODOLOGY_STATEMENT}`, padX, footerY);

  // 觸發下載
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
  valueColor: string
): void {
  ctx.fillStyle = '#475569';
  ctx.font = '600 15px "Noto Sans TC", sans-serif';
  ctx.fillText(label, x, y);

  ctx.fillStyle = valueColor;
  ctx.font = 'bold 28px "JetBrains Mono", "Noto Sans TC", sans-serif';
  ctx.fillText(value, x, y + 36);

  ctx.fillStyle = '#64748b';
  ctx.font = '400 14px "Noto Sans TC", "JetBrains Mono", sans-serif';
  ctx.fillText(sub, x, y + 62);
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
  originCode: string;
  destCode: string;
  distanceKm?: number;
  distanceNm?: number;
  weightTonnes?: number;
  tonKilometers?: number;
  co2eKg?: number;
  restrictionLabel: string;
  status: 'OK' | 'ERROR';
  errorMsg?: string;
}

/**
 * 執行批次航線計算
 */
export function runBatchCalculation(
  rawText: string,
  restrictions: Passage[],
  emissionFactor?: number
): BatchRowResult[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const results: BatchRowResult[] = [];

  for (const line of lines) {
    const cols = line.split(/[,\t]+/).map((c) => c.trim());
    const originCode = (cols[0] ?? '').toUpperCase();
    const destCode = (cols[1] ?? '').toUpperCase();
    const weight = cols[2] ? Number(cols[2]) : undefined;

    const origin = getPortByCode(originCode);
    const destination = getPortByCode(destCode);

    if (!origin || !destination) {
      results.push({
        originCode: originCode || '?',
        destCode: destCode || '?',
        weightTonnes: weight,
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
        weightTonnes: weight,
        emissionFactorKgPerTkm: emissionFactor,
      });
      results.push({
        originCode: origin.code,
        destCode: destination.code,
        distanceKm: calc.distanceKm,
        distanceNm: calc.distanceNm,
        weightTonnes: calc.weightTonnes,
        tonKilometers: calc.tonKilometers,
        co2eKg: calc.co2eKg,
        restrictionLabel: calc.restrictionLabel,
        status: 'OK',
      });
    } catch (err) {
      results.push({
        originCode: origin.code,
        destCode: destination.code,
        weightTonnes: weight,
        restrictionLabel: '',
        status: 'ERROR',
        errorMsg: err instanceof Error ? err.message : '無法計算航線',
      });
    }
  }

  return results;
}

/**
 * 下載 UTF-8 BOM CSV 查證報表
 */
export function downloadBatchCsv(rows: BatchRowResult[], timestamp: string): void {
  const header = [
    '起運港代碼',
    '目的港代碼',
    '航道條件',
    '港到港距離(km)',
    '港到港距離(nm)',
    '貨物淨重(t)',
    '延噸公里(t-km)',
    '推估碳排(kgCO2e)',
    '狀態',
    '查詢時間(UTC+8)',
    '方法學與資料來源',
  ];

  const csvLines = [header.join(',')];
  for (const r of rows) {
    const fields = [
      r.originCode,
      r.destCode,
      `"${r.restrictionLabel || '-'}"`,
      r.distanceKm ?? '',
      r.distanceNm ?? '',
      r.weightTonnes ?? '',
      r.tonKilometers ?? '',
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
