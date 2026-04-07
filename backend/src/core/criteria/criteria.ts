export type SortOrder = 'asc' | 'desc'

export interface PaginationParams {
  page: number
  limit: number
}

export interface SortParams<T extends string = string> {
  field: T
  order: SortOrder
}

export abstract class Criteria<
  Filters extends Record<string, unknown> = Record<string, unknown>,
  SortField extends string = string,
> {
  protected _filters: Partial<Filters> = {}
  protected _pagination: PaginationParams = { page: 1, limit: 20 }
  protected _sort: SortParams<SortField> | null = null

  withPagination(pagination: PaginationParams): this {
    this._pagination = pagination
    return this
  }

  orderBy(field: SortField, order: SortOrder = 'asc'): this {
    this._sort = { field, order }
    return this
  }

  get filters(): Partial<Filters> {
    return this._filters
  }

  get pagination(): PaginationParams {
    return this._pagination
  }

  get sort(): SortParams<SortField> | null {
    return this._sort
  }

  get offset(): number {
    return (this._pagination.page - 1) * this._pagination.limit
  }
}
