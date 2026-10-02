// The car's centre screen opened full size, so the rider can read and use it.
import { useEffect } from "react";
import { CabinScreen } from "../cabin/CabinScreen";
import { CabinDisplayProvider } from "../cabin/display";
import { ScaledFrame } from "../shared";
import { DASH_SCREEN } from "./Interior";

export function ScreenModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="screen-modal" role="dialog" aria-modal="true" aria-label="Car screen" onClick={onClose}>
      <div className="screen-modal-panel" onClick={(e) => e.stopPropagation()}>
        <ScaledFrame width={DASH_SCREEN.designWidth} height={DASH_SCREEN.designHeight}>
          <CabinDisplayProvider value={{ surface: "dashboard (opened)", quality: "high" }}>
            <CabinScreen />
          </CabinDisplayProvider>
        </ScaledFrame>
        <button className="screen-modal-close" onClick={onClose} aria-label="Close screen">
          ×
        </button>
      </div>
    </div>
  );
}
