import React from 'react';
import PropTypes from 'prop-types';
import { connect, PromiseState } from 'react-refetch';
import QueryViewHeader from './QueryViewHeader';
import QueryViewNav from './QueryViewNav';
import AlertUnsavedChanges from './AlertUnsavedChanges';

class QueryViewTop extends React.Component {
  static propTypes = {
    // queryId: PropTypes.number.isRequired,
    query: PropTypes.instanceOf(PromiseState).isRequired,
    saveQuery: PropTypes.func.isRequired,
    saveQueryResponse: PropTypes.instanceOf(PromiseState).isRequired,
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
      query: null,
    };
  }

  static getDerivedStateFromProps(newProps, oldState) {
    // create shallow copy of query contents once loaded
    if (!oldState.query && newProps.query.fulfilled) {
      return { query: { ...newProps.query.value } };
    }
    return null;
  }


  // XXX tied to angular routing
  onChangeLocation = cb => this.props.$rootScope.$on('$locationChangeStart', cb);

  updateQuery = changes => this.setState(Object.assign({}, this.state.query, changes))
  updateAndSaveQuery = (changes) => {
    const query = Object.assign({}, this.state.query, changes);
    this.setState({ query });
    this.props.saveQuery(query);
    // XXX toastr for success/failure, probably in refetch bits
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
          updateQuery={this.updateAndSaveQuery}
          currentUser={this.props.currentUser}
          hasDataSources={dataSources.length > 0}
          dataSource={dataSource}
          sourceMode={this.props.sourceMode}
          canEdit={canEdit}
          isDirty={this.state.isDirty}
          showPermissionsControl={this.props.clientConfig.showPermissionsControl}
          Events={this.props.Events}
        />
        <QueryViewMain />
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
      saveQuery: newQuery => ({
        query: { value: newQuery },
        saveQueryResponse: {
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
