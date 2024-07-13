<template>
  <div id="app">
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
            <span v-if="index == weekTilesConfigIdx">❤️</span>
            {{ item.content.join("、") }}
          </li>
        </ul>
      </div>
    </section>
    <Calendar
      :weekIndexTitle="weekIndexTitle"
      :weekStartDay="weekStartDay"
      :weekTitles="weekTitles"
      :minDate="calendarMinDate"
      :maxDate="calendarMaxDate"
      precisionMinMax
      :selectionType="dateSelectType"
      :selectedDateInfo="selectedDateInfo"
      :selectedDateInfoArr="selectedDateInfoArr"
      :rangeStart="rangeStart"
      :rangeEnd="rangeEnd"
      :weekRangeStart="weekRangeStart"
      :weekRangeEnd="weekRangeEnd"
      :maxSelectDayCount="10"
      defCalendarView="start"
      @didSelectedDate="canlendarHandle"
      @invalidSelect="handleInvalidSelect"
    />
  </div>
</template>

<script>
import dayjs from "dayjs";
import Calendar from "@/components/Calendar.vue";

const wtitlesConfig = () => [
  {
    startIdx: 0,
    content: ["日", "一", "二", "三", "四", "五", "六"],
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
];
export default {
  name: "App",
  components: {
    Calendar,
  },
  data() {
    return {
      // demo
      typeBtns: ["单选", "多选", "范围", "按周"],
      curTypeIdx: 0,
      showWeekOrder: true,
      dateSelectType: "single",
      weekStartDay: 0,

      weekTitlesConfig: wtitlesConfig(),
      weekTilesConfigIdx: 0,
      calendarMinDate: undefined,
      calendarMaxDate: undefined,

      // calendar default data
      selectedDateInfo: "2022-09-15",
      selectedDateInfoArr: ["2022-09-13", "2022-09-02", "2022-09-22"],
      rangeStart: "2022-09-05",
      rangeEnd: "2023-09-22",
      weekRangeStart: "2022-09-11",
      weekRangeEnd: "2022-09-17",
    };
  },

  computed: {
    weekIndexTitle() {
      let t = "";
      if (this.showWeekOrder) {
        t = "周";
      }
      return t;
    },

    weekTitles() {
      return this.weekTitlesConfig[this.weekTilesConfigIdx].content;
    },
  },

  mounted() {
    // this.calendarMaxDate = "2024-01-01";

    this.calendarMinDate = "2024-07-03";
    this.calendarMaxDate = dayjs("2024-07-25");
  },

  methods: {
    onTypeClick(idx) {
      this.curTypeIdx = idx;
      let type = "single";
      switch (idx) {
        case 1:
          type = "multiple";
          break;
        case 2:
          type = "range";
          break;
        case 3:
          type = "week";
          break;
        default:
          break;
      }
      this.dateSelectType = type;
    },

    handleCellClick(idx) {
      for (let index = 0; index < this.weekTitlesConfig.length; index++) {
        const item = this.weekTitlesConfig[index];
        if (idx == index) {
          this.weekStartDay = item.startIdx;
          this.weekTilesConfigIdx = idx;
        }
      }
    },

    // 日历回调
    canlendarHandle(dateInfo, actionType) {
      console.log("dateInfo", dateInfo);
      console.log("actionType", actionType);
    },

    handleInvalidSelect(info) {
      console.log('info',info)
    }
  },
};
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
