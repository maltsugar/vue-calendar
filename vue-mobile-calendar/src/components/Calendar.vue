<template>
  <div class="calendar-page">
    <div class="tool-base">
      <div class="left">
        <img
          class="q-btn"
          src="@/assets/img/cal_db_leftarrow.png"
          alt=""
          @click="handleChangBtnAction(-2)"
        />
        <img
          class="q-btn"
          src="@/assets/img/cal_leftarrow.png"
          alt=""
          @click="handleChangBtnAction(-1)"
        />
      </div>
      <div class="mid">{{ curTitle }}</div>
      <div class="right">
        <img
          class="q-btn"
          src="@/assets/img/cal_rightarrow.png"
          alt=""
          @click="handleChangBtnAction(1)"
        />
        <img
          class="q-btn"
          src="@/assets/img/cal_db_rightarrow.png"
          alt=""
          @click="handleChangBtnAction(2)"
        />
      </div>
    </div>
    <div class="week-header">
      <div
        v-for="(t, idx) in weekHeaders"
        :key="idx"
        :class="showWeekIdx && idx == 0 ? 'weekIdx' : 'h-item'"
      >
        {{ t }}
      </div>
    </div>
    <div
      class="base"
      ref="base"
      @touchstart="touchstart"
      @touchmove="touchmove"
      @touchend="touchend"
    >
      <div
        class="calendar-wrapper c-grid"
        :style="{ transform: `translate3d(${-translateX * 100}%, 0, 0)` }"
      >
        <div
          v-for="(month, midx) in dataArr"
          :key="midx"
          class="c-grid month-base"
          :style="{
            transform: `translate3d(${
              (midx - 1 + translateX + (isTouching ? touch.x : 0)) * 100
            }%, 0, 0)`,
            transitionDuration: isTouching ? '0s' : '.3s',
          }"
        >
          <div
            class="week-base"
            v-for="(week, widx) in month"
            :key="widx"
            :class="{
              rangeSelectionType: [
                CalendarSelectionType.range,
                CalendarSelectionType.week,
              ].includes(selectionType),
              weekIdxSelectionType:
                selectionType == CalendarSelectionType.week && showWeekIdx,
            }"
          >
            <div
              class="weekIdx"
              v-if="showWeekIdx"
              :class="{ selected: week.isSelected }"
              @click="handleWeekIdxClick(week)"
            >
              {{ week.weekIdx }}
            </div>
            <div
              v-for="(day, didx) in week.days"
              :key="didx"
              class="day-base"
              :class="{
                selected: day.isSelected,
                rangeStart: day.isRangeStart,
                rangeEnd: day.isRangeEnd,
                gray: day.isGray,
                today: day.isToday,
              }"
              @click="handleDayClick(day, week)"
            >
              <span class="day-num">
                {{ day.orign.date() }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);
import * as calendarTools from "@/helper/calendarTools";

