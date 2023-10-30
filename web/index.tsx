import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faQuestion, faTimes } from '@fortawesome/free-solid-svg-icons';
import { User, AccessError, Task } from '../api/globals';

axios.defaults.baseURL = `https://sheet.rocks/workbook/${process.env.WORKBOOK_ID}/webhooks/authenticated`;
axios.defaults.validateStatus = () => true;
axios.defaults.withCredentials = true;

axios.defaults.validateStatus = function () {
  return true;
};


interface AppProps {
}

interface AppState {
  tasks : Task[];
  user: User | null;
  newTask : string;
}

// here's a react App component that renders the text "Sisyphus"

export class App extends Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);

    this.addTasks = this.addTasks.bind(this);
    this.toggleTask = this.toggleTask.bind(this);
    this.getTasks = this.getTasks.bind(this);
    this.getUserInfo = this.getUserInfo.bind(this);
    this.clearTasks = this.clearTasks.bind(this);

    this.state = {
      tasks: [],
      user: null,
      newTask : ""
    };
  }

  componentDidMount() {
    this.getUserInfo();
    this.getTasks();
  }

  async getUserInfo() {
    let res = await axios.get(`/user-info`); 

    if(!(res.data && res.data.success)) {
      // if authentication fails, redirect to the login page
      window.location.href = `https://sisyphus-todo.com/login.html`;
      return;
    }

    let user = res.data.user as User;
    this.setState({user});
  }

  async getTasks() {
    let currentTasks = this.state.tasks.length;
    let res = await axios.get(`/task`);

    let newTasksLength = res.data.tasks.length;

    if(newTasksLength === (currentTasks + 2)) {
      // set newlyGenerated to true for the last 2 tasks
      res.data.tasks[newTasksLength - 1].newlyGenerated = true;
      res.data.tasks[newTasksLength - 2].newlyGenerated = true;
    }

    this.setState({ tasks: res.data.tasks})
  }

  async addTasks(e : React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // optimistically update
    let newTask = {text: this.state.newTask, completed: false} as Task;
    this.setState({tasks: [...this.state.tasks, newTask], newTask: ""});

    // send to server
    await axios.post(`/task`, { newTaskText: newTask.text });
    this.getTasks();
  }

  async toggleTask(task :Task) {
    // optimistic update
    task.completed = !task.completed;
    this.setState({tasks: this.state.tasks});
    await axios.patch(`/task?taskID=${task.id}`);
    this.getTasks();
  }

  async clearTasks() {
    // optimistic update
    this.setState({tasks: []});

    await axios.delete(`/task`);
    this.getTasks();
  }

  render() {
    return (
      <div className="todo-app">
        <h1>To Do:</h1>
        <a className="start-over" onClick={this.clearTasks}>Start Over</a>

        <table className="task-list">
          <tbody>
          {this.state.tasks.map((task) => (
            <tr className={`task ${task.completed && 'completed'} ${task.newlyGenerated && 'animate__animated animate__bounceInUp'}`}>
              <td><input type="checkbox" checked={task.completed} onChange={() => this.toggleTask(task)} /></td>
              <td>{task.text}</td>
            </tr>
          ))}
          </tbody>
          </table>

        <form className="add-task" onSubmit={this.addTasks}>
          <input type="text" placeholder="Add a task" onChange={e => this.setState({newTask: e.target.value})} value={this.state.newTask} />
          <button type="submit">+</button>
        </form>
      </div>
    );
  }
}

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.render(<App />, rootElement);
} else {
  console.error('Could not find element with ID "root"');
}
