const jwt = require('jsonwebtoken')

/**
 * Helper class for authentication against an EBS service. Allows the storage of a token to be accessed across componenents. 
 * This is not meant to be a source of truth. Use only for presentational purposes. 
 */
export default class Authentication{

    constructor(token, opaque_id){
        this.state={
            token,
            opaque_id,
            user_id:false,
            isLoggedIn:false,
            isMod:false,
            isBroadcaster:false,
            role:""
        }
    }

    isLoggedIn(){
        return this.state.isLoggedIn
    }

    // This does not guarantee the user is a moderator- this is fairly simple to bypass - so pass the JWT and verify
    // server-side that this is true. This, however, allows you to render client-side UI for users without holding on a backend to verify the JWT. 
    // Additionally, this will only show if the user shared their ID, otherwise it will return false. 
    isModerator(){
        return this.state.isMod
    }

    isBroadcaster() {
        return this.state.isBroadcaster
    }

    // similar to mod status, this isn't always verifiable, so have your backend verify before proceeding. 
    hasSharedId(){
        return !!this.state.user_id
    }

    getUserId(){
        return this.state.user_id
    }

    getOpaqueId(){
        return this.state.opaque_id
    }

    getToken() {
        return this.state.token
    }
    
    // set the token in the Authentication componenent state
    // this is naive, and will work with whatever token is returned. under no circumstances should you use this logic to trust private data- you should always verify the token on the backend before displaying that data. 
    setToken(token,opaque_id){
        let isMod = false
        let isBroadcaster = false
        let isLoggedIn = false
        let role = ""
        let user_id = ""

        try {
            let decoded = jwt.decode(token)
            
            if(decoded.role === 'moderator') {
              isMod = true
            }

            if(decoded.role === 'broadcaster') {
              isBroadcaster = true
              isMod = true
            }

            user_id = decoded.user_id
            role = decoded.role
            isLoggedIn = decoded.opaque_user_id[0]==='U'? true : false
        } catch (e) {
            token=''
            opaque_id=''
        }

        this.state={
            token,
            opaque_id,
            isMod,
            isBroadcaster,
            isLoggedIn,
            user_id,
            role
        }
    }

    // checks to ensure there is a valid token in the state
    isAuthenticated(){
        if(this.state.token && this.state.opaque_id){
            return true
        }else{
            return false
        }
    }

    /**
     * Makes a call against a given endpoint using a specific method. 
     * 
     * Returns a Promise with the Request() object per fetch documentation.
     * 
     */

    makeCall(url, method="GET"){
        return new Promise((resolve, reject)=>{
            if(this.isAuthenticated()){
                let headers={
                    'Content-Type':'application/json',
                    'Authorization': `Bearer ${this.state.token}`
                }
    
                fetch(url,
                    {
                        method,
                        headers,
                    })
                    .then(response=>resolve(response))
                    .catch(e=>reject(e))
            }else{
                reject('Unauthorized')
            }
        })
    }
}