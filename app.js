const marketSeries = {
  all: {
    label: "全市场",
    price: [320, 326, 324, 331, 338, 334, 342, 348, 346, 352, 361, 356, 363, 371, 368, 376, 382, 379, 388, 394],
    signal: [44, 46, 45, 49, 54, 51, 57, 60, 58, 62, 67, 63, 69, 72, 70, 74, 78, 76, 81, 84],
    insight: "模型偏好高质量成长与低拥挤动量组合，当前建议降低单一行业暴露。",
  },
  core: {
    label: "核心指数",
    price: [390, 392, 391, 395, 397, 396, 401, 405, 404, 408, 412, 410, 416, 421, 419, 426, 430, 428, 434, 439],
    signal: [52, 54, 53, 55, 56, 55, 58, 61, 60, 62, 64, 63, 66, 68, 66, 70, 72, 71, 73, 75],
    insight: "核心指数波动率回落，盈利修复因子贡献提高，适合展示稳健型量化组合。",
  },
  growth: {
    label: "成长风格",
    price: [210, 214, 211, 219, 225, 221, 229, 238, 235, 244, 251, 247, 255, 263, 258, 269, 277, 272, 284, 292],
    signal: [39, 42, 40, 47, 51, 48, 55, 61, 58, 66, 70, 65, 73, 78, 72, 82, 85, 79, 88, 91],
    insight: "成长风格对风险偏好敏感，AI 解释层会突出估值分位与交易拥挤度的冲突。",
  },
};

const sectors = [
  ["半导体", 3.8],
  ["证券", 2.4],
  ["电力设备", 1.7],
  ["医药", -0.6],
  ["消费电子", 2.9],
  ["白酒", -1.2],
  ["银行", 0.8],
  ["机器人", 4.6],
  ["煤炭", -0.4],
];

const stocks = [
  ["宁德时代", "电力设备", 86, "中"],
  ["中际旭创", "通信", 83, "中高"],
  ["招商银行", "银行", 78, "低"],
  ["寒武纪-U", "半导体", 75, "高"],
  ["贵州茅台", "食品饮料", 71, "低"],
];

const chart = document.querySelector("#mainChart");
const ctx = chart.getContext("2d");
const heatmap = document.querySelector("#heatmap");
const watchlist = document.querySelector("#watchlist");
const insightText = document.querySelector("#insightText");
const universeLabel = document.querySelector("#universeLabel");
let activeMarket = "all";
let activeFactor = "momentum";

function scale(values, minOut, maxOut) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values.map((value) => maxOut - ((value - min) / (max - min || 1)) * (maxOut - minOut));
}

function drawLine(points, color, width) {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function drawChart() {
  const data = marketSeries[activeMarket];
  const width = chart.width;
  const height = chart.height;
  const pad = 46;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#e4e8f0";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = pad + i * ((height - pad * 2) / 4);
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
  }

  const xs = data.price.map((_, index) => pad + index * ((width - pad * 2) / (data.price.length - 1)));
  const priceY = scale(data.price, pad, height - pad);
  const signalY = scale(data.signal, pad + 18, height - pad - 18);
  const pricePoints = xs.map((x, index) => [x, priceY[index]]);
  const signalPoints = xs.map((x, index) => [x, signalY[index]]);

  const gradient = ctx.createLinearGradient(0, pad, 0, height - pad);
  gradient.addColorStop(0, "rgba(37, 99, 235, 0.22)");
  gradient.addColorStop(1, "rgba(37, 99, 235, 0)");
  ctx.beginPath();
  pricePoints.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(width - pad, height - pad);
  ctx.lineTo(pad, height - pad);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  drawLine(pricePoints, "#2563eb", 4);
  drawLine(signalPoints, "#b7791f", 3);

  const lastPoint = pricePoints.at(-1);
  ctx.fillStyle = "#2563eb";
  ctx.beginPath();
  ctx.arc(lastPoint[0], lastPoint[1], 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#667085";
  ctx.font = "16px Inter, sans-serif";
  ctx.fillText(`${data.label}  20 日走势`, pad, 26);
}

function heatColor(value) {
  const opacity = Math.min(0.92, 0.38 + Math.abs(value) / 8);
  if (value >= 0) return `rgba(21, 148, 111, ${opacity})`;
  return `rgba(211, 74, 74, ${opacity})`;
}

function renderHeatmap() {
  const risk = Number(document.querySelector("#riskSlider").value);
  heatmap.innerHTML = sectors
    .map(([name, base], index) => {
      const adjusted = base + (risk - 5) * 0.12 + (activeFactor === "value" && index % 3 === 0 ? 0.7 : 0);
      return `<div class="tile" style="background:${heatColor(adjusted)}"><strong>${name}</strong><span>${adjusted > 0 ? "+" : ""}${adjusted.toFixed(1)}%</span></div>`;
    })
    .join("");
}

function renderWatchlist() {
  watchlist.innerHTML = stocks
    .map(([name, sector, score, risk]) => {
      const delta = activeFactor === "quality" ? 4 : activeFactor === "liquidity" ? -2 : 0;
      return `<tr><td>${name}</td><td>${sector}</td><td>${score + delta}</td><td>${risk}</td></tr>`;
    })
    .join("");
}

function updateMetrics() {
  const seed = Math.random();
  document.querySelector("#metricHs300").textContent = (3928 + seed * 18).toFixed(2);
  document.querySelector("#metricCsi500").textContent = (5831 + seed * 28).toFixed(2);
  document.querySelector("#metricNorthbound").textContent = `+${(30 + seed * 12).toFixed(1)} 亿`;
  document.querySelector("#metricCrowding").textContent = Math.round(39 + seed * 7);
}

function render() {
  universeLabel.textContent = marketSeries[activeMarket].label;
  insightText.textContent = marketSeries[activeMarket].insight;
  drawChart();
  renderHeatmap();
  renderWatchlist();
}

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeMarket = button.dataset.market;
    render();
  });
});

document.querySelectorAll(".factor").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".factor").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeFactor = button.dataset.factor;
    renderHeatmap();
    renderWatchlist();
  });
});

document.querySelector("#riskSlider").addEventListener("input", renderHeatmap);
document.querySelector("#refreshButton").addEventListener("click", () => {
  updateMetrics();
  render();
});

window.addEventListener("resize", drawChart);
render();
