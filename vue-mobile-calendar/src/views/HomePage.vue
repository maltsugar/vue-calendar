<template>
  <Calendar :selectionType="CalendarSelectionType.range" />
</template>

<script setup lang="ts">
import Calendar, { CalendarSelectionType } from "@/components/Calendar.vue";
</script>
