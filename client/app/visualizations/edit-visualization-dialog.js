import { pluck } from 'lodash';
import { copy } from 'angular';
import template from './edit-visualization-dialog.html';
import './edit-visualization-dialog.css';

const EditVisualizationDialog = {
  template,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  controller($window, currentUser, Events, Visualization, toastr) {
    'ngInject';

    this.query = this.resolve.query;
    this.queryResult = this.resolve.queryResult;
    this.originalVisualization = this.resolve.visualization;
    this.onNewSuccess = this.resolve.onNewSuccess;
    this.visualization = copy(this.originalVisualization);
    this.visTypes = Visualization.visualizationTypes;

    // Don't allow to change type after creating visualization
    this.canChangeType = !(this.visualization && this.visualization.id);
    this.warning_three_column_groupby = '<b>You have more than 2 columns in your result set.</b> To ensure the chart is accurate, please do one of the following: <ul> <li>Change the SQL query to give 2 result columns. You can CONCAT() columns together if you wish.</li> <LI>Select column(s) to group by.</LI> </ul>';
    this.warning_three_column_stacking = '<b>You have more than 2 columns in your result set.</b> You may wish to make the Stacking option equal to `Enabled` or `Percent`.';

    this.newVisualization = () =>
      ({
        type: Visualization.defaultVisualization.type,
        name: Visualization.defaultVisualization.name,
        description: '',
        options: Visualization.defaultVisualization.defaultOptions,
      });
    if (!this.visualization) {
      this.visualization = this.newVisualization();
    }

    this.typeChanged = (oldType) => {
      const type = this.visualization.type;
      // if not edited by user, set name to match type
      // todo: this is wrong, because he might have edited it before.
      if (type && oldType !== type && this.visualization && !this.visForm.name.$dirty) {
        this.visualization.name = Visualization.visualizations[this.visualization.type].name;
      }

      // Bring default options
      if (type && oldType !== type && this.visualization) {
        this.visualization.options =
          Visualization.visualizations[this.visualization.type].defaultOptions;
      }
    };

    this.has3plusColumnsFunction = () => {
      let has3plusColumns = false;
      if ((JSON.stringify(this.visualization.options.columnMapping).match(/,/g) || []).length > 2) {
        has3plusColumns = true;
      }
      return has3plusColumns;
    };

    this.disableSubmit = () => {
      if (this.visualization.options.globalSeriesType === 'column'
          && this.has3plusColumnsFunction()
          && !JSON.stringify(this.visualization.options.columnMapping).includes('"":')
          && JSON.stringify(this.visualization.options.columnMapping).includes('unused')) {
        return true;
      }
      return false;
    };

    this.submit = () => {
      if (this.visualization.id) {
        Events.record('update', 'visualization', this.visualization.id, { type: this.visualization.type });
      } else {
        Events.record('create', 'visualization', null, { type: this.visualization.type });
      }

      this.visualization.query_id = this.query.id;

      Visualization.save(this.visualization, (result) => {
        toastr.success('Visualization saved');

        const visIds = pluck(this.query.visualizations, 'id');
        const index = visIds.indexOf(result.id);
        if (index > -1) {
          this.query.visualizations[index] = result;
        } else {
          // new visualization
          this.query.visualizations.push(result);
          if (this.onNewSuccess) {
            this.onNewSuccess(result);
          }
        }
        this.close();
      }, () => {
        toastr.error('Visualization could not be saved');
      });
    };

    this.closeDialog = () => {
      if (this.visForm.$dirty) {
        if ($window.confirm('Are you sure you want to close the editor without saving?')) {
          this.close();
        }
      } else {
        this.close();
      }
    };
  },
};

export default function init(ngModule) {
  ngModule.component('editVisualizationDialog', EditVisualizationDialog);
}
