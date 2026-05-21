export enum GameStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DELETING = 'DELETING',
  DELETED = 'DELETED',
}

export interface GameImage {
  key: string;
  url: string;
}

export interface GameCredits {
  production: string[];
  technical: string[];
  translation: string[];
  testing: string[];
}

export interface Game {
  _id: string;
  slug: string;
  title: string;
  description: string;
  status: GameStatus;
  executableNames: string[];
  installPathHints: string[];
  coverImage?: GameImage | null;
  bannerImage?: GameImage | null;
  screenshots: GameImage[];
  youtubeDemoUrl?: string | null;
  installGuide?: string | null;
  credits: GameCredits;
  latestPatchVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}
