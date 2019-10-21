/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import routes from 'ui/routes';
import {
  CoreSetup,
  CoreStart,
  Plugin as CorePlugin,
  PluginInitializerContext,
} from 'src/core/public';

import template from '../../public/index.html';
import { renderReact } from './application';
import { BASE_PATH } from './application/constants';
import { breadcrumbService } from './application/lib/breadcrumb';
import { docTitleService } from './application/lib/doc_title';

export type Setup = void;
export type Start = void;

const REACT_ROOT_ID = 'alertingRoot';

export class Plugin implements CorePlugin<Setup, Start> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: any): Setup {
    /*
      The code below would be replacing for current:
      uiExports: {
        managementSections: ['myplugin/management'],
      }
    */
    const {
      capabilities,
      management: { getSection },
    } = plugins;

    const canShowActions = capabilities.get().actions.show;
    const canShowAlerts = capabilities.get().alerting.show;
    if (canShowActions || canShowAlerts) {
      const kbnSection = getSection('kibana');
      kbnSection.register('alerting', {
        display: i18n.translate('xpack.alertingUI.managementSection.displayName', {
          defaultMessage: 'Alerting',
        }),
        order: 7,
        url: `#${BASE_PATH}`,
      });
    }
  }

  public start(core: CoreStart, plugins: any) {
    const { capabilities } = plugins;
    const canShowActions = capabilities.get().actions.show;
    const canShowAlerts = capabilities.get().alerting.show;

    // Don't register routes when user doesn't have access to the application
    if (!canShowActions && !canShowAlerts) {
      return;
    }

    docTitleService.init(plugins.docTitle.change);
    breadcrumbService.init(core.chrome, plugins.management.breadcrumb);

    const unmountReactApp = (): void => {
      const elem = document.getElementById(REACT_ROOT_ID);
      if (elem) {
        unmountComponentAtNode(elem);
      }
    };

    routes.when(`${BASE_PATH}/:section?/:subsection?/:view?/:id?`, {
      template,
      controller: (() => {
        return ($route: any, $scope: any) => {
          const appRoute = $route.current;
          const stopListeningForLocationChange = $scope.$on('$locationChangeSuccess', () => {
            const currentRoute = $route.current;
            const isNavigationInApp = currentRoute.$$route.template === appRoute.$$route.template;

            // When we navigate within SR, prevent Angular from re-matching the route and rebuild the app
            if (isNavigationInApp) {
              $route.current = appRoute;
            } else {
              // Any clean up when user leaves SR
            }

            $scope.$on('$destroy', () => {
              if (stopListeningForLocationChange) {
                stopListeningForLocationChange();
              }
              unmountReactApp();
            });
          });

          $scope.$$postDigest(() => {
            unmountReactApp();
            const elReactRoot = document.getElementById(REACT_ROOT_ID);
            if (elReactRoot) {
              renderReact(elReactRoot, core, plugins);
            }
          });
        };
      })(),
    });
  }

  public stop() {}
}
