<template>
  <div class="panel">
    <h4>⚙️ 网格策略配置</h4>
    <el-form :model="store.config" label-width="90px" size="small" label-position="top">
      <el-row :gutter="8">
        <el-col :span="12"><el-form-item label="下限价格"><el-input-number v-model="store.config.lowerPrice" :min="50" :max="200" :step="5" controls-position="right"/></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="上限价格"><el-input-number v-model="store.config.upperPrice" :min="50" :max="200" :step="5" controls-position="right"/></el-form-item></el-col>
      </el-row>
      <el-row :gutter="8">
        <el-col :span="12"><el-form-item label="网格数量"><el-input-number v-model="store.config.gridCount" :min="5" :max="50" :step="5" controls-position="right"/></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="每格资金"><el-input-number v-model="store.config.capitalPerGrid" :min="100" :max="50000" :step="500" controls-position="right"/></el-form-item></el-col>
      </el-row>
      <el-form-item label="初始资金"><el-input-number v-model="store.config.initialCapital" :min="10000" :max="1000000" :step="10000" controls-position="right"/></el-form-item>
      <el-button type="primary" @click="store.runBacktest" :loading="store.loading" block>🚀 运行回测</el-button>
      <div class="bt-hint" v-if="store.selectedScheme">回测取值：{{ backtestHint }}</div>
    </el-form>
    <div class="scheme-box">
      <div class="scheme-title">📁 参数方案</div>
      <div class="scheme-save">
        <el-input v-model="schemeName" size="small" placeholder="方案名称" clearable @keyup.enter="onSave"/>
        <el-button size="small" type="primary" plain @click="onSave">保存方案</el-button>
      </div>
      <div v-if="store.schemes.length" class="scheme-list">
        <div v-for="s in store.schemes" :key="s.name" class="scheme-item" :class="{active:store.selectedScheme===s.name}" @click="store.selectScheme(s.name)">
          <div class="scheme-row">
            <span class="scheme-name">{{ s.name }}</span>
            <el-tag v-if="store.selectedScheme===s.name && store.isSchemeDirty(s)" size="small" type="warning" effect="plain">已偏离当前取值</el-tag>
            <span class="scheme-switch" @click.stop>
              <el-switch :model-value="s.enabled" size="small" inline-prompt active-text="启" inactive-text="停" @change="store.toggleScheme(s.name)"/>
            </span>
          </div>
          <div class="scheme-params">{{ s.params.lowerPrice }} ~ {{ s.params.upperPrice }} · {{ s.params.gridCount }}格 · ¥{{ s.params.capitalPerGrid.toLocaleString() }}/格</div>
        </div>
      </div>
      <div v-else class="scheme-empty">暂无方案，保存当前参数后可快速切换</div>
    </div>
    <div class="grid-info" v-if="store.config.gridCount">
      <div class="info-row"><span>网格间距</span><span>{{ ((store.config.upperPrice-store.config.lowerPrice)/store.config.gridCount).toFixed(2) }}</span></div>
      <div class="info-row"><span>总网格资金</span><span>¥{{ (store.config.gridCount*store.config.capitalPerGrid).toLocaleString() }}</span></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useTradingStore } from '../store/trading'
const store = useTradingStore()
const schemeName = ref('')

const backtestHint = computed(() => {
  const s = store.schemes.find(x => x.name === store.selectedScheme)
  if (!s) return ''
  return s.enabled ? `启用方案「${s.name}」的存储参数` : '输入框当前值（方案已停用）'
})

function onSave() {
  const r = store.saveScheme(schemeName.value)
  if (r.ok) { ElMessage.success(r.message); schemeName.value = '' }
  else ElMessage.error(r.message)
}
</script>
<style scoped>
.panel{background:#0f1535;border-radius:8px;padding:12px;border:1px solid #1e2a5a}
.panel h4{color:#4fc3f7;font-size:13px;margin-bottom:8px}
.bt-hint{margin-top:6px;font-size:11px;color:#94a3b8}
.scheme-box{margin-top:12px;border-top:1px solid #1e2a5a;padding-top:10px}
.scheme-title{font-size:12px;color:#4fc3f7;margin-bottom:8px}
.scheme-save{display:flex;gap:6px}
.scheme-list{margin-top:8px;display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto}
.scheme-item{padding:6px 8px;border:1px solid #1e2a5a;border-radius:6px;cursor:pointer}
.scheme-item:hover{border-color:#4fc3f766}
.scheme-item.active{border-color:#4fc3f7;background:#16204a}
.scheme-row{display:flex;align-items:center;gap:6px}
.scheme-name{font-size:12px;color:#e0e0e0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.scheme-switch{flex-shrink:0}
.scheme-params{margin-top:2px;font-size:11px;color:#94a3b8}
.scheme-empty{margin-top:8px;font-size:11px;color:#64748b}
.grid-info{margin-top:12px;font-size:12px}
.info-row{display:flex;justify-content:space-between;padding:4px 0;color:#94a3b8;border-bottom:1px solid #1e2a5a33}
</style>
