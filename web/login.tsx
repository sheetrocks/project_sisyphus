import React from 'react';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

interface LoginProps {
}

interface LoginState {
}

// a login component which contains an image and an iframe

class Login extends React.Component<LoginProps, LoginState> {
    constructor(props: LoginProps) {
        super(props);
    }

    render() {
        return <div className="login">
            <img src="logo.png" />
            <iframe src={`https://sheet.rocks/apps/${process.env.WORKBOOK_ID}/auth/login?primaryColor=B48673&returnTo=https%3A%2F%2Fsisyphus-todo.com`}></iframe> 
        </div>
    }
}

ReactDOM.render(
    <Login />,
    document.getElementById('root')
);