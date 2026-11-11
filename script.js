document.addEventListener('DOMContentLoaded', function () {
  const year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (navToggle && nav) {
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      if (!isOpen) {
        nav.style.display = '';
      } else {
        nav.style.display = 'flex';
      }
    });
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        nav.style.display = '';
      });
    });
  }

  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = form.name.value || 'there';
      alert(`Thanks ${name}! We'll be in touch about a demo.`);
      form.reset();
    });
  }

  const slides = Array.from(document.querySelectorAll('.slide'));
  const dots = Array.from(document.querySelectorAll('.dot'));
  let activeSlideIndex = 0;

  function goToSlide(index) {
    if (!slides.length) {
      return;
    }
    activeSlideIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle('is-active', slideIndex === activeSlideIndex);
    });
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === activeSlideIndex);
    });
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => goToSlide(Number(dot.dataset.index)));
  });

  if (slides.length > 1) {
    setInterval(() => {
      goToSlide(activeSlideIndex + 1);
    }, 4200);
  }

  const elements = {
    upload: document.getElementById('csvUpload'),
    loadDemo: document.getElementById('loadDemoData'),
    runAnalysis: document.getElementById('runAnalysis'),
    clearData: document.getElementById('clearData'),
    metricSelect: document.getElementById('metricSelect'),
    timeSelect: document.getElementById('timeSelect'),
    prompt: document.getElementById('insightPrompt'),
    rows: document.getElementById('kpiRows'),
    columns: document.getElementById('kpiColumns'),
    numeric: document.getElementById('kpiNumeric'),
    missing: document.getElementById('kpiMissing'),
    chart: document.getElementById('trendChart'),
    chartTitle: document.getElementById('chartTitle'),
    chartSubtitle: document.getElementById('chartSubtitle'),
    insightList: document.getElementById('insightList'),
    aiSummary: document.getElementById('aiSummary'),
    backendStatus: document.getElementById('backendStatus'),
    previewHead: document.getElementById('previewHead'),
    previewBody: document.getElementById('previewBody')
  };

  if (!elements.upload || !elements.metricSelect || !elements.timeSelect || !elements.chart) {
    return;
  }

  const state = {
    rows: [],
    headers: [],
    numericHeaders: [],
    timeHeaders: [],
    selectedMetric: '',
    selectedTime: ''
  };
  let latestAnalysisToken = 0;

  const demoRows = [
    { date: '2026-01-01', revenue: 84200, users: 1240, conversions: 92, churn: 3.8, region: 'North' },
    { date: '2026-01-08', revenue: 86550, users: 1290, conversions: 96, churn: 3.7, region: 'North' },
    { date: '2026-01-15', revenue: 90320, users: 1335, conversions: 102, churn: 3.5, region: 'East' },
    { date: '2026-01-22', revenue: 91880, users: 1390, conversions: 105, churn: 3.6, region: 'South' },
    { date: '2026-01-29', revenue: 94240, users: 1415, conversions: 109, churn: 3.4, region: 'South' },
    { date: '2026-02-05', revenue: 97310, users: 1460, conversions: 114, churn: 3.2, region: 'West' },
    { date: '2026-02-12', revenue: 101840, users: 1505, conversions: 121, churn: 3.1, region: 'West' },
    { date: '2026-02-19', revenue: 100460, users: 1512, conversions: 119, churn: 3.3, region: 'North' },
    { date: '2026-02-26', revenue: 107950, users: 1565, conversions: 126, churn: 3.0, region: 'East' },
    { date: '2026-03-04', revenue: 110780, users: 1601, conversions: 130, churn: 2.9, region: 'East' },
    { date: '2026-03-11', revenue: 118430, users: 1650, conversions: 136, churn: 2.8, region: 'South' },
    { date: '2026-03-18', revenue: 121900, users: 1708, conversions: 140, churn: 2.7, region: 'West' }
  ];

  const demoHeaders = Object.keys(demoRows[0]);
  loadRows(demoRows, demoHeaders);

  elements.loadDemo.addEventListener('click', () => {
    loadRows(demoRows, demoHeaders);
  });

  elements.upload.addEventListener('change', () => {
    const file = elements.upload.files && elements.upload.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result || ''));
        if (!parsed.headers.length || !parsed.rows.length) {
          throw new Error('The CSV file did not contain usable data.');
        }
        loadRows(parsed.rows, parsed.headers);
      } catch (error) {
        alert(error.message || 'Unable to read the CSV file.');
      }
    };
    reader.readAsText(file);
  });

  elements.runAnalysis.addEventListener('click', () => {
    renderAnalysis();
  });

  elements.clearData.addEventListener('click', () => {
    latestAnalysisToken += 1;
    state.rows = [];
    state.headers = [];
    state.numericHeaders = [];
    state.timeHeaders = [];
    state.selectedMetric = '';
    state.selectedTime = '';
    elements.metricSelect.innerHTML = '';
    elements.timeSelect.innerHTML = '';
    elements.insightList.innerHTML = '';
    elements.aiSummary.textContent = 'Upload a CSV or load the demo dataset to start the analysis.';
    if (elements.backendStatus) {
      elements.backendStatus.textContent = '';
    }
    elements.chart.innerHTML = '';
    elements.previewHead.innerHTML = '';
    elements.previewBody.innerHTML = '';
    setKpis(0, 0, 0, 0);
  });

  elements.metricSelect.addEventListener('change', () => {
    state.selectedMetric = elements.metricSelect.value;
    renderAnalysis();
  });

  elements.timeSelect.addEventListener('change', () => {
    state.selectedTime = elements.timeSelect.value;
    renderAnalysis();
  });

  function loadRows(rows, headers) {
    state.rows = rows;
    state.headers = headers;
    state.numericHeaders = headers.filter((header) => isNumericColumn(rows, header));
    state.timeHeaders = headers.filter((header) => isTimeColumn(rows, header));
    state.selectedMetric = state.numericHeaders[0] || headers[0] || '';
    state.selectedTime = state.timeHeaders[0] || headers[0] || '';

    populateSelect(elements.metricSelect, state.numericHeaders.length ? state.numericHeaders : headers, state.selectedMetric);
    populateSelect(elements.timeSelect, state.timeHeaders.length ? state.timeHeaders : headers, state.selectedTime);
    renderPreview();
    renderAnalysis();
  }

  function populateSelect(select, values, selectedValue) {
    select.innerHTML = values.map((value) => {
      const isSelected = value === selectedValue ? ' selected' : '';
      return `<option value="${escapeHtml(value)}"${isSelected}>${escapeHtml(value)}</option>`;
    }).join('');
  }

  function renderPreview() {
    const previewRows = state.rows.slice(0, 5);
    if (!state.headers.length || !previewRows.length) {
      elements.previewHead.innerHTML = '';
      elements.previewBody.innerHTML = '';
      return;
    }

    elements.previewHead.innerHTML = `<tr>${state.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>`;
    elements.previewBody.innerHTML = previewRows.map((row) => {
      return `<tr>${state.headers.map((header) => `<td>${escapeHtml(formatPreviewCell(row[header]))}</td>`).join('')}</tr>`;
    }).join('');
  }

  function renderAnalysis() {
    if (!state.rows.length || !state.headers.length) {
      return;
    }

    const metric = elements.metricSelect.value || state.selectedMetric;
    const timeField = elements.timeSelect.value || state.selectedTime;
    const prompt = String(elements.prompt.value || '').trim();
    const promptFocus = interpretPrompt(prompt);
    const series = buildSeries(state.rows, metric, timeField);
    const validSeries = series.filter((point) => Number.isFinite(point.value));

    setKpis(
      state.rows.length,
      state.headers.length,
      state.numericHeaders.length,
      countMissingValues(state.rows, state.headers)
    );

    if (!validSeries.length) {
      elements.chartTitle.textContent = metric ? `${metric} trend` : 'Trend view';
      elements.chartSubtitle.textContent = 'Choose a numeric metric to render the chart.';
      elements.insightList.innerHTML = '<li>No numeric values available for the selected metric.</li>';
      elements.aiSummary.textContent = 'Upload data with numeric fields to generate AI-style insights.';
      elements.chart.innerHTML = '';
      return;
    }

    const values = validSeries.map((point) => point.value);
    const first = values[0];
    const last = values[values.length - 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const slope = linearRegressionSlope(values);
    const forecast = last + slope;
    const change = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : null;
    const anomalies = detectAnomalies(values);
    const peakIndex = values.indexOf(max);
    const peakLabel = validSeries[peakIndex] ? validSeries[peakIndex].label : 'the dataset';
    const trendDirection = slope > 0.5 ? 'upward' : slope < -0.5 ? 'downward' : 'flat';

    elements.chartTitle.textContent = `${metric} trend`;
    elements.chartSubtitle.textContent = `${validSeries.length} points across ${timeField || 'row order'} with ${trendDirection} momentum.${promptFocus ? ` Prompt focus: ${promptFocus}.` : ''}`;

    const anomalyWord = anomalies.length === 1 ? 'anomaly' : 'anomalies';
    elements.insightList.innerHTML = `
      <div class="insight-group">
        <div class="insight-group-title">Local Analysis</div>
        <div class="insight-item">${escapeHtml(metric)} moved from ${formatNumber(first)} to ${formatNumber(last)} (${change === null ? 'n/a' : formatSignedPercent(change)}).</div>
        <div class="insight-item">Peak value: ${formatNumber(max)} at ${escapeHtml(String(peakLabel))}.</div>
        <div class="insight-item">${anomalies.length ? `${anomalies.length} potential ${anomalyWord} detected.` : 'No strong anomalies detected in the current metric.'}</div>
        <div class="insight-item">Simple forecast for the next period: ${formatNumber(forecast)}.</div>
      </div>
    `;

    elements.aiSummary.textContent = buildSummary(metric, timeField, trendDirection, change, average, forecast, anomalies.length, promptFocus);
    if (elements.backendStatus) {
      elements.backendStatus.textContent = 'Querying OpenAI for a structured summary...';
    }
    renderChart(validSeries, min, max);
    requestBackendInsights({
      metric,
      timeField,
      prompt,
      promptFocus,
      stats: {
        rows: state.rows.length,
        columns: state.headers.length,
        numericFields: state.numericHeaders.length,
        missingValues: countMissingValues(state.rows, state.headers)
      },
      series: validSeries,
      sampleRows: state.rows.slice(0, 8),
      headers: state.headers
    }, latestAnalysisToken);
  }

  function buildSummary(metric, timeField, trendDirection, change, average, forecast, anomalyCount, promptFocus) {
    const changeText = change === null ? 'The dataset starts at zero, so change is measured conservatively.' : `The metric changed by ${formatSignedPercent(change)} across the selected range.`;
    const anomalyText = anomalyCount ? `PiTensor flagged ${anomalyCount} possible outlier${anomalyCount === 1 ? '' : 's'} for review.` : 'No strong outliers were found.';
    const promptText = promptFocus ? `Your prompt is being interpreted as a request to focus on ${promptFocus}.` : '';
    return `${metric} shows ${trendDirection} momentum over ${timeField || 'the dataset'}. ${changeText} Average value sits at ${formatNumber(average)}, and the next-period estimate is ${formatNumber(forecast)}. ${anomalyText} ${promptText}`.trim();
  }

  async function requestBackendInsights(payload, token) {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (token !== latestAnalysisToken) {
        return;
      }

      if (!response.ok && !data.insights) {
        throw new Error(data.error || 'OpenAI analysis failed.');
      }

      renderAiInsights(data.insights, Boolean(data.ok), data.warning || '');
    } catch (error) {
      if (token !== latestAnalysisToken) {
        return;
      }
      renderAiInsights(null, false, error.message || 'Unable to reach the AI backend.');
    }
  }

  function renderAiInsights(insights, success, warning) {
    if (!insights) {
      if (elements.backendStatus) {
        elements.backendStatus.textContent = warning || 'AI backend unavailable. Showing local insights.';
      }
      return;
    }

    const keyFindings = Array.isArray(insights.key_findings) ? insights.key_findings : [];
    const recommendations = Array.isArray(insights.recommendations) ? insights.recommendations : [];
    const risks = Array.isArray(insights.risks) ? insights.risks : [];

    let html = '';

    if (keyFindings.length) {
      html += `
        <div class="insight-group">
          <div class="insight-group-title">Key Findings</div>
          ${keyFindings.map(f => `<div class="insight-item insight-item--finding">${escapeHtml(f)}</div>`).join('')}
        </div>
      `;
    }

    if (recommendations.length) {
      html += `
        <div class="insight-group">
          <div class="insight-group-title">Recommendations</div>
          ${recommendations.map(r => `<div class="insight-item insight-item--step">${escapeHtml(r)}</div>`).join('')}
        </div>
      `;
    }

    if (risks.length) {
      html += `
        <div class="insight-group">
          <div class="insight-group-title">Risks & Anomalies</div>
          ${risks.map(r => `<div class="insight-item insight-item--risk">${escapeHtml(r)}</div>`).join('')}
        </div>
      `;
    }

    elements.insightList.innerHTML = html || '<div>No structured insights were returned.</div>';
    elements.aiSummary.innerHTML = `<strong>Executive Summary:</strong> ${escapeHtml(insights.summary || 'OpenAI returned structured insights.')}`;

    if (elements.backendStatus) {
      elements.backendStatus.textContent = success
        ? `OpenAI response received. Prompt focus: ${insights.prompt_focus || 'general analysis'}.`
        : warning || 'AI backend returned a fallback result.';
    }
  }

  function renderChart(series, min, max) {
    const width = 800;
    const height = 320;
    const padding = { top: 24, right: 24, bottom: 48, left: 56 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const range = max - min || 1;

    const positions = series.map((point, index) => {
      const x = padding.left + (series.length === 1 ? innerWidth / 2 : (index / (series.length - 1)) * innerWidth);
      const y = padding.top + innerHeight - ((point.value - min) / range) * innerHeight;
      return { ...point, x, y };
    });

    const path = positions.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
    const fillPath = `${path} L ${positions[positions.length - 1].x.toFixed(1)} ${height - padding.bottom} L ${positions[0].x.toFixed(1)} ${height - padding.bottom} Z`;
    const yTicks = buildTicks(min, max, 4);

    elements.chart.innerHTML = `
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(44,109,237,0.24)" />
          <stop offset="100%" stop-color="rgba(44,109,237,0.03)" />
        </linearGradient>
        <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#2c6ded" />
          <stop offset="100%" stop-color="#7a8ef7" />
        </linearGradient>
      </defs>
      ${yTicks.map((tick) => {
        const y = padding.top + innerHeight - ((tick - min) / (max - min || 1)) * innerHeight;
        return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid" />`;
      }).join('')}
      <path d="${fillPath}" fill="url(#areaFill)" />
      <path d="${path}" fill="none" stroke="url(#lineStroke)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      ${positions.map((point) => `
        <circle cx="${point.x}" cy="${point.y}" r="5" fill="#ffffff" stroke="#2c6ded" stroke-width="3">
          <title>${escapeHtml(point.label)}: ${formatNumber(point.value)}</title>
        </circle>
      `).join('')}
      ${positions.map((point) => `
        <text x="${point.x}" y="${height - 18}" text-anchor="middle" class="chart-label">${escapeHtml(shortLabel(point.label))}</text>
      `).join('')}
      ${yTicks.map((tick) => {
        const y = padding.top + innerHeight - ((tick - min) / (max - min || 1)) * innerHeight;
        return `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" class="chart-label">${formatNumber(tick)}</text>`;
      }).join('')}
    `;
  }

  function buildSeries(rows, metric, timeField) {
    return rows.map((row, index) => ({
      label: row[timeField] || `Row ${index + 1}`,
      value: toNumber(row[metric]),
      index
    })).sort((left, right) => {
      const leftTime = toComparableTime(left.label);
      const rightTime = toComparableTime(right.label);
      if (leftTime !== null && rightTime !== null) {
        return leftTime - rightTime;
      }
      return left.index - right.index;
    });
  }

  function countMissingValues(rows, headers) {
    return rows.reduce((count, row) => {
      return count + headers.reduce((missing, header) => {
        return missing + (String(row[header] ?? '').trim() === '' ? 1 : 0);
      }, 0);
    }, 0);
  }

  function detectAnomalies(values) {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) {
      return [];
    }
    return values
      .map((value, index) => ({ value, index, score: Math.abs((value - mean) / stdDev) }))
      .filter((point) => point.score >= 2);
  }

  function linearRegressionSlope(values) {
    const n = values.length;
    if (n < 2) {
      return 0;
    }
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((sum, value) => sum + value, 0) / n;
    let numerator = 0;
    let denominator = 0;
    for (let index = 0; index < n; index += 1) {
      const xDelta = index - xMean;
      const yDelta = values[index] - yMean;
      numerator += xDelta * yDelta;
      denominator += xDelta * xDelta;
    }
    return denominator === 0 ? 0 : numerator / denominator;
  }

  function isNumericColumn(rows, header) {
    let numericCount = 0;
    let totalCount = 0;
    rows.forEach((row) => {
      const value = String(row[header] ?? '').trim();
      if (value === '') {
        return;
      }
      totalCount += 1;
      if (Number.isFinite(toNumber(value))) {
        numericCount += 1;
      }
    });
    return totalCount > 0 && numericCount / totalCount >= 0.6;
  }

  function isTimeColumn(rows, header) {
    const normalizedHeader = header.toLowerCase();
    if (/(date|time|month|day|week|year|period)/.test(normalizedHeader)) {
      return true;
    }

    let parseableCount = 0;
    let totalCount = 0;
    rows.forEach((row) => {
      const value = String(row[header] ?? '').trim();
      if (value === '') {
        return;
      }
      totalCount += 1;
      if (toComparableTime(value) !== null) {
        parseableCount += 1;
      }
    });
    return totalCount > 0 && parseableCount / totalCount >= 0.6;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        row.push(cell);
        cell = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') {
          index += 1;
        }
        row.push(cell);
        if (row.some((entry) => String(entry).trim() !== '')) {
          rows.push(row);
        }
        row = [];
        cell = '';
        continue;
      }

      cell += char;
    }

    if (cell !== '' || row.length) {
      row.push(cell);
      if (row.some((entry) => String(entry).trim() !== '')) {
        rows.push(row);
      }
    }

    const headers = (rows.shift() || []).map((header) => String(header).trim());
    const objects = rows.map((rowValues) => {
      const object = {};
      headers.forEach((header, index) => {
        object[header] = rowValues[index] !== undefined ? rowValues[index].trim() : '';
      });
      return object;
    }).filter((object) => Object.values(object).some((value) => String(value).trim() !== ''));

    return { headers, rows: objects };
  }

  function toNumber(value) {
    const cleaned = String(value ?? '').replace(/[$,%\s,]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function toComparableTime(value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function buildTicks(min, max, count) {
    if (count < 2) {
      return [min, max];
    }
    const ticks = [];
    const step = (max - min) / (count - 1 || 1);
    for (let index = 0; index < count; index += 1) {
      ticks.push(min + step * index);
    }
    return ticks;
  }

  function setKpis(rows, columns, numeric, missing) {
    elements.rows.textContent = formatCompactNumber(rows);
    elements.columns.textContent = formatCompactNumber(columns);
    elements.numeric.textContent = formatCompactNumber(numeric);
    elements.missing.textContent = formatCompactNumber(missing);
  }

  function formatCompactNumber(value) {
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) {
      return 'n/a';
    }
    const magnitude = Math.abs(value);
    if (magnitude >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (magnitude >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    if (magnitude % 1 !== 0) {
      return value.toFixed(1);
    }
    return String(Math.round(value));
  }

  function formatSignedPercent(value) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  function formatPreviewCell(value) {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (Number.isFinite(Number(value)) && String(value).trim() !== '') {
      const numericValue = Number(value);
      return formatNumber(numericValue);
    }
    return String(value);
  }

  function shortLabel(value) {
    const text = String(value);
    if (text.length <= 10) {
      return text;
    }
    return `${text.slice(0, 9)}...`;
  }

  function interpretPrompt(prompt) {
    const normalized = prompt.toLowerCase();
    if (!normalized) {
      return '';
    }
    if (normalized.includes('anomal') || normalized.includes('outlier')) {
      return 'anomaly detection';
    }
    if (normalized.includes('forecast') || normalized.includes('predict')) {
      return 'forecasting';
    }
    if (normalized.includes('trend') || normalized.includes('growth')) {
      return 'trend analysis';
    }
    if (normalized.includes('segment') || normalized.includes('region') || normalized.includes('group')) {
      return 'segmentation';
    }
    return 'general analysis';
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
});
