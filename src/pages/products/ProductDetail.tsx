import { useState, type ReactNode } from 'react'
import { categoryLabel } from '../../features/catalog/model/categoryLabel'
import { toCatalogErrorMessage } from '../../features/catalog/model/catalogErrors'
import type { Category, OptionGroup, Product, ProductGroup, Tag } from '../../features/catalog/model/catalogSchemas'
import { formatPrice } from '../../features/catalog/model/formatPrice'
import { tagNamesOf } from '../../features/catalog/model/productValidation'
import { useActivateProduct, useDeleteProduct, useDiscontinueProduct } from '../../features/catalog/model/useProductMutations'
import { ProductStatusBadge } from '../../features/catalog/ui/ProductStatusBadge'
import { Modal } from '../../shared/ui/Modal'
import { Tooltip } from '../../shared/ui/Tooltip'
import { useToast } from '../../shared/ui/toastContext'
import { ProductForm } from './ProductForm'
import { ProductOptionGroups } from './ProductOptionGroups'
import { NO_WRITE_REASON } from './productShared'

export type PendingConfirm = { title: string; description: string; confirmLabel: string; run: () => void }

type Props = {
  product: Product
  categories: readonly Category[]
  /** 태그를 아직 못 받았으면 undefined. 수정 폼에 태그 이름을 채우려면 필요하다. */
  tags: readonly Tag[] | undefined
  groups: readonly ProductGroup[]
  optionGroups: readonly OptionGroup[]
  writable: boolean
  confirm: (pending: PendingConfirm) => void
  /** 상품을 삭제했을 때 부른다. 선택을 풀고 목록으로 돌아가는 일은 화면이 한다. */
  onDeleted: () => void
}

/** 이름을 못 찾으면(분류가 아직 로딩 중이거나 삭제된 경우) id로 보여준다. */
const nameOf = (items: ReadonlyArray<{ id: number; name: string }>, id: number) => items.find((item) => item.id === id)?.name ?? `#${id}`

/**
 * 상품 상세와 상태별 작업. 상태 전환·삭제 규칙을 화면에서 미리 반영해 불가능한 작업은 비활성화하고 사유를 툴팁으로 알린다.
 * 서버가 최종 판단하므로 `INVALID_PRODUCT_STATUS_TRANSITION` 등은 오류 문구로도 안내한다.
 */
