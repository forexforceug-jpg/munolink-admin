import { supabase } from './supabase';

const LOCAL_API_URL = (
  import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:4000/api/v1'
).replace(/\/+$/, '');

const requestedSource = (import.meta.env.VITE_DATA_SOURCE || '').toLowerCase();
const MODE_KEY = 'munolink.admin.environment';
const envDefaultMode =
  requestedSource === 'local' || (!requestedSource && Boolean(import.meta.env.DEV))
    ? 'development'
    : 'production';

function readStoredMode() {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(MODE_KEY);
  return stored === 'development' || stored === 'production' ? stored : null;
}

const storedMode = readStoredMode();
let runtimeMode = storedMode || envDefaultMode;
let allowSupabaseFallback = !storedMode && runtimeMode === 'development';

export function getRuntimeMode() {
  return runtimeMode;
}

export function setRuntimeMode(mode) {
  const next = mode === 'development' ? 'development' : 'production';
  runtimeMode = next;
  allowSupabaseFallback = false;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(MODE_KEY, next);
  }
  return runtimeMode;
}

export function isLocalMode() {
  return runtimeMode === 'development';
}

export function getDataSourceMode() {
  return isLocalMode() ? 'local' : 'supabase';
}

export function getDataSourceLabel() {
  return isLocalMode() ? 'Local API' : 'Supabase';
}

const FILTER_OPERATORS = new Set([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'is',
  'in',
]);

function messageFrom(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload.error === 'string') return payload.error;
  if (payload.error?.message) return payload.error.message;
  if (payload.message) return payload.message;
  return fallback;
}

function tagError(error, fallback) {
  const wrapped = error instanceof Error ? error : new Error(String(error));
  wrapped.fallback = Boolean(fallback);
  return wrapped;
}

