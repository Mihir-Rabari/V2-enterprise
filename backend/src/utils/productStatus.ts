/**
 * The Product schema allows 'ACTIVE' | 'INACTIVE' | 'Active' | 'Inactive'. Every public
 * visibility and purchasability check must treat all casings of "active" the same way.
 */
export const isActiveStatus = (status: unknown): boolean =>
    typeof status === 'string' && status.toUpperCase() === 'ACTIVE';

/** Mongo filter matching any casing of ACTIVE (anchored; no user input is interpolated). */
export const ACTIVE_STATUS_FILTER = { $regex: /^active$/i };
