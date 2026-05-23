const latestUrl = "data/latest.json";
const historyUrl = "data/history.json";

const state = {
  latest: null,
  history: [],
};

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return Number(value).toLocaleString("en-US");
}

function formatLatency(value) {
  if (value === null || value === undefined) {
    return "-";
  }
  return `${formatNumber(value)} ms`;
}

function formatDate(value) {
  if (!value) {
    return "No checks yet";
  }
  return new Date(value).toLocaleString();
}

function groupHistory(rows, metric) {
  const grouped = new Map();
  for (const row of rows) {
    const key = row.checked_at;
    if (!grouped.has(key)) {
      grouped.set(key, {
        checked_at: key,
        value: 0,
        count: 0,
      });
    }
    const item = grouped.get(key);
    if (metric === "latency_ms") {
      if (row.ok && row.latency_ms !== null && row.latency_ms !== undefined) {
        item.value += Number(row.latency_ms);
        item.count += 1;
      }
    } else if (row.ok) {
      item.value += Number(row[metric] || 0);
      item.count += 1;
    }
  }
  return Array.from(grouped.values())
    .map((item) => ({
      checked_at: item.checked_at,
      value:
        metric === "latency_ms" && item.count > 0
          ? Math.round(item.value / item.count)
          : item.value,
    }))
    .sort((a, b) => new Date(a.checked_at) - new Date(b.checked_at));
}

function drawChart(rows, metric) {
  const canvas = document.getElementById("history-chart");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 24, right: 22, bottom: 34, left: 54 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#d8dee4";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  if (rows.length === 0) {
    ctx.fillStyle = "#63707c";
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText("No history yet", padding.left, padding.top + 42);
    return;
  }

  const maxValue = Math.max(1, ...rows.map((item) => item.value));
  const stepX = rows.length > 1 ? chartWidth / (rows.length - 1) : chartWidth;

  ctx.strokeStyle = "#1d6f8f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  rows.forEach((item, index) => {
    const x = padding.left + stepX * index;
    const y = padding.top + chartHeight - (item.value / maxValue) * chartHeight;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  ctx.fillStyle = "#17212b";
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillText(formatNumber(maxValue), 12, padding.top + 5);
  ctx.fillText("0", 32, height - padding.bottom + 5);

  const first = rows[0]?.checked_at;
  const last = rows[rows.length - 1]?.checked_at;
  ctx.fillStyle = "#63707c";
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(formatDate(first), padding.left, height - 10);
  const lastText = formatDate(last);
  const lastWidth = ctx.measureText(lastText).width;
  ctx.fillText(lastText, width - padding.right - lastWidth, height - 10);
}

function renderLatest(latest) {
  const summary = latest?.summary || {};
  document.getElementById("subtitle").textContent = latest?.network
    ? `${latest.network}, via ${latest.tor_socks}`
    : "Waiting for monitor data";
  document.getElementById("nodes-ok").textContent =
    summary.nodes_total !== undefined
      ? `${formatNumber(summary.nodes_ok)}/${formatNumber(summary.nodes_total)}`
      : "-";
  document.getElementById("offers-total").textContent = formatNumber(
    summary.offers_total,
  );
  document.getElementById("makers-total").textContent = formatNumber(
    summary.makers_total,
  );
  document.getElementById("bonds-total").textContent = formatNumber(
    summary.fidelity_bonds_total,
  );
  document.getElementById("last-check").textContent = formatDate(latest?.checked_at);

  const tbody = document.getElementById("nodes-table");
  const nodes = latest?.nodes || [];
  if (nodes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">No data published yet.</td></tr>';
    return;
  }
  tbody.replaceChildren(
    ...nodes.map((node) => {
      const row = document.createElement("tr");
      const status = node.ok
        ? '<span class="status ok">OK</span>'
        : '<span class="status fail">Fail</span>';
      row.innerHTML = `
        <td class="node"></td>
        <td>${status}</td>
        <td>${formatNumber(node.offers)}</td>
        <td>${formatNumber(node.makers)}</td>
        <td>${formatNumber(node.fidelity_bonds)}</td>
        <td>${formatLatency(node.latency_ms)}</td>
        <td class="error"></td>
      `;
      row.querySelector(".node").textContent = node.node;
      row.querySelector(".error").textContent = node.error || "";
      return row;
    }),
  );
}

function render() {
  renderLatest(state.latest);
  const metric = document.getElementById("chart-mode").value;
  drawChart(groupHistory(state.history, metric), metric);
}

async function fetchJson(url, fallback) {
  const response = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    return fallback;
  }
  return response.json();
}

async function loadData() {
  const [latest, history] = await Promise.all([
    fetchJson(latestUrl, null),
    fetchJson(historyUrl, []),
  ]);
  state.latest = latest;
  state.history = Array.isArray(history) ? history : [];
  render();
}

document.getElementById("refresh-button").addEventListener("click", loadData);
document.getElementById("chart-mode").addEventListener("change", render);
window.addEventListener("resize", render);
loadData().catch((error) => {
  document.getElementById("subtitle").textContent = `Load failed: ${error.message}`;
});
