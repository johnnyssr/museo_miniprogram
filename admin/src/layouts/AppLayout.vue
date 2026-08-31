<template>
  <el-container class="admin-shell">
    <el-aside :width="collapsed ? '64px' : '208px'" class="shell-aside">
      <div class="brand">🌊 <span v-show="!collapsed">运维后台</span></div>
      <el-menu :collapse="collapsed" :default-active="activeMenu" router
               background-color="transparent" text-color="#d4edf5" active-text-color="#fff">
        <el-menu-item index="/dashboard"><el-icon><DataLine /></el-icon><span>数据概览</span></el-menu-item>
        <el-menu-item index="/exhibits"><el-icon><Files /></el-icon><span>展品管理</span></el-menu-item>
        <el-menu-item index="/import"><el-icon><Upload /></el-icon><span>批量导入</span></el-menu-item>
      </el-menu>
      <div class="collapse-toggle" @click="collapsed = !collapsed">{{ collapsed ? '»' : '«' }}</div>
    </el-aside>
    <el-container>
      <el-header class="shell-header">
        <div class="header-title">北部湾海洋生态守护站 · 运维后台</div>
        <el-dropdown @command="onCommand">
          <span class="header-user">👤 管理员 ▾</span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main class="shell-main">
        <el-breadcrumb class="shell-crumb" separator="/">
          <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item>{{ crumb }}</el-breadcrumb-item>
        </el-breadcrumb>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DataLine, Files, Upload } from '@element-plus/icons-vue'
import { logout } from '../cloudbase'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const activeMenu = computed(() => '/' + (route.path.split('/')[1] || 'dashboard'))
const CRUMBS: Record<string, string> = {
  dashboard: '数据概览', exhibits: '展品管理', import: '批量导入',
}
const crumb = computed(() => CRUMBS[route.path.split('/')[1]] || '展品管理')

async function onCommand(cmd: string) {
  if (cmd === 'logout') { await logout(); router.push('/login') }
}
</script>

<style scoped>
.admin-shell { height: 100vh; }
.shell-aside {
  background: var(--ocean-primary-dark);
  color: #d4edf5; display: flex; flex-direction: column; position: relative;
}
.brand { height: 56px; display: flex; align-items: center; gap: 8px; padding: 0 18px; font-weight: 600; color: #fff; }
.shell-aside .el-menu { border-right: none; }
.collapse-toggle { margin-top: auto; padding: 12px 18px; cursor: pointer; color: #8fbfce; }
.shell-header {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--ocean-primary); color: #fff;
}
.header-title { font-size: 16px; font-weight: 600; }
.header-user { color: #fff; cursor: pointer; }
.shell-main { background: var(--ocean-bg-page); }
.shell-crumb { margin-bottom: 16px; }
</style>
