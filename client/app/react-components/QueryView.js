
import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import { DropDownButton, MenuItem, OverlayTrigger, Popover } from 'react-bootstrap';
import { find, map, sortBy } from 'lodash';
import moment from 'moment';

import { durationHumanize, prettySize } from '@/filters';
import { visualizationRegistry } from '@/visualizations';
import AlertUnsavedChanges from './AlertUnsavedChanges';
import EditInPlaceText from './EditInPlaceText';
import Overlay from './Overlay';
import Parameters from './Parameters';
import QueryEditor from './QueryEditor';
import QueryExecutionStatus from './QueryExecutionStatus';
import VisualizationRenderer from './VisualizationRenderer';

export default class QueryView extends React.Component {
  static propTypes = {
    currentUser: PropTypes.object.isRequired,
    query: PropTypes.object.isRequired,
    dataSources: PropTypes.arrayOf(PropTypes.object).isRequired,
    queryResult: PropTypes.object,
    sourceMode: PropTypes.bool.isRequired,
    canEdit: PropTypes.bool.isRequired,
    showPermissionsControl: PropTypes.bool.isRequired,
  }

  static propDefaults = {
    queryResult: null,
  }
  constructor(props) {
    super(props);
    this.state = {
      isDirty: false,
      selectedTab: this.props.query.visualizations.length ? this.props.query.visualizations[0].id : 'Table',
      dataSource: this.getDataSource(this.props.dataSources),
      schema: null,
      showDataset: true,
      queryExecuting: false,
    }
    this.getSchema();
    this.queryEditor = React.createRef();
  }

  getDataSource(dataSources) {
    // Try to get the query's data source id
    let dataSourceId = this.props.query.data_source_id;

    // If there is no source yet, then parse what we have in localStorage
    //   e.g. `null` -> `NaN`, malformed data -> `NaN`, "1" -> 1
    if (dataSourceId === undefined) {
      dataSourceId = parseInt(localStorage.lastSelectedDataSourceId, 10);
    }

    const dataSource = find(dataSources, ds => ds.id === dataSourceId);
    // If we had an invalid value in localStorage (e.g. nothing, deleted source),
    // then use the first data source

    return dataSource || dataSources[0];

  }

  canExecuteQuery = () => this.props.currentUser.hasPermission('execute_query') && this.state.dataSource.view_only
  setSelectedTab = (e, selectedTab) => this.setState({ selectedTab })

  render() {
    const data = this.props.queryResult.getData();
    return (
      <div className="query-page-wrapper">
        <div className="container" />
        <main className="query-fullscreen">
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
                <section className="flex-fill p-relative t-body">
                  <div
                    className="d-flex flex-column p-b-15 p-absolute"
                    style={{
                      left: 0,
                      top: 0,
                      right: 0,
                      bottom: 0,
                    }}
                  >
                    {this.props.query.getParametersDefs().length > 0 ?
                      <div className="p-t-15 p-b-15">
                        <Parameters
                          parameters={this.props.query.getParametersDefs()}
                          query={this.props.query}
                          syncValues={!this.props.query.isNew()}
                          editable={this.props.sourceMode && this.props.canEdit}
                        />
                      </div> : ''}
                    <QueryExecutionStatus
                      query={this.props.query}
                      queryResult={this.props.queryResult}
                      status={this.props.queryResult.getStatus()}
                      Event={this.props.Event}
                    />
                    {/* tabs and data */}
                    {this.state.showDataset ?
                      <div className="flex-fill p-relative">
                        <div
                          className="d-flex flex-column p-absolute"
                          style={{
                            left: 0,
                            top: 0,
                            right: 0,
                            bottom: 0,
                          }}
                        >
                          {this.props.queryResult.getLog() ?
                            <div className="p-10">
                              <p>Log Information:</p>
                              {this.props.queryResult.getLog().map(l => <p>{l}</p>)}
                            </div> : ''}

                          <ul className="tab-nav">
                            {!this.props.query.visualizations.length ?
                              <RdTab
                                tabId="table"
                                name="Table"
                                selected={this.state.selectedTab}
                                basePath={this.props.query.getUrl(this.props.sourceMode)}
                                onClick={this.setSelectedTab}
                              /> : map(sortBy(this.props.query.visualizations, 'id'), (vis, i) => (
                                <RdTab
                                  tabId={vis.id}
                                  name={vis.name}
                                  selected={this.state.selectedTab}
                                  basePath={this.props.query.getUrl(this.props.sourceMode)}
                                  onClick={this.setSelectedTab}
                                >
                                  {this.props.canEdit && !((i > 0) && (vis.type === 'TABLE')) ?
                                    <span
                                      className="remove"
                                      onClick={e => this.deleteVisualization(e, vis)}
                                    > &times;
                                    </span> : ''}
                                  <span
                                    className="btn btn-xs btn-success"
                                    onClick={() => this.openAddToDashboardForm(vis)}
                                  > +
                                  </span>
                                </RdTab>
                              ))}
                            <li className="rd-tab">{this.props.sourceMode && this.props.canEdit ?
                              <a onClick={this.openVisualizationEditor}>&plus; New Visualization</a> : ''}
                            </li>
                          </ul>
                          <div className="query__vis m-t-15 scrollbox">
                            <VisualizationRenderer
                              visualization={this.props.query.visualizations.length ?
                                             find(
                                               this.props.query.visualizations,
                                               { id: this.state.selectedTab },
                                             ) : {
                                               type: visualizationRegistry.CHART.type,
                                               options: visualizationRegistry.CHART.defaultOptions,
                                             }}
                              queryResult={this.props.queryResult}
                            />
                          </div>
                        </div>
                      </div> : ''}
                  </div>
                </section>
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
          </div>
        </main>
      </div>
    );
  }
}
