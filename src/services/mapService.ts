import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJsonObject } from 'geojson';
import { formatPortShort, type PortItem, type RouteCalculationResult } from './routeEngine';

export class SeaMapService {
  private map: L.Map;
  private routeLayerGroup: L.LayerGroup;
  private canvasRenderer: L.Canvas;

  constructor(containerId: string) {
    this.canvasRenderer = L.canvas({ padding: 0.5 });

    this.map = L.map(containerId, {
      center: [22, 120],
      zoom: 3,
      minZoom: 2,
      maxZoom: 16,
      preferCanvas: true,
      worldCopyJump: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
      crossOrigin: 'anonymous',
    }).addTo(this.map);

    this.routeLayerGroup = L.layerGroup().addTo(this.map);
  }

  public invalidateSize(): void {
    this.map.invalidateSize();
  }

  /**
   * 判斷是否為跨太平洋（跨換日線）航線
   */
  private isTransPacific(coordsList: [number, number][][]): boolean {
    let hasFarEast = false;
    let hasAmericas = false;
    for (const seg of coordsList) {
      for (const [lon] of seg) {
        if (lon > 100) hasFarEast = true;
        if (lon < -60) hasAmericas = true;
      }
    }
    return hasFarEast && hasAmericas;
  }

  /**
   * 繪製航線與起迄／轉運標記，並自動聚焦視野
   */
  public renderResult(result: RouteCalculationResult): void {
    this.routeLayerGroup.clearLayers();

    const mainCoords = this.extractLineSegments(result.route);
    const transPacific = this.isTransPacific(mainCoords);

    const shiftLon = (lon: number): number => {
      if (transPacific && lon < 0) return lon + 360;
      return lon;
    };

    // 1. 若有標準基準航線（對比模式），先繪製虛線基準
    if (result.baselineRoute) {
      const baseSegments = this.extractLineSegments(result.baselineRoute);
      for (const seg of baseSegments) {
        const latLngs = seg.map(([lon, lat]) => L.latLng(lat, shiftLon(lon)));
        L.polyline(latLngs, {
          renderer: this.canvasRenderer,
          color: '#94a3b8',
          weight: 2.5,
          opacity: 0.75,
          dashArray: '7, 7',
        }).addTo(this.routeLayerGroup);
      }
    }

    // 2. 繪製主航線（電光天藍 #29b6f6）
    const boundsPoints: L.LatLng[] = [];
    for (const seg of mainCoords) {
      const latLngs = seg.map(([lon, lat]) => {
        const pt = L.latLng(lat, shiftLon(lon));
        boundsPoints.push(pt);
        return pt;
      });

      // 外層光暈線
      L.polyline(latLngs, {
        renderer: this.canvasRenderer,
        color: '#29b6f6',
        weight: 7,
        opacity: 0.22,
      }).addTo(this.routeLayerGroup);

      // 核心實線
      L.polyline(latLngs, {
        renderer: this.canvasRenderer,
        color: '#29b6f6',
        weight: 3.5,
        opacity: 0.95,
      }).addTo(this.routeLayerGroup);
    }

    // 3. 繪製起點（綠）、中繼轉運港（藍）、終點（紅）
    const seq = result.portsSequence;
    seq.forEach((port: PortItem, idx: number) => {
      const [rawLon, lat] = port.coordinates;
      const lon = shiftLon(rawLon);
      const latLng = L.latLng(lat, lon);
      boundsPoints.push(latLng);

      const isOrigin = idx === 0;
      const isDest = idx === seq.length - 1;
      const color = isOrigin ? '#22c55e' : isDest ? '#ef4444' : '#38bdf8';
      const roleText = isOrigin ? '起運港' : isDest ? '目的港' : `轉運港 #${idx}`;

      const marker = L.circleMarker(latLng, {
        renderer: this.canvasRenderer,
        radius: isOrigin || isDest ? 7 : 6,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      }).addTo(this.routeLayerGroup);

      marker.bindTooltip(`${roleText}：${formatPortShort(port)}`, {
        direction: 'top',
        offset: [0, -6],
      });
    });

    // 4. 自動縮放至合適視野
    if (boundsPoints.length > 0) {
      const bounds = L.latLngBounds(boundsPoints);
      this.map.fitBounds(bounds, { padding: [45, 45], maxZoom: 7 });
    }
  }

  private extractLineSegments(feature: GeoJsonObject): [number, number][][] {
    const f = feature as {
      geometry?: {
        type: string;
        coordinates: [number, number][] | [number, number][][];
      };
    };
    if (!f.geometry) return [];
    if (f.geometry.type === 'LineString') {
      return [f.geometry.coordinates as [number, number][]];
    }
    if (f.geometry.type === 'MultiLineString') {
      return f.geometry.coordinates as [number, number][][];
    }
    return [];
  }
}
