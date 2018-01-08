import debug from 'debug';

import template from './show.html';

const logger = debug('redash:http');

function DestinationCtrl(
  $scope, $routeParams, $http, $location, toastr,
  currentUser, Destination,
) {
  $scope.destinationId = $routeParams.destinationId;

  if ($scope.destinationId === 'new') {
    $scope.destination = new Destination({ options: {} });
  } else {
    $scope.destination = Destination.get({ id: $routeParams.destinationId });
  }

  $scope.$watch('destination.id', (id) => {
    if (id !== $scope.destinationId && id !== undefined) {
      $location.path(`/destinations/${id}`).replace();
    }
  });

  $scope.delete = () => {
    $scope.destination.$delete(() => {
      toastr.success('Destination deleted successfully.');
      $location.path('/destinations/');
    }, (httpResponse) => {
      logger('Failed to delete destination: ', httpResponse.status, httpResponse.statusText, httpResponse.data);
      toastr.error('Failed to delete destination.');
    });
  };
}

export default function init(ngModule) {
  ngModule.controller('DestinationCtrl', DestinationCtrl);

  return {
    '/destinations/:destinationId': {
      template,
      controller: 'DestinationCtrl',
      title: 'Destinations',
    },
  };
}
