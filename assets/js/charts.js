'use strict';

// Charts use native SVG and the same cleaned CSV exported by KNIME.
// No external chart library or network service is required.
const TVExplorer = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const technologies = ['LCD (LED)', 'LCD', 'OLED'];
  const starRatings = Array.from({length: 15}, (_, index) => 1 + index * 0.5);
  const colour = {'LCD (LED)': 'led', LCD: 'lcd', OLED: 'oled'};
  const format = (value, digits = 0) => Number(value).toLocaleString('en-AU', {maximumFractionDigits: digits});
  let allRows = [];
  let currentRows = [];
  let resizeTimer;
  // Each plot keeps its own view choice. Zoom changes the axis, never the statistics.
  const chartRanges = {'size-chart': 'full', 'distribution-chart': 'full'};

  function energyRange(rows, stats) {
    const full = niceMaximum(Math.max(...rows.map(row => row.AnnualEnergyKWh)));
    // Keep every box and whisker visible; zoom only moves high outliers off screen.
    const focus = Math.min(full, niceMaximum(Math.max(...stats.map(group => group.high))));
    return {full, focus};
  }
  function rangeStatus(id, rows, limits) {
    const focused = chartRanges[id] === 'focus';
    const maximum = focused ? limits.focus : limits.full;
    const outside = rows.filter(row => row.AnnualEnergyKWh > maximum).length;
    const note = document.getElementById(`${id}-range-note`);
    note.textContent = focused
      ? `Focused range: 0–${format(maximum)} kWh/year. ${format(outside)} of ${format(rows.length)} records above this range. Medians and quartiles still use all matching records. Select Full range to see every value.`
      : `Full range: 0–${format(maximum)} kWh/year. All ${format(rows.length)} matching records are included.`;
    note.classList.toggle('is-focused', focused);
    document.querySelectorAll(`[data-range-chart="${id}"]`).forEach(button => {
      button.disabled = false;
      button.setAttribute('aria-pressed', String(button.dataset.range === chartRanges[id]));
    });
    return maximum;
  }

  // CSV parser supports quoted commas, escaped quotes, CRLF, and quoted newlines.
  function parseCSV(text) {
    const records = [];
    let row = [], field = '', quoted = false;
    text = text.replace(/^\uFEFF/, '');
    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      if (char === '"') {
        if (quoted && text[index + 1] === '"') {field += '"'; index++;}
        else quoted = !quoted;
      } else if (char === ',' && !quoted) {row.push(field); field = '';}
      else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && text[index + 1] === '\n') index++;
        row.push(field); if (row.some(value => value !== '')) records.push(row);
        row = []; field = '';
      } else field += char;
    }
    if (quoted) throw new Error('The CSV contains an unclosed quoted value.');
    if (field || row.length) {row.push(field); records.push(row);}
    const headers = records.shift();
    if (!headers) throw new Error('The CSV is empty.');
    const numeric = ['ScreenSizeCm','ScreenAreaCm2','AveragePowerW','AnnualEnergyKWh','StarRating','ScreenSizeInches'];
    const required = ['Model','Brand','ScreenTechnology',...numeric];
    if (!required.every(header => headers.includes(header))) throw new Error('The CSV is missing required columns.');
    return records.map((cells, index) => {
      if (cells.length !== headers.length) throw new Error(`Unexpected column count on CSV row ${index + 2}.`);
      const record = Object.fromEntries(headers.map((key, column) => [key, cells[column]]));
      numeric.forEach(key => {
        if (record[key].trim() === '' || !Number.isFinite(Number(record[key]))) throw new Error(`Invalid ${key} on CSV row ${index + 2}.`);
        record[key] = Number(record[key]);
      });
      return record;
    });
  }

  function quantile(sorted, fraction) {
    if (!sorted.length) return null;
    const position = (sorted.length - 1) * fraction;
    const lower = Math.floor(position);
    const remainder = position - lower;
    return sorted[lower] + remainder * ((sorted[lower + 1] ?? sorted[lower]) - sorted[lower]);
  }
  const median = values => quantile([...values].sort((a, b) => a - b), 0.5);
  function groupStats(rows) {
    return technologies.map(name => {
      const values = rows.filter(row => row.ScreenTechnology === name).map(row => row.AnnualEnergyKWh).sort((a,b) => a-b);
      if (!values.length) return null;
      const q1 = quantile(values, .25), q3 = quantile(values, .75), mid = quantile(values, .5);
      const iqr = q3 - q1;
      const low = values.find(value => value >= q1 - 1.5 * iqr);
      const high = [...values].reverse().find(value => value <= q3 + 1.5 * iqr);
      return {name, count: values.length, median: mid, q1, q3, low, high,
        outliers: values.filter(value => value < low || value > high), maximum: values.at(-1)};
    }).filter(Boolean);
  }

  function element(tag, attributes = {}, text = '') {
    const node = document.createElementNS(NS, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== '') node.textContent = text;
    return node;
  }
  function add(parent, tag, attributes, text) {const node = element(tag, attributes, text); parent.append(node); return node;}
  function canvas(id, label, height = 280) {
    const container = document.getElementById(id);
    container.replaceChildren(); container.setAttribute('aria-busy', 'false');
    const width = Math.max(260, container.clientWidth);
    const svg = element('svg', {viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': label});
    add(svg, 'title', {}, label); container.append(svg);
    return {container, svg, width, height};
  }
  function niceMaximum(value) {
    if (value <= 0) return 1;
    const roughStep = value / 4;
    const power = 10 ** Math.floor(Math.log10(roughStep));
    const step = Math.ceil(roughStep / power) * power;
    return Math.ceil(value / step) * step;
  }
  function axes(svg, width, height, maximum, options = {}) {
    const left = options.left ?? 49, right = 15, top = 24, bottom = options.bottom ?? 43;
    const plotWidth = width - left - right, plotHeight = height - top - bottom;
    const y = value => top + plotHeight * (1 - value / maximum);
    for (let i = 0; i <= 4; i++) {
      const value = maximum * i / 4, position = y(value);
      add(svg, 'line', {x1: left, y1: position, x2: width - right, y2: position, class: 'grid-line'});
      add(svg, 'text', {x: left - 9, y: position + 4, 'text-anchor': 'end', class: 'tick-label'}, format(value, value < 5 ? 1 : 0));
    }
    add(svg, 'line', {x1: left, y1: y(0), x2: width - right, y2: y(0), class: 'axis-line'});
    return {left, top, plotWidth, plotHeight, y};
  }
  function table(id, headers, rows, caption) {
    const holder = document.getElementById(`${id}-table`);
    holder.replaceChildren();
    const tableNode = document.createElement('table');
    const title = tableNode.createCaption(); title.textContent = caption;
    const head = tableNode.createTHead().insertRow();
    headers.forEach(header => {const th = document.createElement('th'); th.scope = 'col'; th.textContent = header; head.append(th);});
    const body = tableNode.createTBody();
    rows.forEach(values => {const row = body.insertRow(); values.forEach(value => {row.insertCell().textContent = value;});});
    holder.append(tableNode);
  }
  function empty(id) {
    const container = document.getElementById(id); container.replaceChildren();container.setAttribute('aria-busy','false');
    const message = document.createElement('p');message.className = 'empty-chart';message.textContent = 'No records match these filters. Try a wider selection.';container.append(message);
    document.getElementById(`${id}-table`).textContent = 'No matching records.';
    const note = document.getElementById(`${id}-range-note`);
    if (note) {
      note.textContent = 'Choose a wider filter selection to explore this chart.';
      note.classList.remove('is-focused');
      document.querySelectorAll(`[data-range-chart="${id}"]`).forEach(button => {button.disabled = true;});
    }
  }

  function bars(id, items, label, unit, options = {}) {
    if (!items.length) return empty(id);
    const height = options.height ?? 310;
    const {svg, width} = canvas(id, label, height);
    let maximum = niceMaximum(Math.max(...items.map(item => item.value)));
    // Counts need whole-number tick marks, even after filtering down to a few TVs.
    if (unit === 'TV records') maximum = Math.max(4, Math.ceil(maximum / 4) * 4);
    const {left, top, plotWidth, plotHeight, y} = axes(svg, width, height, maximum, {left: 67, bottom: 66});
    add(svg, 'text', {transform: `translate(15 ${top + plotHeight / 2}) rotate(-90)`, 'text-anchor': 'middle', class: 'axis-label'}, options.yLabel ?? unit);
    add(svg, 'text', {x: left + plotWidth / 2, y: height - 8, 'text-anchor': 'middle', class: 'axis-label'}, options.xLabel ?? 'Category');
    const step = plotWidth / items.length, barWidth = Math.min(64, step * .62);
    items.forEach((item, index) => {
      const x = left + step * (index + .5);
      const rect = add(svg, 'rect', {x: x - barWidth / 2, y: y(item.value), width: barWidth, height: Math.max(0, y(0) - y(item.value)), rx: 3, class: `bar ${colour[item.name] || ''}`});
      add(rect, 'title', {}, `${item.name}: ${format(item.value, 1)} ${unit}`);
      if (options.showValues !== false) add(svg, 'text', {x, y: y(item.value) - 7, 'text-anchor': 'middle', class: items.length > 8 ? 'value-label compact-value-label' : 'value-label'}, format(item.value, options.valueDigits ?? 0));
      add(svg, 'text', {x, y: y(0) + 23, 'text-anchor': 'middle', class: 'tick-label'}, item.name);
    });
    table(id, [id === 'rating-chart' ? 'Star rating' : 'Technology', unit], items.map(item => [item.name, format(item.value, 1)]), label);
  }

  function scatter(rows) {
    const id = 'size-chart';
    if (!rows.length) return empty(id);
    const limits = energyRange(rows, groupStats(rows));
    const maxEnergy = rangeStatus(id, rows, limits);
    const visibleRows = rows.filter(row => row.AnnualEnergyKWh <= maxEnergy);
    const {container, svg, width, height} = canvas(id, `${format(visibleRows.length)} of ${format(rows.length)} TV records visible: screen size in inches versus annual energy in kWh per year. Arrow keys explore visible points when the chart is focused.`, 480);
    const maxSize = niceMaximum(Math.max(...rows.map(row => row.ScreenSizeInches)));
    const {left, plotWidth, plotHeight, top, y} = axes(svg, width, height, maxEnergy, {left: 60, bottom: 56});
    const x = value => left + value / maxSize * plotWidth;
    for (let index = 0; index <= 4; index++) {
      const value = maxSize * index / 4;
      add(svg, 'text', {x: x(value), y: y(0) + 21, 'text-anchor': 'middle', class: 'tick-label'}, format(value, 1));
    }
    add(svg, 'text', {x: left + plotWidth / 2, y: height - 7, 'text-anchor': 'middle', class: 'axis-label'}, 'Screen size (inches)');
    add(svg, 'text', {transform: `translate(13 ${top + plotHeight / 2}) rotate(-90)`, 'text-anchor': 'middle', class: 'axis-label'}, 'Annual energy (kWh/year)');
    const points = add(svg, 'g', {});
    visibleRows.forEach((row, index) => {
      const dot = add(points, 'circle', {cx: x(row.ScreenSizeInches), cy: y(row.AnnualEnergyKWh), r: visibleRows.length < 150 ? 4.5 : 3.2, class: `point ${colour[row.ScreenTechnology] || ''}`, 'data-index': index});
      add(dot, 'title', {}, `${row.Brand} ${row.Model} | ${format(row.ScreenSizeInches,1)} inches | ${format(row.AnnualEnergyKWh,1)} kWh/year | ${row.ScreenTechnology}`);
    });
    const legend = document.createElement('div'); legend.className = 'chart-legend';
    technologies.filter(technology => rows.some(row => row.ScreenTechnology === technology)).forEach(technology => {
      const item = document.createElement('span'); item.className = 'legend-item';
      const swatch = document.createElement('span');swatch.className = `legend-swatch ${colour[technology]}`;
      item.append(swatch, document.createTextNode(technology));legend.append(item);
    });
    container.prepend(legend);
    const detail = document.createElement('p');detail.className = 'point-detail';detail.id = 'point-detail';detail.setAttribute('aria-live','polite');
    detail.textContent = 'Select a point to inspect a TV. Keyboard: focus the chart, then use the left and right arrow keys.';
    container.append(detail);svg.setAttribute('tabindex','0');svg.setAttribute('aria-describedby','size-chart-range-note point-detail');
    let selected = -1;
    function show(index) {
      if (!Number.isInteger(index) || !visibleRows[index]) return;
      if (selected >= 0) points.children[selected].classList.remove('selected');
      selected = index;points.children[selected].classList.add('selected');
      const row = visibleRows[index];
      detail.textContent = `${row.Brand} · ${row.Model} · ${row.ScreenTechnology} · ${format(row.ScreenSizeInches,1)} inches · ${format(row.AnnualEnergyKWh,1)} kWh/year · ${format(row.StarRating,1)} stars`;
    }
    svg.addEventListener('click', event => {if (event.target.matches('circle[data-index]')) show(Number(event.target.dataset.index));});
    svg.addEventListener('mouseover', event => {if (event.target.matches('circle[data-index]')) show(Number(event.target.dataset.index));});
    svg.addEventListener('keydown', event => {
      if (!['ArrowRight','ArrowLeft'].includes(event.key)) return;
      event.preventDefault();show((selected + (event.key === 'ArrowRight' ? 1 : -1) + visibleRows.length) % visibleRows.length);
    });
    table(id, ['Brand','Model','Technology','Size (in)','Energy (kWh/year)','Stars'],
      rows.slice(0,50).map(row => [row.Brand,row.Model,row.ScreenTechnology,format(row.ScreenSizeInches,2),format(row.AnnualEnergyKWh,1),format(row.StarRating,1)]),
      `First ${Math.min(50,rows.length)} of ${format(rows.length)} matching records, including values outside the focused range. Download the CSV for all rows.`);
  }

  function boxPlot(stats, rows) {
    const id = 'distribution-chart';
    if (!stats.length) return empty(id);
    const maximum = rangeStatus(id, rows, energyRange(rows, stats));
    const {svg,width,height} = canvas(id, 'Distribution of annual energy in kWh per year by screen technology. Boxes show the middle 50 percent and a median line. Read the range notice for values outside the view.', 440);
    svg.setAttribute('aria-describedby', 'distribution-chart-range-note');
    const {left,plotWidth,plotHeight,top,y} = axes(svg,width,height,maximum,{left:60,bottom:82});
    add(svg, 'text', {transform: `translate(13 ${top + plotHeight / 2}) rotate(-90)`, 'text-anchor': 'middle', class: 'axis-label'}, 'Annual energy (kWh/year)');
    const step = plotWidth / stats.length, boxWidth = Math.min(110,step * .48);
    stats.forEach((group,index) => {
      const x = left + step * (index + .5);
      add(svg,'line',{x1:x,y1:y(group.high),x2:x,y2:y(group.low),class:'whisker'});
      [group.low,group.high].forEach(value => add(svg,'line',{x1:x-boxWidth/4,y1:y(value),x2:x+boxWidth/4,y2:y(value),class:'whisker'}));
      const box = add(svg,'rect',{x:x-boxWidth/2,y:y(group.q3),width:boxWidth,height:Math.max(1,y(group.q1)-y(group.q3)),class:`box ${colour[group.name] || ''}`});
      add(box,'title',{},`${group.name}: Q1 ${format(group.q1,1)}, median ${format(group.median,1)}, Q3 ${format(group.q3,1)} kWh/year`);
      add(svg,'line',{x1:x-boxWidth/2,y1:y(group.median),x2:x+boxWidth/2,y2:y(group.median),class:'median-line'});
      group.outliers.filter(value => value <= maximum).forEach(value => {const dot = add(svg,'circle',{cx:x,cy:y(value),r:2.7,class:'outlier'});add(dot,'title',{},`${group.name}: ${format(value,1)} kWh/year`);});
      add(svg,'text',{x,y:y(0)+24,'text-anchor':'middle',class:'box-category'},group.name);
      add(svg,'text',{x,y:y(0)+47,'text-anchor':'middle',class:'median-label'},`Median: ${format(group.median,1)}`);
      add(svg,'text',{x,y:y(0)+67,'text-anchor':'middle',class:'box-count'},`${format(group.count)} records`);
    });
    table(id,['Technology','Records','Lower whisker','Q1','Median','Q3','Upper whisker','Outliers'],stats.map(group => [group.name,group.count,...[group.low,group.q1,group.median,group.q3,group.high].map(value => format(value,1)),group.outliers.length]),'Annual energy in kWh/year. Quartiles use linear interpolation; whiskers extend to observations within 1.5 × IQR.');
  }

  function render(rows) {
    currentRows = rows;
    document.getElementById('record-count').textContent = format(rows.length);
    document.getElementById('median-energy').textContent = rows.length ? format(median(rows.map(row => row.AnnualEnergyKWh)),1) : '—';
    document.getElementById('median-size').textContent = rows.length ? format(median(rows.map(row => row.ScreenSizeInches)),1) : '—';
    document.getElementById('data-status').textContent = `Showing ${format(rows.length)} of ${format(allRows.length)} TV records`;
    const stats = groupStats(rows);
    const technologyCounts = rows.length ? technologies.map(name => ({name,value:rows.filter(row => row.ScreenTechnology === name).length})) : [];
    bars('technology-chart',technologyCounts,'TV record counts by screen technology','TV records',{xLabel:'Screen technology',yLabel:'Number of TV records'});
    const ratings = new Map();rows.forEach(row => ratings.set(row.StarRating,(ratings.get(row.StarRating)||0)+1));
    const ratingCounts = rows.length ? starRatings.map(rating => ({name:format(rating,1),value:ratings.get(rating) || 0})) : [];
    bars('rating-chart',ratingCounts,'TV record counts by star rating','TV records',{xLabel:'Energy star rating',yLabel:'Number of TV records'});
    bars('median-chart',stats.map(group=>({name:group.name,value:group.median})),'Median labelled annual energy by screen technology','Median kWh/year',{xLabel:'Screen technology',yLabel:'Median annual energy (kWh/year)',valueDigits:1});
    scatter(rows);boxPlot(stats, rows);
  }

  function applyFilters() {
    const minInput = document.getElementById('min-size'), maxInput = document.getElementById('max-size');
    const min = minInput.value === '' ? 0 : minInput.valueAsNumber;
    const max = maxInput.value === '' ? Infinity : maxInput.valueAsNumber;
    const invalid = minInput.validity.badInput || maxInput.validity.badInput || !Number.isFinite(min) || (maxInput.value !== '' && !Number.isFinite(max)) || min < 0 || max < 0 || min > max;
    [minInput,maxInput].forEach(input=>input.setAttribute('aria-invalid',String(invalid)));
    document.getElementById('filter-error').textContent = invalid ? 'Use positive sizes, with From no larger than To. Charts keep the last valid selection.' : '';
    if (invalid) return;
    const technology = document.getElementById('technology').value, brand = document.getElementById('brand-filter').value;
    render(allRows.filter(row=>(!technology||row.ScreenTechnology===technology)&&(!brand||row.Brand===brand)&&row.ScreenSizeInches>=min&&row.ScreenSizeInches<=max));
  }
  async function start() {
    try {
      const response = await fetch('assets/data/tv_energy_cleaned.csv');
      if (!response.ok) throw new Error(`Data request failed (${response.status}).`);
      allRows = parseCSV(await response.text());
      [['technology',technologies],['brand-filter',[...new Set(allRows.map(row=>row.Brand))].sort()]].forEach(([id,values])=>{
        const select = document.getElementById(id);
        values.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option);});select.disabled=false;
      });
      const filters = document.getElementById('filters');
      filters.addEventListener('input',applyFilters);
      filters.addEventListener('submit',event=>{event.preventDefault();applyFilters();});
      filters.addEventListener('reset',()=>setTimeout(applyFilters,0));
      document.querySelectorAll('[data-range-chart]').forEach(button => {
        button.addEventListener('click', () => {
          const id = button.dataset.rangeChart;
          chartRanges[id] = button.dataset.range;
          if (id === 'size-chart') scatter(currentRows);
          else boxPlot(groupStats(currentRows), currentRows);
        });
      });
      window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>render(currentRows),180);});
      render(allRows);
    } catch (error) {
      const status = document.getElementById('data-status');status.className='error-banner';
      status.textContent='The TV data could not be loaded. Open this site through its local web server and check that assets/data/tv_energy_cleaned.csv is present. Refresh to retry.';
      ['technology-chart','rating-chart','size-chart','median-chart','distribution-chart'].forEach(id=>{
        const holder=document.getElementById(id);holder.setAttribute('aria-busy','false');holder.textContent='Chart unavailable until the data loads.';
      });
      console.error(error);
    }
  }
  start();
  return {parseCSV,quantile,groupStats};
})();
