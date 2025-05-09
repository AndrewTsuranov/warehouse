import { onMounted, onUnmounted } from "vue";

export function useEventListener(target, event, callback) {
  // если вы хотите, вы также можете сделать так, чтобы
  // это поддерживало строки селектора в качестве цели
  onMounted(() => target.addEventListener(event, callback));
  onUnmounted(() => target.removeEventListener(event, callback));
}
