import { employeeStatusLabels, type EmployeeStatus } from '../model/employeeSchemas'

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return <span className={`inbound-status employee-status employee-status-${status.toLowerCase()}`}>{employeeStatusLabels[status]}</span>
}
