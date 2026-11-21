import {
  seaRoute,
  seaRouteMulti,
  type MarnetNetwork,
  type Passage,
  type SeaRouteMultiFeature,
} from 'searoute-ts';
import { PORTS, PORT_COUNT } from 'searoute-ts/ports';
import { PASSAGE_LABELS, ZH_PORT_NAMES } from '../data/zh-ports';

export interface PortItem {
  code: string;
  name: string;
  country: string;
  coordinates: [number, number]; // [lon, lat]
  zhName?: string;
  zhCountry?: string;
  aliases?: string[];
  searchIndex: string;
}

export interface RouteCalculationInput {
  origin: PortItem;
  waypoints: PortItem[];
  destination: PortItem;
  restrictions: Passage[];
  weightTonnes?: number;
  emissionFactorKgPerTkm?: number;
}

export interface RouteCalculationResult {
  route: SeaRouteMultiFeature;
  baselineRoute?: SeaRouteMultiFeature;
  distanceKm: number;
  distanceNm: number;
  baselineKm?: number;
  diffKm?: number;
  diffPercent?: number;
  greatCircleKm: number;
  detourRatio: number;
  originSnapKm: number;
  destinationSnapKm: number;
  passages: string[];
  restrictionLabel: string;
  weightTonnes?: number;
  emissionFactor?: number;
  tonKilometers?: number;
  co2eKg?: number;
  co2eTonnes?: number;
  precisionWarnings: string[];
  timestampUtc8: string;
  portsSequence: PortItem[];
}

const KM_TO_NM = 0.539956803;

let marnet20km: MarnetNetwork | null = null;
let networkLoadPromise: Promise<MarnetNetwork> | null = null;

/** 建立可供快速搜尋的港口清單 */
const ALL_PORTS: PortItem[] = Object.entries(PORTS).map(([code, rec]) => {
  const zh = ZH_PORT_NAMES[code];
  const parts = [
    code,
    rec.name,
    rec.country,
    zh?.zhName ?? '',
    zh?.zhCountry ?? '',
    ...(zh?.aliases ?? []),
  ];
  return {
    code,
    name: rec.name,
    country: rec.country,
    coordinates: rec.coordinates,
    zhName: zh?.zhName,
    zhCountry: zh?.zhCountry,
    aliases: zh?.aliases,
    searchIndex: parts.join(' ').toLowerCase(),
  };
});

const PORT_MAP = new Map<string, PortItem>(ALL_PORTS.map((p) => [p.code, p]));

export function getPortCount(): number {
  return PORT_COUNT;
}

export function getPortByCode(code: string): PortItem | undefined {
  return PORT_MAP.get(code.trim().toUpperCase());
}

export function formatPortDisplay(port: PortItem): string {
  return port.zhName
    ? `${port.code} · ${port.zhName} (${port.name})`
    : `${port.code} · ${port.name}, ${port.country}`;
}

export function formatPortShort(port: PortItem): string {
  return port.zhName ? `${port.zhName} (${port.code})` : `${port.name} (${port.code})`;
}

/**
 * 雙向中英文港口搜尋：優先顯示 UN/LOCODE 完全/前綴匹配，以及有中文標記的熱門港口
 */
export function searchPorts(query: string, limit = 25): PortItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    // 預設推薦台灣及全球主要樞紐港
    const featuredCodes = [
      'TWKHH', 'TWKEL', 'TWTXG', 'TWTPE',
      'CNSHA', 'NLRTM', 'USLAX', 'SGSIN',
      'HKHKG', 'JPTYO', 'KRPUS', 'DEHAM',
      'USNYC', 'AEJEA', 'AUSYD',
    ];
    return featuredCodes
      .map((c) => PORT_MAP.get(c))
      .filter((p): p is PortItem => Boolean(p));
  }

  const exactCode: PortItem[] = [];
  const prefixCode: PortItem[] = [];
  const zhMatch: PortItem[] = [];
  const otherMatch: PortItem[] = [];

  for (const port of ALL_PORTS) {
    const codeLower = port.code.toLowerCase();
    if (codeLower === q) {
      exactCode.push(port);
    } else if (codeLower.startsWith(q)) {
      prefixCode.push(port);
    } else if (port.zhName && port.searchIndex.includes(q)) {
      zhMatch.push(port);
    } else if (port.searchIndex.includes(q)) {
      otherMatch.push(port);
    }
  }

  return [...exactCode, ...prefixCode, ...zhMatch, ...otherMatch].slice(0, limit);
}

