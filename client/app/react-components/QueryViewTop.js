import React from 'react';
import PropTypes from 'prop-types';
import { connect, PromiseState } from 'react-refetch';
import QueryViewHeader from './QueryViewHeader';
import AlertUnsavedChanges from './AlertUnsavedChanges';

class QueryViewTop extends React.Component {
  static propTypes = {
    // queryId: PropTypes.number.isRequired,
    query: PropTypes.instanceOf(PromiseState).isRequired,
    updateQuery: PropTypes.func.isRequired,
    dataSources: PropTypes.instanceOf(PromiseState),
    sourceMode: PropTypes.bool.isRequired,
    $rootScope: PropTypes.object.isRequired,
  }

  static defaultProps = {
    dataSources: null,
  }

  constructor(props) {
    super(props);
    this.state = {
      isDirty: false,
    };
  }

  // XXX tied to angular routing
  onChangeLocation = cb => this.props.$rootScope.$on('$locationChangeStart', cb);

  updateQuery = (changes) => {
    const newQuery = Object.assign({}, this.props.query, changes);
    this.props.updateQuery(newQuery);
  }

  render() {
    if (!(this.props.query.fulfilled && this.props.dataSources && this.props.dataSources.fulfilled)) {
      return null;
    }
    const query = this.props.query.value;
    const dataSources = this.props.dataSources.value;
    const dataSource = find(dataSources, ds => ds.id === query.data_source_id);
    const canEdit = this.props.currentUser.canEdit(query) || query.can_edit;
    return (
      <div className="query-page-wrapper">
        {canEdit ? <AlertUnsavedChanges isDirty={this.state.isDirty} onChangeLocation={this.onChangeLocation} /> : ''}
        <QueryViewHeader
          query={query}
          updateQuery={this.updateQuery}
          currentUser={this.props.currentUser}
          hasDataSources={dataSources.length > 0}
          dataSource={dataSource}
          sourceMode={this.props.sourceMode}
          canEdit={canEdit}
          isDirty={this.state.isDirty}
          showPermissionsControl={this.props.clientConfig.showPermissionsControl}
          Events={this.props.Events}
        />
      </div>
    );
  }
}

function fetchQuery(props) {
  if (props.queryId) {
    return {
      query: {
        url: `${props.clientConfig.basePath}api/queries/${props.queryId}`,
        andThen: query => ({
          dataSources: {
            url: `${props.clientConfig.basePath}api/data_sources`,
            then: dataSources => ({
              value: dataSources.filter(dataSource =>
                (!dataSource.viewOnly || dataSource.id === query.data_source_id)),
            }),
          },
        }),
      },
      updateQuery: newQuery => ({
        query: { value: newQuery },
        updateQueryResponse: {
          url: `${props.clientConfig.basePath}api/queries/${props.queryId}`,
          method: 'POST',
          body: newQuery,
        },
      }),
    };
  }
  return {};
}

export default connect(fetchQuery)(QueryViewTop);
