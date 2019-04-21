import React from 'react'
import { connect } from 'react-redux'

import Login from './Login.jsx'
import { Switch, Route, Link, withRouter } from 'react-router-dom';
import { Auth } from "aws-amplify";
import PubNubReact from 'pubnub-react';

import Camera from "./Camera.jsx"





class App extends React.Component {

    constructor(props) {
        super(props);
        this.pubnub = new PubNubReact({
            publish_key: "pub-c-00782af2-d126-4201-b58f-42af72ec526e",
            subscribe_key: "sub-c-bf5418c8-4fdf-11e9-aa90-a6f7447e8d57"
        });
  }



    async componentWillMount() {
            this.pubnub.subscribe({
                channel: 'stepper',
            });
            const script = document.createElement("script");
            script.src = "//player.cloud.wowza.com/hosted/bx8qy6vp/wowza.js"
            document.body.appendChild(script)
            // document.getElementById("arduinoScript").innerHTML = "<script id='player_embed' src='//player.cloud.wowza.com/hosted/kj5vhhf1/wowza.js' type='text/javascript'></script>"
    
        try {
            var user = await Auth.currentAuthenticatedUser();
            console.log(user)
            this.props.dispatch({ type: "AUTHENTICATE", payload: true })
            this.props.history.push("/")
        }
        catch (err) {
            this.props.dispatch({ type: "AUTHENTICATING", payload: false })
        }
    }

    async handleLogout() {
        await Auth.signOut();
        this.props.dispatch({ type: "AUTHENTICATE", payload: false })
        this.props.dispatch({ type: "AUTHENTICATING", payload: false })
    }

    render_nonloggin() {
        return (
            <div>
                <nav class="navbar navbar-expand-sm bg-dark navbar-dark fixed-top">
                    <a class="navbar-brand" href="/">HQFC</a>
                    <ul class="navbar-nav">
                        <li class="nav-item">
                            <a class="nav-link" href="Login">Login</a>
                        </li>
                    </ul>
                </nav>
                <br /> <br /> <br /> <br /> <br />
                <Login isAuthenticating={this.props.isAuthenticating} dispatch={this.props.dispatch} />

            </div>
        )
    }
    turnLeft(){
        this.pubnub.publish(
            {
                message: { 
                    dir: 'ccw'
                },
                channel: 'stepper',
            }, 
            function (status, response) {
                if (status.error) {
                    console.log(status)
                } else {
                    console.log("message Published w/ timetoken", response.timetoken)
                }
            }
          );
    }

    turnRight(){
        this.pubnub.publish(
            {
                message: { 
                    dir: 'cw'
                },
                channel: 'stepper',
            }, 
            function (status, response) {
                if (status.error) {
                    console.log(status)
                } else {
                    console.log("message Published w/ timetoken", response.timetoken)
                }
            }
          );
    }

    renderLoggin() {
        return (
            <div>
                <nav class="navbar navbar-expand-sm bg-dark navbar-dark fixed-top">
                    <a class="navbar-brand" href="/">HQFC</a>
                    <ul class="navbar-nav">
                        <li class="nav-item">
                            <a class="nav-link" onClick={this.handleLogout.bind(this)} href="/" >Logout</a>
                        </li>
                    </ul>
                </nav>
                <br /> <br /> <br /> <br /> <br />

                <div className="col-md-8 offset-md-2">

                    {/* ********* Raspberry Pi ******** */}
                    <Camera/>
                <br/> 



                    {/* ********* Arduino ******** */}
                    <div id="arduino" className = "row text-center">
            <div className= "col">
                <button class="btn btn-secondary button-blue" onClick = {this.turnLeft.bind(this)} id="left">Turn Left</button>
            </div>

            <div className = "col">
                <button class="btn btn-secondary button-blue" id="right" onClick = {this.turnRight.bind(this)}>Turn Right</button>
            </div>
            
            
        </div>

                </div>



                <br/> <br/> <br/> <br/> 
            </div>

        )
    }

    



    render() {
        return (
            <div>

                {this.props.authenticated ?
                    this.renderLoggin()
                    : this.render_nonloggin()}

                {/* <ScreenShot /> */}

            </div>

        )
    }

}

function mapStateToProps(centralState) {
    return {
        authenticated: centralState.authenticated,
        isAuthenticating: centralState.isAuthenticating,
    }
}


export default withRouter(connect(mapStateToProps)(App));