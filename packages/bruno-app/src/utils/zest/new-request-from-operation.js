/**
 * Zest: "New request" on an API Spec operation (Swagger preview button).
 */
import { newHttpRequest, mountCollection } from 'providers/ReduxStore/slices/collections/actions';
import { sanitizeName } from 'utils/common/regex';
import { buildRequestFromOperation, uniqueTransientRequestName } from './request-from-operation';

/**
 * Opens the operation as an unsaved (transient) request in the collection; saving it asks where to put it.
 */
export const newRequestFromOperation = ({ collectionUid, spec, method, path, source }) => async (dispatch, getState) => {
  const request = buildRequestFromOperation({ spec, method, path, source });

  let collection = getState().collections.collections.find((c) => c.uid === collectionUid);
  if (!collection) throw new Error('Collection not found');
  if (!getState().collections.tempDirectories?.[collectionUid]) {
    await dispatch(mountCollection({
      collectionUid,
      collectionPathname: collection.pathname,
      brunoConfig: collection.brunoConfig
    }));
    collection = getState().collections.collections.find((c) => c.uid === collectionUid);
  }

  const requestName = uniqueTransientRequestName(collection, request.name || `${request.method} ${path}`);
  return dispatch(newHttpRequest({
    requestName,
    filename: sanitizeName(requestName),
    requestType: 'http-request',
    requestUrl: request.url,
    requestMethod: request.method,
    collectionUid,
    itemUid: null,
    isTransient: true,
    headers: request.headers,
    params: request.params,
    body: request.body,
    auth: request.auth
  }));
};
