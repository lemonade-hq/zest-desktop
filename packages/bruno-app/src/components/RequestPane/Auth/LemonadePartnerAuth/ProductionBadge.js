import React, { useMemo } from 'react';
import StatusBadge from 'ui/StatusBadge/index';
import { getAllVariables } from 'utils/collections';
import { getLemonadePartnerConfig, resolvePartnerEnv } from 'utils/zest/partner-env';

/** Red "production" badge for the auth mode selectors. Renders nothing unless the resolved env is production. */
const ProductionBadge = ({ authMode, auth, collection, item }) => {
  const rawEnv = getLemonadePartnerConfig(auth).env;
  const variables = useMemo(() => (authMode === 'lemonade-partner' ? getAllVariables(collection, item) : {}), [authMode, collection, item]);

  if (authMode !== 'lemonade-partner') return null;
  if (resolvePartnerEnv(rawEnv, variables) !== 'production') return null;

  return (
    <span className="ml-2" data-testid="lemonade-partner-production-badge">
      <StatusBadge status="danger" variant="filled" size="xs">production</StatusBadge>
    </span>
  );
};

export default ProductionBadge;
