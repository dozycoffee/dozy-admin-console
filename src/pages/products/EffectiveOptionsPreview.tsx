import { toCatalogErrorMessage } from '../../features/catalog/model/catalogErrors'
import { selectionTypeLabels } from '../../features/catalog/model/catalogSchemas'
import { formatPrice } from '../../features/catalog/model/formatPrice'
import { useEffectiveOptions } from '../../features/catalog/model/useCatalog'

/**
 * 이 상품에서 실제로 보이는 옵션 구성과 표시용 시작가. 제외·가격 예외를 반영한 계산은 서버가 하며 콘솔은 그 결과를 그대로 보여준다.
 * (조합 금액 계산과 선택 검증은 주문·POS의 책임이다.)
 */
export function EffectiveOptionsPreview({ productId }: { productId: number }) {
  const query = useEffectiveOptions(productId)
  if (query.isLoading) return <p>미리보기를 불러오는 중입니다...</p>
  if (query.isError) return <p className="inbound-error" role="alert">{toCatalogErrorMessage(query.error)}</p>
  if (!query.data) return null
  const { basePrice, displayStartingPrice, groups } = query.data
  return <div className="effective-options">
    <p className="effective-starting-price">표시용 시작가 <strong>{formatPrice(displayStartingPrice)}</strong> <small>기준가 {formatPrice(basePrice)} + 필수 그룹마다 유효 옵션 중 최저가</small></p>
    {groups.length === 0 && <p className="employee-no-roles">연결된 옵션 그룹이 없어 기준가가 시작가입니다.</p>}
    <ul className="effective-groups">
      {groups.map((group) => <li key={group.optionGroupId}>
        <strong>{group.name}</strong>
        <small>{selectionTypeLabels[group.selectionType]} · {group.required ? '필수' : '선택'}{group.autoSelectedOptionKey && ' · 자동 선택'}</small>
        <ul>
          {group.options.map((option) => <li key={option.optionKey}>
            {option.name} <span>{formatPrice(option.price)}</span>
            {option.priceOverridden && <em>이 상품 가격</em>}
            {group.autoSelectedOptionKey === option.optionKey && <em>자동 선택</em>}
          </li>)}
        </ul>
      </li>)}
    </ul>
  </div>
}
