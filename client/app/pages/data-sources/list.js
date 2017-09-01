import template from './list.html';

function DataSourcesCtrl($scope, $location, currentUser, DataSource) {
  $scope.dataSources = DataSource.query();
}

export default function init(ngModule) {
  ngModule.controller('DataSourcesCtrl', DataSourcesCtrl);

  return {
    '/data_sources': {
      template,
      controller: 'DataSourcesCtrl',
      title: 'Data Sources',
    },
  };
}
