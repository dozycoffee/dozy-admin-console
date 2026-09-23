import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '../../features/auth/ui/RequireAuth'
import { RequirePermission } from '../../features/auth/ui/RequirePermission'
import { permissions } from '../../features/auth/model/permissions'
import { AppLayout } from '../../shared/ui/AppLayout'
import { DashboardPage } from '../../pages/dashboard/DashboardPage'
import { InventoryPage } from '../../pages/inventory/InventoryPage'
import { AccessDeniedPage } from '../../pages/access-denied/AccessDeniedPage'
import { LoginPage } from '../../pages/login/LoginPage'
import { WarehouseMapPage } from '../../pages/warehouse-map/WarehouseMapPage'
import { InventoryCapacityPage } from '../../pages/inventory-capacity/InventoryCapacityPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<RequirePermission permission={permissions.dashboardRead}><DashboardPage /></RequirePermission>} />
          <Route path="inventory" element={<RequirePermission permission={permissions.inventoryRead}><InventoryPage /></RequirePermission>} />
          <Route path="warehouse-map" element={<RequirePermission permission={permissions.inventoryRead}><WarehouseMapPage /></RequirePermission>} />
          <Route path="inventory/capacity" element={<RequirePermission permission={permissions.inventoryRead}><InventoryCapacityPage /></RequirePermission>} />
          <Route path="access-denied" element={<AccessDeniedPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
