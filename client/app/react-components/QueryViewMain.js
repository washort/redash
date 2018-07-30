import React from 'react';
import PropTypes from 'prop-types';
import { connect, PromiseState } from 'react-refetch';

import QueryViewNav from './QueryViewNav';

class QueryViewMain extends React.Component {
  static propTypes = {
    currentUser: PropTypes.object.isRequired,
    query: PropTypes.object.isRequired,
    updateAndSaveQuery: PropTypes.func.isRequired,
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
                    updateQuery={this.updateQuery}
                    dataSource={this.state.dataSource}
                    dataSources={this.props.dataSources}
                  />
                </div> : ''}
              <QueryMetadata
                mobile
                query={this.props.query}
                saveQuery={this.saveQuery}
                canEdit={this.canEdit}
                canScheduleQuery={this.canScheduleQuery}
                schedule={this.query.schedule}
              />
              <QueryViewVisualizations
              query={this.props.query}
              queryResult={this.props.queryResult}/>
            </div>
          </div>
          <div className="bottom-controller-container">
            <div className="bottom-controller">
              {!this.props.query.isNew() && this.props.canEdit ?
                <button
                  className="m-r-5 btn btn-default btn-edit-visualisation"
                  onClick={this.openVisualizationEditor(this.state.selectedTab)}
                >Edit Visualization
                </button> : ''}
              {!this.props.query.isNew() ? <button className="m-r-5 btn btn-default" onClick={this.showEmbedDialog(this.props.query, this.state.selectedTab)}><i className="zmdi zmdi-code" /> Embed</button> : ''}

              <DropDownButton
                className="m-r-5 btn btn-default"
                disabled={this.state.queryExecuting || !this.props.queryResult.getData()}
                aria-haspopup="true"
                aria-expanded="false"
                title={<span>Download <span className="hidden-xs">Dataset </span></span>}
                onSelect={this.downloadQueryResult}
                pullRight={!this.props.query.isNew()}
              >
                <MenuItem eventKey="csv" className="dropdown-menu">
                  <span className="fa fa-file-o" /> Download as CSV File
                </MenuItem>
                <MenuItem eventKey="xlsx" className="dropdown-menu">
                  <span className="fa fa-file-excel-o" /> Download as Excel File
                </MenuItem>
              </DropDownButton>

              {data ?
                <span className="query-metadata__bottom">
                  <span className="query-metadata__property">
                    <strong>{data.length}</strong>
                    {data.length === 1 ? 'row' : 'rows'}
                  </span>
                  <span className="query-metadata__property">
                    {this.state.queryExecuting ?
                      <strong>{durationHumanize(this.props.queryResult.getRuntime())}</strong> :
                      <span>Running&hellip;</span>}
                    <span className="hidden-xs">runtime</span>
                  </span>
                  {data.metadata.data_scanned ?
                    <span className="query-metadata__property">
                      Data Scanned
                      <strong>
                        {prettySize(this.props.queryResult.query_result.data.metadata.data_scanned)}
                      </strong>
                    </span> : ''}
                </span> : ''}

              <div>
                <span className="query-metadata__property">
                  <span className="hidden-xs">Updated </span>
                  {moment(this.props.queryResult.query_result.retrieved_at).fromNow()}
                </span>

                <button
                  className="m-l-5 btn btn-primary"
                  onClick={this.executeQuery}
                  disabled={this.state.queryExecuting || !this.canExecuteQuery()}
                  title="Refresh Dataset"
                >
                  <span className="zmdi zmdi-play" />
                </button>
              </div>
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
}

export default connect(fetchDataSource)(QueryViewMain);

