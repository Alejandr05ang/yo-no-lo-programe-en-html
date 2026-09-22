import { Outlet } from 'react-router-dom'

export function FixtureLayout() {
  return <><div className="fixture-banner" role="status">Desarrollo local · ejercicios y datos de ejemplo · sin persistencia en el servidor</div><Outlet /></>
}
