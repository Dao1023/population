## 中国人口结构预测项目

基于 2020 年人口普查数据，通过交互式可视化动态展示中国人口结构变化趋势，并标注特定年龄的核心消费热点，预测未来房产、教育、医疗等需求变化。

在线体验：[https://dao1023.github.io/population/](https://dao1023.github.io/population/)

## 功能特性

- 年龄分布柱状图，支持年份播放/拖动（1951-2200）
- 可调参数：生育率覆盖、女性比例
- 人口总览折线图（总人口、中位年龄、养老抚养比）
- 消费热点指数图（公寓、婚房、改善房、教育、医疗、养老等）
- 时间窗口双滑块，聚焦任意时间段
- 算法：前向模拟（年龄移位 + 死亡率年度改善 0.5%/年）+ 反向逆推

## 项目结构

```
population/
├── data/                           # 原始数据 (CSV)
├── web/
│   ├── public/data/                # JSON 数据 (由脚本转换)
│   ├── src/
│   │   ├── App.vue                 # 主界面
│   │   ├── composables/
│   │   │   └── usePopulation.js    # 核心模拟算法
│   │   └── components/             # 图表组件
│   └── vite.config.js
├── notebook/                       # Jupyter Notebook (数据预测)
└── .github/workflows/deploy.yml   # GitHub Pages 自动部署
```

## 运行方法

```bash
cd web
pnpm install
pnpm dev
```

## 部署

push 到 master 自动通过 GitHub Actions 构建并部署到 GitHub Pages。
