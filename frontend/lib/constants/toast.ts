/**
 * Toast notification IDs, messages, and durations
 * 
 * Central constants to avoid magic strings and ensure consistent UX
 */

export const TOAST_IDS = {
  // Success messages
  SUBJECT_CREATED: 'subject-created',
  SUBJECT_DELETED: 'subject-deleted',
  NOTE_DELETED: 'note-deleted',
  TOPIC_DELETED: 'topic-deleted',
  QUIZ_GENERATED: 'quiz-generated',
  QUIZ_SUBMITTED: 'quiz-submitted',
  FILE_UPLOADED: 'file-uploaded',
  TOPICS_EXTRACTED: 'topics-extracted',
  TOPICS_SAVED: 'topics-saved',
  TOPIC_SAVE_FAILED: 'topic-save-failed',
  EMBEDDINGS_REINDEXED: 'embeddings-reindexed',
  STUDY_PLAN_UPDATED: 'study-plan-updated',
  WEAK_AREA_CLEARED: 'weak-area-cleared',
  
  // Error messages
  CREATE_FAILED: 'create-failed',
  DELETE_FAILED: 'delete-failed',
  NETWORK_ERROR: 'network-error',
  UPLOAD_FAILED: 'upload-failed',
  GENERATION_FAILED: 'generation-failed',
  WEAK_AREA_DETECTED: 'weak-area-detected',
  
  // Loading messages (persistent for AI actions)
  DELETING: 'deleting',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  GENERATING_QUIZ: 'generating-quiz',
  GENERATING_STUDY_PLAN: 'generating-study-plan',
  EXTRACTING_TOPICS: 'extracting-topics',
} as const

export const ToastMessages = {
  // Success messages
  UPLOAD_SUCCESS: 'File uploaded successfully!',
  UPLOAD_SUCCESS_WITH_EMBEDDINGS: 'File uploaded successfully! Embeddings indexed for semantic search.',
  DELETE_SUCCESS: 'Deleted successfully',
  SUBJECT_CREATED: 'Subject created successfully!',
  SUBJECT_DELETED: 'Subject deleted successfully',
  NOTE_DELETED: 'Note deleted successfully',
  TOPIC_DELETED: 'Topic deleted successfully',
  TOPICS_EXTRACTED: (count: number) => `Extracted and saved ${count} topic${count > 1 ? 's' : ''}! Roadmap ready.`,
  TOPICS_SAVED: (count: number) => `Saved ${count} topic${count > 1 ? 's' : ''} to subject`,
  TOPICS_SAVE_FAILED: 'Failed to save topics. Please try again.',
  EMBEDDINGS_REINDEXED: 'Embeddings re-indexed successfully! Semantic search is now enabled.',
  STUDY_PLAN_UPDATED: '📅 Study plan updated automatically! Revision days added for weak areas.',
  WEAK_AREA_CLEARED: (topicTitle: string) => `🎉 Weak area cleared! "${topicTitle}" is no longer a weak area. Great improvement!`,
  
  // Error messages
  DELETE_ERROR: 'Failed to delete item. Please try again.',
  DELETE_FAILED: (item: string) => `Failed to delete ${item}. Please try again.`,
  NETWORK_ERROR: '📡 Network error: Could not connect to server. Please check your internet connection.',
  UPLOAD_ERROR: 'Failed to upload file. Please try again.',
  GENERATION_FAILED: 'Failed to generate. Please try again.',
  WEAK_AREA_DETECTED: (topicTitle: string, reasons: string[]) => {
    const reasonText = reasons.length > 0 ? ` (${reasons.join(', ')})` : ''
    return `⚠️ Weak area detected: "${topicTitle}"${reasonText}. Your study plan will be updated automatically.`
  },
  
  // Loading messages
  DELETING: 'Deleting...',
  UPLOADING: 'Uploading file...',
  PROCESSING: 'Processing...',
  GENERATING_QUIZ: 'Generating quiz questions...',
  GENERATING_STUDY_PLAN: 'Generating personalized study plan...',
  EXTRACTING_TOPICS: 'Analyzing your notes with AI...',
} as const

/**
 * Toast durations in milliseconds
 * - Short-lived actions: 2.5s (quick confirmations)
 * - Standard actions: 4s (default)
 * - Important actions: 6s (network errors, important updates)
 * - Persistent: Infinity (AI actions with loading state)
 */
export const TOAST_DURATIONS = {
  SHORT: 2500,      // Quick actions (delete, save)
  STANDARD: 4000,   // Default duration
  LONG: 6000,       // Network errors, important updates
  PERSISTENT: Infinity, // AI generation (dismissed manually or on completion)
} as const

/**
 * Helper to get toast configuration for different action types
 */
export const getToastConfig = {
  shortSuccess: (message: string, id: string) => ({
    message,
    id,
    duration: TOAST_DURATIONS.SHORT,
  }),
  standardSuccess: (message: string, id: string) => ({
    message,
    id,
    duration: TOAST_DURATIONS.STANDARD,
  }),
  longSuccess: (message: string, id: string) => ({
    message,
    id,
    duration: TOAST_DURATIONS.LONG,
  }),
  networkError: () => ({
    message: ToastMessages.NETWORK_ERROR,
    id: TOAST_IDS.NETWORK_ERROR,
    duration: TOAST_DURATIONS.LONG,
    icon: '📡',
  }),
  persistentLoading: (message: string, id: string) => ({
    message,
    id,
    duration: TOAST_DURATIONS.PERSISTENT,
  }),
} as const

