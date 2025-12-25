import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { 
  Building2, 
  Users, 
  Search, 
  Filter,
  Eye,
  Check,
  X,
  Plus,
  Mail,
  Phone,
  MapPin
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const CompanyManagement = () => {
  const dispatch = useDispatch()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCompanyDetails, setShowCompanyDetails] = useState(null)
  const [loading, setLoading] = useState(false)

  // Mock data - در پیاده‌سازی واقعی از API دریافت می‌شود
  const [companies, setCompanies] = useState([
    {
      id: 1,
      name: 'شرکت فناوری پارس',
      adminName: 'احمد محمدی',
      adminEmail: 'admin@parstech.com',
      adminPhone: '09123456789',
      address: 'تهران، خیابان ولیعصر، پلاک 123',
      phone: '02112345678',
      employeeCount: 45,
      status: 'approved',
      registrationDate: '2024-01-10',
      lastActivity: '2024-01-15'
    },
    {
      id: 2,
      name: 'گروه صنعتی البرز',
      adminName: 'فاطمه احمدی',
      adminEmail: 'admin@alborz.com',
      adminPhone: '09987654321',
      address: 'کرج، شهرک صنعتی البرز، واحد 5',
      phone: '02634567890',
      employeeCount: 120,
      status: 'pending',
      registrationDate: '2024-01-12',
      lastActivity: '2024-01-14'
    },
    {
      id: 3,
      name: 'شرکت بازرگانی آسیا',
      adminName: 'علی رضایی',
      adminEmail: 'admin@asia-trade.com',
      adminPhone: '09111111111',
      address: 'اصفهان، خیابان چهارباغ، مجتمع تجاری آسیا',
      phone: '03112345678',
      employeeCount: 30,
      status: 'rejected',
      registrationDate: '2024-01-08',
      lastActivity: '2024-01-13'
    }
  ])

  const handleApproveCompany = async (companyId) => {
    if (window.confirm('آیا از تایید این شرکت اطمینان دارید؟')) {
      setLoading(true)
      try {
        // API call would go here
        setCompanies(companies.map(company => 
          company.id === companyId 
            ? { ...company, status: 'approved' }
            : company
        ))
        toast.success('شرکت با موفقیت تایید شد')
      } catch (error) {
        toast.error('خطا در تایید شرکت')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleRejectCompany = async (companyId) => {
    const reason = window.prompt('دلیل رد درخواست را وارد کنید:')
    if (reason) {
      setLoading(true)
      try {
        // API call would go here
        setCompanies(companies.map(company => 
          company.id === companyId 
            ? { ...company, status: 'rejected' }
            : company
        ))
        toast.success('درخواست شرکت رد شد')
      } catch (error) {
        toast.error('خطا در رد درخواست')
      } finally {
        setLoading(false)
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'تایید شده'
      case 'pending':
        return 'در انتظار بررسی'
      case 'rejected':
        return 'رد شده'
      default:
        return 'نامشخص'
    }
  }

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = !searchQuery || 
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.adminName.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || company.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مدیریت شرکت‌ها</h1>
          <p className="text-gray-600 mt-1">
            مدیریت درخواست‌های ثبت‌نام و شرکت‌های فعال
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4 ml-2" />
            افزودن شرکت
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">شرکت‌های فعال</p>
              <p className="text-2xl font-bold text-gray-900">
                {companies.filter(c => c.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Building2 className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">در انتظار بررسی</p>
              <p className="text-2xl font-bold text-gray-900">
                {companies.filter(c => c.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">کل کارمندان</p>
              <p className="text-2xl font-bold text-gray-900">
                {companies.reduce((total, c) => total + c.employeeCount, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <X className="w-6 h-6 text-red-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">رد شده</p>
              <p className="text-2xl font-bold text-gray-900">
                {companies.filter(c => c.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 sm:space-x-reverse">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="جستجو در شرکت‌ها..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="approved">تایید شده</option>
              <option value="pending">در انتظار</option>
              <option value="rejected">رد شده</option>
            </select>
          </div>
        </div>
      </div>

      {/* Companies List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8">
            <LoadingSpinner />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              شرکتی یافت نشد
            </h3>
            <p className="text-gray-600">
              {searchQuery ? 'کلمه کلیدی دیگری امتحان کنید' : 'هنوز شرکتی ثبت‌نام نکرده است'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    شرکت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مدیر
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    کارمندان
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    وضعیت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاریخ ثبت‌نام
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center ml-3">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {company.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {company.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.adminName}</div>
                      <div className="text-sm text-gray-500">{company.adminEmail}</div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 ml-1" />
                        <span className="text-sm text-gray-900">{company.employeeCount}</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(company.status)}`}>
                        {getStatusText(company.status)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(company.registrationDate).toLocaleDateString('fa-IR')}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => setShowCompanyDetails(showCompanyDetails === company.id ? null : company.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {company.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveCompany(company.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectCompany(company.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Company Details Modal */}
        {showCompanyDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              {(() => {
                const company = companies.find(c => c.id === showCompanyDetails)
                return company ? (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">
                        جزئیات شرکت
                      </h3>
                      <button
                        onClick={() => setShowCompanyDetails(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            نام شرکت
                          </label>
                          <p className="text-sm text-gray-900">{company.name}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            وضعیت
                          </label>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(company.status)}`}>
                            {getStatusText(company.status)}
                          </span>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            نام مدیر
                          </label>
                          <p className="text-sm text-gray-900">{company.adminName}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            تعداد کارمندان
                          </label>
                          <p className="text-sm text-gray-900">{company.employeeCount} نفر</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          آدرس
                        </label>
                        <div className="flex items-start">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 ml-2" />
                          <p className="text-sm text-gray-900">{company.address}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ایمیل مدیر
                          </label>
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 text-gray-400 ml-2" />
                            <p className="text-sm text-gray-900">{company.adminEmail}</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            شماره موبایل مدیر
                          </label>
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 text-gray-400 ml-2" />
                            <p className="text-sm text-gray-900">{company.adminPhone}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            تاریخ ثبت‌نام
                          </label>
                          <p className="text-sm text-gray-900">
                            {new Date(company.registrationDate).toLocaleDateString('fa-IR')}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            آخرین فعالیت
                          </label>
                          <p className="text-sm text-gray-900">
                            {new Date(company.lastActivity).toLocaleDateString('fa-IR')}
                          </p>
                        </div>
                      </div>

                      {company.status === 'pending' && (
                        <div className="flex space-x-4 space-x-reverse pt-4 border-t border-gray-200">
                          <button
                            onClick={() => {
                              handleApproveCompany(company.id)
                              setShowCompanyDetails(null)
                            }}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 ml-2" />
                            تایید شرکت
                          </button>
                          
                          <button
                            onClick={() => {
                              handleRejectCompany(company.id)
                              setShowCompanyDetails(null)
                            }}
                            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            <X className="w-4 h-4 ml-2" />
                            رد درخواست
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CompanyManagement