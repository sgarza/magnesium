#!/usr/bin/env node

require('colors');
var fs      = require('fs');
var mkdirp  =  require('mkdirp')

require('neon');
require('neon/stdlib/custom_event');
require('neon/stdlib/custom_event_support');
require('neon/stdlib/node_support');

var nopt        = require("nopt");
var inflection  = require('inflection');

Class('Mg').includes(CustomEventSupport)({
  SCHEMA_MIGRATIONS_FILE : './migrations/data/schema_migrations.json',
  prototype : {
    options : null,
    schemaMigrations : null,
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
      this.options = nopt(this.knownOpts, this.shortHands, process.argv, 2);

      this.bind('error', function(data) {
        console.error(data.message.red);
        console.log('Use: mg -h for help'.green);
        this.exit();
      });

      this.bind('log', function(data) {
        console.log(data.message.green);
      });

      this.bind('info', function(data) {
        console.log(data.message);
      });

      this.createDependencyFiles();
    },

    createDependencyFiles : function() {
      if (!fs.existsSync('./migrations/data')) {
        this.dispatch('log', {message : 'Creating ./' + this.constructor.SCHEMA_MIGRATIONS_FILE.split('/')[1] + ' directory.'});
        mkdirp.sync('./migrations/data', 0744);
      }

      if (!fs.existsSync(this.constructor.SCHEMA_MIGRATIONS_FILE)) {
        this.dispatch('log', {message : 'Creating ' + this.constructor.SCHEMA_MIGRATIONS_FILE + ' file.'});
        fs.writeFileSync(this.constructor.SCHEMA_MIGRATIONS_FILE, "{}", 'utf8');
        this.schemaMigrations = JSON.parse(fs.readFileSync(this.constructor.SCHEMA_MIGRATIONS_FILE, 'utf8'));
      } else {
        this.schemaMigrations = JSON.parse(fs.readFileSync(this.constructor.SCHEMA_MIGRATIONS_FILE, 'utf8'));
      }

      return this;
    },

    createMigration : function(name) {
      var now = new Date;
      var UTCTimestamp = Date.UTC(now.getUTCFullYear(),now.getUTCMonth(), now.getUTCDate(),
        now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());

      var fileName = UTCTimestamp + '_' + name;

      if (fs.existsSync(fileName)) {
        this.dispatch('error', {message : 'File ' + fileName + ' already exists'});
      } else {
        this.dispatch('log', {message : 'Creating ./migrations/' + fileName + '.js migration.'});

        fs.createReadStream('./lib/migration_template.js').pipe(fs.createWriteStream('./migrations/' + fileName + '.js'));

        this.schemaMigrations[UTCTimestamp] = name;

        var schema = JSON.stringify(this.schemaMigrations, null, 2);

        fs.writeFileSync(this.constructor.SCHEMA_MIGRATIONS_FILE, schema , 'utf8');
      }
    },

    showHelp : function() {
      var help = fs.readFileSync('./lib/help.txt', 'utf8');

      this.dispatch('info', {message : help});
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
        this.createMigration(name);
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

      return this;
    },

    exit : function(){
      process.exit(1);
    }
  }
});

var magnesium = new Mg();

magnesium.run();
