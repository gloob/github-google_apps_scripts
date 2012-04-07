/*
 * Connector to Redmine from Google Apps Scripts platform.
 *
 * Copyright (c) 2012 Emergya
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * Author: Alejandro Leiva <aleiva@emergya.com>
 *
 */

var GITHUB_API_URL = 'https://api.github.com';

// TODO: this should be obtained from a configuration dialog.
var API_ACCESS_KEY = 'YOUR_API_ACCESS_KEY_HERE!';

var linkexp=/<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g;
var paramexp=/[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g;

var GitHub = (function() {

  // base_uri and api_key could be specified at initialization time
  function GitHub(base_uri, api_key) {
    this.base_uri = base_uri || GITHUB_API_URL;
    this.api_key = api_key || API_ACCESS_KEY;
  }
  
  // Parse linkHeader whiich contains the 'next page uri' of a request in Github
  var parseLinkHeader = function (value) {
    var matches = value.match(linkexp);
    var rels = new Object();
    var titles = new Object();
    
    for (i = 0; i < matches.length; i++) {
      var split = matches[i].split('>');
      var href = split[0].substring(1);
      var ps = split[1];
      var link = new Object();
      link.href = href;
      var s = ps.match(paramexp);
      
      function unquote(value) {
        if (value.charAt(0) == '"' && value.charAt(value.length - 1) == '"') return value.substring(1, value.length - 1);
        return value;
      }
      
      for (j = 0; j < s.length; j++) {
        var p = s[j];
        var paramsplit = p.split('=');
        var name = paramsplit[0];
        link[name] = unquote(paramsplit[1]);
      }
      
      if (link.rel != undefined) {
        rels[link.rel] = link;
      }
      if (link.title != undefined) {
        titles[link.title] = link;
      }
    }
    var linkheader = new Object();
    linkheader.rels = rels;
    linkheader.titles = titles;
    return linkheader;
  }

  // Github paginates requests that return multiple items
  // See http://developer.github.com/v3/#pagination
  // This allows to retrieve all items of a multiple item request
  GitHub.prototype.retrieveAll = function (api_call) {
    var page = 0;
    var per_page = 100;

    // First request
    var uri = this.base_uri + api_call + '?page=' + page + '&per_page=' + per_page + '&key=' + this.api_key;
    try {
      var response = UrlFetchApp.fetch(uri);
      var content = Utilities.jsonParse(response.getContentText());
      var headers = response.getHeaders();
    } catch (err) {
      return [];
    }
      
    if (!('Link' in headers)) {
      // No more pages to retrieve
      return content;
    } 
    else {
      // Get the next page uri from header
      var link_headers = parseLinkHeader(headers['Link']);

      var results = [];
      do {
        results = results.concat(content);
        var uri = link_headers['rels'].next.href;
        var response = UrlFetchApp.fetch(uri);
        var content = Utilities.jsonParse(response.getContentText());
        var headers = response.getHeaders();
        var link_headers = parseLinkHeader(headers['Link']);
      } while (link_headers['rels'].next)
      results = results.concat(content);
      return results;
    }
  };

  // Repos API http://developer.github.com/v3/repos/
  // /repos/:user/:repo/commits
  GitHub.prototype.getReposCommits = function (user, project) {   
    var api_call = '/repos/' + user + '/' + project + '/commits';
    return this.retrieveAll(api_call);
  };

  return GitHub;

})();

function stub() {
  gh = new GitHub(GITHUB_API_URL);
  gh.getCommits('gloob', 'github-google_apps_scripts');
}
