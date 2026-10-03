// Persistent player progress (FR-046, FR-050) on top of the pure save model.
import { biomeOfWorld } from '../engine/campaign';
import {
  SAVE_KEY, applyResult, defaultSave, furthestUnlocked, furthestWorld, isUnlocked, levelProgress, parseSave, serializeSave,
  totalStars, type RunOutcome, type SaveData,
} from '../engine/progress';
import type { KeyValueStore } from '../platform/storage';
import type { ProgressService } from './screen';

export class ProgressStore implements ProgressService {
  private save: SaveData;
  /** "World 2 · Candy Kingdom" after the last recorded run opened a new world, shown once on the map. */
  pendingWorldUnlock: string | null = null;
  /** True after a write failed (e.g. storage full), so the notice can be shown once. */
  writeFailed = false;

  constructor(private readonly storage: KeyValueStore) {
    this.save = parseSave(storage.get(SAVE_KEY));
  }

  get available(): boolean {
    return this.storage.available && !this.writeFailed;
  }

  stars(level: number): number {
    return levelProgress(this.save, level).stars;
  }

  best(level: number): number {
    return levelProgress(this.save, level).best;
  }

  secret(level: number): boolean {
    return levelProgress(this.save, level).secret;
  }

  unlocked(level: number): boolean {
    return isUnlocked(this.save, level);
  }

  totalStars(): number {
    return totalStars(this.save);
  }

  furthestUnlocked(): number {
    return furthestUnlocked(this.save);
  }

  furthestWorld(): number {
    return furthestWorld(this.save);
  }

  record(level: number, result: RunOutcome): { newBest: boolean } {
    const before = furthestWorld(this.save);
    const { save, newBest } = applyResult(this.save, level, { stars: result.stars, score: result.score, secretRoute: result.secretRoute });
    this.save = save;
    const after = furthestWorld(this.save);
    if (after > before) this.pendingWorldUnlock = `World ${after} · ${biomeOfWorld(after).name}`;
    this.persist();
    return { newBest };
  }

  get muted(): boolean {
    return this.save.settings.muted;
  }

  set muted(value: boolean) {
    this.save = { ...this.save, settings: { muted: value } };
    this.persist();
  }

  reset(): void {
    this.storage.remove(SAVE_KEY);
    this.save = defaultSave();
  }

  private persist(): void {
    if (!this.storage.set(SAVE_KEY, serializeSave(this.save)) && this.storage.available) this.writeFailed = true;
  }
}
