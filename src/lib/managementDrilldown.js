const FILTERS_KEY = 'f';
const DRILLDOWN_KEY = 'd';
const SOURCE_TAB_KEY = 'tab';

function encodePayload(value) {
  return encodeURIComponent(JSON.stringify(value));
}

function decodePayload(value, fallback) {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return fallback;
  }
}

export function createManagementListSearch({ filters, drilldown, sourceTab }) {
  const params = new URLSearchParams();
  if (filters) {
    params.set(FILTERS_KEY, encodePayload(filters));
  }
  if (drilldown) {
    params.set(DRILLDOWN_KEY, encodePayload(drilldown));
  }
  if (sourceTab) {
    params.set(SOURCE_TAB_KEY, sourceTab);
  }
  return `?${params.toString()}`;
}

export function parseManagementListSearch(search) {
  const params = new URLSearchParams(search || '');
  return {
    filters: decodePayload(params.get(FILTERS_KEY), null),
    drilldown: decodePayload(params.get(DRILLDOWN_KEY), { type: 'ALL' }),
    sourceTab: params.get(SOURCE_TAB_KEY) || 'geral',
  };
}