/**
 * 非同步載入 20km 精細海運路網，支援進度回呼與失敗重試
 */
export async function loadMarnet20km(
  onProgress?: (percent: number, message: string) => void
): Promise<MarnetNetwork> {
  if (marnet20km) return marnet20km;
  if (networkLoadPromise) return networkLoadPromise;

  networkLoadPromise = (async () => {
    let progress = 15;
    onProgress?.(progress, '正在下載 2025 Eurostat Maritime Network (marnet-20km, ~3.6 MB)…');

    const timer = window.setInterval(() => {
      if (progress < 85) {
        progress += Math.random() * 12;
        onProgress?.(Math.min(85, Math.round(progress)), '正在解析全球 20 km 海運路網節點…');
      }
    }, 240);

    try {
      const mod = await import('searoute-ts/marnet-20km');
      const net = (mod.DEFAULT_MARNET ?? mod.default) as MarnetNetwork;
      if (!net || net.type !== 'FeatureCollection' || !Array.isArray(net.features)) {
        throw new Error('marnet-20km 路網資料格式異常');
      }
      marnet20km = net;
      window.clearInterval(timer);
      onProgress?.(100, `marnet-20km 路網就緒（${net.features.length.toLocaleString()} 條海運航段，${PORT_COUNT.toLocaleString()} 個港口）`);
      return net;
    } catch (err) {
      window.clearInterval(timer);
      networkLoadPromise = null;
      throw err;
    }
  })();

  return networkLoadPromise;
}

export function isNetworkReady(): boolean {
  return marnet20km !== null;
}

