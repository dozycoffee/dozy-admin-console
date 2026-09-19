import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { productListSchema } from './productSchemas'

export function useActiveProducts() {
  return useQuery({
    queryKey: ['product', 'list', { status: 'ACTIVE' }],
    queryFn: async () => {
      const { data } = await httpClient.get('/api/products', { params: { status: 'ACTIVE' } })
      return productListSchema.parse(data)
    },
  })
}
