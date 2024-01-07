// @ts-expect-error // Todo: remove usage of react-data-grid
import { Column, FormatterProps, useRowSelection } from 'react-data-grid';
import { useTranslation } from 'react-i18next';

import { RawData } from '@/spreadsheet-import/types';
import { Radio } from '@/ui/input/components/Radio';

const SELECT_COLUMN_KEY = 'select-row';

type SelectFormatterProps = FormatterProps<unknown>;

const SelectFormatter = (props: SelectFormatterProps) => {
  const { t } = useTranslation();
  const [isRowSelected, onRowSelectionChange] = useRowSelection();

  return (
    <Radio
      aria-label={t('modules.spreadsheetimport.selectHeaderStep.selectColumn')}
      checked={isRowSelected}
      onChange={(event) => {
        onRowSelectionChange({
          row: props.row,
          checked: Boolean(event.target.checked),
          isShiftClick: (event.nativeEvent as MouseEvent).shiftKey,
        });
      }}
    />
  );
};

export const SelectColumn: Column<any, any> = {
  key: SELECT_COLUMN_KEY,
  name: '',
  width: 35,
  minWidth: 35,
  maxWidth: 35,
  resizable: false,
  sortable: false,
  frozen: true,
  cellClass: 'rdg-radio',
  formatter: SelectFormatter,
};

export const generateSelectionColumns = (data: RawData[]) => {
  const longestRowLength = data.reduce(
    (acc, curr) => (acc > curr.length ? acc : curr.length),
    0,
  );
  return [
    SelectColumn,
    ...Array.from(Array(longestRowLength), (_, index) => ({
      key: index.toString(),
      name: '',
    })),
  ];
};
