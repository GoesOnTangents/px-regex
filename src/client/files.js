'use strict';

import focalStorage from './../external/focalStorage.js'
import generateUuid from './uuid.js'

export default class Files {
  static fetchChunks(fetchPromise, eachChunkCB, doneCB) {
    fetchPromise.then(function(response) {
        var reader = response.body.getReader();
        var decoder = new TextDecoder();
        var all = "";
        (function read() {
          reader.read().then(function(result) {
            var text = decoder.decode(result.value || new Uint8Array, {
              stream: !result.done
            });
            all += text
            if (eachChunkCB) eachChunkCB(text, result)
            if (result.done) {
              if (doneCB) doneCB(all, result)
            } else {
              read() // fetch next chunk
            }
          })
        })()
      })
  }

  static async loadFile(url) {
    return fetch(url).then(function (response) {
      console.log("file " + url + " read.");
      return response.text();
    })
  }

  static async saveFile(url, data){
    var urlString = url.toString();
    if (urlString.match(/\/$/)) {
      return fetch(urlString, {method: 'MKCOL'});
    } else {
      return fetch(urlString, {method: 'PUT', body: data});
    }
  }
  
  static async statFile(urlString){
  	return fetch(urlString, {method: 'OPTIONS', body: data}).then(resp => resp.text())
  }
  
  static syncRepository(lively4serverUrl, gitrepository, gitusername, gitpasssword, gitemail) {
    return fetch(lively4serverUrl + "/_git/sync", {
      headers: new Headers({ 
    	  "gitrepository": gitrepository, // "Lively4.wiki"
        "gitusername" : gitusername, // "jens.lincke"
        "gitpassword" : gitpasssword, // "f777a0fa178bc855c28f89b402786b36f8b..."
        "gitemail" : gitemail
      })
    }).then(r => r.text()).then(r => {
      console.log(r); 
      return r
    })
  }
}

console.log("loaded file-editor.js")
