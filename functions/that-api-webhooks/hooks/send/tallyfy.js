const Sentry = require('@sentry/node');
const axios = require('axios');
const tallyfyProcesses = require('../../data/tallyfyProcesses.json');

const tallyfyIds = {};
tallyfyIds.isMissingData = false;
if (process.env.TALLYFY_ORG_ID && process.env.TALLYFY_API_BASE && process.env.TALLYFY_ACCESS_TOKEN) {
  tallyfyIds.orgId = process.env.TALLYFY_ORG_ID;
  tallyfyIds.apiBase = process.env.TALLYFY_API_BASE;
  tallyfyIds.accessToken = process.env.TALLYFY_ACCESS_TOKEN;
} else {
  tallyfyIds.isMissingData = true;
}

const axiosRequestConfig = {
  headers: {
    Authorization: `Bearer ${tallyfyIds.accessToken}`,
  },
};

// Can only add 1 guest at this time
const updateStepPayload = {
  owners: {
    guests: [''],
  },
};

const sendTallyfy = {
  send: async docusign => {
    if (tallyfyIds.isMissingData) {
      Sentry.captureMessage('Missing environment variable data for Tallyfy', 'critical');
      console.error(`Missing environment variable data for TallyFy`);
      return undefined;
    }
    // locate Tallyfy process
    const process = tallyfyProcesses.find(p => {
      return p.docusignTemplates.includes(docusign.templateName);
    });
    if (!process) {
      return undefined;
    }
    // build create payload
    const createRunPayload = sendTallyfy.buildCreatePayload(docusign, process);
    // Create run at Tallyfy
    const rundata = await sendTallyfy.createRun(createRunPayload);
    if (!rundata) {
      return undefined;
    }
    // Next query run to get task id's created.
    const runtasks = await sendTallyfy.getTasksFromRun(rundata.id);
    if (!runtasks) {
      return undefined;
    }
    // Pre-defined steps we want to update, need task id's for these
    const { stepsToUpdate } = process;
    const tasksToUpdate = [];
    runtasks.forEach(task => {
      if (stepsToUpdate.find(s => s.id === task.step_id)) {
        tasksToUpdate.push(task);
      }
    });
    // Now we update each taskToUdpdate using PUT request
    updateStepPayload.owners.guests[0] = docusign.email;

    return sendTallyfy.updateManyTasks(rundata.id, tasksToUpdate).then(result => {
      if (!result.tasks) {
        return result;
      }
      return {
        process: createRunPayload.name,
        summary: createRunPayload.summary,
        runId: rundata.id,
        checklist_id: process.checklistId,
        createdAt: rundata.created_at,
        tasksUpdated: result.tasks,
      };
    });
  },
  buildCreatePayload: (docusign, process) => {
    const payload = { prerun: {} };
    payload.name = `${docusign.organization} - ${docusign.event} ${docusign.eventYear}`;
    payload.checklist_id = process.checklistId;
    payload.summary = `${docusign.organization} Onboarding Process ${docusign.event} ${docusign.eventYear}`;
    payload.prerun[process.preloadFields.organization] = docusign.organization;
    payload.prerun[process.preloadFields.partnershipLevel] = {
      id: 0,
      text: docusign.partnerLevel,
    };
    payload.prerun[process.preloadFields.primaryContactName] = docusign.fullName;
    payload.prerun[process.preloadFields.primaryContactEmail] = docusign.email;
    payload.prerun[process.preloadFields.event] = docusign.event;
    return payload;
  },
  createRun: postPayload => {
    const uri = `${tallyfyIds.apiBase}/organizations/${tallyfyIds.orgId}/runs`;
    return axios
      .post(uri, postPayload, axiosRequestConfig)
      .then(result => {
        if (result.status < 200 || result.status > 299) {
          console.error(`Issue sending hook to Tallyfy. Status: ${result.status}`);
          Sentry.captureMessage(`Issue sending hook to Tallyfy:\n${result}`);
          return undefined;
        }
        return result.data.data;
      })
      .catch(err => {
        console.error(`Exception sending hook to tally:\n${err}`);
        Sentry.captureException(err);
        Sentry.configureScope(scope => {
          scope.setExtra('postPayload', postPayload);
        });
        return undefined;
      });
  },
  getTasksFromRun: runid => {
    const uri = `${tallyfyIds.apiBase}/organizations/${tallyfyIds.orgId}/runs/${runid}?with=tasks`;
    return axios
      .get(uri, axiosRequestConfig)
      .then(r => {
        if (r.status < 200 || r.status > 299) {
          console.error(`Issue sending GET to tallyfy. status: ${r.status}`);
          Sentry.captureMessage(`Issue sending PUT to tallyfy: ${r}`);
          return undefined;
        }
        if (r.data && r.data.data && r.data.data.tasks) {
          return r.data.data.tasks.data;
        }
        return undefined;
      })
      .catch(e => {
        console.error(`Exception sending GET to tallyfy:\n${uri}\n${e}`);
        Sentry.captureException(e);
        return undefined;
      });
  },
  updateTask: (runid, task) => {
    const uri = `${tallyfyIds.apiBase}/organizations/${tallyfyIds.orgId}/runs/${runid}/tasks/${task.id}`;
    return axios
      .put(uri, updateStepPayload, axiosRequestConfig)
      .then(result => {
        if (result.status < 200 || result.status > 299) {
          console.error(`Issue sending PUT to tallyfy. status: ${result.status}`);
          Sentry.captureMessage(`Issue sending PUT to tallyfy: ${result}`);
          return {};
        }
        return result.data.data;
      })
      .catch(err => {
        console.error(`Exception sending put to Tallyfy:\n${err}`);
        Sentry.captureException(err);
        return {};
      });
  },
  updateManyTasks: (runid, tasklist) => {
    const reqFunctions = [];
    const config = axiosRequestConfig;
    // Config so Promise will not be rejected for status <200, >299
    config.validateStatus = () => {
      return true;
    };
    tasklist.forEach(task => {
      const uri = `${tallyfyIds.apiBase}/organizations/${tallyfyIds.orgId}/runs/${runid}/tasks/${task.id}`;
      reqFunctions.push(axios.put(uri, updateStepPayload, config));
    });
    return axios
      .all(reqFunctions)
      .then(responses => {
        const ret = { tasks: [] };
        const d = {};
        responses.forEach(response => {
          d.response = response.status;
          if (response.data.data) {
            d.taskid = response.data.data.id;
            d.tasktitle = response.data.data.title;
          }
          d.uri = response.config.url;
          ret.tasks.push(d);
        });
        return ret;
      })
      .catch(err => {
        console.error(`Issue updating tasks for run ${runid}:\n${err}`);
        Sentry.captureException(err);
        return {};
      });
  },
};

module.exports = sendTallyfy;
