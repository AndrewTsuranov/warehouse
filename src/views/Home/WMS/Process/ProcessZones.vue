<script setup>
import { useWarehouseStore } from "@/stores/WMSStores/WarehouseStore.js";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import gsap from "gsap";
import { useWebSocketStore } from "@/stores/WebSocketStore.js";
import { storeToRefs } from "pinia";

const router = useRouter();
const route = useRoute();
const webSocketStore = useWebSocketStore();
const warehouseStore = useWarehouseStore();
const selectedPackingZone = ref(null);
const animatedTotalArea = ref(0);
const animatedOccupiedArea = ref(0);
const animatedCapacityPercentage = ref(0);
const isLoading = ref(false);
// Анимация total_area
const animateTotalArea = (newValue) => {
  gsap.killTweensOf(animatedTotalArea); // Очищаем предыдущие анимации
  animatedTotalArea.value = 0; // Сбрасываем значение
  gsap.to(animatedTotalArea, {
    duration: .5,
    value: Number(newValue.total_area) || 0
  });
};
// Анимация occupied_area
const animateOccupiedArea = (newValue) => {
  gsap.killTweensOf(animatedOccupiedArea); // Очищаем предыдущие анимации
  animatedOccupiedArea.value = 0; // Сбрасываем значение
  gsap.to(animatedOccupiedArea, {
    duration: .5,
    value: Number(newValue.occupied_area) || 0
  });
};
// Анимация occupancy_percentage
const animateCapacityPercentage = (newValue) => {
  gsap.killTweensOf(animatedCapacityPercentage); // Очищаем предыдущие анимации
  animatedCapacityPercentage.value = 0; // Сбрасываем значение
  gsap.to(animatedCapacityPercentage, {
    duration: .5,
    value: Number(newValue.occupancy_percentage) || 0
  });
};
//Обработка select выбранной зоны
const handleZoneChange = async (zone) => {
  if (!zone || !zone.id) {
    console.warn("Зона не выбрана или отсутствует ID зоны");
    return; // Прерываем выполнение, если zone отсутствует или не имеет id
  }
  // Инициализируем соединение только если оно еще не инициализировано
  await webSocketStore.ensureConnected();
  await webSocketStore.GET_WAREHOUSE_ZONE_STATISTICS(warehouseStore.selectedWarehouse.id, zone.id, true);
  if (route.name === "wmsStorageZone") {
    await webSocketStore.GET_LOCATIONS_BASE(
      warehouseStore.selectedWarehouse.id,
      zone.id,
      null,
      true,
      null
    );
  }
  await warehouseStore.setSelectedZonesByZoneType(zone);
  await router.push({
    params: {
      idWarehouse: route.params.idWarehouse,
      code: zone.code.toLowerCase()
    }
  });
};
// Отслеживание изменений selectedPackingZone
watch(selectedPackingZone, (newValue) => {
  //Очищаем данные
  warehouseStore.clearZoneDetailedData();
  if (newValue && newValue.total_area !== undefined && newValue.occupied_area !== undefined) {
    animateTotalArea(newValue);
    animateOccupiedArea(newValue);
    animateCapacityPercentage(newValue);
  } else {
    animatedTotalArea.value = 0;
    animatedOccupiedArea.value = 0;
    animatedCapacityPercentage.value = 0;
  }
}, { immediate: true });
onMounted(async () => {
  isLoading.value = true;
  await warehouseStore.clearZoneDetailedData();
  try {
    if (warehouseStore.zonesByZoneType?.length) {
      selectedPackingZone.value = warehouseStore.zonesByZoneType[0];
      await handleZoneChange(selectedPackingZone.value);
    } else {
      console.warn("Список зон пуст");
    }
  } catch (e) {
    console.error("Ошибка при инициализации зон:", e);
  } finally {
    isLoading.value = false;
  }
});
onUnmounted(() => {
  selectedPackingZone.value = null;
});
</script>
<template>
  <div class="wms-zone-container">
    <div v-if="warehouseStore.zonesByZoneType?.length && warehouseStore.selectedZonesByZoneType"
         class="wms-zone-select">
      <select id="selectZone"
              v-model="selectedPackingZone"
              aria-label="Выберите зону"
              class="form-select"
              data-bs-theme="dark"
              @change="handleZoneChange(selectedPackingZone)"
      >
        <option :value="null" disabled>Выберите зону</option>
        <option v-for="zone in warehouseStore.zonesByZoneType"
                :key="zone.id"
                :value="zone"
        >
          {{ zone.name.replace(/_/g, " ").toUpperCase() }}
        </option>
      </select>
    </div>
    <div v-else>
      Загрузка зон...
    </div>
    <div class="wms-zone-info">
      <div class="wms-zone-name"
      >
        {{ selectedPackingZone?.name ? selectedPackingZone.name.replace(/_/g, " ") : "Выберите зону" }}
      </div>
      <div class="wms-zone-detail">
        <div class="wms-zone-detail-item">
          <div class="wms-zone-detail-item--item-name">Общая площадь:</div>
          <div class="wms-zone-detail-item--item-value">
            {{ animatedTotalArea.toFixed(0) }}
            <span style="font-size:1.5rem">м<sup>2</sup></span>
          </div>
        </div>
        <div class="wms-zone-detail-item">
          <div class="wms-zone-detail-item--item-name"> Занято:</div>
          <div class="wms-zone-detail-item--item-value">
            {{ animatedOccupiedArea.toFixed(2) }}
            <span style="font-size:1.5rem">м<sup>2</sup></span></div>
        </div>
        <div class="wms-zone-detail-item">
          <div class="wms-zone-detail-item--item-name">Загруженность:</div>
          <div :class="{
            partially: selectedPackingZone?.status === 'PARTIALLY',
            available: selectedPackingZone?.status === 'AVAILABLE',
            occupied: selectedPackingZone?.status === 'OCCUPIED'
          }"
               class="wms-zone-detail-item--item-value"
          >
            {{ animatedCapacityPercentage.toFixed(1) }}
            <span style="font-size: 1.5rem">%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.wms-zone-container {
  display: grid;
  grid-template-columns: max-content minmax(auto, 1fr);
  column-gap: 5rem;
  padding-bottom: 2rem;
}

.wms-zone-info {
  display: grid;
  grid-template-columns: minmax(auto, 1fr);
  grid-template-rows: auto auto;
  row-gap: 1rem;
}

.wms-zone-name {
  display: grid;
  align-items: center;
  background-color: #2e2e2e;
  border: 1px solid #605039e0;
  border-radius: 10px;
  padding: .5rem 1rem;
  text-transform: uppercase;
  font-size: 1.5rem;
}

.wms-zone-detail {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto;
  column-gap: 1.5rem;
}

.wms-zone-detail-item {
  display: grid;
  grid-template-columns: minmax(auto, 1fr);
  grid-template-rows: min-content auto;
  place-items: center;
  background-color: #0000004a;
  border: 1px solid #605039e0;
  border-radius: 10px;
}

.wms-zone-detail-item--item-name {
  padding: .3rem 0;
  font-size: 1.2rem;
}

.wms-zone-detail-item--item-value {
  font-size: 2.8rem;
}

.wms-zone-detail-item--item-value.partially {
  color: #ecaf0e;
}

.wms-zone-detail-item--item-value.available {
  color: #4CAF50;
}

.wms-zone-detail-item--item-value.occupied {
  color: #e80f0f;
}

@media (max-width: 800px) {

}
</style>