function splitTopLevel(input) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (const character of input) {
    if (quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  if (current.trim()) parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function coerceOrValue(raw) {
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw;
}

function parseOrExpression(expression) {
  const parts = splitTopLevel(expression);
  if (!parts.length) return [];
  return parts.map((part) => {
    const match = /^([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z]+)\.([\s\S]*)$/.exec(part);
    if (!match) {
      throw new Error(`Unsupported OR expression: ${part}`);
    }
    const [, column, operator, rawValue] = match;
    if (!FILTER_OPERATORS.has(operator)) {
      throw new Error(`Unsupported OR operator: ${operator}`);
    }
    return {
      column,
      operator,
      value: operator === 'in' ? splitTopLevel(rawValue.replace(/^\(|\)$/g, '')).map(coerceOrValue) : coerceOrValue(rawValue),
    };
  });
}

async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

async function runLocal(builder) {
  const token = await accessToken();
  const orGroups = builder.orExpressions.map(parseOrExpression);
  const body = {
    table: builder.table,
    operation: builder.operation,
    select: builder.columns || '*',
    filters: builder.filters,
    orGroups,
    values: builder.values,
    order: builder.orders.map(({ column, ascending }) => ({ column, ascending })),
    limit: builder.limitValue,
    offset: builder.offsetValue,
    count: builder.count,
    head: builder.head,
    returning: builder.operation !== 'select' ? true : builder.returning,
    cardinality: builder.cardinality,
    onConflict: builder.onConflict,
    ignoreDuplicates: builder.ignoreDuplicates,
  };

  let response;
  try {
    response = await fetch(`${LOCAL_API_URL}/data/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw tagError(error, allowSupabaseFallback && builder.operation === 'select');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(
      messageFrom(payload, `Local API request failed (${response.status})`)
    );
    error.status = response.status;
    error.fallback = allowSupabaseFallback && builder.operation === 'select';
    throw error;
  }

  return {
    data: payload?.data ?? null,
    error: null,
    count: payload?.count ?? null,
  };
}

function applySupabaseFilter(query, filter) {
  const { column, operator, value, negate } = filter;
  if (negate) return query.not(column, operator, value);
  if (operator === 'in') return query.in(column, value);
  if (operator === 'is') return query.is(column, value);
  return query[operator](column, value);
}

async function runSupabase(builder) {
  let query;
  if (builder.operation === 'select') {
    query = supabase
      .from(builder.table)
      .select(builder.columns || '*', {
        count: builder.count ? 'exact' : undefined,
        head: builder.head || undefined,
      });
  } else if (builder.operation === 'insert') {
    query = supabase.from(builder.table).insert(builder.values);
  } else if (builder.operation === 'upsert') {
    query = supabase.from(builder.table).upsert(builder.values, {
      onConflict: builder.onConflict,
      ignoreDuplicates: builder.ignoreDuplicates,
    });
  } else if (builder.operation === 'update') {
    query = supabase.from(builder.table).update(builder.values);
  } else if (builder.operation === 'delete') {
    query = supabase.from(builder.table).delete();
  } else {
    throw new Error(`Unsupported operation: ${builder.operation}`);
  }

  for (const filter of builder.filters) {
    query = applySupabaseFilter(query, filter);
  }
  for (const expression of builder.orExpressions) {
    query = query.or(expression);
  }
  for (const order of builder.orders) {
    query = query.order(order.column, {
      ascending: order.ascending,
      nullsFirst: order.nullsFirst,
    });
  }

  if (builder.operation !== 'select') {
    query = query.select(builder.columns || '*');
  }

  if (builder.head) {
    query = query.limit(1);
  } else if (builder.offsetValue > 0) {
    query = query.range(
      builder.offsetValue,
      builder.offsetValue + Math.max(builder.limitValue, 1) - 1
    );
  } else if (builder.limitValue !== null) {
    query = query.limit(builder.limitValue);
  }

  if (builder.cardinality === 'single') query = query.single();
  if (builder.cardinality === 'maybeSingle') query = query.maybeSingle();

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, error: null, count: count ?? null };
}

class AdminQuery {
  constructor(table) {
    this.table = table;
    this.operation = 'select';
    this.columns = '*';
    this.filters = [];
    this.orExpressions = [];
    this.orders = [];
    this.limitValue = 100;
    this.offsetValue = 0;
    this.count = false;
    this.head = false;
    this.returning = false;
    this.cardinality = 'many';
    this.values = undefined;
    this.onConflict = undefined;
    this.ignoreDuplicates = false;
  }

  select(columns = '*', options = {}) {
    this.columns = columns;
    this.count = Boolean(options.count);
    this.head = Boolean(options.head);
    this.returning = true;
    return this;
  }

  insert(values) {
    this.operation = 'insert';
    this.values = values;
    return this;
  }

  upsert(values, options = {}) {
    this.operation = 'upsert';
    this.values = values;
    this.onConflict = options.onConflict;
    this.ignoreDuplicates = Boolean(options.ignoreDuplicates);
    return this;
  }

  update(values) {
    this.operation = 'update';
    this.values = values;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  where(operator, column, value, negate = false) {
    this.filters.push({ column, operator, value, ...(negate ? { negate: true } : {}) });
    return this;
  }

  eq(column, value) {
    return this.where('eq', column, value);
  }

  neq(column, value) {
    return this.where('neq', column, value);
  }

  gt(column, value) {
    return this.where('gt', column, value);
  }

  gte(column, value) {
    return this.where('gte', column, value);
  }

  lt(column, value) {
    return this.where('lt', column, value);
  }

  lte(column, value) {
    return this.where('lte', column, value);
  }

  like(column, value) {
    return this.where('like', column, value);
  }

  ilike(column, value) {
    return this.where('ilike', column, value);
  }

  in(column, values) {
    return this.where('in', column, values);
  }

  is(column, value) {
    return this.where('is', column, value);
  }

  not(column, operator, value) {
    return this.where(operator, column, value, true);
  }

  or(expression) {
    if (expression) this.orExpressions.push(expression);
    return this;
  }

  order(column, options = {}) {
    this.orders.push({
      column,
      ascending: options.ascending !== false,
      nullsFirst: options.nullsFirst,
    });
    return this;
  }

  limit(value) {
    this.limitValue = value;
    return this;
  }

  range(from, to) {
    this.offsetValue = from;
    this.limitValue = Math.max(to - from + 1, 1);
    return this;
  }

  single() {
    this.cardinality = 'single';
    return this;
  }

  maybeSingle() {
    this.cardinality = 'maybeSingle';
    return this;
  }

  async execute() {
    try {
      if (isLocalMode()) {
        try {
          return await runLocal(this);
        } catch (error) {
          if (error.fallback && this.operation === 'select') {
            return await runSupabase(this);
          }
          throw error;
        }
      }
      return await runSupabase(this);
    } catch (error) {
      return {
        data: null,
        error: {
          message: error?.message || 'Request failed.',
          code: error?.code ? String(error.code) : error?.status ? String(error.status) : undefined,
          details: error?.details ?? null,
        },
        count: null,
      };
    }
  }

  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this.execute().catch(onRejected);
  }
}

export function db(table) {
  return new AdminQuery(table);
}

export const from = db;

export default {
  from: db,
  isLocalMode,
  getRuntimeMode,
  setRuntimeMode,
  getDataSourceMode,
  getDataSourceLabel,
};
