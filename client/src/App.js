import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();

import AdminContainer from './admin/AdminContainer';

class App extends Component {
  render() {
    return (
      <MuiThemeProvider>
        <AdminContainer />
      </MuiThemeProvider>
    );
  }
}

export default App;

/*
<div className="App">
  <div className="App-header">
    <img src={logo} className="App-logo" alt="logo" />
    <h2>Welcome to React</h2>
  </div>
  <p className="App-intro">
    To get started, edit <code>src/App.js</code> and save to reload.
  </p>
</div>
 */
