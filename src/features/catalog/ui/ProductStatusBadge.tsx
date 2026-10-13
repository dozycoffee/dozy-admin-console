import { productStatusLabels, type ProductStatus } from '../model/catalogSchemas'

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <span className={`inbound-status product-status product-status-${status.toLowerCase()}`}>{productStatusLabels[status]}</span>
}
