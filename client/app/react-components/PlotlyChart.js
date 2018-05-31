import React from 'react';
import PropTypes from 'prop-types';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js';
import { isArray, isObject } from 'lodash';
import { updateData, prepareData, prepareLayout, updateDimensions, calculateMargins } from '@/visualizations/chart/plotly/utils';

const Plot = createPlotlyComponent(Plotly);

export default class PlotlyChart extends React.Component {
  static propTypes = {
    options: PropTypes.object.isRequired,
    series: PropTypes.array.isRequired,
  }

  // needed because of the slightly-weird way data arrives from angular
  static getDerivedStateFromProps(nextProps, prevState) {
    const data = prepareData(nextProps.series, nextProps.options);
    updateData(data, nextProps.options);
    return {
      data,
      layout: prepareLayout(null, nextProps.series, nextProps.options, data),
      revision: prevState.revision + 1,
    };
  }

  constructor(props) {
    super(props);
    const data = prepareData(props.series, props.options);
    updateData(data, props.options);
    this.state = {
      data,
      layout: prepareLayout(null, props.series, props.options, data),
      revision: 0,
    };
  }


  restyle = (updates) => {
    if (isArray(updates) && isObject(updates[0]) && updates[0].visible) {
      updateData(this.state.data, this.props.options);
      this.setState({ revision: this.state.revision + 1 });
    }
  }

  updateChartDimensions = (figure, plotlyElement) => {
    if (updateDimensions(figure.layout, plotlyElement, calculateMargins(plotlyElement))) {
      Plotly.relayout(plotlyElement, figure.layout);
    }
  }

  render() {
    return (
      <Plot
        className="plotly-chart-container"
        revision={this.state.revision}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
        config={{
          showLink: false,
          displayLogo: false,
          modeBarButtonsToRemove: ['sendDataToCloud'],
        }}
        data={this.state.data}
        layout={this.state.layout}
        onRestyle={this.restyle}
        onUpdate={this.updateChartDimensions}
      />
    );
  }
}
