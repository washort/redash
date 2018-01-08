import * as _ from 'underscore';
import PromiseRejectionError from '@/lib/promise-rejection-error';
import template from './dashboard.html';
import shareDashboardTemplate from './share-dashboard.html';
import './dashboard.less';

function DashboardCtrl(
  $rootScope, $routeParams, $location, $timeout, $q, $uibModal,
  Title, AlertDialog, Dashboard, currentUser, clientConfig, Events,
  dashboardGridOptions, toastr,
) {
  this.saveInProgress = false;
  const saveDashboardLayout = () => {
    if (!this.dashboard.canEdit()) {
      return;
    }

    this.saveInProgress = true;
    const showMessages = true; // this.layoutEditing;
    // Temporarily disable grid editing (but allow user to use UI controls)
    this.dashboardGridOptions.draggable.enabled = false;
    this.dashboardGridOptions.resizable.enabled = false;
    return $q.all(_.map(this.dashboard.widgets, widget => widget.$save()))
      .then(() => {
        if (showMessages) {
          toastr.success('Dashboard layout saved.');
        }
      })
      .catch(() => {
        if (showMessages) {
          toastr.error('Cannot save dashboard layout.');
        }
      })
      .finally(() => {
        this.saveInProgress = false;
        // If user didn't disable editing mode while saving - restore grid
        this.dashboardGridOptions.draggable.enabled = this.layoutEditing;
        this.dashboardGridOptions.resizable.enabled = this.layoutEditing;
      });
  };


  this.layoutEditing = false;
  this.dashboardGridOptions = _.extend({}, dashboardGridOptions, {
    resizable: {
      enabled: false,
      handles: ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'],
      // stop: saveDashboardLayout,
    },
    draggable: {
      enabled: false,
      // stop: saveDashboardLayout,
    },
  });

  this.isFullscreen = false;
  this.refreshRate = null;
  this.isGridDisabled = false;
  this.showPermissionsControl = clientConfig.showPermissionsControl;
  this.currentUser = currentUser;
  this.globalParameters = [];
  this.refreshRates = [
    { name: '10 seconds', rate: 10 },
    { name: '30 seconds', rate: 30 },
    { name: '1 minute', rate: 60 },
    { name: '5 minutes', rate: 60 * 5 },
    { name: '10 minutes', rate: 60 * 10 },
    { name: '30 minutes', rate: 60 * 30 },
    { name: '1 hour', rate: 60 * 60 },
    { name: '12 hour', rate: 12 * 60 * 60 },
    { name: '24 hour', rate: 24 * 60 * 60 },
  ];

  $rootScope.$on('gridster-mobile-changed', ($event, gridster) => {
    this.isGridDisabled = gridster.isMobile;
  });


  this.setRefreshRate = (rate) => {
    this.refreshRate = rate;
    if (rate !== null) {
      this.loadDashboard(true);
      this.autoRefresh();
    }
  };

  this.extractGlobalParameters = () => {
    let globalParams = {};
    this.dashboard.widgets.forEach((widget) => {
      if (widget.getQuery()) {
        widget.getQuery().getParametersDefs().filter(p => p.global).forEach((param) => {
          const defaults = {};
          defaults[param.name] = _.create(Object.getPrototypeOf(param), param);
          defaults[param.name].locals = [];
          globalParams = _.defaults(globalParams, defaults);
          globalParams[param.name].locals.push(param);
        });
      }
    });
    this.globalParameters = _.values(globalParams);
  };

  this.onGlobalParametersChange = () => {
    this.globalParameters.forEach((global) => {
      global.locals.forEach((local) => {
        local.value = global.value;
      });
    });
  };

  const renderDashboard = (dashboard, force) => {
    Title.set(dashboard.name);
    const promises = [];

    this.dashboard.widgets.forEach((widget) => {
      if (widget.visualization) {
        const maxAge = force ? 0 : undefined;
        const queryResult = widget.getQuery().getQueryResult(maxAge);
        if (!_.isUndefined(queryResult)) {
          promises.push(queryResult.toPromise());
        }
      }
    });

    this.extractGlobalParameters();

    $q.all(promises).then((queryResults) => {
      const filters = {};
      queryResults.forEach((queryResult) => {
        const queryFilters = queryResult.getFilters();
        queryFilters.forEach((queryFilter) => {
          const hasQueryStringValue = _.has($location.search(), queryFilter.name);

          if (!(hasQueryStringValue || dashboard.dashboard_filters_enabled)) {
            // If dashboard filters not enabled, or no query string value given,
            // skip filters linking.
            return;
          }

          if (hasQueryStringValue) {
            queryFilter.current = $location.search()[queryFilter.name];
          }

          if (!_.has(filters, queryFilter.name)) {
            const filter = _.extend({}, queryFilter);
            filters[filter.name] = filter;
            filters[filter.name].originFilters = [];
          }

          // TODO: merge values.
          filters[queryFilter.name].originFilters.push(queryFilter);
        });
      });

      this.filters = _.values(filters);
      this.filtersOnChange = (filter) => {
        _.each(filter.originFilters, (originFilter) => {
          originFilter.current = filter.current;
        });
      };
    });
  };

  this.loadDashboard = _.throttle((force) => {
    this.dashboard = Dashboard.get({ slug: $routeParams.dashboardSlug }, (dashboard) => {
      renderDashboard(dashboard, force);
    }, (rejection) => {
      const statusGroup = Math.floor(rejection.status / 100);
      if (statusGroup === 5) {
        // recoverable errors - all 5** (server is temporarily unavailable
        // for some reason, but it should get up soon).
        this.loadDashboard();
      } else {
        // all kind of 4** errors are not recoverable, so just display them
        throw new PromiseRejectionError(rejection);
      }
    });
  }, 1000);

  this.loadDashboard();

  this.autoRefresh = () => {
    $timeout(() => {
      this.loadDashboard(true);
    }, this.refreshRate.rate * 1000).then(() => this.autoRefresh());
  };

  this.archiveDashboard = () => {
    const archive = () => {
      this.dashboard.$delete(() => {
        $rootScope.$broadcast('reloadDashboards');
      });
    };

    const title = 'Archive Dashboard';
    const message = `Are you sure you want to archive the "${this.dashboard.name}" dashboard?`;
    const confirm = { class: 'btn-warning', title: 'Archive' };

    AlertDialog.open(title, message, confirm).then(archive);
  };

  this.showManagePermissionsModal = () => {
    $uibModal.open({
      component: 'permissionsEditor',
      resolve: {
        aclUrl: { url: `api/dashboards/${this.dashboard.id}/acl` },
      },
    });
  };

  this.editLayout = (enableEditing, applyChanges) => {
    if (!this.isGridDisabled) {
      if (enableEditing) {
        if (!this.layoutEditing) {
          // Save current positions of widgets
          _.each(this.dashboard.widgets, (widget) => {
            widget.$savedPosition = _.clone(widget.options.position);
          });
        }
      } else {
        if (applyChanges) {
          // Clear saved data and save layout
          _.each(this.dashboard.widgets, (widget) => {
            widget.$savedPosition = undefined;
          });
          saveDashboardLayout();
        } else {
          // Revert changes
          _.each(this.dashboard.widgets, (widget) => {
            if (_.isObject(widget.$savedPosition)) {
              widget.options.position = widget.$savedPosition;
            }
            widget.$savedPosition = undefined;
          });
        }
      }

      this.layoutEditing = enableEditing;
      this.dashboardGridOptions.draggable.enabled = this.layoutEditing && !this.saveInProgress;
      this.dashboardGridOptions.resizable.enabled = this.layoutEditing && !this.saveInProgress;
    }
  };

  this.editDashboard = () => {
    const previousFiltersState = this.dashboard.dashboard_filters_enabled;
    $uibModal.open({
      component: 'editDashboardDialog',
      resolve: {
        dashboard: () => this.dashboard,
      },
    }).result.then((dashboard) => {
      const shouldRenderDashboard = !previousFiltersState && dashboard.dashboard_filters_enabled;
      this.dashboard = dashboard;

      if (shouldRenderDashboard) {
        renderDashboard(this.dashboard);
      }
    });
  };

  this.addWidget = () => {
    $uibModal.open({
      component: 'addWidgetDialog',
      resolve: {
        dashboard: () => this.dashboard,
      },
    }).result.then(() => {
      this.extractGlobalParameters();
      if (this.layoutEditing) {
        // Save position of newly added widget (but not entire layout)
        const widget = _.last(this.dashboard.widgets);
        if (_.isObject(widget)) {
          return widget.$save().then(() => {
            if (this.layoutEditing) {
              widget.$savedPosition = _.clone(widget.options.position);
            }
          });
        }
      } else {
        // Update entire layout
        return saveDashboardLayout();
      }
    });
  };

  this.removeWidget = () => {
    this.extractGlobalParameters();
    if (!this.layoutEditing) {
      saveDashboardLayout();
    }
  };

  this.toggleFullscreen = () => {
    this.isFullscreen = !this.isFullscreen;
    document.querySelector('body').classList.toggle('headless');

    if (this.isFullscreen) {
      $location.search('fullscreen', true);
    } else {
      $location.search('fullscreen', null);
    }
  };

  this.togglePublished = () => {
    Events.record('toggle_published', 'dashboard', this.dashboard.id);
    this.dashboard.is_draft = !this.dashboard.is_draft;
    this.saveInProgress = true;
    Dashboard.save({
      slug: this.dashboard.id,
      name: this.dashboard.name,
      is_draft: this.dashboard.is_draft,
    }, (dashboard) => {
      this.saveInProgress = false;
      this.dashboard.version = dashboard.version;
      $rootScope.$broadcast('reloadDashboards');
    });
  };

  if (_.has($location.search(), 'fullscreen')) {
    this.toggleFullscreen();
  }

  this.openShareForm = () => {
    $uibModal.open({
      component: 'shareDashboard',
      resolve: {
        dashboard: this.dashboard,
      },
    });
  };
}

const ShareDashboardComponent = {
  template: shareDashboardTemplate,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  controller($http) {
    'ngInject';

    this.dashboard = this.resolve.dashboard;

    this.toggleSharing = () => {
      const url = `api/dashboards/${this.dashboard.id}/share`;

      if (!this.dashboard.publicAccessEnabled) {
        // disable
        $http.delete(url).success(() => {
          this.dashboard.publicAccessEnabled = false;
          delete this.dashboard.public_url;
        }).error(() => {
          this.dashboard.publicAccessEnabled = true;
          // TODO: show message
        });
      } else {
        $http.post(url).success((data) => {
          this.dashboard.publicAccessEnabled = true;
          this.dashboard.public_url = data.public_url;
        }).error(() => {
          this.dashboard.publicAccessEnabled = false;
          // TODO: show message
        });
      }
    };
  },
};

export default function init(ngModule) {
  ngModule.component('shareDashboard', ShareDashboardComponent);
  ngModule.component('dashboardPage', {
    template,
    controller: DashboardCtrl,
  });

  return {
    '/dashboard/:dashboardSlug': {
      template: '<dashboard-page></dashboard-page>',
      reloadOnSearch: false,
    },
  };
}
