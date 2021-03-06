import { IS_DEV_MODE } from '../util/constants';

export const FAILED_TO_FETCH = "FAILED_TO_FETCH";
export const FAILED_TO_SEND = "FAILED_TO_SEND";

// When running locally need to have localhost url vs prod api url
const ROOT_API_URL = IS_DEV_MODE
  ? "http://127.0.0.1:3000/"
  : "https://rplbgv9ts3.execute-api.us-east-1.amazonaws.com/prod/";

/**
 * Fetch an array of phrases for the specified channelid
 * @param {string} channelId - Id of channel to fetch phrases for
 * @param {string} authToken - The jwt token (not including 'Bearer ')
 * @returns {object} { data: phrases[] | null, error: FAILED_TO_FETCH | null }
 */
export const fetchPhrases = async (channelId, authToken) => {
  const url = `${ROOT_API_URL}phrases?channelId=${channelId}`;
  const options = {
    headers: {
      "Authorization": `Bearer  ${authToken}`
    }
  };

  try {
    const response = await fetch(url, options);

    if (response.status === 200) {
      return {
        data: await response.json(),
        error: null
      };
    } else {
      throw new Error(response);
    }
  } catch (error) {
    console.log(`Failed to fetch phrases : ${error}`);
    return {
      data: null,
      error: FAILED_TO_FETCH
    }
  }
}

/**
 * Sends a phrase to be stored in the db
 * @param {string} phrase - the phrase to send
 * @param {obj} transaction - the completed bits transaction
 * @param {string} authToken - The jwt token (not including 'Bearer ')
 * @returns {object} { data: phrase | null, error: FAILED_TO_FETCH | null }
 */
export const sendPhrase = async (phrase, transaction, authToken) => {
  const url = `${ROOT_API_URL}/phrase`;

  if (!transaction) {
    throw new Error('Error: Invalid transaction object');
  }
  const body = {
    phrase,
    transactionObject: transaction
  };
  const options = {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      "Authorization": 'Bearer ' + authToken
    }
  };

  try {
    const response = await fetch(url, options);

    if (response.status === 200) {
      return {
        data: await response.json(),
        error: null
      };
    } else {
      throw new Error(response);
    }
  } catch (error) {
    console.log(`Failed to send phrase: ${error}`);
    return {
      data: null,
      error: FAILED_TO_SEND
    }
  }
}

export const markPhraseCompleted = async (messageId, authToken, isRejected = false) => {
  const url = `${ROOT_API_URL}/completed`;

  const body = { messageId, isRejected };
  const options = {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      "Authorization": 'Bearer ' + authToken
    }
  };

  try {
    const response = await fetch(url, options);
    const parsedResponse = await response.json();

    if (response.status === 200) {
      return {
        data: parsedResponse,
        error: null
      };
    } else {
      throw new Error(parsedResponse);
    }
  } catch (error) {
    console.log(`Failed to mark phrase completed: ${error}`);
    return {
      data: null,
      error: FAILED_TO_SEND
    }
  }
}
