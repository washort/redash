import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import { SortableContainer, SortableElement, SortableHandle, arrayMove } from 'react-sortable-hoc';

const chartTypes = {
  line: { name: 'Line', icon: 'line-chart' },
  column: { name: 'Bar', icon: 'bar-chart' },
  area: { name: 'Area', icon: 'area-chart' },
  pie: { name: 'Pie', icon: 'pie-chart' },
  scatter: { name: 'Scatter', icon: 'circle-o' },
  bubble: { name: 'Bubble', icon: 'circle-o' },
  box: { name: 'Box', icon: 'square-o' },
};

export default class ChartSeriesEditor extends React.Component {
  static propTypes = {
    seriesList: PropTypes.array.isRequired,
    seriesOptions: PropTypes.object.isRequired,
    updateSeriesList: PropTypes.func.isRequired,
    updateSeriesOptions: PropTypes.func.isRequired,
  }

  onSortEnd = ({ oldIndex, newIndex }) => {
    this.props.updateSeriesList(arrayMove(this.props.seriesList, oldIndex, newIndex));
  };

  updateSeriesOptions = (k, v) => {
    const seriesOptions = Object.assign(
      {}, this.props.seriesOptions,
      { [k]: Object.assign({}, this.props.seriesOptions[k], v) },
    );
    this.props.updateSeriesOptions(seriesOptions);
  }

  changeYAxis = (e, target, yAxis) => {
    if (e.target.checked) {
      this.updateSeriesOptions(target, { yAxis });
    }
  }

  changeName = (value, name) => this.updateSeriesOptions(value, { name });
  changeType = (value, type) => this.updateSeriesOptions(value, { type });
  changeColor = (value, color) => this.updateSeriesOptions(value, { color });

  render() {
    const colors = Object.assign({ Automatic: null }, this.props.ColorPalette);
    const colorSelectItem = opt => (<span style={{
      width: 12, height: 12, backgroundColor: opt.value, display: 'inline-block', marginRight: 5,
    }}
    />);
    const colorOptionItem = opt => <span style={{ textTransform: 'capitalize' }}>{colorSelectItem(opt)}{opt.label}</span>;
    const typeItem = (opt, i) => <div><i className={'fa fa-' + opt.icon} /> {opt.label}</div>;
    const DragHandle = SortableHandle(({ value }) => <td style={{ cursor: 'move' }}><i className="fa fa-arrows-v" />{ this.props.seriesOptions[value].zIndex + 1 }</td>);
    const SortableItem = SortableElement(({ value }) => (
      <tr>
        <DragHandle value={value} />
        <td>
          <input type="radio" checked={!this.props.seriesOptions[value].yAxis} onChange={e => this.changeYAxis(e, value, 0)} />
        </td>
        <td>
          <input type="radio" checked={this.props.seriesOptions[value].yAxis} onChange={e => this.changeYAxis(e, value, 1)} />
        </td>
        <td style={{ padding: 3, width: 140 }}>
          <input
            placeholder={value}
            className="form-control input-sm super-small-input"
            type="text"
            defaultValue={this.props.seriesOptions[value].name}
            // XXX Should this be onChange?
            onBlur={e => this.changeName(value, e.target.value)}
          />
        </td>
        <td style={{ padding: 3, width: 35 }}>
          <Select
            value={this.props.seriesOptions[value].color}
            valueRenderer={colorSelectItem}
            options={Object.keys(colors).map(key => ({ value: colors[key], label: key }))}
            optionRenderer={colorOptionItem}
            clearable={false}
            menuContainerStyle={{ width: 160 }}
            onChange={selection => this.changeColor(value, selection.value)}
          />
        </td>
        <td style={{ padding: 3, width: 105 }}>
          <Select
            value={this.props.seriesOptions[value].type}
            valueRenderer={typeItem}
            clearable={false}
            options={Object.keys(chartTypes).map(t => ({
              value: t,
              label: chartTypes[t].name,
              icon: chartTypes[t].icon,
            }))}
            optionRenderer={typeItem}
            onChange={selected => this.changeType(value, selected.value)}
            distance={4}
          />
        </td>
      </tr>
    ));
    const SortableRow = SortableContainer(({ items }) => (
      <tbody>
        {items.map((param, index) => (
          <SortableItem
            key={`item-${param}`}
            index={index}
            value={param}
          />))}
      </tbody>));

    return (
      <div className="m-t-10 m-b-10">
        <table className="table table-condensed col-table">
          <thead>
            <tr>
              <th>zIndex</th>
              <th>Left Y Axis</th>
              <th>Right Y Axis</th>
              <th>Label</th>
              <th>Color</th>
              <th>Type</th>
            </tr>
          </thead>
          <SortableRow useDragHandle items={this.props.seriesList} axis="y" onSortEnd={this.onSortEnd} helperClass="sortable-helper" />
        </table>
      </div>
    );
  }
}
