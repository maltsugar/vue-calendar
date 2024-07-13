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
import { getFullMonthDaysInDate } from "@/helper/calendarTools.js";

import dayjs from "dayjs";
const isBetween = require("dayjs/plugin/isBetween");
dayjs.extend(isBetween);

// const isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
// dayjs.extend(isSameOrBefore);
// const isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
// dayjs.extend(isSameOrAfter);

let touchStartX;
let touchStartY;
const getInitialTouchPoint = () => ({
  offsetX: 0,
  offsetY: 0,
  ratioX: 0,
  ratioY: 0,
});

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
    // 最小和最大日期 (String 或 dayjs对象)
    minDate: { type: String | Object, default: "2022-01-01" },
    maxDate: { type: String | Object, default: "2023-12-31" },
    precisionMinMax: Boolean, // min max 配置是否精确到日

    // 日期选择类型， single单选  multiple多选  range范围  week整周
    selectionType: { type: String, default: "single" },

    // 最大选择天数，range和multiple时 生效, 不满足条件时触发invalidSelect回调事件，回调事件参数包含选择天数
    maxSelectDayCount: {
      type: Number,
      validator: (val) => {
        if (val <= 0) {
          throw new Error("maxSelectDayCount 必须大于0才有意义");
        }
        return val > 0;
      },
    },

    /**
     * 默认的日期
     */
    selectedDateInfo: { type: String, default: "" }, // single
    selectedDateInfoArr: { type: Array, default: () => [] }, // multiple
    rangeStart: { type: String, default: "" }, // range
    rangeEnd: { type: String, default: "" }, // range
    weekRangeStart: { type: String, default: "" }, // week
    weekRangeEnd: { type: String, default: "" }, // week

    /**
     *  默认日历视图，日历首次打开时展示的月份
     *  today：默认值，今天所在的日期；
     *  selectedDate: 设置的默认日期；
     *  start: 范围的起始值(包括周)
     *  end: 范围的结束值(包括周)
     *  “xxxx-xx-xx” 直接给具体的日期
     */
    defCalendarView: { type: String, default: "today" },
  },

  data() {
    return {
      translateX: 0,
      touch: getInitialTouchPoint(),
      isTouching: false,

      curDate: dayjs(),
      month0: [], // 当前显示月
      monthA: [], // 当前显示月上一月
      monthB: [], // 当前显示月下一月

      t_selectedDateInfo: undefined,
      t_selectedDateInfoArr: undefined,
      t_rangeStart: undefined,
      t_rangeEnd: undefined,
      t_weekRangeStart: undefined,
      t_weekRangeEnd: undefined,
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

    quickChangeBtnStatus() {
      let obj = {
        dbLeft: true,
        left: true,
        right: true,
        dbRight: true,
      };
      if (this.curDate.add(-1, "year").isBefore(this.minDate, "month")) {
        obj.dbLeft = false;
      }
      if (this.curDate.add(-1, "month").isBefore(this.minDate, "month")) {
        obj.left = false;
      }

      if (this.curDate.add(1, "year").isAfter(this.maxDate, "month")) {
        obj.dbRight = false;
      }
      if (this.curDate.add(1, "month").isAfter(this.maxDate, "month")) {
        obj.right = false;
      }
      return obj;
    },

    // prop传入的初始值
    m_selectedDateInfo: {
      get() {
        if (this.t_selectedDateInfo == undefined) {
          this.t_selectedDateInfo = this.selectedDateInfo;
        }
        return this.t_selectedDateInfo;
      },
      set(newVal) {
        this.t_selectedDateInfo = newVal;
      },
    },

    m_selectedDateInfoArr: {
      get() {
        if (this.t_selectedDateInfoArr == undefined) {
          this.t_selectedDateInfoArr = this.selectedDateInfoArr;
        }
        return this.t_selectedDateInfoArr;
      },
      set(newVal) {
        this.t_selectedDateInfoArr = newVal;
      },
    },
    m_rangeStart: {
      get() {
        if (this.t_rangeStart == undefined) {
          this.t_rangeStart = this.rangeStart;
        }
        return this.t_rangeStart;
      },
      set(newVal) {
        this.t_rangeStart = newVal;
      },
    },
    m_rangeEnd: {
      get() {
        if (this.t_rangeEnd == undefined) {
          this.t_rangeEnd = this.rangeEnd;
        }
        return this.t_rangeEnd;
      },
      set(newVal) {
        this.t_rangeEnd = newVal;
      },
    },

    // 周
    m_weekRangeStart: {
      get() {
        if (this.t_weekRangeStart == undefined) {
          this.t_weekRangeStart = this.weekRangeStart;
        }
        return this.t_weekRangeStart;
      },
      set(newVal) {
        this.t_weekRangeStart = newVal;
      },
    },
    m_weekRangeEnd: {
      get() {
        if (this.t_weekRangeEnd == undefined) {
          this.t_weekRangeEnd = this.weekRangeEnd;
        }
        return this.t_weekRangeEnd;
      },
      set(newVal) {
        this.t_weekRangeEnd = newVal;
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
    m_selectedDateInfo() {
      this.reloadCalendarData();
    },
    m_selectedDateInfoArr() {
      this.reloadCalendarData();
    },
    m_rangeStart() {
      this.reloadCalendarData();
    },
    m_rangeEnd() {
      this.reloadCalendarData();
    },

    m_weekRangeStart() {
      this.reloadCalendarData();
    },
    m_weekRangeEnd() {
      this.reloadCalendarData();
    },

    m_weekStartDay() {
      this.reloadCalendarData();
    },
    m_selectionType() {
      this.reloadDefDate();
      this.reloadCalendarData();
    },

    minDate() {
      this.reloadCalendarData();
    },
    maxDate() {
      this.reloadCalendarData();
    },
  },

  mounted() {
    this.reloadDefDate();

    this.reloadCalendarData();
  },

  methods: {
    // 快捷切换日期
    handleChangBtnAction(val) {
      if (Math.abs(val) == 1) {
        // 切月份

        if (val < 0) {
          // 向过去切 =  右滑
          if (!this.quickChangeBtnStatus.left) {
            return;
          }
        } else {
          // 向未来切 =  左滑
          if (!this.quickChangeBtnStatus.right) {
            return;
          }
        }

        this.change(val);
      }

      if (Math.abs(val) == 2) {
        // 切年份

        if (val < 0) {
          // 向过去切 =  右滑
          if (!this.quickChangeBtnStatus.dbLeft) {
            return;
          }

          this.curDate = this.curDate.add(-1, "year");
        } else {
          // 向未来切 =  左滑
          if (!this.quickChangeBtnStatus.dbRight) {
            return;
          }
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
        this.m_selectedDateInfo = day.dateInfo;

        this.$emit(
          "didSelectedDate",
          { selectedDateInfo: this.m_selectedDateInfo },
          this.m_selectionType
        );
      } else if (this.m_selectionType == "multiple") {
        // 多选
        let _idx = this.m_selectedDateInfoArr.indexOf(day.dateInfo);
        if (_idx > -1) {
          // 已经包含  取消选择
          this.m_selectedDateInfoArr.splice(_idx, 1);
        } else {
          const _selectedCnt = this.m_selectedDateInfoArr.length;
          if (
            this.maxSelectDayCount &&
            _selectedCnt >= this.maxSelectDayCount
          ) {
            this.sentInvalidSelectInfo({
              type: "maxSelectDayCount",
              count: _selectedCnt,
            });
            return;
          }

          this.m_selectedDateInfoArr.push(day.dateInfo);
        }
        this.$emit(
          "didSelectedDate",
          { selectedDateInfoArr: this.m_selectedDateInfoArr },
          this.m_selectionType
        );
      } else if (this.m_selectionType == "range") {
        if (this.m_rangeStart && this.m_rangeEnd) {
          // 两个都选了  重新选择开始的
          this.m_rangeEnd = "";
          this.m_rangeStart = day.dateInfo;
        } else {
          if (this.m_rangeStart) {
            if (this.maxSelectDayCount) {
              const d1 = day.orign.startOf("day");
              const d2 = dayjs(this.m_rangeStart).startOf("day");
              let diff = d1.diff(d2, "day");
              diff = Math.abs(diff) + 1;
              if (diff > this.maxSelectDayCount) {
                this.sentInvalidSelectInfo({
                  type: "maxSelectDayCount",
                  count: diff,
                });
                return;
              }
            }

            if (day.orign.isBefore(dayjs(this.m_rangeStart), "day")) {
              // 第二次选的 是否小于 第一次的
              this.m_rangeEnd = this.m_rangeStart;
              this.m_rangeStart = day.dateInfo;
            } else {
              this.m_rangeEnd = day.dateInfo;
            }
            this.$emit(
              "didSelectedDate",
              { rangeStart: this.m_rangeStart, rangeEnd: this.m_rangeEnd },
              this.m_selectionType
            );
          } else {
            this.m_rangeStart = day.dateInfo;
          }
        }
      } else if (this.m_selectionType == "week") {
        this.handleWeekIdxClick(week, false);
      }

      this.checkSelectedDate(this.month0);
    },
    handleWeekIdxClick(week, reload = true) {
      if (this.m_selectionType == "week") {
        this.m_weekRangeStart = undefined;
        this.m_weekRangeEnd = undefined;
        let start = week.days[0];
        let end = week.days[week.days.length - 1];
        this.m_weekRangeStart = start.dateInfo;
        this.m_weekRangeEnd = end.dateInfo;

        this.$emit(
          "didSelectedDate",
          {
            weekRangeStart: this.m_weekRangeStart,
            weekRangeEnd: this.m_weekRangeEnd,
          },
          this.m_selectionType
        );
      }
      if (reload) {
        this.checkSelectedDate(this.month0);
      }
    },

    // 发送无效选择告警
    sentInvalidSelectInfo(info) {
      if (info.type == "maxSelectDayCount") {
        console.error(
          `选择了${info.count}天，大于设置的最大数量${this.maxSelectDayCount}`
        );
      }
      this.$emit("invalidSelect", info);
    },

    touchstart(event) {
      let _etouch = event.touches[0];
      touchStartX = _etouch.clientX;
      touchStartY = _etouch.clientY;
      this.touch = getInitialTouchPoint();
      this.isTouching = true;
    },
    touchmove(event) {
      let _etouch = event.touches[0];
      this.touch.offsetX = _etouch.clientX - touchStartX;
      this.touch.offsetY = _etouch.clientY - touchStartY;

      // console.log("offsetX", this.touch.offsetX);
      if (!this.quickChangeBtnStatus.left) {
        // 当前月 <= 最小值 , 禁用 右滑 (左边切月按钮不可用时)
        if (this.touch.offsetX > 0) {
          this.touch.offsetX = 0;
          return;
        }
      }
      if (!this.quickChangeBtnStatus.right) {
        // 当前月 >= 最大值 , 禁用 左滑 (右边切月按钮不可用时)
        if (this.touch.offsetX < 0) {
          this.touch.offsetX = 0;
          return;
        }
      }

      this.touch.ratioX =
        this.touch.offsetX / this.$refs?.base?.offsetWidth ?? 1;
      this.touch.ratioY =
        this.touch.offsetY / this.$refs?.base?.offsetHeight ?? 1;

      // console.log("x", _etouch.clientX)
      // console.log(JSON.stringify(this.touch))
    },
    touchend(event) {
      this.isTouching = false;
      const useRatio = false; // 使用百分比
      if (useRatio) {
        // 使用滑动百分比 判断是否切换

        if (Math.abs(this.touch.x) > 0.1) {
          if (this.touch.x > 0) {
            // console.log("右滑")
            this.change(-1);
          } else if (this.touch.x < 0) {
            // console.log("左滑")
            this.change(1);
          }
        } else {
          this.touch = getInitialTouchPoint();
        }
      } else {
        // 使用固定位移判断 是否切换
        if (Math.abs(this.touch.offsetX) > 40) {
          if (this.touch.offsetX > 0) {
            // console.log("右滑")
            this.change(-1);
          } else if (this.touch.offsetX < 0) {
            // console.log("左滑")
            this.change(1);
          }
        } else {
          this.touch = getInitialTouchPoint();
        }
      }
    },

    change(type) {
      this.translateX -= type;
      this.curDate = this.curDate.add(type, "month");
      this.reloadCalendarData();
    },

    reloadDefDate() {
      let defDate = dayjs();
      if (this.defCalendarView == "selectedDate") {
        defDate = dayjs(this.selectedDateInfo);
      } else if (this.defCalendarView == "start") {
        if (this.selectionType == "range") {
          defDate = dayjs(this.rangeStart);
        }
        if (this.selectionType == "week") {
          defDate = dayjs(this.weekRangeStart);
        }
      } else if (this.defCalendarView == "end") {
        if (this.selectionType == "range") {
          defDate = dayjs(this.rangeEnd);
        }
        if (this.selectionType == "week") {
          defDate = dayjs(this.weekRangeEnd);
        }
      } else {
        defDate = dayjs(this.defCalendarView);
      }

      let _tmpDate = defDate.toDate();
      if (_tmpDate instanceof Date && !isNaN(_tmpDate.getTime())) {
        // 传入的日期有效
        this.curDate = defDate;
      }
    },

    reloadCalendarData() {
      // console.log("刷新日历数据");
      let _dateA = this.curDate.add(-1, "month");
      let _dateB = this.curDate.add(1, "month");

      let _minmaxConfig;
      if (this.precisionMinMax) {
        _minmaxConfig = {
          minDay: this.minDate,
          maxDay: this.maxDate,
        };
      }

      this.monthA = getFullMonthDaysInDate(
        _dateA,
        _minmaxConfig,
        this.weekStartDay
      );
      this.month0 = getFullMonthDaysInDate(
        this.curDate,
        _minmaxConfig,
        this.weekStartDay
      );
      this.monthB = getFullMonthDaysInDate(
        _dateB,
        _minmaxConfig,
        this.weekStartDay
      );

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

        let _rstart = this.m_rangeStart;
        let _rend = this.m_rangeEnd;

        if (this.m_selectionType == "week") {
          _rstart = this.m_weekRangeStart;
          _rend = this.m_weekRangeEnd;
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
                if (this.m_selectionType == "week" && !week.isSelected) {
                  week.isSelected = true;
                }
              }
            }
          }
        }
      } else {
        // 单选或多选
        let _tmp = this.m_selectedDateInfoArr;
        if (this.m_selectionType == "single") {
          _tmp = [this.m_selectedDateInfo];
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
    },
  },
};
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
