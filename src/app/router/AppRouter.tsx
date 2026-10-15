import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '../../features/auth/ui/RequireAuth'
import { RequirePermission } from '../../features/auth/ui/RequirePermission'
import { RequireActorMode } from '../../features/auth/ui/RequireActorMode'
import { permissions } from '../../features/auth/model/permissions'
import { AppLayout } from '../../shared/ui/AppLayout'
import { InventoryPage } from '../../pages/inventory/InventoryPage'
import { AccessDeniedPage } from '../../pages/access-denied/AccessDeniedPage'
import { LoginPage } from '../../pages/login/LoginPage'
import { InvitationPage } from '../../pages/invitation/InvitationPage'
import { ForgotPasswordPage } from '../../pages/password-forgot/ForgotPasswordPage'
import { ResetPasswordPage } from '../../pages/password-reset/ResetPasswordPage'
import { MaterialsPage } from '../../pages/materials/MaterialsPage'
import { OutboxEventsPage } from '../../pages/outbox/OutboxEventsPage'
import { ReconciliationsPage } from '../../pages/reconciliations/ReconciliationsPage'
import { StockPage } from '../../pages/stock/StockPage'
import { WarehouseMapPage } from '../../pages/warehouse-map/WarehouseMapPage'
import { ModeHomePage } from '../../pages/mode-home/ModeHomePage'
import { actorModeIds } from '../../features/auth/model/actorModes'
import { InboundManagementPage } from '../../pages/inbounds/InboundManagementPage'
import { InboundHistoryPage } from '../../pages/inbounds/InboundHistoryPage'
import { OutboundManagementPage } from '../../pages/outbounds/OutboundManagementPage'
import { OutboundHistoryPage } from '../../pages/outbounds/OutboundHistoryPage'
import { DisposalManagementPage } from '../../pages/disposals/DisposalManagementPage'
import { DisposalHistoryPage } from '../../pages/disposals/DisposalHistoryPage'
import { EmployeesPage } from '../../pages/employees/EmployeesPage'
import { RolesPage } from '../../pages/roles/RolesPage'
import { AccountPage } from '../../pages/account/AccountPage'
import { AuditLogsPage } from '../../pages/audit-logs/AuditLogsPage'
import { SystemClientsPage } from '../../pages/system-clients/SystemClientsPage'
import { OwnerTransferPage } from '../../pages/owner/OwnerTransferPage'
import { AcceptOwnerTransferPage } from '../../pages/owner-transfer/AcceptOwnerTransferPage'
import { ReturnManagementPage } from '../../pages/returns/ReturnManagementPage'
import { ReturnHistoryPage } from '../../pages/returns/ReturnHistoryPage'
import { ProductsPage } from '../../pages/products/ProductsPage'
import { TaxonomyPage } from '../../pages/taxonomy/TaxonomyPage'
import { OptionGroupsPage } from '../../pages/option-groups/OptionGroupsPage'

const inventoryModes = [actorModeIds.warehouseManager] as const
const inventoryManagementModes = [actorModeIds.inventoryManager] as const
const warehouseOperationsModes = [actorModeIds.warehouseManager] as const
const accountAdministrationModes = [actorModeIds.accountAdministrator] as const
const merchandisingModes = [actorModeIds.merchandiser] as const

