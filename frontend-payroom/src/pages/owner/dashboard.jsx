import { useCurrentUser } from '../../store/auth.store'

function OwnerDashboard() {
  const { data: user } = useCurrentUser()

  return (
    <div className="space-y-6">
        <h1>DASHBOARD {user?.name}</h1>
    </div>
  )
}

export default OwnerDashboard