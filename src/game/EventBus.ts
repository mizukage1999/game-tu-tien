import type { SkillId } from '../data';

export interface BusEvents {
  'cmd:attack': void;
  'cmd:skill': SkillId;
  'cmd:interact': void;
  'cmd:meditate': void;
  'cmd:target': void;
  'cmd:respawnMap': void;
}

type Handler<T> = (payload: T) => void;

class TypedBus {
  private handlers = new Map<keyof BusEvents, Set<Handler<unknown>>>();

  on<K extends keyof BusEvents>(event: K, fn: Handler<BusEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) this.handlers.set(event, (set = new Set()));
    set.add(fn as Handler<unknown>);
    return () => set!.delete(fn as Handler<unknown>);
  }

  emit<K extends keyof BusEvents>(event: K, ...args: BusEvents[K] extends void ? [] : [BusEvents[K]]) {
    this.handlers.get(event)?.forEach((fn) => fn(args[0]));
  }
}

export const EventBus = new TypedBus();

/** Analog input written by the React joystick, read by the Phaser player every frame. */
export const virtualInput = { x: 0, y: 0 };
