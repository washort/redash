/* eslint-disable jsx-a11y/label-has-for, jsx-a11y/no-static-element-interactions */

import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import 'react-select/dist/react-select.css';

import { capitalize, compact, each, filter, findKey, includes, invert, map, some, sortBy, toPairs } from 'lodash';
import ChartTypePicker from './ChartTypePicker';
import ChartSeriesEditor from './ChartSeriesEditor';
import ChartColorEditor from './ChartColorEditor';

const DEFAULT_CUSTOM_CODE = `// Available variables are x, ys, element, and Plotly
// Type console.log(x, ys); for more info about x and ys
// To plot your graph call Plotly.plot(element, ...)
// Plotly examples and docs: https://plot.ly/javascript/`;

export default class ChartEditor extends React.Component {
  static propTypes = {
    // eslint-disable-next-line react/no-unused-prop-types
    queryResult: PropTypes.object.isRequired,
    visualization: PropTypes.object.isRequired,
    updateVisualization: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      currentTab: 'general',
      seriesList: map(sortBy(toPairs(props.visualization.options.seriesOptions), '1.zIndex'), 0),
      colorsList: map(sortBy(toPairs(props.visualization.options.colorsOptions), '1.zIndex'), 0),
    };

    function axisOptions(getColumnsState) {
      return () => (
        map(
          filter(
            props.queryResult.getColumns(),
            c => !includes(map(filter(getColumnsState(), cc => cc !== null), 'value'), c.name),
          ),
          c => ({ value: c.name, label: <span>{c.name} <small className="text-muted">{c.type}</small></span> }),
        ));
    }
    const yAxisColumns = () => this.props.visualization.options.yAxisColumns || [];
    this.xAxisOptions = axisOptions(() => [
      ...yAxisColumns(),
      this.props.visualization.options.groupby,
    ]);
    this.yAxisOptions = axisOptions(() => [
      this.props.visualization.options.xAxisColumn,
      this.props.visualization.options.groupby,
    ]);
    this.groupbyOptions = axisOptions(() => [
      this.props.visualization.options.xAxisColumn,
      ...yAxisColumns(),
    ]);
    this.sizeColumnOptions = axisOptions(() => [
      ...yAxisColumns(),
      this.props.visualization.options.groupby,
    ]);

