import React from 'react';
import PropTypes from 'prop-types';
import { connect, PromiseState } from 'react-refetch';

import QueryViewNav from './QueryViewNav';

class QueryViewMain extends React.Component {
  static propTypes = {
    currentUser: PropTypes.object.isRequired,
    query: PropTypes.object.isRequired,
    updateAndSaveQuery: PropTypes.func.isRequired,
    dataSources: PropTypes.object.isRequired,
    dataSource: PropTypes.object.isRequired,
    dataSourceVersion: PropTypes.instanceOf(PromiseState).isRequired,
    setDataSource: PropTypes.func.isRequired,
    sourceMode: PropTypes.bool.isRequired,
    canEdit: PropTypes.bool.isRequired,
    schema: PropTypes.instanceOf(PromiseState).isRequired,
    refreshSchema: PropTypes.func.isRequired,
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
        />
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

