import { Outlet } from "react-router-dom"

export function SettingsLayout() {
  return (
    <div className="flex flex-col h-full w-full">
      <Outlet />
    </div>
  )
}
