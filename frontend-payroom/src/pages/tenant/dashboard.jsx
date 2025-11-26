import { useCurrentUser } from '../../store/auth.store'
import Button from '../../components/ui/Button'
import { Link } from 'react-router-dom'

function TenantDashboard() {
  const { data: user } = useCurrentUser()

  return (
    <div className="space-y-8">
        <h1>DASHBOARD {user?.name}</h1>
    </div>
  )
}

export default TenantDashboard