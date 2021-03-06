'use strict';
/* global module, require, __dirname */

var isEmptyObject = require('is-empty-object');
var JSONStream = require('JSONStream');
var assign = require('object-assign');
var traverse = require('traverse');
var pretty = require('pretty');
var mkdirp = require('mkdirp');
var marked = require('marked');
var path = require('path');
var fs = require('fs');



/**
 * Takes the pug-doc stream 
 * and generates a pretty html file.
 */

function PugDocHTML(options){

  if(typeof options === 'undefined'){
    throw new Error('Pug doc html requires a settings object.');
  }

  if(typeof options.output === 'undefined'){
    throw new Error('Pug doc html requires settings.output to be set.');
  }

  // options
  options = assign({
    input: null,
    output: null
  }, options);

  var isInit = true;

  // create output stream
  mkdirp.sync(path.dirname(options.output));
  var output = fs.createWriteStream(options.output);
  output.on('close', function(){
    stream.emit('complete');
  }.bind(this));


  // read template html file
  var template = fs.createReadStream(__dirname +'/template.html');
  var templateHtml;

  template.on('data', function(data){
    // break template file up in 2 parts
    templateHtml = data.toString().split('PUG_DOC_DATA');

    // add first part of template html
    output.write(templateHtml[0]);
  });



  /**
   * Create js object to be placed inside html file
   */
  
  function createSnippet(obj){

    var line = [];

    // add trailing comma for all items but the first
    if(!isInit){
      line.push(',');
    }

    obj = JSON.parse(JSON.stringify(obj));

    // create pretty html
    obj.output = pretty(obj.output);

    obj.name = obj.meta.name;
    obj.description = obj.meta.description;

    // traverse all arguments
    // and indent according to level
    var spaces;
    var arg;
    var rest = '';

    traverse(obj.meta).forEach(function(x){

      // check for empty object
      if(isEmptyObject(x)){
        return;
      }

      if(this.key === 'name'){
        return;
      }

      if(this.key === 'description'){
        return;
      }

      if(typeof this.key === 'undefined'){
        return;
      }

      // set indentation
      spaces = new Array(this.level).join('\t');
      arg = [];
      arg.push(spaces);
      arg.push('* ');
      arg.push(this.key);

      if(typeof x !== 'object'){
        arg.push(': ');
        arg.push(x);
      }

      rest += arg.join('') +'\n';
    });

    obj.rest = marked(rest);

    if(isInit){
      isInit = false;
    }

    line.push(JSON.stringify(obj));

    return line.join('');
    
  }


  /**
   * Output stream
   */

  var stream = JSONStream.parse('*');
    stream.on('data', function(data){
    
    // create code snippet
    var snippet = createSnippet(data);

    // push lines
    output.write(snippet);
  });

  stream.on('end', function(){
    output.end(templateHtml[1]);
  });


  /**
   * Input from file
   */
  
  if(typeof options.input !== 'undefined'){

    // read input json
    var input = fs.createReadStream(__dirname +'/'+ options.input);
    var json = '';

    input.on('data', function(data){
      json += data;
    }.bind(this));

    input.on('end', function() {
      json = JSON.parse(json.toString());

      var snippet;
      json.forEach(function(obj){

        // create code snippet
        snippet = createSnippet(obj);

        // append json data to template
        output.write(snippet);

      });

      // end stream
      stream.push(null);
      stream.end();
    });
  }

  return stream;
}

module.exports = PugDocHTML;