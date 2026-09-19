import { setupWorker } from 'msw/browser'
import { authHandlers } from './handlers'

export const worker = setupWorker(...authHandlers)
