import { useOutboundRecommendations } from '../model/useOutbounds'

// 유통기한이 임박한 Lot을 우선 출고하도록 권고하는 목록이다. 피킹은 서버가 FIFO로 자동 수행한다.
export function OutboundRecommendations() {
  const query = useOutboundRecommendations()
  return <section className="panel inbound-register">
    <div className="panel-heading"><div><p className="eyebrow">EXPIRY FIRST</p><h2>유통기한 임박 재고 우선 출고 권고</h2></div><small>{query.data?.length ?? 0}건</small></div>
    {query.isLoading && <p>불러오는 중입니다...</p>}
    {query.isError && <p className="inbound-error" role="alert">{query.error.message}</p>}
    {query.data?.length === 0 && <p className="inbound-empty">권고 대상 재고가 없습니다.</p>}
    {query.data?.map((item) => <div className="lot-row" key={item.lotId}><strong>{item.productName}</strong><span>Lot {item.lotNumber}</span><span>유통기한 {item.expirationDate}</span><span>가용 {item.availableQuantity} ea</span></div>)}
  </section>
}
