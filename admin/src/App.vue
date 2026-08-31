<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
// 登录页不显示顶栏
const showHeader = computed(() => route.name !== 'login')
</script>

<template>
  <el-container class="app">
    <el-header v-if="showHeader" class="app-header">
      <span class="app-title">博物馆展品管理后台</span>
    </el-header>
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>

<style>
html,
body,
#app {
  margin: 0;
  height: 100%;
}
.app-header {
  display: flex;
  align-items: center;
  background: var(--ocean-primary);
  color: #fff;
}
.app-title {
  font-size: 18px;
  font-weight: 600;
}
</style>
