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
  MIGRATIONS_SCHEMA_FILE : './migrations/data/migrations_schema.json',
  prototype : {
    options : null,
    migrationsSchema : null,
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
        this.dispatch('log', {message : 'Creating ./' + this.constructor.MIGRATIONS_SCHEMA_FILE.split('/')[1] + ' directory.'});
        mkdirp.sync('./migrations/data', 0744);
      }

      if (!fs.existsSync(this.constructor.MIGRATIONS_SCHEMA_FILE)) {
        this.dispatch('log', {message : 'Creating ' + this.constructor.MIGRATIONS_SCHEMA_FILE + ' file.'});

        var schema = {
          versions : {},
          last : null
        }

        fs.writeFileSync(this.constructor.MIGRATIONS_SCHEMA_FILE, JSON.stringify(schema, null, 2), 'utf8');
        this.migrationsSchema = JSON.parse(fs.readFileSync(this.constructor.MIGRATIONS_SCHEMA_FILE, 'utf8'));
      } else {
        this.migrationsSchema = JSON.parse(fs.readFileSync(this.constructor.MIGRATIONS_SCHEMA_FILE, 'utf8'));
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

        var template = fs.readFileSync(__dirname + '/lib/migration_template.js', 'utf8');

        template = template.replace('{{name}}', inflection.classify(name));

        fs.writeFileSync('./migrations/' + fileName + '.js', template, 'utf8');

        this.migrationsSchema.versions[UTCTimestamp] = name;

        var schema = JSON.stringify(this.migrationsSchema, null, 2);

        fs.writeFileSync(this.constructor.MIGRATIONS_SCHEMA_FILE, schema , 'utf8');
      }
    },

    showHelp : function() {
      var help = fs.readFileSync(__dirname + '/lib/help.txt', 'utf8');

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

      var mgFile = this.migrationsSchema;

      if (this.options.migrate) {
        if (this.options.create || this.options.rollback) {
          this.showHelp();
        }

        if (this.options.migrate === 1) {
          this.dispatch('info', {message : 'Migrating to last version'});

          for (version in mgFile.versions) {
            if (version > mgFile.last) {
              this.dispatch('log', {message : 'Migrating version ' + version + ' | ' + mgFile.versions[version]});
              var mg = require(process.cwd() + '/migrations/' + version + '_' + mgFile.versions[version] + '.js');

              mg.up();

              mgFile.last = version;
            }
          }

          var schema = JSON.stringify(mgFile, null, 2);

          this.dispatch('info', {message : 'Writing Migration Schema file'});
          fs.writeFileSync(this.constructor.MIGRATIONS_SCHEMA_FILE, schema , 'utf8');

          this.dispatch('log', {message : 'Finished'});
          this.exit();

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
