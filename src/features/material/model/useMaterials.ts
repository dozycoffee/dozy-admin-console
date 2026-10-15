import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inventoryHttpClient } from '../../../shared/api/httpClient'
import { materialPageSchema, materialSchema, type Material, type MaterialParams, type RegisterMaterialRequest } from './materialSchemas'

/** 비어 있는 조건은 쿼리에서 뺀다. */
export function toMaterialQueryParams({ keyword, category, status, page, size }: MaterialParams) {
  return {
    ...(keyword && { keyword }),
    ...(category && { category }),
    ...(status && { status }),
    page,
    size,
  }
}

/** 원자재 목록(원자재 화면). 정렬은 서버가 정한다. */
export function useMaterials(params: MaterialParams) {
  return useQuery({
    queryKey: ['materials', 'list', params],
    queryFn: async () => materialPageSchema.parse((await inventoryHttpClient.get('/api/v1/products', { params: toMaterialQueryParams(params) })).data),
    placeholderData: (previous) => previous,
  })
}

const SEARCH_PAGE_SIZE = 20

/**
 * 원자재를 이름·코드의 일부로 찾는다(상품 선택용). 서버가 거르고 처음 20건만 읽으며, 더 있으면 응답의 `totalElements`로 알 수 있다.
 * 비워 두면 처음 20건을 보여준다. 입력이 멈춘 뒤의 값을 넘겨 입력할 때마다 요청하지 않게 한다.
 */
export function useMaterialSearch(keyword: string) {
  const trimmed = keyword.trim()
  return useQuery({
    queryKey: ['materials', 'search', trimmed],
    staleTime: 30_000,
    queryFn: async () => materialPageSchema.parse((await inventoryHttpClient.get('/api/v1/products', { params: toMaterialQueryParams({ keyword: trimmed, page: 0, size: SEARCH_PAGE_SIZE }) })).data),
    placeholderData: (previous) => previous,
  })
}

const MATERIAL_PAGE_SIZE = 100
/** 원자재 마스터가 이 수를 넘으면 이름을 못 찾는 원자재는 id로 보여준다. */
const MATERIAL_MAX_PAGES = 5

/** 재고 응답에는 상품 이름이 없어 원자재 마스터로 채운다. 마스터는 크지 않아 처음 몇 페이지를 모두 읽는다. */
export function useAllMaterials() {
  return useQuery({
    queryKey: ['materials', 'all'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Material[]> => {
      const materials: Material[] = []
      for (let page = 0; page < MATERIAL_MAX_PAGES; page += 1) {
        const data = materialPageSchema.parse((await inventoryHttpClient.get('/api/v1/products', { params: { page, size: MATERIAL_PAGE_SIZE } })).data)
        materials.push(...data.items)
        if (materials.length >= data.totalElements || data.items.length === 0) break
      }
      return materials
    },
  })
}

function useMaterialMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Material>) {
  const queryClient = useQueryClient()
  // 목록과 재고 현황이 쓰는 전체 목록이 모두 ['materials'] 아래에 있다.
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }) })
}

/** 같은 코드가 이미 있으면 409 `INV_DUPLICATE_PRODUCT_CODE`다. */
export function useRegisterMaterial() {
  return useMaterialMutation(async (body: RegisterMaterialRequest) => materialSchema.parse((await inventoryHttpClient.post('/api/v1/products', body)).data))
}

/** 이미 같은 상태이면 서버가 변경 없이 현재 원자재를 돌려준다. */
export function useChangeMaterialStatus() {
  return useMaterialMutation(async ({ productId, productStatus }: { productId: number; productStatus: string }) =>
    materialSchema.parse((await inventoryHttpClient.patch(`/api/v1/products/${productId}/status`, { productStatus })).data))
}
