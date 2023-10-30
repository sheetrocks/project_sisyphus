// import axios
import axios from 'axios';
import { IsAuthorized } from './is-authorized';
import fs from 'fs';
import { User, Request } from './globals';
import env from './env';
let workbookID = env.WORKBOOK_ID;
let API_KEY = env.API_KEY;
let userSheetID = env.USER_SHEET_ID;
axios.defaults.headers.common['Authorization'] = `Bearer ${API_KEY}`;
axios.defaults.headers.common['Content-Type'] = 'application/json';


async function main(req :Request) {
    // if method is not "GET", return
    if (req.method !== "GET") {
        return;
    }

    let isAuthorizedResponse = await IsAuthorized(req.user);

    if(!isAuthorizedResponse.success) {
        return {success: false, message: isAuthorizedResponse.message};
    }

    let url = `https://sheet.rocks/api/v1/workbook/${workbookID}/sheet/${userSheetID}/cells?range=A2:B`;
    let res = await axios.get(url, {validateStatus: () => true});

    // res.data comes back as a 2D array with the columns Email, Team, First Name, Last Name, Phone, User type
    // format this into a list of objects with the keys email, team, firstName, lastName, phone, userType
    let users = res.data.map((row) => {
        return {
            email: row[0],
            name: row[1],
        } as User
    }) as User[];
    
    // find the user that matches the email in the request
    let user = users.find((user) => user.email === req.user.email);
    
    return {success: true, user};
}


const req = JSON.parse(fs.readFileSync('request.json', 'utf8')) as Request;

async function RunMain() {
    let res = await main(req);
    fs.writeFileSync('response.json', JSON.stringify(res));
}

RunMain();

