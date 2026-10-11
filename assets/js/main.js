'use strict';

// Shared behaviour is kept outside the HTML so all three pages use the same code.
document.querySelectorAll('[data-year]').forEach(element => {
  element.textContent = new Date().getFullYear();
});

document.querySelectorAll('.faq-toggle').forEach(button => {
  button.addEventListener('click', () => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!isOpen));
    document.getElementById(button.getAttribute('aria-controls')).hidden = isOpen;
    button.querySelector('span').textContent = isOpen ? '+' : '−';
  });
});

// Numbers are validated before any calculation. Zero is a valid input.
function calculateEnergy(power, hours, rate) {
  const daily = (power / 1000) * hours;
  return { daily, monthly: daily * 30, yearly: daily * 365,
    monthlyCost: daily * 30 * rate / 100, yearlyCost: daily * 365 * rate / 100 };
}

const energyForm = document.getElementById('energy-form');
if (energyForm) {
  const fields = [
    { id: 'power', max: 100000, label: 'Enter watts between 0 and 100,000.' },
    { id: 'hours', max: 24, label: 'Enter daily hours between 0 and 24.' },
    { id: 'rate', max: 1000, label: 'Enter a rate between 0 and 1,000 cents/kWh.' }
  ];
  const results = document.getElementById('calculator-results');
  function updateEstimate(focusError = false) {
    let firstError;
    const values = fields.map(field => {
      const input = document.getElementById(field.id);
      const value = input.valueAsNumber;
      const invalid = input.value.trim() === '' || !Number.isFinite(value) || value < 0 || value > field.max;
      input.setAttribute('aria-invalid', String(invalid));
      document.getElementById(`${field.id}-error`).textContent = invalid ? field.label : '';
      if (invalid && !firstError) firstError = input;
      return value;
    });
    if (firstError) {
      results.replaceChildren();
      const message = document.createElement('p');
      message.textContent = 'Check the highlighted inputs to calculate your estimate.';
      results.append(message);
      if (focusError) firstError.focus();
      return null;
    }
    const estimate = calculateEnergy(...values);
    const number = value => value.toLocaleString('en-AU', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    const cost = value => value.toLocaleString('en-AU', {style: 'currency', currency: 'AUD'});
    const entries = [
      ['Daily energy', number(estimate.daily), 'kWh'],
      ['Monthly energy', number(estimate.monthly), 'kWh'],
      ['Yearly energy', number(estimate.yearly), 'kWh'],
      ['Estimated yearly cost', cost(estimate.yearlyCost), 'AUD']
    ];
    results.replaceChildren(...entries.map(([label, value, unit], index) => {
      const item = document.createElement('div');
      item.className = `result-item${index === 3 ? ' cost' : ''}`;
      const title = document.createElement('span'); title.textContent = label;
      const output = document.createElement('strong'); output.textContent = value;
      const small = document.createElement('small'); small.textContent = unit;
      output.append(small); item.append(title, output); return item;
    }));
    return estimate;
  }
  energyForm.addEventListener('submit', event => {event.preventDefault(); updateEstimate(true);});
  energyForm.addEventListener('input', () => updateEstimate());
  updateEstimate();

  // Optional browser capability: use the same visible form and validation for agents.
  const context = document.modelContext;
  if (context?.registerTool) {
    try {
      Promise.resolve(context.registerTool({
        name: 'calculate_appliance_energy', title: 'Calculate appliance energy',
        description: 'Set the visible calculator inputs and show estimated energy and cost.',
        inputSchema: {type: 'object', additionalProperties: false,
          properties: {power: {type: 'number', minimum: 0, maximum: 100000}, hours: {type: 'number', minimum: 0, maximum: 24}, rate: {type: 'number', minimum: 0, maximum: 1000}}, required: ['power','hours','rate']},
        annotations: {readOnlyHint: false, untrustedContentHint: false},
        execute(input) {
          for (const field of fields) {
            if (typeof input[field.id] !== 'number' || !Number.isFinite(input[field.id]) || input[field.id] < 0 || input[field.id] > field.max) throw new Error(field.label);
          }
          fields.forEach(field => {document.getElementById(field.id).value = String(input[field.id]);});
          return updateEstimate();
        }
      })).catch(() => {});
    } catch (_) { /* Browsers without WebMCP still use the normal form. */ }
  }
}
