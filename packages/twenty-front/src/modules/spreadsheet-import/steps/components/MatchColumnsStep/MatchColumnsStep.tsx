import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from '@emotion/styled';

import { ContinueButton } from '@/spreadsheet-import/components/ContinueButton';
import { Heading } from '@/spreadsheet-import/components/Heading';
import { useSpreadsheetImportInternal } from '@/spreadsheet-import/hooks/useSpreadsheetImportInternal';
import { Field, RawData } from '@/spreadsheet-import/types';
import { findUnmatchedRequiredFields } from '@/spreadsheet-import/utils/findUnmatchedRequiredFields';
import { getMatchedColumns } from '@/spreadsheet-import/utils/getMatchedColumns';
import { normalizeTableData } from '@/spreadsheet-import/utils/normalizeTableData';
import { setColumn } from '@/spreadsheet-import/utils/setColumn';
import { setIgnoreColumn } from '@/spreadsheet-import/utils/setIgnoreColumn';
import { setSubColumn } from '@/spreadsheet-import/utils/setSubColumn';
import { useDialogManager } from '@/ui/feedback/dialog-manager/hooks/useDialogManager';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { Modal } from '@/ui/layout/modal/components/Modal';

import { ColumnGrid } from './components/ColumnGrid';
import { TemplateColumn } from './components/TemplateColumn';
import { UserTableColumn } from './components/UserTableColumn';

const StyledContent = styled(Modal.Content)`
  align-items: center;
  padding-left: ${({ theme }) => theme.spacing(6)};
  padding-right: ${({ theme }) => theme.spacing(6)};
`;

const StyledColumnsContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  margin-bottom: ${({ theme }) => theme.spacing(4)};
`;

const StyledColumns = styled.span`
  color: ${({ theme }) => theme.font.color.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
`;

const StyledColumn = styled.span`
  color: ${({ theme }) => theme.font.color.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.regular};
`;

export type MatchColumnsStepProps<T extends string> = {
  data: RawData[];
  headerValues: RawData;
  onContinue: (data: any[], rawData: RawData[], columns: Columns<T>) => void;
};

export enum ColumnType {
  empty,
  ignored,
  matched,
  matchedCheckbox,
  matchedSelect,
  matchedSelectOptions,
}

export type MatchedOptions<T> = {
  entry: string;
  value: T;
};

type EmptyColumn = { type: ColumnType.empty; index: number; header: string };
type IgnoredColumn = {
  type: ColumnType.ignored;
  index: number;
  header: string;
};
type MatchedColumn<T> = {
  type: ColumnType.matched;
  index: number;
  header: string;
  value: T;
};
type MatchedSwitchColumn<T> = {
  type: ColumnType.matchedCheckbox;
  index: number;
  header: string;
  value: T;
};
export type MatchedSelectColumn<T> = {
  type: ColumnType.matchedSelect;
  index: number;
  header: string;
  value: T;
  matchedOptions: Partial<MatchedOptions<T>>[];
};
export type MatchedSelectOptionsColumn<T> = {
  type: ColumnType.matchedSelectOptions;
  index: number;
  header: string;
  value: T;
  matchedOptions: MatchedOptions<T>[];
};

export type Column<T extends string> =
  | EmptyColumn
  | IgnoredColumn
  | MatchedColumn<T>
  | MatchedSwitchColumn<T>
  | MatchedSelectColumn<T>
  | MatchedSelectOptionsColumn<T>;

export type Columns<T extends string> = Column<T>[];

export const MatchColumnsStep = <T extends string>({
  data,
  headerValues,
  onContinue,
}: MatchColumnsStepProps<T>) => {
  const { t } = useTranslation();
  const { enqueueDialog } = useDialogManager();
  const { enqueueSnackBar } = useSnackBar();
  const dataExample = data.slice(0, 2);
  const { fields, autoMapHeaders, autoMapDistance } =
    useSpreadsheetImportInternal<T>();
  const [isLoading, setIsLoading] = useState(false);
  const [columns, setColumns] = useState<Columns<T>>(
    // Do not remove spread, it indexes empty array elements, otherwise map() skips over them
    ([...headerValues] as string[]).map((value, index) => ({
      type: ColumnType.empty,
      index,
      header: value ?? '',
    })),
  );
  const onIgnore = useCallback(
    (columnIndex: number) => {
      setColumns(
        columns.map((column, index) =>
          columnIndex === index ? setIgnoreColumn<T>(column) : column,
        ),
      );
    },
    [columns, setColumns],
  );

  const onRevertIgnore = useCallback(
    (columnIndex: number) => {
      setColumns(
        columns.map((column, index) =>
          columnIndex === index ? setColumn(column) : column,
        ),
      );
    },
    [columns, setColumns],
  );

  const onChange = useCallback(
    (value: T, columnIndex: number) => {
      if (value === 'do-not-import') {
        if (columns[columnIndex].type === ColumnType.ignored) {
          onRevertIgnore(columnIndex);
        } else {
          onIgnore(columnIndex);
        }
      } else {
        const field = fields.find(
          (field) => field.key === value,
        ) as unknown as Field<T>;
        const existingFieldIndex = columns.findIndex(
          (column) => 'value' in column && column.value === field.key,
        );
        setColumns(
          columns.map<Column<T>>((column, index) => {
            if (columnIndex === index) {
              return setColumn(column, field, data);
            } else if (index === existingFieldIndex) {
              enqueueSnackBar(
                t('modules.spreadsheetimport.matchColumnsStep.cannotduplicate'),
                {
                  title: t(
                    'modules.spreadsheetimport.matchColumnsStep.columnunselected',
                  ),
                  variant: 'error',
                },
              );
              return setColumn(column);
            } else {
              return column;
            }
          }),
        );
      }
    },
    [columns, onRevertIgnore, onIgnore, fields, data, enqueueSnackBar, t],
  );

  const onSubChange = useCallback(
    (value: string, columnIndex: number, entry: string) => {
      setColumns(
        columns.map((column, index) =>
          columnIndex === index && 'matchedOptions' in column
            ? setSubColumn(column, entry, value)
            : column,
        ),
      );
    },
    [columns, setColumns],
  );
  const unmatchedRequiredFields = useMemo(
    () => findUnmatchedRequiredFields(fields, columns),
    [fields, columns],
  );

  const handleAlertOnContinue = useCallback(async () => {
    setIsLoading(true);
    await onContinue(normalizeTableData(columns, data, fields), data, columns);
    setIsLoading(false);
  }, [onContinue, columns, data, fields]);

  const handleOnContinue = useCallback(async () => {
    if (unmatchedRequiredFields.length > 0) {
      enqueueDialog({
        title: t('modules.spreadsheetimport.matchColumnsStep.notallmatched'),
        message: t(
          'modules.spreadsheetimport.matchColumnsStep.notallmatchedMessage',
        ),
        children: (
          <StyledColumnsContainer>
            <StyledColumns>Columns not matched:</StyledColumns>
            {unmatchedRequiredFields.map((field) => (
              <StyledColumn key={field}>{field}</StyledColumn>
            ))}
          </StyledColumnsContainer>
        ),
        buttons: [
          { title: t('modules.spreadsheetimport.matchColumnsStep.cancel') },
          {
            title: t('modules.spreadsheetimport.matchColumnsStep.continue'),
            onClick: handleAlertOnContinue,
            variant: 'primary',
            role: 'confirm',
          },
        ],
      });
    } else {
      setIsLoading(true);
      await onContinue(
        normalizeTableData(columns, data, fields),
        data,
        columns,
      );
      setIsLoading(false);
    }
  }, [
    unmatchedRequiredFields,
    enqueueDialog,
    handleAlertOnContinue,
    onContinue,
    columns,
    data,
    fields,
    t,
  ]);

  useEffect(() => {
    if (autoMapHeaders) {
      setColumns(getMatchedColumns(columns, fields, data, autoMapDistance));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <StyledContent>
        <Heading
          title={t('modules.spreadsheetimport.matchColumnsStep.matchcolumns')}
          description={t(
            'modules.spreadsheetimport.matchColumnsStep.matchcolumnsDescription',
          )}
        />
        <ColumnGrid
          columns={columns}
          renderUserColumn={(columns, columnIndex) => (
            <UserTableColumn
              column={columns[columnIndex]}
              entries={dataExample.map(
                (row) => row[columns[columnIndex].index],
              )}
            />
          )}
          renderTemplateColumn={(columns, columnIndex) => (
            <TemplateColumn
              columns={columns}
              columnIndex={columnIndex}
              onChange={onChange}
              onSubChange={onSubChange}
            />
          )}
        />
      </StyledContent>
      <ContinueButton
        isLoading={isLoading}
        onContinue={handleOnContinue}
        title={t('modules.spreadsheetimport.matchColumnsStep.next')}
      />
    </>
  );
};
