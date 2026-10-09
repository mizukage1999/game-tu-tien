import { useRef, useState } from 'react';
import { virtualInput } from '../game/EventBus';

const RADIUS = 48;

export function VirtualJoystick() {
  const base = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (clientX: number, clientY: number) => {
    const r = base.current!.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS;
      dy = (dy / d) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    const mag = Math.min(1, d / RADIUS);
    virtualInput.x = mag < 0.15 ? 0 : dx / RADIUS;
    virtualInput.y = mag < 0.15 ? 0 : dy / RADIUS;
  };

  const release = () => {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    virtualInput.x = 0;
    virtualInput.y = 0;
  };

  return (
    <div
      ref={base}
      className="joystick"
      onPointerDown={(e) => {
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointer.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <span className="joy-dir n">W</span>
      <span className="joy-dir s">S</span>
      <span className="joy-dir w">A</span>
      <span className="joy-dir e">D</span>
      <div className="joy-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
