import { http, HttpResponse, type RequestHandler } from 'msw'
import { productStatuses, type ProductStatus } from '../features/catalog/model/catalogSchemas'
import { filterProducts, mockCategories, mockOptionGroups, mockProductGroups, mockProducts, mockTags } from './catalogMockData'
import { createMockCatalogStore, type MockFailure, type MockResult, type MockValueResult } from './catalogMockStore'

const ADMIN = '*/api/v1/admin'
const MOCK_TOKEN = 'mock-access-token'
const SESSION_KEY = 'mock-catalog-session'

// 새로고침해도 로그인이 이어지도록 세션 표시를 sessionStorage에 둔다(실제 refresh 쿠키를 흉내 낸다).
const hasSession = () => sessionStorage.getItem(SESSION_KEY) === '1'
const store = createMockCatalogStore({ products: mockProducts, categories: mockCategories, tags: mockTags, groups: mockProductGroups, optionGroups: mockOptionGroups })

/** `If-Match: "4"`에서 버전 숫자를 꺼낸다. 헤더가 없거나 형식이 틀리면 null이다. */
function versionOf(request: Request): number | null {
  const match = /^"(\d+)"$/.exec(request.headers.get('If-Match') ?? '')
  return match ? Number(match[1]) : null
}

/** 실패는 Problem Details(`code`, 버전 충돌이면 `currentVersion`)로 응답한다. */
function problem(failure: MockFailure) {
  return HttpResponse.json({ status: failure.status, code: failure.code, ...(failure.currentVersion !== undefined && { currentVersion: failure.currentVersion }) }, { status: failure.status, headers: { 'Content-Type': 'application/problem+json' } })
}

/** 성공은 변경 후 리소스(생성은 201), 실패는 Problem Details(`code`)로 응답한다. */
function respond(result: MockResult | { ok: true; product: null }, status = 200) {
  if (!result.ok) return problem(result)
  if (result.product === null) return new HttpResponse(null, { status: 204 })
  return HttpResponse.json(result.product, { status, headers: { ETag: `"${result.product.version}"` } })
}

/** 분류 쓰기 결과. 삭제(값 없음)는 204다. */
function respondValue<T>(result: MockValueResult<T>, status = 200) {
  if (!result.ok) return problem(result)
  return result.value === null ? new HttpResponse(null, { status: 204 }) : HttpResponse.json(result.value, { status })
}

const nameOf = async (request: Request) => ((await request.json()) as { name: string }).name

const numberParam = (value: string | null) => (value === null || value === '' ? undefined : Number(value))

/**
 * dozy-auth 로그인과 dozy-catalog-api 상품 조회·등록·수정·상태 전환·삭제와 분류(카테고리·태그·상품 그룹) 관리를 MSW로 대신한다(상태는 메모리에만 있고 새로고침하면 초기화된다). `VITE_MOCK_CATALOG=true`일 때만 켜진다.
 * Catalog를 띄우기 어려운 환경에서 MD 화면을 확인하는 용도이며, 어떤 비밀번호로든 MD 직원으로 로그인된다.
 */
export const catalogMockHandlers: RequestHandler[] = [
  http.post('*/realms/internal/login', () => {
    sessionStorage.setItem(SESSION_KEY, '1')
    return HttpResponse.json({ accessToken: MOCK_TOKEN })
  }),
  http.post('*/realms/internal/token/refresh', () => hasSession()
    ? HttpResponse.json({ accessToken: MOCK_TOKEN })
    : HttpResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401 })),
  http.post('*/realms/internal/logout', () => {
    sessionStorage.removeItem(SESSION_KEY)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('*/realms/internal/me', () => HttpResponse.json({ principalType: 'EMPLOYEE', principalId: 'mock-md-1', name: '박MD', email: 'md@dozycoffee.local', roles: ['catalog:admin'] })),

  http.get(`${ADMIN}/products`, ({ request }) => {
    const params = new URL(request.url).searchParams
    const status = params.get('status')
    const filtered = filterProducts(store.products(), store.categories(), {
      keyword: params.get('keyword') ?? undefined,
      status: productStatuses.includes(status as ProductStatus) ? (status as ProductStatus) : undefined,
      categoryId: numberParam(params.get('categoryId')),
      tagId: numberParam(params.get('tagId')),
      groupId: numberParam(params.get('groupId')),
    })
    const size = numberParam(params.get('size')) ?? 20
    const page = numberParam(params.get('page')) ?? 0
    return HttpResponse.json({ content: filtered.slice(page * size, (page + 1) * size), page, size, totalElements: filtered.length, totalPages: Math.ceil(filtered.length / size) })
  }),
  http.get(`${ADMIN}/categories`, () => HttpResponse.json(store.categories())),
  http.post(`${ADMIN}/categories`, async ({ request }) => {
    const body = await request.json() as { name: string; parentId: number | null }
    return respondValue(store.createCategory(body.name, body.parentId ?? null), 201)
  }),
  http.put(`${ADMIN}/categories/:id`, async ({ request, params }) => respondValue(store.renameCategory(Number(params.id), await nameOf(request)))),
  http.put(`${ADMIN}/categories/:id/parent`, async ({ request, params }) => {
    const body = await request.json() as { parentId?: number | null }
    // 실제 API처럼 parentId 필드가 없으면 승격으로 읽지 않고 거부한다.
    if (!('parentId' in body)) return problem({ ok: false, status: 400, code: 'INVALID_REQUEST' })
    return respondValue(store.moveCategory(Number(params.id), body.parentId ?? null))
  }),
  http.delete(`${ADMIN}/categories/:id`, ({ params }) => respondValue(store.deleteCategory(Number(params.id)))),
  http.post(`${ADMIN}/products`, async ({ request }) => respond(store.create(await request.json() as never), 201)),
  http.put(`${ADMIN}/products/:id`, async ({ request, params }) => respond(store.update(Number(params.id), versionOf(request), await request.json() as never))),
  http.post(`${ADMIN}/products/:id/activate`, ({ params }) => respond(store.transition(Number(params.id), 'ACTIVE'))),
  http.post(`${ADMIN}/products/:id/discontinue`, ({ params }) => respond(store.transition(Number(params.id), 'DISCONTINUED'))),
  http.delete(`${ADMIN}/products/:id`, ({ params }) => respond(store.remove(Number(params.id)))),
  http.get(`${ADMIN}/tags`, () => HttpResponse.json(store.tags())),
  http.put(`${ADMIN}/tags/:id`, async ({ request, params }) => respondValue(store.renameTag(Number(params.id), await nameOf(request)))),
  http.delete(`${ADMIN}/tags/:id`, ({ params }) => respondValue(store.deleteTag(Number(params.id)))),
  http.get(`${ADMIN}/product-groups`, () => HttpResponse.json(store.groups())),
  http.post(`${ADMIN}/product-groups`, async ({ request }) => respondValue(store.createGroup(await nameOf(request)), 201)),
  http.put(`${ADMIN}/product-groups/:id`, async ({ request, params }) => respondValue(store.renameGroup(Number(params.id), await nameOf(request)))),
  http.delete(`${ADMIN}/product-groups/:id`, ({ params }) => respondValue(store.deleteGroup(Number(params.id)))),
  http.get(`${ADMIN}/option-groups`, () => HttpResponse.json(mockOptionGroups)),
]