export function ProductDetail({ product, categories, tags, groups, optionGroups, writable, confirm, onDeleted }: Props) {
  const { notify } = useToast()
  const activate = useActivateProduct()
  const discontinue = useDiscontinueProduct()
  const remove = useDeleteProduct()
  const [editOpen, setEditOpen] = useState(false)
  const mutations = [activate, discontinue, remove]
  const busy = mutations.some((mutation) => mutation.isPending)
  const actionError = mutations.find((mutation) => mutation.isError)?.error
  const scope = product.storeScope
  const tagNames = tags ? tagNamesOf(product.tagIds, tags) : null

  // 이전 작업의 에러가 남지 않도록 새 작업을 시작할 때 모든 mutation 상태를 지운다.
  function start(run: () => void) {
    mutations.forEach((mutation) => mutation.reset())
    run()
  }

  // 불가한 이유(없으면 null). 사유가 있는 버튼은 비활성화하고 툴팁으로 이유를 알려 준다.
  const editReason = !writable ? NO_WRITE_REASON
    : tagNames === null ? '태그 정보를 불러오는 중입니다.'
      : tagNames.unresolved > 0 ? '태그 정보를 확인할 수 없어 수정할 수 없습니다. 화면을 새로고침해 주세요.' : null
  const activateReason = !writable ? NO_WRITE_REASON : product.status === 'ACTIVE' ? '이미 판매중인 상품입니다.' : null
  const discontinueReason = !writable ? NO_WRITE_REASON
    : product.status === 'DRAFT' ? '판매 대기 상품은 단종할 수 없습니다. 필요하면 삭제하세요.'
      : product.status === 'DISCONTINUED' ? '이미 단종된 상품입니다.' : null
  const deleteReason = !writable ? NO_WRITE_REASON : product.status !== 'DRAFT' ? '판매 대기 상태의 상품만 삭제할 수 있습니다.' : null
  const gate = (reason: string | null, button: ReactNode) => <Tooltip content={reason}>{button}</Tooltip>
  const can = (reason: string | null) => !busy && reason === null

  return <section className="panel inbound-detail-panel">
    <div className="panel-heading inbound-detail-heading">
      <div><p className="eyebrow">PRODUCT</p><div className="detail-title"><h2>{product.name}</h2><ProductStatusBadge status={product.status} /></div></div>
      <div className="detail-actions">
        {gate(editReason, <button type="button" className="inbound-action-button compact employee-secondary" disabled={!can(editReason)} onClick={() => start(() => setEditOpen(true))}>정보 수정</button>)}
        {gate(activateReason, <button type="button" className="inbound-action-button compact" disabled={!can(activateReason)} onClick={() => confirm({
          title: product.status === 'DISCONTINUED' ? '단종된 상품을 다시 판매할까요?' : '상품을 활성화할까요?',
          description: product.status === 'DISCONTINUED' ? '각 매장은 단종 전의 진열·노출 설정을 그대로 이어서 사용합니다.' : '활성화하면 판매 범위에 해당하는 매장에서 판매할 수 있습니다.',
          confirmLabel: '활성화',
          run: () => start(() => activate.mutate(product.id, { onSuccess: () => notify('상품을 활성화했습니다.') })),
        })}>활성화</button>)}
        {gate(discontinueReason, <button type="button" className="inbound-action-button compact employee-danger" disabled={!can(discontinueReason)} onClick={() => confirm({
          title: '상품을 단종할까요?',
          description: '매장의 판매 목록에서 이 상품이 제외됩니다. 단종 후에도 정보 수정과 다시 활성화는 할 수 있습니다.',
          confirmLabel: '단종',
          run: () => start(() => discontinue.mutate(product.id, { onSuccess: () => notify('상품을 단종했습니다.') })),
        })}>단종</button>)}
        {gate(deleteReason, <button type="button" className="inbound-action-button compact employee-danger" disabled={!can(deleteReason)} onClick={() => confirm({
          title: '상품을 삭제할까요?',
          description: '옵션 그룹 연결과 매장 설정이 함께 삭제되며 되돌릴 수 없습니다. SKU도 다시 쓰이지 않습니다.',
          confirmLabel: '삭제',
          run: () => start(() => remove.mutate(product.id, { onSuccess: () => { notify('상품을 삭제했습니다.'); onDeleted() } })),
        })}>삭제</button>)}
      </div>
    </div>
    <div className="employee-detail-body">
      {actionError && <p className="inbound-error" role="alert">{toCatalogErrorMessage(actionError)}</p>}
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
        <div><dt>태그</dt><dd>{product.tagIds.length === 0 ? '-' : <ul className="employee-roles">{product.tagIds.map((id) => <li key={id}>{nameOf(tags ?? [], id)}</li>)}</ul>}</dd></div>
        <div><dt>상품 그룹</dt><dd>{product.groupIds.length === 0 ? '-' : <ul className="employee-roles">{product.groupIds.map((id) => <li key={id}>{nameOf(groups, id)}</li>)}</ul>}</dd></div>
      </dl>
      <h3 className="employee-section-title">판매 범위</h3>
      <p className="product-scope">
        {scope.kind === 'ALL' && '모든 매장에서 판매합니다.'}
        {scope.kind === 'LIMITED' && (scope.targetStoreIds.length === 0 ? '어떤 매장에도 노출되지 않습니다.' : `지정한 ${scope.targetStoreIds.length}개 매장에서만 판매합니다. (매장 id: ${scope.targetStoreIds.join(', ')})`)}
      </p>
      <ProductOptionGroups product={product} optionGroups={optionGroups} writable={writable} confirm={confirm} />
      <p className="product-version">버전 {product.version}</p>
    </div>

    <Modal open={editOpen} title={`상품 수정 · ${product.name}`} onClose={() => setEditOpen(false)}>
      <ProductForm
        product={product}
        initialTagNames={tagNames?.names}
        categories={categories}
        tags={tags ?? []}
        groups={groups}
        optionGroups={optionGroups}
        onDone={() => { setEditOpen(false); notify('상품 정보를 저장했습니다.') }}
        onCancel={() => setEditOpen(false)}
        onConflict={() => { setEditOpen(false); notify('다른 사용자가 먼저 수정했습니다. 최신 내용을 불러왔으니 확인한 뒤 다시 수정해 주세요.', 'error') }}
      />
    </Modal>
  </section>
}
