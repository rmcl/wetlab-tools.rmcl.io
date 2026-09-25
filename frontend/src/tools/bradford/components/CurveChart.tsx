import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-basic-dist-min'
import { evaluateCurve } from '../calculations/bradford'
import type { AnalysisResult } from '../types'

const Plot = createPlotlyComponent(Plotly)

export function CurveChart({ analysis, report = false }: { analysis: AnalysisResult; report?: boolean }) {
  const { fit, standards, samples } = analysis
  const range = fit.maxAbsorbance - fit.minAbsorbance || 1
  const start = Math.min(0, fit.minAbsorbance - range * 0.08)
  const end = fit.maxAbsorbance + range * 0.08
  const x = Array.from({ length: 180 }, (_, i) => start + (end - start) * i / 179)
  return (
    <Plot
      data={[
        {
          x, y: x.map((value) => evaluateCurve(fit.coefficients, value)), type: 'scatter', mode: 'lines', name: 'Quadratic fit',
          line: { color: '#0b8068', width: 3 }, hovertemplate: '%{x:.3f} absorbance<br>%{y:.2f} µg/mL<extra>Fit</extra>',
        },
        {
          x: standards.map((p) => p.absorbance), y: standards.map((p) => p.concentration), text: standards.map((p) => p.well),
          type: 'scatter', mode: 'markers', name: 'Standards', marker: { color: '#2764d7', size: 10, line: { color: 'white', width: 1.5 } },
          hovertemplate: '%{text}<br>%{x:.3f} absorbance<br>%{y:.2f} µg/mL<extra>Standard</extra>',
        },
        {
          x: samples.map((p) => p.absorbance), y: samples.map((p) => p.concentration), text: samples.map((p) => p.name),
          type: 'scatter', mode: 'markers', name: 'Samples', marker: { color: '#b45f06', size: 11, symbol: 'diamond', line: { color: 'white', width: 1.5 } },
          hovertemplate: '%{text}<br>%{x:.3f} absorbance<br>%{y:.2f} µg/mL<extra>Sample</extra>',
        },
      ]}
      layout={{
        autosize: true, height: report ? 360 : 420, margin: { l: 70, r: 24, t: 24, b: 64 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: '#fbfcfb',
        font: { family: 'Segoe UI, sans-serif', color: '#34423e' },
        xaxis: { title: { text: 'Absorbance (blank subtracted)' }, gridcolor: '#e3e9e6', zerolinecolor: '#b8c5c0' },
        yaxis: { title: { text: 'Concentration (µg/mL)' }, gridcolor: '#e3e9e6', rangemode: 'tozero' },
        legend: { orientation: 'h', y: -0.22 }, hovermode: 'closest',
      }}
      config={{ responsive: true, displaylogo: false, displayModeBar: report ? false : 'hover', toImageButtonOptions: { format: 'svg', filename: 'bradford-standard-curve' } }}
      useResizeHandler
      className={`${report ? 'h-[360px]' : 'h-[420px]'} w-full`}
    />
  )
}
