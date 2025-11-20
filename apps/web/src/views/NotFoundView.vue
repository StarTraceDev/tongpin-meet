<template>
  <el-result icon="warning" title="404" sub-title="页面不存在">
    <template #extra>
      <el-button type="primary" @click="$router.replace('/')">回首页</el-button>
    </template>
  </el-result>
</template>