export enum CalendarSelectionType {
  single = 0,
  multiple,
  range,
  week,
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

interface CalendarSharedData {
  selectedDateInfos: string[];
}

interface Props {
  weekStartDay?: number; // 一周开始星期， 0为周日
  weekIndexTitle?: string; // 周序号标题，不写 则不显示
  weekTitles?: Array<string>;
  selectionType?: CalendarSelectionType; // 日期选择类型
  sharedData?: CalendarSharedData;
}

let touchStartX: number;
let touchStartY: number;

const props = withDefaults(defineProps<Props>(), {
  weekStartDay: 1,
  weekIndexTitle: "周",
  weekTitles: () => ["一", "二", "三", "四", "五", "六", "日"],
  selectionType: CalendarSelectionType.single,
});

// reactive data
const base = ref<HTMLElement | null>(null);
const translateX = ref(0);
const touch = ref({
  x: 0,
  y: 0,
});
const isTouching = ref(false);

let curDate = ref(dayjs());
let month0 = ref<calendarTools.WeekConfig[]>([]); // 当前显示月
let monthA = ref<calendarTools.WeekConfig[]>([]); // 当前显示月上一月
let monthB = ref<calendarTools.WeekConfig[]>([]); // 当前显示月下一月

// 选择的日期
let selectedDateInfos = ref<string[]>([]);
let rangeStart = ref<string | null>("");
let rangeEnd = ref<string | null>("");

const dataArr = computed(() => [monthA.value, month0.value, monthB.value]);
const showWeekIdx = computed(() => {
  let flag = false;
  if (props.weekIndexTitle) {
    flag = props.weekIndexTitle.length > 0;
  }
  return flag;
});
const weekHeaders = computed(() => {
  if (props.weekIndexTitle) {
    return [props.weekIndexTitle, ...props.weekTitles];
  }
  return props.weekTitles;
});

const curTitle = computed(() => {
  let date = curDate.value;
  let fmt = "YYYY年MM月";
  return date.format(fmt);
});

// 快捷切换日期
function handleChangBtnAction(val: number) {
  if (Math.abs(val) == 1) {
    // 切月份
    change(val);
  }
  if (Math.abs(val) == 2) {
    // 切年份
    if (val < 0) {
      // 向过去切 =  右滑
      curDate.value = curDate.value.add(-1, "year");
    } else {
      // 向未来切 =  左滑
      curDate.value = curDate.value.add(1, "year");
    }
    reloadCalendarData();
  }
}

// 日期点击事件
function handleDayClick(
  day: calendarTools.DayConfig,
  week: calendarTools.WeekConfig
) {
  if (day.isGray) {
    return;
  }

  if (props.selectionType == CalendarSelectionType.single) {
    selectedDateInfos.value.length = 0;
    selectedDateInfos.value.push(day.dateInfo);
  } else if (props.selectionType == CalendarSelectionType.multiple) {
    if (!selectedDateInfos.value.includes(day.dateInfo)) {
      selectedDateInfos.value.push(day.dateInfo);
    }
  } else if (props.selectionType == CalendarSelectionType.range) {
    if (rangeStart.value && rangeEnd.value) {
      // 两个都选了  重新选择开始的
      rangeEnd.value = null;
      rangeStart.value = day.dateInfo;
    } else {
      if (rangeStart.value) {
        if (day.orign.isBefore(dayjs(rangeStart.value), "day")) {
          // 第二次选的 是否小于 第一次的
          rangeEnd.value = rangeStart.value;
          rangeStart.value = day.dateInfo;
        } else {
          rangeEnd.value = day.dateInfo;
        }
      } else {
        rangeStart.value = day.dateInfo;
      }
    }
  } else if (props.selectionType == CalendarSelectionType.week) {
    handleWeekIdxClick(week, false);
  }

  checkSelectedDate(month0.value);
}

function handleWeekIdxClick(week: calendarTools.WeekConfig, reload = true) {
  if (props.selectionType == CalendarSelectionType.week) {
    rangeStart.value = null;
    rangeEnd.value = null;
    let start = week.days[0];
    let end = week.days[week.days.length - 1];
    rangeStart.value = start.dateInfo;
    rangeEnd.value = end.dateInfo;
  }
  if (reload) {
    checkSelectedDate(month0.value);
  }
}

const touchstart = (event: TouchEvent) => {
  let _etouch = event.touches[0];
  touchStartX = _etouch.clientX;
  touchStartY = _etouch.clientY;
  touch.value = { x: 0, y: 0 };
  isTouching.value = true;
};
const touchmove = (event: TouchEvent) => {
  let _etouch = event.touches[0];
  touch.value.x =
    (_etouch.clientX - touchStartX) / (base.value?.offsetWidth ?? 1);
  touch.value.y =
    (_etouch.clientY - touchStartY) / (base.value?.offsetHeight ?? 1);
  // console.log("x", _etouch.clientX)
  // console.log(JSON.stringify(touch.value))
};
const touchend = () => {
  isTouching.value = false;
  if (Math.abs(touch.value.x) > 0.4) {
    if (touch.value.x > 0) {
      // console.log("右滑")
      change(-1);
    } else if (touch.value.x < 0) {
      // console.log("左滑")
      change(1);
    }
  } else {
    touch.value = {
      x: 0,
      y: 0,
    };
  }
};

const change = (type: number) => {
  translateX.value -= type;
  curDate.value = curDate.value.add(type, "month");
  reloadCalendarData();
};

const reloadCalendarData = () => {
  let _dateA = curDate.value.add(-1, "month");
  let _dateB = curDate.value.add(1, "month");

  monthA.value = calendarTools.getFullMonthDaysInDate(
    _dateA,
    props.weekStartDay
  );
  month0.value = calendarTools.getFullMonthDaysInDate(
    curDate.value,
    props.weekStartDay
  );
  monthB.value = calendarTools.getFullMonthDaysInDate(
    _dateB,
    props.weekStartDay
  );

  checkSelectedDate(month0.value);
  checkSelectedDate(monthA.value);
  checkSelectedDate(monthB.value);
};

const checkSelectedDate = (monthArr: calendarTools.WeekConfig[]) => {
  if (
    [CalendarSelectionType.range, CalendarSelectionType.week].includes(
      props.selectionType
    )
  ) {
    // 重置所有选中状态
    for (const week of monthArr) {
      week.isSelected = false;
      for (const day of week.days) {
        day.isSelected = false;
        day.isRangeStart = false;
        day.isRangeEnd = false;
      }
    }

    if (rangeStart.value) {
      let start = dayjs(rangeStart.value);
      for (const week of monthArr) {
        for (const day of week.days) {
          if (day.orign.isSame(start, "day")) {
            day.isSelected = true;
            day.isRangeStart = true;
          }
        }
      }
    }

    if (rangeEnd.value) {
      let end = dayjs(rangeEnd.value);
      for (const week of monthArr) {
        for (const day of week.days) {
          if (day.orign.isSame(end, "day")) {
            day.isRangeEnd = true;
          }
        }
      }
    }

    if (rangeStart.value && rangeEnd.value) {
      for (const week of monthArr) {
        for (const day of week.days) {
          if (
            day.orign.isBetween(rangeStart.value, rangeEnd.value, "day", "[]")
          ) {
            day.isSelected = true;
            if (
              props.selectionType == CalendarSelectionType.week &&
              !week.isSelected
            ) {
              week.isSelected = true;
            }
          }
        }
      }
    }
  } else {
    // 单选或多选
    for (const week of monthArr) {
      for (const day of week.days) {
        day.isSelected = false;
        for (const _sDay of selectedDateInfos.value) {
          if (day.orign.isSame(dayjs(_sDay), "day")) {
            day.isSelected = true;
          }
        }
      }
    }
  }
};

onMounted(() => {
  reloadCalendarData();
});
</script>

<style lang="scss" scoped>
.calendar-page {
  $rowHeight: 32;
  $selectedRadius: 8px;
  background-color: #fff;

  .tool-base {
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 16px;
    font-size: 18px;
    font-weight: bold;
    color: #222222;

    .q-btn {
      width: 22px;

      &:first-of-type {
        margin-right: 16px;
      }
    }
  }

  .week-header {
    display: flex;
    justify-content: stretch;
    height: #{$rowHeight}px;
    align-items: center;

    .h-item {
      flex: 1;
      text-align: center;
      font-size: 16px;
      font-weight: 400;
      color: #999999;
    }
  }

  .weekIdx {
    width: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 16px;
    font-weight: 400;
    color: #999999;
  }

  .base {
    height: #{($rowHeight + 2) * 6}px;
    position: relative;
    overflow: hidden;

    .c-grid {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      will-change: transform;
    }

    .calendar-wrapper {
      .month-base {
        display: flex;
        flex-direction: column;
        align-content: stretch;
        justify-content: stretch;
        // border: 1px solid aquamarine;

        .week-base {
          flex: 1;
          display: flex;
          align-content: stretch;

          .weekIdx {
            margin: 1px 0;
            color: #222222;
          }

          .day-base {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
            // border: 1px solid rebeccapurple;

            .day-num {
              display: flex;
              width: 32px;
              height: 32px;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 16px;
              color: #222222;
            }
          }

          .today {
            .day-num {
              border-radius: $selectedRadius;
              background-color: rgb(75, 180, 254);
            }
          }

          .gray {
            .day-num {
              color: #dddddd;
            }
          }

          .selected {
            .day-num {
              border-radius: $selectedRadius;
              background-color: #fabe00;
            }
          }
        }

        .rangeSelectionType {
          .selected {
            border-radius: unset;
          }
        }

        .rangeSelectionType {
          .selected {
            margin: 1px 0;
            background-color: #fabe00;

            .day-num {
              background-color: unset;
              width: unset;
              height: unset;
            }
          }

          .rangeStart {
            border-top-left-radius: $selectedRadius;
            border-bottom-left-radius: $selectedRadius;
          }

          .rangeEnd {
            border-top-right-radius: $selectedRadius;
            border-bottom-right-radius: $selectedRadius;
          }
        }

        .weekIdxSelectionType {
          .rangeStart {
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
          }

          .weekIdx.selected {
            border-top-left-radius: $selectedRadius;
            border-bottom-left-radius: $selectedRadius;
          }
        }
      }
    }
  }
}
</style>
