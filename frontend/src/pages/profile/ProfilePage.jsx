import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Bell, 
  Save,
  Eye,
  EyeOff,
  Building2,
  Users,
  Settings
} from 'lucide-react'
import { updateUser } from '../../store/slices/authSlice'
import { updatePreferences } from '../../store/slices/notificationSlice'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

// Schema validation for profile update
const profileSchema = yup.object({
  name: yup
    .string()
    .min(2, 'نام باید حداقل ۲ کاراکتر باشد')
    .required('نام الزامی است'),
  email: yup
    .string()
    .email('ایمیل معتبر وارد کنید')
    .required('ایمیل الزامی است'),
  phone: yup
    .string()
    .matches(/^09\d{9}$/, 'شماره موبایل معتبر وارد کنید')
    .required('شماره موبایل الزامی است'),
})

// Schema validation for password change
const passwordSchema = yup.object({
  currentPassword: yup
    .string()
    .required('رمز عبور فعلی الزامی است'),
  newPassword: yup
    .string()
    .min(6, 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد')
    .required('رمز عبور جدید الزامی است'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'تکرار رمز عبور مطابقت ندارد')
    .required('تکرار رمز عبور الزامی است'),
})

const ProfilePage = () => {
  const dispatch = useDispatch()
  const { user, loading: authLoading } = useSelector((state) => state.auth)
  const { preferences, loading: notificationLoading } = useSelector((state) => state.notifications)
  
  const [activeTab, setActiveTab] = useState('profile')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Profile form
  const profileForm = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    }
  })

  // Password form
  const passwordForm = useForm({
    resolver: yupResolver(passwordSchema),
  })

  const handleProfileUpdate = async (data) => {
    try {
      await dispatch(updateUser(data)).unwrap()
      toast.success('اطلاعات پروفایل به‌روزرسانی شد')
    } catch (error) {
      toast.error(error || 'خطا در به‌روزرسانی پروفایل')
    }
  }

  const handlePasswordChange = async (data) => {
    try {
      // API call for password change would go here
      toast.success('رمز عبور تغییر کرد')
      passwordForm.reset()
    } catch (error) {
      toast.error(error || 'خطا در تغییر رمز عبور')
    }
  }

  const handleNotificationPreferencesUpdate = async (newPreferences) => {
    try {
      await dispatch(updatePreferences(newPreferences)).unwrap()
      toast.success('تنظیمات اعلان‌رسانی به‌روزرسانی شد')
    } catch (error) {
      toast.error(error || 'خطا در به‌روزرسانی تنظیمات')
    }
  }

  const getUserRoleTitle = (role) => {
    switch (role) {
      case 'catering_manager':
        return 'مدیر کترینگ'
      case 'company_admin':
        return 'مدیر شرکت'
      case 'employee':
        return 'کارمند'
      case 'individual':
        return 'کاربر عادی'
      default:
        return 'کاربر'
    }
  }

  const getUserRoleIcon = (role) => {
    switch (role) {
      case 'catering_manager':
        return <Settings className="w-5 h-5" />
      case 'company_admin':
        return <Building2 className="w-5 h-5" />
      case 'employee':
        return <Users className="w-5 h-5" />
      default:
        return <User className="w-5 h-5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">پروفایل کاربری</h1>
        <p className="text-gray-600 mt-1">
          مدیریت اطلاعات حساب کاربری و تنظیمات
        </p>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4 space-x-reverse">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user?.name}</h2>
            <p className="text-gray-600">{user?.email}</p>
            <div className="flex items-center mt-2 text-sm text-gray-500">
              {getUserRoleIcon(user?.role)}
              <span className="mr-2">{getUserRoleTitle(user?.role)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 space-x-reverse px-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              اطلاعات شخصی
            </button>
            
            <button
              onClick={() => setActiveTab('password')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'password'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              تغییر رمز عبور
            </button>
            
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              تنظیمات اعلان‌ها
            </button>
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="p-6">
            <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نام و نام خانوادگی
                  </label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      {...profileForm.register('name')}
                      type="text"
                      className={`w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        profileForm.formState.errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="نام خود را وارد کنید"
                    />
                  </div>
                  {profileForm.formState.errors.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {profileForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ایمیل
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      {...profileForm.register('email')}
                      type="email"
                      className={`w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        profileForm.formState.errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="ایمیل خود را وارد کنید"
                    />
                  </div>
                  {profileForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {profileForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    شماره موبایل
                  </label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      {...profileForm.register('phone')}
                      type="tel"
                      className={`w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        profileForm.formState.errors.phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="09123456789"
                    />
                  </div>
                  {profileForm.formState.errors.phone && (
                    <p className="mt-1 text-sm text-red-600">
                      {profileForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                {/* Role (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نقش کاربری
                  </label>
                  <div className="relative">
                    {getUserRoleIcon(user?.role)}
                    <input
                      type="text"
                      value={getUserRoleTitle(user?.role)}
                      disabled
                      className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {authLoading ? (
                    <LoadingSpinner size="small" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 ml-2" />
                      ذخیره تغییرات
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="p-6">
            <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-6">
              <div className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رمز عبور فعلی
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      {...passwordForm.register('currentPassword')}
                      type={showCurrentPassword ? 'text' : 'password'}
                      className={`w-full pr-10 pl-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        passwordForm.formState.errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="رمز عبور فعلی را وارد کنید"
                    />
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رمز عبور جدید
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      {...passwordForm.register('newPassword')}
                      type={showNewPassword ? 'text' : 'password'}
                      className={`w-full pr-10 pl-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        passwordForm.formState.errors.newPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="رمز عبور جدید را وارد کنید"
                    />
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تکرار رمز عبور جدید
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      {...passwordForm.register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`w-full pr-10 pl-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        passwordForm.formState.errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="رمز عبور جدید را مجدداً وارد کنید"
                    />
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {authLoading ? (
                    <LoadingSpinner size="small" />
                  ) : (
                    <>
                      <Lock className="w-4 h-4 ml-2" />
                      تغییر رمز عبور
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">تنظیمات اعلان‌رسانی</h3>
                <p className="text-sm text-gray-600 mb-6">
                  انتخاب کنید که چه نوع اعلان‌هایی دریافت کنید
                </p>
              </div>

              <div className="space-y-4">
                {/* Email Notifications */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-gray-400 ml-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">اعلان‌های ایمیل</h4>
                      <p className="text-sm text-gray-600">دریافت اعلان‌ها از طریق ایمیل</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.email}
                      onChange={(e) => handleNotificationPreferencesUpdate({
                        ...preferences,
                        email: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* SMS Notifications */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-gray-400 ml-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">اعلان‌های پیامکی</h4>
                      <p className="text-sm text-gray-600">دریافت اعلان‌ها از طریق پیامک</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.sms}
                      onChange={(e) => handleNotificationPreferencesUpdate({
                        ...preferences,
                        sms: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Order Updates */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Bell className="w-5 h-5 text-gray-400 ml-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">به‌روزرسانی سفارشات</h4>
                      <p className="text-sm text-gray-600">اطلاع از تغییر وضعیت سفارشات</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.orderUpdates}
                      onChange={(e) => handleNotificationPreferencesUpdate({
                        ...preferences,
                        orderUpdates: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Menu Updates */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Bell className="w-5 h-5 text-gray-400 ml-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">به‌روزرسانی منو</h4>
                      <p className="text-sm text-gray-600">اطلاع از انتشار منوی جدید</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.menuUpdates}
                      onChange={(e) => handleNotificationPreferencesUpdate({
                        ...preferences,
                        menuUpdates: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Promotions */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Bell className="w-5 h-5 text-gray-400 ml-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">تبلیغات و پیشنهادات</h4>
                      <p className="text-sm text-gray-600">دریافت پیشنهادات ویژه و تخفیف‌ها</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.promotions}
                      onChange={(e) => handleNotificationPreferencesUpdate({
                        ...preferences,
                        promotions: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {notificationLoading && (
                <div className="flex justify-center">
                  <LoadingSpinner size="small" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfilePage