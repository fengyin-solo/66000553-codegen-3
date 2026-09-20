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

      <div class="scheme-save">
        <el-input v-model="schemeName" size="small" placeholder="方案名称" maxlength="20" @keyup.enter="onSaveScheme" />
        <el-button type="success" size="small" plain @click="onSaveScheme">💾 保存方案</el-button>
      </div>

      <div class="scheme-list">
        <div
          v-for="s in store.schemes"
          :key="s.id"
          class="scheme-item"
          :class="{ selected: s.id === store.selectedSchemeId, disabled: !s.enabled, dirty: s.id === store.selectedSchemeId && store.selectedDirty }"
          @click="store.selectScheme(s.id)"
        >
          <div class="scheme-head">
            <span class="scheme-name" :title="s.name">
              <span v-if="s.id === store.selectedSchemeId" class="dot-selected">●</span>
              {{ s.name }}
            </span>
            <el-switch
              :model-value="s.enabled"
              inline-prompt
              active-text="用"
              inactive-text="停"
              @click.stop
              @change="store.toggleScheme(s.id)"
            />
          </div>
          <div class="scheme-params">
            下限 {{ s.lowerPrice }} / 上限 {{ s.upperPrice }} / {{ s.gridCount }} 格 / ¥{{ s.capitalPerGrid.toLocaleString() }}
          </div>
          <div class="scheme-tags">
            <el-tag v-if="s.id === store.selectedSchemeId && store.selectedDirty" size="small" type="warning">参数已修改，与方案对不上</el-tag>
            <el-tag v-if="!s.enabled" size="small" type="info">已停用（回测不取值）</el-tag>
          </div>
        </div>
        <div v-if="store.schemes.length === 0" class="scheme-empty">暂无方案，填好参数后输入名称即可保存</div>
      </div>

      <el-button class="run-btn" type="primary" @click="store.runBacktest" :loading="store.loading" block>🚀 运行回测</el-button>
    </el-form>
    <div class="grid-info" v-if="store.config.gridCount">
      <div class="info-row"><span>网格间距</span><span>{{ ((store.config.upperPrice-store.config.lowerPrice)/store.config.gridCount).toFixed(2) }}</span></div>
      <div class="info-row"><span>总网格资金</span><span>¥{{ (store.config.gridCount*store.config.capitalPerGrid).toLocaleString() }}</span></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useTradingStore } from '../store/trading'
const store = useTradingStore()

// 选中/保存方案后，保存框默认带出当前方案名，方便同名覆盖
const schemeName = ref(store.selectedScheme?.name ?? '')
watch(() => store.selectedScheme, (s) => { schemeName.value = s?.name ?? '' })

function onSaveScheme() {
  const result = store.saveScheme(schemeName.value)
  if (result.ok) {
    ElMessage.success(result.message)
    schemeName.value = store.selectedScheme?.name ?? ''
  } else {
    ElMessage.error(result.message)
  }
}
</script>
<style scoped>
.panel{background:#0f1535;border-radius:8px;padding:12px;border:1px solid #1e2a5a}
.panel h4{color:#4fc3f7;font-size:13px;margin-bottom:8px}
.grid-info{margin-top:12px;font-size:12px}
.info-row{display:flex;justify-content:space-between;padding:4px 0;color:#94a3b8;border-bottom:1px solid #1e2a5a33}
.scheme-save{display:flex;gap:6px;margin:2px 0 8px}
.scheme-list{display:flex;flex-direction:column;gap:6px;margin-bottom:10px;max-height:230px;overflow-y:auto}
.scheme-item{background:#141d45;border:1px solid #1e2a5a;border-radius:6px;padding:6px 8px;cursor:pointer;transition:border-color .15s}
.scheme-item:hover{border-color:#4fc3f7}
.scheme-item.selected{border-color:#4fc3f7;box-shadow:0 0 0 1px rgba(79,195,247,.35) inset}
.scheme-item.dirty{border-color:#e6a23c}
.scheme-item.disabled{opacity:.65}
.scheme-head{display:flex;justify-content:space-between;align-items:center;gap:6px}
.scheme-name{font-size:12px;color:#e2e8f0;display:flex;align-items:center;gap:4px;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dot-selected{color:#4fc3f7;font-size:8px}
.scheme-item.disabled .scheme-name{color:#94a3b8}
.scheme-params{font-size:11px;color:#94a3b8;margin-top:3px}
.scheme-tags{margin-top:4px;display:flex;flex-wrap:wrap;gap:4px}
.scheme-empty{font-size:11px;color:#64748b;text-align:center;padding:10px 0;border:1px dashed #1e2a5a;border-radius:6px}
.run-btn{margin-top:2px}
:deep(.el-input-number){width:100%}
</style>