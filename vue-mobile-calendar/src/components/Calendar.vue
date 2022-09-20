<template>
  <div class="calendar-page">
    <div class="tool-base">
      <div class="left">
        <img
          class="q-btn"
          src="@/assets/img/cal_db_leftarrow.png"
          :class="{ disabled: quickChangeBtnStatus.dbLeft == false }"
          alt=""
          @click="handleChangBtnAction(-2)"
        />
        <img
          class="q-btn"
          src="@/assets/img/cal_leftarrow.png"
          :class="{ disabled: quickChangeBtnStatus.left == false }"
          alt=""
          @click="handleChangBtnAction(-1)"
        />
      </div>
      <div class="mid">{{ curTitle }}</div>
      <div class="right">
        <img
          class="q-btn"
          src="@/assets/img/cal_rightarrow.png"
          :class="{ disabled: quickChangeBtnStatus.right == false }"
          alt=""
          @click="handleChangBtnAction(1)"
        />
        <img
          class="q-btn"
          src="@/assets/img/cal_db_rightarrow.png"
          :class="{ disabled: quickChangeBtnStatus.dbRight == false }"
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
              (midx - 1 + translateX + (isTouching ? touch.ratioX : 0)) * 100
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

import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(isSameOrBefore);
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);

import * as calendarTools from "@/helper/calendarTools";

export enum CalendarSelectionType {
  single = 0,
  multiple,
  range,
  week,
}

export interface CalendarInfoData {
  selectedDateInfo?: string; // single
  selectedDateInfoArr?: string[]; // multiple
  rangeStart?: string; // range
  rangeEnd?: string; // range
  weekRangeStart?: string; // week
  weekRangeEnd?: string; // week
}
</script>

<script setup lang="ts">
import { ref, unref, computed, onMounted, watch } from "vue";

interface Props {
  weekStartDay?: number; // 一周开始星期， 0为周日
  weekIndexTitle?: string; // 周序号标题，不写 则不显示
  weekTitles?: Array<string>;

  // 最小和最大日期
  minDate?: string | dayjs.Dayjs;
  maxDate?: string | dayjs.Dayjs;

  selectionType?: CalendarSelectionType; // 日期选择类型
  /**
   * 默认的日期 格式 YYYY-MM-DD
   */
  selectedDateInfo?: string; // single
  selectedDateInfoArr?: Array<string>; // multiple
  rangeStart?: string; // range
  rangeEnd?: string; // range
  weekRangeStart?: string; // week
  weekRangeEnd?: string; // week
}

let touchStartX: number;
let touchStartY: number;
const getInitialTouchPoint = () => ({
  offsetX: 0,
  offsetY: 0,
  ratioX: 0,
  ratioY: 0,
});

const props = withDefaults(defineProps<Props>(), {
  weekStartDay: 1,
  weekIndexTitle: "周",
  weekTitles: () => ["一", "二", "三", "四", "五", "六", "日"],
  minDate: "2022-01-01",
  maxDate: "2023-12-31",

  selectionType: CalendarSelectionType.single,
  selectedDateInfo: "", // single
  selectedDateInfoArr: () => [], // multiple
  rangeStart: "", // range
  rangeEnd: "", // range
  weekRangeStart: "", // week
  weekRangeEnd: "", // week
});

const emit = defineEmits<{
  (
    e: "didSelectedDate",
    selectedData: CalendarInfoData,
    selectionType: CalendarSelectionType
  ): void;
}>();

// reactive data
const base = ref<HTMLElement | null>(null);
const translateX = ref(0);
const touch = ref(getInitialTouchPoint());
const isTouching = ref(false);

let curDate = ref(dayjs());
let month0 = ref<calendarTools.WeekConfig[]>([]); // 当前显示月
let monthA = ref<calendarTools.WeekConfig[]>([]); // 当前显示月上一月
let monthB = ref<calendarTools.WeekConfig[]>([]); // 当前显示月下一月