export function formatUtc8Timestamp(date = new Date()): string {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const taipei = new Date(utcMs + 8 * 3600000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${taipei.getFullYear()}-${pad(taipei.getMonth() + 1)}-${pad(taipei.getDate())} ${pad(taipei.getHours())}:${pad(taipei.getMinutes())}:${pad(taipei.getSeconds())} (UTC+8)`;
}

export function describeRestrictions(restrictions: Passage[]): string {
  if (restrictions.length === 0) return '標準最短可行路徑（無水道限制）';
  const labels: string[] = [];
  if (restrictions.includes('suez') || restrictions.includes('babelmandeb')) {
    labels.push('避開蘇伊士運河／曼德海峽（繞行好望角）');
  }
  if (restrictions.includes('panama')) {
    labels.push('避開巴拿馬運河');
  }
  if (restrictions.includes('malacca')) {
    labels.push('避開麻六甲海峽');
  }
  return labels.join('、') || restrictions.join(', ');
}

function runSingleOrMulti(
  ports: PortItem[],
  network: MarnetNetwork,
  restrictions: Passage[]
): SeaRouteMultiFeature {
  const opts = {
    units: 'kilometers' as const,
    network,
    antimeridian: 'split' as const,
    returnPassages: true,
    restrictions: restrictions.length > 0 ? restrictions : undefined,
  };

  if (ports.length === 2) {
    return seaRoute(ports[0].code, ports[1].code, opts);
  }
  return seaRouteMulti(
    ports.map((p) => p.code),
    opts
  );
}

/**
 * 執行海運航線與碳排計算
 */
export function calculateSeaRoute(input: RouteCalculationInput): RouteCalculationResult {
  if (!marnet20km) {
    throw new Error('marnet-20km 路網尚未載入完成，請稍候再試。');
  }

  const portsSequence = [input.origin, ...input.waypoints, input.destination];
  if (portsSequence.length < 2) {
    throw new Error('請至少選擇起運港與目的港。');
  }

  const route = runSingleOrMulti(portsSequence, marnet20km, input.restrictions);
  const props = route.properties;
  const distanceKm = Number(props.length.toFixed(2));
  const distanceNm = Number((distanceKm * KM_TO_NM).toFixed(2));
  const greatCircleKm = Number(props.greatCircleLength.toFixed(2));
  const detourRatio = Number(props.detourRatio.toFixed(3));
  const originSnapKm = Number(props.originSnapKm.toFixed(2));
  const destinationSnapKm = Number(props.destinationSnapKm.toFixed(2));

  let baselineRoute: SeaRouteMultiFeature | undefined;
  let baselineKm: number | undefined;
  let diffKm: number | undefined;
  let diffPercent: number | undefined;

  if (input.restrictions.length > 0) {
    baselineRoute = runSingleOrMulti(portsSequence, marnet20km, []);
    baselineKm = Number(baselineRoute.properties.length.toFixed(2));
    diffKm = Number((distanceKm - baselineKm).toFixed(2));
    diffPercent = baselineKm > 0 ? Number((((distanceKm - baselineKm) / baselineKm) * 100).toFixed(2)) : 0;
  }

  const passagesRaw = props.passages ?? [];
  const passages = Array.from(
    new Set(passagesRaw.map((p) => PASSAGE_LABELS[p] ?? p))
  );

  // 精度與吸附距離警示（TASKS 2.2）
  const precisionWarnings: string[] = [];
  if (detourRatio < 1) {
    precisionWarnings.push(
      `繞航比 (Detour Ratio = ${detourRatio}) 小於 1，表示起迄點在路網吸附後距離縮短（常見於極短程近海航線），建議優先向船公司或貨代取得實測航程。`
    );
  }
  if (originSnapKm > 30 || destinationSnapKm > 30) {
    precisionWarnings.push(
      `港口座標至 20 km 路網節點之吸附距離偏大（起運港 ${originSnapKm} km / 目的港 ${destinationSnapKm} km），可能包含內河段或港灣誤差，查證時請留意實際靠泊碼頭位置。`
    );
  }
  if (distanceKm < 300 && precisionWarnings.length === 0) {
    precisionWarnings.push(
      `本航線屬於短程近海航線（${distanceKm} km < 300 km），若為離島或沿岸駁船運輸，建議輔以航商實測里程或 AIS 軌跡作為佐證。`
    );
  }

  // 噸公里與碳排計算
  const weight =
    typeof input.weightTonnes === 'number' && !Number.isNaN(input.weightTonnes) && input.weightTonnes > 0
      ? input.weightTonnes
      : undefined;
  const ef =
    typeof input.emissionFactorKgPerTkm === 'number' &&
    !Number.isNaN(input.emissionFactorKgPerTkm) &&
    input.emissionFactorKgPerTkm > 0
      ? input.emissionFactorKgPerTkm
      : undefined;

  const tonKilometers = weight !== undefined ? Number((distanceKm * weight).toFixed(2)) : undefined;
  const co2eKg =
    tonKilometers !== undefined && ef !== undefined
      ? Number((tonKilometers * ef).toFixed(2))
      : undefined;
  const co2eTonnes = co2eKg !== undefined ? Number((co2eKg / 1000).toFixed(4)) : undefined;

  return {
    route,
    baselineRoute,
    distanceKm,
    distanceNm,
    baselineKm,
    diffKm,
    diffPercent,
    greatCircleKm,
    detourRatio,
    originSnapKm,
    destinationSnapKm,
    passages,
    restrictionLabel: describeRestrictions(input.restrictions),
    weightTonnes: weight,
    emissionFactor: ef,
    tonKilometers,
    co2eKg,
    co2eTonnes,
    precisionWarnings,
    timestampUtc8: formatUtc8Timestamp(),
    portsSequence,
  };
}
