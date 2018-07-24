import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import { connect, PromiseState } from 'react-refetch';

import QueryMetadata from './QueryMetadata';
import SchemaBrowser from './SchemaBrowser';

export default class QueryViewNav extends React.Component {
  static propTypes = {
    query: PropTypes.object.isRequired,
    updateQuery: PropTypes.func.isRequired,
    isQueryOwner: PropTypes.bool.isRequired,
    dataSource: PropTypes.object.isRequired,
    dataSourceVersion: PropTypes.instanceOf(PromiseState).isRequired,
    dataSources: PropTypes.object.isRequired,
    sourceMode: PropTypes.bool.isRequired,
    setDataSource: PropTypes.func.isRequired,
    schema: PropTypes.instanceOf(PromiseState).isRequired,
    refreshSchema: PropTypes.func.isRequired,
  }


  render() {
    const dataSourceVersionMsg = this.props.dataSourceVersion.fulfilled ? this.props.dataSourceVersion.value.message : '';
    return (
      <nav resizable r-directions="['right']" r-flex="true" resizable-toggle>
        <div className="editor__left__data-source">
          <Select
            value={this.props.dataSource}
            onChange={this.setDataSource}
            disabled={!this.isQueryOwner || !this.props.sourceMode}
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