    const yAxes = props.visualization.options.yAxis;
    this.updateYAxisText = [
      e => this.updateOptions({ yAxis: [{ ...yAxes[0], text: e.target.value }, yAxes[1]] }),
      e => this.updateOptions({ yAxis: [yAxes[0], { ...yAxes[1], text: e.target.value }] }),
    ];
    this.updateYAxisScale = [
      type => this.updateOptions({ yAxis: [{ ...yAxes[0], type }, yAxes[1]] }),
      type => this.updateOptions({ yAxis: [yAxes[0], { ...yAxes[1], type }] }),
    ];
    this.updateYAxisRangeMin = [
      e => this.updateOptions({ yAxis: [{ ...yAxes[0], rangeMin: e.target.value }, yAxes[1]] }),
      e => this.updateOptions({ yAxis: [yAxes[0], { ...yAxes[1], rangeMin: e.target.value }] }),
    ];
    this.updateYAxisRangeMax = [
      e => this.updateOptions({ yAxis: [{ ...yAxes[0], rangeMax: e.target.value }, yAxes[1]] }),
      e => this.updateOptions({ yAxis: [yAxes[0], { ...yAxes[1], rangeMax: e.target.value }] }),
    ];
  }

  getYAxisColumns = () => compact(map(this.props.visualization.options.columnMapping, (v, k) => v === 'y' && k))
  getXAxisColumn = () => findKey(this.props.visualization.options.columnMapping, c => c === 'x')
  getErrorColumn = () => findKey(this.props.visualization.options.columnMapping, c => c === 'yError')
  getSizeColumn = () => findKey(this.props.visualization.options.columnMapping, c => c === 'size')
  getGroupby = () => findKey(this.props.visualization.options.columnMapping, c => c === 'groupby')

  // XXX See also GridEditor.updateOptions
  updateOptions = (newVal) => {
    const newOptions = Object.assign(
      {},
      this.props.visualization.options,
      newVal,
    );
    return this.props.updateVisualization({
      ...this.props.visualization,
      options: newOptions,
    });
  }

  updateColumn = newRoles => this.updateOptions({
    columnMapping: {
      ...this.props.visualization.options.columnMapping,
      ...(invert(newRoles)),
    },
  })

  changeTab = (event) => {
    this.setState({ currentTab: event.target.dataset.tabname });
  }

  chartTypeChanged = (selected) => {
    const sOpts = this.props.visualization.options.seriesOptions;
    this.updateOptions({
      globalSeriesType: selected.value,
      showDataLabels: this.props.visualization.options.globalSeriesType === 'pie',
      seriesOptions: { ...sOpts, type: selected.value },
    });
  }

  toggleDataLabels = e => this.updateOptions({ showDataLabels: e.target.checked })
  toggleShowPoints = e => this.updateOptions({ showpoints: e.target.checked })
  toggleConsoleLogs = e => this.updateOptions({ enableConsoleLogs: e.target.checked })
  toggleAutoRedraw = e => this.updateOptions({ autoRedraw: e.target.checked })

  toggleShowLegend = e => this.updateOptions({
    legend: {
      ...this.props.visualization.options.legend,
      enabled: e.target.checked,
    },
  })

  togglePercentValues = e => this.updateOptions({
    series: {
      ...this.props.visualization.options.series,
      percentValues: e.target.checked,
    },
  })

  toggleSortX = e => this.updateOptions({ sortX: e.target.checked })

  toggleXLabels = e => this.updateOptions({
    xAxis: {
      ...this.props.visualization.options.xAxis,
      labels: {
        ...this.props.visualization.options.xAxis.labels,
        enabled: e.target.checked,
      },
    },
  })

  updateXAxisLabelLength = xAxisLabelLength => this.updateOptions({ xAxisLabelLength })
  updateXAxis = x => this.updateColumn({ x })
  updateYAxis = (ys) => {
    const newColMap = { ...this.props.visualization.options.columnMapping };
    each(ys, (col) => { newColMap[col] = 'y'; });
    this.updateOptions({ columnMapping: newColMap });
  }
  updateGroupby = groupby => this.updateColumn({ groupby })
  updateSizeColumn = size => this.updateColumn({ size })
  updateErrorColumn = yError => this.updateColumn({ yError })
  updateStacking = stacking => this.updateOptions({ series: { ...this.props.visualization.options.series, stacking } })
  updateSeriesList = seriesList => this.setState({ seriesList })
  updateSeriesOptions = seriesOptions => this.updateOptions({ seriesOptions })
  updateColorsList = colorsList => this.setState({ colorsList })
  updateCustomCode = customCode => this.updateOptions({ customCode })
  updateXAxisType = type => this.updateOptions({ xAxis: { ...this.props.visualization.options.xAxis, type } })
  updateXAxisName = e => this.updateOptions({
    xAxis: {
      ...this.props.visualization.options.xAxis,
      title: {
        ...this.props.visualization.options.xAxis.title,
        text: e.target.value,
      },
    },
  })

  yAxisPanel = (side, i) => {
    const yAxis = this.props.visualization.options.yAxis[i];
    return (
      <div>
        <h4>{side} Y Axis</h4>
        <div className="form-group">
          <label className="control-label">Scale</label>
          <Select
            placeholder="Choose Scale..."
            options={[
              { label: 'Datetime', value: 'datetime' },
              { label: 'Linear', value: 'linear' },
              { label: 'Logarithmic', value: 'logarithmic' },
              { label: 'Category', value: 'category' },
            ]}
            value={yAxis.type}
            onChange={this.updateYAxisScale[i]}
          />
        </div>
        <div className="form-group">
          <label className="control-label">Name</label>
          <input value={yAxis.title && yAxis.title.text} onChange={this.updateYAxisText[i]} type="text" className="form-control" />
        </div>
        <div className="form-group">
          <label className="control-label">Min Value</label>
          <input value={yAxis.rangeMin || ''} onChange={this.updateYAxisRangeMin[i]} type="number" step="any" placeholder="Auto" className="form-control" />
        </div>
        <div className="form-group">
          <label className="control-label">Max Value</label>
          <input value={yAxis.rangeMax || ''} onChange={this.updateYAxisRangeMax[i]} type="number" step="any" placeholder="Auto" className="form-control" />
        </div>
      </div>
    );
  }

  render() {
    const opts = this.props.visualization.options;
    const tabs = {
      general: (
        <div className="m-t-10 m-b-10">
          <div className="form-group">
            <label className="control-label">Chart Type</label>
            <ChartTypePicker
              value={opts.globalSeriesType}
              onChange={this.chartTypeChanged}
              clientConfig={this.props.clientConfig}
            />
          </div>
          {includes(['line', 'area', 'column', 'scatter'], opts.globalSeriesType) ?
            <div className="checkbox">
              <label htmlFor="chart-editor-general-showdatalabels">
                <input
                  id="chart-editor-general-showdatalabels"
                  type="checkbox"
                  checked={opts.showDataLabels || false}
                  onChange={this.toggleDataLabels}
                /> Show data labels
              </label>
            </div> : '' }
          <div className={'form-group' + (!opts.xAxisColumn ? ' has-error' : '')}>
            <label className="control-label">X Column</label>
            <Select
              placeholder="Choose column..."
              value={this.getXAxisColumn()}
              options={this.xAxisOptions()}
              onChange={this.updateXAxis}
            />
          </div>

          <div className={'form-group' + (opts.yAxisColumns && opts.yAxisColumns.length > 0 ? '' : ' has-error')}>
            <label className="control-label">Y Columns</label>

            <Select
              placeholder="Choose columns..."
              value={this.getYAxisColumns()}
              options={this.yAxisOptions()}
              onChange={this.updateYAxis}
              multi
            />
          </div>

          {opts.globalSeriesType !== 'custom' ?
            <div className="form-group">
              <label className="control-label">Group by</label>
              <Select
                placeholder="Choose column..."
                value={this.getGroupby()}
                options={this.groupbyOptions()}
                onChange={this.updateGroupby}
              />
            </div> : ''}

          {some(opts.seriesOptions, { type: 'bubble' }) ?
            <div className="form-group">
              <label className="control-label">Bubble size column</label>
              <Select
                placeholder="Choose column..."
                value={this.getSizeColumn()}
                options={this.sizeColumnOptions()}
                onChange={this.updateSizeColumn}
              />
            </div> : '' }

          {opts.globalSeriesType !== 'custom' ?
            <div className="form-group">
              <label className="control-label">Errors column</label>
              <Select
                placeholder="Choose column..."
                value={this.getErrorColumn()}
                options={this.xAxisOptions()}
                onChange={this.updateErrorColumn}
              />
            </div> : ''}

          {opts.globalSeriesType === 'custom' ?
            <div className="checkbox">
              <label>
                <input
                  type="checkbox"
                  onChange={this.toggleShowLegend}
                  checked={opts.legend.enabled}
                />
                <i className="input-helper" /> Show Legend
              </label>
            </div> : ''}

          {opts.globalSeriesType === 'box' ?
            <div className="checkbox">
              <label>
                <input
                  type="checkbox"
                  onChange={this.toggleShowPoints}
                  checked={opts.showpoints}
                />
                <i className="input-helper" /> Show All Points
              </label>
            </div> : ''}

          {opts.globalSeriesType !== 'custom' ?
            <div className="form-group">
              <label className="control-label">Stacking</label>
              <Select
                placeholder="Choose stacking..."
                disabled={!includes(['line', 'area', 'column'], opts.globalSeriesType)}
                options={[{ value: 'disabled', label: 'Disabled' }, { value: 'stack', label: 'Stack' }]}
                value={opts.series.stacking}
                onChange={this.updateStacking}
              />
            </div> : '' }

          {includes(['line', 'area', 'column'], opts.globalSeriesType) ?
            <div className="checkbox">
              <label className="control-label">
                <input
                  type="checkbox"
                  onChange={this.togglePercentValues}
                  checked={opts.series.percentValues || false}
                />
                Normalize values to percentage
              </label>
            </div> : ''}

          {opts.globalSeriesType === 'custom' ?
            <React.Fragment>
              <div className="form-group">
                <label className="control-label">Custom code</label>
                <textarea
                  value={opts.customCode || DEFAULT_CUSTOM_CODE}
                  onChange={this.updateCustomCode}
                  className="form-control v-resizable"
                  rows="10"
                />
              </div>
              <div className="checkbox">
                <label>
                  <input
                    type="checkbox"
                    onChange={this.toggleConsoleLogs}
                    checked={opts.enableConsoleLogs || false}
                  />
                  <i className="input-helper" /> Show errors in the console
                </label>
              </div>
              <div className="checkbox">
                <label>
                  <input
                    type="checkbox"
                    onChange={this.toggleAutoRedraw}
                    checked={opts.autoRedraw || false}
                  />
                  <i className="input-helper" /> Auto update graph
                </label>
              </div>
            </React.Fragment> : ''}
        </div>
      ),
      xAxis: (
        <div className="m-t-10 m-b-10">
          <div className="form-group">
            <label className="control-label">Scale</label>
            <Select
              placeholder="Choose scale..."
              value={opts.xAxis.type}
              options={map(
                ['datetime', 'linear', 'logarithmic', 'category'],
                value => ({ label: capitalize(value), value }),
              )}
              onChange={this.updateXAxisType}
            />
          </div>

          <div className="form-group">
            <label className="control-label">Name</label>
            <input value={opts.xAxis.title && opts.xAxis.title.text} type="text" className="form-control" onChange={this.updateXAxisName} />
          </div>

          <div className="checkbox">
            <label>
              <input
                type="checkbox"
                onChange={this.toggleSortX}
                checked={opts.sortX}
              />
              <i className="input-helper" /> Sort Values
            </label>
          </div>

          <div className="checkbox">
            <label>
              <input
                type="checkbox"
                onChange={this.toggleXLabels}
                checked={opts.xAxis.labels.enabled}
              />
              <i className="input-helper" /> Show Labels
            </label>
          </div>

          <div className="form-group">
            <label className="control-label">Label Length</label>
            <input name="x-axis-label-length" type="number" className="form-control" value={opts.xAxisLabelLength} onChange={this.updateXAxisLabelLength} />
            <span className="info">How many characters should X Axis Labels be truncated at in the legend?</span>
          </div>
        </div>
      ),
      yAxis: (
        <div className="m-t-10 m-b-10">
          {this.yAxisPanel('Left', 0)}
          {this.yAxisPanel('Right', 1)}
        </div>
      ),
      series: (
        <ChartSeriesEditor
          seriesOptions={opts.seriesOptions}
          seriesList={this.state.seriesList}
          updateSeriesList={this.updateSeriesList}
          updateSeriesOptions={this.updateSeriesOptions}
          clientConfig={this.props.clientConfig}
        />
      ),
      color: (
        <ChartColorEditor
          seriesOptions={opts.seriesOptions}
          colorsList={this.state.colorsList}
          updateColorsList={this.updateColorsList}
          updateSeriesOptions={this.updateSeriesOptions}
        />
      ),
    };
    // XXX 'ng-click' retained here merely because of existing CSS
    return (
      <div>
        <ul className="tab-nav">
          <li className={this.state.currentTab === 'general' ? 'active' : ''}>
            <a data-tabname="general" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>General</a>
          </li>
          {opts.globalSeriesType !== 'custom' ?
            <React.Fragment>
              <li className={this.state.currentTab === 'xAxis' ? 'active' : ''}>
                <a data-tabname="xAxis" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>X Axis</a>
              </li>
              <li className={this.state.currentTab === 'yAxis' ? 'active' : ''}>
                <a data-tabname="yAxis" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>Y Axis</a>
              </li>
              {opts.globalSeriesType !== 'pie' ?
                <li className={this.state.currentTab === 'series' ? 'active' : ''}>
                  <a data-tabname="series" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>Series</a>
                </li> :
                <li className={this.state.currentTab === 'colors' ? 'active' : ''}>
                  <a data-tabname="colors" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>Colors</a>
                </li>}
            </React.Fragment> : ''}
        </ul>
        {tabs[this.state.currentTab]}
      </div>
    );
  }
}
