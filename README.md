## 中国人口结构预测项目

网上有很多中国人口的仿真预测，但都没有把人口结构图动态展示出来

本人才疏学浅，自己实现了一个非常粗略的人口结构图预测，同时标注上了特定年龄的核心消费，用来预测未来的房产、教育、医疗需求变化

想了解结果的可以直接参考 [population_distribution_video.mp4](data/population_distribution_video.mp4)

## 项目结构

```
population/
├── data/                           # 数据文件
│   ├── population_age_distribution.csv   # 2020年年龄分布基准
│   ├── fertility_rate_forecast.csv       # 生育率预测 (2021-2200)
│   ├── mortality_rate.csv                # 死亡率
│   ├── full_population_projection.csv    # 完整人口预测数据 (1951-2200)
│   └── population_distribution_video.mp4 # 可视化视频
├── notebook/                       # Jupyter Notebook (数据预测+可视化)
│   └── main.ipynb
└── web/                            # Vue 3 + Vite 交互式可视化 (开发中)
```

## 运行方法

### Notebook

打开 `notebook/main.ipynb`，安装对应的 Python 环境后即可运行

### Web (开发中)

```bash
cd web
npm install
npm run dev
```
