import raw from "./conditions.json";

export type SurfaceId = keyof typeof raw.surfaces;
export type FacilityId = keyof typeof raw.facilities;

export type ConditionGroup = {
  id: string;
  icon: string;
  name: string;
  short: string;
  required_surfaces: SurfaceId[];
  blacklisted_surfaces: SurfaceId[];
  required_facilities: FacilityId[];
  why: string;
};

export type Condition = {
  id: string;
  group: string;
  name_vi: string;
  name_en: string;
  sign: string;
  note?: string;
};

export const DISCLAIMER = raw.disclaimer;
export const SURFACE_LABELS = raw.surfaces as Record<SurfaceId, string>;
export const FACILITY_LABELS = raw.facilities as Record<FacilityId, string>;
export const GROUPS = raw.groups as ConditionGroup[];
export const CONDITIONS = raw.conditions as Condition[];
export const conditionById = new Map(CONDITIONS.map((c) => [c.id, c]));
export const groupById = new Map(GROUPS.map((g) => [g.id, g]));
