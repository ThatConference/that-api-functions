export default {
  sessionCreated: ({ session }) => {
    const payload = {
      text: `New Session: ${session.title}`,
      attachements: [
        {
          fallback: `Session ${session.title} created. Begins at ${session.startTime} (UTC)`,
          color: '#36a64f',
        },
      ],
    };
  },
  sessionUpdated: () => {},
  sessionCancelled: () => {},
};
/*
{
	"channel": "@brettski",
	"username": "THAT.us Session Bot",
	"icon_emoji": ":that-blue:",
	"text": ":that-blue: New Activity Added 🎉",
	"attachments": [
		{
			"color":"#26529a",
			"blocks": [
				{
					"type": "section",
					"text": {
						"type": "mrkdwn",
						"text": "*<https://that.us/sessions/V02IgIZpMwgJATKCjoCM|Brett's test 🧪 activity*>*"
					}
				},
				{
					"type": "section",
					"fields": [
						{
							"type": "mrkdwn",
							"text": "*Start Time:*\n<!date^1598691600^{date} @ {time}|time is hard>"
						},
						{
							"type": "mrkdwn",
							"text": "*Duration:*\n60 minutes"
						}
					]
				},
				{
					"type": "section",
					"text": {
						"type": "mrkdwn",
						"text": "*Description:*\nThis is really long description text we use for describing the THAT.us Activity provided to us. And the story continues on and on until the author determines they have said enough and feel they have describe what they wanted."
					}
				},
				{
					"type": "section",
					"text": {
						"type": "mrkdwn",
						"text": "*Submitted by:*\n<https://www.thatconference.com/member/brettski|Brett Slaski>"
					},
					"accessory": {
						"type": "image",
						"image_url": "https://that.imgix.net/members/a038ca57-eb03-4364-9645-c8b51619f454.jpeg",
						"alt_text": "Brett Slaski"
					}
				}
			]
		}
	]
}
*/
