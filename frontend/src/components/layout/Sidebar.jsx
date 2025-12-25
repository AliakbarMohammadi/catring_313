import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { 
  Home, 
  UtensilsCrossed, 
  ShoppingBag, 
  User, 
  Users,
  ChefHat,
  BarChart3,
  Settings,
  Building2,
  FileText
} from 'lucide-react'

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation()
  const { user } = useSelector((state) => state.auth)

  // منوهای مختلف بر اساس نقش کاربر
  const getMenuItems = () => {
    const commonItems = [
      { name: 'داشبورد', href: '/dashboard', icon: Home },
      { name: 'منو', href: '/menu', icon: UtensilsCrossed },
      { name: 'سفارشات', href: '/orders', icon: ShoppingBag },
      { name: 'پروفایل', href: '/profile', icon: User },
    ]

    if (user?.role === 'catering_manager') {
      return [
        { name: 'داشبورد مدیر', href: '/admin', icon: Home },
        { name: 'مدیریت شرکت‌ها', href: '/admin/companies', icon: Building2 },
        { name: 'مدیریت منو', href: '/admin/menu-management', icon: ChefHat },
        { name: 'مدیریت سفارشات', href: '/admin/orders', icon: ShoppingBag },
        { name: 'گزارش‌ها', href: '/admin/reports', icon: BarChart3 },
        ...commonItems.slice(3) // فقط پروفایل
      ]
    }

    if (user?.role === 'company_admin') {
      return [
        { name: 'داشبورد شرکت', href: '/admin', icon: Home },
        { name: 'مدیریت کارمندان', href: '/admin/employees', icon: Users },
        { name: 'سفارشات شرکت', href: '/admin/orders', icon: ShoppingBag },
        { name: 'فاکتورها', href: '/admin/invoices', icon: FileText },
        { name: 'گزارش‌ها', href: '/admin/reports', icon: BarChart3 },
        ...commonItems.slice(1) // منو و پروفایل
      ]
    }

    return commonItems
  }

  const menuItems = getMenuItems()

  const isActive = (href) => {
    if (href === '/dashboard' || href === '/admin') {
      return location.pathname === href
    }
    return location.pathname.startsWith(href)
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow bg-white border-l border-gray-200 pt-16 pb-4 overflow-y-auto">
            <div className="flex-grow flex flex-col">
              <nav className="flex-1 px-2 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive(item.href)
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon
                        className={`ml-3 flex-shrink-0 h-6 w-6 ${
                          isActive(item.href)
                            ? 'text-blue-500'
                            : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      />
                      {item.name}
                    </NavLink>
                  )
                })}
              </nav>
            </div>

            {/* User Role Badge */}
            <div className="flex-shrink-0 px-4 py-2">
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">نقش کاربری</div>
                <div className="text-sm font-medium text-gray-900">
                  {user?.role === 'catering_manager' && 'مدیر کترینگ'}
                  {user?.role === 'company_admin' && 'مدیر شرکت'}
                  {user?.role === 'employee' && 'کارمند'}
                  {user?.role === 'individual' && 'کاربر عادی'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-y-0 right-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full pt-16 pb-4 overflow-y-auto">
          <div className="flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon
                      className={`ml-3 flex-shrink-0 h-6 w-6 ${
                        isActive(item.href)
                          ? 'text-blue-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    {item.name}
                  </NavLink>
                )
              })}
            </nav>
          </div>

          {/* User Role Badge */}
          <div className="flex-shrink-0 px-4 py-2">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">نقش کاربری</div>
              <div className="text-sm font-medium text-gray-900">
                {user?.role === 'catering_manager' && 'مدیر کترینگ'}
                {user?.role === 'company_admin' && 'مدیر شرکت'}
                {user?.role === 'employee' && 'کارمند'}
                {user?.role === 'individual' && 'کاربر عادی'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar