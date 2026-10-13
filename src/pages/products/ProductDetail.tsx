import { formatPrice } from '../../features/catalog/model/formatPrice'
import { categoryLabel } from '../../features/catalog/model/categoryLabel'
import type { Category, OptionGroup, Product, ProductGroup, Tag } from '../../features/catalog/model/catalogSchemas'
import { ProductStatusBadge } from '../../features/catalog/ui/ProductStatusBadge'

type Props = {
  product: Product
  categories: readonly Category[]
  tags: readonly Tag[]
  groups: readonly ProductGroup[]
  optionGroups: readonly OptionGroup[]
}

/** 이름을 못 찾으면(분류가 아직 로딩 중이거나 삭제된 경우) id로 보여준다. */
const nameOf = (items: ReadonlyArray<{ id: number; name: string }>, id: number) => items.find((item) => item.id === id)?.name ?? `#${id}`

/** 상품을 읽기 전용으로 보여준다. 카테고리·태그·그룹·옵션 그룹은 id로 오므로 분류 API 응답으로 이름을 붙인다. */
export function ProductDetail({ product, categories, tags, groups, optionGroups }: Props) {
  const scope = product.storeScope
  return <section className="panel inbound-detail-panel">
    <div className="panel-heading inbound-detail-heading">
      <div><p className="eyebrow">PRODUCT</p><h2>{product.name}</h2></div>
      <ProductStatusBadge status={product.status} />
    </div>
    <div className="employee-detail-body">
      <h3 className="employee-section-title">기본 정보</h3>
      <dl className="employee-fields">
        <div><dt>SKU</dt><dd>{product.sku ?? '-'}</dd></div>
        <div><dt>기준가</dt><dd>{formatPrice(product.basePrice)}</dd></div>
        <div><dt>카테고리</dt><dd>{categoryLabel(categories, product.categoryId) ?? `#${product.categoryId}`}</dd></div>
        <div><dt>재고 관리</dt><dd>{product.tracksInventory ? '재고형' : '비재고형'}</dd></div>
        <div><dt>설명</dt><dd>{product.description || '-'}</dd></div>
        <div><dt>이미지</dt><dd>{product.imageUrl ? <a href={product.imageUrl} target="_blank" rel="noreferrer">이미지 열기</a> : '-'}</dd></div>
      </dl>
      <h3 className="employee-section-title">분류</h3>
      <dl className="employee-fields">
        <div><dt>태그</dt><dd>{product.tagIds.length === 0 ? '-' : <ul className="employee-roles">{product.tagIds.map((id) => <li key={id}>{nameOf(tags, id)}</li>)}</ul>}</dd></div>
        <div><dt>상품 그룹</dt><dd>{product.groupIds.length === 0 ? '-' : <ul className="employee-roles">{product.groupIds.map((id) => <li key={id}>{nameOf(groups, id)}</li>)}</ul>}</dd></div>
      </dl>
      <h3 className="employee-section-title">판매 범위</h3>
      <p className="product-scope">
        {scope.kind === 'ALL' && '모든 매장에서 판매합니다.'}
        {scope.kind === 'LIMITED' && (scope.targetStoreIds.length === 0 ? '어떤 매장에도 노출되지 않습니다.' : `지정한 ${scope.targetStoreIds.length}개 매장에서만 판매합니다. (매장 id: ${scope.targetStoreIds.join(', ')})`)}
      </p>
      <h3 className="employee-section-title">옵션 그룹</h3>
      {product.optionGroups.length === 0
        ? <p className="employee-no-roles">연결된 옵션 그룹이 없습니다.</p>
        : <ol className="product-option-groups">
          {product.optionGroups.map((link) => <li key={link.optionGroupId}>
            <strong>{nameOf(optionGroups, link.optionGroupId)}</strong>
            {link.overrides.length > 0 && <small>예외 {link.overrides.length}건: {link.overrides.map((override) => `${override.optionKey} ${override.type === 'EXCLUDE' ? '제외' : formatPrice(override.price ?? 0)}`).join(', ')}</small>}
          </li>)}
        </ol>}
      <p className="product-version">버전 {product.version}</p>
    </div>
  </section>
}
