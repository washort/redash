import React from 'react';
import PropTypes from 'prop-types';

import { visualizationRegistry } from '@/visualizations';
import QueryExecutionStatus from './QueryExecutionStatus';
import VisualizationRenderer from './VisualizationRenderer';
import Parameters from './Parameters';

function RdTab(props) {
  return (
    <li className={'rd-tab' + (props.tabId === props.selectedTab ? ' active' : '')}>
      <a onClick={e => props.onClick(e, props.tabId)} href={`${props.basePath}#${props.tabId}`}>{props.name}{...props.children}</a>
    </li>
  );
}

RdTab.propTypes = {
  tabId: PropTypes.string.isRequired,
  selectedTab: PropTypes.string.isRequired,
  basePath: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  children: PropTypes.arrayOf(React.Component).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default class QueryViewVisualizations extends React.Component {
  static propTypes = {
    query: PropTypes.object.isRequired,
    queryResult: PropTypes.instanceOf(PromiseState).isRequired,
    sourceMode: PropTypes.bool.isRequired,
    canEdit: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);
    const vis = props.query.visualizations;
    this.state = {
      selectedTab: vis && vis.length ? vis[0] : 'table',
    };
  }

  render() {
    return (
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
                syncValues={!!this.props.query.id}
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
    );
  }
}