let t_selectedDateInfo = ref<string | undefined>(undefined);
let t_selectedDateInfoArr = ref<string[] | undefined>(undefined);
let t_rangeStart = ref<string | undefined>(undefined);
let t_rangeEnd = ref<string | undefined>(undefined);
let t_weekRangeStart = ref<string | undefined>(undefined);
let t_weekRangeEnd = ref<string | undefined>(undefined);

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

const quickChangeBtnStatus = computed(() => {
  let obj = {
    dbLeft: true,
    left: true,
    right: true,
    dbRight: true,
  };
  if (curDate.value.add(-1, "year").isBefore(props.minDate, "month")) {
    obj.dbLeft = false;
  }
  if (curDate.value.add(-1, "month").isBefore(props.minDate, "month")) {
    obj.left = false;
  }

  if (curDate.value.add(1, "year").isAfter(props.maxDate, "month")) {
    obj.dbRight = false;
  }
  if (curDate.value.add(1, "month").isAfter(props.maxDate, "month")) {
    obj.right = false;
  }
  return obj;
});

// prop传入的初始值
let m_selectedDateInfo = computed({
  get() {
    if (t_selectedDateInfo.value == undefined) {
      t_selectedDateInfo.value = props.selectedDateInfo;
    }
    return t_selectedDateInfo.value;
  },
  set(newVal) {
    t_selectedDateInfo.value = newVal;
  },
});
watch(m_selectedDateInfo, () => {
  reloadCalendarData();
});

let m_selectedDateInfoArr = computed({
  get() {
    if (t_selectedDateInfoArr.value == undefined) {
      t_selectedDateInfoArr.value = props.selectedDateInfoArr;
    }
    return t_selectedDateInfoArr.value;
  },
  set(newVal) {
    t_selectedDateInfoArr.value = newVal;
  },
});
watch(m_selectedDateInfoArr, () => {
  reloadCalendarData();
});

let m_rangeStart = computed<string | undefined>({
  get() {
    if (t_rangeStart.value == undefined) {
      t_rangeStart.value = props.rangeStart;
    }
    return t_rangeStart.value;
  },
  set(newVal) {
    t_rangeStart.value = newVal;
  },
});
watch(m_rangeStart, () => {
  reloadCalendarData();
});

let m_rangeEnd = computed<string | undefined>({
  get() {
    if (t_rangeEnd.value == undefined) {
      t_rangeEnd.value = props.rangeEnd;
    }
    return t_rangeEnd.value;
  },
  set(newVal) {
    t_rangeEnd.value = newVal;
  },
});
watch(m_rangeEnd, () => {
  reloadCalendarData();
});

let m_weekRangeStart = computed<string | undefined>({
  get() {
    if (t_weekRangeStart.value == undefined) {
      t_weekRangeStart.value = props.weekRangeStart;
    }
    return t_weekRangeStart.value;
  },
  set(newVal) {
    t_weekRangeStart.value = newVal;
  },
});
watch(m_weekRangeStart, () => {
  reloadCalendarData();
});

let m_weekRangeEnd = computed<string | undefined>({
  get() {
    if (t_weekRangeEnd.value == undefined) {
      t_weekRangeEnd.value = props.weekRangeEnd;
    }
    return t_weekRangeEnd.value;
  },
  set(newVal) {
    t_weekRangeEnd.value = newVal;
  },
});
watch(m_weekRangeEnd, () => {
  reloadCalendarData();
});

const m_weekStartDay = computed(() => {
  return props.weekStartDay;
});
watch(m_weekStartDay, () => {
  reloadCalendarData();
});

const m_selectionType = computed(() => {
  return props.selectionType;
});
watch(m_selectionType, () => {
  reloadCalendarData();
});

