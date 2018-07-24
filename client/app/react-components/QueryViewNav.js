import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import { connect, PromiseState } from 'react-refetch';

import QueryMetadata from './QueryMetadata';
import SchemaBrowser from './SchemaBrowser';

class QueryViewNav extends React.Component {
  static propTypes = {
    dataSource: PropTypes.object.isRequired,
    dataSourceVersion: PropTypes.instanceOf(PromiseState).isRequired,
    dataSources: PropTypes.object.isRequired,
    sourceMode: PropTypes.bool.isRequired,
    setDataSource: PropTypes.func.isRequired,
  }


  getSchema(refresh) {
    this.props.dataSource.getSchema(refresh).then((data) => {
      if (data.schema) {
        this.setState({ schema: data.schema });
      } else if (data.error.code === SCHEMA_NOT_SUPPORTED) {
        this.setState({ schema: undefined });
      } else if (data.error.code === SCHEMA_LOAD_ERROR) {
        toastr.error('Schema refresh failed. Please try again later.');
      } else {
        toastr.error('Schema refresh failed. Please try again later.');
      }
    });
  }

  refreshSchema = () => this.getSchema(true);


  render() {
    if (!this.props.dataSourceVersion.fulfilled) return null;

    const dataSourceVersionMsg = this.props.dataSourceVersion.value.message;
    return (
      <nav resizable r-directions="['right']" r-flex="true" resizable-toggle>
        <div className="editor__left__data-source">
          <Select
            value={this.props.dataSource}
            onChange={this.setDataSource}
            disabled={!this.isQueryOwner || !this.sourceMode}
            placeholder="Select Data Source..."
            options={this.props.dataSources.map(d => ({ value: d.id, label: d.name }))}
          />
          {this.props.dataSource.options.doc_url !== '' && this.props.dataSource.options.doc_url ? <a href={this.props.dataSource.options.doc_url}>{this.props.dataSource.type_name} documentation</a> : '' }
          {this.props.dataSource.options.doc_url === '' || !this.props.dataSource.options.doc_url ? <span>{this.props.dataSource.type_name} documentation</span> : ''}
          {dataSourceVersionMsg.includes('no') ? <span className="fa fa-exclamation-circle" title={dataSourceVersionMsg} /> : <span>{dataSourceVersionMsg}</span>}
        </div>
        {this.props.sourceMode ?
          <div className="editor__left__schema">
            <SchemaBrowser
              schema={this.props.dataSource.schema}
              tableToggleString={this.props.dataSource.options.toggle_table_string}
              onRefresh={this.refreshSchema}
              editorPaste={this.editorPaste}
            />
          </div> :
          <div style={{ 'flex-grow': 1 }}>&nbsp;</div>
        }
        <QueryMetadata
          mobile={false}
          query={this.props.query}
          saveQuery={this.saveQuery}
          canEdit={this.canEdit}
          canScheduleQuery={this.canScheduleQuery}
          schedule={this.props.query.schedule}
        />
      </nav>

    );
  }
}

function fetchDataSourceVersion(props) {
  return {
    dataSourceVersion: {
      url: `${props.basePath}api/data_sources/${props.query.data_source_id}/version`,
    },
  };
}

export default connect(fetchDataSourceVersion)(QueryViewNav);
