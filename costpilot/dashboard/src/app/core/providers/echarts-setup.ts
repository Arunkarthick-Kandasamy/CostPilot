import * as echarts from 'echarts/core';
import { SankeyChart, HeatmapChart, TreemapChart, BarChart, LineChart, PieChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, VisualMapComponent, ToolboxComponent } from 'echarts/components';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([SankeyChart, HeatmapChart, TreemapChart, BarChart, LineChart, PieChart,
  TitleComponent, TooltipComponent, GridComponent, LegendComponent, VisualMapComponent, ToolboxComponent,
  LabelLayout, UniversalTransition, CanvasRenderer]);

export { echarts };
