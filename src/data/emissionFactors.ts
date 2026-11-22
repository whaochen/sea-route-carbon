export type EmissionUnit = 'tkm' | 'TEU-km';

export interface EmissionFactorSpec {
  id: string;
  group: 'moenv' | 'intl';
  name: string;
  shortName: string;
  region: string;
  factor: number;
  sciNotation: string;
  unit: EmissionUnit;
  unitLabel: string;
  year: string;
  sourceOrg: string;
  note: string;
  isDefault?: boolean;
}

export const EMISSION_FACTORS: EmissionFactorSpec[] = [
  {
    id: 'moenv-intl-fuel-tkm',
    group: 'moenv',
    name: '國際海運貨物運輸服務(燃料油動力)',
    shortName: '國際海運燃料油動力',
    region: '美國',
    factor: 0.0198,
    sciNotation: '1.980E-02',
    unit: 'tkm',
    unitLabel: '延噸公里 (tkm)',
    year: '2016',
    sourceOrg: '環境部',
    note: '預設首選：實務併櫃 (LCL) 頻率高，以貨物淨重（公噸）計算',
    isDefault: true,
  },
  {
    id: 'moenv-intl-tw-teu',
    group: 'moenv',
    name: '國際海運貨物運輸服務(本國籍貨櫃船，歐美長程航線)',
    shortName: '國籍貨櫃歐美長程',
    region: '臺灣',
    factor: 0.0649,
    sciNotation: '6.490E-02',
    unit: 'TEU-km',
    unitLabel: '每個20呎標準貨櫃-每公里 (TEU-km)',
    year: '2022',
    sourceOrg: '環境部',
    note: '整櫃歐美長程專用（自動切換為 TEU 貨櫃數輸入）',
  },
  {
    id: 'moenv-dom-diesel-tkm',
    group: 'moenv',
    name: '國內海運貨物運輸服務(柴油動力)',
    shortName: '國內海運柴油動力',
    region: '美國',
    factor: 0.0334,
    sciNotation: '3.340E-02',
    unit: 'tkm',
    unitLabel: '延噸公里 (tkm)',
    year: '2016',
    sourceOrg: '環境部',
    note: '國內近海／島際海運選用',
  },
  {
    id: 'moenv-dom-fuel-tkm',
    group: 'moenv',
    name: '國內海運貨物運輸服務(燃料油動力)',
    shortName: '國內海運燃料油動力',
    region: '美國',
    factor: 0.0354,
    sciNotation: '3.540E-02',
    unit: 'tkm',
    unitLabel: '延噸公里 (tkm)',
    year: '2016',
    sourceOrg: '環境部',
    note: '國內近海／島際海運選用',
  },
  // 次要參考係數
  {
    id: 'glec-container-avg',
    group: 'intl',
    name: 'GLEC 一般海運貨櫃船平均參考值',
    shortName: 'GLEC 一般貨櫃船',
    region: '全球',
    factor: 0.0161,
    sciNotation: '1.610E-02',
    unit: 'tkm',
    unitLabel: '延噸公里 (tkm)',
    year: '2023',
    sourceOrg: 'GLEC v3',
    note: '含實務繞航修正，切勿再將 SFD 乘以 1.15',
  },
  {
    id: 'glec-ulcv-tkm',
    group: 'intl',
    name: '超大型遠洋貨櫃船 (>10,000 TEU) 參考值',
    shortName: '超大型貨櫃船',
    region: '全球',
    factor: 0.0078,
    sciNotation: '7.800E-03',
    unit: 'tkm',
    unitLabel: '延噸公里 (tkm)',
    year: '2023',
    sourceOrg: 'GLEC v3',
    note: '歐亞／跨太平洋幹線大型母船參考值',
  },
  {
    id: 'glec-bulk-tkm',
    group: 'intl',
    name: '遠洋散裝船 (Bulk Carrier) 參考值',
    shortName: '遠洋散裝船',
    region: '全球',
    factor: 0.0065,
    sciNotation: '6.500E-03',
    unit: 'tkm',
    unitLabel: '延噸公里 (tkm)',
    year: '2023',
    sourceOrg: 'GLEC v3',
    note: '礦砂、穀物、煤炭等大宗散貨',
  },
];

export const DEFAULT_EMISSION_FACTOR = EMISSION_FACTORS[0];

export function getEmissionFactorById(id: string): EmissionFactorSpec | undefined {
  return EMISSION_FACTORS.find((ef) => ef.id === id);
}

export function formatFactorCitation(spec: EmissionFactorSpec | undefined, customValue?: number): string {
  if (!spec) {
    return customValue !== undefined
      ? `自訂係數 ${customValue} kgCO₂e/tkm`
      : '未指定係數';
  }
  return `${spec.sourceOrg} ${spec.year} · ${spec.shortName} ${spec.factor} kgCO₂e/${spec.unit}`;
}
