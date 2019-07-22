/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiFormRow } from '@elastic/eui';
import { Query } from '../../../../../../../src/legacy/core_plugins/data/public/query';
import { FilterRatioIndexPatternColumn, IndexPatternColumn } from '../indexpattern';
import { DimensionPriority } from '../../types';
import { OperationDefinition } from '../operations';
import { updateColumnParam } from '../state_helpers';

export const filterRatioOperation: OperationDefinition<FilterRatioIndexPatternColumn> = {
  type: 'filter_ratio',
  displayName: i18n.translate('xpack.lens.indexPattern.filterRatio', {
    defaultMessage: 'Filter Ratio',
  }),
  isApplicableWithoutField: true,
  isApplicableForField: () => false,
  buildColumn(
    operationId: string,
    _columns: Partial<Record<string, IndexPatternColumn>>,
    suggestedOrder?: DimensionPriority
  ): FilterRatioIndexPatternColumn {
    return {
      operationId,
      label: i18n.translate('xpack.lens.indexPattern.filterRatio', {
        defaultMessage: 'Filter Ratio',
      }),
      dataType: 'number',
      operationType: 'filter_ratio',
      suggestedOrder,
      isBucketed: false,
      params: {
        numerator: { language: 'kuery', query: '' },
        denominator: { language: 'kuery', query: '' },
      },
    };
  },
  toEsAggsConfig: (column, columnId) => ({
    id: columnId,
    enabled: true,
    type: 'filters',
    schema: 'segment',
    params: {
      filters: [
        {
          input: column.params.numerator,
          label: '',
        },
        {
          input: column.params.denominator,
          label: '',
        },
      ],
    },
  }),
  paramEditor: ({ state, setState, columnId: currentColumnId, dataPlugin, storage }) => {
    const [hasDenominator, setDenominator] = useState(false);

    const { QueryBarInput } = dataPlugin!.query.ui;

    return (
      <div>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.filterRatioNumeratorLabel', {
            defaultMessage: 'Count of documents matching query:',
          })}
        >
          <QueryBarInput
            appName={'lens'}
            indexPatterns={[state.currentIndexPatternId]}
            query={
              (state.columns[currentColumnId] as FilterRatioIndexPatternColumn).params.numerator
            }
            screenTitle={''}
            store={storage}
            onChange={(newQuery: Query) => {
              setState(
                updateColumnParam(
                  state,
                  state.columns[currentColumnId] as FilterRatioIndexPatternColumn,
                  'numerator',
                  newQuery
                )
              );
            }}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.filterRatioDividesLabel', {
            defaultMessage: 'Divided by:',
          })}
        >
          {hasDenominator ? (
            <QueryBarInput
              appName={'lens'}
              indexPatterns={[state.currentIndexPatternId]}
              query={
                (state.columns[currentColumnId] as FilterRatioIndexPatternColumn).params.denominator
              }
              screenTitle={''}
              store={storage}
              onChange={(newQuery: Query) => {
                setState(
                  updateColumnParam(
                    state,
                    state.columns[currentColumnId] as FilterRatioIndexPatternColumn,
                    'denominator',
                    newQuery
                  )
                );
              }}
            />
          ) : (
            <>
              <FormattedMessage
                id="xpack.lens.indexPattern.filterRatioDefaultDenominator"
                defaultMessage="Count of documents"
              />

              <EuiFormRow>
                <EuiButton
                  data-test-subj="lns-indexPatternFilterRatio-showDenominatorButton"
                  fill
                  onClick={() => setDenominator(true)}
                >
                  <FormattedMessage
                    id="xpack.lens.indexPattern.filterRatioUseDenominatorButton"
                    defaultMessage="Divide by filter instead"
                  />
                </EuiButton>
              </EuiFormRow>
            </>
          )}
        </EuiFormRow>
      </div>
    );
  },
};