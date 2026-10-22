import { useRef, useState } from "react";
import type { StreetInput } from "./Street3D";

export function Joystick({ input }: { input: React.RefObject<StreetInput> }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const set = (cx: number, cy: number) => {
    const r = base.current!.getBoundingClientRect();
    let dx = (cx - (r.left + r.width / 2)) / (r.width / 2), dy = (cy - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    input.current.x = dx; input.current.y = -dy; setKnob({ x: dx, y: dy });
  };
  const end = () => { input.current.x = 0; input.current.y = 0; setKnob({ x: 0, y: 0 }); };
  return (
    <div ref={base} role="application" aria-label="Manette de déplacement" className="glass relative h-32 w-32 touch-none rounded-full shadow-card"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); set(e.clientX, e.clientY); }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") set(e.clientX, e.clientY); }}
      onPointerUp={end} onPointerCancel={end}>
      <span className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-primary/80 shadow-elegant" style={{ transform: `translate(calc(-50% + ${knob.x * 36}px), calc(-50% + ${knob.y * 36}px))` }} />
    </div>
  );
}

