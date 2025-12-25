import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { 
  Calendar, 
  Search, 
  Filter, 
  Plus, 
  Minus,
  ShoppingCart,
  Star,
  Clock,
  UtensilsCrossed
} from 'lucide-react'
import { 
  fetchDailyMenu, 
  fetchWeeklyMenu, 
  setSelectedDate,
  fetchMenuCategories 
} from '../../store/slices/menuSlice'
import { addToCart, updateCartItemQuantity } from '../../store/slices/orderSlice'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const MenuPage = () => {
  const dispatch = useDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const { 
    dailyMenu, 
    categories, 
    selectedDate, 
    loading 
  } = useSelector((state) => state.menu)
  const { cart } = useSelector((state) => state.orders)
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState('daily') // daily, weekly

  useEffect(() => {
    dispatch(fetchMenuCategories())
    if (selectedDate) {
      dispatch(fetchDailyMenu(selectedDate))
    }
  }, [dispatch, selectedDate])

  useEffect(() => {
    const search = searchParams.get('search')
    if (search) {
      setSearchQuery(search)
    }
  }, [searchParams])

  const handleDateChange = (date) => {
    dispatch(setSelectedDate(date))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setSearchParams({ search: searchQuery })
    } else {
      setSearchParams({})
    }
  }

  const filteredMenu = dailyMenu.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = !selectedCategory || item.categoryId === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const getCartItemQuantity = (itemId) => {
    const cartItem = cart.find(item => item.id === itemId)
    return cartItem ? cartItem.quantity : 0
  }

  const handleAddToCart = (item) => {
    if (!item.available) {
      toast.error('این آیتم در حال حاضر موجود نیست')
      return
    }

    dispatch(addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: 1,
      deliveryDate: selectedDate
    }))
    
    toast.success(`${item.name} به سبد خرید اضافه شد`)
  }

  const handleUpdateQuantity = (itemId, newQuantity) => {
    dispatch(updateCartItemQuantity({ id: itemId, quantity: newQuantity }))
  }

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getWeekDates = () => {
    const dates = []
    const today = new Date()
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push({
        date: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('fa-IR', { weekday: 'short', day: 'numeric', month: 'short' })
      })
    }
    
    return dates
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">منوی غذا</h1>
          <p className="text-gray-600 mt-1">
            غذای مورد علاقه خود را انتخاب کنید
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-4 space-x-reverse">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'daily' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              روزانه
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'weekly' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              هفتگی
            </button>
          </div>
        </div>
      </div>

      {/* Date Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4 space-x-reverse mb-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">انتخاب تاریخ</h3>
        </div>
        
        {viewMode === 'daily' ? (
          <div className="flex items-center space-x-4 space-x-reverse">
            <input
              type="date"
              value={selectedDate}
              min={getTomorrowDate()}
              onChange={(e) => handleDateChange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-600">
              {new Date(selectedDate).toLocaleDateString('fa-IR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {getWeekDates().map(({ date, label }) => (
              <button
                key={date}
                onClick={() => handleDateChange(date)}
                className={`p-3 text-center rounded-lg border transition-colors ${
                  selectedDate === date
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-sm font-medium">{label}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 sm:space-x-reverse">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="جستجو در منو..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 ml-2" />
            فیلتر
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !selectedCategory
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                همه
              </button>
              
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8">
            <LoadingSpinner />
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className="p-8 text-center">
            <UtensilsCrossed className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'نتیجه‌ای یافت نشد' : 'منوی این روز هنوز منتشر نشده'}
            </h3>
            <p className="text-gray-600">
              {searchQuery 
                ? 'کلمه کلیدی دیگری امتحان کنید یا فیلترها را تغییر دهید'
                : 'لطفاً تاریخ دیگری انتخاب کنید'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredMenu.map((item) => {
              const cartQuantity = getCartItemQuantity(item.id)
              
              return (
                <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  {/* Image */}
                  <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center">
                        <UtensilsCrossed className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      {item.rating && (
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600 mr-1">{item.rating}</span>
                        </div>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 ml-1" />
                        {item.preparationTime || '30'} دقیقه
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        {item.price.toLocaleString()} تومان
                      </span>
                    </div>

                    {/* Add to Cart */}
                    <div className="flex items-center justify-between">
                      <div className={`text-sm font-medium ${
                        item.available ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.available ? 'موجود' : 'ناموجود'}
                      </div>

                      {cartQuantity > 0 ? (
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, cartQuantity - 1)}
                            className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{cartQuantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, cartQuantity + 1)}
                            className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(item)}
                          disabled={!item.available}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ShoppingCart className="w-4 h-4 ml-2" />
                          افزودن
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-40">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">
                {cart.reduce((total, item) => total + item.quantity, 0)} آیتم در سبد خرید
              </p>
              <p className="text-sm text-gray-600">
                مجموع: {cart.reduce((total, item) => total + (item.price * item.quantity), 0).toLocaleString()} تومان
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/orders'}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ShoppingCart className="w-4 h-4 ml-2" />
              مشاهده سبد خرید
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MenuPage