import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Eye, EyeOff, UserPlus, Building2, User } from 'lucide-react'
import { registerUser, clearError } from '../../store/slices/authSlice'
import { registerCompany } from '../../store/slices/companySlice'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

// Schema validation
const registerSchema = yup.object({
  name: yup
    .string()
    .min(2, 'نام باید حداقل ۲ کاراکتر باشد')
    .required('نام الزامی است'),
  email: yup
    .string()
    .email('ایمیل معتبر وارد کنید')
    .required('ایمیل الزامی است'),
  password: yup
    .string()
    .min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد')
    .required('رمز عبور الزامی است'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'تکرار رمز عبور مطابقت ندارد')
    .required('تکرار رمز عبور الزامی است'),
  phone: yup
    .string()
    .matches(/^09\d{9}$/, 'شماره موبایل معتبر وارد کنید')
    .required('شماره موبایل الزامی است'),
  userType: yup
    .string()
    .oneOf(['individual', 'company'], 'نوع کاربر را انتخاب کنید')
    .required('نوع کاربر الزامی است'),
  // فیلدهای شرکت
  companyName: yup.string().when('userType', {
    is: 'company',
    then: (schema) => schema.required('نام شرکت الزامی است'),
    otherwise: (schema) => schema.notRequired(),
  }),
  companyAddress: yup.string().when('userType', {
    is: 'company',
    then: (schema) => schema.required('آدرس شرکت الزامی است'),
    otherwise: (schema) => schema.notRequired(),
  }),
  companyPhone: yup.string().when('userType', {
    is: 'company',
    then: (schema) => schema.matches(/^0\d{10}$/, 'شماره تلفن معتبر وارد کنید').required('شماره تلفن شرکت الزامی است'),
    otherwise: (schema) => schema.notRequired(),
  }),
})

const RegisterPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading: authLoading, error: authError } = useSelector((state) => state.auth)
  const { loading: companyLoading } = useSelector((state) => state.company)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const loading = authLoading || companyLoading

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      userType: 'individual'
    }
  })

  const userType = watch('userType')

  const onSubmit = async (data) => {
    try {
      dispatch(clearError())
      
      if (data.userType === 'company') {
        // ثبت‌نام شرکت
        const companyData = {
          name: data.companyName,
          address: data.companyAddress,
          phone: data.companyPhone,
          adminName: data.name,
          adminEmail: data.email,
          adminPassword: data.password,
          adminPhone: data.phone,
        }
        
        await dispatch(registerCompany(companyData)).unwrap()
        toast.success('درخواست ثبت‌نام شرکت ارسال شد. پس از تایید مدیر، اطلاع‌رسانی خواهید شد.')
        navigate('/login')
      } else {
        // ثبت‌نام کاربر عادی
        const userData = {
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
          role: 'individual'
        }
        
        await dispatch(registerUser(userData)).unwrap()
        toast.success('ثبت‌نام با موفقیت انجام شد')
        navigate('/dashboard')
      }
    } catch (error) {
      toast.error(error || 'خطا در ثبت‌نام')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">
            تدبیرخوان
          </h1>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            ثبت‌نام
          </h2>
          <p className="text-gray-600">
            حساب کاربری جدید ایجاد کنید
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          
          {/* User Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              نوع کاربری
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="relative">
                <input
                  {...register('userType')}
                  type="radio"
                  value="individual"
                  className="sr-only"
                />
                <div className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  userType === 'individual' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <User className="w-5 h-5 ml-2" />
                  <span className="text-sm font-medium">کاربر عادی</span>
                </div>
              </label>
              
              <label className="relative">
                <input
                  {...register('userType')}
                  type="radio"
                  value="company"
                  className="sr-only"
                />
                <div className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  userType === 'company' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <Building2 className="w-5 h-5 ml-2" />
                  <span className="text-sm font-medium">شرکت</span>
                </div>
              </label>
            </div>
            {errors.userType && (
              <p className="mt-1 text-sm text-red-600">{errors.userType.message}</p>
            )}
          </div>

          <div className="space-y-4">
            {/* Personal Information */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                {userType === 'company' ? 'نام مدیر شرکت' : 'نام و نام خانوادگی'}
              </label>
              <input
                {...register('name')}
                type="text"
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="نام خود را وارد کنید"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                ایمیل
              </label>
              <input
                {...register('email')}
                type="email"
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="ایمیل خود را وارد کنید"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                شماره موبایل
              </label>
              <input
                {...register('phone')}
                type="tel"
                className={`appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="09123456789"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* Company Information */}
            {userType === 'company' && (
              <>
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                    نام شرکت
                  </label>
                  <input
                    {...register('companyName')}
                    type="text"
                    className={`appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.companyName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="نام شرکت را وارد کنید"
                  />
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    آدرس شرکت
                  </label>
                  <textarea
                    {...register('companyAddress')}
                    rows={3}
                    className={`appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.companyAddress ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="آدرس کامل شرکت را وارد کنید"
                  />
                  {errors.companyAddress && (
                    <p className="mt-1 text-sm text-red-600">{errors.companyAddress.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    شماره تلفن شرکت
                  </label>
                  <input
                    {...register('companyPhone')}
                    type="tel"
                    className={`appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.companyPhone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="02112345678"
                  />
                  {errors.companyPhone && (
                    <p className="mt-1 text-sm text-red-600">{errors.companyPhone.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                رمز عبور
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className={`appearance-none relative block w-full px-3 py-2 pl-10 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="رمز عبور خود را وارد کنید"
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                تکرار رمز عبور
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`appearance-none relative block w-full px-3 py-2 pl-10 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="رمز عبور را مجدداً وارد کنید"
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {authError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{authError}</p>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <LoadingSpinner size="small" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5 ml-2" />
                  {userType === 'company' ? 'ثبت‌نام شرکت' : 'ثبت‌نام'}
                </>
              )}
            </button>
          </div>

          {/* Links */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              قبلاً ثبت‌نام کرده‌اید؟{' '}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                وارد شوید
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterPage