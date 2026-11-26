<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#f3f4f6]">
    <!-- 顶部固定导航 -->
    <header class="sticky top-0 z-50 border-b border-[#e7ebf1] bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)] backdrop-blur-xl">
      <div class="mx-auto flex h-[60px] w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <RouterLink
          to="/"
          class="flex items-center gap-2 whitespace-nowrap text-[14.5px] font-bold tracking-wide text-[#0f172a] sm:text-base"
        >
          <span class="flex h-[23px] w-[23px] flex-none items-center justify-center rounded-[7px] bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] text-[12px] font-bold text-white shadow-[0_2px_6px_rgba(37,99,235,0.32)]">人</span>
          <span>人口与婚姻</span>
        </RouterLink>

        <nav class="flex items-center gap-0.5">
          <RouterLink to="/" class="nav-link" exact-active-class="nav-active">首页</RouterLink>
          <RouterLink to="/population" class="nav-link" active-class="nav-active">人口结构</RouterLink>
          <RouterLink to="/marriage" class="nav-link" active-class="nav-active">结婚趋势</RouterLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-2 sm:px-6">
      <RouterView />
    </main>

    <footer class="border-t border-[#e7ebf1] bg-white/60">
      <div class="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-[11.5px] text-[#64748b] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>数据来源：民政部、国家统计局 · 本站为数据可视化项目，仅供参考</p>
        <p>© 2026 人口与婚姻</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.nav-link {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 13.5px;
  color: #64748b;
  white-space: nowrap;
  transition: background-color 0.18s, color 0.18s;
}
.nav-link:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}
.nav-link.nav-active {
  background-color: #eff6ff;
  color: #2563eb;
  font-weight: 600;
}
@media (max-width: 640px) {
  .nav-link {
    padding: 5px 7px;
    font-size: 12px;
  }
}
</style>
