// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

//TODO: Remove jquery dependency
import $ = require('jquery');

import {
  Contents
} from '@jupyterlab/services';


import {
  showDialog
} from 'jupyterlab/lib/dialog';

//TODO: Complete gapi typings and commit upstream
declare let gapi: any;

export
enum FileType {FILE=1, FOLDER=2};

const CLIENT_ID = '625147942732-t30t8vnn43fl5mvg1qde5pl84603dr6s.apps.googleusercontent.com';

const FULL_OAUTH_SCOPE = 'https://www.googleapis.com/auth/drive';
const FILES_OAUTH_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const METADATA_OAUTH_SCOPE = 'https://www.googleapis.com/auth/drive.metadata';
const INSTALL_SCOPE = 'https://www.googleapis.com/auth/drive.install'

const SCOPE = [FULL_OAUTH_SCOPE];
//const SCOPE = [FILES_OAUTH_SCOPE, METADATA_OAUTH_SCOPE];

export
let gapiLoaded = new Promise<void>( (resolve, reject) => {
  //get the gapi script from Google
  $.getScript('https://apis.google.com/js/api.js')
  .done( (script, textStatus)=> {
    //load overall API
    (window as any).gapi.load('auth:client,drive-realtime,drive-share', ()=> {
      //load client library (for some reason different
      //from the toplevel API)
      gapi.client.load('drive', 'v3').then(()=>{
        console.log("gapi: loaded onto page");
        resolve();
      });
    });
  }).fail( () => {
    console.log("gapi: unable to load onto page");
    reject();
  });
});

export
let driveReady = new Promise<void>((resolve, reject)=>{
  gapiLoaded.then(()=>resolve());
});

export
function resetDriveTimer() {
  driveReady = new Promise<void>((resolve, reject)=>{
    setTimeout( ()=>{
      resolve();
    }, 1000);
  });
}

export
function driveApiRequest( request: any) : Promise<any> {
  return new Promise<any>((resolve, reject)=>{
    driveReady.then(()=>{
      request.then( (response: any)=> {
        if(response.status !== 200) { //HTTP error
          console.log("gapi: Drive API error: ", response.status);
          console.log(response);
          resetDriveTimer();
          reject(response.result);
        } else { //Success
          resetDriveTimer();
          resolve(response.result);
        }
      }, (response: any)=>{ //Some other error
        console.log("gapi: Drive API Error.");
        console.log(response.result);
        resetDriveTimer();
        reject(response.result);
      });
    });
  });
}

export
function authorize (): Promise<void> {
  return new Promise<void>( (resolve, reject) => {
    gapiLoaded.then( () => {
      let handleAuthorization = function (authResult : any) {
        if (authResult && !authResult.error) {
          resolve();
        } else {
          popupAuthorization();
        }
      }

      let popupAuthorization = function() {
        showDialog({
          title: 'Proceed to Google Authorization?',
          okText: 'OK'
        }).then( result => {
          if (result.text === 'OK') {
            gapi.auth.authorize({
              client_id: CLIENT_ID,
              scope: SCOPE,
              immediate: false
            }, handleAuthorization);
          } else {
            reject();
          }
        });
      }

      //Attempt to authorize without a popup
      gapi.auth.authorize({
        client_id: CLIENT_ID,
        scope: SCOPE,
        immediate: true}, handleAuthorization);
    });
  });
}

/**
 * Executes a Google API request.  This wraps the request.execute() method,
 * by returning a Promise, which may be resolved or rejected.  The raw
 * return value of execute() has errors detected, and errors are wrapped as
 * an Error object.
 *
 * Typical usage:
 * var request = gapi.client.drive.files.get({
 *     'fileId': fileId
 * });
 * execute(request, success, error);
 *
 * @param {Object} request The request, generated by the Google JavaScript
 *     client API.
 * @return {Promise} Fullfilled with the result on success, or the
 *     result wrapped as an Error on error.
 */
export
function gapiExecute(request: any, attemptReauth:boolean = true): Promise<any> {
  return new Promise(function(resolve, reject) {
    request.execute( (result: any)=> {
      resolve(result);
    }, (result: any)=>{
      reject(result)
    });
  });
};
