import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { InboundItemView } from '../model/useInbounds'
import { InboundReceiptsForm } from './InboundReceiptsForm'

const item = (patch: Partial<InboundItemView> = {}): InboundItemView => ({
  inboundItemId: 7, inboundId: 1, productId: 2, zoneId: 1, expectedQuantity: 50, expectedLotNumber: null, expectedExpirationDate: null, actualQuantity: null,
  inspectionStatus: 'PENDING', quantityDiscrepancy: null, receipts: [], productName: '에티오피아', productCode: 'BEAN-1', zoneCode: 'A', shelfLifeDays: 180, ...patch,
})

function setup(patch: Partial<InboundItemView> = {}, props: { writable?: boolean; pending?: boolean } = {}) {
  const onSubmit = vi.fn()
  render(<InboundReceiptsForm item={item(patch)} writable={props.writable ?? true} pending={props.pending ?? false} onSubmit={onSubmit} />)
  return onSubmit
}

describe('InboundReceiptsForm', () => {
  it('예정 수량과 예정 Lot·유통기한을 수령 라인 초기값으로 채운다', () => {
    setup({ expectedLotNumber: 'LOT-9', expectedExpirationDate: '2027-03-01' })

    expect(screen.getByLabelText('수량')).toHaveValue(50)
    expect(screen.getByLabelText('Lot 번호')).toHaveValue('LOT-9')
    expect(screen.getByLabelText('유통기한')).toHaveValue('2027-03-01')
    expect(screen.getByText('수령 50 / 예정 50 ea')).toBeInTheDocument()
    expect(screen.getByText(/유통기한 180일 상품/)).toBeInTheDocument()
  })

  it('Lot 번호와 유통기한이 비어 있으면 저장할 수 없고 이유를 보여준다', () => {
    setup()

    expect(screen.getByRole('button', { name: '검수 저장' })).toBeDisabled()
    expect(screen.getByText('Lot 번호를 입력하세요.')).toBeInTheDocument()
    expect(screen.getByText('이 상품은 유통기한이 필수입니다.')).toBeInTheDocument()
  })

  it('수령 라인을 채우면 검수 요청 본문을 만들어 저장한다', async () => {
    const onSubmit = setup()

    await userEvent.type(screen.getByLabelText('Lot 번호'), 'LOT-1')
    await userEvent.type(screen.getByLabelText('유통기한'), '2099-01-01')
    await userEvent.clear(screen.getByLabelText('수량'))
    await userEvent.type(screen.getByLabelText('수량'), '48')
    await userEvent.click(screen.getByRole('button', { name: '검수 저장' }))

    expect(onSubmit).toHaveBeenCalledWith({ receipts: [{ lotNumber: 'LOT-1', quantity: 48, inspectionResult: 'NORMAL', expirationDate: '2099-01-01' }] })
    expect(screen.getByText('수령 48 / 예정 50 ea · 부족 2 ea')).toBeInTheDocument()
  })

  it('수량 합이 예정 수량을 넘으면 저장할 수 없다', async () => {
    setup({ shelfLifeDays: null })

    await userEvent.type(screen.getByLabelText('Lot 번호'), 'LOT-1')
    await userEvent.clear(screen.getByLabelText('수량'))
    await userEvent.type(screen.getByLabelText('수량'), '51')

    expect(screen.getByText('수령 수량의 합(51)이 예정 수량(50)을 넘을 수 없습니다.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '검수 저장' })).toBeDisabled()
  })

  it('불량 판정은 사유를 골라야 저장할 수 있다', async () => {
    const onSubmit = setup({ shelfLifeDays: null })
    await userEvent.type(screen.getByLabelText('Lot 번호'), 'LOT-1')
    expect(screen.getByLabelText('불량 사유')).toBeDisabled()

    await userEvent.selectOptions(screen.getByLabelText('판정'), 'DEFECTIVE')
    expect(screen.getByLabelText('불량 사유')).toBeEnabled()
    expect(screen.getByText('불량 사유를 선택하세요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '검수 저장' })).toBeDisabled()

    await userEvent.selectOptions(screen.getByLabelText('불량 사유'), 'DAMAGED')
    await userEvent.click(screen.getByRole('button', { name: '검수 저장' }))
    expect(onSubmit).toHaveBeenCalledWith({ receipts: [{ lotNumber: 'LOT-1', quantity: 50, inspectionResult: 'DEFECTIVE', defectReason: 'DAMAGED' }] })
  })

  it('판정을 정상으로 되돌리면 불량 사유가 지워진다', async () => {
    setup({ shelfLifeDays: null })
    await userEvent.selectOptions(screen.getByLabelText('판정'), 'DEFECTIVE')
    await userEvent.selectOptions(screen.getByLabelText('불량 사유'), 'QUALITY')

    await userEvent.selectOptions(screen.getByLabelText('판정'), 'NORMAL')

    expect(screen.getByLabelText('불량 사유')).toHaveValue('')
  })

  it('수령 라인을 추가하고 삭제할 수 있고 모두 지우면 미도착으로 저장한다', async () => {
    const onSubmit = setup()
    expect(screen.getByRole('button', { name: '미도착으로 저장' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: '수령 라인 추가' }))
    expect(screen.getAllByLabelText('Lot 번호')).toHaveLength(2)
    await userEvent.click(screen.getAllByRole('button', { name: '삭제' })[1])
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(screen.queryByLabelText('Lot 번호')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '검수 저장' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: '미도착으로 저장' }))
    expect(onSubmit).toHaveBeenCalledWith({ receipts: [] })
  })

  it('상품 정보를 모르면 유통기한 규칙은 서버 판정에 맡긴다', async () => {
    const onSubmit = setup({ shelfLifeDays: undefined })

    await userEvent.type(screen.getByLabelText('Lot 번호'), 'LOT-1')
    await userEvent.click(screen.getByRole('button', { name: '검수 저장' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('쓰기 권한이 없거나 저장 중이면 입력과 버튼이 막힌다', () => {
    setup({}, { writable: false })
    expect(screen.getByLabelText('Lot 번호')).toBeDisabled()
    expect(screen.getByRole('button', { name: '수령 라인 추가' })).toBeDisabled()
  })
})
