import React from 'react';
import PropTypes from 'prop-types';
import { PromiseState } from 'react-refetch';
import { includes } from 'lodash';
import { visualizationRegistry } from '@/visualizations';
import Filters from './Filters';

const filterTypes = ['filter', 'multi-filter', 'multiFilter'];

function getColumnNameWithoutType(column) {
  let typeSplit;
  if (column.indexOf('::') !== -1) {
    typeSplit = '::';
  } else if (column.indexOf('__') !== -1) {
    typeSplit = '__';
  } else {
    return column;
  }

  const parts = column.split(typeSplit);
  if (parts[0] === '' && parts.length === 2) {
    return parts[1];
  }

  if (!includes(filterTypes, parts[1])) {
    return column;
  }

  return parts[0];
}

export function getColumnCleanName(column) {
  return getColumnNameWithoutType(column);
}

function getColumnFriendlyName(column) {
  return getColumnNameWithoutType(column).replace(/(?:^|\s)\S/g, a =>
    a.toUpperCase());
}

function getFilters(queryResult) {
  const filters = [];
  queryResult.data.columns.forEach((col) => {
    const name = col.name;
    const type = name.split('::')[1] || name.split('__')[1];
    if (includes(filterTypes, type)) {
      // filter found
      const filter = {
        name,
        friendlyName: getColumnFriendlyName(name),
        column: col,
        values: [],
        multiple: (type === 'multiFilter') || (type === 'multi-filter'),
      };
      filters.push(filter);
    }
  });
  return filters;
}

export default class VisualizationRenderer extends React.Component {
  static propTypes = {
    queryResult: PropTypes.instanceOf(PromiseState).isRequired,
    visualization: PropTypes.object.isRequired,
  }
  constructor(props) {
    super(props);
    this.state = {
      filterState: [],
    };
  }

  setFilters = (filterState) => {
    this.setState({ filterState });
  }
  render() {
    const Vis = visualizationRegistry[this.props.visualization.type].renderer;
    if (this.props.queryResult.fulfilled) {
      const filters = getFilters(this.props.queryResult.value);
      return (
        <React.Fragment>
          {/* XXX replace this mutation with a clean separation of filter info from selection state */}
          <Filters filters={filters} filterState={this.state.filterState} onChange={this.setFilters} />
          <Vis
            filters={filters}
            options={this.props.visualization.options}
            queryResult={this.props.queryResult.value}
            clientConfig={this.props.clientConfig}
          />
        </React.Fragment>
      );
    }
    return null;
  }
}
