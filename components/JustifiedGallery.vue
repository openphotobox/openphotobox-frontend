<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';

type Img = { src: string; width: number; height: number; alt?: string; [k: string]: any };

const props = defineProps<{
  images: Img[];
  targetRowHeight?: number;
  gap?: number;
  maxScale?: number;
  lastRow?: 'justify' | 'left' | 'hide';
  overscanPx?: number;
  /** selector string or HTMLElement of the external scroller (e.g. '.photo-grid-content') */
  externalScrollEl?: string | HTMLElement | null;
}>();

const emit = defineEmits<{ (e:'item-click', img:Img):void }>();

const targetRowHeight = computed(() => props.targetRowHeight ?? 220);
const gap = computed(() => props.gap ?? 8);
const maxScale = computed(() => props.maxScale ?? 1.7);
const overscanPx = computed(() => props.overscanPx ?? 600);
const lastRow = computed(() => props.lastRow ?? 'left');

const host = ref<HTMLElement|null>(null);
const scroller = ref<HTMLElement|Window|null>(null);
const containerWidth = ref(0);
const viewportTop = ref(0);
const viewportHeight = ref(0);

let ro: ResizeObserver | null = null;

function resolveExternalEl(): HTMLElement | null {
  if (!props.externalScrollEl) return null;
  if (props.externalScrollEl instanceof HTMLElement) return props.externalScrollEl;
  try { return document.querySelector(props.externalScrollEl) as HTMLElement | null; } catch { return null; }
}

function getScrollTop() {
  const el = scroller.value;
  if (!el) return 0;
  if (el === window) {
    // Scroll offset relative to the gallery host (not the page)
    const hostEl = host.value;
    if (!hostEl) return 0;
    const hostPageTop = (hostEl.getBoundingClientRect().top || 0) + window.scrollY;
    return Math.max(0, window.scrollY - hostPageTop);
  }
  return (el as HTMLElement).scrollTop;
}

function getViewportHeight() {
  const el = scroller.value;
  return el === window ? window.innerHeight : ((el as HTMLElement)?.clientHeight ?? 0);
}

function updateMetrics() {
  // Always measure the host element for width (it's inside the padded container)
  // Only use external element for scroll tracking
  if (!host.value) return;
  containerWidth.value = host.value.clientWidth;
  viewportTop.value = getScrollTop();
  viewportHeight.value = getViewportHeight();
}

// ---- layout rows ----
type Row = { boxes:{i:number; w:number; h:number}[]; height:number; top:number; };

const rows = computed<Row[]>(() => {
  let W = containerWidth.value;
  if (!W || !props.images?.length) return [];
  
  // Reduce container width slightly to ensure no overflow
  W = W - 2; // 2px safety margin
  
  const items = props.images.map((im, i) => ({ i, ar: (im.width||1)/(im.height||1) }));
  const out: Row[] = [];
  let row: {i:number; ar:number}[] = [];
  let sumAR = 0;

  const flush = (justify:boolean) => {
    if (!row.length) return;
    const gaps = gap.value*(row.length-1);
    const availableWidth = W - gaps;
    let h = targetRowHeight.value;
    const widthAtTarget = sumAR*h + gaps;
    
    if (justify) {
      const scale = availableWidth / (sumAR*h);
      h = h * Math.min(scale, maxScale.value);
    } else {
      h = Math.min(h, targetRowHeight.value*maxScale.value);
    }
    
    // Calculate boxes
    const boxes = row.map(r => ({ i:r.i, w:r.ar*h, h }));
    
    // Safety check: ensure total width doesn't exceed container
    const totalBoxWidth = boxes.reduce((sum, b) => sum + b.w, 0);
    if (totalBoxWidth > availableWidth) {
      // Scale down proportionally to fit
      const adjustScale = availableWidth / totalBoxWidth;
      boxes.forEach(b => {
        b.w = b.w * adjustScale;
        b.h = b.h * adjustScale;
      });
      h = h * adjustScale;
    }
    
    out.push({ boxes, height:h, top:0 });
    row = []; sumAR = 0;
  };

  for (const it of items) {
    row.push(it); sumAR += it.ar;
    const gaps = gap.value*(row.length-1);
    const widthAtTarget = sumAR*targetRowHeight.value + gaps;
    if (widthAtTarget >= W) flush(true);
  }
  if (row.length) {
    if (lastRow.value === 'justify') flush(true);
    else if (lastRow.value === 'left') flush(false);
  }

  let y = 0;
  for (const r of out) { r.top = y; y += r.height + gap.value; }
  return out;
});

const totalHeight = computed(() => rows.value.length ? rows.value.at(-1)!.top + rows.value.at(-1)!.height : 0);

