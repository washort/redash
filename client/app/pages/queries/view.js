import { pick, any, some, find } from 'underscore';
import template from './query.html';

function QueryViewCtrl(
  $scope, Events, $route, $routeParams, $location, $window, $q,
  KeyboardShortcuts, Title, AlertDialog, Notifications, clientConfig, toastr, $uibModal,
  currentUser, Query, DataSource,
) {
  const DEFAULT_TAB = 'table';

  function getQueryResult(maxAge) {
    if (maxAge === undefined) {
      maxAge = $location.search().maxAge;
    }

    if (maxAge === undefined) {
      maxAge = -1;
    }

    $scope.showLog = false;
    $scope.queryResult = $scope.query.getQueryResult(maxAge);
  }

  function getDataSourceId() {
    // Try to get the query's data source id
    let dataSourceId = $scope.query.data_source_id;

    // If there is no source yet, then parse what we have in localStorage
    //   e.g. `null` -> `NaN`, malformed data -> `NaN`, "1" -> 1
    if (dataSourceId === undefined) {
      dataSourceId = parseInt(localStorage.lastSelectedDataSourceId, 10);
    }

    // If we had an invalid value in localStorage (e.g. nothing, deleted source),
    // then use the first data source
    const isValidDataSourceId = !isNaN(dataSourceId) && some($scope.dataSources, ds =>
      ds.id === dataSourceId);

    if (!isValidDataSourceId) {
      dataSourceId = $scope.dataSources[0].id;
    }

    // Return our data source id
    return dataSourceId;
  }

  function toggleSchemaBrowser(hasSchema) {
    $scope.hasSchema = hasSchema;
    $scope.editorSize = hasSchema ? 'col-md-9' : 'col-md-12';
  }

  function getSchema(refresh = undefined) {
    DataSource.getSchema({ id: $scope.query.data_source_id, refresh }, (data) => {
      const hasPrevSchema = refresh ? ($scope.schema && ($scope.schema.length > 0)) : false;
      const hasSchema = data && (data.length > 0);

      if (hasSchema) {
        $scope.schema = data;
        data.forEach((table) => {
          table.collapsed = true;
        });
      } else if (hasPrevSchema) {
        toastr.error('Schema refresh failed. Please try again later.');
      }

      toggleSchemaBrowser(hasSchema || hasPrevSchema);
    });
  }

  function updateSchema() {
    toggleSchemaBrowser(false);
    getSchema();
  }

  $scope.refreshSchema = () => getSchema(true);

  function updateDataSources(dataSources) {
    // Filter out data sources the user can't query (or used by current query):
    $scope.dataSources = dataSources.filter(dataSource =>
      !dataSource.view_only || dataSource.id === $scope.query.data_source_id);

    if ($scope.dataSources.length === 0) {
      $scope.noDataSources = true;
      return;
    }

    if ($scope.query.isNew()) {
      $scope.query.data_source_id = getDataSourceId();
    }

    $scope.dataSource = find(dataSources, ds => ds.id === $scope.query.data_source_id);

    $scope.canCreateQuery = any(dataSources, ds => !ds.view_only);

    updateSchema();
  }

  $scope.executeQuery = () => {
    if (!$scope.canExecuteQuery()) {
      return;
    }

    if (!$scope.query.query) {
      return;
    }

    getQueryResult(0);
    $scope.lockButton(true);
    $scope.cancelling = false;
    Events.record('execute', 'query', $scope.query.id);

    Notifications.getPermissions();
  };


  $scope.currentUser = currentUser;
  $scope.dataSource = {};
  $scope.query = $route.current.locals.query;
  $scope.showPermissionsControl = clientConfig.showPermissionsControl;

  const shortcuts = {
    'mod+enter': $scope.executeQuery,
  };

  KeyboardShortcuts.bind(shortcuts);

  $scope.$on('$destroy', () => {
    KeyboardShortcuts.unbind(shortcuts);
  });

  if ($scope.query.hasResult() || $scope.query.paramsRequired()) {
    getQueryResult();
  }
  $scope.queryExecuting = false;

  $scope.isQueryOwner = (currentUser.id === $scope.query.user.id) || currentUser.hasPermission('admin');
  $scope.canEdit = currentUser.canEdit($scope.query) || $scope.query.can_edit;
  $scope.canViewSource = currentUser.hasPermission('view_source');

  $scope.canExecuteQuery = () => currentUser.hasPermission('execute_query') && !$scope.dataSource.view_only;

  $scope.canScheduleQuery = currentUser.hasPermission('schedule_query');

  if ($route.current.locals.dataSources) {
    $scope.dataSources = $route.current.locals.dataSources;
    updateDataSources($route.current.locals.dataSources);
  } else {
    $scope.dataSources = DataSource.query(updateDataSources);
  }

  // in view mode, latest dataset is always visible
  // source mode changes this behavior
  $scope.showDataset = true;
  $scope.showLog = false;

  $scope.lockButton = (lock) => {
    $scope.queryExecuting = lock;
  };

  $scope.showApiKey = () => {
    $uibModal.open({
      component: 'apiKeyDialog',
      resolve: {
        query: $scope.query,
      },
    });
  };

  $scope.saveQuery = (customOptions, data) => {
    let request = data;

    if (request) {
      // Don't save new query with partial data
      if ($scope.query.isNew()) {
        return $q.reject();
      }
      request.id = $scope.query.id;
      request.version = $scope.query.version;
    } else {
      request = pick($scope.query, ['schedule', 'query', 'id', 'description', 'name', 'data_source_id', 'options', 'latest_query_data_id', 'version', 'is_draft']);
    }

    const options = Object.assign({}, {
      successMessage: 'Query saved',
      errorMessage: 'Query could not be saved',
    }, customOptions);

    if (options.force) {
      delete request.version;
    }

    return Query.save(request, (updatedQuery) => {
      toastr.success(options.successMessage);
      $scope.query.version = updatedQuery.version;
    }, (error) => {
      if (error.status === 409) {
        // no way this code is going upstream
        window.overwriteQuery = () => $scope.$apply(() => {
          options.force = true;
          $scope.saveQuery(options, data);
        });
        toastr.error(
          'It seems like the query has been modified by another user. ' +
            ($scope.isQueryOwner ? '<a href="#" onclick="overwriteQuery()">Overwrite anyway</a>?' : 'Please copy/backup your changes and reload this page.'),
          { autoDismiss: false, allowHtml: true, timeout: 0 },
        );
      } else {
        toastr.error(options.errorMessage);
      }
    }).$promise;
  };

  $scope.togglePublished = () => {
    Events.record('toggle_published', 'query', $scope.query.id);
    $scope.query.is_draft = !$scope.query.is_draft;
    $scope.saveQuery(undefined, { is_draft: $scope.query.is_draft });
  };

  $scope.saveDescription = () => {
    Events.record('edit_description', 'query', $scope.query.id);
    $scope.saveQuery(undefined, { description: $scope.query.description });
  };

  $scope.saveName = () => {
    Events.record('edit_name', 'query', $scope.query.id);

    if ($scope.query.is_draft && clientConfig.autoPublishNamedQueries && $scope.query.name !== 'New Query') {
      $scope.query.is_draft = false;
    }

    $scope.saveQuery(undefined, { name: $scope.query.name, is_draft: $scope.query.is_draft });
  };

  $scope.cancelExecution = () => {
    $scope.cancelling = true;
    $scope.queryResult.cancelExecution();
    Events.record('cancel_execute', 'query', $scope.query.id);
  };

  $scope.archiveQuery = () => {
    function archive() {
      Query.delete({ id: $scope.query.id }, () => {
        $scope.query.is_archived = true;
        $scope.query.schedule = null;
      }, () => {
        toastr.error('Query could not be archived.');
      });
    }

    const title = 'Archive Query';
    const message = 'Are you sure you want to archive this query?<br/> All alerts and dashboard widgets created with its visualizations will be deleted.';
    const confirm = { class: 'btn-warning', title: 'Archive' };

    AlertDialog.open(title, message, confirm).then(archive);
  };

  $scope.updateDataSource = () => {
    Events.record('update_data_source', 'query', $scope.query.id);
    localStorage.lastSelectedDataSourceId = $scope.query.data_source_id;

    $scope.query.latest_query_data = null;
    $scope.query.latest_query_data_id = null;

    if ($scope.query.id) {
      Query.save({
        id: $scope.query.id,
        data_source_id: $scope.query.data_source_id,
        latest_query_data_id: null,
      });
    }

    updateSchema();
    $scope.dataSource = find($scope.dataSources, ds => ds.id === $scope.query.data_source_id);
    document.getElementById('data-source-version').innerHTML = '<span class=\'fa fa-refresh\' data-toggle=\'tooltip\' data-placement=\'right\' tooltip title=\'It seems the data source was changed since the page loaded, refresh page to get version\'></span>';
  };

  $scope.setVisualizationTab = (visualization) => {
    $scope.selectedTab = visualization.id;
    $location.hash(visualization.id);
  };

  $scope.compareQueryVersion = () => {
    if (!$scope.query.query) {
      return;
    }

    $uibModal.open({
      windowClass: 'modal-xl',
      component: 'compareQueryDialog',
      resolve: {
        query: $scope.query,
        saveQuery: () => $scope.saveQuery,
      },
    });
  };

  $scope.$watch('query.name', () => {
    Title.set($scope.query.name);
  });

  $scope.$watch('queryResult && queryResult.getData()', (data) => {
    if (!data) {
      return;
    }

    $scope.filters = $scope.queryResult.getFilters();
  });

  $scope.$watch('queryResult && queryResult.getStatus()', (status) => {
    if (!status) {
      return;
    }

    if (status === 'done') {
      $scope.query.latest_query_data_id = $scope.queryResult.getId();
      $scope.query.queryResult = $scope.queryResult;

      Notifications.showNotification('Redash', `${$scope.query.name} updated.`);
    } else if (status === 'failed') {
      Notifications.showNotification('Redash', `${$scope.query.name} failed to run: ${$scope.queryResult.getError()}`);
    }

    if (status === 'done' || status === 'failed') {
      $scope.lockButton(false);
    }

    if ($scope.queryResult.getLog() != null) {
      $scope.showLog = true;
    }
  });

  $scope.openVisualizationEditor = (visualization) => {
    function openModal() {
      $uibModal.open({
        windowClass: 'modal-xl',
        component: 'editVisualizationDialog',
        resolve: {
          query: $scope.query,
          visualization,
          queryResult: $scope.queryResult,
          onNewSuccess: () => $scope.setVisualizationTab,
        },
      });
    }

    if ($scope.query.isNew()) {
      $scope.saveQuery().then((query) => {
        // Because we have a path change, we need to "signal" the next page to
        // open the visualization editor.
        $location.path(query.getSourceLink()).hash('add');
      });
    } else {
      openModal();
    }
  };

  if ($location.hash() === 'add') {
    $location.hash(null);
    $scope.openVisualizationEditor();
  }

  $scope.openScheduleForm = () => {
    if (!$scope.canEdit || !$scope.canScheduleQuery) {
      return;
    }

    $uibModal.open({
      component: 'scheduleDialog',
      size: 'sm',
      resolve: {
        query: $scope.query,
        saveQuery: () => $scope.saveQuery,
      },
    });
  };

  $scope.openAddToDashboardForm = (vis) => {
    $uibModal.open({
      component: 'addToDashboardDialog',
      size: 'sm',
      resolve: {
        query: $scope.query,
        vis,
        saveAddToDashboard: () => $scope.saveAddToDashboard,
      },
    });
  };

  $scope.showEmbedDialog = (query, visualization) => {
    $uibModal.open({
      component: 'embedCodeDialog',
      resolve: {
        query,
        visualization,
      },
    });
  };

  $scope.$watch(
    () => $location.hash(),
    (hash) => { $scope.selectedTab = hash || DEFAULT_TAB; },
  );

  $scope.showManagePermissionsModal = () => {
    $uibModal.open({
      component: 'permissionsEditor',
      resolve: {
        aclUrl: { url: `api/queries/${$routeParams.queryId}/acl` },
      },
    });
  };

  $scope.moreMenuIsPopulated = () => {
    const menuParent = document.getElementById('query-more-menu');

    if (menuParent) {
      if (menuParent.querySelectorAll('.dropdown-menu li').length) {
        return true;
      }
    }
    return false;
  };
}

export default function init(ngModule) {
  ngModule.controller('QueryViewCtrl', QueryViewCtrl);

  return {
    '/queries/:queryId': {
      template,
      controller: 'QueryViewCtrl',
      reloadOnSearch: false,
      resolve: {
        query: (Query, $route) => {
          'ngInject';

          return Query.get({ id: $route.current.params.queryId }).$promise;
        },
      },
    },
  };
}
