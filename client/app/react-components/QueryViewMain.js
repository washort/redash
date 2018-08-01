import React from 'react';
import PropTypes from 'prop-types';
import { connect, PromiseState } from 'react-refetch';

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
  let parameters = [];
  const parts = Mustache.parse(query);
  return uniq(collectParams(parts));
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
  }

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
                <div className="row editor" resizable r-directions="['bottom']" r-flex="true" resizable-toggle
                  style="min-height: 11px; max-height: 70vh;">
                  <QueryEditor
                    ref={this.queryEditor}
                    style={{width: '100%', height: '100%'}}
                    queryText={this.props.query.query}
                    autocompleteQuery={this.autocompleteQuery}
                    schema={this.state.dataSource.schema}
                    syntax={this.state.dataSource.syntax}
                    isQueryOwner={this.props.isQueryOwner}
                    updateDataSource={this.updateDataSource}
                    executeQuery={this.executeQuery}
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
                schedule={this.query.schedule}
              />
              <QueryViewVisualizations
                query={this.props.query}
                updateQuery={this.props.updateQuery}
                queryResult={this.props.queryResult}
                sourceMode={this.props.sourceMode}
                canEdit={this.props.canEdit}
              />
            </div>
          </div>
          <div className="bottom-controller-container">
            <QueryViewFooter
              query={this.props.query}
              queryResult={this.props.queryResult}
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
    const queryResultURL = `${props.clientConfig.basePath}api/query_results/${props.dataSource.id}/schema`;
    return {
      dataSourceVersion: {
        url: versionURL,
      },
      schema: {
        url: schemaURL,
      },
      queryResult: {
        url: queryResultURL,
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
}

export default connect(fetchDataSource)(QueryViewMain);

