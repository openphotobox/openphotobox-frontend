<template>
  <div ref="container" class="jg-container">
    <!-- We render items in the same order; boxes[] holds the sized geometry -->
    <div class="jg-rowwrap">
      <template v-for="(b, k) in boxes" :key="k">
        <div class="jg-item" :style="styleFor(b)" @click="$emit('item-click', images[b.i])">
          <img
            :src="images[b.i].src"
            :alt="images[b.i].alt ?? ''"
            loading="lazy"
            decoding="async"
            draggable="false"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';

type ImgItem = {
  src: string;
  width: number;   // natural width  (or any known width)
  height: number;  // natural height (or any known height)
  alt?: string;
  id?: string | number;
  [key: string]: any; // Allow additional properties
};

const props = defineProps<{
  images: ImgItem[];
  targetRowHeight?: number; // preferred row height before scaling
  gap?: number;             // px gap between items
  maxScale?: number;        // cap stretching when a row is too "short"
  lastRow?: 'justify' | 'left' | 'hide'; // how to treat the last row
}>();

const emit = defineEmits<{
  'item-click': [item: ImgItem]
}>();

const container = ref<HTMLElement | null>(null);
const width = ref(0);

// defaults
const targetRowHeight = computed(() => props.targetRowHeight ?? 220);
const gap = computed(() => props.gap ?? 8);
const maxScale = computed(() => props.maxScale ?? 1.7);
const lastRowMode = computed(() => props.lastRow ?? 'left');

let ro: ResizeObserver | null = null;
const updateWidth = () => {
  if (!container.value) return;
  const cs = getComputedStyle(container.value);
  const pad =
    parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  width.value = Math.max(0, container.value.clientWidth - pad);
};

onMounted(() => {
  updateWidth();
  ro = new ResizeObserver(() => updateWidth());
  if (container.value) ro.observe(container.value);
});
onBeforeUnmount(() => ro?.disconnect());

/**
 * Core layout algorithm (justified rows).
 * Returns boxes with exact width/height for rendering.
 */
const boxes = computed(() => {
  const W = width.value;
  if (!W || !props.images?.length) return [];

  const items = props.images.map((im) => ({
    ...im,
    ar: im.width / im.height || 1,
  }));

  const out: Array<{
    i: number; // index in original array
    w: number;
    h: number;
  }> = [];

  let row: { i: number; ar: number }[] = [];
  let rowARsum = 0;

  const pushRow = (justify: boolean) => {
    if (row.length === 0) return;

    const gaps = gap.value * (row.length - 1);
    let h = targetRowHeight.value;
    let rowWidthAtTarget = rowARsum * h + gaps;

    if (justify && rowWidthAtTarget !== W) {
      // scale row height so summed widths match container width
      const scale = (W - gaps) / (rowARsum * h);
      h = h * Math.min(scale, maxScale.value);
    }

    // If not justifying (last row 'left'), keep targetRowHeight (or capped)
    // but never exceed maxScale relative to target.
    if (!justify) {
      h = Math.min(h, targetRowHeight.value * maxScale.value);
    }

    // Emit boxes
    for (const r of row) {
      out.push({
        i: r.i,
        w: r.ar * h,
        h,
      });
    }

    // reset
    row = [];
    rowARsum = 0;
  };

  for (let i = 0; i < items.length; i++) {
    const ar = items[i].ar || 1;
    row.push({ i, ar });
    rowARsum += ar;

    const gaps = gap.value * (row.length - 1);
    const rowWidthAtTarget = rowARsum * targetRowHeight.value + gaps;

    if (rowWidthAtTarget >= W && row.length > 0) {
      // Close & justify this row
      pushRow(true);
    }
  }

  // Handle last row
  if (row.length) {
    if (lastRowMode.value === 'justify') {
      pushRow(true);
    } else if (lastRowMode.value === 'left') {
      pushRow(false);
    } else if (lastRowMode.value === 'hide') {
      // drop it
    }
  }

  return out;
});

// Inline style helpers
const styleFor = (box: { w: number; h: number }) => ({
  width: `${box.w}px`,
  height: `${box.h}px`,
  marginRight: `${gap.value}px`,
  marginBottom: `${gap.value}px`,
});
</script>

<style scoped>
.jg-container {
  width: 100%;
  padding: 0;
  box-sizing: border-box;
}

/* We let items wrap onto new "rows" using inline-block + whitespace tricks */
.jg-rowwrap {
  font-size: 0; /* kill inline-block gaps */
}

.jg-item {
  display: inline-block;
  vertical-align: top;
  overflow: hidden;
  border-radius: 8px;
  background: #f2f2f2;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.jg-item:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

/* Images fill the computed box while preserving aspect ratio; no crop needed */
.jg-item > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
  -webkit-user-drag: none;
  transition: transform 120ms ease;
}

.jg-item:hover > img {
  transform: scale(1.02);
}

/* Dark theme adjustments */
:deep(.v-theme--dark) .jg-item {
  background: #2a2a2a;
}
</style>
