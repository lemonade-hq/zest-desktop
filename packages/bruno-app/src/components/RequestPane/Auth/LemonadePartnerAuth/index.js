import React, { useCallback, useEffect, useMemo, useState } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { IconCaretDown } from '@tabler/icons';
import SingleLineEditor from 'components/SingleLineEditor';
import { useTheme } from 'providers/Theme';
import { sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { getAllVariables } from 'utils/collections';
import { LEMONADE_PARTNER_ENVIRONMENTS } from 'utils/common/constants';
import {
  filterPartners,
  getLemonadePartnerConfig,
  isKnownPartnerEnv,
  resolvePartnerEnv
} from 'utils/zest/partner-env';
import StyledWrapper from './StyledWrapper';

const listPartners = (env) => window.ipcRenderer.invoke('renderer:zest-list-partners', env);

/**
 * Partner combobox: a single-line editor (free text or {{var}}) plus a filterable list of the
 * partners of the resolved environment, loaded on demand over IPC.
 */
const PartnerPicker = ({ value, resolvedEnv, onChange, onSave, onRun, collection, item }) => {
  const { storedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ env: null, partners: null, error: null, loading: false });

  const envIsKnown = isKnownPartnerEnv(resolvedEnv);

  const load = useCallback(() => {
    if (!envIsKnown) return;
    setState({ env: resolvedEnv, partners: null, error: null, loading: true });
    listPartners(resolvedEnv)
      .then((partners) => setState({ env: resolvedEnv, partners, error: null, loading: false }))
      .catch((err) =>
        setState({ env: resolvedEnv, partners: null, error: String(err?.message || err).replace(/^Error invoking remote method '[^']*': (Error: )?/, ''), loading: false })
      );
  }, [envIsKnown, resolvedEnv]);

  // Load when the list is opened, and again when the environment changes under an open list.
  useEffect(() => {
    if (open && envIsKnown && state.env !== resolvedEnv) load();
  }, [open, envIsKnown, resolvedEnv, state.env, load]);

  const partners = state.env === resolvedEnv ? state.partners : null;
  const visible = useMemo(() => filterPartners(partners || [], query), [partners, query]);
  const selected = (partners || []).find((p) => p.publicId === value);

  const pick = (partner) => {
    onChange(partner.publicId);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="partner-picker">
      <div className="flex items-center gap-1">
        <div className="single-line-editor-wrapper flex-1" data-testid="lemonade-partner-id">
          <SingleLineEditor
            value={value}
            theme={storedTheme}
            onSave={onSave}
            onChange={onChange}
            onRun={onRun}
            collection={collection}
            item={item}
            isCompact
          />
        </div>
        <button
          type="button"
          className="px-2 py-1"
          title="Choose a partner"
          aria-label="Choose a partner"
          data-testid="lemonade-partner-browse"
          onClick={() => setOpen((o) => !o)}
        >
          <IconCaretDown size={14} strokeWidth={2} />
        </button>
      </div>
      {selected && <div className="partner-hint" data-testid="lemonade-partner-selected">{selected.name} ({selected.code})</div>}
      {open && (
        <div className="partner-panel" data-testid="lemonade-partner-panel">
          <input
            className="partner-filter"
            placeholder="Filter by name, code or id"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            data-testid="lemonade-partner-filter"
          />
          {!envIsKnown && (
            <div className="partner-hint">
              {resolvedEnv ? `"${resolvedEnv}" is not a Lemonade environment.` : 'Select an environment to list partners.'}
            </div>
          )}
          {envIsKnown && state.loading && <div className="partner-hint">Loading partners…</div>}
          {envIsKnown && state.error && <div className="partner-error" data-testid="lemonade-partner-error">{state.error}</div>}
          {envIsKnown && partners && visible.length === 0 && <div className="partner-hint">No partners match.</div>}
          <div className="partner-list">
            {visible.map((partner) => (
              <button
                type="button"
                key={partner.publicId}
                className="partner-option"
                onClick={() => pick(partner)}
              >
                <span>{partner.name}</span>
                <span className="partner-meta">{partner.code} · {partner.publicId}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * The Lemonade Partner form, independent of where the auth is stored.
 * `onChange` receives the complete { env, partnerPublicId } object.
 */
export const LemonadePartnerFields = ({ auth, onChange, onSave, onRun, collection, item }) => {
  const { storedTheme } = useTheme();
  const config = getLemonadePartnerConfig(auth);
  const variables = useMemo(() => getAllVariables(collection, item), [collection, item]);
  const resolvedEnv = resolvePartnerEnv(config.env, variables);
  const selectValue = LEMONADE_PARTNER_ENVIRONMENTS.includes(config.env) ? config.env : '__custom__';

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block mb-1">Environment</label>
      <div className="mb-3">
        <select
          className="env-select mb-1"
          value={selectValue}
          data-testid="lemonade-partner-env"
          onChange={(e) => {
            // "Variable…" starts from the {{env}} template; the editor below then takes over.
            onChange({ ...config, env: e.target.value === '__custom__' ? '{{env}}' : e.target.value });
          }}
        >
          {LEMONADE_PARTNER_ENVIRONMENTS.map((env) => (
            <option key={env} value={env}>{env}</option>
          ))}
          <option value="__custom__">Variable…</option>
        </select>
        {selectValue === '__custom__' && (
          <div className="single-line-editor-wrapper" data-testid="lemonade-partner-env-var">
            <SingleLineEditor
              value={config.env}
              theme={storedTheme}
              onSave={onSave}
              onChange={(env) => onChange({ ...config, env: env || '' })}
              onRun={onRun}
              collection={collection}
              item={item}
              isCompact
            />
          </div>
        )}
      </div>

      <label className="block mb-1">Partner</label>
      <PartnerPicker
        value={config.partnerPublicId}
        resolvedEnv={resolvedEnv}
        onChange={(partnerPublicId) => onChange({ ...config, partnerPublicId: partnerPublicId || '' })}
        onSave={onSave}
        onRun={onRun}
        collection={collection}
        item={item}
      />
    </StyledWrapper>
  );
};

/** Request and folder level (the folder passes itself as `item`, like the other auth forms). */
const LemonadePartnerAuth = ({ item, collection, updateAuth, request, save }) => {
  const dispatch = useDispatch();
  const auth = get(request, 'auth', {});

  return (
    <LemonadePartnerFields
      auth={auth}
      collection={collection}
      item={item}
      onSave={save}
      onRun={() => dispatch(sendRequest(item, collection.uid))}
      onChange={(content) => dispatch(updateAuth({ mode: 'lemonade-partner', collectionUid: collection.uid, itemUid: item.uid, content }))}
    />
  );
};

export default LemonadePartnerAuth;
