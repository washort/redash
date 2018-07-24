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
    dataSources: PropTypes.object.isRequired,
    sourceMode: PropTypes.bool.isRequired,
    canEdit: PropTypes.bool.isRequired,
  }


  render() {
    return (
      <main className="query-fullscreen">
        <QueryViewNav
          basePath={this.props.basePath}
          query={this.state.query}
        />
      </main>
    );
  }
}
