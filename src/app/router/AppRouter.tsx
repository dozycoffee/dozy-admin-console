import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '../../features/auth/ui/RequireAuth'
import { RequirePermission } from '../../features/auth/ui/RequirePermission'
import { RequireActorMode } from '../../features/auth/ui/RequireActorMode'
import { permissions } from '../../features/auth/model/permissions'
import { AppLayout } from '../../shared/ui/AppLayout'
import { InventoryPage } from '../../pages/inventory/InventoryPage'
import { AccessDeniedPage } from '../../pages/access-denied/AccessDeniedPage'
import { LoginPage } from '../../pages/login/LoginPage'
import { WarehouseMapPage } from '../../pages/warehouse-map/WarehouseMapPage'
import { ModeSelectionPage } from '../../pages/mode-selection/ModeSelectionPage'
import { ModeHomePage } from '../../pages/mode-home/ModeHomePage'
import { actorModeIds } from '../../features/auth/model/actorModes'

const inventoryModes = [actorModeIds.warehouseManager, actorModeIds.headquartersInventoryManager] as const

export function AppRouter() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="select-mode" element={<ModeSelectionPage />} />
        <Route element={<RequireActorMode />}>
          <Route element={<AppLayout />}>
            <Route index element={<RequirePermission permission={permissions.dashboardRead}><ModeHomePage /></RequirePermission>} />
            <Route path="inventory" element={<RequireActorMode allowedModes={inventoryModes}><RequirePermission permission={permissions.inventoryRead}><InventoryPage /></RequirePermission></RequireActorMode>} />
            <Route path="warehouse-map" element={<RequireActorMode allowedModes={inventoryModes}><RequirePermission permission={permissions.inventoryRead}><WarehouseMapPage /></RequirePermission></RequireActorMode>} />
            <Route path="access-denied" element={<AccessDeniedPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
