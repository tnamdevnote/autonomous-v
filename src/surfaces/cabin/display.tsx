// Where a cabin screen is being shown. The same variant renders on the 3D dashboard
// (a small, non-interactive glance), in the tap-to-open modal, and on a real tablet
// (/cabin). Rider actions are logged with `surface` so you can tell them apart.

import { createContext, useContext } from "react";

export interface CabinDisplay {
  /** Logged with every rider action from this screen. */
  surface: string;
  /** "low" renders the 3D view at reduced resolution (the dashboard glance). */
  quality: "low" | "high";
}

const CabinDisplayContext = createContext<CabinDisplay>({ surface: "cabin", quality: "high" });

export const CabinDisplayProvider = CabinDisplayContext.Provider;

export function useCabinDisplay(): CabinDisplay {
  return useContext(CabinDisplayContext);
}
