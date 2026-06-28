function parsePagination(query) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
}

function buildPaginationMeta(total, pagination) {
  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.max(Math.ceil(total / pagination.limit), 1),
  };
}

module.exports = {
  parsePagination,
  buildPaginationMeta,
};
