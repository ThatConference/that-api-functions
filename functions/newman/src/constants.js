import { constants as apiConstants } from '@thatconference/api';

const constants = {
  ...apiConstants,
};

if (!constants.THAT.MESSAGING) constants.THAT.MESSAGING = {};
constants.THAT.MESSAGING.READ_QUEUE_RATE = 4;

export default constants;
