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
  youtubeDemoUrl?: string | null;
  latestPatchVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}
