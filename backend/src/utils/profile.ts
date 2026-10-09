const PROFILE_FIELDS = ['name', 'firstName', 'lastName', 'phone'] as const;

/** Whitelist self-editable profile fields (blocks role / password / token mass assignment). */
export const pickProfileUpdate = (data: Record<string, unknown> | undefined) => {
    const out: Record<string, string> = {};
    for (const key of PROFILE_FIELDS) {
        const v = data?.[key];
        if (typeof v === 'string') out[key] = v.trim().slice(0, 100);
    }
    return out;
};
