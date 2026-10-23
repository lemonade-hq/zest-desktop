import React, { useMemo } from 'react';
import StatusBadge from 'ui/StatusBadge/index';
import { getAllVariables } from 'utils/collections';
import { getEffectiveAuthSource } from 'utils/auth';
import { getLemonadePartnerConfig, resolvePartnerEnv } from 'utils/zest/partner-env';

/** Red "production" badge for the auth mode selectors. Renders nothing unless the resolved env is production. */
const ProductionBadge = ({ authMode, auth, collection, item }) => {
  // An inheriting request or folder shows the badge of the auth it inherits.
  const effectiveAuth = authMode === 'inherit' ? getEffectiveAuthSource(collection, item)?.auth : auth;
  const effectiveMode = authMode === 'inherit' ? effectiveAuth?.mode : authMode;
  const rawEnv = getLemonadePartnerConfig(effectiveAuth).env;
  const variables = useMemo(() => (effectiveMode === 'lemonade-partner' ? getAllVariables(collection, item) : {}), [effectiveMode, collection, item]);

  if (effectiveMode !== 'lemonade-partner') return null;
  if (resolvePartnerEnv(rawEnv, variables) !== 'production') return null;

  return (
    <span className="ml-2" data-testid="lemonade-partner-production-badge">
      <StatusBadge status="danger" variant="filled" size="xs">production</StatusBadge>
    </span>
  );
};

export default ProductionBadge;
