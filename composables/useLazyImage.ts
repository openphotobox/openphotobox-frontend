/**
 * Composable for lazy loading images with thumbnail fallback
 * 
 * This composable provides a way to load full-resolution images
 * only when needed, while showing thumbnails immediately for better UX.
 */

export interface LazyImageOptions {
  /** Delay before loading full image (ms) */
  loadDelay?: number
  /** Whether to preload the full image on hover */
  preloadOnHover?: boolean
  /** Whether to load full image when in viewport */
  loadOnViewport?: boolean
}

export function useLazyImage(asset: Ref<any>, options: LazyImageOptions = {}) {
  const {
    loadDelay = 1000, // 1 second delay
    preloadOnHover = true,
    loadOnViewport = false
  } = options

  const isFullImageLoaded = ref(false)
  const isFullImageLoading = ref(false)
  const currentImageUrl = ref(asset.value?.thumbnail_url || asset.value?.src || '')
  const fullImageUrl = ref(asset.value?.original_url || asset.value?.storage_url || asset.value?.src || '')
  
  let loadTimeout: NodeJS.Timeout | null = null
  let preloadImage: HTMLImageElement | null = null

  // Watch for asset changes
  watch(asset, (newAsset) => {
    if (newAsset) {
      currentImageUrl.value = newAsset.thumbnail_url || newAsset.src || ''
      fullImageUrl.value = newAsset.original_url || newAsset.storage_url || newAsset.src || ''
      isFullImageLoaded.value = false
      isFullImageLoading.value = false
      
      // Clear any pending timeouts
      if (loadTimeout) {
        clearTimeout(loadTimeout)
        loadTimeout = null
      }
    }
  }, { immediate: true })

  /**
   * Start loading the full image after a delay
   */
  const startLoadingFullImage = () => {
    if (isFullImageLoaded.value || isFullImageLoading.value || !fullImageUrl.value) {
      return
    }

    // Clear any existing timeout
    if (loadTimeout) {
      clearTimeout(loadTimeout)
    }

    loadTimeout = setTimeout(() => {
      loadFullImage()
    }, loadDelay)
  }

  /**
   * Load the full image immediately
   */
  const loadFullImage = () => {
    if (isFullImageLoaded.value || isFullImageLoading.value || !fullImageUrl.value) {
      return
    }

    isFullImageLoading.value = true

    // Create a new image element to preload
    preloadImage = new Image()
    
    preloadImage.onload = () => {
      // Image loaded successfully, switch to full resolution
      currentImageUrl.value = fullImageUrl.value
      isFullImageLoaded.value = true
      isFullImageLoading.value = false
      preloadImage = null
    }

    preloadImage.onerror = () => {
      // Failed to load full image, keep using thumbnail
      console.warn('Failed to load full image:', fullImageUrl.value)
      isFullImageLoading.value = false
      preloadImage = null
    }

    // Start loading
    preloadImage.src = fullImageUrl.value
  }

  /**
   * Cancel loading the full image
   */
  const cancelLoadingFullImage = () => {
    if (loadTimeout) {
      clearTimeout(loadTimeout)
      loadTimeout = null
    }
    
    if (preloadImage) {
      preloadImage.onload = null
      preloadImage.onerror = null
      preloadImage = null
    }
    
    isFullImageLoading.value = false
  }

  /**
   * Handle mouse enter for preloading
   */
  const handleMouseEnter = () => {
    if (preloadOnHover && !isFullImageLoaded.value) {
      startLoadingFullImage()
    }
  }

  /**
   * Handle mouse leave
   */
  const handleMouseLeave = () => {
    // Don't cancel loading on mouse leave - let it continue
    // This provides a better UX as the user might come back
  }

  /**
   * Handle click to load full image immediately
   */
  const handleClick = () => {
    if (!isFullImageLoaded.value) {
      cancelLoadingFullImage()
      loadFullImage()
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    cancelLoadingFullImage()
  })

  return {
    // State
    currentImageUrl: readonly(currentImageUrl),
    isFullImageLoaded: readonly(isFullImageLoaded),
    isFullImageLoading: readonly(isFullImageLoading),
    
    // Methods
    startLoadingFullImage,
    loadFullImage,
    cancelLoadingFullImage,
    handleMouseEnter,
    handleMouseLeave,
    handleClick
  }
}
