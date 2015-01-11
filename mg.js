#!/usr/bin/env node

require('colors');
var fs    = require('fs');

require('neon');
require('neon/stdlib/custom_event');
require('neon/stdlib/custom_event_support');
require('neon/stdlib/node_support');


var nopt        = require("nopt");
var inflection  = require('inflection');

Class('Mg').includes(CustomEventSupport)({
  prototype : {
    options : null,
    knownOpts : {
      "create"    : String,
      "migrate"   : [Number, null],
      "rollback"  : [Number, null],
      "help"      : Boolean
    },

    shortHands : {
      "m" : ["--migrate"],
      "r" : ["--rollback"],
      "h" : ["--help"]
    },

    init : function() {
      this.bind('error', function(data) {
        console.error(data.message.red);
        console.log('Use: mg -h for help'.green);
      });

      this.bind('log', function(data) {
        console.log(data.message.green);
      });

      this.bind('info', function(data) {
        console.log(data.message);
      });

      this.options = nopt(this.knownOpts, this.shortHands, process.argv, 2);
    },

    exit : function(){
      process.exit(1);
    },

    showHelp : function() {
      var help = fs.readFileSync('./lib/help.txt', 'utf8');

      this.dispatch('info', {message : help});
      console.log(this.options)
      this.exit();
    },

    run : function() {

      if (this.options.argv.original.length === 0 || this.options.help) {
        this.showHelp();
      }

      if (typeof this.options.create === 'string') {
        if (this.options.migrate || this.options.rollback) {
          this.showHelp();
        }

        if (this.options.create === '') {
          this.dispatch('error', {message : 'No name given.'});
          console.log(this.options)
          this.exit();
        }
        // create handler
        var name = inflection.underscore(this.options.create);
        this.dispatch('log', {message : 'Creating ' + name + ' migragion.'});
      }

      if (this.options.migrate) {
        if (this.options.create || this.options.rollback) {
          this.showHelp();
        }

        if (this.options.migrate === 1) {
          this.dispatch('log', {message : 'Migrating to last version'});
        } else if (this.options.migrate !== 1) {
          this.dispatch('log', {message : 'Migrating to ' + this.options.migrate +' version'});
        }
      }

      if (this.options.rollback) {
        if (this.options.create || this.options.migrate) {
          this.showHelp();
        }

        if (this.options.rollback === 1) {
          this.dispatch('log', {message : 'Rolling back 1 version'});
        } else if (this.options.migrate !== 1) {
          this.dispatch('log', {message : 'Rolling back to ' + this.options.rollback +' version'});
        }
      }

      console.log(this.options)
    }
  }
});

var magnesium = new Mg();

magnesium.run();
