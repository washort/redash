import { react2angular } from 'react2angular';
import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { map, range, partial } from 'lodash';
import moment from 'moment';

import { secondsToInterval, IntervalEnum } from '@/filters';

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const INTERVAL_OPTIONS_MAP = {};
INTERVAL_OPTIONS_MAP[IntervalEnum.NEVER] = 1;
INTERVAL_OPTIONS_MAP[IntervalEnum.MINUTES] = 60;
INTERVAL_OPTIONS_MAP[IntervalEnum.HOURS] = 24;
INTERVAL_OPTIONS_MAP[IntervalEnum.DAYS] = 7;
INTERVAL_OPTIONS_MAP[IntervalEnum.WEEKS] = 5;

function padWithZeros(size, v) {
  let str = String(v);
  if (str.length < size) {
    str = `0${str}`;
  }
  return str;
}

const hourOptions = map(range(0, 24), partial(padWithZeros, 2));
const minuteOptions = map(range(0, 60, 5), partial(padWithZeros, 2));

function scheduleInLocalTime(schedule) {
  const parts = schedule.split(':');
  return moment
    .utc()
    .hour(parts[0])
    .minute(parts[1])
    .local()
    .format('HH:mm');
}

function getAcceptableIntervals(refreshOptions) {
  const acceptableIntervals = [{
    name: IntervalEnum.NEVER,
    time: null,
  }];
  refreshOptions.forEach((seconds) => {
    const { count, interval } = secondsToInterval(seconds);
    if (count === 1) {
      acceptableIntervals.push({
        name: interval,
        time: seconds,
      });
    }
  });
  return acceptableIntervals;
}

function intervalToSeconds(count, interval) {
  let intervalInSeconds = 0;
  switch (interval) {
    case IntervalEnum.MINUTES:
      intervalInSeconds = 60;
      break;
    case IntervalEnum.HOURS:
      intervalInSeconds = 3600;
      break;
    case IntervalEnum.DAYS:
      intervalInSeconds = 86400;
      break;
    case IntervalEnum.WEEKS:
      intervalInSeconds = 604800;
      break;
    default:
      return null;
  }
  return intervalInSeconds * count;
}

class ScheduleDialog extends React.Component {
  static propTypes = {
    show: PropTypes.bool.isRequired,
    query: PropTypes.object.isRequired,
    refreshOptions: PropTypes.arrayOf(PropTypes.number).isRequired,
    updateQuery: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);

    let interval = {};
    let parts = null;
    const time = this.props.query.schedule.time;
    if (time) {
      parts = scheduleInLocalTime(this.props.query.schedule.time).split(':');
    }
    const secondsDelay = this.props.query.schedule.interval;
    const dayOfWeek = this.props.query.schedule.day_of_week;
    if (secondsDelay) {
      interval = secondsToInterval(secondsDelay);
    }

