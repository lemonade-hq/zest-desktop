import React from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { updateCollectionAuth } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { LemonadePartnerFields } from 'components/RequestPane/Auth/LemonadePartnerAuth';

const LemonadePartnerAuth = ({ collection }) => {
  const dispatch = useDispatch();
  const auth = collection.draft?.root ? get(collection, 'draft.root.request.auth', {}) : get(collection, 'root.request.auth', {});

  return (
    <LemonadePartnerFields
      auth={auth}
      collection={collection}
      onSave={() => dispatch(saveCollectionSettings(collection.uid))}
      onChange={(content) => dispatch(updateCollectionAuth({ mode: 'lemonade-partner', collectionUid: collection.uid, content }))}
    />
  );
};

export default LemonadePartnerAuth;
