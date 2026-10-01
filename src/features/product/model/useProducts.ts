import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { productListSchema } from './productSchemas'

export function useProducts() {
  return useQuery({
    queryKey: ['products', 'list'],
    queryFn: async () => productListSchema.parse((await httpClient.get('/api/products')).data),
  })
}