    this.state = {
      hour: parts ? parts[0] : null,
      minute: parts ? parts[1] : null,
      count: interval.count || 1,
      interval: interval.interval || IntervalEnum.NEVER,
      dayOfWeek: dayOfWeek ? WEEKDAYS_SHORT[WEEKDAYS_FULL.indexOf(dayOfWeek)] : null,
    };
  }

  getAcceptableCounts() {
    return range(1, INTERVAL_OPTIONS_MAP[this.state.interval]);
  }

  setKeep = e => this.props.updateQuery({ schedule_resultset_size: parseInt(e.target.value, 10) })

  setTime = (h, m) => {
    this.props.updateQuery({
      schedule: Object.assign({}, this.props.query.schedule, {
        time: h && m ? moment().hour(h).minute(m).utc()
          .format('HH:mm') : null,
      }),
    });
    this.setState({
      hour: h,
      minute: m,
    });
  }
  setInterval = (e) => {
    const newInterval = e.target.value;
    const newSchedule = Object.assign({}, this.props.query.schedule);

    if (newInterval === IntervalEnum.NEVER) {
      newSchedule.until = null;
    }
    if ([IntervalEnum.NEVER, IntervalEnum.MINUTES, IntervalEnum.HOURS].indexOf(newInterval) !== -1) {
      newSchedule.time = null;
    }
    if (newInterval !== IntervalEnum.WEEKS) {
      newSchedule.day_of_week = null;
    }
    if ((newInterval === IntervalEnum.DAYS || newInterval === IntervalEnum.WEEKS) &&
               (!this.state.minute || !this.state.hour)) {
      newSchedule.time = moment()
        .hour('00')
        .minute('15')
        .utc()
        .format('HH:mm');
    }
    if (newInterval === IntervalEnum.WEEKS && !this.state.dayOfWeek) {
      newSchedule.day_of_week = WEEKDAYS_FULL[0];
    }

    const totalSeconds = newInterval ? intervalToSeconds(this.state.count, newInterval) : null;
    const timeParts = newSchedule.time ? scheduleInLocalTime(newSchedule.time).split(':') : null;
    this.setState({
      interval: newInterval,
      count: newInterval !== IntervalEnum.NEVER ? this.state.count : 1,
      hour: timeParts ? timeParts[0] : null,
      minute: timeParts ? timeParts[1] : null,
      dayOfWeek: newSchedule.day_of_week ? WEEKDAYS_SHORT[WEEKDAYS_FULL.indexOf(newSchedule.day_of_week)] : null,
    });

    this.props.updateQuery({
      schedule: Object.assign(newSchedule, { interval: totalSeconds }),
    });
  }
  setCount = (e) => {
    const newCount = e.target.value;
    const totalSeconds = intervalToSeconds(newCount, this.state.interval);
    this.setState({ count: newCount });

    this.props.updateQuery({
      schedule: Object.assign({}, this.props.query.schedule, { interval: totalSeconds }),
    });
  }

  setScheduleUntil = (e) => {
    this.props.updateQuery({
      schedule: Object.assign({}, this.props.query.schedule, { until: e.target.value }),
    });
  }

  setWeekday = (e) => {
    const dayOfWeek = e.target.value;
    this.setState({ dayOfWeek });
    this.props.updateQuery({
      schedule: Object.assign({}, this.props.query.schedule, {
        day_of_week: dayOfWeek ? WEEKDAYS_FULL[WEEKDAYS_SHORT.indexOf(dayOfWeek)] : null,
      }),
    });
  }

  render() {
    const schedule = this.props.query.schedule;

    return (
      <Modal show={this.props.show} onHide={this.props.onClose}>
        <Modal.Header closeButton>
          <Modal.Title>Refresh Schedule</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            <label>
              Refresh every
              {schedule.interval ?
                <select
                  value={this.state.count}
                  onChange={this.setCount}
                >
                  {this.getAcceptableCounts().map(count => (
                    <option value={count} key={count}>
                      {String(count)}
                    </option>
                  ))}
                </select> : null}
              <select
                value={this.state.interval}
                onChange={this.setInterval}
              >
                {getAcceptableIntervals(this.props.refreshOptions).map(iv => (
                  <option value={iv.name || ''} key={iv.name}>
                    {String(iv.name)}
                  </option>
                ))}
              </select>
            </label>
          </p>
          {[IntervalEnum.DAYS, IntervalEnum.WEEKS].indexOf(this.state.interval) !== -1 ?
            <p>
              <label>
                At the following time
                <select value={this.state.hour} onChange={e => this.setTime(e.target.value, this.state.minute)}>
                  {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={this.state.minute} onChange={e => this.setTime(this.state.hour, e.target.value)}>
                  {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
            </p> : null}
          {IntervalEnum.WEEKS === this.state.interval ?
            <p>
              <div className="btn-toolbar">
                <div className="btn-group" data-toggle="buttons">
                  {WEEKDAYS_SHORT.map(day => <button className={`btn btn-xs btn-default${this.state.dayOfWeek === day ? ' active' : ''}`} onClick={this.setWeekday} value={day}>{day}</button>)}
                </div>
              </div>
            </p> : null}
          {schedule.interval ?
            <p>
              <label>
                Stop refresh on:
                <input type="date" value={schedule.until || ''} onChange={this.setScheduleUntil} />
              </label>
            </p> : null}
          <label>
            Number of query results to keep <input type="number" className="form-control" value={this.props.query.schedule_resultset_size || 0} onChange={this.setKeep} disabled={!schedule} />
          </label>
        </Modal.Body>
      </Modal>
    );
  }
}


export default function init(ngModule) {
  ngModule.component('scheduleDialog', react2angular(ScheduleDialog));
}
