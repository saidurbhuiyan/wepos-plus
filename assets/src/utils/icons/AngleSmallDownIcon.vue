<template>
  <svg
      xmlns="http://www.w3.org/2000/svg"
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      fill="currentColor"
      :class="css"
  >
    <path d="M18.71,8.21a1,1,0,0,0-1.42,0l-4.58,4.58a1,1,0,0,1-1.42,0L6.71,8.21a1,1,0,0,0-1.42,0,1,1,0,0,0,0,1.41l4.59,4.59a3,3,0,0,0,4.24,0l4.59-4.59A1,1,0,0,0,18.71,8.21Z"/>
  </svg>
</template>

<script>
export default {
  props: {
    size: {
      type: [String, Number],
      default: '14',
    },

    css: {
      type: String,
      default: '',
    }
  }
}
</script>
