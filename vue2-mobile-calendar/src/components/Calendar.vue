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
              rangeSelectionType: ['range', 'week'].includes(selectionType),
              weekIdxSelectionType: selectionType == 'week' && showWeekIdx,
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

<script>
import { getFullMonthDaysInDate, deepCopy } from "@/helper/calendarTools.js";

import dayjs from "dayjs";
const isBetween = require("dayjs/plugin/isBetween");
dayjs.extend(isBetween);

let touchStartX;
let touchStartY;

export default {
  name: "Calendar",
  props: {
    // 一周开始星期， 0为周日
    weekStartDay: { type: Number, default: 1 },
    // 周序号标题，不写 则不显示
    weekIndexTitle: { type: String, default: "周" },
    weekTitles: {
      type: Array,
      default: () => ["一", "二", "三", "四", "五", "六", "日"],
    },

    // 日期选择类型， single单选  multiple多选  range范围  week整周
    selectionType: { type: String, default: "single" },

    /**
     * 选择的日期， single/multiple使用selectedDateInfos， range/week使用rangeStart、rangeEnd
     */
    initData: {
      type: Object,
      default: () => {
        return {
          selectedDateInfos: [],
          rangeStart: "",
          rangeEnd: "",
        };
      },
    },
  },

  data() {
    return {
      translateX: 0,
      touch: {
        x: 0,
        y: 0,
      },
      isTouching: false,

      curDate: dayjs(),
      month0: [], // 当前显示月
      monthA: [], // 当前显示月上一月
      monthB: [], // 当前显示月下一月

      m_priviteSelectionData: null,
    };
  },
  computed: {
    showWeekIdx() {
      return this.weekIndexTitle?.length > 0;
    },
    weekHeaders() {
      if (this.weekIndexTitle) {
        return [this.weekIndexTitle, ...this.weekTitles];
      }
      return this.weekTitles;
    },
    curTitle() {
      let date = this.curDate;
      let fmt = "YYYY年MM月";
      return date.format(fmt);
    },

    dataArr() {
      return [this.monthA, this.month0, this.monthB];
    },

    // prop传入的初始值
    priviteSelectionData: {
      get() {
        if (!this.m_priviteSelectionData) {
          this.m_priviteSelectionData = deepCopy(this.initData);
        }
        return this.m_priviteSelectionData;
      },
      set(newVal) {
        this.m_priviteSelectionData = newVal;
      },
    },
    m_weekStartDay() {
      return this.weekStartDay;
    },
    m_selectionType() {
      return this.selectionType;
    },
  },

  watch: {
    priviteSelectionData() {
      this.reloadCalendarData();
    },
    m_weekStartDay() {
      this.reloadCalendarData();
    },
    m_selectionType() {
      this.priviteSelectionData = deepCopy(this.initData);
      this.reloadCalendarData();
    },
  },

  mounted() {
    this.reloadCalendarData();
  },

  methods: {
    // 快捷切换日期
    handleChangBtnAction(val) {
      if (Math.abs(val) == 1) {
        // 切月份
        this.change(val);
      }

      if (Math.abs(val) == 2) {
        // 切年份
        if (val < 0) {
          // 向过去切 =  右滑
          this.curDate = this.curDate.add(-1, "year");
        } else {
          // 向未来切 =  左滑
          this.curDate = this.curDate.add(1, "year");
        }
        this.reloadCalendarData();
      }
    },
    // 日期点击事件
    handleDayClick(day, week) {
      if (day.isGray) {
        return;
      }

      if (this.m_selectionType == "single") {
        // 单选
        this.priviteSelectionData.selectedDateInfos = [];
        this.priviteSelectionData.selectedDateInfos.push(day.dateInfo);
        this.$emit(
          "didSelectedDate",
          this.priviteSelectionData,
          this.m_selectionType
        );
      } else if (this.m_selectionType == "multiple") {
        // 多选
        if (
          !this.priviteSelectionData.selectedDateInfos.includes(day.dateInfo)
        ) {
          this.priviteSelectionData.selectedDateInfos.push(day.dateInfo);
        }
        this.$emit(
          "didSelectedDate",
          this.priviteSelectionData,
          this.m_selectionType
        );
      } else if (this.m_selectionType == "range") {
        if (
          this.priviteSelectionData.rangeStart &&
          this.priviteSelectionData.rangeEnd
        ) {
          // 两个都选了  重新选择开始的
          this.priviteSelectionData.rangeEnd = null;
          this.priviteSelectionData.rangeStart = day.dateInfo;
        } else {
          if (this.priviteSelectionData.rangeStart) {
            if (
              day.orign.isBefore(
                dayjs(this.priviteSelectionData.rangeStart),
                "day"
              )
            ) {
              // 第二次选的 是否小于 第一次的
              this.priviteSelectionData.rangeEnd =
                this.priviteSelectionData.rangeStart;
              this.priviteSelectionData.rangeStart = day.dateInfo;
            } else {
              this.priviteSelectionData.rangeEnd = day.dateInfo;
            }
            this.$emit(
              "didSelectedDate",
              this.priviteSelectionData,
              this.m_selectionType
            );
          } else {
            this.priviteSelectionData.rangeStart = day.dateInfo;
          }
        }
      } else if (this.m_selectionType == "week") {
        this.handleWeekIdxClick(week, false);
      }

      this.$nextTick(() => {
        this.checkSelectedDate(this.month0);
        this.$forceUpdate();
      });
    },
    handleWeekIdxClick(week, reload = true) {
      if (this.m_selectionType == "week") {
        this.priviteSelectionData.rangeStart = null;
        this.priviteSelectionData.rangeEnd = null;
        let start = week.days[0];
        let end = week.days[week.days.length - 1];
        this.priviteSelectionData.rangeStart = start.dateInfo;
        this.priviteSelectionData.rangeEnd = end.dateInfo;

        this.$emit(
          "didSelectedDate",
          this.priviteSelectionData,
          this.m_selectionType
        );
      }
      if (reload) {
        this.$nextTick(() => {
          this.checkSelectedDate(this.month0);
          this.$forceUpdate();
        });
      }
    },

    touchstart(event) {
      let _etouch = event.touches[0];
      touchStartX = _etouch.clientX;
      touchStartY = _etouch.clientY;
      this.touch = {
        x: 0,
        y: 0,
      };
      this.isTouching = true;
    },
    touchmove(event) {
      let _etouch = event.touches[0];
      this.touch = {
        x: (_etouch.clientX - touchStartX) / this.$refs.base.offsetWidth,
        y: (_etouch.clientY - touchStartY) / this.$refs.base.offsetHeight,
      };
      // console.log("x", _etouch.clientX)
      // console.log(JSON.stringify(this.touch))
    },
    touchend(event) {
      this.isTouching = false;
      if (Math.abs(this.touch.x) > 0.4) {
        if (this.touch.x > 0) {
          // console.log("右滑")
          this.change(-1);
        } else if (this.touch.x < 0) {
          // console.log("左滑")
          this.change(1);
        }
      } else {
        this.touch = {
          x: 0,
          y: 0,
        };
      }
    },

    change(type) {
      this.translateX -= type;
      this.curDate = this.curDate.add(type, "month");
      this.reloadCalendarData();
    },

    reloadCalendarData() {
      // console.log("刷新日历数据");
      let _dateA = this.curDate.add(-1, "month");
      let _dateB = this.curDate.add(1, "month");

      this.monthA = getFullMonthDaysInDate(_dateA, this.weekStartDay);
      this.month0 = getFullMonthDaysInDate(this.curDate, this.weekStartDay);
      this.monthB = getFullMonthDaysInDate(_dateB, this.weekStartDay);

      this.checkSelectedDate(this.month0);
      this.checkSelectedDate(this.monthA);
      this.checkSelectedDate(this.monthB);
    },

    checkSelectedDate(monthArr) {
      if (["range", "week"].includes(this.m_selectionType)) {
        // 重置所有选中状态
        for (const week of monthArr) {
          week.isSelected = false;
          for (const day of week.days) {
            day.isSelected = false;
            day.isRangeStart = false;
            day.isRangeEnd = false;
          }
        }

        if (this.priviteSelectionData.rangeStart) {
          let start = dayjs(this.priviteSelectionData.rangeStart);
          for (const week of monthArr) {
            for (const day of week.days) {
              if (day.orign.isSame(start, "day")) {
                day.isSelected = true;
                day.isRangeStart = true;
              }
            }
          }
        }

        if (this.priviteSelectionData.rangeEnd) {
          let end = dayjs(this.priviteSelectionData.rangeEnd);
          for (const week of monthArr) {
            for (const day of week.days) {
              if (day.orign.isSame(end, "day")) {
                day.isRangeEnd = true;
              }
            }
          }
        }

        if (
          this.priviteSelectionData.rangeStart &&
          this.priviteSelectionData.rangeEnd
        ) {
          for (const week of monthArr) {
            for (const day of week.days) {
              if (
                day.orign.isBetween(
                  this.priviteSelectionData.rangeStart,
                  this.priviteSelectionData.rangeEnd,
                  "day",
                  "[]"
                )
              ) {
                day.isSelected = true;
                if (this.m_selectionType == "week" && !week.isSelected) {
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
            for (const _sDay of this.priviteSelectionData.selectedDateInfos) {
              if (day.orign.isSame(dayjs(_sDay), "day")) {
                day.isSelected = true;
              }
            }
          }
        }
      }
    },
  },
};
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
