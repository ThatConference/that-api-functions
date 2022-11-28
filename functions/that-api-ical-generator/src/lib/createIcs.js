import debug from 'debug';
import icalGenerator from 'ical-generator';
import dayjs from 'dayjs';

const dlog = debug('that:function:that-api-ical-generator:createIcs');
const baseActivityUrl = 'https://that.us/activities';

export default ({ member, sessions }) => {
  dlog('create ical called on %d sessions', sessions?.length);
  const ical = icalGenerator({
    name: `${member.firstName}'s THAT.us favorites`,
    description: `Custom feed of sessions favorited by ${member.firstName} at THAT.us`,
    prodId: '//THAT Conference//THAT.us//EN',
  });

  // event info: https://sebbo2002.github.io/ical-generator/develop/reference/interfaces/ICalEventData.html
  const events = sessions.map(s => {
    let location = 'ONLINE';
    if (s.location?.location) {
      location = s.location.location;
    }
    const url = `${baseActivityUrl}/${s.id}/`;
    return {
      start: dayjs(s.startTime).toDate(),
      end: dayjs(s.startTime).add(s.durationInMinutes, 'm').toDate(),
      summary: s.title,
      description: s.shortDescription,
      location,
      url,
      status: 'CONFIRMED',
    };
  });

  return ical.events(events).toString();
};
