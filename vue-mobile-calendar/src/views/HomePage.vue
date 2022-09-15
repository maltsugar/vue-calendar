<template>
  <Calendar
    :selectionType="CalendarSelectionType.week"
    :initData="calendarData"
    @didSelectedDate="canlendarHandle"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import Calendar, { CalendarSelectionType } from "@/components/Calendar.vue";
import type { CalendarSharedData } from "@/components/Calendar.vue";

const calendarData = ref({
  selectedDateInfos: ["2022-09-10"],
  rangeStart: "",
  rangeEnd: "",
});

const canlendarHandle = (
  clddata: CalendarSharedData,
  type: CalendarSelectionType
) => {
  console.log("clddata", clddata);
  console.log("type", type);
};
</script>
