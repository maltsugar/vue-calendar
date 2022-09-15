<template>
  <div id="app">
    <Calendar
      selectionType="week"
      :initData="calendarInfo"
      @didSelectedDate="canlendarHandle"
    />
  </div>
</template>

<script>
import Calendar from "@/components/Calendar.vue";

export default {
  name: "App",
  components: {
    Calendar,
  },
  data() {
    return {
      calendarInfo: {
        selectedDateInfos: [],
        rangeStart: "",
        rangeEnd: "",
      },
    };
  },

  methods: {
    // 和calendarInfo一样
    canlendarHandle(dateInfo, actionType) {
      console.log("dateInfo", dateInfo);
      console.log("actionType", actionType);
    },
  },
};
</script>

<style></style>
