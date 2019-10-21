/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { Fragment, useEffect, useState } from 'react';
// @ts-ignore: EuiSearchBar not exported in TypeScript
import { EuiBasicTable, EuiSearchBar, EuiSpacer } from '@elastic/eui';
import { AlertsContext } from '../../../context/alerts_context';
import { useAppDependencies } from '../../../index';
import { Alert, AlertType, loadAlerts, loadAlertTypes } from '../../../lib/api';

type AlertTypeIndex = Record<string, AlertType>;
interface Pagination {
  index: number;
  size: number;
}
interface Data extends Alert {
  alertType: AlertType['name'];
}

export const AlertsList: React.FunctionComponent = () => {
  const {
    core: { http },
    plugins: { toastNotifications },
  } = useAppDependencies();

  const [alertTypesIndex, setAlertTypesIndex] = useState<AlertTypeIndex | undefined>(undefined);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [data, setData] = useState<Data[]>([]);
  const [isLoadingAlertTypes, setIsLoadingAlertTypes] = useState<boolean>(false);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState<boolean>(false);
  const [totalItemCount, setTotalItemCount] = useState<number>(0);
  const [page, setPage] = useState<Pagination>({ index: 0, size: 10 });
  const [searchText, setSearchText] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadAlertsData();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setIsLoadingAlertTypes(true);
        const alertTypes = await loadAlertTypes({ http });
        const index: AlertTypeIndex = {};
        for (const alertType of alertTypes) {
          index[alertType.id] = alertType;
        }
        setAlertTypesIndex(index);
      } catch (e) {
        toastNotifications.addDanger({
          title: i18n.translate(
            'xpack.alertingUI.sections.alertsList.unableToLoadAlertTypesMessage',
            { defaultMessage: 'Unable to load alert types' }
          ),
        });
      } finally {
        setIsLoadingAlertTypes(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Avoid flickering before alert types load
    if (typeof alertTypesIndex === 'undefined') {
      return;
    }
    const updatedData = alerts.map(alert => ({
      ...alert,
      alertType: alertTypesIndex[alert.alertTypeId]
        ? alertTypesIndex[alert.alertTypeId].name
        : alert.alertTypeId,
    }));
    setData(updatedData);
  }, [alerts, alertTypesIndex]);

  async function loadAlertsData() {
    setIsLoadingAlerts(true);
    try {
      const alertsResponse = await loadAlerts({ http, page, searchText });
      setAlerts(alertsResponse.data);
      setTotalItemCount(alertsResponse.total);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.alertingUI.sections.alertsList.unableToLoadAlertsMessage', {
          defaultMessage: 'Unable to load alerts',
        }),
      });
    } finally {
      setIsLoadingAlerts(false);
    }
  }

  const alertsTableColumns = [
    {
      field: 'alertType',
      name: i18n.translate(
        'xpack.alertingUI.sections.alertsList.alertsListTable.columns.alertType',
        { defaultMessage: 'Alert Type' }
      ),
      sortable: false,
      truncateText: true,
    },
    {
      field: 'alertTypeParams',
      name: i18n.translate(
        'xpack.alertingUI.sections.alertsList.alertsListTable.columns.alertTypeParams',
        { defaultMessage: 'Params' }
      ),
      sortable: false,
      truncateText: true,
    },
  ];

  return (
    <section data-test-subj="alertsList">
      <Fragment>
        <EuiSpacer size="m" />
        <AlertsContext.Provider value={{}}>
          <EuiSearchBar
            onChange={({ queryText }: { queryText: string }) => setSearchText(queryText)}
            filters={[
              {
                type: 'field_value_selection',
                field: 'type',
                name: i18n.translate(
                  'xpack.alertingUI.sections.alertsList.filters.alertTypeIdName',
                  { defaultMessage: 'Alert Type' }
                ),
                multiSelect: 'or',
                options: Object.values(alertTypesIndex || {})
                  .map(alertType => ({
                    value: alertType.id,
                    name: alertType.name,
                  }))
                  .sort((a, b) => a.name.localeCompare(b.name)),
              },
            ]}
          ></EuiSearchBar>

          <EuiSpacer size="s" />

          <EuiBasicTable
            loading={isLoadingAlerts || isLoadingAlertTypes}
            items={data}
            itemId="id"
            columns={alertsTableColumns}
            rowProps={() => ({
              'data-test-subj': 'row',
            })}
            cellProps={() => ({
              'data-test-subj': 'cell',
            })}
            data-test-subj="alertsTable"
            pagination={{
              pageIndex: page.index,
              pageSize: page.size,
              totalItemCount,
            }}
            onChange={({ page: changedPage }: { page: Pagination }) => {
              setPage(changedPage);
            }}
          ></EuiBasicTable>
        </AlertsContext.Provider>
      </Fragment>
    </section>
  );
};
