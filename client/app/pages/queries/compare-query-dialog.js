import * as jsDiff from 'diff';
import template from './compare-query-dialog.html';

const CompareQueryDialog = {
  controller(clientConfig, $http) {
    this.currentQuery = this.resolve.query;
    this.previousQueryVersion = document.getElementById('version-choice').value;

    let previousQuery = '';
    this.currentDiff = [];
    this.previousDiff = [];

    $http.get(`/api/queries/${this.currentQuery.id}/version/${this.previousQueryVersion}`).then((response) => {
      previousQuery = response.data.change.query.current;
      this.currentDiff = jsDiff.diffChars(previousQuery, this.currentQuery.query);
      this.previousDiff = jsDiff.diffChars(this.currentQuery.query, previousQuery);
    });
  },
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  template,
};

export default function (ngModule) {
  ngModule.component('compareQueryDialog', CompareQueryDialog);
}
