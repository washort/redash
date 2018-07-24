import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import { connect, PromiseState } from 'react-refetch';

import QueryMetadata from './QueryMetadata';
import SchemaBrowser from './SchemaBrowser';

export default class QueryViewMain extends React.Component {
  static propTypes = {
    query: PropTypes.object.isRequired,
    updateQuery: PropTypes.func.isRequired,
    isQueryOwner: PropTypes.bool.isRequired,
    dataSources: PropTypes.object.isRequired,
    dataSource:  PropTypes.object.isRequired,
    dataSourceVersion:  PropTypes.instanceOf(PromiseState).isRequired,
    updateDataSource: PropTypes.func.isRequired,
    sourceMode: PropTypes.bool.isRequired,
    canEdit: PropTypes.bool.isRequired,
    schema: PropTypes.instanceOf(PromiseState).isRequired,
    refreshSchema: PropTypes.func.isRequired,
  }

  render() {
    return (
      <main className="query-fullscreen">
        <QueryViewNav
          query={this.props.query}
          isQueryOwner={this.props.isQueryOwner}
          updateQuery={this.props.updateQuery}
          dataSource={this.props.dataSource}
          dataSource={this.props.dataSourceVersion}
          dataSources={this.props.dataSources}
          sourceMode={this.props.sourceMode}
          setDataSource={this.props.setDataSource}
          schema={this.props.schema}
          refreshSchema={this.props.refreshSchema}
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
        url:schemaURL,
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

export default connect(fetchDataSource)(QueryViewMain)
