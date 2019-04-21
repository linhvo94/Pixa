import React from 'react'
import { Auth } from "aws-amplify";
import { withRouter } from 'react-router-dom'
import { Switch, Route, Link } from 'react-router-dom';



class Login extends React.Component {

    constructor() {
        super()
        this.state = { username: "", pwd: "", isAuthenticating: true }
    }

    componentWillReceiveProps(props){
        this.setState({isAuthenticating: props.isAuthenticating})
    }

    handleChange(e) {
        this.setState({ [e.target.name]: e.target.value })
    }

    
    

    async handleSubmit(event) {
        event.preventDefault();
        document.getElementById("error_account").innerHTML = ""
        try {
            await Auth.signIn(this.state.username, this.state.pwd);
            console.log("Log in")
            this.props.dispatch({ type: "AUTHENTICATE", payload: true })
            // this.forceUpdate()
            setTimeout(
                function(){
                    window.location.reload()
                }.bind(this),500
            )
            
            // window.location = "http://localhost:8080/";
        } catch (e) {
            document.getElementById("error_account").innerHTML = " <br/>Wrong username or password"
        }
    }


    render() {
        return (
            <div>
                <div>
                    {this.state.isAuthenticating?
                "Loading user.... Please wait a second"
                : <div className="col-md-8 offset-md-2">
                <div className="card">
                    <div className="card-header">
                    <h3 className="text-center">HQFC</h3> </div>
                    
                    <div className="card-body">
                        <div className="form-group" onChange={this.handleChange.bind(this)}>
                            <label>Username </label>
                            <input
                                placeholder="Please enter your user name"
                                className="form-control"
                                type="text"
                                name="username"
                            />

                            <br />
                            <label>Password </label>
                            <input
                                value={this.state.pwd}
                                placeholder="Please enter your password"
                                className="form-control"
                                type="password"
                                name="pwd"
                            />

                            
                            <div className="error" id="error_account"></div>

                        </div>
                    </div>
                    <div className="card-footer">
                    
                    <button className="btn btn-success float-right" onClick={this.handleSubmit.bind(this)}><i className="fa fa-sign-in"></i> Log in</button>
                     


                    </div>
                </div>
            </div>
            }
                    
                </div>
            </div>
        )
    }
}
export default withRouter(Login)
