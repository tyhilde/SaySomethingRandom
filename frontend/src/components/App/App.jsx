import React from 'react'
import Authentication from '../../util/Authentication/Authentication'

import './App.css'

export default class App extends React.Component {
  constructor(props) {
    super(props)
    this.Authentication = new Authentication()
    this.fetchPhrases = this.fetchPhrases.bind(this);

    //if the extension is running on twitch or dev rig, set the shorthand here. otherwise, set to null. 
    this.twitch = window.Twitch ? window.Twitch.ext : null
    this.state = {
      finishedLoading: false,
      theme: 'light',
      isVisible: true,
      phrases: []
    }
  }

  contextUpdate(context, delta) {
    if (delta.includes('theme')) {
      this.setState(() => {
        return { theme: context.theme }
      })
    }
  }

  visibilityChanged(isVisible) {
    this.setState(() => {
      return {
        isVisible
      }
    })
  }

  componentDidMount() {
    if (this.twitch) {
      this.twitch.onAuthorized((auth) => {
        this.Authentication.setToken(auth.token, auth.userId)
        if (!this.state.finishedLoading) {
          // if the component hasn't finished loading (as in we've not set up after getting a token), let's set it up now.

          // now we've done the setup for the component, let's set the state to true to force a rerender with the correct data.
          this.setState(() => {
            return { finishedLoading: true }
          })
        }
      })

      this.twitch.listen('broadcast', (target, contentType, body) => {
        this.twitch.rig.log(`New PubSub message!\n${target}\n${contentType}\n${body}`)
        // now that you've got a listener, do something with the result... 

        // do something...

      })

      this.twitch.onVisibilityChanged((isVisible, _c) => {
        this.visibilityChanged(isVisible)
      })

      this.twitch.onContext((context, delta) => {
        this.contextUpdate(context, delta)
      })

      this.fetchPhrases();
    }
  }

  componentWillUnmount() {
    if (this.twitch) {
      this.twitch.unlisten('broadcast', () => console.log('successfully unlistened'))
    }
  }

  // TODO: Move to a different file
  fetchPhrases() {
    const ROOTAPIURL = "http://127.0.0.1:3000/"; //"https://rplbgv9ts3.execute-api.us-east-1.amazonaws.com/prod/";
    const channelId = "123455";
    const url = `${ROOTAPIURL}phrases?channelId=${channelId}`;

    this.setState({ finishedLoading: false }); // use a diff state variable for this

    fetch(url)
      .then(response => response.json())
      .then(responseJson => {
        console.log('resposnjson', responseJson);
        this.setState({ phrases: responseJson });
        this.setState({ finishedLoading: true });
      })

    // console.log('this.state.phrase', this.state.phrases);
  }

  render() {
    const loadingState = !this.state.finishedLoading && (
      <div>
        SPINNER
        <h5>Loading</h5>
      </div>
    );

    const renderList = (
      <ul>
        {this.state.phrases.map(item => <li key={item.uuid}>{item.phrase}</li>)}
      </ul>
    );

    const fetchButton = (
      <button onClick={this.fetchPhrases}>Fetch the results</button>
    )

    if (this.state.finishedLoading && this.state.isVisible) {
      return (
        <div className="App">
          {renderList}
          {fetchButton}
        </div>
      )
    } else {
      return (
        <div className="App">
          {loadingState}
        </div>
      )
    }

  }
}


/* EXAMPLE STUFF
const renderPhraseList = (
    <div>Hi</div>
);
const example = (
    <div className={this.state.theme === 'light' ? 'App-light' : 'App-dark'} >
        <p>Hello world2!</p>
        {renderPhraseList}
        <p>My token is: {this.Authentication.state.token}</p>
        <p>My opaque ID is {this.Authentication.getOpaqueId()}.</p>
        <div>{this.Authentication.isModerator() ? <p>I am currently a mod, and here's a special mod button <input value='mod button' type='button'/></p>  : 'I am currently not a mod.'}</div>
        <p>I have {this.Authentication.hasSharedId() ? `shared my ID, and my user_id is ${this.Authentication.getUserId()}` : 'not shared my ID'}.</p>
    </div>
);
*/