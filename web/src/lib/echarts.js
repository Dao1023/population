// ECharts 按需注册集中在此，main.js 第一行 import 一次即可。
import { use } from 'echarts/core'
import { BarChart, LineChart, MapChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  MarkLineComponent,
  MarkPointComponent,
  LegendComponent,
  GeoComponent,
  VisualMapComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([
  BarChart,
  LineChart,
  MapChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  MarkLineComponent,
  MarkPointComponent,
  LegendComponent,
  GeoComponent,
  VisualMapComponent,
  CanvasRenderer,
])
