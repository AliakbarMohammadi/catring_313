import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { combineReducers } from '@reduxjs/toolkit'

// Reducers
import authReducer from './slices/authSlice'
import menuReducer from './slices/menuSlice'
import orderReducer from './slices/orderSlice'
import companyReducer from './slices/companySlice'
import notificationReducer from './slices/notificationSlice'

// تنظیمات persist
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'], // فقط auth state را persist می‌کنیم
}

const rootReducer = combineReducers({
  auth: authReducer,
  menu: menuReducer,
  orders: orderReducer,
  company: companyReducer,
  notifications: notificationReducer,
})

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: import.meta.env.DEV,
})

export const persistor = persistStore(store)