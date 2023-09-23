import debug from 'debug';
import icalGenerator from 'ical-generator';
import dayjs from 'dayjs';

const dlog = debug('that:function:that-api-ical-generator:createIcs');
const baseActivityUrlOnline = 'https://that.us/activities';
const baseActivityUrlInPerson = 'https://thatconference.com/activities';

export default ({ member, sessions }) => {
  dlog('create ical called on %d sessions', sessions?.length);
  const ical = icalGenerator({
    name: `${member.firstName}'s THAT.us favorites`,
    description: `Custom feed of sessions favorited by ${member.firstName} at THAT.us`,
    prodId: '//THAT Conference//THAT//EN',
  });

  // event info: https://sebbo2002.github.io/ical-generator/develop/reference/interfaces/ICalEventData.html
  const events = [];
  for (let i = 0; i < sessions.length; i += 1) {
    const session = sessions[i];
    // If there isn't a start time (date), you can't add to a calendar
    if (dayjs(session.startTime).isValid()) {
      let location = `See activity's details`;
      let url = `${baseActivityUrlOnline}/${session.id}`;
      if (session.location?.destination) {
        location = session.location.destination;
        if (session.location?.isOnline !== true) {
          url = `${baseActivityUrlInPerson}/${session.id}/`;
        }
      }

      events.push({
        start: dayjs(session.startTime).toDate(),
        end: dayjs(session.startTime)
          .add(session.durationInMinutes, 'm')
          .toDate(),
        summary: session.title,
        description: session.shortDescription,
        location,
        url,
        status: 'CONFIRMED',
      });
    }
  }

  return ical.events(events).toString();
};
