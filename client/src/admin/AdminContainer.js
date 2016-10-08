import React, {Component} from 'react';
import AppBar from 'material-ui/AppBar';

import Drawer from 'material-ui/Drawer';
import MenuItem from 'material-ui/MenuItem';

import CircularProgress from 'material-ui/CircularProgress';

class AdminContainer extends Component {
  constructor(props) {
    super(props);

    this.state = {open: false};
  }

  handleToggle = () => this.setState({open: !this.state.open});

  handleClose = () => this.setState({open: false});

  render() {
    return(
      <div>
      <AppBar
        title="SMART Web"
        onLeftIconButtonTouchTap={this.handleToggle}
      />
      
      <CircularProgress size={80} thickness={5} />

      <Drawer
          docked={false}
          width={200}
          open={this.state.open}
          onRequestChange={(open) => this.setState({open})}
        >
          <MenuItem onTouchTap={this.handleClose}>Menu Item</MenuItem>
          <MenuItem onTouchTap={this.handleClose}>Menu Item 2</MenuItem>
        </Drawer>
      </div>
    );
  }
}

export default AdminContainer;
