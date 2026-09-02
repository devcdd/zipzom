// ponytail: 카카오맵 SDK 최소 타입. 쓰는 API 늘면 kakao.maps.d.ts 패키지로 교체
declare namespace kakao.maps {
  function load(cb: () => void): void;
  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }
  class LatLngBounds {
    constructor();
    extend(p: LatLng): void;
    isEmpty(): boolean;
  }
  class Map {
    constructor(el: HTMLElement, opts: { center: LatLng; level: number });
    setBounds(b: LatLngBounds, ...padding: number[]): void;
    panTo(p: LatLng): void;
    setLevel(level: number, opts?: { anchor?: LatLng; animate?: boolean }): void;
    getLevel(): number;
    relayout(): void;
  }
  class Size {
    constructor(width: number, height: number);
  }
  class Point {
    constructor(x: number, y: number);
  }
  class MarkerImage {
    constructor(src: string, size: Size, options?: { offset?: Point });
  }
  class Marker {
    constructor(opts: { position: LatLng; title?: string; image?: MarkerImage });
    setMap(m: Map | null): void;
    getPosition(): LatLng;
  }
  class CustomOverlay {
    constructor(opts: { position: LatLng; content: HTMLElement; yAnchor?: number; zIndex?: number; clickable?: boolean });
    setMap(m: Map | null): void;
    setPosition(p: LatLng): void;
  }
  class MarkerClusterer {
    constructor(opts: { map: Map; averageCenter?: boolean; minLevel?: number; minClusterSize?: number; disableClickZoom?: boolean; styles?: Record<string, string>[] });
    addMarkers(markers: Marker[]): void;
    clear(): void;
  }
  interface Cluster {
    getMarkers(): Marker[];
    getCenter(): LatLng;
  }
  namespace event {
    function addListener(target: object, type: string, handler: (arg?: unknown) => void): void;
  }
}
