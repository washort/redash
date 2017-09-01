import template from './list.html';

function DestinationsCtrl($scope, $location, toastr, currentUser, Destination) {
  $scope.destinations = Destination.query();
}

export default function init(ngModule) {
  ngModule.controller('DestinationsCtrl', DestinationsCtrl);

  return {
    '/destinations': {
      template,
      controller: 'DestinationsCtrl',
      title: 'Destinations',
    },
  };
}
