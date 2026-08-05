/**
 * Filtros da fila de comércio no back-office.
 */

export function isBizRejected(n) {
  return Boolean(n?.rejeitado)
}

export function isBizPending(n) {
  return !n?.aprovado && !isBizRejected(n)
}

export function isBizApproved(n) {
  return Boolean(n?.aprovado) && !isBizRejected(n)
}

export function bizMissingCoords(n) {
  return (
    !Number.isFinite(Number(n?.lat)) || !Number.isFinite(Number(n?.lng))
  )
}

/**
 * @param {object[]} negocios
 * @param {{ filter?: string, query?: string }} [opts]
 */
export function filterAdminBusinesses(negocios, opts = {}) {
  const list = Array.isArray(negocios) ? negocios : []
  const filter = opts.filter || 'all'
  const q = String(opts.query || '')
    .trim()
    .toLowerCase()

  const pending = list.filter(isBizPending)
  const approved = list.filter(isBizApproved)
  const rejected = list.filter(isBizRejected)
  const nocoords = approved.filter(bizMissingCoords)
  const featured = list.filter((n) => Boolean(n.destaque))

  let out =
    filter === 'pending'
      ? pending
      : filter === 'approved'
        ? approved
        : filter === 'rejected'
          ? rejected
          : filter === 'nocoords'
            ? nocoords
            : filter === 'featured'
              ? featured
              : list

  if (q) {
    out = out.filter(
      (n) =>
        String(n.nome || '')
          .toLowerCase()
          .includes(q) ||
        String(n.morada || '')
          .toLowerCase()
          .includes(q) ||
        String(n.tipo || '')
          .toLowerCase()
          .includes(q),
    )
  }
  return out
}