// 快捷切换日期
function handleChangBtnAction(val: number) {
  if (Math.abs(val) == 1) {
    // 切月份
    if (val < 0) {
      // 向过去切 =  右滑
      if (!quickChangeBtnStatus.value.left) {
        return;
      }
    } else {
      // 向未来切 =  左滑
      if (!quickChangeBtnStatus.value.right) {
        return;
      }
    }
    change(val);
  }
  if (Math.abs(val) == 2) {
    // 切年份
    if (val < 0) {
      // 向过去切 =  右滑
      if (!quickChangeBtnStatus.value.dbLeft) {
        return;
      }
      curDate.value = curDate.value.add(-1, "year");
    } else {
      // 向未来切 =  左滑
      if (!quickChangeBtnStatus.value.dbRight) {
        return;
      }
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

  if (m_selectionType.value == CalendarSelectionType.single) {
    // 单选

    m_selectedDateInfo.value = day.dateInfo;
    emit(
      "didSelectedDate",
      { selectedDateInfo: unref(m_selectedDateInfo) },
      m_selectionType.value
    );
  } else if (m_selectionType.value == CalendarSelectionType.multiple) {
    // 多选
    let _idx = m_selectedDateInfoArr.value.indexOf(day.dateInfo);
    if (_idx > -1) {
      // 已经包含  取消选择
      m_selectedDateInfoArr.value.splice(_idx, 1);
    } else {
      m_selectedDateInfoArr.value.push(day.dateInfo);
    }
    emit(
      "didSelectedDate",
      { selectedDateInfoArr: unref(m_selectedDateInfoArr) },
      m_selectionType.value
    );
  } else if (m_selectionType.value == CalendarSelectionType.range) {
    if (m_rangeStart.value && m_rangeEnd.value) {
      // 两个都选了  重新选择开始的
      m_rangeEnd.value = "";
      m_rangeStart.value = day.dateInfo;
    } else {
      if (m_rangeStart.value) {
        if (day.orign.isBefore(dayjs(m_rangeStart.value), "day")) {
          // 第二次选的 是否小于 第一次的
          m_rangeEnd.value = m_rangeStart.value;
          m_rangeStart.value = day.dateInfo;
        } else {
          m_rangeEnd.value = day.dateInfo;
        }
        emit(
          "didSelectedDate",
          { rangeStart: unref(m_rangeStart), rangeEnd: unref(m_rangeEnd) },
          m_selectionType.value
        );
      } else {
        m_rangeStart.value = day.dateInfo;
      }
    }
  } else if (m_selectionType.value == CalendarSelectionType.week) {
    handleWeekIdxClick(week, false);
  }

  checkSelectedDate(month0.value);
}

function handleWeekIdxClick(week: calendarTools.WeekConfig, reload = true) {
  if (m_selectionType.value == CalendarSelectionType.week) {
    m_weekRangeStart.value = undefined;
    m_weekRangeEnd.value = undefined;
    let start = week.days[0];
    let end = week.days[week.days.length - 1];

    m_weekRangeStart.value = start.dateInfo;
    m_weekRangeEnd.value = end.dateInfo;

    emit(
      "didSelectedDate",
      {
        weekRangeStart: unref(m_weekRangeStart),
        weekRangeEnd: unref(m_weekRangeEnd),
      },
      m_selectionType.value
    );
  }
  if (reload) {
    checkSelectedDate(month0.value);
  }
}

const touchstart = (event: TouchEvent) => {
  let _etouch = event.touches[0];
  touchStartX = _etouch.clientX;
  touchStartY = _etouch.clientY;
  touch.value = getInitialTouchPoint();
  isTouching.value = true;
};
const touchmove = (event: TouchEvent) => {
  let _etouch = event.touches[0];

  touch.value.offsetX = _etouch.clientX - touchStartX;
  touch.value.offsetY = _etouch.clientY - touchStartY;

  // console.log("offsetX", touch.value.offsetX);
  if (!quickChangeBtnStatus.value.left) {
    // 当前月 <= 最小值 , 禁用 右滑 (左边切月按钮不可用时)
    if (touch.value.offsetX > 0) {
      touch.value.offsetX = 0;
      return;
    }
  }
  if (!quickChangeBtnStatus.value.right) {
    // 当前月 >= 最大值 , 禁用 左滑 (右边切月按钮不可用时)
    if (touch.value.offsetX < 0) {
      touch.value.offsetX = 0;
      return;
    }
  }

  touch.value.ratioX = touch.value.offsetX / (base.value?.offsetWidth ?? 1);
  touch.value.ratioY = touch.value.offsetY / (base.value?.offsetHeight ?? 1);
  // console.log("x", _etouch.clientX)
  // console.log(JSON.stringify(touch.value));
};
const touchend = () => {
  isTouching.value = false;

  const useRatio = false; // 使用百分比

  if (useRatio) {
    // 使用滑动百分比 判断是否切换
    if (Math.abs(touch.value.ratioX) > 0.1) {
      if (touch.value.ratioX > 0) {
        // console.log("右滑")
        change(-1);
      } else if (touch.value.ratioX < 0) {
        // console.log("左滑")
        change(1);
      }
    } else {
      touch.value = getInitialTouchPoint();
    }
  } else {
    // 使用固定位移判断 是否切换
    if (Math.abs(touch.value.offsetX) > 40) {
      if (touch.value.offsetX > 0) {
        // console.log("右滑")
        change(-1);
      } else if (touch.value.offsetX < 0) {
        // console.log("左滑")
        change(1);
      }
    } else {
      touch.value = getInitialTouchPoint();
    }
  }
};

const change = (type: number) => {
  translateX.value -= type;
  curDate.value = curDate.value.add(type, "month");
  reloadCalendarData();
};

const reloadCalendarData = () => {
  // console.log("刷新日历数据");

  let _dateA = curDate.value.add(-1, "month");
  let _dateB = curDate.value.add(1, "month");

  monthA.value = calendarTools.getFullMonthDaysInDate(
    _dateA,
    m_weekStartDay.value
  );
  month0.value = calendarTools.getFullMonthDaysInDate(
    curDate.value,
    m_weekStartDay.value
  );
  monthB.value = calendarTools.getFullMonthDaysInDate(
    _dateB,
    m_weekStartDay.value
  );

  checkSelectedDate(month0.value);
  checkSelectedDate(monthA.value);
  checkSelectedDate(monthB.value);
};

const checkSelectedDate = (monthArr: calendarTools.WeekConfig[]) => {
  if (
    [CalendarSelectionType.range, CalendarSelectionType.week].includes(
      m_selectionType.value
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

    let _rstart = m_rangeStart.value;
    let _rend = m_rangeEnd.value;
    if (m_selectionType.value == CalendarSelectionType.week) {
      _rstart = m_weekRangeStart.value;
      _rend = m_weekRangeEnd.value;
    }

    if (_rstart) {
      let start = dayjs(_rstart);
      for (const week of monthArr) {
        for (const day of week.days) {
          if (day.orign.isSame(start, "day")) {
            day.isSelected = true;
            day.isRangeStart = true;
          }
        }
      }
    }

    if (_rend) {
      let end = dayjs(_rend);
      for (const week of monthArr) {
        for (const day of week.days) {
          if (day.orign.isSame(end, "day")) {
            day.isRangeEnd = true;
          }
        }
      }
    }

    if (_rstart && _rend) {
      for (const week of monthArr) {
        for (const day of week.days) {
          if (day.orign.isBetween(_rstart, _rend, "day", "[]")) {
            day.isSelected = true;
            if (
              m_selectionType.value == CalendarSelectionType.week &&
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
    let _tmp = m_selectedDateInfoArr.value;
    if (m_selectionType.value == CalendarSelectionType.single) {
      _tmp = [m_selectedDateInfo.value];
    }

    for (const week of monthArr) {
      for (const day of week.days) {
        day.isSelected = false;
        for (const _sDay of _tmp) {
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
$rowHeight: 32;

.calendar-page {
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
      &.disabled {
        opacity: 0.5;
        -webkit-filter: grayscale(100%);
        filter: grayscale(100%);
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
              width: #{$rowHeight}px;
              height: #{$rowHeight}px;
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
              // height: unset;
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
