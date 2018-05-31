import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { scheduleHumanize } from '@/filters/index';

function timeAgo(when) {
  return when ? moment(when).fromNow() : '-';
}

export default function QueryMetadata(props) {
  function openScheduleForm() {
    if (!(props.canEdit || props.canScheduleQuery)) {
      return;
    }

    props.$uibModal.open({
      component: 'scheduleDialog',
      size: 'sm',
      resolve: {
        query: props.query,
        saveQuery: () => props.saveQuery,
      },
    });
  }

  if (props.mobile) {
    return (
      <div className="row query-metadata__mobile">
        <div className="col-xs-4 text-left">
          <span className="m-r-5">Created by</span>
          <img alt="" src={props.query.user.profile_image_url} className="profile__image_thumb" /> <strong>{timeAgo(props.query.created_at)}</strong>
        </div>
        <div className="col-xs-4 text-center">
          <span className="m-r-5">Updated by</span>
          <img alt={props.query.user.name} src={props.query.last_modified_by.profile_image_url} className="profile__image_thumb" /><strong>{timeAgo(props.query.updated_at)}</strong>
        </div>
        <div className="col-xs-4 text-right">
          <span className="query-metadata__property">Refresh Schedule</span>
          {props.query.isNew() ?
            <span>Never</span> :
            <a role="button" tabIndex="0" onKeyPress={openScheduleForm} onClick={openScheduleForm}>{scheduleHumanize(props.schedule)}</a>}
        </div>
      </div>
    );
  }
  if (props.query.isNew()) {
    return null;
  }
  return (
    <div className="query-metadata query-metadata--history">
      <table>
        <tbody>
          <tr>
            <td>
              <img alt={props.query.user.name} src={props.query.user.profile_image_url} className="profile__image_thumb" /> <strong className="meta__name">{props.query.user.name}</strong>
            </td>
            <td className="text-right">
              created <strong>{timeAgo(props.query.created_at)}</strong>
            </td>
          </tr>
          <tr>
            <td>
              <img alt={props.query.last_modified_by.name} src={props.query.last_modified_by.profile_image_url} className="profile__image_thumb" /> <strong className="meta__name">{props.query.last_modified_by.name}</strong>
            </td>
            <td className="text-right">
              updated <strong>{timeAgo(props.query.updated_at)}</strong>
            </td>
          </tr>
          <tr>
            <td className="p-t-15">
              <span className="query-metadata__property"><span className="zmdi zmdi-refresh" />Refresh Schedule</span>
            </td>
            <td className="p-t-15 text-right">
              <a role="button" tabIndex="0" onKeyPress={openScheduleForm} onClick={openScheduleForm}>{scheduleHumanize(props.schedule)}</a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

QueryMetadata.propTypes = {
  mobile: PropTypes.bool.isRequired,
  query: PropTypes.object.isRequired,
  saveQuery: PropTypes.func.isRequired,
  canEdit: PropTypes.bool.isRequired,
  canScheduleQuery: PropTypes.bool.isRequired,
  // XXX temp hack
  schedule: PropTypes.string, // eslint-disable-line react/require-default-props
};
