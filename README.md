# 北京求职看板 · 胡蕊

基于简历构建的北京地区求职辅助看板，围绕 **潘家园地铁站（10 号线）通勤 1 小时圈** 匹配在招岗位，逐岗分析薪资、地理距离、能力缺口、匹配度与综合投递优先级，并支持每日自动更新。

## 功能

- **双标签页**
  - 标签一 · 本行业岗位（燃气设计 / 油气储运 / 能源工艺设计）
  - 标签二 · 跨行业转岗机会（化工工艺 / 储能 / CAE 仿真 / 技术文档标准 / Python 数据）
- **逐岗分析字段**：公司、职位、薪资、距离（通勤分钟 + 1 小时圈标记）、技能缺口、匹配度、投递优先级、真实招聘链接
- **可视化看板**：投递优先级 Top 10 柱状图、匹配度 × 通勤距离散点图、优先级等级分布环图
- **筛选 / 排序**：关键字搜索、仅看 1 小时圈、按优先级 / 匹配度 / 薪资 / 距离排序
- **跨行业子分类**：标签二下细分 5 个子 tab（互联网/IT、新能源/储能/智造、化工/材料/石化、工业软件/CAE仿真、技术文档/标准/咨询），点击可单独筛选某一方向的转岗机会
- **继续查询（加载更多）**：网页底部「继续查询」按钮，点击后**再揭示 10 个第二批岗位**（本行业 5 + 跨行业 5，均为真实在招岗位），统计卡片与图表同步更新
- **每日自动更新**：GitHub Actions 每日 08:00（北京时间）重算数据并更新时间戳

## 目录结构

```
beijing-job-dashboard/
├── index.html              # 看板主页（自包含单文件：数据+样式+逻辑内联，仅图表库走 CDN）
├── templates/
│   └── dashboard.html       # 网页骨架模板（由 update.py 拼装为 index.html）
├── assets/
│   ├── style.css           # 样式（浅色、移动端友好）
│   └── app.js              # 前端逻辑（优先读取内联数据，兼容 fetch 方式）
├── data/
│   └── jobs.json           # 岗位数据（由脚本生成，供外部程序/接口读取）
├── scripts/
│   └── update.py           # 数据生成 / 评分 / 拼装网页 / 每日更新引擎
├── .github/workflows/
│   └── daily-update.yml    # 每日自动更新工作流
└── README.md
```

## 本地预览

```bash
cd beijing-job-dashboard
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

> **`index.html` 为自包含单文件**：岗位数据已内联，可直接双击用浏览器打开（`file://` 也能正常显示），无需本地服务器。
> 仅图表可视化依赖 CDN 加载 Chart.js；若离线或 CDN 不可达，岗位卡片与全部文字信息仍完整可用，仅图表不渲染。

## 部署到 GitHub Pages（分享给微信好友）

> 本目录**已本地初始化 Git 并完成首次提交**（commit `511ba5e`）。你只需补一条 remote、推送，再开 Pages 即可上线。

1. 在 GitHub 新建一个**公开**仓库（如 `beijing-job-dashboard`，**不要**勾选自动生成 README/.gitignore，避免与本地冲突）。
2. 在本目录执行（把 `<你的用户名>` 和 `<仓库名>` 替换成实际值）：
   ```bash
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git branch -M main
   git push -u origin main
   ```
3. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **Deploy from a branch**，
   分支选 **main**，目录选 **/ (root)**，保存。
4. 等待 1–2 分钟，访问 `https://<你的用户名>.github.io/<仓库名>/`。
5. 将该链接发送给微信好友即可在微信内直接打开（微信内置浏览器兼容）。

> 提示：`.nojekyll` 已包含，确保 `data/`、`assets/` 等以下划线开头的目录不被 Jekyll 忽略。
> 如需自定义域名，可在 Pages 设置中绑定。

## 每日自动更新说明（重要）

看板数据由 `scripts/update.py` 生成：

- **评分逻辑**：匹配度（领域相关度 + 经验/学历门槛）+ 薪资评分 + 通勤评分，加权得到投递优先级（A/B/C）。
- **每日运行**：工作流重新执行 `scripts/update.py`，生成 `data/jobs.json` 与**自包含的 `index.html`**（更新时间戳、重算评分），并一并提交到 `main` 分支，Pages 自动生效。
- **链接真实可访问**：所有岗位链接均为人工核验过的真实招聘页面。中国大陆主流招聘站（Boss / 智联 / 猎聘等）对自动化抓取有强反爬限制，CI 环境 IP 通常无法稳定抓取，因此**默认以「人工核验的真实岗位 + 每日健康度复查」为核心**，保证链接真实可用。
- **全自动增量抓取（可选）**：在仓库 **Settings → Secrets** 中配置 `JOB_SEARCH_API_KEY`（搜索 API，如 Bing Web Search / SerpAPI），工作流会调用 `fetch_live_jobs()` 尝试增量补充新岗位（解析逻辑可在 `update.py` 中按所选 API 扩展）。
- **链接健康度探测（可选）**：将工作流中的 `LINK_CHECK` 改为 `"1"` 可每日探测链接可达性；注意 CI 网络对国内站点探测可能出现误判（标记可达性为不可达），请按需开启。

### 如何刷新岗位列表

当前岗位为 2026-09 人工检索结果。如需更新为最新在招岗位：

1. 重新检索目标岗位（替换 / 增删 `scripts/update.py` 中 `JOBS` 列表项，保留真实链接与字段）；
2. 本地运行 `python3 scripts/update.py` 重新生成 `data/jobs.json` 与自包含 `index.html`；
3. 提交推送，Pages 自动生效；或手动触发 Actions（workflow_dispatch）。

## 评分权重（可在 `update.py` 调整）

| 维度 | 权重 |
|------|------|
| 匹配度 | 45% |
| 薪资   | 30% |
| 通勤   | 25% |

匹配度基于简历画像（油气储运工程 / 燃气设计 / HYSYS·OLGA·Abaqus·AutoCAD / 技术方案与标准编制 / Python）与岗位要求逐岗比对得出；薪资与通勤为中性量化评分。
