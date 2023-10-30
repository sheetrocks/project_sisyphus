const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const dotenv = require('dotenv');
dotenv.config();

const workbookID = process.env.WORKBOOK_ID;
const API_KEY = process.env.API_KEY;

axios.defaults.baseURL = "https://sheet.rocks/api/v1";
axios.defaults.headers.common['Authorization'] = `Bearer ${API_KEY}`;

async function uploadFiles(workbookId) {
  try {
    const folderPath = 'web/dist';
    const files = await fs.promises.readdir(folderPath);

    // Get the list of existing files
    const res = await axios.get(`/workbook/${workbookId}/files`);
    const existingFiles = res.data;

    const uploadPromises = files.map(async (file) => {

        // if file ends with.map, skip it
       if (file.endsWith('.map')) {
            return;
        }

      const filePath = path.join(folderPath, file);
      const content = await fs.promises.readFile(filePath);

      const existingFile = existingFiles.find((f) => f.Name === file);

      if (existingFile) {
        // Update existing file
        const fileId = existingFile.ID;
        console.log('Updating file:', existingFile.Name);
        const res = await axios.put(`/workbook/${workbookId}/files/${fileId}`, {
          Content: Buffer.from(content).toString('base64'),
        });
        console.log('File updated:', existingFile.Name);
      } else {
        // Upload new file
        console.log('Uploading file:', file);
        const res = await axios.post(`/workbook/${workbookId}/files`, {
          Name: file,
          Content: Buffer.from(content).toString('base64'),
          IsPublic: true,
        });
      }

      return res.data;
    });

    console.log('Awaiting uploads...');
    await Promise.all(uploadPromises);
    console.log('All files uploaded.');
  } catch (error) {
    console.error('Error uploading files:', error);
  }
}

async function uploadWebhooks(workbookId) {
  try {
    const folderPath = 'api/dist';
    const files = await fs.promises.readdir(folderPath);

    // Get the list of existing webhooks
    const res = await axios.get(`/workbook/${workbookId}/webhooks`);
    const existingWebhooks = res.data;

    const uploadPromises = files.map(async (file) => {
        if (file.endsWith('.map')) {
            return;
        }
      const filePath = path.join(folderPath, file);
      const fileStream = fs.createReadStream(filePath);
      const stats = fs.statSync(filePath);
      const fileSizeInBytes = stats.size;

      const form = new FormData();
      form.append('file', fileStream, { knownLength: fileSizeInBytes });

      const route = file.replace('.js', '');
      const existingWebhook = existingWebhooks.find((w) => w.Name === route);

      if (existingWebhook) {
        console.log('Updating webhook:', existingWebhook.Name);
        // Update existing webhook
        const webhookId = existingWebhook.ID;
        await axios.patch(
          `/workbook/${workbookId}/webhooks?webhookId=${webhookId}&name=${route}&route=${route}&filesChanged=true&runtime=javascript`,
          form,
          {
            headers: {
              ...form.getHeaders(),
              'Content-length': form.getLengthSync(),
            },
          }
        );
      } else {
        console.log('Uploading webhook:', route);
        // Create a new webhook
        await axios.put(
          `/workbook/${workbookId}/webhooks?name=${route}&route=${route}&runtime=javascript`,
          form,
          {
            headers: {
              ...form.getHeaders(),
              'Content-length': form.getLengthSync(),
            },
          }
        );
      }

      return { success: true, route };
    });

    await Promise.all(uploadPromises);
    console.log('All webhooks uploaded.');
  } catch (error) {
    console.error('Error uploading webhooks:', error);
  }
}

async function uploadAutomations(workbookId) {
  try {
      const folderPath = 'automations/dist';
      const files = await fs.promises.readdir(folderPath);

      // Get the list of existing automations
      const res = await axios.get(`/workbook/${workbookId}/automations`);
      const existingAutomations = res.data;

      const uploadPromises = files.map(async (file) => {
          if (!file.endsWith('.js')) {
              return;
          }

          const filePath = path.join(folderPath, file);
          const automationScript = await fs.promises.readFile(filePath, 'utf8');

          const automationName = file.replace('.js', '');
          const existingAutomation = existingAutomations.find((a) => a.Name === automationName);

          if (existingAutomation) {
              console.log('Updating automation:', existingAutomation.Name);
              // Update existing automation
              const automationId = existingAutomation.ID;
              await axios.patch(
                  `/workbook/${workbookId}/automations/${automationId}`,
                  {
                      Name: automationName,
                      Runtime: 'javascript',
                      AutomationText: automationScript,
                      RunOnSchedule: false
                  }
              );
          } else {
              console.log('Uploading new automation:', automationName);
              // Create a new automation
              await axios.post(
                  `/workbook/${workbookId}/automations`,
                  {
                      Name: automationName,
                      Runtime: 'javascript',
                      AutomationText: automationScript,
                      RunOnSchedule: false
                  }
              );
          }

          return { success: true, automationName };
      });

      await Promise.all(uploadPromises);
      console.log('All automations uploaded.');
  } catch (error) {
      console.error('Error uploading automations:', error);
  }
}


// Usage:
async function deploy() {
    await uploadFiles(workbookID);
    await uploadWebhooks(workbookID);
    await uploadAutomations(workbookID);
};

deploy();



