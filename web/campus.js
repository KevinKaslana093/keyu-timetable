// School-published timetable, also matches the user-provided campus screenshots.
export const CAMPUS_SOURCE='https://www2.scut.edu.cn/_upload/article/files/8d/32/1dbbcf9a47729b8e2b85e4c02e01/a25ee229-19e8-4f09-afd5-3ea70b02bec6.pdf';
export const CAMPUS_SLOTS={
  wushan:['08:00-08:45','08:55-09:40','10:00-10:45','10:55-11:40','14:30-15:15','15:25-16:10','16:20-17:05','17:15-18:00','19:00-19:45','19:55-20:40','20:50-21:35'],
  university:['08:50-09:35','09:40-10:25','10:40-11:25','11:30-12:15','14:00-14:45','14:50-15:35','15:45-16:30','16:35-17:20','19:00-19:45','19:55-20:40','20:50-21:35']
};
export const campusForSlots=slots=>Object.keys(CAMPUS_SLOTS).find(key=>JSON.stringify(CAMPUS_SLOTS[key])===JSON.stringify(slots))||'custom';
export const CAMPUS_OPTIONS=[['custom','自定义 / 保留当前时间'],['university','大学城 / 国际校区（11 节）'],['wushan','五山校区（11 节）']];
