import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GameStatus } from '@gamehub/shared';

export type GameDocument = Game & Document;

class GameImage {
  @Prop({ type: String, required: true })
  key!: string;

  @Prop({ type: String, required: true })
  url!: string;
}

class GameCredits {
  @Prop({ type: [String], default: [] })
  production!: string[];

  @Prop({ type: [String], default: [] })
  technical!: string[];

  @Prop({ type: [String], default: [] })
  translation!: string[];

  @Prop({ type: [String], default: [] })
  testing!: string[];
}

@Schema({ timestamps: true })
export class Game {
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  slug!: string;

  @Prop({ type: String, required: true, trim: true })
  title!: string;

  @Prop({ type: String, default: '' })
  description!: string;

  @Prop({ type: String, enum: Object.values(GameStatus), default: GameStatus.DRAFT })
  status!: GameStatus;

  @Prop({ type: [String], default: [] })
  executableNames!: string[];

  @Prop({ type: [String], default: [] })
  installPathHints!: string[];

  @Prop({ type: GameImage, default: null })
  coverImage!: GameImage | null;

  @Prop({ type: GameImage, default: null })
  bannerImage!: GameImage | null;

  @Prop({ type: [GameImage], default: [] })
  screenshots!: GameImage[];

  @Prop({ type: String, default: null })
  youtubeDemoUrl!: string | null;

  @Prop({ type: String, default: null })
  installGuide!: string | null;

  @Prop({ type: GameCredits, default: () => ({ production: [], technical: [], translation: [], testing: [] }) })
  credits!: GameCredits;

  @Prop({ type: Types.ObjectId, ref: 'PatchVersion', default: null })
  latestPatchVersionId!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}

export const GameSchema = SchemaFactory.createForClass(Game);

GameSchema.index({ status: 1, updatedAt: -1 });
