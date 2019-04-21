import React from 'react'
import ReactDOM from 'react-dom'
import App from './App.jsx'
import {combineReducers, createStore, applyMiddleware} from 'redux'
import {Provider} from 'react-redux'
import thunk from 'redux-thunk'
import config from "./config.jsx";
import Amplify from 'aws-amplify';
import { BrowserRouter as Router } from "react-router-dom";


//--------------------------------------------------- ESTATE---------------------------------------------------------------------
Amplify.configure({
    Auth: {
        mandatorySignIn: true,
        region: config.cognito.REGION,
        userPoolId: config.cognito.USER_POOL_ID,
        identityPoolId: config.cognito.IDENTITY_POOL_ID,
        userPoolWebClientId: config.cognito.APP_CLIENT_ID
    }
});

function authenticated(state = false, action) {
    if (action.type === "AUTHENTICATE") {
        return action.payload
    }
    else return state
}

function isAuthenticating(state = true, action){
    if (action.type === "AUTHENTICATING") {
        return action.payload
    }
    else return state
}

var centralState = combineReducers({
    authenticated, isAuthenticating
})

var store = createStore(centralState, applyMiddleware(thunk))


ReactDOM.render(
<Provider store={store}>    
<Router>
            <App />
            </Router>
</Provider>    
    , document.getElementById('app')

)