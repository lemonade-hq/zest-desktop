/**
 * Zest: renderer side of API Spec sources (see bruno-electron/src/ipc/zest-api-specs.js).
 */
import toast from 'react-hot-toast';

const activeWorkspacePath = (getState) => {
  const state = getState();
  const workspace = state.workspaces.workspaces.find((w) => w.uid === state.workspaces.activeWorkspaceUid);
  return workspace?.pathname || null;
};

/** Text for the sidebar "stale" pill tooltip, or null when the spec is up to date. */
export const describeApiSpecStaleness = ({ stale, syncState } = {}) => {
  if (!stale) return null;
  const parts = [];
  if (syncState?.contentFrom === 'snapshot') parts.push('Showing the bundled offline copy of this spec.');
  if (syncState?.error) parts.push(`Last sync failed: ${syncState.error}.`);
  if (syncState?.lastSuccessAt) parts.push(`Last synced ${new Date(syncState.lastSuccessAt).toLocaleString()}.`);
  return parts.length ? parts.join(' ') : 'This spec could not be synced from its source.';
};

/** Re-fetches the spec from its source URL, applying its path filter. */
export const syncApiSpecFromSource = (apiSpec) => async (dispatch, getState) => {
  const workspacePath = activeWorkspacePath(getState);
  const toastId = toast.loading(`Syncing ${apiSpec.name}…`);
  try {
    const result = await window.ipcRenderer.invoke('renderer:sync-api-spec', apiSpec.pathname, workspacePath);
    if (result?.ok) {
      toast.success(result.changed ? `${apiSpec.name} updated` : `${apiSpec.name} is up to date`, { id: toastId });
    } else {
      toast.error(result?.error || `Could not sync ${apiSpec.name}`, { id: toastId });
    }
    return result;
  } catch (err) {
    toast.error(err?.message || `Could not sync ${apiSpec.name}`, { id: toastId });
    return { ok: false, error: err?.message };
  }
};

/** Remembers the URL a spec was created from, so "Sync from source" works for it. Never throws. */
export const recordApiSpecSource = ({ pathname, url, workspacePath = null }) => async (dispatch, getState) => {
  if (!url || !window.ipcRenderer?.invoke) return;
  try {
    await window.ipcRenderer.invoke('renderer:set-api-spec-source', pathname, workspacePath || activeWorkspacePath(getState), { url });
  } catch (err) {
    console.warn('Could not record the API spec source URL', err);
  }
};
