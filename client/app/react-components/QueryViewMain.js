import React from 'react';
import PropTypes from 'prop-types';
import { connect, PromiseState } from 'react-refetch';
import Mustache from 'mustache';
import { includes, some, union, uniq } from 'lodash';
import moment from 'moment';

import QueryViewNav from './QueryViewNav';
import QueryViewVisualizations from './QueryViewVisualizations';
import QueryViewFooter from './QueryViewFooter';
import QueryEditor from './QueryEditor';
import QueryMetadata from './QueryMetadata';


function collectParams(parts) {
  let parameters = [];

  parts.forEach((part) => {
    if (part[0] === 'name' || part[0] === '&') {
      parameters.push(part[1]);
    } else if (part[0] === '#') {
      parameters = union(parameters, collectParams(part[4]));
    }
  });

  return parameters;
}

function parseQuery(query) {
  return uniq(collectParams(Mustache.parse(query)));
}

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

function filterData(filters, queryResult) {
  return queryResult.data.rows.filter(row =>
    filters.reduce((memo, filter) => (
      memo && some(filter.current, (v) => {
        const value = row[filter.name];
        if (moment.isMoment(value)) {
          return value.isSame(v);
        }
        // We compare with either the value or the String representation of the value,
        // because Select2 casts true/false to "true"/"false".
        return (v === value || String(value) === v);
      }))), true);
}

class QueryViewMain extends React.Component {
  static propTypes = {
    currentUser: PropTypes.object.isRequired,
    query: PropTypes.object.isRequired,
    updateAndSaveQuery: PropTypes.func.isRequired,
    updateQuery: PropTypes.func.isRequired,
    queryResult: PropTypes.instanceOf(PromiseState).isRequired,
    dataSources: PropTypes.array.isRequired,
    dataSource: PropTypes.object.isRequired,
    dataSourceVersion: PropTypes.instanceOf(PromiseState).isRequired,
    setDataSource: PropTypes.func.isRequired,
    sourceMode: PropTypes.bool.isRequired,
    canEdit: PropTypes.bool.isRequired,
    schema: PropTypes.instanceOf(PromiseState).isRequired,
    refreshSchema: PropTypes.func.isRequired,
    clientConfig: PropTypes.object.isRequired,
    executeQuery: PropTypes.func.isRequired,
    executeQueryResponse: PropTypes.instanceOf(PromiseState).isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      queryResult: null, // eslint-disable-line react/no-unused-state
      queryExecuting: false,
      filters: [],
      filteredData: [],
    };
  }

  static getDerivedStateFromProps(oldState, newProps) {
    if (newProps.queryResult &&
        newProps.queryResult.fulfilled &&
        oldState.queryResult !== newProps.queryResult.value) {
      const data = newProps.queryResult.value;
      const filters = getFilters(data);
      return {
        queryResult: data,
        filters,
        filteredData: filterData(filters, data),
      };
    }
    return null;
  }

  setFilters = filters => this.setState({ filters })

  canExecuteQuery = () => this.props.currentUser.hasPermission('execute_query') && !this.props.dataSource.view_only

  editorPaste = text => text;

  saveQuery = () => this.props.updateAndSaveQuery({})

  updateQueryText = newText => this.props.updateQuery({
    query: newText,
    options: {
      ...this.props.query.options,
      parameters: parseQuery(newText),
    },
  })

  render() {
    return (
      <main className="query-fullscreen">
        <QueryViewNav
          canEdit={this.props.canEdit}
          currentUser={this.props.currentUser}
          query={this.props.query}
          updateAndSaveQuery={this.props.updateAndSaveQuery}
          dataSource={this.props.dataSource}
          dataSourceVersion={this.props.dataSourceVersion}
          dataSources={this.props.dataSources}
          sourceMode={this.props.sourceMode}
          setDataSource={this.props.setDataSource}
          schema={this.props.schema}
          refreshSchema={this.props.refreshSchema}
          editorPaste={this.editorPaste}
          clientConfig={this.props.clientConfig}
        />
        <div className="content">
          <div className="flex-fill p-relative">
            <div
              className="p-absolute d-flex flex-column p-l-15 p-r-15"
              style={{
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
              }}
            >
              {this.props.sourceMode ?
                <div
                  className="row editor"
                  resizable
                  r-directions="['bottom']"
                  r-flex="true"
                  resizable-toggle
                  style={{ 'min-height': 11, 'max-height': 70 }}
                >
                  <QueryEditor
                    ref={this.queryEditor}
                    style={{ width: '100%', height: '100%' }}
                    queryText={this.props.query.query}
                    autocompleteQuery={this.autocompleteQuery}
                    schema={this.state.dataSource.schema}
                    syntax={this.state.dataSource.syntax}
                    isQueryOwner={this.props.isQueryOwner}
                    updateDataSource={this.updateDataSource}
                    executeQuery={this.props.executeQuery}
                    canExecuteQuery={this.canExecuteQuery()}
                    listenForResize={this.listenForResize}
                    saveQuery={this.saveQuery}
                    updateQuery={this.updateQueryText}
                    dataSource={this.state.dataSource}
                    dataSources={this.props.dataSources}
                  />
                </div> : ''}
              <QueryMetadata
                mobile
                query={this.props.query}
                saveQuery={this.saveQuery}
                canEdit={this.props.canEdit}
                canScheduleQuery={this.canScheduleQuery}
                schedule={this.props.query.schedule}
                clientConfig={this.props.clientConfig}
              />
              <QueryViewVisualizations
                clientConfig={this.props.clientConfig}
                query={this.props.query}
                updateQuery={this.props.updateQuery}
                searchQueries={this.props.searchQueries}
                queryResult={this.props.queryResult}
                sourceMode={this.props.sourceMode}
                canEdit={this.props.canEdit}
                setFilters={this.setFilters}
                filters={this.state.filters}
                executeQueryResponse={this.props.executeQueryResponse}
                queryExecuting={this.state.queryExecuting}
              />
            </div>
          </div>
          <div className="bottom-controller-container">
            <QueryViewFooter
              query={this.props.query}
              queryResult={this.props.queryResult}
              canEdit={this.props.canEdit}
              filteredData={this.state.filteredData}
              selectedTab={this.state.selectedTab}
              queryExecuting={this.state.queryExecuting}
              canExecuteQuery={this.canExecuteQuery()}
            />
          </div>
        </div>
      </main>
    );
  }
}

function fetchDataSource(props) {
  if (props.dataSource) {
    const versionURL = `${props.clientConfig.basePath}api/data_sources/${props.dataSource.id}/version`;
    const schemaURL = `${props.clientConfig.basePath}api/data_sources/${props.dataSource.id}/schema`;

    return {
      dataSourceVersion: {
        url: versionURL,
      },
      schema: {
        url: schemaURL,
      },
      refreshSchema: () => ({
        schema: {
          url: schemaURL,
          force: true,
          refreshing: true,
        },
      }),
    };
  }
  return {};
}

export default connect(fetchDataSource)(QueryViewMain);

