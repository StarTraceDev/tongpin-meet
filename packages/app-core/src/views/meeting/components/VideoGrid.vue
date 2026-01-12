<script setup lang="ts">
import { computed } from 'vue'

import type { MeetingParticipant } from '../../../stores/participants'
import type { LayoutMode } from '../composables/useMeetingLayout'
import ParticipantTile from './ParticipantTile.vue'

const props = defineProps<{
  participants: MeetingParticipant[]
  layout: LayoutMode
}>()

/** 宫格最多 9 格：8 个真实瓦片 + 1 个「还有 N 人」 */
const GRID_MAX = 9
/** 侧栏/顶栏最多露 6 个成员，超出折进「还有 N 人」 */
const STRIP_MAX = 6
/** L 型：顶/底 5 个 + 侧边 2 个 */
const L_STRIP_MAX = 5
const L_SIDE_MAX = 2

/** 主位：优先正在说话的人，否则第一个（自己通常排在最前） */
const main = computed<MeetingParticipant | null>(
  () => props.participants.find((item) => item.speaking) ?? props.participants[0] ?? null,
)

const rest = computed<MeetingParticipant[]>(() =>
  main.value === null
    ? props.participants
    : props.participants.filter((item) => item.id !== main.value?.id),
)

function take(list: MeetingParticipant[], max: number): MeetingParticipant[] {
  return list.slice(0, max)
}

function overflow(list: MeetingParticipant[], shown: number): number {
  return Math.max(list.length - shown, 0)
}

const gridTiles = computed<MeetingParticipant[]>(() => take(props.participants, GRID_MAX - 1))
const gridMore = computed<number>(() => overflow(props.participants, GRID_MAX - 1))

const sideTiles = computed<MeetingParticipant[]>(() => take(rest.value, STRIP_MAX))
const sideMore = computed<number>(() => overflow(rest.value, STRIP_MAX))

const lStripTiles = computed<MeetingParticipant[]>(() => take(rest.value, L_STRIP_MAX))
const lSideTiles = computed<MeetingParticipant[]>(() =>
  take(rest.value.slice(L_STRIP_MAX), L_SIDE_MAX),
)
const lMore = computed<number>(() => overflow(rest.value, L_STRIP_MAX + L_SIDE_MAX))
</script>

<template>
  <div class="vg" :class="`vg-${layout}`">
    <template v-if="layout === 'solo'">
      <ParticipantTile
        v-if="participants[0] !== undefined"
        :participant="participants[0]"
        variant="stage"
      />
    </template>

    <template v-else-if="layout === 'grid9'">
      <div class="grid9">
        <ParticipantTile
          v-for="tile in gridTiles"
          :key="tile.id"
          :participant="tile"
          variant="grid"
        />
        <div v-if="gridMore > 0" class="gtile more">
          <span class="more-n">还有 {{ gridMore }} 人</span>
        </div>
      </div>
    </template>

    <template v-else-if="layout === 'speakerRight'">
      <div class="stage-main">
        <ParticipantTile v-if="main !== null" :participant="main" variant="stage" />
      </div>
      <div class="strip side">
        <ParticipantTile
          v-for="tile in sideTiles"
          :key="tile.id"
          :participant="tile"
          variant="grid"
        />
        <div v-if="sideMore > 0" class="gtile more">
          <span class="more-n">还有 {{ sideMore }} 人</span>
        </div>
      </div>
    </template>

    <template v-else-if="layout === 'speakerTop'">
      <div class="strip top">
        <ParticipantTile
          v-for="tile in sideTiles"
          :key="tile.id"
          :participant="tile"
          variant="grid"
        />
        <div v-if="sideMore > 0" class="gtile more">
          <span class="more-n">还有 {{ sideMore }} 人</span>
        </div>
      </div>
      <div class="stage-main">
        <ParticipantTile v-if="main !== null" :participant="main" variant="stage" />
      </div>
    </template>

    <template v-else>
      <div v-if="layout === 'layoutLTop'" class="strip top">
        <ParticipantTile
          v-for="tile in lStripTiles"
          :key="tile.id"
          :participant="tile"
          variant="grid"
        />
      </div>
      <div class="l-body">
        <div class="stage-main">
          <ParticipantTile v-if="main !== null" :participant="main" variant="stage" />
        </div>
        <div class="strip side">
          <ParticipantTile
            v-for="tile in lSideTiles"
            :key="tile.id"
            :participant="tile"
            variant="grid"
          />
          <div v-if="lMore > 0" class="gtile more">
            <span class="more-n">还有 {{ lMore }} 人</span>
          </div>
        </div>
      </div>
      <div v-if="layout === 'layoutLBottom'" class="strip bottom">
        <ParticipantTile
          v-for="tile in lStripTiles"
          :key="tile.id"
          :participant="tile"
          variant="grid"
        />
      </div>
    </template>
  </div>
</template>
