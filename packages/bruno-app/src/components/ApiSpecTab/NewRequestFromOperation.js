/**
 * Zest: pick the collection for "New request" on an API Spec operation, then open it as an unsaved request.
 * With no collection in the workspace, the request opens in the workspace scratch collection.
 */
import React from 'react';
import { IconFiles } from '@tabler/icons';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Modal from 'components/Modal/index';
import StyledWrapper from 'components/Sidebar/Collections/SelectCollection/StyledWrapper';
import { getWorkspaceCollections } from 'utils/collections';
import { newRequestFromOperation } from 'utils/zest/new-request-from-operation';

export const useNewRequestFromOperation = ({ spec, source }) => {
  const dispatch = useDispatch();
  const collections = useSelector((state) => state.collections.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid) || null;
  const workspaceCollections = getWorkspaceCollections({ collections, workspaces, activeWorkspace });
  const [pending, setPending] = React.useState(null);

  const create = React.useCallback((collectionUid, operation) => {
    setPending(null);
    dispatch(newRequestFromOperation({ collectionUid, spec, source, ...operation }))
      .catch((err) => toast.error(err?.message || 'Could not create the request'));
  }, [dispatch, spec, source]);

  const start = React.useCallback((method, path) => {
    if (!spec) return;
    if (workspaceCollections.length === 0) {
      if (!activeWorkspace?.scratchCollectionUid) {
        toast.error('Open a collection in this workspace to create a request');
        return;
      }
      create(activeWorkspace.scratchCollectionUid, { method, path });
      return;
    }
    if (workspaceCollections.length === 1) {
      create(workspaceCollections[0].uid, { method, path });
      return;
    }
    setPending({ method, path });
  }, [spec, workspaceCollections, activeWorkspace, create]);

  const modal = pending ? (
    <StyledWrapper>
      <Modal size="sm" title={`New request: ${String(pending.method).toUpperCase()} ${pending.path}`} hideFooter={true} handleCancel={() => setPending(null)}>
        <ul className="mb-2">
          {workspaceCollections.map((c) => (
            <div className="collection" key={c.uid} onClick={() => create(c.uid, pending)}>
              <IconFiles size={18} strokeWidth={1.5} /> <span className="ml-2">{c.name}</span>
            </div>
          ))}
        </ul>
      </Modal>
    </StyledWrapper>
  ) : null;

  return { start, modal };
};
