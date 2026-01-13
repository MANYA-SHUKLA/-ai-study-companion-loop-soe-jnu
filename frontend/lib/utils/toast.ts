/**
 * Central toast utility functions
 * 
 * Provides consistent error handling and toast notifications across the app
 */

import toast from 'react-hot-toast'
import { ToastMessages, TOAST_IDS, getToastConfig, TOAST_DURATIONS } from '../constants/toast'

/**
 * Show error toast with consistent handling
 */
export function showErrorToast(error: any, defaultMsg: string, toastId?: string) {
  // Check for network errors first
  if (error.response?.status === 0 || error.isNetworkError || !error.response) {
    toast.error(ToastMessages.NETWORK_ERROR, getToastConfig.networkError())
    return
  }

  // Check for validation errors (422)
  if (error.response?.status === 422) {
    const message = error.response?.data?.detail || 'Invalid input. Please check your data and try again.'
    toast.error(message, {
      id: toastId || TOAST_IDS.DELETE_FAILED,
      duration: TOAST_DURATIONS.STANDARD,
    })
    return
  }

  // Generic error handling
  const message = error.response?.data?.detail || error.message || defaultMsg
  toast.error(message, {
    id: toastId || TOAST_IDS.DELETE_FAILED,
    duration: TOAST_DURATIONS.STANDARD,
  })
}

/**
 * Show success toast with consistent duration
 */
export function showSuccessToast(message: string, toastId: string, duration: 'short' | 'standard' | 'long' = 'short') {
  const config = duration === 'short' 
    ? getToastConfig.shortSuccess(message, toastId)
    : duration === 'long'
    ? getToastConfig.longSuccess(message, toastId)
    : getToastConfig.standardSuccess(message, toastId)
  
  toast.success(message, config)
}

/**
 * Show loading toast (persistent for AI actions)
 */
export function showLoadingToast(message: string, toastId: string) {
  return toast.loading(message, getToastConfig.persistentLoading(message, toastId))
}

/**
 * Dismiss toast and show success
 */
export function dismissAndShowSuccess(loadingToastId: string, successMessage: string, successToastId: string) {
  toast.dismiss(loadingToastId)
  showSuccessToast(successMessage, successToastId, 'short')
}

/**
 * Dismiss toast and show error
 */
export function dismissAndShowError(loadingToastId: string, error: any, defaultMsg: string) {
  toast.dismiss(loadingToastId)
  showErrorToast(error, defaultMsg)
}

