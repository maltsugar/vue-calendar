<template>
  <section class="demo">
    <p>日期选取类型</p>
    <ul class="type-wrapper">
      <li
        class="btn"
        v-for="(item, index) in typeBtns"
        :key="index"
        :class="{ actived: index == curTypeIdx }"
        @click="onTypeClick(index)"
      >
        {{ item }}
      </li>
    </ul>
    <div class="week-order">
      <p>第一列显示周序：</p>
      <input type="checkbox" id="checkbox" v-model="showWeekOrder" />
      <label for="checkbox">显示周序</label>
    </div>
    <div class="week-title">
      <p>自定义周开始日期</p>
      <ul class="week-idx-wrapper">
        <li
          v-for="(item, index) in weekTitlesConfig"
          :key="index"
          @click="handleCellClick(index)"
        >
          <span v-if="item.selected">❤️</span>
          {{ item.content.join("、") }}
        </li>
      </ul>
    </div>
  </section>
  <Calendar
    :weekIndexTitle="weekIndexTitle"
    :weekStartDay="weekStartDay"
    :weekTitles="weekTitles"
    :maxDate="calendarMaxDate"
    :selectionType="dateSelectType"
    :selectedDateInfo="selectedDateInfo"
    :selectedDateInfoArr="selectedDateInfoArr"
    :rangeStart="rangeStart"
    :rangeEnd="rangeEnd"
    :weekRangeStart="weekRangeStart"
    :weekRangeEnd="weekRangeEnd"
    @didSelectedDate="canlendarHandle"
  />
</template>

<script lang="ts">
import dayjs from "dayjs";
</script>

<script setup lang="ts">
import { ref, computed } from "vue";
import Calendar, { CalendarSelectionType } from "@/components/Calendar.vue";
import type { CalendarInfoData } from "@/components/Calendar.vue";

// demo
const typeBtns = ref(["单选", "多选", "范围", "按周"]);
const curTypeIdx = ref(0);

const weekTitlesConfig = ref([
  {
    startIdx: 0,
    content: ["日", "一", "二", "三", "四", "五", "六"],
    selected: true,
  },
  {
    startIdx: 1,
    content: ["一", "二", "三", "四", "五", "六", "日"],
  },
  {
    startIdx: 0,
    content: ["Sun", "Mon", "Tus", "Wed", "Thr", "Fri", "Sat"],
  },
  {
    startIdx: 1,
    content: ["Mon", "Tus", "Wed", "Thr", "Fri", "Sat", "Sun"],
  },
]);
const showWeekOrder = ref(true);

// const calendarMaxDate = ref("2023-12-31");
const calendarMaxDate = ref(dayjs("2025-01-01"));

// calendar default data
const selectedDateInfo = ref("2022-09-15");
const selectedDateInfoArr = ref(["2022-09-13", "2022-09-02", "2022-09-22"]);
const rangeStart = ref("2022-09-05");
const rangeEnd = ref("2022-09-22");
const weekRangeStart = ref("2022-09-11");
const weekRangeEnd = ref("2022-09-17");

const dateSelectType = ref(CalendarSelectionType.single);
const weekStartDay = ref(0);
const weekTitles = ref(weekTitlesConfig.value[0].content);
const weekIndexTitle = computed(() => {
  let t = "";
  if (showWeekOrder.value) {
    t = "周";
  }
  return t;
});

const canlendarHandle = (
  clddata: CalendarInfoData,
  type: CalendarSelectionType
) => {
  console.log("clddata", clddata);
  console.log("type", type);
};

function onTypeClick(idx: number) {
  curTypeIdx.value = idx;

  dateSelectType.value = curTypeIdx.value;
}

function handleCellClick(idx: number) {
  for (let index = 0; index < weekTitlesConfig.value.length; index++) {
    const item = weekTitlesConfig.value[index];
    item.selected = false;
    if (idx == index) {
      item.selected = true;
      weekStartDay.value = item.startIdx;
      weekTitles.value = item.content;
    }
  }
}
</script>

<style lang="scss" scoped>
.demo {
  height: 220px;
  padding: 10px;
  background-color: #f9f4dc;
  p {
    font-size: 14px;
    font-weight: bold;
  }

  .btn {
    display: block;
    width: 60px;
    height: 20px;
    line-height: 20px;
    text-align: center;
    border: 1px solid orchid;
    border-radius: 10px;
    color: #999;

    &.actived {
      background-color: #ef6f48;
      color: #000;
    }
  }

  .type-wrapper {
    display: flex;
    justify-content: space-around;
  }

  .week-order {
    display: flex;
    align-items: center;
    input {
      height: 20px;
      width: 20px;
    }
  }

  .week-title {
    li {
      height: 30px;
      line-height: 30px;
      border-bottom: 1px solid #ccc;
      padding-left: 30px;
      position: relative;
      span {
        position: absolute;
        left: 5px;
      }
    }
  }
}
</style>
