export interface CarpetPattern {
  path: string;
  thumb?: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  colors: string[];
  seamless: boolean;
}

export interface HardFloorTile {
  path: string;
  material: string;
  width: number;
  height: number;
  bytes: number;
  colors: string[];
  seamless: boolean;
}

export interface CarpetPub {
  ref: string;
  name: string;
  town: string;
  county: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
  pattern?: CarpetPattern;
  noCarpet?: boolean;
  noCarpetNote?: string;
  floor?: HardFloorTile;
}

export interface CarpetCatalog {
  meta: {
    version: number;
    generatedAt: string;
    totalPubs: number;
    vectorizedPubs: number;
    noCarpetPubs: number;
  };
  pubs: CarpetPub[];
}
