const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 200;
const LEGACY_LIMIT = 100;

function parsePositiveInt(value, fallback) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 1) return fallback;
    return parsed;
}

function parseDate(value) {
    if (value === undefined || value === null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
}

function parseSort(value) {
    return String(value || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
}

function isTruthy(value) {
    return String(value || '').toLowerCase() === 'true';
}

function parseListQuery(query = {}) {
    const page = parsePositiveInt(query.page, 1);
    const limit = Math.min(parsePositiveInt(query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const hasPagination = query.page !== undefined || query.limit !== undefined || isTruthy(query.paginated);
    const rawBoxId = query.box_id;
    const boxId = rawBoxId !== undefined && rawBoxId !== null && String(rawBoxId).trim() !== ''
        ? String(rawBoxId).trim()
        : null;

    return {
        page,
        limit,
        offset: (page - 1) * limit,
        paginated: hasPagination,
        search: typeof query.search === 'string' ? query.search.trim() : '',
        boxId,
        start: parseDate(query.start),
        end: parseDate(query.end),
        sort: parseSort(query.sort),
        latestPerBox: isTruthy(query.latest_per_box),
        legacyLimit: LEGACY_LIMIT
    };
}

function paginationMeta(listQuery, total) {
    return {
        page: listQuery.page,
        limit: listQuery.limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / listQuery.limit) : 0
    };
}

module.exports = {
    DEFAULT_LIMIT,
    LEGACY_LIMIT,
    MAX_LIMIT,
    paginationMeta,
    parseListQuery
};
