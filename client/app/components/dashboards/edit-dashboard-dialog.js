import { isEmpty } from 'lodash';
import template from './edit-dashboard-dialog.html';

const EditDashboardDialog = {
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  template,
  controller($rootScope, $location, $http, toastr, Events) {
    'ngInject';

    this.dashboard = this.resolve.dashboard;

    this.isFormValid = () => !isEmpty(this.dashboard.name);

    this.saveDashboard = () => {
      this.saveInProgress = true;

      $http
        .post('api/dashboards', {
          name: this.dashboard.name,
        })
        .success((response) => {
          this.close();
          $location
            .path(`/dashboard/${response.slug}`)
            .search('edit')
            .replace();
        });
      Events.record('create', 'dashboard');
    };
    this.saveDashboardOnEnter = ($event) => {
      // keyCode 13 is the Enter key
      if ($event.keyCode === 13) {
        this.saveDashboard();
      }
    };
    this.closeWithoutSave = () => {
      this.dashboard.name = this.dashboard.existing_name;
      this.dismiss();
    };
  },
};

export default function init(ngModule) {
  ngModule.component('editDashboardDialog', EditDashboardDialog);
}
