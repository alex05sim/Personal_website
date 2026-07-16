"use client";

import { RotateCcw } from "lucide-react";
import { type MouseEvent, useEffect, useRef, useState } from "react";

/** Easter-egg mini-game toggled from the footer; takes over the screen while active. */
export function SiteInvader({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const [shipX, setShipX] = useState(50);
  const [shots, setShots] = useState<Array<{ id: number; x: number }>>([]);
  const [hits, setHits] = useState(0);
  const shotIdRef = useRef(0);

  useEffect(() => {
    if (!active) {
      document.documentElement.style.setProperty("--invader-ship-x", "50%");

      return;
    }

    function fireShot() {
      const id = shotIdRef.current;
      shotIdRef.current += 1;
      setShots((current) => [...current, { id, x: shipX }]);
      setHits((current) => Math.min(current + 1, 5));

      window.setTimeout(() => {
        setShots((current) => current.filter((shot) => shot.id !== id));
      }, 780);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        setShipX((current) => Math.max(8, current - 5));
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        setShipX((current) => Math.min(92, current + 5));
      }

      if (event.code === "Space") {
        event.preventDefault();
        fireShot();
      }

      if (event.key === "Escape") {
        onToggle();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onToggle, shipX]);

  useEffect(() => {
    document.documentElement.style.setProperty("--invader-ship-x", `${shipX}%`);
  }, [shipX]);

  function pointerMove(event: MouseEvent<HTMLDivElement>) {
    if (!active) {
      return;
    }

    const x = (event.clientX / window.innerWidth) * 100;
    setShipX(Math.min(92, Math.max(8, x)));
  }

  function pointerFire() {
    if (!active) {
      return;
    }

    const id = shotIdRef.current;
    shotIdRef.current += 1;
    setShots((current) => [...current, { id, x: shipX }]);
    setHits((current) => Math.min(current + 1, 5));

    window.setTimeout(() => {
      setShots((current) => current.filter((shot) => shot.id !== id));
    }, 780);
  }

  function handleToggle() {
    if (active) {
      setHits(0);
      setShots([]);
      setShipX(50);
    }

    onToggle();
  }

  return (
    <>
      {active ? (
        <div
          aria-hidden="true"
          className="invader-overlay"
          onClick={pointerFire}
          onMouseMove={pointerMove}
        >
          {shots.map((shot) => (
            <div className="invader-shot" key={shot.id} style={{ left: `${shot.x}%` }} />
          ))}
          <div className="invader-ship">{"/^\\"}</div>
          <div className="invader-status">A/D or arrows move | Space shoots | Hits {hits}/5</div>
        </div>
      ) : null}
      {/* the launch path is the command menu (an easter egg, not site chrome);
          the button only appears once the game is running, to exit it */}
      {active ? (
        <button aria-pressed={active} className="invader-button" onClick={handleToggle} type="button">
          <RotateCcw size={18} />
          <span>Restore site</span>
        </button>
      ) : null}
    </>
  );
}
