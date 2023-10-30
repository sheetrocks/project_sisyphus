// import axios
import axios from 'axios';
import { IsAuthorized } from './is-authorized';
import fs from 'fs';
import { User, Request, Task } from './globals';
import env from './env';
let workbookID = env.WORKBOOK_ID;
let API_KEY = env.API_KEY;
let taskSheetID = env.TASK_SHEET_ID;
let openaiKey = env.OPENAI_API_KEY;
axios.defaults.headers.common['Authorization'] = `Bearer ${API_KEY}`;
axios.defaults.headers.common['Content-Type'] = 'application/json';


async function main(req :Request) {
    let isAuthorizedResponse = await IsAuthorized(req.user);

    if(!isAuthorizedResponse.success) {
        return {success: false, message: isAuthorizedResponse.message};
    }

    // if method is not "GET", return
    if (req.method === "GET") {
        let res = await axios.get(`https://sheet.rocks/api/v1/workbook/${workbookID}/sheet/${taskSheetID}/db/findmany`, {
            data: { MatchFormula: `=COL[B] = "${req.user.email}"` },
        });

        if(res.status !== 200) {
            return {success: false, message: "System error - could not get tasks"};
        }
    
        let tasks = (res.data as string[][]).map((row) => {
            return {
                id: row[0],
                text: row[2],
                completed: row[3] === "TRUE",
            } as Task})

        return {success: true, tasks};
    }

    if(req.method === "PATCH") {
        console.log(`taskID: ${req.query.taskID}`);
        let res = await axios.get(`https://sheet.rocks/api/v1/workbook/${workbookID}/sheet/${taskSheetID}/db/findone`, {
            data : {
            MatchFormula: `=COL[A] = "${req.query.taskID}"`,
        }});

        if(res.status !== 200) {
            return {success: false, message: "System error - could not update task"};
        }

        if(res.data.length === 0) {
            return {success: false, message: "Task not found"};
        }

        let task = (res.data as string[][]).map((row) => {
            return {
                id: row[0],
                email: row[1],
                text: row[2],
                completed: row[3] === "TRUE",
                createdAt: row[4],
        } as Task})[0];


        // use replaceone to update the task, uses the same MatchFormula as findone and ReplaceWith string[][]
        let replaceRes = await axios.put(`https://sheet.rocks/api/v1/workbook/${workbookID}/sheet/${taskSheetID}/db/replaceone`, {
            MatchFormula: `=COL[A] = "${req.query.taskID}"`,
            ReplaceWith: [task.id, task.email, task.text, `${!task.completed}`, task.createdAt],
        });

        if(replaceRes.status !== 200) {
            return {success: false, message: "System error - could not update task"};
        }

        // if task.completed is false, generate 2 additional tasks from openai API
        if(!task.completed) {
            let generatedTasks = [];
            try {
                const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a hilariously incompetant assistant. You generated new tasks for the user. Include each task on a new line, and you start each task with a dash (-) character. Do not enumerate the tasks in any way (for example, "1." or "step 1"), just include the task itself.',
                        },
                        {
                            role: 'user',
                            content: `Write two tasks as next steps once you have finished this task: "${task.text}"`,
                        },
                    ],
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiKey}`,
                    },
                });
        
                // Getting the best option (first choice) and extracting the content field
                const bestOptionContent = response.data.choices[0].message.content;
        
                // Splitting the response content to get an array of two strings
                generatedTasks = bestOptionContent.split('\n').filter((task: string) => task.trim().length > 0).filter((task: string) => task.trim()[0] === '-').map((task: string) => task.trim().substring(1).trim());
            } catch (error) {
                console.log(error);
            }

            let createdAt = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }).replace(',', '');

            let appendRes = await axios.post(`https://sheet.rocks/api/v1/workbook/${workbookID}/sheet/${taskSheetID}/append`, {
                Cells: generatedTasks.map((text) => [`task-${Math.random().toString(36).substring(2, 12)}`, req.user.email, text, "FALSE", createdAt]),
            });
        }


        return {success: true};
    }

    if(req.method === "POST") {
        let newTask = {
            id : `task-${Math.random().toString(36).substring(2, 12)}`,
            email: req.user.email,
            text: req.body.newTaskText,
            completed: false,
            createdAt: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }).replace(',', '')
        }

        let res = await axios.post(`https://sheet.rocks/api/v1/workbook/${workbookID}/sheet/${taskSheetID}/append`, {
            Cells: [[newTask.id, newTask.email, newTask.text, `${newTask.completed}`, newTask.createdAt]],
        });

        if(res.status !== 200) {
            return {success: false, message: "System error - could not create task"};
        }

        return {success: true};
    }

    if(req.method === "DELETE") {
        let res = await axios.delete(`https://sheet.rocks/api/v1/workbook/${workbookID}/sheet/${taskSheetID}/db/deletemany`, {
            data : {
                MatchFormula: `=COL[B] = "${req.user.email}"`,
            } 
        });

        if(res.status !== 200) {
            return {success: false, message: "System error - could not delete tasks"};
        }
    }
    
    return {success: false, message: "Invalid method"};
}


const req = JSON.parse(fs.readFileSync('request.json', 'utf8')) as Request;

async function RunMain() {
    let res = await main(req);
    fs.writeFileSync('response.json', JSON.stringify(res));
}

RunMain();

