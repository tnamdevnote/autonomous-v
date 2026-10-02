// Finds every cabin variant automatically:
//   - coded variants: src/surfaces/cabin/variants/<id>.tsx
//   - Figma designs:  src/designs/<folder>/design.ts  (id "figma-<folder>")
import type { ComponentType } from "react";
import { FigmaScreen, type Design } from "./figma";

export interface VariantInfo {
  id: string;
  name: string;
  description?: string;
  Component: ComponentType;
}

interface VariantModule {
  default: ComponentType;
  meta?: { name: string; description?: string };
}

const coded = import.meta.glob<VariantModule>("./variants/*.tsx", { eager: true });
const designs = import.meta.glob<{ default: Design }>("../../designs/*/design.ts", { eager: true });

export const variants: VariantInfo[] = [
  ...Object.entries(coded).map(([path, mod]) => {
    const id = path.split("/").pop()!.replace(/\.tsx$/, "");
    return { id, name: mod.meta?.name ?? id, description: mod.meta?.description, Component: mod.default };
  }),
  ...Object.entries(designs).map(([path, mod]) => {
    const id = `figma-${path.split("/").at(-2)}`;
    const design = mod.default;
    return { id, name: `Figma: ${design.name}`, description: design.description, Component: () => <FigmaScreen design={design} /> };
  }),
].sort((a, b) => (a.id === "baseline" ? -1 : b.id === "baseline" ? 1 : a.id.localeCompare(b.id)));

export const variantIds = variants.map((v) => v.id);

export function getVariant(id: string): VariantInfo | undefined {
  return variants.find((v) => v.id === id);
}
