import dayjs from "dayjs";

/**
 * 给定一个日期 按照规则 获取是当年第几周
 * 规则：一年的第一个周开始日  算第1周
 * 比如 周一作为第一天， 则当年第一个周一所在周 算第一周
 *
 * @param {*} date
 * @param {*} weekStartDay 周开始日： 0, 1, 2, 3, 4, 5, 6
 * @returns 该日期在当年的 周序
 */
export function getWeekOfYear(date, weekStartDay = 0) {
  /**
   * 计算给定日期 距离 当年第一个周开始日 的天数/7, 向下取整 +1
   */

  // 当年第一个 开始周 的日期
  let date0 = dayjs(date).startOf("year");
  let day = date0.day();

  if (day > weekStartDay) {
    // 已经 > 周开始日， + 几天
    let diff = 7 + weekStartDay - day;
    date0 = date0.add(diff, "day");
  } else {
    let diff = weekStartDay - day;
    date0 = date0.add(diff, "day");
  }
  let diffDays = dayjs(date).diff(date0, "day");

  if (diffDays < 0) {
    // 需要计算的日期 在第一周之前， 算上一年的 12月31号的 周
    let lastYaarLastDay = date0.add(-1, "year").endOf("year");
    return getWeekOfYear(lastYaarLastDay, weekStartDay);
  }

  let weekIndex = Math.floor(diffDays / 7);
  return weekIndex + 1;
}

/**
 * 获取一个月的完整 日历， 为了视觉稳定， 每个月都是6行
 * @param {*} date0 为 dayjs可识别对象即可
 * @param {*} weekStartDay 为 周开始日： 0, 1, 2, 3, 4, 5, 6
 * @returns 一个月的完整日历
 */
export function getFullMonthDaysInDate(date0, weekStartDay = 0) {
  let dateFormat = "YYYY-MM-DD";

  let _date0 = dayjs(date0).date(1); // 设置为1号
  let firstDay = _date0.day(); // 第一天周几
  if (firstDay != weekStartDay) {
    /**
     * 如果设置周日开始， 1号刚好周日， 则不需要补上个月的
     * 否则设置的 周几开始， 1号周日，则需要按7算
     */
    if (firstDay == 0) {
      firstDay = 7;
    }
  }
  let fullMonthWeeks = [];
  let tmp = [];
  for (let i = 0; i < 7 * 6; i++) {
    let diffDay = -1 * firstDay + i + weekStartDay;
    let d = _date0.add(diffDay, "day");
    let _dayObj = {
      orign: d,
      dateObj: d.toDate(),
      dateInfo: d.format(dateFormat),
      isGray: false,
      isToday: d.isSame(dayjs(), "day"),
    };
    if (!d.isSame(_date0, "month")) {
      _dayObj.isGray = true;
    }
    tmp.push(_dayObj);

    if (tmp.length == 7) {
      let weekObj = {
        weekIdx: getWeekOfYear(tmp[0].dateInfo, weekStartDay),
        days: [...tmp],
      };
      fullMonthWeeks.push(weekObj);
      tmp.length = 0;
    }
  }

  // console.log("fullMonthWeeks", fullMonthWeeks)
  return fullMonthWeeks;
}
