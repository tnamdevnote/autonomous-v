import { useSim } from "../../engine";
import { getVariant } from "./registry";

/** The 1280×800 cabin screen, showing whichever variant the facilitator picked. */
export function CabinScreen() {
  const { variantId } = useSim();
  const variant = getVariant(variantId);
  if (!variant) return <div className="waiting">Unknown cabin variant “{variantId}”.</div>;
  return (
    <div className="cabin-screen">
      <variant.Component />
    </div>
  );
}
