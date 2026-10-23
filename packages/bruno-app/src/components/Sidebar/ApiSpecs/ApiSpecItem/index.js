import { openApiSpecTab } from 'providers/ReduxStore/slices/apiSpec';
import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';
import { IconDots, IconRefresh, IconX } from '@tabler/icons';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CloseApiSpec from '../CloseApiSpec/index';
import { isApiSpecTabForPathname } from 'utils/api-specs';
import { describeApiSpecStaleness, syncApiSpecFromSource } from 'utils/zest/api-spec-source';

const ApiSpecItem = ({ apiSpec }) => {
  const dispatch = useDispatch();
  const { dropdownContainerRef } = useSidebarAccordion();

  const isActive = useSelector((state) => {
    const activeTab = state.tabs.tabs.find((tab) => tab.uid === state.tabs.activeTabUid);
    return isApiSpecTabForPathname(activeTab, apiSpec?.pathname);
  });

  const [closeApiSpecModal, setCloseApiSpecModal] = useState(false);
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);

  const openApiSpec = () => {
    dispatch(openApiSpecTab(apiSpec));
  };

  const handleRowKeyDown = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    openApiSpec();
  };

  const staleMessage = describeApiSpecStaleness(apiSpec);

  const menuItems = [
    ...(apiSpec?.source?.url
      ? [{
          id: 'sync-from-source',
          leftSection: IconRefresh,
          label: 'Sync from source',
          onClick: () => dispatch(syncApiSpecFromSource(apiSpec))
        }]
      : []),
    {
      id: 'remove',
      leftSection: IconX,
      label: 'Remove',
      onClick: () => setCloseApiSpecModal(true)
    }
  ];

  return (
    <>
      {closeApiSpecModal && <CloseApiSpec apiSpec={apiSpec} onClose={() => setCloseApiSpecModal(false)} />}
      <div
        className={`flex flex-grow api-spec-item items-center overflow-hidden w-full justify-between ${
          isActive && !isKeyboardFocused ? 'active' : ''
        } ${isKeyboardFocused ? 'api-spec-keyboard-focused' : ''}`}
        tabIndex={0}
        data-testid="sidebar-api-spec-row"
        data-selected={isActive ? 'true' : undefined}
        onFocus={() => setIsKeyboardFocused(true)}
        onBlur={() => setIsKeyboardFocused(false)}
        onKeyDown={handleRowKeyDown}
      >
        <div
          className="cursor-pointer flex items-center flex-grow w-[80%] pl-3 justify-between"
          onClick={openApiSpec}
        >
          <span className="flex-nowrap whitespace-nowrap overflow-ellipsis overflow-hidden w-full">
            {apiSpec?.name}
          </span>
          {staleMessage && (
            <span className="api-spec-stale-pill ml-1 mr-1 flex-shrink-0" title={staleMessage} data-testid="api-spec-stale-pill">
              stale
            </span>
          )}
        </div>
        <div className="pr-2">
          <MenuDropdown
            items={menuItems}
            placement="bottom-start"
            appendTo={dropdownContainerRef?.current || document.body}
            popperOptions={{ strategy: 'fixed' }}
            data-testid="api-spec-actions"
          >
            <ActionIcon className="apispec-row-actions">
              <IconDots size={18} />
            </ActionIcon>
          </MenuDropdown>
        </div>
      </div>
    </>
  );
};

export default ApiSpecItem;