function findStartIndex(topPx:number) {
  const arr = rows.value;
  let lo = 0, hi = arr.length-1, ans = 0;
  while (lo <= hi) {
    const mid = (lo+hi)>>1;
    if (arr[mid].top + arr[mid].height < topPx) { lo = mid+1; ans = lo; }
    else hi = mid-1;
  }
  return Math.max(0, Math.min(ans, arr.length-1));
}

const windowed = computed(() => {
  const arr = rows.value;
  const startPx = Math.max(0, viewportTop.value - overscanPx.value);
  const endPx = viewportTop.value + viewportHeight.value + overscanPx.value;
  if (!arr.length) return {start:0,end:0,before:0,after:0,slice:[] as Row[]};

  let start = findStartIndex(startPx);
  let end = start;
  while (end < arr.length && arr[end].top < endPx) end++;
  const before = arr[start].top;
  const last = arr[end-1];
  const after = Math.max(0, totalHeight.value - (last.top + last.height));
  return { start, end, before, after, slice: arr.slice(start, end) };
});

function onScroll() { viewportTop.value = getScrollTop(); }
function onResize() { updateMetrics(); }

onMounted(async () => {
  // choose scroll source: external element if provided, else window (page scroll)
  const ext = resolveExternalEl();
  scroller.value = ext ? ext : window;

  // ensure we have dimensions after DOM paints
  await nextTick();
  updateMetrics();

  // resize observers - always observe host for width changes
  ro = new ResizeObserver(updateMetrics);
  if (host.value) ro.observe(host.value);

  // listeners
  const el = scroller.value as any;
  if (el && el.addEventListener) {
    el.addEventListener('scroll', onScroll, { passive:true });
  } else {
    window.addEventListener('scroll', onScroll, { passive:true });
  }
  window.addEventListener('resize', onResize);
});
onBeforeUnmount(() => {
  ro?.disconnect();
  const el = scroller.value as HTMLElement | null;
  el?.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', onResize);
});

// refresh when data or container changes
watch(() => props.images, () => requestAnimationFrame(updateMetrics));
</script>

<template>
  <!-- host is NOT scrollable if you're using an external scroller -->
  <div ref="host" class="jg-host">
    <div class="jg-phantom" :style="{ height: totalHeight + 'px' }">
      <div :style="{ height: windowed.before + 'px' }" />
      <div v-for="row in windowed.slice" :key="row.top" class="jg-row" :style="{ height: row.height + 'px', marginBottom: gap + 'px' }">
        <div
          v-for="(b, idx) in row.boxes"
          :key="images[b.i].src + '-' + b.w"
          class="jg-item"
          :style="{ width: b.w + 'px', height: b.h + 'px', marginRight: (idx < row.boxes.length - 1 ? gap : 0) + 'px' }"
          @click="emit('item-click', images[b.i])"
        >
          <img
            :src="images[b.i].src"
            :alt="images[b.i].alt || ''"
            loading="lazy"
            decoding="async"
            draggable="false"
          />
          <!-- Optional face overlays if provided on image item as normalized x,y,w,h -->
          <div v-if="Array.isArray((images[b.i] as any).faces) && (images[b.i] as any).faces.length" class="jg-overlay">
            <div
              v-for="(f, idx) in (images[b.i] as any).faces"
              :key="idx"
              class="jg-face-box"
              :style="{ left: (f.x*100)+'%', top: (f.y*100)+'%', width: (f.w*100)+'%', height: (f.h*100)+'%' }"
            />
          </div>
        </div>
      </div>
      <div :style="{ height: windowed.after + 'px' }" />
    </div>
  </div>
</template>

<style scoped>
.jg-host { 
  width: 100%; 
  max-width: 100%; 
  box-sizing: border-box; 
  overflow: hidden; 
}
.jg-phantom { 
  position: relative; 
  width: 100%; 
  max-width: 100%; 
  box-sizing: border-box; 
}
.jg-row { 
  white-space: nowrap; 
  font-size: 0; 
  width: 100%;
  max-width: 100%; 
  box-sizing: border-box; 
  overflow: hidden;
}
.jg-item {
  display: inline-block;
  vertical-align: top;
  overflow: hidden;
  border-radius: 8px;
  background: #f2f2f2;
  position: relative;
  flex-shrink: 0;
}
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

.jg-overlay { 
  position: absolute; 
  inset: 0; 
  pointer-events: none; 
}
.jg-face-box {
  position: absolute;
  border: 2px solid #4CAF50;
  box-shadow: 0 0 4px rgba(76, 175, 80, 0.6);
  border-radius: 2px;
}
</style>
