import { ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useSelectableListHotKeys } from '@/ui/layout/selectable-list/hooks/internal/useSelectableListHotKeys';
import { useSelectableList } from '@/ui/layout/selectable-list/hooks/useSelectableList';
import { SelectableListScope } from '@/ui/layout/selectable-list/scopes/SelectableListScope';
import { arrayToChunks } from '~/utils/array/array-to-chunks';

type SelectableListProps = {
  children: ReactNode;
  selectableListId: string;
  selectableItemIdArray?: string[];
  selectableItemIdMatrix?: string[][];
  onSelect?: (selected: string) => void;
  hotkeyScope: string;
  onEnter?: (itemId: string) => void;
};

export const SelectableList = ({
  children,
  selectableListId,
  hotkeyScope,
  selectableItemIdArray,
  selectableItemIdMatrix,
  onEnter,
}: SelectableListProps) => {
  const { t } = useTranslation();
  useSelectableListHotKeys(selectableListId, hotkeyScope);

  const { setSelectableItemIds, setSelectableListOnEnter } =
    useSelectableList(selectableListId);

  useEffect(() => {
    setSelectableListOnEnter(() => onEnter);
  }, [onEnter, setSelectableListOnEnter]);

  useEffect(() => {
    if (!selectableItemIdArray && !selectableItemIdMatrix) {
      throw new Error(t('ui.layout.selectableList.error'));
    }

    if (selectableItemIdMatrix) {
      setSelectableItemIds(selectableItemIdMatrix);
    }

    if (selectableItemIdArray) {
      setSelectableItemIds(arrayToChunks(selectableItemIdArray, 1));
    }
  }, [selectableItemIdArray, selectableItemIdMatrix, setSelectableItemIds, t]);

  return (
    <SelectableListScope selectableListScopeId={selectableListId}>
      {children}
    </SelectableListScope>
  );
};
