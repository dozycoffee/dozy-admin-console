import { MATERIAL_CODE_MAX_LENGTH, MATERIAL_NAME_MAX_LENGTH, MATERIAL_UNIT_MAX_LENGTH, materialCategories, type RegisterMaterialRequest } from './materialSchemas'

export type MaterialField = 'productCode' | 'productName' | 'category' | 'unit' | 'shelfLifeDays'
export type MaterialInput = Record<MaterialField, string>
export type MaterialErrors = Partial<Record<MaterialField, string>>

const NON_NEGATIVE_INTEGER = /^\d+$/

/** 서버는 상품 코드를 앞뒤 공백을 없애고 대문자로 통일해 저장한다. 조회 조건도 같은 모양으로 맞춘다. */
export function normalizeMaterialCode(code: string): string {
  return code.trim().toUpperCase()
}

export function validateMaterial({ productCode, productName, category, unit, shelfLifeDays }: MaterialInput): MaterialErrors {
  const errors: MaterialErrors = {}
  if (productCode.trim() === '') errors.productCode = '원자재 코드를 입력해 주세요.'
  else if (productCode.trim().length > MATERIAL_CODE_MAX_LENGTH) errors.productCode = `원자재 코드는 ${MATERIAL_CODE_MAX_LENGTH}자 이하로 입력해 주세요.`
  if (productName.trim() === '') errors.productName = '이름을 입력해 주세요.'
  else if (productName.trim().length > MATERIAL_NAME_MAX_LENGTH) errors.productName = `이름은 ${MATERIAL_NAME_MAX_LENGTH}자 이하로 입력해 주세요.`
  if (!(materialCategories as readonly string[]).includes(category)) errors.category = '카테고리를 선택해 주세요.'
  if (unit.trim() === '') errors.unit = '단위를 입력해 주세요.'
  else if (unit.trim().length > MATERIAL_UNIT_MAX_LENGTH) errors.unit = `단위는 ${MATERIAL_UNIT_MAX_LENGTH}자 이하로 입력해 주세요.`
  if (shelfLifeDays.trim() !== '' && !NON_NEGATIVE_INTEGER.test(shelfLifeDays.trim())) errors.shelfLifeDays = '유통기한 일수는 0 이상의 정수여야 합니다.'
  return errors
}

/** 검증을 통과한 입력을 요청 본문으로 바꾼다. 유통기한 일수를 비우면 유통기한이 없는 원자재다. */
export function toRegisterRequest({ productCode, productName, category, unit, shelfLifeDays }: MaterialInput): RegisterMaterialRequest {
  return {
    productCode: normalizeMaterialCode(productCode),
    productName: productName.trim(),
    category,
    unit: unit.trim(),
    shelfLifeDays: shelfLifeDays.trim() === '' ? null : Number(shelfLifeDays.trim()),
  }
}
