/** 원 단위 정수 금액을 "4,500원"으로 보여준다. */
export const formatPrice = (price: number) => `${price.toLocaleString('ko-KR')}원`
