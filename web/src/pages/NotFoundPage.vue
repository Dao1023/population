<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="flex min-h-[70vh] flex-col items-center justify-center text-center">
    <p class="text-[11px] font-semibold tracking-[0.16em] text-[#2563eb]">404</p>
    <h1 class="mt-3 text-3xl font-bold tracking-tight text-[#0f172a]">找不到这个页面</h1>
    <p class="mt-2 text-sm text-[#64748b]">地址可能拼错了，或者这页还没做出来。</p>
    <RouterLink to="/" class="btn btn-primary btn-sm mt-6">回首页</RouterLink>
  </div>
</template>
