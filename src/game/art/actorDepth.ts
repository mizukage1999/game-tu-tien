interface DepthActor {
  depth: number;
  setPosition(x: number, y: number): unknown;
  setDepth(depth: number): unknown;
}

/** Phaser queues a full display-list sort even when setDepth receives the same value. */
export function placeActor<T extends DepthActor>(actor: T, x: number, y: number, depth: number): T {
  actor.setPosition(x, y);
  if (actor.depth !== depth) actor.setDepth(depth);
  return actor;
}
