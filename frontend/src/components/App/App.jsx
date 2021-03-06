import React from 'react'
import Spinner from 'react-bootstrap/Spinner';
import Button from 'react-bootstrap/Button';

import Authentication from '../../util/Authentication/Authentication';
import { fetchPhrases, FAILED_TO_FETCH } from '../../dataclient/dataclient';

import { TabHeader } from '../tabHeader/tab-header';
import OtsWhite from "../../assets/ots-white.png";

import 'bootstrap/dist/css/bootstrap.min.css';
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
      isLoadingPhrases: false,
      theme: 'light',
      isVisible: true,
      phrases: [],
      currentChannelId: '',
      productSku: '',
      allowModControl: true,
      isInitialFetchCompleted: false
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
        if (!this.state.finishedLoading) { // TODO: Figure out if I need to use finishedLoading??
          // if the component hasn't finished loading (as in we've not set up after getting a token), let's set it up now.

          // now we've done the setup for the component, let's set the state to true to force a rerender with the correct data.
          this.setState(() => {
            return { finishedLoading: true, currentChannelId: auth.channelId }
          })
        }
        
        // We should only call fetchPhrases after onAuthorized is called, so that we can get channelId from auth
        // onAuthorized can and will be called periodically, and is also called when onTransactionComplete is called
        // because of this we want to only call fetchPhrases if we don't already have phrases loaded
        // the PubSub events are responsible for keeping the list up to date
        if (!this.state.isInitialFetchCompleted) {
          this.fetchPhrases();
        }
      })

      // TODO: This might help a bit https://dev.twitch.tv/docs/tutorials/extension-101-tutorial-series/file-structure
      this.twitch.listen('broadcast', (target, contentType, body) => {
        console.log('PUBSUB LISTEN event fired');
        this.twitch.rig.log(`New PubSub message!\n${target}\n${contentType}\n${body}`)
        const EventType = {
          COMPLETED_PHRASE_EVENT: 'COMPLETED_PHRASE_EVENT',
          SEND_PHRASE_EVENT: 'SEND_PHRASE_EVENT'
        };

        /**
         * ParsedEvent should look like: 
         * {
         *    eventType: Type EventType,
         *    payload: {message attributes} 
         * }
         */
        const parsedEvent = JSON.parse(body);
        console.log('parsedEvent', parsedEvent);

        if (parsedEvent.eventType === EventType.SEND_PHRASE_EVENT) {
          this.addPhraseToList(parsedEvent.payload);
        } else if (parsedEvent.eventType === EventType.COMPLETED_PHRASE_EVENT) {
          this.removePhraseFromList(parsedEvent.payload);
        } else {
          // Something gone wrong, there aint no other events. yet...
        }
      })

      this.twitch.onVisibilityChanged((isVisible, _c) => {
        this.visibilityChanged(isVisible)
      })

      this.twitch.onContext((context, delta) => {
        console.log('onContext called', context);
        this.contextUpdate(context, delta)
      })

      this.twitch.configuration.onChanged(() => {
        console.log('configuration.onChanged called from app.jsx');
        let config = this.twitch.configuration?.broadcaster?.content || {};

        console.log('   config from config.onchanged', config);
        try {
          config = JSON.parse(config);
          console.log('   config parsed', config);
        } catch (error) {
          console.log('error parsing config');
          config = {}
        }

        this.setState({
          productSku: config.bitsPriceSku,
          allowModControl: config.allowModControl === "true" // config.allowModControl is a string, converting to boolean
        })
      })
    }
  }

  componentWillUnmount() {
    if (this.twitch) {
      this.twitch.unlisten('broadcast', () => console.log('successfully unlistened'))
    }
  }

  async fetchPhrases() {
    const channelId = this.state.currentChannelId;

    this.setState({ isLoadingPhrases: true }); 

    const {data, error} = await fetchPhrases(channelId, this.Authentication.getToken());

    if (!!data) {
      const filteredPhrases = this.getNonCompletedPhrases(data);

      this.setState({ phrases: filteredPhrases });
      this.setState({ isLoadingPhrases: false });
      this.setState({ isInitialFetchCompleted: true });
    } else {
      this.setState({ isLoadingPhrases: false });
      // TODO: setState is error true, render error fetching msg
    }
  }

  // Updates the current list of phrases and appends the new phrase to the end of the array
  addPhraseToList(phraseToAdd) {
    const currentPhrases = this.state.phrases;
    const updatedPhrases = [...currentPhrases, phraseToAdd];

    this.setState({ phrases: updatedPhrases });
  }

  // Removes the completed phrase from the list of phrases
  removePhraseFromList(completedPhrase) {
    const currentPhrases = this.state.phrases;
    const updatedPhrases = currentPhrases.filter(phrase => (completedPhrase.uuid !== phrase.uuid));

    this.setState({ phrases: updatedPhrases });
  }

  // Takes the array of phrases and returns a new array with only phrases that are not completed
  getNonCompletedPhrases(phraseList) {
    return phraseList.filter(phrase => !phrase.completed);
  }

  render() {
    const isLightTheme = this.state.theme === 'light';
    const whichTheme = isLightTheme ? 'App-light' : 'App-dark'; // TODO: rename this variable
    
    const loadingState = this.state.isLoadingPhrases && (
      <React.Fragment>
        <div className="text-center logo-container">
          <img src={OtsWhite} width="116px" height="100px" />
        </div>
        <div className='spinner-container'>
          <Spinner animation="border" className='sending-spinner'>
            <span className='sr-only'>Loading...</span>
          </Spinner>
          <div className='text-center'>Loading...</div>
        </div>
      </React.Fragment>
    );

    const shouldRenderList = this.state.finishedLoading && this.state.isVisible && !this.state.isLoadingPhrases;

    const tabs = !this.state.isLoadingPhrases && (
      <TabHeader
        phrases={this.state.phrases}
        isLightTheme={isLightTheme}
        shouldRenderList={shouldRenderList}
        authToken={this.Authentication.getToken()}
        isMod={this.Authentication.isModerator()}
        isBroadcaster={this.Authentication.isBroadcaster()}
        isViewerLoggedIn={this.Authentication.isLoggedIn()}
        allowModControl={this.state.allowModControl}
        productSku={this.state.productSku}
      />
    );
   
    // const example = (
    //   <div className={this.state.theme === 'light' ? 'App-light' : 'App-dark'} >
    //       <p>This is the auth example</p>
    //       <p>My token is: {this.Authentication.state.token}</p>
    //       <p>My opaque ID is {this.Authentication.getOpaqueId()}.</p>
    //       <div>{this.Authentication.isModerator() ? <p>I am currently a mod, and here's a special mod button <input value='mod button' type='button'/></p>  : 'I am currently not a mod.'}</div>
    //       <p>I have {this.Authentication.hasSharedId() ? `shared my ID, and my user_id is ${this.Authentication.getUserId()}` : 'not shared my ID'}.</p>
    //       <p>ChannelId is: {this.state.currentChannelId}</p>
    //       <p>Is broadcaster? {this.twitch.configuration.broadcaster} </p>
    //       <p>Are bits enabled {this.twitch.bits.showBitsBalance()}</p>
    //   </div>
    // );
    

    return (
      <div className={`App dark-theme`}>
        {loadingState}
        {tabs}
      </div>
    )

  }
}


/* EXAMPLE STUFF
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