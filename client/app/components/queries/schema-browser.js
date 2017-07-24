import template from './schema-browser.html';

function SchemaBrowserCtrl($scope) {
  'ngInject';

  this.versionToggle = false;
  this.versionFilter = 'abcdefghijklmnop';

  this.showTable = (table) => {
    table.collapsed = !table.collapsed;
    $scope.$broadcast('vsRepeatTrigger');
  };

  this.getSize = (table) => {
    let size = 18;

    if (!table.collapsed) {
      size += 18 * table.columns.length;
    }

    return size;
  };

  this.isEmpty = function isEmpty() {
    return this.schema === undefined || this.schema.length === 0;
  this.flipToggleVersionedTables = (versionToggle) => {
  this.flipToggleVersionedTables = (versionToggle, toggleString) => {
    if (versionToggle === false) {
      this.versionToggle = true;
      this.versionFilter = toggleString;
    } else {
      this.versionToggle = false;
      this.versionFilter = 'abcdefghijklmnop';
    }
  };
}

const SchemaBrowser = {
  bindings: {
    schema: '<',
    tabletogglestring: '<',
    onRefresh: '&',
    flipToggleVersionedTables: '&',
  },
  controller: SchemaBrowserCtrl,
  template,
};

export default function init(ngModule) {
  ngModule.component('schemaBrowser', SchemaBrowser);
}