export function AppRouter() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      {/* 메일 링크가 여는 화면이라 로그인 없이 접근한다 */}
      <Route path="invitation" element={<InvitationPage />} />
      <Route path="password/forgot" element={<ForgotPasswordPage />} />
      <Route path="password/reset" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}>
        {/* 양도 수락은 대상 직원이 본인으로 로그인해야 하지만 아직 role·업무 모드가 없을 수 있어 콘솔 셸 밖에 둔다 */}
        <Route path="owner-transfer" element={<AcceptOwnerTransferPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<RequirePermission permission={permissions.dashboardRead}><ModeHomePage /></RequirePermission>} />
          <Route path="inventory" element={<RequireActorMode allowedModes={inventoryModes}><RequirePermission permission={permissions.inventoryRead}><InventoryPage /></RequirePermission></RequireActorMode>} />
          <Route path="materials" element={<RequireActorMode allowedModes={inventoryManagementModes}><RequirePermission permission={permissions.inventoryRead}><MaterialsPage /></RequirePermission></RequireActorMode>} />
          <Route path="reconciliations" element={<RequireActorMode allowedModes={inventoryManagementModes}><RequirePermission permission={permissions.inventoryRead}><ReconciliationsPage /></RequirePermission></RequireActorMode>} />
          <Route path="outbox-events" element={<RequireActorMode allowedModes={inventoryManagementModes}><RequirePermission permission={permissions.inventoryRead}><OutboxEventsPage /></RequirePermission></RequireActorMode>} />
          <Route path="stock" element={<RequireActorMode allowedModes={inventoryManagementModes}><RequirePermission permission={permissions.inventoryRead}><StockPage /></RequirePermission></RequireActorMode>} />
          <Route path="warehouse-map" element={<RequireActorMode allowedModes={inventoryModes}><RequirePermission permission={permissions.inventoryRead}><WarehouseMapPage /></RequirePermission></RequireActorMode>} />
          <Route path="inbounds" element={<RequireActorMode allowedModes={warehouseOperationsModes}><RequirePermission permission={permissions.inboundRead}><InboundManagementPage /></RequirePermission></RequireActorMode>} />
          <Route path="inbounds/history" element={<RequireActorMode allowedModes={warehouseOperationsModes}><RequirePermission permission={permissions.inboundRead}><InboundHistoryPage /></RequirePermission></RequireActorMode>} />
          <Route path="outbounds" element={<RequireActorMode allowedModes={warehouseOperationsModes}><RequirePermission permission={permissions.outboundRead}><OutboundManagementPage /></RequirePermission></RequireActorMode>} />
          <Route path="outbounds/history" element={<RequireActorMode allowedModes={warehouseOperationsModes}><RequirePermission permission={permissions.outboundRead}><OutboundHistoryPage /></RequirePermission></RequireActorMode>} />
          <Route path="disposals" element={<RequireActorMode allowedModes={warehouseOperationsModes}><RequirePermission permission={permissions.disposalRead}><DisposalManagementPage /></RequirePermission></RequireActorMode>} />
          <Route path="disposals/history" element={<RequireActorMode allowedModes={warehouseOperationsModes}><RequirePermission permission={permissions.disposalRead}><DisposalHistoryPage /></RequirePermission></RequireActorMode>} />
          <Route path="returns" element={<RequireActorMode allowedModes={warehouseOperationsModes}><RequirePermission permission={permissions.returnRead}><ReturnManagementPage /></RequirePermission></RequireActorMode>} />
          <Route path="returns/history" element={<RequireActorMode allowedModes={warehouseOperationsModes}><RequirePermission permission={permissions.returnRead}><ReturnHistoryPage /></RequirePermission></RequireActorMode>} />
          <Route path="products" element={<RequireActorMode allowedModes={merchandisingModes}><RequirePermission permission={permissions.catalogRead}><ProductsPage /></RequirePermission></RequireActorMode>} />
          <Route path="taxonomy" element={<RequireActorMode allowedModes={merchandisingModes}><RequirePermission permission={permissions.catalogRead}><TaxonomyPage /></RequirePermission></RequireActorMode>} />
          <Route path="option-groups" element={<RequireActorMode allowedModes={merchandisingModes}><RequirePermission permission={permissions.catalogRead}><OptionGroupsPage /></RequirePermission></RequireActorMode>} />
          <Route path="employees" element={<RequireActorMode allowedModes={accountAdministrationModes}><RequirePermission permission={permissions.accountRead}><EmployeesPage /></RequirePermission></RequireActorMode>} />
          <Route path="roles" element={<RequireActorMode allowedModes={accountAdministrationModes}><RequirePermission permission={permissions.accountRead}><RolesPage /></RequirePermission></RequireActorMode>} />
          <Route path="system-clients" element={<RequireActorMode allowedModes={accountAdministrationModes}><RequirePermission permission={permissions.accountRead}><SystemClientsPage /></RequirePermission></RequireActorMode>} />
          <Route path="owner" element={<RequireActorMode allowedModes={accountAdministrationModes}><RequirePermission permission={permissions.accountManage}><OwnerTransferPage /></RequirePermission></RequireActorMode>} />
          <Route path="audit-logs" element={<RequireActorMode allowedModes={accountAdministrationModes}><RequirePermission permission={permissions.accountManage}><AuditLogsPage /></RequirePermission></RequireActorMode>} />
          {/* 로그인한 모든 사용자의 본인 계정 화면이라 모드·권한 제한이 없다 */}
          <Route path="account" element={<AccountPage />} />
          <Route path="access-denied" element={<AccessDeniedPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
