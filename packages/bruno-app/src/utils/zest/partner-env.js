/**
 * Zest: helpers for the Lemonade Partner auth form.
 */
import { interpolate } from '@usebruno/common';
import { LEMONADE_PARTNER_DEFAULTS, LEMONADE_PARTNER_ENVIRONMENTS } from 'utils/common/constants';

/** The stored config, with the defaults for anything missing. */
export const getLemonadePartnerConfig = (auth) => ({
  env: auth?.lemonadePartner?.env ?? LEMONADE_PARTNER_DEFAULTS.env,
  partnerPublicId: auth?.lemonadePartner?.partnerPublicId ?? LEMONADE_PARTNER_DEFAULTS.partnerPublicId
});

/** "{{env}}" with the active environment applied, trimmed. Returns '' when it cannot be resolved. */
export const resolvePartnerEnv = (rawEnv, variables = {}) => {
  let resolved = rawEnv;
  try {
    resolved = interpolate(rawEnv ?? '', variables);
  } catch (e) {
    return '';
  }
  return String(resolved ?? '').trim();
};

export const isKnownPartnerEnv = (env) => LEMONADE_PARTNER_ENVIRONMENTS.includes(env);

/** Case-insensitive match on name, code or public id. */
export const filterPartners = (partners = [], query = '') => {
  const q = query.trim().toLowerCase();
  if (!q) return partners;
  return partners.filter((p) =>
    [p.name, p.code, p.publicId].some((field) => String(field ?? '').toLowerCase().includes(q))
  );
};
